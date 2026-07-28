import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';
import { createLogger } from '@conversation-engine/logger';

const logger = createLogger('saas-api:hardening');

interface HealthCheckDependency {
  name: string;
  check: () => { status: string; latencyMs: number; error?: string };
}

export function createHardeningRoutes(getDependencies: () => HealthCheckDependency[]): Router {
  const router = Router();

  const startTime = Date.now();
  const serviceName = 'saas-api';
  const appVersion = process.env.APP_VERSION || '0.0.0';

  function getUptime(): number {
    return Math.floor((Date.now() - startTime) / 1000);
  }

  // GET /health/detailed
  router.get('/health/detailed', (_req: Request, res: Response) => {
    try {
      const dependencies = getDependencies();
      const checks: Record<string, { status: string; latencyMs: number; error?: string }> = {};
      let overallStatus: string = 'ok';

      for (const dep of dependencies) {
        try {
          const result = dep.check();
          checks[dep.name] = {
            status: result.status,
            latencyMs: result.latencyMs,
            ...(result.error ? { error: result.error } : {}),
          };
          if (result.status !== 'ok') {
            overallStatus = 'degraded';
          }
        } catch (err: any) {
          checks[dep.name] = {
            status: 'error',
            latencyMs: 0,
            error: err.message || 'Unknown error',
          };
          overallStatus = 'degraded';
        }
      }

      res.json({
        status: overallStatus,
        service: serviceName,
        version: appVersion,
        uptime: getUptime(),
        checks,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      logger.error('Health check failed', err);
      res.status(500).json({
        status: 'error',
        service: serviceName,
        version: appVersion,
        uptime: getUptime(),
        error: err.message || 'Health check error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /health/ready
  router.get('/health/ready', (_req: Request, res: Response) => {
    try {
      const dependencies = getDependencies();
      const dbDep = dependencies.find((d) => d.name === 'database');
      let ready = false;

      if (dbDep) {
        const result = dbDep.check();
        ready = result.status === 'ok';
      } else {
        // No database dependency registered — assume ready
        ready = true;
      }

      res.json({
        status: ready ? 'ready' : 'not ready',
        service: serviceName,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      logger.error('Readiness check failed', err);
      res.status(503).json({
        status: 'not ready',
        service: serviceName,
        error: err.message || 'Readiness check error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /health/live
  router.get('/health/live', (_req: Request, res: Response) => {
    res.json({
      status: 'alive',
      service: serviceName,
      uptime: getUptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // GET /debug/env (development only)
  router.get('/debug/env', (_req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ error: 'Not available in production' });
      return;
    }

    const allowedKeys = ['NODE_ENV', 'PORT', 'APP_URL', 'CORS_ORIGIN', 'DB_PATH', 'APP_VERSION'];
    const sanitized: Record<string, string | undefined> = {};

    for (const key of allowedKeys) {
      const value = process.env[key];
      if (value !== undefined) {
        sanitized[key] = value;
      }
    }

    // Redact secrets
    for (const key of Object.keys(process.env)) {
      const upperKey = key.toUpperCase();
      if (/KEY|SECRET|TOKEN|PASSWORD/.test(upperKey)) {
        sanitized[key] = '***REDACTED***';
      }
    }

    res.json({ env: sanitized, service: serviceName });
  });

  // GET /debug/memory (development only)
  router.get('/debug/memory', (_req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ error: 'Not available in production' });
      return;
    }
    const mem = process.memoryUsage();
    res.json({
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external,
      uptime: getUptime(),
    });
  });

  // POST /debug/gc (stub)
  router.post('/debug/gc', (_req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      logger.warn('GC requested in production — no-op');
    } else {
      logger.info('GC requested stub called');
    }

    res.json({
      message: 'GC requested',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}