import { Router, Request, Response } from 'express';
import { TenantRepository, generateToken } from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';

const logger = createLogger('saas-api:agency');

const DOMAIN_RE = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export interface AgencyRouteDeps {
  tenantRepo: TenantRepository;
  jwtSecret: string;
}

function serializeWorkspace(t: any) {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    plan: t.plan,
    subscriptionStatus: t.subscriptionStatus,
    customDomain: t.customDomain || null,
    createdAt: t.createdAt,
  };
}

export function createAgencyRoutes({ tenantRepo, jwtSecret }: AgencyRouteDeps): Router {
  const router = Router();

  const adminOnly = (req: Request, res: Response, next: Function) => {
    if (!req.user?.role || !['admin', 'owner'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };

  // List all sub-tenants (client workspaces) managed by this agency.
  // When called from a sub-tenant context, also returns the parent workspace so
  // the UI can offer "switch back".
  router.get('/workspaces', adminOnly, (req: Request, res: Response) => {
    try {
      const workspaces = tenantRepo.findSubTenantsByParentId(req.tenantId!).map(serializeWorkspace);
      const current = tenantRepo.findById(req.tenantId!);
      const parent = current?.parentTenantId ? tenantRepo.findById(current.parentTenantId) : null;
      res.json({ workspaces, parent: parent ? serializeWorkspace(parent) : null });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Failed to list agency workspaces');
      res.status(500).json({ error: 'Failed to list agency workspaces' });
    }
  });

  // Create a new client workspace under this agency
  router.post('/workspaces', adminOnly, (req: Request, res: Response) => {
    try {
      const { name, customDomain } = req.body || {};
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Workspace name is required' });
      }
      let domain: string | undefined;
      if (customDomain !== undefined && customDomain !== null && customDomain !== '') {
        if (typeof customDomain !== 'string' || !DOMAIN_RE.test(customDomain.trim())) {
          return res.status(400).json({ error: 'customDomain must be a valid domain name' });
        }
        domain = customDomain.trim().toLowerCase();
        if (tenantRepo.findByCustomDomain(domain)) {
          return res.status(409).json({ error: 'customDomain is already in use' });
        }
      }
      const workspace = tenantRepo.create({
        name: name.trim(),
        ownerId: req.user!.sub,
        parentTenantId: req.tenantId!,
        customDomain: domain,
      });
      res.status(201).json({ workspace: serializeWorkspace(workspace) });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Failed to create agency workspace');
      res.status(500).json({ error: 'Failed to create agency workspace' });
    }
  });

  // Switch the acting session into one of the agency's client workspaces
  router.post('/switch-workspace', adminOnly, (req: Request, res: Response) => {
    try {
      const { subTenantId } = req.body || {};
      if (!subTenantId || typeof subTenantId !== 'string') {
        return res.status(400).json({ error: 'subTenantId is required' });
      }
      const sub = tenantRepo.findById(subTenantId);
      if (!sub) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      const current = tenantRepo.findById(req.tenantId!);
      const isChild = sub.parentTenantId === req.tenantId;
      const isParent = current?.parentTenantId === sub.id;
      if (!isChild && !isParent) {
        return res.status(403).json({ error: 'Workspace does not belong to this agency' });
      }
      const token = generateToken({
        sub: req.user!.sub,
        email: req.user!.email,
        name: req.user!.name,
        tenantId: sub.id,
        role: req.user!.role || 'owner',
      }, jwtSecret);
      res.json({
        token,
        tenant: { id: sub.id, name: sub.name, slug: sub.slug, plan: sub.plan, subscriptionStatus: sub.subscriptionStatus },
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Failed to switch agency workspace');
      res.status(500).json({ error: 'Failed to switch agency workspace' });
    }
  });

  // Update white-label branding / custom domain for the current workspace
  router.put('/branding', adminOnly, (req: Request, res: Response) => {
    try {
      const { customDomain, logoUrl, primaryColor, faviconUrl, companyName, hideBranding, customCss } = req.body || {};
      let domain: string | null | undefined;
      if (customDomain !== undefined) {
        if (customDomain === null || customDomain === '') {
          domain = null;
        } else if (typeof customDomain !== 'string' || !DOMAIN_RE.test(customDomain.trim())) {
          return res.status(400).json({ error: 'customDomain must be a valid domain name' });
        } else {
          domain = customDomain.trim().toLowerCase();
          const clash = tenantRepo.findByCustomDomain(domain);
          if (clash && clash.id !== req.tenantId) {
            return res.status(409).json({ error: 'customDomain is already in use' });
          }
        }
      }
      const branding: Record<string, unknown> = {};
      if (logoUrl !== undefined) {
        if (typeof logoUrl !== 'string') return res.status(400).json({ error: 'logoUrl must be a string' });
        branding.logoUrl = logoUrl;
      }
      if (primaryColor !== undefined) {
        if (typeof primaryColor !== 'string' || !/^#[0-9a-fA-F]{3,8}$/.test(primaryColor)) {
          return res.status(400).json({ error: 'primaryColor must be a valid hex color' });
        }
        branding.primaryColor = primaryColor;
      }
      if (faviconUrl !== undefined) {
        if (typeof faviconUrl !== 'string') return res.status(400).json({ error: 'faviconUrl must be a string' });
        branding.faviconUrl = faviconUrl;
      }
      if (companyName !== undefined) {
        if (typeof companyName !== 'string' || !companyName.trim()) return res.status(400).json({ error: 'companyName must be a non-empty string' });
        branding.companyName = companyName.trim();
      }
      if (hideBranding !== undefined) {
        if (typeof hideBranding !== 'boolean') return res.status(400).json({ error: 'hideBranding must be a boolean' });
        branding.hideBranding = hideBranding;
      }
      if (customCss !== undefined) {
        if (typeof customCss !== 'string') return res.status(400).json({ error: 'customCss must be a string' });
        branding.customCss = customCss;
      }
      const updated = tenantRepo.updateBranding(req.tenantId!, {
        customDomain: domain,
        whiteLabelBranding: Object.keys(branding).length > 0 ? branding : undefined,
      });
      if (!updated) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      res.json({ tenant: serializeWorkspace(updated), whiteLabelBranding: updated.whiteLabelBranding || {} });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Failed to update agency branding');
      res.status(500).json({ error: 'Failed to update agency branding' });
    }
  });

  return router;
}
