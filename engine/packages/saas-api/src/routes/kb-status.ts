import { Router, Request, Response } from 'express';
import type { SqlDatabase } from '@conversation-engine/saas-core';
import type { KbJobQueue } from '../workers/kb-job-queue';

// ─── Response Types ───────────────────────────────────────────────

export type KbReadinessStatus = 'indexing' | 'ready' | 'failed' | 'unconfigured';

export interface KbLatestJob {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: Record<string, unknown> | null;
  updatedAt: string;
  errorMessage: string | null;
}

export interface KbStatusResponse {
  /** Unified readiness status for the dashboard. */
  status: KbReadinessStatus;
  /** `true` when the tenant has indexed content ready for chat retrieval. */
  is_kb_indexed: boolean;
  /** Active chunk count in `kb_chunks` for this tenant. */
  chunk_count: number;
  /** Details of the most recent crawl/index job, if any. */
  latest_job: KbLatestJob | null;
}

// ─── Route Factory ────────────────────────────────────────────────

export interface KbStatusDeps {
  db: SqlDatabase;
  kbJobQueue: KbJobQueue;
}

export function createKbStatusRoutes(deps: KbStatusDeps): Router {
  const router = Router();

  /**
   * GET /api/tenants/:tenantId/kb-status
   *
   * Returns a unified knowledge-base readiness status for the dashboard.
   * The response aggregates chunk counts from `kb_chunks` and the latest
   * job from `kb_jobs` to derive a single `status` enum the frontend can
   * render directly.
   *
   * Status logic (evaluated in order):
   *   1. "indexing"    – latest active job is pending/running
   *   2. "failed"      – latest job failed AND zero chunks exist
   *   3. "ready"       – chunks > 0 AND no active job
   *   4. "unconfigured" – zero chunks, no jobs at all
   */
  router.get('/:tenantId/kb-status', (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const tenantId = req.params.tenantId;

      // ── 1. Chunk count (indexed SQL lookup) ──────────────────
      const chunkCount = countChunks(deps.db, tenantId);

      // ── 2. Latest job ────────────────────────────────────────
      const jobs = deps.kbJobQueue.listByTenant(tenantId, 1);
      const latestJob = jobs.length > 0 ? jobs[0] : null;

      // ── 3. Derive status ─────────────────────────────────────
      const { status, is_kb_indexed } = deriveStatus(chunkCount, latestJob);

      const latestJobResponse: KbLatestJob | null = latestJob
        ? {
            jobId: latestJob.id,
            status: latestJob.status,
            progress: latestJob.result,
            updatedAt: latestJob.updatedAt,
            errorMessage: latestJob.errorMessage,
          }
        : null;

      res.json({
        status,
        is_kb_indexed,
        chunk_count: chunkCount,
        latest_job: latestJobResponse,
      } satisfies KbStatusResponse);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch KB status' });
    }
  });

  return router;
}

// ─── Internal Helpers ─────────────────────────────────────────────

/**
 * Optimised single-query chunk count using the existing `idx_kb_chunks_tenant`
 * index. Returns 0 for tenants with no rows (avoids NULL propagation).
 */
function countChunks(db: SqlDatabase, tenantId: string): number {
  const row = db.prepare(
    'SELECT COUNT(*) AS c FROM kb_chunks WHERE tenant_id = ?'
  ).get(tenantId) as { c: number } | undefined;
  return row?.c ?? 0;
}

/**
 * Derive the unified `KbReadinessStatus` from chunk count and latest job state.
 *
 * Evaluation order matters — an active job always surfaces as "indexing"
 * regardless of chunk count so the dashboard shows a spinner while
 * re-indexing an existing tenant.
 */
function deriveStatus(
  chunkCount: number,
  latestJob: { status: string; errorMessage: string | null } | null,
): { status: KbReadinessStatus; is_kb_indexed: boolean } {
  // Active crawl in flight → indexing
  if (latestJob && (latestJob.status === 'pending' || latestJob.status === 'running')) {
    return { status: 'indexing', is_kb_indexed: false };
  }

  // Latest job failed and nothing indexed → failed
  if (latestJob?.status === 'failed' && chunkCount === 0) {
    return { status: 'failed', is_kb_indexed: false };
  }

  // Has content ready for retrieval → ready
  if (chunkCount > 0) {
    return { status: 'ready', is_kb_indexed: true };
  }

  // No content, no jobs → unconfigured
  return { status: 'unconfigured', is_kb_indexed: false };
}
