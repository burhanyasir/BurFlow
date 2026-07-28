import { Request, Response, NextFunction } from 'express';
import { TenantRepository } from '@conversation-engine/saas-core';
import { createLogger } from '@conversation-engine/logger';

const logger = createLogger('saas-api:tenant');

export function requireTenant(tenantRepo: TenantRepository) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantId = req.tenantId || req.params.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }
    const tenant = tenantRepo.findById(tenantId);
    if (!tenant) {
      logger.warn({ tenantId }, 'Tenant not found');
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    (req as any).tenant = tenant;
    next();
  };
}

export function enforceTenantAccess(paramName = 'tenantId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const resourceTenantId = req.params[paramName] || req.body?.tenantId;
    const userTenantId = req.tenantId;
    if (resourceTenantId && userTenantId && resourceTenantId !== userTenantId) {
      res.status(403).json({ error: 'Cross-tenant access denied' });
      return;
    }
    next();
  };
}
