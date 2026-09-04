import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  UserRepository, TenantRepository, ConversationRepository,
  UsageRepository, KnowledgeBaseRepository, KbDocumentRepository,
  ApiKeyRepository, AnalyticsRepository, SubscriptionRepository,
  MessageRepository, LeadRepository, HandoffRequestRepository,
  TeamMemberRepository,
} from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { validateUUID } from '../middleware/validate';

const logger = createLogger('saas-api:owner-admin');

const VALID_PLANS = ['free', 'starter', 'pro', 'professional', 'advanced', 'enterprise'];
const VALID_STATUSES = ['active', 'trialing', 'past_due', 'cancelled', 'expired', 'paused'];

export function createOwnerAdminRoutes(
  userRepo: UserRepository,
  tenantRepo: TenantRepository,
  conversationRepo: ConversationRepository,
  usageRepo: UsageRepository,
  kbRepo: KnowledgeBaseRepository,
  docRepo: KbDocumentRepository,
  apiKeyRepo: ApiKeyRepository,
  analyticsRepo: AnalyticsRepository,
  subRepo: SubscriptionRepository,
  messageRepo: MessageRepository,
  leadRepo: LeadRepository,
  handoffReqRepo: HandoffRequestRepository,
  teamMemberRepo: TeamMemberRepository,
  jwtSecret: string,
  signupEventRepo: any,
  db: any,
): Router {
  const router = Router();

  const OWNER_EMAIL = process.env.OWNER_EMAIL || 'burhanyasir82@gmail.com';

  const ownerOnly = (req: Request, res: Response, next: Function) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const payload = jwt.verify(authHeader.slice(7), jwtSecret, { algorithms: ['HS256'] }) as any;
      if (payload.role !== 'owner' || payload.panel !== 'owner') {
        return res.status(403).json({ error: 'Owner panel access required' });
      }
      if (payload.email !== OWNER_EMAIL) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      req.user = payload;
      req.tenantId = payload.tenantId;
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };

  // ─── TENANT LIST with full details ───────────────────────────────────
  router.get('/tenants', ownerOnly, (req: Request, res: Response) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const search = (req.query.search as string || '').toLowerCase();

      let result = subRepo.list(page, limit);
      let tenants = result.subscriptions.map(s => {
        const tenant = tenantRepo.findById(s.tenantId);
        const owner = tenant ? userRepo.findById(tenant.ownerId) : null;
        const convs = conversationRepo.listByTenant(s.tenantId, 1, 1);
        const currentUsage = usageRepo.getCurrentMonthConversations(s.tenantId);
        const teamCount = teamMemberRepo.findByTenant(s.tenantId).length;
        const kbCount = kbRepo.listByTenant(s.tenantId).length;

        return {
          id: s.tenantId,
          name: tenant?.name || 'Unknown',
          slug: tenant?.slug || '',
          ownerEmail: owner?.email || 'Unknown',
          ownerName: owner?.name || 'Unknown',
          plan: s.plan,
          subscriptionStatus: s.status,
          currentPeriodEnd: s.currentPeriodEnd,
          trialEnd: s.trialEnd,
          conversationsCount: convs.total,
          teamMembersCount: teamCount,
          knowledgeBasesCount: kbCount,
          createdAt: tenant ? (tenant as any).created_at : null,
        };
      });

      if (search) {
        tenants = tenants.filter(t =>
          t.name.toLowerCase().includes(search) ||
          t.ownerEmail.toLowerCase().includes(search) ||
          t.id.toLowerCase().includes(search) ||
          t.slug.toLowerCase().includes(search)
        );
      }

      res.json({ tenants, total: result.total, page, limit });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Owner tenant list failed');
      res.status(500).json({ error: 'Failed to list tenants' });
    }
  });

  // ─── TENANT DETAIL ───────────────────────────────────────────────────
  router.get('/tenants/:tenantId', ownerOnly, (req: Request, res: Response) => {
    try {
      const uuidErr = validateUUID(req.params.tenantId, 'tenantId');
      if (uuidErr) return res.status(400).json({ error: uuidErr.message, field: uuidErr.field });

      const { tenantId } = req.params;
      const tenant = tenantRepo.findById(tenantId);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

      const owner = userRepo.findById(tenant.ownerId);
      const sub = subRepo.findByTenant(tenantId);
      const teamMembers = teamMemberRepo.findByTenant(tenantId);
      const kbs = kbRepo.listByTenant(tenantId);
      const docs = docRepo.listByTenant(tenantId);
      const docStatus = docRepo.countByStatus(tenantId);
      const convs = conversationRepo.listByTenant(tenantId, 1, 1);
      const activeConvs = conversationRepo.listActiveByTenant(tenantId);
      const currentUsage = usageRepo.getCurrentMonthConversations(tenantId);
      const usageHistory = usageRepo.listByTenant(tenantId, 1, 12);
      const leads = leadRepo.findByTenant(tenantId, 1, 1);
      const apiKeys = apiKeyRepo.findByTenant(tenantId);

      const planLimits = getPlanLimits(sub?.plan || 'free');

      res.json({
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
          subscriptionStatus: tenant.subscriptionStatus,
          subscriptionPeriodEnd: tenant.subscriptionPeriodEnd,
          customDomain: tenant.customDomain,
          notificationEmail: tenant.notificationEmail,
          createdAt: (tenant as any).created_at,
          updatedAt: (tenant as any).updated_at,
        },
        owner: owner ? { id: owner.id, email: owner.email, name: owner.name, emailVerified: owner.emailVerified } : null,
        subscription: sub ? {
          plan: sub.plan,
          status: sub.status,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          trialStart: sub.trialStart,
          trialEnd: sub.trialEnd,
          cancelledAt: sub.cancelledAt,
        } : null,
        planLimits,
        usage: {
          currentMonth: currentUsage,
          history: usageHistory.records,
        },
        stats: {
          totalConversations: convs.total,
          activeConversations: activeConvs.length,
          totalLeads: leads.total,
          totalKnowledgeBases: kbs.length,
          totalDocuments: docs.length,
          documentsByStatus: docStatus,
          teamMembers: teamMembers.length,
          apiKeys: apiKeys.length,
        },
        teamMembers: teamMembers.map(tm => ({
          id: tm.id,
          userId: tm.userId,
          email: tm.email,
          name: tm.name,
          role: tm.role,
          joinedAt: tm.joinedAt,
        })),
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Owner tenant detail failed');
      res.status(500).json({ error: 'Failed to get tenant details' });
    }
  });

  // ─── UPDATE PLAN ─────────────────────────────────────────────────────
  router.post('/tenants/:tenantId/plan', ownerOnly, (req: Request, res: Response) => {
    try {
      const uuidErr = validateUUID(req.params.tenantId, 'tenantId');
      if (uuidErr) return res.status(400).json({ error: uuidErr.message, field: uuidErr.field });

      const { tenantId } = req.params;
      const { plan, periodEnd } = req.body;

      if (!plan || !VALID_PLANS.includes(plan)) {
        return res.status(400).json({ error: `Invalid plan. Must be one of: ${VALID_PLANS.join(', ')}` });
      }

      const normalizedPlan = plan === 'professional' ? 'pro' : plan;
      const now = new Date().toISOString();
      const end = periodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      subRepo.update(tenantId, {
        plan: normalizedPlan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: end,
        cancelledAt: undefined,
      });
      tenantRepo.update(tenantId, {
        plan: normalizedPlan,
        subscriptionStatus: 'active',
        subscriptionPeriodEnd: end,
      });

      createContextLogger(logger).info({ tenantId, plan: normalizedPlan, periodEnd: end }, 'Owner updated plan');
      res.json({ ok: true, plan: normalizedPlan, status: 'active', periodEnd: end });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Owner plan update failed');
      res.status(500).json({ error: 'Failed to update plan' });
    }
  });

  // ─── UPDATE SUBSCRIPTION STATUS ──────────────────────────────────────
  router.post('/tenants/:tenantId/status', ownerOnly, (req: Request, res: Response) => {
    try {
      const uuidErr = validateUUID(req.params.tenantId, 'tenantId');
      if (uuidErr) return res.status(400).json({ error: uuidErr.message, field: uuidErr.field });

      const { tenantId } = req.params;
      const { status } = req.body;

      if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
      }

      subRepo.update(tenantId, { status });
      tenantRepo.update(tenantId, { subscriptionStatus: status });

      createContextLogger(logger).info({ tenantId, status }, 'Owner updated subscription status');
      res.json({ ok: true, status });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Owner status update failed');
      res.status(500).json({ error: 'Failed to update status' });
    }
  });

  // ─── EXTEND PERIOD ──────────────────────────────────────────────────
  router.post('/tenants/:tenantId/extend', ownerOnly, (req: Request, res: Response) => {
    try {
      const uuidErr = validateUUID(req.params.tenantId, 'tenantId');
      if (uuidErr) return res.status(400).json({ error: uuidErr.message, field: uuidErr.field });

      const { tenantId } = req.params;
      const { days } = req.body;
      const addDays = Math.max(1, Math.min(365, Number(days) || 30));

      const sub = subRepo.findByTenant(tenantId);
      const currentEnd = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : new Date();
      const newEnd = new Date(currentEnd.getTime() + addDays * 24 * 60 * 60 * 1000).toISOString();

      subRepo.update(tenantId, { currentPeriodEnd: newEnd });
      tenantRepo.update(tenantId, { subscriptionPeriodEnd: newEnd });

      createContextLogger(logger).info({ tenantId, days: addDays, newEnd }, 'Owner extended period');
      res.json({ ok: true, newPeriodEnd: newEnd, daysAdded: addDays });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Owner extend period failed');
      res.status(500).json({ error: 'Failed to extend period' });
    }
  });

  // ─── CANCEL SUBSCRIPTION ─────────────────────────────────────────────
  router.post('/tenants/:tenantId/cancel', ownerOnly, (req: Request, res: Response) => {
    try {
      const uuidErr = validateUUID(req.params.tenantId, 'tenantId');
      if (uuidErr) return res.status(400).json({ error: uuidErr.message, field: uuidErr.field });

      const { tenantId } = req.params;
      const now = new Date().toISOString();

      subRepo.update(tenantId, { status: 'cancelled', cancelledAt: now });
      tenantRepo.update(tenantId, { subscriptionStatus: 'cancelled' });

      createContextLogger(logger).info({ tenantId }, 'Owner cancelled subscription');
      res.json({ ok: true, status: 'cancelled', cancelledAt: now });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Owner cancel failed');
      res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  });

  // ─── REACTIVATE ─────────────────────────────────────────────────────
  router.post('/tenants/:tenantId/reactivate', ownerOnly, (req: Request, res: Response) => {
    try {
      const uuidErr = validateUUID(req.params.tenantId, 'tenantId');
      if (uuidErr) return res.status(400).json({ error: uuidErr.message, field: uuidErr.field });

      const { tenantId } = req.params;
      const now = new Date().toISOString();
      const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const sub = subRepo.findByTenant(tenantId);
      const plan = sub?.plan && sub.plan !== 'free' ? sub.plan : 'starter';

      subRepo.update(tenantId, { plan, status: 'active', currentPeriodStart: now, currentPeriodEnd: end, cancelledAt: undefined });
      tenantRepo.update(tenantId, { plan, subscriptionStatus: 'active', subscriptionPeriodEnd: end });

      createContextLogger(logger).info({ tenantId, plan }, 'Owner reactivated subscription');
      res.json({ ok: true, plan, status: 'active', periodEnd: end });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Owner reactivate failed');
      res.status(500).json({ error: 'Failed to reactivate subscription' });
    }
  });

  // ─── DELETE TENANT ──────────────────────────────────────────────────
  router.delete('/tenants/:tenantId', ownerOnly, (req: Request, res: Response) => {
    try {
      const uuidErr = validateUUID(req.params.tenantId, 'tenantId');
      if (uuidErr) return res.status(400).json({ error: uuidErr.message, field: uuidErr.field });

      const { tenantId } = req.params;
      const deleted = tenantRepo.delete(tenantId);
      if (!deleted) return res.status(404).json({ error: 'Tenant not found' });

      createContextLogger(logger).info({ tenantId }, 'Owner deleted tenant');
      res.json({ ok: true });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Owner delete tenant failed');
      res.status(500).json({ error: 'Failed to delete tenant' });
    }
  });

  // ─── RENAME TENANT ──────────────────────────────────────────────────
  router.post('/tenants/:tenantId/rename', ownerOnly, (req: Request, res: Response) => {
    try {
      const uuidErr = validateUUID(req.params.tenantId, 'tenantId');
      if (uuidErr) return res.status(400).json({ error: uuidErr.message, field: uuidErr.field });

      const { tenantId } = req.params;
      const { name } = req.body;
      if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: 'Name must be at least 2 characters' });
      }
      tenantRepo.update(tenantId, { name: name.trim() });
      res.json({ ok: true, name: name.trim() });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to rename tenant' });
    }
  });

  // ─── CREATE TENANT ──────────────────────────────────────────────────
  router.post('/tenants', ownerOnly, (req: Request, res: Response) => {
    try {
      const { name, email, password, plan } = req.body;

      if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: 'Workspace name must be at least 2 characters' });
      }
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email is required' });
      }
      if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      const existing = userRepo.findByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const user = userRepo.create({ email, password, name: name.trim() });
      const tenant = tenantRepo.create({ name: name.trim(), ownerId: user.id });

      const normalizedPlan = plan && VALID_PLANS.includes(plan) ? (plan === 'professional' ? 'pro' : plan) : 'free';
      const now = new Date().toISOString();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      subRepo.init(tenant.id, normalizedPlan);
      if (normalizedPlan !== 'free') {
        subRepo.update(tenant.id, { plan: normalizedPlan, status: 'active', currentPeriodStart: now, currentPeriodEnd: periodEnd });
        tenantRepo.update(tenant.id, { plan: normalizedPlan, subscriptionStatus: 'active', subscriptionPeriodEnd: periodEnd });
      }

      createContextLogger(logger).info({ tenantId: tenant.id, email, plan: normalizedPlan }, 'Owner created tenant');
      res.json({
        ok: true,
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
        user: { id: user.id, email: user.email, name: user.name },
        plan: normalizedPlan,
        message: 'Tenant created successfully. Credentials should be shared via a secure channel.',
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Owner create tenant failed');
      res.status(500).json({ error: 'Failed to create tenant' });
    }
  });

  // ─── PLATFORM STATS ─────────────────────────────────────────────────
  router.get('/stats', ownerOnly, (_req: Request, res: Response) => {
    try {
      const allSubs = subRepo.list(1, 10000);
      let mrr = 0;
      let activeSubscriptions = 0;
      let trialSubscriptions = 0;
      let totalConversations = 0;
      let totalTeamMembers = 0;

      for (const s of allSubs.subscriptions) {
        if (s.status === 'active') {
          activeSubscriptions++;
          mrr += getPlanPrice(s.plan);
        }
        if (s.status === 'trialing') {
          trialSubscriptions++;
        }
        const convs = conversationRepo.listByTenant(s.tenantId, 1, 1);
        totalConversations += convs.total;
        const members = teamMemberRepo.findByTenant(s.tenantId);
        totalTeamMembers += members.length;
      }

      res.json({
        totalTenants: allSubs.total,
        mrr,
        activeSubscriptions,
        trialSubscriptions,
        totalConversations,
        totalTeamMembers,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  // ─── SIGNUP MONITORING ─────────────────────────────────────────
  router.get('/signups', ownerOnly, (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = (req.query.search as string) || undefined;
      const result = signupEventRepo.list({ page, limit, search });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch signups' });
    }
  });

  router.get('/signups/stats', ownerOnly, (req: Request, res: Response) => {
    try {
      const total = signupEventRepo.getTotalCount();
      const today = signupEventRepo.getTodayCount();
      let scannedWebsites = 0;
      try {
        scannedWebsites = (db.prepare("SELECT COUNT(*) as c FROM widget_configs WHERE detected_primary_color IS NOT NULL").get() as any).c || 0;
      } catch {}
      res.json({ total, today, scannedWebsites, conversionRate: total > 0 ? Math.round((scannedWebsites / total) * 100) : 0 });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch signup stats' });
    }
  });

  return router;
}

function getPlanLimits(plan: string) {
  const normalizedPlan = plan === 'professional' ? 'pro' : plan === 'enterprise' ? 'advanced' : plan;
  const limits: Record<string, { conversations: number; documents: number; knowledgeBases: number; teamMembers: number }> = {
    free: { conversations: 100, documents: 5, knowledgeBases: 1, teamMembers: 1 },
    starter: { conversations: 3000, documents: 50, knowledgeBases: 5, teamMembers: 5 },
    pro: { conversations: 10000, documents: 200, knowledgeBases: 20, teamMembers: 20 },
    advanced: { conversations: 25000, documents: 1000, knowledgeBases: 50, teamMembers: 50 },
  };
  return limits[normalizedPlan] || limits.free;
}

function getPlanPrice(plan: string): number {
  const normalizedPlan = plan === 'professional' ? 'pro' : plan === 'enterprise' ? 'advanced' : plan;
  const prices: Record<string, number> = { free: 0, starter: 29, pro: 49, advanced: 99 };
  return prices[normalizedPlan] || 0;
}
