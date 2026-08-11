import { Router, Request, Response } from 'express';
import type { SqlDatabase } from '@conversation-engine/saas-core';
import { createLogger } from '@conversation-engine/logger';

const logger = createLogger('saas-api:health');

const SERVICE_NAME = 'saas-api';
const APP_VERSION = process.env.APP_VERSION || '1.0.0';

function checkDatabase(db: SqlDatabase): { connected: boolean; latencyMs: number; error?: string } {
  const start = performance.now();
  try {
    db.prepare('SELECT 1').get();
    return { connected: true, latencyMs: Math.round(performance.now() - start) };
  } catch (err: any) {
    return { connected: false, latencyMs: Math.round(performance.now() - start), error: err.message };
  }
}

/**
 * Standardized liveness + readiness endpoints for Docker/Kubernetes probes.
 *
 *  - GET /health  → liveness: process is up, returns 200 with uptime
 *  - GET /ready   → readiness: verifies database connectivity, 200/503
 *  - GET /live    → Kubernetes-style liveness alias
 */
export function createHealthRoutes(db: SqlDatabase): Router {
  const router = Router();
  const startedAt = Date.now();

  const uptimeSeconds = (): number => Math.round(process.uptime());

  // GET /health — Liveness probe
  router.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: SERVICE_NAME,
      version: APP_VERSION,
      uptime: uptimeSeconds(),
      timestamp: new Date().toISOString(),
    });
  });

  // GET /live — Kubernetes liveness alias
  router.get('/live', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'alive',
      service: SERVICE_NAME,
      uptime: uptimeSeconds(),
      timestamp: new Date().toISOString(),
    });
  });

  // GET /ready — Readiness probe (database connectivity + process uptime)
  router.get('/ready', (_req: Request, res: Response) => {
    const dbResult = checkDatabase(db);
    if (dbResult.connected) {
      res.status(200).json({
        status: 'ready',
        database: 'connected',
        latencyMs: dbResult.latencyMs,
        uptime: uptimeSeconds(),
        timestamp: new Date().toISOString(),
      });
      return;
    }
    logger.error({ error: dbResult.error }, 'Readiness check failed: database unreachable');
    res.status(503).json({
      status: 'not_ready',
      database: 'disconnected',
      error: 'database_unreachable',
      errorMessage: dbResult.error,
      latencyMs: dbResult.latencyMs,
      uptime: uptimeSeconds(),
      timestamp: new Date().toISOString(),
    });
  });

  // GET /health/detailed — full dependency report (registered for parity with hardening routes)
  router.get('/health/detailed', (_req: Request, res: Response) => {
    const dbResult = checkDatabase(db);
    const checks = {
      database: {
        status: dbResult.connected ? 'healthy' : 'unavailable',
        latencyMs: dbResult.latencyMs,
        ...(dbResult.error ? { error: dbResult.error } : {}),
      },
    };
    const allHealthy = dbResult.connected;
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'ok' : 'degraded',
      service: SERVICE_NAME,
      version: APP_VERSION,
      uptime: uptimeSeconds(),
      checks,
      startedAt: new Date(startedAt).toISOString(),
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
