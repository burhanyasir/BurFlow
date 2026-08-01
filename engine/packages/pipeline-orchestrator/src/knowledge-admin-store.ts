import Database from 'better-sqlite3';

export interface KnowledgeDocMeta {
  documentId: string;
  tenantId: string;
  originalName: string;
  sourceType: string;
  title: string;
  status: string;
  error: string | null;
  chunkCount: number;
  contentHash: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeMonitoringStats {
  totalDocuments: number;
  totalChunks: number;
  indexedDocuments: number;
  publishedDocuments: number;
  failedDocuments: number;
  queuedDocuments: number;
  processingDocuments: number;
  failedRatio: number;
  publishedRatio: number;
  embeddingProgress: number;
}

export class KnowledgeAdminStore {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.ensureTables();
  }

  private ensureTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_documents (
        document_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        original_name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'queued',
        error TEXT DEFAULT NULL,
        chunk_count INTEGER NOT NULL DEFAULT 0,
        content_hash TEXT NOT NULL DEFAULT '',
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_kd_tenant ON knowledge_documents(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_kd_status ON knowledge_documents(status);
      CREATE INDEX IF NOT EXISTS idx_kd_tenant_status ON knowledge_documents(tenant_id, status);

      CREATE TABLE IF NOT EXISTS knowledge_monitoring (
        tenant_id TEXT NOT NULL,
        total_documents INTEGER NOT NULL DEFAULT 0,
        total_chunks INTEGER NOT NULL DEFAULT 0,
        indexed_documents INTEGER NOT NULL DEFAULT 0,
        failed_documents INTEGER NOT NULL DEFAULT 0,
        embedding_progress REAL NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (tenant_id)
      );
    `);
  }

  upsertDocument(meta: {
    documentId: string;
    tenantId: string;
    originalName: string;
    sourceType: string;
    title: string;
    status: string;
    error?: string | null;
    chunkCount?: number;
    contentHash?: string;
  }): void {
    const existing = this.db.prepare('SELECT version FROM knowledge_documents WHERE document_id = ?').get(meta.documentId) as any;
    const version = existing ? existing.version + 1 : 1;
    const now = new Date().toISOString();

    if (existing) {
      this.db.prepare(`
        UPDATE knowledge_documents SET original_name = ?, source_type = ?, title = ?, status = ?, error = ?, chunk_count = ?, content_hash = ?, version = ?, updated_at = ?
        WHERE document_id = ?
      `).run(meta.originalName, meta.sourceType, meta.title, meta.status, meta.error || null, meta.chunkCount || 0, meta.contentHash || '', version, now, meta.documentId);
    } else {
      this.db.prepare(`
        INSERT INTO knowledge_documents (document_id, tenant_id, original_name, source_type, title, status, error, chunk_count, content_hash, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(meta.documentId, meta.tenantId, meta.originalName, meta.sourceType, meta.title, meta.status, meta.error || null, meta.chunkCount || 0, meta.contentHash || '', version, now, now);
    }

    this.updateMonitoringStats(meta.tenantId);
  }

  getDocument(documentId: string): KnowledgeDocMeta | null {
    const row = this.db.prepare('SELECT * FROM knowledge_documents WHERE document_id = ?').get(documentId) as any;
    if (!row) return null;
    return this.mapDoc(row);
  }

  listDocuments(tenantId: string, status?: string, limit = 50, offset = 0): { documents: KnowledgeDocMeta[]; total: number } {
    let sql = 'SELECT * FROM knowledge_documents WHERE tenant_id = ?';
    let countSql = 'SELECT COUNT(*) as count FROM knowledge_documents WHERE tenant_id = ?';
    const params: any[] = [tenantId];

    if (status) {
      sql += ' AND status = ?';
      countSql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const total = (this.db.prepare(countSql).all(...params) as any[])[0]?.count || 0;
    const rows = this.db.prepare(sql).all(...params.concat([limit, offset])) as any[];
    return { documents: rows.map(r => this.mapDoc(r)), total };
  }

  deleteDocument(documentId: string): void {
    const doc = this.getDocument(documentId);
    this.db.prepare('DELETE FROM knowledge_documents WHERE document_id = ?').run(documentId);
    if (doc) this.updateMonitoringStats(doc.tenantId);
  }

  getMonitoringStats(tenantId: string): KnowledgeMonitoringStats {
    const row = this.db.prepare('SELECT * FROM knowledge_monitoring WHERE tenant_id = ?').get(tenantId) as any;
    if (row) {
      const publishedDocuments = (this.db.prepare("SELECT COUNT(*) as c FROM knowledge_documents WHERE tenant_id = ? AND status = 'published'").get(tenantId) as any)?.c || 0;
      const failedDocuments = row.failed_documents;
      const totalDocuments = row.total_documents;
      return {
        totalDocuments,
        totalChunks: row.total_chunks,
        indexedDocuments: row.indexed_documents,
        publishedDocuments,
        failedDocuments,
        queuedDocuments: Math.max(0, totalDocuments - publishedDocuments - failedDocuments),
        processingDocuments: 0,
        failedRatio: totalDocuments > 0 ? Math.round((failedDocuments / totalDocuments) * 10000) / 100 : 0,
        publishedRatio: totalDocuments > 0 ? Math.round((publishedDocuments / totalDocuments) * 10000) / 100 : 0,
        embeddingProgress: row.embedding_progress,
      };
    }
    return {
      totalDocuments: 0,
      totalChunks: 0,
      indexedDocuments: 0,
      publishedDocuments: 0,
      failedDocuments: 0,
      queuedDocuments: 0,
      processingDocuments: 0,
      failedRatio: 0,
      publishedRatio: 0,
      embeddingProgress: 0,
    };
  }

  private updateMonitoringStats(tenantId: string): void {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM knowledge_documents WHERE tenant_id = ?').get(tenantId) as any)?.c || 0;
    const indexed = (this.db.prepare("SELECT COUNT(*) as c FROM knowledge_documents WHERE tenant_id = ? AND status = 'published'").get(tenantId) as any)?.c || 0;
    const failed = (this.db.prepare("SELECT COUNT(*) as c FROM knowledge_documents WHERE tenant_id = ? AND status = 'failed'").get(tenantId) as any)?.c || 0;
    const totalChunks = (this.db.prepare('SELECT SUM(chunk_count) as s FROM knowledge_documents WHERE tenant_id = ?').get(tenantId) as any)?.s || 0;
    const progress = total > 0 ? indexed / total : 0;

    this.db.prepare(`
      INSERT OR REPLACE INTO knowledge_monitoring (tenant_id, total_documents, total_chunks, indexed_documents, failed_documents, embedding_progress, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(tenantId, total, totalChunks, indexed, failed, progress, new Date().toISOString());
  }

  private mapDoc(row: any): KnowledgeDocMeta {
    return {
      documentId: row.document_id,
      tenantId: row.tenant_id,
      originalName: row.original_name,
      sourceType: row.source_type,
      title: row.title,
      status: row.status,
      error: row.error,
      chunkCount: row.chunk_count,
      contentHash: row.content_hash,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
