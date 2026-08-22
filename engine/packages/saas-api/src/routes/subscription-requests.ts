import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository, TenantRepository, SubscriptionRepository, type SqlDatabase } from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { randomBytes } from 'crypto';

const logger = createLogger('saas-api:subscription-requests');

function generateId(): string {
  return randomBytes(16).toString('hex');
}

export function createSubscriptionRequestRoutes(
  userRepo: UserRepository,
  tenantRepo: TenantRepository,
  subRepo: SubscriptionRepository,
  jwtSecret: string,
  db: SqlDatabase,
): Router {
  const router = Router();

  // ─── USER: Submit a plan request ─────────────────────────────────────
  // Any authenticated user can request a plan upgrade
  router.post('/request', (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      let userId: string;
      let tenantId: string;
      try {
        const payload = jwt.verify(authHeader.slice(7), jwtSecret, { algorithms: ['HS256'] }) as any;
        userId = payload.sub;
        tenantId = payload.tenantId;
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { plan, billingPeriod } = req.body;
      const VALID = ['starter', 'pro', 'advanced'];
      if (!plan || !VALID.includes(plan)) {
        return res.status(400).json({ error: `Invalid plan. Must be one of: ${VALID.join(', ')}` });
      }

      const user = userRepo.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const now = new Date().toISOString();

      // Check for existing pending request
      const existing = db.prepare(
        'SELECT id FROM subscription_requests WHERE tenant_id = ? AND status = ?'
      ).get(tenantId, 'pending') as any;
      if (existing) {
        return res.status(409).json({ error: 'You already have a pending plan request. Wait for the owner to review it.' });
      }

      const id = generateId();
      db.prepare(
        'INSERT INTO subscription_requests (id, tenant_id, user_email, user_name, requested_plan, billing_period, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(id, tenantId, user.email, user.name, plan, billingPeriod || 'monthly', 'pending', now, now);

      createContextLogger(logger).info({ tenantId, email: user.email, plan }, 'Plan request submitted');
      res.json({ ok: true, message: 'Your plan request has been submitted. The owner will review it shortly.' });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Plan request failed');
      res.status(500).json({ error: 'Failed to submit request' });
    }
  });

  // ─── USER: Check own pending request ─────────────────────────────────
  router.get('/pending', (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });

      let tenantId: string;
      try {
        const payload = jwt.verify(authHeader.slice(7), jwtSecret, { algorithms: ['HS256'] }) as any;
        tenantId = payload.tenantId;
      } catch { return res.status(401).json({ error: 'Invalid token' }); }

      const row = db.prepare(
        'SELECT id, requested_plan as "plan", billing_period as "billingPeriod", status, created_at as "createdAt" FROM subscription_requests WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1'
      ).get(tenantId, 'pending') as any;

      res.json({ request: row || null });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to check pending request' });
    }
  });

  // ─── OWNER: List all requests ────────────────────────────────────────
  const ownerOnly = (req: Request, res: Response, next: Function) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
    try {
      const payload = jwt.verify(authHeader.slice(7), jwtSecret, { algorithms: ['HS256'] }) as any;
      if (payload.role !== 'owner' || payload.panel !== 'owner') return res.status(403).json({ error: 'Owner access required' });
      next();
    } catch { return res.status(401).json({ error: 'Invalid token' }); }
  };

  router.get('/list', ownerOnly, (_req: Request, res: Response) => {
    try {
      const status = (_req.query.status as string) || 'pending';
      const rows = db.prepare(
        'SELECT * FROM subscription_requests WHERE status = ? ORDER BY created_at DESC'
      ).all(status) as any[];
      res.json({ requests: rows });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to list requests' });
    }
  });

  router.get('/all', ownerOnly, (_req: Request, res: Response) => {
    try {
      const rows = db.prepare(
        'SELECT * FROM subscription_requests ORDER BY created_at DESC'
      ).all() as any[];
      res.json({ requests: rows });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to list requests' });
    }
  });

  // ─── OWNER: Approve a request → activate plan ───────────────────────
  router.post('/:id/approve', ownerOnly, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const row = db.prepare('SELECT * FROM subscription_requests WHERE id = ?').get(id) as any;
      if (!row) return res.status(404).json({ error: 'Request not found' });
      if (row.status !== 'pending') return res.status(400).json({ error: 'Request is not pending' });

      const now = new Date().toISOString();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Activate the plan on the tenant — ensure subscription row exists first
      subRepo.init(row.tenant_id, row.requested_plan as any);
      subRepo.update(row.tenant_id, {
        plan: row.requested_plan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEnd: undefined,
        cancelledAt: undefined,
      });
      tenantRepo.update(row.tenant_id, {
        plan: row.requested_plan,
        subscriptionStatus: 'active',
        subscriptionPeriodEnd: periodEnd,
      });

      // Update request status
      db.prepare('UPDATE subscription_requests SET status = ?, updated_at = ? WHERE id = ?').run('approved', now, id);

      createContextLogger(logger).info({ requestId: id, tenantId: row.tenant_id, plan: row.requested_plan }, 'Plan request approved');
      res.json({ ok: true, plan: row.requested_plan, periodEnd });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Approve request failed');
      res.status(500).json({ error: 'Failed to approve request' });
    }
  });

  // ─── OWNER: Reject a request ─────────────────────────────────────────
  router.post('/:id/reject', ownerOnly, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const now = new Date().toISOString();
      db.prepare('UPDATE subscription_requests SET status = ?, owner_notes = ?, updated_at = ? WHERE id = ?')
        .run('rejected', req.body.reason || '', now, id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to reject request' });
    }
  });

  return router;
}
