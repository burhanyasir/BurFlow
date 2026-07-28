import { Router, Request, Response } from 'express';
import {
  AuditLogRepository,
} from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { parsePagination } from '../middleware/validate';

const logger = createLogger('saas-api:audit');

const VALID_EVENTS = [
  'login', 'logout',
  'api_key.created', 'api_key.deleted',
  'knowledge.uploaded', 'knowledge.deleted',
  'widget.changed',
  'user.invited', 'user.removed',
  'role.changed',
  'billing.updated',
];

export function createAuditRoutes(auditRepo: AuditLogRepository): Router {
  const router = Router();

  const adminOnly = (req: Request, res: Response, next: Function) => {
    if (!req.user?.role || !['admin', 'owner'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };

  router.get('/', adminOnly, (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { page, limit } = parsePagination(req.query as any, { limit: 50, maxLimit: 200 });
      const { eventType, resourceType, from, to, search } = req.query as Record<string, string | undefined>;
      const result = auditRepo.listByTenant(tenantId, { eventType, resourceType, from, to, search }, page, limit);
      res.json({ entries: result.entries, total: result.total, page, limit });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Audit list failed');
      res.status(500).json({ error: 'Failed to list audit entries' });
    }
  });

  router.get('/export', adminOnly, (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { eventType, from, to } = req.query as Record<string, string | undefined>;
      const entries = auditRepo.exportByTenant(tenantId, { eventType, from, to });

      const header = 'id,user_name,event_type,resource_type,resource_id,details,ip_address,created_at';
      const csvEscape = (v: string | null | undefined) => {
        if (v == null) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const rows = entries.map(e =>
        [e.id, e.userName, e.eventType, e.resourceType, e.resourceId, e.details, e.ipAddress, e.createdAt].map(csvEscape).join(',')
      );
      const csv = [header, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"');
      res.send(csv);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Audit export failed');
      res.status(500).json({ error: 'Failed to export audit entries' });
    }
  });

  router.get('/events', (req: Request, res: Response) => {
    res.json(VALID_EVENTS);
  });

  return router;
}
