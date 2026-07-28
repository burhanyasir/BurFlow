import Database from 'better-sqlite3';
import { Chunk, VersionedKnowledgeSnapshot } from '../types';
import { KnowledgeStore, KnowledgePublisher } from '../interfaces';

export class SqliteKnowledgeStore implements KnowledgeStore, KnowledgePublisher {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.ensureTables();
  }

  private ensureTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_snapshots (
        knowledge_version INTEGER NOT NULL,
        tenant_id TEXT NOT NULL,
        embedding_version TEXT NOT NULL,
        embedding_model TEXT NOT NULL,
        chunking_version TEXT NOT NULL,
        published_at TEXT NOT NULL,
        chunk_data TEXT NOT NULL,
        PRIMARY KEY (knowledge_version, tenant_id)
      );
      CREATE INDEX IF NOT EXISTS idx_ks_tenant ON knowledge_snapshots(tenant_id);
    `);
  }

  async publishSnapshot(tenantId: string, chunks: Chunk[], embeddingVersion: string, embeddingModel: string, chunkingVersion: string): Promise<VersionedKnowledgeSnapshot> {
    let result: VersionedKnowledgeSnapshot | null = null;

    const insert = this.db.transaction(() => {
      const latestVersion = this.getLatestVersionSync(tenantId);
      const knowledgeVersion = latestVersion + 1;
      const publishedAt = new Date().toISOString();

      this.db.prepare(`
        INSERT INTO knowledge_snapshots (knowledge_version, tenant_id, embedding_version, embedding_model, chunking_version, published_at, chunk_data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(knowledgeVersion, tenantId, embeddingVersion, embeddingModel, chunkingVersion, publishedAt, JSON.stringify(chunks));

      result = {
        knowledgeVersion,
        tenantId,
        embeddingVersion,
        embeddingModel,
        chunkingVersion,
        chunks,
        publishedAt,
      };
    });

    insert();
    return result!;
  }

  private getLatestVersionSync(tenantId: string): number {
    const row = this.db.prepare(
      'SELECT MAX(knowledge_version) as max_v FROM knowledge_snapshots WHERE tenant_id = ?'
    ).get(tenantId) as any;
    return row?.max_v || 0;
  }

  async publish(tenantId: string, chunks: Chunk[], embeddingVersion: string, embeddingModel: string, chunkingVersion: string): Promise<VersionedKnowledgeSnapshot> {
    return this.publishSnapshot(tenantId, chunks, embeddingVersion, embeddingModel, chunkingVersion);
  }

  async getSnapshot(tenantId: string, knowledgeVersion: number): Promise<VersionedKnowledgeSnapshot | null> {
    const row = this.db.prepare(
      'SELECT * FROM knowledge_snapshots WHERE tenant_id = ? AND knowledge_version = ?'
    ).get(tenantId, knowledgeVersion) as any;

    if (!row) return null;

    return {
      knowledgeVersion: row.knowledge_version,
      tenantId: row.tenant_id,
      embeddingVersion: row.embedding_version,
      embeddingModel: row.embedding_model,
      chunkingVersion: row.chunking_version,
      chunks: JSON.parse(row.chunk_data),
      publishedAt: row.published_at,
    };
  }

  async getLatestVersion(tenantId: string): Promise<number> {
    const row = this.db.prepare(
      'SELECT MAX(knowledge_version) as max_v FROM knowledge_snapshots WHERE tenant_id = ?'
    ).get(tenantId) as any;
    return row?.max_v || 0;
  }

  async getLatestSnapshot(tenantId: string): Promise<VersionedKnowledgeSnapshot | null> {
    const version = await this.getLatestVersion(tenantId);
    if (version === 0) return null;
    return this.getSnapshot(tenantId, version);
  }

  async getPublished(tenantId: string, knowledgeVersion?: number): Promise<VersionedKnowledgeSnapshot | null> {
    if (knowledgeVersion) return this.getSnapshot(tenantId, knowledgeVersion);
    return this.getLatestSnapshot(tenantId);
  }

  async listVersions(tenantId: string): Promise<number[]> {
    const rows = this.db.prepare(
      'SELECT knowledge_version FROM knowledge_snapshots WHERE tenant_id = ? ORDER BY knowledge_version'
    ).all(tenantId) as any[];
    return rows.map(r => r.knowledge_version);
  }

  async listPublished(tenantId: string): Promise<number[]> {
    return this.listVersions(tenantId);
  }

  async deleteSnapshot(tenantId: string, knowledgeVersion: number): Promise<void> {
    this.db.prepare(
      'DELETE FROM knowledge_snapshots WHERE tenant_id = ? AND knowledge_version = ?'
    ).run(tenantId, knowledgeVersion);
  }
}
