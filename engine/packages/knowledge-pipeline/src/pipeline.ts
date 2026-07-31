import Database from 'better-sqlite3';
import { createHash, randomUUID } from 'crypto';
import {
  ParsedDocument, NormalizedDocument, Chunk, EmbeddingChunk, VectorRecord,
  ChunkingConfig, EmbeddingConfig, QueueItem, DocumentStatus,
} from './types';
import { DocumentParser, Normalizer, Chunker, EmbeddingProvider, VectorStore, KnowledgePublisher } from './interfaces';

export interface PipelineConfig {
  maxDocumentSizeBytes?: number;
}

const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  maxDocumentSizeBytes: 50 * 1024 * 1024,
};

export class KnowledgePipeline {
  private parsers: Map<string, DocumentParser> = new Map();
  private normalizer: Normalizer;
  private chunker: Chunker;
  private embedder: EmbeddingProvider;
  private vectorStore: VectorStore;
  private publisher: KnowledgePublisher;
  private db: Database.Database;
  private config: PipelineConfig;

  constructor(
    normalizer: Normalizer,
    chunker: Chunker,
    embedder: EmbeddingProvider,
    vectorStore: VectorStore,
    publisher: KnowledgePublisher,
    db: Database.Database,
    config?: PipelineConfig,
  ) {
    this.normalizer = normalizer;
    this.chunker = chunker;
    this.embedder = embedder;
    this.vectorStore = vectorStore;
    this.publisher = publisher;
    this.db = db;
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
    this.ensureQueueTable();
  }

