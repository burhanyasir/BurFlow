import { Router, Request, Response } from 'express';
import { AnalyticsService } from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { createTtlCache } from '../utils/ttl-cache';

const logger = createLogger('saas-api:analytics');

/** 15s TTL cache — the dashboard polls at 15s, so reads are served from memory. */
const ANALYTICS_CACHE_TTL_MS = 15_000;
const summaryCache = createTtlCache<unknown>(ANALYTICS_CACHE_TTL_MS);

function timeframeFromQuery(req: Request): { startDate?: string; endDate?: string } {
  const startDate = (req.query.startDate as string) || (req.query.from as string);
  const endDate = (req.query.endDate as string) || (req.query.to as string);
  const timeframe: { startDate?: string; endDate?: string } = {};
  if (startDate) timeframe.startDate = startDate;
  if (endDate) timeframe.endDate = endDate;
  return timeframe;
}

function cacheKeyFor(tenantId: string, timeframe: { startDate?: string; endDate?: string }): string {
  return `${tenantId}|${timeframe.startDate || ''}|${timeframe.endDate || ''}`;
}

export function createAnalyticsRoutes(analyticsService: AnalyticsService): Router {
  const router = Router();

  router.get('/summary', (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const timeframe = timeframeFromQuery(req);
      const cacheKey = cacheKeyFor(tenantId, timeframe);
      const cached = summaryCache.get(cacheKey);
      if (cached !== undefined) {
        return res.json(cached);
      }
      const metrics = analyticsService.getSummaryMetrics(tenantId, timeframe);
      summaryCache.set(cacheKey, metrics);
      res.json(metrics);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Analytics summary failed');
      res.status(500).json({ error: 'Failed to load analytics summary' });
    }
  });

  router.get('/topics', (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const breakdown = analyticsService.getTopicBreakdown(tenantId, timeframeFromQuery(req));
      res.json(breakdown);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Analytics topics failed');
      res.status(500).json({ error: 'Failed to load topic breakdown' });
    }
  });

  router.get('/starter-chips', (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const stats = analyticsService.getStarterOptionStats(tenantId);
      res.json(stats);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Analytics starter chips failed');
      res.status(500).json({ error: 'Failed to load starter chip stats' });
    }
  });

  return router;
}
