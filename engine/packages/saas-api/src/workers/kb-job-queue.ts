import { randomUUID } from 'crypto';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import type { SqlDatabase } from '@conversation-engine/saas-core';

const baseLogger = createLogger('saas-api:kb-job-queue');

// ─── Types ────────────────────────────────────────────────────────

export interface KbJob {
  id: string;
  tenantId: string;
  jobType: 'crawl' | 'reindex' | 'delete';
  status: 'pending' | 'running' | 'completed' | 'failed';
  websiteUrl: string | null;
  maxDepth: number;
  maxPages: number;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnqueueCrawlJobOpts {
  tenantId: string;
  websiteUrl: string;
  maxDepth?: number;
  maxPages?: number;
  payload?: Record<string, unknown>;
}

// ─── Queue Class ──────────────────────────────────────────────────

/**
 * PostgreSQL-backed job queue for KB indexing jobs.
 *
 * Design principles:
 * - Uses SELECT … FOR UPDATE SKIP LOCKED for safe concurrent polling.
 * - Exponential backoff on retry (1min → 5min → 15min → …).
 * - Jobs are idempotent by (tenant_id, website_url) for pending/running.
 */
export class KbJobQueue {
  private db: SqlDatabase;

  constructor(db: SqlDatabase) {
    this.db = db;
  }

  // ── Enqueue ───────────────────────────────────────────────────

