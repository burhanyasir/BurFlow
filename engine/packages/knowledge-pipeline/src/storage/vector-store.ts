import Database from 'better-sqlite3';
import { VectorRecord, VectorSearchResult } from '../types';
import { VectorStore } from '../interfaces';
import { createHash } from 'crypto';

interface StoredVector {
  chunk_id: string;
  tenant_id: string;
  document_id: string;
  knowledge_version: number;
  embedding_version: string;
  embedding_model: string;
  chunking_version: string;
  embedding: Buffer;
  content: string;
  metadata: string;
  deleted: number;
}

export class SqliteVectorStore implements VectorStore {
  private db: Database.Database;
  private dimension: number;

  constructor(db: Database.Database, dimension = 128) {
    this.db = db;
    this.dimension = dimension;
    this.ensureTables();
  }

  private ensureTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_vectors (
        chunk_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        document_id TEXT NOT NULL,
        knowledge_version INTEGER NOT NULL,
        embedding_version TEXT NOT NULL,
        embedding_model TEXT NOT NULL,
        chunking_version TEXT NOT NULL,
        embedding BLOB NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        deleted INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_kv_tenant ON knowledge_vectors(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_kv_document ON knowledge_vectors(document_id);
      CREATE INDEX IF NOT EXISTS idx_kv_version ON knowledge_vectors(knowledge_version);
      CREATE INDEX IF NOT EXISTS idx_kv_deleted ON knowledge_vectors(deleted);
      CREATE INDEX IF NOT EXISTS idx_kv_content_fts ON knowledge_vectors(content);
    `);
  }

  async upsert(records: VectorRecord[]): Promise<void> {
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO knowledge_vectors
        (chunk_id, tenant_id, document_id, knowledge_version, embedding_version, embedding_model, chunking_version, embedding, content, metadata, deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = this.db.transaction(() => {
      for (const r of records) {
        const buf = Buffer.alloc(this.dimension * 4);
        for (let i = 0; i < this.dimension && i < r.embedding.length; i++) {
          buf.writeFloatLE(r.embedding[i], i * 4);
        }
        insert.run(
          r.chunkId, r.tenantId, r.documentId, r.knowledgeVersion,
          r.embeddingVersion, r.embeddingModel, r.chunkingVersion,
          buf, r.metadata.content || '', JSON.stringify(r.metadata),
          r.deleted ? 1 : 0,
        );
      }
    });

    tx();
  }

  async search(query: number[], tenantId: string, topK: number, threshold = 0.0, filters?: Record<string, unknown>, queryText?: string): Promise<VectorSearchResult[]> {
    let sql = 'SELECT chunk_id, document_id, tenant_id, embedding, content, metadata, knowledge_version FROM knowledge_vectors WHERE tenant_id = ? AND deleted = 0';
    const params: any[] = [tenantId];

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        sql += ` AND json_extract(metadata, '$.${key}') = ?`;
        params.push(String(value));
      }
    }

    sql += ' LIMIT 50000';
    const rows = this.db.prepare(sql).all(...params) as StoredVector[];
    const results: VectorSearchResult[] = [];

    // Pre-compute BM25 scores for the whole corpus if queryText provided
    const bm25Scores = queryText ? this.computeBM25(queryText, rows) : null;

    for (const row of rows) {
      const embedding = this.bufferToEmbedding(row.embedding);
      let similarity = this.cosineSimilarity(query, embedding);
      const metadata = JSON.parse(row.metadata || '{}');

      // Hybrid: blend cosine similarity with BM25 score
      if (bm25Scores) {
        const bm25 = bm25Scores.get(row.chunk_id) || 0;
        similarity = similarity * 0.7 + bm25 * 0.3;
      }

      if (similarity >= threshold) {
        results.push({
          chunkId: row.chunk_id,
          documentId: row.document_id,
          tenantId: row.tenant_id,
          score: similarity,
          content: row.content,
          metadata,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  // ─── BM25 Keyword Search ────────────────────────────────
  private computeBM25(query: string, rows: StoredVector[]): Map<string, number> {
    const scores = new Map<string, number>();
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (terms.length === 0) return scores;

    const N = rows.length;
    const avgDocLen = rows.reduce((sum, r) => sum + r.content.split(/\s+/).length, 0) / Math.max(N, 1);
    const k1 = 1.5;
    const b = 0.75;

    // Compute IDF for each term
    const idf = new Map<string, number>();
    for (const term of terms) {
      let docsWithTerm = 0;
      for (const row of rows) {
        if (row.content.toLowerCase().includes(term)) docsWithTerm++;
      }
      idf.set(term, Math.log((N - docsWithTerm + 0.5) / (docsWithTerm + 0.5) + 1));
    }

    // Score each document
    for (const row of rows) {
      const docLen = row.content.split(/\s+/).length;
      const contentLower = row.content.toLowerCase();
      let score = 0;
      for (const term of terms) {
        const tf = (contentLower.match(new RegExp(term, 'g')) || []).length;
        if (tf > 0) {
          score += (idf.get(term) || 0) * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgDocLen))));
        }
      }
      if (score > 0) scores.set(row.chunk_id, Math.tanh(score)); // Normalize to [0,1)
    }

    return scores;
  }

  async softDelete(chunkIds: string[]): Promise<void> {
    const stmt = this.db.prepare('UPDATE knowledge_vectors SET deleted = 1 WHERE chunk_id = ?');
    this.db.transaction(() => {
      for (const id of chunkIds) stmt.run(id);
    })();
  }

  async hardDelete(chunkIds: string[]): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM knowledge_vectors WHERE chunk_id = ?');
    this.db.transaction(() => {
      for (const id of chunkIds) stmt.run(id);
    })();
  }

  async deleteByDocument(documentId: string): Promise<void> {
    this.db.prepare('DELETE FROM knowledge_vectors WHERE document_id = ?').run(documentId);
  }

  async deleteByTenant(tenantId: string): Promise<void> {
    this.db.prepare('DELETE FROM knowledge_vectors WHERE tenant_id = ?').run(tenantId);
  }

  async getStats(tenantId: string): Promise<{ totalChunks: number; deletedChunks: number; activeChunks: number }> {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM knowledge_vectors WHERE tenant_id = ?').get(tenantId) as any).c;
    const deleted = (this.db.prepare('SELECT COUNT(*) as c FROM knowledge_vectors WHERE tenant_id = ? AND deleted = 1').get(tenantId) as any).c;
    return { totalChunks: total, deletedChunks: deleted, activeChunks: total - deleted };
  }

  async reindex(records: VectorRecord[]): Promise<void> {
    await this.hardDelete(records.map(r => r.chunkId));
    await this.upsert(records);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  private bufferToEmbedding(buf: Buffer): number[] {
    const embedding: number[] = [];
    for (let i = 0; i < buf.length; i += 4) {
      embedding.push(buf.readFloatLE(i));
    }
    return embedding;
  }
}
