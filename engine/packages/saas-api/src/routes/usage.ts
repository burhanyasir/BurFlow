import { Router, Request, Response } from 'express';
import { UsageRepository } from '@conversation-engine/saas-core';
import { parsePagination } from '../middleware/validate';

export function createUsageRoutes(usageRepo: UsageRepository): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });
    const { page, limit } = parsePagination(req.query, { page: 1, limit: 12, maxLimit: 200 });
    const result = usageRepo.listByTenant(req.user.tenantId, page, limit);
    res.json(result);
  });

  router.get('/current', (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });
    const period = new Date().toISOString().slice(0, 7);
    const usage = usageRepo.getOrCreate(req.user.tenantId, period);
    res.json({ usage });
  });

  return router;
}
