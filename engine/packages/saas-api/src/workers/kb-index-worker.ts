import { randomUUID } from 'crypto';
import Database from 'better-sqlite3';
import type { SqlDatabase } from '@conversation-engine/saas-core';
import { isPostgresDatabase } from '@conversation-engine/saas-core';
import {
  KnowledgePipeline, ContentNormalizer, ContentChunker,
  MockEmbeddingProvider, OpenAIEmbeddingProvider,
  SqliteVectorStore, SqliteKnowledgeStore,
  WebsiteCrawler, HtmlParser, TextParser, MarkdownParser, FaqParser,
} from '@conversation-engine/knowledge-pipeline';
import type { ParsedDocument } from '@conversation-engine/knowledge-pipeline';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { KbJobQueue, type KbJob } from './kb-job-queue';

const baseLogger = createLogger('saas-api:kb-index-worker');

// ─── Configuration ────────────────────────────────────────────────

const POLL_INTERVAL_MS = parseInt(process.env.KB_WORKER_POLL_INTERVAL_MS || '5000', 10);
const MAX_CONCURRENCY = parseInt(process.env.KB_WORKER_MAX_CONCURRENCY || '2', 10);
const JOB_TIMEOUT_MS = parseInt(process.env.KB_WORKER_JOB_TIMEOUT_MS || '180000', 10); // 3 min per job

// ─── Worker Dependencies ─────────────────────────────────────────

export interface KbIndexWorkerDeps {
  /** Primary SaaS database (PostgreSQL in prod, SQLite locally). */
  db: SqlDatabase;
  /**
   * Dedicated SQLite for the knowledge-pipeline vector/knowledge stores.
   * Only present when the primary db is PostgreSQL.
   */
  knowledgeDb?: SqlDatabase;
  embeddingApiKey?: string;
  embeddingDimension?: number;
}

// ─── Worker Class ─────────────────────────────────────────────────

/**
 * Background worker that polls `kb_jobs` for pending crawl jobs and
 * processes them: scrape → chunk → embed → store in kb_chunks.
 *
 * Survives process restarts (Render dyno cycling) because jobs are
 * persisted in PostgreSQL.
 */
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const JOB_RETENTION_DAYS = 30;

export class KbIndexWorker {
  private queue: KbJobQueue;
  private deps: KbIndexWorkerDeps;
  private running = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private activeJobs = new Map<string, AbortController>();