  /**
   * Enqueue a crawl job.  If a pending/running crawl job already exists for
   * the same tenant+URL, returns the existing job instead of duplicating.
   */
  enqueueCrawl(opts: EnqueueCrawlJobOpts): KbJob {
    const log = createContextLogger(baseLogger);

    // Deduplicate: return existing pending/running job for same tenant+URL
    const existing = this.db.prepare(
      `SELECT id FROM kb_jobs
       WHERE tenant_id = ? AND website_url = ? AND status IN ('pending', 'running')
       LIMIT 1`
    ).get(opts.tenantId, opts.websiteUrl) as { id: string } | undefined;

    if (existing) {
      log.info({ jobId: existing.id, tenantId: opts.tenantId }, 'Dedup: returning existing job');
      return this.getById(existing.id)!;
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const job: KbJob = {
      id,
      tenantId: opts.tenantId,
      jobType: 'crawl',
      status: 'pending',
      websiteUrl: opts.websiteUrl,
      maxDepth: opts.maxDepth ?? 2,
      maxPages: opts.maxPages ?? 20,
      payload: opts.payload ?? {},
      result: null,
      errorMessage: null,
      retryCount: 0,
      maxRetries: 3,
      nextRetryAt: null,
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.db.prepare(
      `INSERT INTO kb_jobs (id, tenant_id, job_type, status, website_url, max_depth, max_pages, payload, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      job.id, job.tenantId, job.jobType, job.status,
      job.websiteUrl, job.maxDepth, job.maxPages,
      JSON.stringify(job.payload), job.createdAt, job.updatedAt,
    );

    log.info({ jobId: id, tenantId: opts.tenantId, url: opts.websiteUrl }, 'Enqueued crawl job');
    return job;
  }

  // ── Poll ──────────────────────────────────────────────────────

  /**
   * Claim the next pending job (FOR UPDATE SKIP LOCKED).
   * Returns null when no jobs are available.
   */
  claimNext(): KbJob | null {
    const now = new Date().toISOString();
    const row = this.db.prepare(
      `UPDATE kb_jobs
       SET status = 'running', started_at = ?, updated_at = ?
       WHERE id = (
         SELECT id FROM kb_jobs
         WHERE status = 'pending'
           AND (next_retry_at IS NULL OR next_retry_at <= ?)
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`
    ).get(now, now) as Record<string, unknown> | undefined;

    return row ? this.rowToJob(row) : null;
  }

  // ── Complete / Fail ───────────────────────────────────────────

  markCompleted(jobId: string, result: Record<string, unknown>): void {
    const now = new Date().toISOString();
    this.db.prepare(
      `UPDATE kb_jobs SET status = 'completed', result = ?, completed_at = ?, updated_at = ? WHERE id = ?`
    ).run(JSON.stringify(result), now, now, jobId);
    createContextLogger(baseLogger).info({ jobId }, 'Job completed');
  }

  markFailed(jobId: string, error: string): void {
    const log = createContextLogger(baseLogger);
    const job = this.getById(jobId);
    if (!job) return;

    if (job.retryCount < job.maxRetries) {
      // Exponential backoff: 1min, 5min, 15min
      const backoffMs = [60_000, 300_000, 900_000][job.retryCount] || 900_000;
      const nextRetry = new Date(Date.now() + backoffMs).toISOString();
      const now = new Date().toISOString();

      this.db.prepare(
        `UPDATE kb_jobs
         SET status = 'pending', error_message = ?, retry_count = retry_count + 1,
             next_retry_at = ?, updated_at = ?
         WHERE id = ?`
      ).run(error, nextRetry, now, jobId);

      log.warn({ jobId, retryCount: job.retryCount + 1, nextRetry }, 'Job failed — scheduling retry');
    } else {
      const now = new Date().toISOString();
      this.db.prepare(
        `UPDATE kb_jobs SET status = 'failed', error_message = ?, completed_at = ?, updated_at = ? WHERE id = ?`
      ).run(error, now, now, jobId);
      log.error({ jobId, error }, 'Job failed permanently after max retries');
    }
  }

  // ── Cleanup ──────────────────────────────────────────────────

  /**
   * Purge completed/failed jobs older than `retentionDays`.
   * Uses batched deletes (500 rows per batch) to avoid holding a long
   * exclusive lock on the table.  Active jobs (`pending` / `running`)
   * are never touched.
   *
   * Returns the total number of rows deleted.
   */
  purgeOldJobs(retentionDays = 30): number {
    const log = createContextLogger(baseLogger);
    const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();
    const BATCH_SIZE = 500;
    let totalDeleted = 0;

    // Loop until no more stale rows remain
    for (;;) {
      const result = this.db.prepare(
        `DELETE FROM kb_jobs
         WHERE id IN (
           SELECT id FROM kb_jobs
           WHERE status IN ('completed', 'failed')
             AND updated_at < ?
           LIMIT ?
         )`
      ).run(cutoff, BATCH_SIZE);

      const deleted = (result as { changes: number }).changes ?? 0;
      totalDeleted += deleted;

      // Fewer than a full batch means we're done
      if (deleted < BATCH_SIZE) break;
    }

    if (totalDeleted > 0) {
      log.info({ totalDeleted, retentionDays }, 'Purged old kb_jobs records');
    }
    return totalDeleted;
  }

  // ── Helpers ───────────────────────────────────────────────────

  getById(id: string): KbJob | null {
    const row = this.db.prepare('SELECT * FROM kb_jobs WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? this.rowToJob(row) : null;
  }

  listByTenant(tenantId: string, limit = 20): KbJob[] {
    const rows = this.db.prepare(
      'SELECT * FROM kb_jobs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(tenantId, limit) as Record<string, unknown>[];
    return rows.map(r => this.rowToJob(r));
  }

  getStats(): { pending: number; running: number; completed: number; failed: number } {
    const row = this.db.prepare(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending') AS pending,
         COUNT(*) FILTER (WHERE status = 'running')  AS running,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed,
         COUNT(*) FILTER (WHERE status = 'failed')    AS failed
       FROM kb_jobs`
    ).get() as any;
    return { pending: row.pending || 0, running: row.running || 0, completed: row.completed || 0, failed: row.failed || 0 };
  }

  private rowToJob(row: Record<string, unknown>): KbJob {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      jobType: row.job_type as KbJob['jobType'],
      status: row.status as KbJob['status'],
      websiteUrl: row.website_url as string | null,
      maxDepth: row.max_depth as number,
      maxPages: row.max_pages as number,
      payload: safeParseJson(row.payload as string),
      result: row.result ? safeParseJson(row.result as string) : null,
      errorMessage: row.error_message as string | null,
      retryCount: row.retry_count as number,
      maxRetries: row.max_retries as number,
      nextRetryAt: row.next_retry_at as string | null,
      startedAt: row.started_at as string | null,
      completedAt: row.completed_at as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

function safeParseJson(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}
