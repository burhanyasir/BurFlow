import { Router, Request, Response } from 'express';
import { TenantRepository, UserRepository } from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import {
  requireJsonObject, validateRequiredString, validateOptionalString,
  validateOptionalObject, validationError, NAME_MAX, DESCRIPTION_MAX,
} from '../middleware/validate';

const baseLogger = createLogger('saas-api:tenants');

// Tenant ids are UUIDs (agency-created) or app-generated ids like
// `tenant-1786006493162` / `tenant-demo-ecommerce` / `local-...`. A strict
// UUID check would reject every app-created workspace, but arbitrary strings
// must still be rejected (M-17 hardening).
const TENANT_ID_RE = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|(?:tenant|local)-[a-z0-9-]{1,40})$/i;
function validateTenantId(value: unknown, field: string) {
  if (typeof value !== 'string' || !TENANT_ID_RE.test(value)) {
    return { field, message: `${field} must be a valid tenant id (UUID or tenant/local- prefixed)` };
  }
  return null;
}

export function createTenantRoutes(tenantRepo: TenantRepository, userRepo: UserRepository): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
      const tenants = tenantRepo.findByOwner(req.user.sub);
      res.json({ tenants: tenants.map(t => ({ id: t.id, name: t.name, slug: t.slug, plan: t.plan, subscriptionStatus: t.subscriptionStatus, createdAt: t.createdAt })) });
    } catch (err: any) {
      createContextLogger(baseLogger).error({ err }, 'List tenants failed');
      res.status(500).json({ error: 'Failed to list tenants' });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

      const idErr = validateTenantId(req.params.id, 'id');
      if (idErr) return validationError(res, [idErr]);

      const tenant = tenantRepo.findById(req.params.id);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
      if (tenant.ownerId !== req.user.sub) return res.status(403).json({ error: 'Access denied' });
      res.json({ tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan, subscriptionStatus: tenant.subscriptionStatus, settings: tenant.settings, createdAt: tenant.createdAt } });
    } catch (err: any) {
      createContextLogger(baseLogger).error({ err }, 'Get tenant failed');
      res.status(500).json({ error: 'Failed to get tenant' });
    }
  });

  router.post('/', requireJsonObject, (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
      const { name } = req.body;

      const errors = [
        validateRequiredString(name, 'name', { maxLength: NAME_MAX }),
      ].filter(Boolean);

      if (errors.length > 0) return validationError(res, errors as any);

      const tenant = tenantRepo.create({ name, ownerId: req.user.sub });
      res.status(201).json({ tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan } });
    } catch (err: any) {
      createContextLogger(baseLogger).error({ err }, 'Create tenant failed');
      res.status(500).json({ error: 'Failed to create tenant' });
    }
  });

  router.put('/:id', requireJsonObject, (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

      const idErr = validateTenantId(req.params.id, 'id');
      if (idErr) return validationError(res, [idErr]);

      const tenant = tenantRepo.findById(req.params.id);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
      if (tenant.ownerId !== req.user.sub) return res.status(403).json({ error: 'Access denied' });

      const { name, settings } = req.body;
      const errors = [
        validateOptionalString(name, 'name', { maxLength: NAME_MAX }),
        validateOptionalObject(settings, 'settings'),
      ].filter(Boolean);

      if (errors.length > 0) return validationError(res, errors as any);

      const updated = tenantRepo.update(tenant.id, { name, settings });
      if (!updated) return res.status(500).json({ error: 'Failed to update tenant' });
      res.json({ tenant: { id: updated.id, name: updated.name, settings: updated.settings } });
    } catch (err: any) {
      createContextLogger(baseLogger).error({ err }, 'Update tenant failed');
      res.status(500).json({ error: 'Failed to update tenant' });
    }
  });

  router.delete('/:id', (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

      const idErr = validateTenantId(req.params.id, 'id');
      if (idErr) return validationError(res, [idErr]);

      const tenant = tenantRepo.findById(req.params.id);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
      if (tenant.ownerId !== req.user.sub) return res.status(403).json({ error: 'Access denied' });
      tenantRepo.delete(tenant.id);
      res.json({ message: 'Tenant deleted' });
    } catch (err: any) {
      createContextLogger(baseLogger).error({ err }, 'Delete tenant failed');
      res.status(500).json({ error: 'Failed to delete tenant' });
    }
  });

  router.get('/:id/members', (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

      const idErr = validateTenantId(req.params.id, 'id');
      if (idErr) return validationError(res, [idErr]);

      const tenant = tenantRepo.findById(req.params.id);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
      if (tenant.ownerId !== req.user.sub) return res.status(403).json({ error: 'Access denied' });
      const owner = userRepo.findById(tenant.ownerId);
      res.json({ members: owner ? [{ id: owner.id, email: owner.email, name: owner.name, role: 'owner' }] : [] });
    } catch (err: any) {
      createContextLogger(baseLogger).error({ err }, 'List members failed');
      res.status(500).json({ error: 'Failed to list members' });
    }
  });

  return router;
}
