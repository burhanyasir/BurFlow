import { Router, Request, Response } from 'express';
import { PaddleClient, SubscriptionRepository, TenantRepository, InvoiceRepository, PaymentRepository, BillingEventRepository, PADDLE_PLANS, getPlanLimits, ConversationRepository, UsageRepository, KbDocumentRepository } from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { requireJsonObject, validationError, validateRequiredEnum, VALID_SUBSCRIPTION_PLANS } from '../middleware/validate';
import type { SubscriptionPlan } from '@conversation-engine/saas-core';

const logger = createLogger('saas-api:billing');
const paddle = new PaddleClient();

export function createBillingRoutes(
  subRepo: SubscriptionRepository,
  tenantRepo: TenantRepository,
  invoiceRepo: InvoiceRepository,
  paymentRepo: PaymentRepository,
  eventRepo: BillingEventRepository,
  conversationRepo: ConversationRepository,
  usageRepo: UsageRepository,
  docRepo: KbDocumentRepository,
): Router {
  const router = Router();

  router.get('/plans', (_req: Request, res: Response) => {
    try {
      const plans = Object.values(PADDLE_PLANS).map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        currency: p.currency,
        interval: p.interval,
        paddlePriceId: p.paddlePriceId,
        features: p.features,
        limits: getPlanLimits(p.id),
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
      const limits = getPlanLimits(planId);
      const daysLeftInTrial = sub?.trialEnd
        ? Math.max(0, Math.ceil((new Date(sub.trialEnd).getTime() - Date.now()) / 86400000))
        : null;
      const conversationsUsed = conversationRepo.listByTenant(req.tenantId!, 1, 1).total;
      const documentsUsed = docRepo.countByStatus(req.tenantId!).total;
      res.json({
        planId,
        planName: PADDLE_PLANS[planId]?.name || planId,
        status: sub?.status || 'active',
        paddleSubscriptionId: sub?.paddleSubscriptionId || null,
        currentPeriodStart: sub?.currentPeriodStart || null,
        currentPeriodEnd: sub?.currentPeriodEnd || null,
        trialEnd: sub?.trialEnd || null,
        cancelledAt: sub?.cancelledAt || null,
        onTrial: sub?.status === 'trialing' || false,
        daysLeftInTrial: sub?.trialEnd ? Math.max(0, Math.ceil((new Date(sub.trialEnd).getTime() - Date.now()) / 86400000)) : null,
        conversationsLimit: limits.conversations,
        conversationsUsed,
        documentsLimit: limits.documents,
        documentsUsed,
        teamMembers: limits.teamMembers,
        features: PADDLE_PLANS[planId]?.features || [],
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
      const limits = getPlanLimits(sub.plan);
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

      const planConfig = PADDLE_PLANS[plan as string];
      if (!planConfig || !planConfig.paddlePriceId) {
        return res.status(400).json({ error: 'Plan not available for checkout. Configure Paddle price IDs in environment.' });
      }

      const tenantId = req.tenantId!;
      const tenant = tenantRepo.findById(tenantId);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

      let paddleCustomerId = tenant.paddleCustomerId;
      if (!paddleCustomerId) {
        const customerEmail = req.user?.email || req.body.email;
        if (!customerEmail) {
          return res.status(400).json({ error: 'Email is required for billing. Update your profile first.' });
        }
        try {
          const customer = await paddle.createCustomer({
            email: customerEmail,
            name: tenant.name,
            customData: { tenantId },
          });
          paddleCustomerId = customer.id;
          tenantRepo.update(tenantId, { paddleCustomerId });
          subRepo.update(tenantId, { paddleCustomerId });
        } catch (err: any) {
          createContextLogger(logger).error({ err }, 'Failed to create Paddle customer');
          return res.status(502).json({ error: 'Failed to create billing customer' });
        }
      }

      const returnUrl = `${process.env.APP_URL}/dashboard/billing?checkout=success`;

      try {
        const transaction = await paddle.createCheckoutTransaction(
          paddleCustomerId,
          [{ priceId: planConfig.paddlePriceId, quantity: 1 }],
          { returnUrl },
        );

        const checkoutUrl = transaction?.checkout?.url || '';

        if (transaction.id) {
          eventRepo.create({
            tenantId,
            paddleEventId: 'txn-' + transaction.id,
            eventType: 'checkout.created',
            status: 'pending',
            payload: JSON.stringify({ plan, transactionId: transaction.id }),
          });
        }

        res.json({ url: checkoutUrl, plan, transactionId: transaction.id });
      } catch (err: any) {
        createContextLogger(logger).error({ err }, 'Paddle checkout creation failed');
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

      const planConfig = PADDLE_PLANS[plan as string];
      if (!planConfig || !planConfig.paddlePriceId) {
        return res.status(400).json({ error: 'Target plan not configured with Paddle price ID' });
      }

      const newPlan = plan as SubscriptionPlan;

      if (sub.paddleSubscriptionId && planConfig.paddlePriceId) {
        try {
          await paddle.updateSubscriptionItems(sub.paddleSubscriptionId, [
            { priceId: planConfig.paddlePriceId, quantity: 1 },
          ]);
        } catch (err: any) {
          createContextLogger(logger).error({ err }, 'Paddle subscription update failed');
          return res.status(502).json({ error: 'Failed to update subscription with Paddle' });
        }
      }

      subRepo.update(req.tenantId!, {
        plan: newPlan,
        paddlePriceId: planConfig.paddlePriceId,
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

      if (sub.paddleSubscriptionId) {
        try {
          await paddle.cancelSubscription(sub.paddleSubscriptionId);
        } catch (err: any) {
          createContextLogger(logger).error({ err }, 'Paddle cancellation failed');
          return res.status(502).json({ error: 'Failed to cancel subscription with Paddle' });
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

      if (sub.paddleSubscriptionId) {
        try {
          await paddle.resumeSubscription(sub.paddleSubscriptionId);
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

      if (!sub.paddleSubscriptionId || !tenant.paddleCustomerId) {
        return res.status(400).json({ error: 'No Paddle subscription to manage' });
      }

      try {
        const portalSession = await paddle.createPortalSession(
          tenant.paddleCustomerId,
          [sub.paddleSubscriptionId],
        );
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
