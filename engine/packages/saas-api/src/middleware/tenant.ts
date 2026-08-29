import { Request, Response, NextFunction } from 'express';
import { TenantRepository } from '@conversation-engine/saas-core';
import { createLogger } from '@conversation-engine/logger';

const logger = createLogger('saas-api:tenant');

/**
 * Public demo tenants that are allowed to operate even before their tenant
 * row has been seeded (first-run bootstrap). The landing-page widget boots
 * with `burflow-saas` and the legacy demo widget used `demo-tenant`; their
 * conversations, messages and usage are keyed by the tenant id string, so no
 * tenant row is required for chat to work.
 */
export const DEMO_TENANT_IDS = new Set([
  'burflow-saas',
  'demo-tenant',
  'demo-dental',
  'demo-ecommerce',
  'bright-smile-dental-4b7e29',
  'burflow-store-212de6',
]);

export function requireTenant(tenantRepo: TenantRepository, opts?: { allowDemoTenants?: boolean }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantId = req.tenantId || req.params.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }
    let tenant = tenantRepo.findById(tenantId);
    if (!tenant) {
      // Public demo tenants may operate before their row is seeded (e.g. the
      // landing-page widget talking to the `burflow-saas` demo tenant on a
      // fresh database). Bootstrap the demo row on first use so conversations
      // can be persisted (the conversations.tenant_id FK requires the row),
      // then proceed. Admin routes keep the strict behavior — a missing
      // tenant row still 404s there.
      if (opts?.allowDemoTenants && DEMO_TENANT_IDS.has(tenantId)) {
        try {
          if (typeof (tenantRepo as any).ensureDemoTenant === 'function') {
            (tenantRepo as any).ensureDemoTenant(tenantId);
          }
        } catch (err) {
          logger.warn({ tenantId, err }, 'Demo tenant bootstrap failed — continuing with stub tenant');
        }
        tenant = tenantRepo.findById(tenantId);
        if (tenant) {
          (req as any).tenant = tenant;
          next();
          return;
        }
        (req as any).tenant = { id: tenantId };
        next();
        return;
      }
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
