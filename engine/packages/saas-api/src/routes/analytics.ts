import { Router, Request, Response } from 'express';
import { AnalyticsService } from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';

const logger = createLogger('saas-api:analytics');

function timeframeFromQuery(req: Request): { startDate?: string; endDate?: string } {
  const startDate = (req.query.startDate as string) || (req.query.from as string);
  const endDate = (req.query.endDate as string) || (req.query.to as string);
  const timeframe: { startDate?: string; endDate?: string } = {};
  if (startDate) timeframe.startDate = startDate;
  if (endDate) timeframe.endDate = endDate;
  return timeframe;
}

export function createAnalyticsRoutes(analyticsService: AnalyticsService): Router {
  const router = Router();

  router.get('/summary', (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const metrics = analyticsService.getSummaryMetrics(tenantId, timeframeFromQuery(req));
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
