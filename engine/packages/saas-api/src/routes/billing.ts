import { Router, Request, Response } from 'express';
import { StripeClient, SubscriptionRepository, TenantRepository, InvoiceRepository, PaymentRepository, BillingEventRepository, STRIPE_PLANS, getPlanConfig, ConversationRepository, UsageRepository, KbDocumentRepository } from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { requireJsonObject, validationError, validateRequiredEnum, VALID_SUBSCRIPTION_PLANS } from '../middleware/validate';
import type { SubscriptionPlan } from '@conversation-engine/saas-core';

const logger = createLogger('saas-api:billing');

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
  stripe?: StripeClient,
): Router {
  const router = Router();
  const client = stripe || new StripeClient();

  router.get('/plans', (_req: Request, res: Response) => {
    try {
      const plans = Object.values(STRIPE_PLANS).map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        currency: p.currency,
        interval: p.interval,
        stripePriceId: p.stripePriceId,
        features: p.features,
        limits: getPlanConfig(p.id),
      }));
      res.json({ plans });
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
      const conversationsUsed = conversationRepo.listByTenant(req.tenantId!, 1, 1).total;
      const documentsUsed = docRepo.countByStatus(req.tenantId!).total;
      res.json({
        planId,
        planName: STRIPE_PLANS[planId]?.name || planId,
        status: sub?.status || 'active',
        stripeSubscriptionId: sub?.stripeSubscriptionId || null,
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
        features: STRIPE_PLANS[planId]?.features || [],
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Current subscription fetch failed');
      res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  });

  router.get('/usage', async (req: Request, res: Response) => {
    try {
      const sub = subRepo.findByTenant(req.tenantId!);
      if (!sub) {
        return res.status(404).json({ error: 'No subscription found' });
      }
      const limits = getPlanConfig(sub.plan);
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

      res.json({ usage, plan: sub.plan, limits, subscription: sub });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Usage fetch failed');
      res.status(500).json({ error: 'Failed to fetch usage' });
    }
  });

  router.post('/checkout', requireJsonObject, async (req: Request, res: Response) => {
    try {
      const { plan } = req.body;
      const error = validateRequiredEnum(plan, 'plan', VALID_SUBSCRIPTION_PLANS);
      if (error) return validationError(res, [error]);

      const planConfig = STRIPE_PLANS[plan as string];
      if (!planConfig || !planConfig.stripePriceId) {
        return res.status(400).json({ error: 'Plan not available for checkout. Configure Stripe price IDs in environment.' });
      }

      const tenantId = req.tenantId!;
      const tenant = tenantRepo.findById(tenantId);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

      const customerEmail = req.user?.email || req.body.email;
      if (!customerEmail) {
        return res.status(400).json({ error: 'Email is required for billing. Update your profile first.' });
      }

      const successUrl = `${process.env.APP_URL || 'http://localhost:3457'}/dashboard/billing?checkout=success`;
      const cancelUrl = `${process.env.APP_URL || 'http://localhost:3457'}/dashboard/billing?checkout=cancelled`;

      try {
        const session = await client.createCheckoutSession({
          customerId: tenant.stripeCustomerId || undefined,
          email: tenant.stripeCustomerId ? undefined : customerEmail,
          priceId: planConfig.stripePriceId,
          quantity: 1,
          successUrl,
          cancelUrl,
          metadata: { tenantId },
        });

        if (session.id) {
          eventRepo.create({
            tenantId,
            paddleEventId: 'cs-' + session.id,
            eventType: 'checkout.session.created',
            status: 'pending',
            payload: JSON.stringify({ plan, sessionId: session.id }),
          });
        }

        res.json({ url: session.url || '', plan, sessionId: session.id });
      } catch (err: any) {
        createContextLogger(logger).error({ err }, 'Stripe checkout session creation failed');
        res.status(502).json({ error: 'Failed to create checkout session' });
      }
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Checkout failed');
      res.status(500).json({ error: 'Failed to initiate checkout' });
    }
  });

  router.post('/change-plan', requireJsonObject, async (req: Request, res: Response) => {
    try {
      const { plan } = req.body;
      const error = validateRequiredEnum(plan, 'plan', VALID_SUBSCRIPTION_PLANS);
      if (error) return validationError(res, [error]);

      const sub = subRepo.findByTenant(req.tenantId!);
      if (!sub) return res.status(404).json({ error: 'No active subscription' });

      const planConfig = STRIPE_PLANS[plan as string];
      if (!planConfig || !planConfig.stripePriceId) {
        return res.status(400).json({ error: 'Target plan not configured with Stripe price ID' });
      }

      const newPlan = plan as SubscriptionPlan;

      if (sub.stripeSubscriptionId && planConfig.stripePriceId) {
        try {
          await client.updateSubscriptionItems(sub.stripeSubscriptionId, planConfig.stripePriceId);
        } catch (err: any) {
          createContextLogger(logger).error({ err }, 'Stripe subscription update failed');
          return res.status(502).json({ error: 'Failed to update subscription with Stripe' });
        }
      }

      subRepo.update(req.tenantId!, {
        plan: newPlan,
        stripePriceId: planConfig.stripePriceId,
        currentPeriodEnd: sub.currentPeriodEnd,
      });
      tenantRepo.update(req.tenantId!, { plan: newPlan });

      res.json({ message: `Plan changed to ${planConfig.name}`, plan: newPlan });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Plan change failed');
      res.status(500).json({ error: 'Failed to change plan' });
    }
  });

  router.post('/cancel', async (req: Request, res: Response) => {
    try {
      const sub = subRepo.findByTenant(req.tenantId!);
      if (!sub) return res.status(404).json({ error: 'No active subscription' });

      if (sub.stripeSubscriptionId) {
        try {
          await client.cancelSubscription(sub.stripeSubscriptionId);
        } catch (err: any) {
          createContextLogger(logger).error({ err }, 'Stripe cancellation failed');
          return res.status(502).json({ error: 'Failed to cancel subscription with Stripe' });
        }
      }

      subRepo.update(req.tenantId!, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      });
      tenantRepo.update(req.tenantId!, { subscriptionStatus: 'cancelled' });

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

      if (sub.stripeSubscriptionId) {
        try {
          await client.resumeSubscription(sub.stripeSubscriptionId);
        } catch (err: any) {
          createContextLogger(logger).error({ err }, 'Stripe resume failed');
          return res.status(502).json({ error: 'Failed to resume subscription with Stripe' });
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

      if (!sub.stripeSubscriptionId && !tenant.stripeCustomerId) {
        return res.status(400).json({ error: 'No Stripe subscription to manage' });
      }

      const customerId = tenant.stripeCustomerId || sub.stripeCustomerId;
      if (!customerId) {
        return res.status(400).json({ error: 'No Stripe customer linked to this workspace' });
      }

      try {
        const portalSession = await client.createPortalSession(customerId);
        res.json({ url: portalSession?.url || '' });
      } catch (err: any) {
        createContextLogger(logger).error({ err }, 'Stripe portal session failed');
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
