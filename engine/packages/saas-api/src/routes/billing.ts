import { Router, Request, Response } from 'express';
import { PaddleClient, SubscriptionRepository, TenantRepository, InvoiceRepository, PaymentRepository, BillingEventRepository, getPlanConfig, getTierById, PADDLE_TIERS, PADDLE_TRIAL_DAYS, ConversationRepository, UsageRepository, KbDocumentRepository } from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { requireJsonObject, validationError, validateRequiredEnum, VALID_SUBSCRIPTION_PLANS } from '../middleware/validate';
import type { SubscriptionPlan } from '@conversation-engine/saas-core';

const logger = createLogger('saas-api:billing');

/** Feature list for the free plan (Paddle catalog covers paid tiers only). */
const FREE_PLAN_FEATURES = ['100 conversations/month', '5 documents', '1 knowledge base', '1 team member', 'Basic analytics'];

export interface BillingRoutesDeps {
  subRepo: SubscriptionRepository;
  tenantRepo: TenantRepository;
  invoiceRepo: InvoiceRepository;
  paymentRepo: PaymentRepository;
  eventRepo: BillingEventRepository;
  conversationRepo: ConversationRepository;
  usageRepo: UsageRepository;
  docRepo: KbDocumentRepository;
}

export function createBillingRoutes(
  subRepo: SubscriptionRepository,
  tenantRepo: TenantRepository,
  invoiceRepo: InvoiceRepository,
  paymentRepo: PaymentRepository,
  eventRepo: BillingEventRepository,
  conversationRepo: ConversationRepository,
  usageRepo: UsageRepository,
  docRepo: KbDocumentRepository,
  paddle?: PaddleClient,
): Router {
  const router = Router();
  // Paddle is the sole billing provider. The client is injectable for tests.
  const client = paddle || new PaddleClient();

  function planDisplay(planId: string): { name: string; features: string[] } {
    if (planId === 'free') return { name: 'Free', features: FREE_PLAN_FEATURES };
    const tier = getTierById(planId);
    return { name: tier?.name || planId, features: tier?.features || [] };
  }

  router.get('/plans', (_req: Request, res: Response) => {
    try {
      const free = getPlanConfig('free');
      const plans = [
        {
          id: 'free',
          name: 'Free',
          price: 0,
          priceYearly: 0,
          currency: 'USD',
          interval: 'month' as const,
          paddlePriceIds: { monthly: '', yearly: '' },
          paddleProductId: '',
          features: FREE_PLAN_FEATURES,
          limits: getPlanConfig('free'),
        },
        ...PADDLE_TIERS.map(t => ({
          id: t.id,
          name: t.name,
          price: t.monthly.price,
          priceYearly: t.yearly.price,
          currency: 'USD',
          interval: 'month' as const,
          paddlePriceIds: { monthly: t.monthly.paddlePriceId, yearly: t.yearly.paddlePriceId },
          paddleProductId: t.paddleProductId,
          trialDays: t.monthly.trialDays,
          features: t.features,
          limits: getPlanConfig(t.id),
        })),
      ];
      res.json({ plans, trialDays: PADDLE_TRIAL_DAYS });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Plans fetch failed');
      res.status(500).json({ error: 'Failed to fetch plans' });
    }
  });

  router.get('/current', (req: Request, res: Response) => {
    try {
      const sub = subRepo.findByTenant(req.tenantId!);
      const planId = sub?.plan || 'free';
      const planConfig = getPlanConfig(planId);
      const daysLeftInTrial = sub?.trialEnd
        ? Math.max(0, Math.ceil((new Date(sub.trialEnd).getTime() - Date.now()) / 86400000))
        : null;
      const conversationsUsed = conversationRepo.getCurrentMonthConversations(req.tenantId!);
      const documentsUsed = docRepo.countByStatus(req.tenantId!).total;
      res.json({
        planId,
        planName: planDisplay(planId).name,
        status: sub?.status || 'active',
        paddleSubscriptionId: sub?.paddleSubscriptionId || null,
        currentPeriodStart: sub?.currentPeriodStart || null,
        currentPeriodEnd: sub?.currentPeriodEnd || null,
        trialEnd: sub?.trialEnd || null,
        cancelledAt: sub?.cancelledAt || null,
        onTrial: sub?.status === 'trialing' || false,
        daysLeftInTrial,
        conversationsLimit: planConfig.conversationLimit,
        conversationsUsed,
        documentsLimit: planConfig.documentsLimit,
        documentsUsed,
        teamMembers: planConfig.teamMembersLimit,
        features: planDisplay(planId).features,
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Current subscription fetch failed');
      res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  });

  router.get('/usage', async (req: Request, res: Response) => {
    try {
      const sub = subRepo.findByTenant(req.tenantId!);
      // Tenants without a subscription row are on the free plan — return free
      // usage defaults instead of 404 so a fresh workspace's billing page
      // renders cleanly (mirrors /current).
      const plan = sub?.plan || 'free';
      const limits = getPlanConfig(plan);
      const tenantId = req.tenantId!;

      const convByMonth = new Map(conversationRepo.countByMonth(tenantId).map(r => [r.month, r.count]));
      const docsByMonth = new Map<string, number>();
      for (const d of docRepo.listByTenant(tenantId)) {
        const month = (d.createdAt || '').slice(0, 7);
        if (month) docsByMonth.set(month, (docsByMonth.get(month) || 0) + 1);
      }
      const usageRecords = usageRepo.listByTenant(tenantId).records;

      const usage = usageRecords.map(record => {
        const month = record.period;
        return {
          date: `${month}-01`,
          conversations: convByMonth.get(month) || 0,
          messages: record.messagesUsed,
          documentsUploaded: docsByMonth.get(month) || 0,
        };
      });
      if (usage.length === 0) {
        usage.push({ date: new Date().toISOString().slice(0, 7) + '-01', conversations: 0, messages: 0, documentsUploaded: 0 });
      }

      res.json({ usage, plan, limits, subscription: sub || null });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Usage fetch failed');
      res.status(500).json({ error: 'Failed to fetch usage' });
    }
  });

  // Paddle is the sole billing provider. Checkout is opened client-side via
  // @paddle/paddle-js (openPaddleCheckout); there is deliberately no
  // server-side redirect checkout anymore.
  router.post('/checkout', (_req: Request, res: Response) => {
    res.status(410).json({ error: 'Server-side checkout is discontinued. Subscriptions are managed through Paddle checkout from the dashboard.' });
  });

  router.post('/change-plan', requireJsonObject, async (req: Request, res: Response) => {
    try {
      const { plan } = req.body;
      const error = validateRequiredEnum(plan, 'plan', VALID_SUBSCRIPTION_PLANS);
      if (error) return validationError(res, [error]);

      const sub = subRepo.findByTenant(req.tenantId!);
      if (!sub) return res.status(404).json({ error: 'No active subscription' });

      // Only allow plan changes on active or trialing subscriptions
      if (sub.status !== 'active' && sub.status !== 'trialing') {
        return res.status(409).json({ error: `Cannot change plan while subscription is ${sub.status}` });
      }

      const newPlan = plan as SubscriptionPlan;
      const tier = getTierById(newPlan);
      const priceId = tier?.monthly.paddlePriceId || '';
      if (!priceId) {
        return res.status(400).json({ error: `Plan "${newPlan}" is not configured with a Paddle price ID` });
      }

      if (sub.paddleSubscriptionId) {
        try {
          await client.updateSubscriptionItems(sub.paddleSubscriptionId, [{ priceId, quantity: 1 }]);
        } catch (err: any) {
          createContextLogger(logger).error({ err }, 'Paddle subscription update failed');
          return res.status(502).json({ error: 'Failed to update subscription with Paddle' });
        }
      }

      subRepo.update(req.tenantId!, {
        plan: newPlan,
        paddlePriceId: priceId || undefined,
        currentPeriodEnd: sub.currentPeriodEnd,
      });
      tenantRepo.update(req.tenantId!, { plan: newPlan });

      res.json({ message: `Plan changed to ${tier?.name || newPlan}`, plan: newPlan });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Plan change failed');
      res.status(500).json({ error: 'Failed to change plan' });
    }
  });

  router.post('/cancel', async (req: Request, res: Response) => {
    try {
      const sub = subRepo.findByTenant(req.tenantId!);
      if (!sub) return res.status(404).json({ error: 'No active subscription' });

      if (sub.paddleSubscriptionId) {
        try {
          await client.cancelSubscription(sub.paddleSubscriptionId);
        } catch (err: any) {
          createContextLogger(logger).error({ err }, 'Paddle cancellation failed');
          return res.status(502).json({ error: 'Failed to cancel subscription with Paddle' });
        }
      }

      subRepo.update(req.tenantId!, {
        status: 'cancelled',
        plan: 'free',
        cancelledAt: new Date().toISOString(),
      });
      tenantRepo.update(req.tenantId!, { plan: 'free', subscriptionStatus: 'cancelled' });

      res.json({ message: 'Subscription cancelled' });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Cancellation failed');
      res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  });

  router.post('/resume', async (req: Request, res: Response) => {
    try {
      const sub = subRepo.findByTenant(req.tenantId!);
      if (!sub) return res.status(404).json({ error: 'No subscription found' });

      if (sub.paddleSubscriptionId) {
        try {
          await client.resumeSubscription(sub.paddleSubscriptionId);
        } catch (err: any) {
          createContextLogger(logger).error({ err }, 'Paddle resume failed');
          return res.status(502).json({ error: 'Failed to resume subscription with Paddle' });
        }
      }

      subRepo.update(req.tenantId!, { status: 'active', cancelledAt: undefined });
      tenantRepo.update(req.tenantId!, { subscriptionStatus: 'active' });

      res.json({ message: 'Subscription resumed' });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Resume failed');
      res.status(500).json({ error: 'Failed to resume subscription' });
    }
  });

  router.post('/manage', async (req: Request, res: Response) => {
    try {
      const sub = subRepo.findByTenant(req.tenantId!);
      if (!sub) return res.status(404).json({ error: 'No subscription found' });

      const tenant = tenantRepo.findById(req.tenantId!);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

      const customerId = tenant.paddleCustomerId || sub.paddleCustomerId;
      if (!customerId) {
        return res.status(400).json({ error: 'No Paddle customer linked to this workspace' });
      }
      const subscriptionIds = [sub.paddleSubscriptionId].filter((x): x is string => Boolean(x));

      try {
        const portalSession = await client.createPortalSession(customerId, subscriptionIds);
        // Paddle returns the portal URL under urls.general.overview.
        res.json({ url: portalSession?.urls?.general?.overview || '' });
      } catch (err: any) {
        createContextLogger(logger).error({ err }, 'Paddle portal session failed');
        res.status(502).json({ error: 'Failed to create customer portal session' });
      }
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Manage billing failed');
      res.status(500).json({ error: 'Failed to open billing management' });
    }
  });

  router.get('/payment-history', async (req: Request, res: Response) => {
    try {
      const { invoices } = invoiceRepo.findByTenant(req.tenantId!);
      const { payments } = paymentRepo.findByTenant(req.tenantId!);
      res.json({ invoices, payments });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Payment history fetch failed');
      res.status(500).json({ error: 'Failed to fetch payment history' });
    }
  });

  return router;
}
