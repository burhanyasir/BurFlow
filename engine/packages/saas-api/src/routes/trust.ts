import { Router, Request, Response } from 'express';
import {
  UptimeRepository, SecurityStatusRepository, IncidentRepository,
  ComplianceDocumentRepository, DpaRepository, SubprocessorRepository,
  SecurityStatusType, IncidentSeverity,
} from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';

const logger = createLogger('saas-api:trust');

export function createTrustRoutes(
  uptimeRepo: UptimeRepository,
  securityRepo: SecurityStatusRepository,
  incidentRepo: IncidentRepository,
  complianceRepo: ComplianceDocumentRepository,
  dpaRepo: DpaRepository,
  subRepo: SubprocessorRepository,
): Router {
  const router = Router();

  const adminOnly = (req: Request, res: Response, next: Function) => {
    if (!req.user?.role || !['admin', 'owner'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };

  // ── Uptime ──

  router.get('/uptime', (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const days = parseInt(req.query.days as string || '30', 10);
      const history = uptimeRepo.listByTenant(tenantId, days);
      const aggregate = uptimeRepo.getAggregate(tenantId, days);
      res.json({ history, aggregate });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'List uptime failed');
      res.status(500).json({ error: 'Failed to list uptime' });
    }
  });

  router.post('/uptime', adminOnly, (req: Request, res: Response) => {
    try {
      const { date, uptimePercentage, downtimeSeconds } = req.body;
      const record = uptimeRepo.record(req.tenantId!, date, uptimePercentage, downtimeSeconds);
      res.status(201).json(record);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Record uptime failed');
      res.status(500).json({ error: 'Failed to record uptime' });
    }
  });

  // ── Security ──

  router.get('/security', (req: Request, res: Response) => {
    try {
      const status = securityRepo.findByTenant(req.tenantId!);
      if (!status) return res.json({ status: 'secure', lastScanAt: null, findings: '[]' });
      res.json(status);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Get security status failed');
      res.status(500).json({ error: 'Failed to fetch security status' });
    }
  });

  router.post('/security', adminOnly, (req: Request, res: Response) => {
    try {
      const { status, findings } = req.body as { status: SecurityStatusType; findings: string[] };
      const result = securityRepo.upsert(req.tenantId!, status, findings);
      res.status(201).json(result);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Upsert security status failed');
      res.status(500).json({ error: 'Failed to update security status' });
    }
  });

  // ── Incidents ──

  router.get('/incidents', (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const incidents = incidentRepo.listByTenant(req.tenantId!, status);
      res.json(incidents);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'List incidents failed');
      res.status(500).json({ error: 'Failed to list incidents' });
    }
  });

  router.post('/incidents', adminOnly, (req: Request, res: Response) => {
    try {
      const { title, description, severity } = req.body as { title: string; description: string; severity: IncidentSeverity };
      const incident = incidentRepo.create(req.tenantId!, title, description, severity);
      res.status(201).json(incident);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Create incident failed');
      res.status(500).json({ error: 'Failed to create incident' });
    }
  });

  router.put('/incidents/:id/status', adminOnly, (req: Request, res: Response) => {
    try {
      const { status } = req.body as { status: string };
      const updated = incidentRepo.updateStatus(req.params.id, status as any);
      if (!updated) return res.status(404).json({ error: 'Incident not found' });
      res.json(updated);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Update incident status failed');
      res.status(500).json({ error: 'Failed to update incident status' });
    }
  });

  // ── Compliance Documents ──

  router.get('/compliance', (req: Request, res: Response) => {
    try {
      const docs = complianceRepo.listByTenant(req.tenantId!);
      res.json(docs);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'List compliance documents failed');
      res.status(500).json({ error: 'Failed to list compliance documents' });
    }
  });

  // ── DPA ──

  router.get('/dpa', (req: Request, res: Response) => {
    try {
      const dpa = dpaRepo.findByTenant(req.tenantId!);
      if (!dpa) return res.json(null);
      res.json(dpa);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Get DPA failed');
      res.status(500).json({ error: 'Failed to fetch DPA' });
    }
  });

  router.post('/dpa', adminOnly, (req: Request, res: Response) => {
    try {
      const { version, fileUrl, signedAt, expiresAt } = req.body as { version: string; fileUrl: string; signedAt?: string; expiresAt?: string };
      const dpa = dpaRepo.upsert(req.tenantId!, version, fileUrl, signedAt, expiresAt);
      res.status(201).json(dpa);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Upsert DPA failed');
      res.status(500).json({ error: 'Failed to update DPA' });
    }
  });

  // ── Subprocessors ──

  router.get('/subprocessors', (req: Request, res: Response) => {
    try {
      const subs = subRepo.listByTenant(req.tenantId!);
      res.json(subs);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'List subprocessors failed');
      res.status(500).json({ error: 'Failed to list subprocessors' });
    }
  });

  router.post('/subprocessors', adminOnly, (req: Request, res: Response) => {
    try {
      const { name, purpose, location, dataProcessed } = req.body as { name: string; purpose: string; location: string; dataProcessed: string };
      const sub = subRepo.create(req.tenantId!, name, purpose, location, dataProcessed);
      res.status(201).json(sub);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Create subprocessor failed');
      res.status(500).json({ error: 'Failed to create subprocessor' });
    }
  });

  router.put('/subprocessors/:id', adminOnly, (req: Request, res: Response) => {
    try {
      const { name, purpose, location, dataProcessed, status } = req.body as { name?: string; purpose?: string; location?: string; dataProcessed?: string; status?: 'active' | 'retired' };
      const updated = subRepo.update(req.params.id, req.tenantId!, { name, purpose, location, dataProcessed, status });
      if (!updated) return res.status(404).json({ error: 'Subprocessor not found' });
      res.json(updated);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Update subprocessor failed');
      res.status(500).json({ error: 'Failed to update subprocessor' });
    }
  });

  router.delete('/subprocessors/:id', adminOnly, (req: Request, res: Response) => {
    try {
      const deleted = subRepo.delete(req.params.id, req.tenantId!);
      if (!deleted) return res.status(404).json({ error: 'Subprocessor not found' });
      res.json({ success: true });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Delete subprocessor failed');
      res.status(500).json({ error: 'Failed to delete subprocessor' });
    }
  });

  return router;
}