  constructor(deps: KbIndexWorkerDeps) {
    this.deps = deps;
    this.queue = new KbJobQueue(deps.db);
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  start(): void {
    if (this.running) return;
    this.running = true;
    createContextLogger(baseLogger).info(
      { pollInterval: POLL_INTERVAL_MS, maxConcurrency: MAX_CONCURRENCY },
      'KB index worker started',
    );
    this.poll();

    // Run cleanup once on boot, then every 24 hours
    this.runCleanup();
    this.cleanupTimer = setInterval(() => this.runCleanup(), CLEANUP_INTERVAL_MS);
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  stop(): void {
    this.running = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    // Abort any in-flight jobs
    for (const [jobId, ac] of this.activeJobs) {
      ac.abort();
      createContextLogger(baseLogger).info({ jobId }, 'Aborted in-flight job during shutdown');
    }
    this.activeJobs.clear();
    createContextLogger(baseLogger).info('KB index worker stopped');
  }

  getStatus(): { running: boolean; activeJobs: number; queueStats: ReturnType<KbJobQueue['getStats']> } {
    return {
      running: this.running,
      activeJobs: this.activeJobs.size,
      queueStats: this.queue.getStats(),
    };
  }

  getQueue(): KbJobQueue {
    return this.queue;
  }

  // ── Cleanup ──────────────────────────────────────────────────

  private runCleanup(): void {
    try {
      const deleted = this.queue.purgeOldJobs(JOB_RETENTION_DAYS);
      if (deleted > 0) {
        createContextLogger(baseLogger).info({ deleted, retentionDays: JOB_RETENTION_DAYS }, 'kb_jobs cleanup completed');
      }
    } catch (err) {
      createContextLogger(baseLogger).error({ err }, 'kb_jobs cleanup failed');
    }
  }

  // ── Poll Loop ─────────────────────────────────────────────────

  private poll(): void {
    if (!this.running) return;

    try {
      while (this.activeJobs.size < MAX_CONCURRENCY) {
        const job = this.queue.claimNext();
        if (!job) break;

        // Fire-and-forget with independent error handling
        this.processJob(job).catch((err) => {
          createContextLogger(baseLogger).error({ err, jobId: job.id }, 'Unhandled error in processJob');
        });
      }
    } catch (err) {
      createContextLogger(baseLogger).error({ err }, 'Poll cycle error');
    }

    this.pollTimer = setTimeout(() => this.poll(), POLL_INTERVAL_MS);
    if (this.pollTimer.unref) this.pollTimer.unref(); // Don't block process exit
  }

  // ── Job Processing ────────────────────────────────────────────

  private async processJob(job: KbJob): Promise<void> {
    const log = createContextLogger(baseLogger);
    const ac = new AbortController();
    this.activeJobs.set(job.id, ac);

    const timeout = setTimeout(() => ac.abort(), JOB_TIMEOUT_MS);

    try {
      log.info({ jobId: job.id, tenantId: job.tenantId, url: job.websiteUrl }, 'Processing crawl job');

      const result = await Promise.race([
        this.executeCrawlJob(job, ac.signal),
        this.waitForAbort(ac.signal, job.id),
      ]);

      clearTimeout(timeout);
      this.activeJobs.delete(job.id);

      if (ac.signal.aborted) {
        this.queue.markFailed(job.id, 'Job timed out');
        return;
      }

      this.queue.markCompleted(job.id, result);
      log.info({ jobId: job.id, chunkCount: result.chunkCount }, 'Job completed successfully');
    } catch (err: any) {
      clearTimeout(timeout);
      this.activeJobs.delete(job.id);

      const msg = err?.message || String(err);
      log.error({ jobId: job.id, err: msg }, 'Job failed');
      this.queue.markFailed(job.id, msg.slice(0, 2000));
    }
  }

  private async waitForAbort(signal: AbortSignal, jobId: string): Promise<never> {
    return new Promise((_, reject) => {
      signal.addEventListener('abort', () => {
        reject(new Error(`Job ${jobId} aborted`));
      }, { once: true });
    });
  }

  /**
   * Core crawl → chunk → embed → store pipeline.
   * Extracted from knowledge.ts POST /crawl background logic.
   */
  private async executeCrawlJob(
    job: KbJob,
    signal: AbortSignal,
  ): Promise<Record<string, unknown>> {
    const log = createContextLogger(baseLogger);
    const tenantId = job.tenantId;
    const url = job.websiteUrl!;

    // 1. Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }
    if (!parsedUrl.protocol.startsWith('http')) {
      throw new Error(`URL must use http/https protocol: ${url}`);
    }

    // 2. Crawl the website
    const crawler = new WebsiteCrawler();
    const docs = await crawler.crawl(url, tenantId, {
      respectRobotsTxt: true,
      maxDepth: job.maxDepth,
      maxPages: job.maxPages,
      useSitemap: true,
      onProgress: (pagesCrawled: number, queueRemaining: number) => {
        log.debug({ jobId: job.id, pagesCrawled, queueRemaining }, 'Crawl progress');
      },
    });

    if (signal.aborted) throw new Error('Job aborted during crawl');
    if (!docs || docs.length === 0) {
      return { pagesCrawled: 0, chunksStored: 0, warning: 'No readable content found' };
    }

    log.info({ jobId: job.id, pagesFound: docs.length }, 'Crawl complete, processing pages');

    // 3. Process through the pipeline (chunk + embed + store in SQLite)
    const pipeline = this.createPipeline();
    let processed = 0;
    let failed = 0;

    for (const doc of docs) {
      if (signal.aborted) throw new Error('Job aborted during processing');
      try {
        const docId = await pipeline.enqueue(tenantId, 'url', doc.title || url, url);
        await pipeline.processParsedDocument(docId, doc);
        processed++;
      } catch (err: any) {
        failed++;
        log.warn({ jobId: job.id, err: err?.message, sourceUrl: doc.metadata?.sourceUrl }, 'Failed to process page');
      }
    }

    // 4. Persist chunks to PostgreSQL kb_chunks
    const chunksStored = await this.persistToPostgres(job, docs);

    // 5. Generate and store starter options
    const starterOptions = this.generateStarterOptions(docs);

    return {
      pagesCrawled: processed,
      pagesFailed: failed,
      chunksStored,
      totalDocs: docs.length,
      starterOptions,
      completedAt: new Date().toISOString(),
    };
  }

  // ── Pipeline Factory ──────────────────────────────────────────

  private createPipeline(): KnowledgePipeline {
    const dimension = this.deps.embeddingDimension || 512;
    const apiKey = process.env.OPENROUTER_API_KEY || this.deps.embeddingApiKey;
    const apiUrl = process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1/embeddings' : undefined;
    const embedder = apiKey
      ? new OpenAIEmbeddingProvider(apiKey, 'text-embedding-3-small', 30000, apiUrl)
      : new MockEmbeddingProvider(dimension);

    const knowledgeRawDb = this.deps.knowledgeDb
      ? (this.deps.knowledgeDb as unknown as Database.Database)
      : (this.deps.db as unknown as Database.Database);

    const vectorStore = new SqliteVectorStore(knowledgeRawDb, dimension);
    const knowledgeStore = new SqliteKnowledgeStore(knowledgeRawDb);

    const pipeline = new KnowledgePipeline(
      new ContentNormalizer(),
      new ContentChunker(),
      embedder,
      vectorStore,
      knowledgeStore,
      knowledgeRawDb,
    );

    pipeline.registerParser(new TextParser());
    pipeline.registerParser(new MarkdownParser());
    pipeline.registerParser(new HtmlParser());
    pipeline.registerParser(new FaqParser());

    return pipeline;
  }

  // ── PostgreSQL Persistence ────────────────────────────────────

  /**
   * Persist crawled pages as kb_chunks in PostgreSQL so they survive
   * Render deploys (SQLite is ephemeral on Render's ephemeral filesystem).
   */
  private async persistToPostgres(
    job: KbJob,
    docs: ParsedDocument[],
  ): Promise<number> {
    const log = createContextLogger(baseLogger);
    const tenantId = job.tenantId;
    const url = job.websiteUrl!;

    // Only persist to PostgreSQL (not SQLite primary)
    if (!isPostgresDatabase(this.deps.db) || docs.length === 0) return 0;

    let storedCount = 0;

    try {
      const pgDb = this.deps.db;

      // Ensure a knowledge_base exists
      let kbId: string | null = null;
      try {
        const kbRow = pgDb.prepare(
          'SELECT id FROM knowledge_bases WHERE tenant_id = ? LIMIT 1'
        ).get(tenantId) as { id: string } | undefined;
        if (kbRow) kbId = kbRow.id;
      } catch {}

      if (!kbId) {
        kbId = randomUUID();
        try {
          pgDb.prepare(
            `INSERT INTO knowledge_bases (id, tenant_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
          ).run(kbId, tenantId, 'Website Crawl', new Date().toISOString(), new Date().toISOString());
        } catch (err: any) {
          log.warn({ err, tenantId }, 'Failed to create knowledge_base');
        }
      }

      // Create a kb_document for this crawl
      const docId = randomUUID();
      try {
        pgDb.prepare(
          `INSERT INTO kb_documents (id, knowledge_base_id, tenant_id, filename, source_type, source_url, status, chunk_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'url', ?, 'published', ?, ?, ?)`
        ).run(docId, kbId, tenantId, url, url, docs.length, new Date().toISOString(), new Date().toISOString());
      } catch (err: any) {
        log.warn({ err, tenantId }, 'Failed to create kb_document');
      }

      // Insert each page as a chunk
      for (const doc of docs) {
        if (!doc.content) continue;
        const chunkId = randomUUID();
        const metadata = JSON.stringify({
          title: doc.title || '',
          sourceUrl: doc.metadata?.sourceUrl || url,
          crawledBy: 'kb-index-worker',
          jobId: job.id,
        });
        try {
          pgDb.prepare(
            `INSERT INTO kb_chunks (id, document_id, knowledge_base_id, tenant_id, content, metadata, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).run(chunkId, docId, kbId, tenantId, doc.content, metadata, new Date().toISOString());
          storedCount++;
        } catch (err: any) {
          log.warn({ err, tenantId, chunkId }, 'Failed to persist chunk');
        }
      }

      log.info({ tenantId, chunkCount: storedCount }, 'Persisted chunks to PostgreSQL');
    } catch (err: any) {
      log.warn({ err, tenantId }, 'PostgreSQL persistence failed (non-fatal)');
    }

    return storedCount;
  }

  // ── Starter Options ───────────────────────────────────────────

  private generateStarterOptions(docs: ParsedDocument[]): string[] {
    const options: string[] = [];
    const urls = docs.map(d => (d.metadata?.sourceUrl as string || '').toLowerCase());
    const titles = docs.map(d => (d.title || '').toLowerCase());
    const allContent = docs.map(d => (d.content || '').toLowerCase()).join(' ');

    const hasPricing = urls.some(u => u.includes('pricing')) || titles.some(t => t.includes('pricing'));
    const hasServices = urls.some(u => u.includes('service')) || titles.some(t => t.includes('service')) || allContent.includes('our services');
    const hasContact = urls.some(u => u.includes('contact')) || titles.some(t => t.includes('contact'));

    const isDental = allContent.includes('dentist') || allContent.includes('dental') || allContent.includes('smile');
    const isRestaurant = allContent.includes('menu') || allContent.includes('reservation') || allContent.includes('restaurant');
    const isSaaS = allContent.includes('saas') || allContent.includes('subscription') || allContent.includes('api');

    if (isDental) {
      if (hasServices) options.push('What services do you offer?');
      if (hasPricing) options.push('How much does it cost?');
      options.push('Book an appointment');
    } else if (isRestaurant) {
      options.push('View the menu');
      options.push('Make a reservation');
    } else if (isSaaS) {
      if (hasPricing) options.push('Compare pricing plans');
      options.push('Schedule a demo');
    } else {
      if (hasPricing) options.push('Show me pricing');
      if (hasServices) options.push('What do you offer?');
      if (hasContact) options.push('How can I contact you?');
    }

    while (options.length < 3) {
      const defaults = ['What services do you offer?', 'How can I contact you?', 'Tell me about your business'];
      for (const d of defaults) {
        if (options.length >= 3) break;
        if (!options.includes(d)) options.push(d);
      }
    }

    return options.slice(0, 3);
  }
}
