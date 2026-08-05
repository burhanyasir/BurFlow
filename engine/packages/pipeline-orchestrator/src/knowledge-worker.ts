import { createLogger } from '@conversation-engine/logger';
import { KnowledgePipeline, WebsiteCrawler } from '@conversation-engine/knowledge-pipeline';
import { KnowledgeAdminStore } from './knowledge-admin-store';

const logger = createLogger('knowledge-worker');

export interface KnowledgeWorkerConfig {
  pollIntervalMs: number;
  maxConcurrency: number;
}

const DEFAULT_CONFIG: KnowledgeWorkerConfig = {
  pollIntervalMs: 5000,
  maxConcurrency: 3,
};

export class KnowledgeWorker {
  private pipeline: KnowledgePipeline;
  private adminStore: KnowledgeAdminStore;
  private config: KnowledgeWorkerConfig;
  private activeJobs = 0;
  private running = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private contentStore = new Map<string, { content: Buffer | string; chunkingConfig?: any; embeddingConfig?: any }>();

  constructor(
    pipeline: KnowledgePipeline,
    adminStore: KnowledgeAdminStore,
    config?: Partial<KnowledgeWorkerConfig>,
  ) {
    this.pipeline = pipeline;
    this.adminStore = adminStore;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  registerContent(documentId: string, content: Buffer | string, chunkingConfig?: any, embeddingConfig?: any): void {
    this.contentStore.set(documentId, { content, chunkingConfig, embeddingConfig });
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    logger.info({ pollIntervalMs: this.config.pollIntervalMs, maxConcurrency: this.config.maxConcurrency }, 'Knowledge worker started');
    this.pollTimer = setInterval(() => this.poll(), this.config.pollIntervalMs);
    this.poll(); // Immediate first poll
  }

  stop(): void {
    this.running = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    logger.info('Knowledge worker stopped');
  }

  private async poll(): Promise<void> {
    if (!this.running) return;
    if (this.activeJobs >= this.config.maxConcurrency) return;

    // Find next queued document across all tenants
    const db = (this.pipeline as any).db as any;
    if (!db) return;

    const rows = db.prepare(
      "SELECT document_id, tenant_id, source_type, original_name FROM knowledge_queue WHERE status = 'queued' ORDER BY queued_at ASC LIMIT ?"
    ).all(this.config.maxConcurrency - this.activeJobs) as any[];

    for (const row of rows) {
      this.activeJobs++;
      this.processItem(row).finally(() => { this.activeJobs--; });
    }
  }

  private async processItem(row: any): Promise<void> {
    const { document_id: documentId, tenant_id: tenantId, source_type: sourceType, original_name: originalName } = row;

    try {
      this.adminStore.upsertDocument({
        documentId,
        tenantId,
        originalName,
        sourceType,
        title: sourceType === 'url' ? new URL(originalName).hostname : originalName.replace(/\.\w+$/, ''),
        status: 'processing',
      });

      if (sourceType === 'url') {
        await this.processUrlItem(documentId, tenantId, originalName);
      } else {
        const stored = this.contentStore.get(documentId);
        if (!stored) {
          logger.warn({ documentId }, 'No content registered for queued document');
          return;
        }
        const result = await this.pipeline.processDocument(documentId, stored.content, stored.chunkingConfig, stored.embeddingConfig);

        this.adminStore.upsertDocument({
          documentId,
          tenantId,
          originalName,
          sourceType,
          title: originalName.replace(/\.\w+$/, ''),
          status: 'published',
          chunkCount: result.chunks.length,
        });

        logger.info({ documentId, tenantId, chunks: result.chunks.length, knowledgeVersion: result.knowledgeVersion }, 'Document processed successfully');
      }
    } catch (err: any) {
      logger.error({ documentId, tenantId, err: err.message }, 'Document processing failed');

      this.adminStore.upsertDocument({
        documentId,
        tenantId,
        originalName,
        sourceType,
        title: sourceType === 'url' ? new URL(originalName).hostname : originalName.replace(/\.\w+$/, ''),
        status: 'warning',
        error: err.message,
      });
    } finally {
      this.contentStore.delete(documentId);
    }
  }

  private async processUrlItem(documentId: string, tenantId: string, url: string): Promise<void> {
    const crawler = new WebsiteCrawler();
    const CRAWL_TIMEOUT_MS = 30_000;

    const crawlPromise = crawler.crawl(url, tenantId, { maxDepth: 2, maxPages: 10, respectRobotsTxt: true, useSitemap: true });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Crawl timed out after ${CRAWL_TIMEOUT_MS}ms`)), CRAWL_TIMEOUT_MS)
    );

    const docs = await Promise.race([crawlPromise, timeoutPromise]);

    if (!docs || docs.length === 0) {
      throw new Error(`No content could be crawled from ${url}`);
    }

    logger.info({ documentId, tenantId, url, pages: docs.length }, 'Crawl completed, processing documents');

    for (const doc of docs) {
      try {
        await this.pipeline.processParsedDocument(documentId, doc);
      } catch (err: any) {
        logger.warn({ documentId, tenantId, url: doc.metadata?.sourceUrl, err: err.message }, 'Failed to process crawled page, continuing');
      }
    }

    this.adminStore.upsertDocument({
      documentId,
      tenantId,
      originalName: url,
      sourceType: 'url',
      title: new URL(url).hostname,
      status: 'published',
      chunkCount: docs.length,
    });

    logger.info({ documentId, tenantId, url, pages: docs.length }, 'URL crawl processed successfully');
  }

  getStatus(): { running: boolean; activeJobs: number; queuedCount: number } {
    const db = (this.pipeline as any).db as any;
    let queuedCount = 0;
    if (db) {
      const row = db.prepare("SELECT COUNT(*) as c FROM knowledge_queue WHERE status = 'queued'").get() as any;
      queuedCount = row?.c || 0;
    }
    return { running: this.running, activeJobs: this.activeJobs, queuedCount };
  }
}