  private ensureQueueTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_queue (
        document_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        original_name TEXT NOT NULL,
        content_hash TEXT,
        status TEXT NOT NULL DEFAULT 'queued',
        error TEXT,
        queued_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_kq_tenant ON knowledge_queue(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_kq_status ON knowledge_queue(status);
      CREATE INDEX IF NOT EXISTS idx_kq_hash ON knowledge_queue(tenant_id, content_hash);
    `);
  }

  registerParser(parser: DocumentParser): void {
    const types = ['pdf', 'docx', 'text', 'markdown', 'html', 'faq', 'url'];
    for (const t of types) {
      if (parser.supports(t)) this.parsers.set(t, parser);
    }
  }

  async enqueue(tenantId: string, sourceType: string, originalName: string, content: Buffer | string, metadata?: Record<string, unknown>): Promise<string> {
    const contentSize = typeof content === 'string' ? Buffer.byteLength(content, 'utf-8') : content.length;
    if (this.config.maxDocumentSizeBytes && contentSize > this.config.maxDocumentSizeBytes) {
      throw new Error(`Document size ${contentSize} bytes exceeds maximum ${this.config.maxDocumentSizeBytes} bytes`);
    }

    const contentHash = createHash('sha256').update(typeof content === 'string' ? content : content).digest('hex');

    const existing = this.db.prepare(
      "SELECT document_id FROM knowledge_queue WHERE tenant_id = ? AND content_hash = ? AND status != 'failed'"
    ).get(tenantId, contentHash) as any;
    if (existing) {
      return existing.document_id;
    }

    const docId = `${tenantId}_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO knowledge_queue (document_id, tenant_id, source_type, original_name, content_hash, status, queued_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'queued', ?, ?)
    `).run(docId, tenantId, sourceType, originalName, contentHash, now, now);

    return docId;
  }

  async processDocument(documentId: string, content: Buffer | string, chunkingConfig?: Partial<ChunkingConfig>, embeddingConfig?: Partial<EmbeddingConfig>): Promise<{ chunks: Chunk[]; knowledgeVersion: number }> {
    const acquired = this.db.prepare(
      "UPDATE knowledge_queue SET status = 'processing', updated_at = ? WHERE document_id = ? AND status IN ('queued', 'failed')"
    ).run(new Date().toISOString(), documentId);

    if (acquired.changes === 0) {
      const row = this.db.prepare('SELECT status FROM knowledge_queue WHERE document_id = ?').get(documentId) as any;
      if (!row) throw new Error(`Document ${documentId} not found in queue`);
      if (row.status === 'published') {
        const published = this.db.prepare('SELECT knowledge_version FROM knowledge_snapshots WHERE tenant_id = (SELECT tenant_id FROM knowledge_queue WHERE document_id = ?) ORDER BY knowledge_version DESC LIMIT 1').get(documentId) as any;
        return { chunks: [], knowledgeVersion: published?.knowledge_version || 0 };
      }
      throw new Error(`Document ${documentId} is already being processed (status: ${row.status})`);
    }

    try {
      const row = this.db.prepare('SELECT * FROM knowledge_queue WHERE document_id = ?').get(documentId) as any;
      if (!row) throw new Error(`Document ${documentId} not found in queue`);
      const queueItem = this.mapQueueItem(row);

      this.updateStatus(documentId, 'parsing');

      const parser = this.parsers.get(queueItem.sourceType);
      if (!parser) throw new Error(`No parser registered for type: ${queueItem.sourceType}`);

      const parsed = await parser.parse(content, queueItem.originalName, queueItem.tenantId);
      this.updateStatus(documentId, 'normalizing');

      const normalized = await this.normalizer.normalize(parsed);
      this.updateStatus(documentId, 'chunking');

      const chunks = await this.chunker.chunk(normalized, chunkingConfig);
      this.updateStatus(documentId, 'embedding');

      const embedded = await this.embedder.embed(chunks, embeddingConfig);
      this.updateStatus(documentId, 'indexed');

      await this.vectorStore.deleteByDocument(documentId, queueItem.tenantId);

      const records: VectorRecord[] = embedded.map(e => ({
        chunkId: e.chunk.chunkId,
        tenantId: e.chunk.tenantId,
        documentId: e.chunk.documentId,
        knowledgeVersion: 0,
        embeddingVersion: this.embedder.embeddingVersion,
        embeddingModel: this.embedder.model,
        chunkingVersion: chunkingConfig?.chunkingVersion || '1.0.0',
        embedding: e.embedding,
        metadata: { ...e.chunk.metadata, content: e.chunk.content, sectionPath: e.chunk.sectionPath, position: e.chunk.position },
        deleted: false,
      }));

      await this.vectorStore.upsert(records);

      const snapshot = await this.publisher.publish(
        queueItem.tenantId,
        chunks,
        this.embedder.embeddingVersion,
        this.embedder.model,
        chunkingConfig?.chunkingVersion || '1.0.0',
      );

      this.updateStatus(documentId, 'published');

      return { chunks, knowledgeVersion: snapshot.knowledgeVersion };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.updateStatus(documentId, 'failed', message);
      throw err;
    }
  }

  private updateStatus(documentId: string, status: DocumentStatus, error?: string): void {
    this.db.prepare(
      'UPDATE knowledge_queue SET status = ?, error = ?, updated_at = ? WHERE document_id = ?'
    ).run(status, error || null, new Date().toISOString(), documentId);
  }

  getQueueStatus(documentId: string): QueueItem | undefined {
    const row = this.db.prepare('SELECT * FROM knowledge_queue WHERE document_id = ?').get(documentId) as any;
    return row ? this.mapQueueItem(row) : undefined;
  }

  listByTenant(tenantId: string, status?: DocumentStatus): QueueItem[] {
    let sql = 'SELECT * FROM knowledge_queue WHERE tenant_id = ?';
    const params: any[] = [tenantId];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY queued_at DESC';
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => this.mapQueueItem(r));
  }

  private mapQueueItem(row: any): QueueItem {
    return {
      documentId: row.document_id,
      tenantId: row.tenant_id,
      sourceType: row.source_type,
      originalName: row.original_name,
      status: row.status,
      error: row.error,
      queuedAt: row.queued_at,
      updatedAt: row.updated_at,
    };
  }
}
