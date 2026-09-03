import { Router, Request, Response } from 'express';
import {
  PaddleClient, SubscriptionRepository, TenantRepository,
  InvoiceRepository, PaymentRepository, BillingEventRepository,
  PaddleCustomerRepository,
  findPlanByPaddlePriceId, SubscriptionPlan,
} from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';

const logger = createLogger('saas-api:paddle-webhook');

export interface PaddleWebhookDeps {
  subRepo: SubscriptionRepository;
  tenantRepo: TenantRepository;
  invoiceRepo: InvoiceRepository;
  paymentRepo: PaymentRepository;
  eventRepo: BillingEventRepository;
  customerRepo: PaddleCustomerRepository;
}

export interface PaddleWebhookOptions {
  webhookSecret?: string;
  client?: PaddleClient;
}

// Events we fulfill on. The lifecycle aliases (activated/trialing/past_due/
// paused/resumed) carry the same SubscriptionNotification shape, so we treat
// them like subscription.updated.
const SUBSCRIPTION_EVENTS = new Set([
  'subscription.created',
  'subscription.updated',
  'subscription.activated',
  'subscription.trialing',
  'subscription.past_due',
  'subscription.paused',
  'subscription.resumed',
]);

export function createPaddleWebhookRoutes(deps: PaddleWebhookDeps, opts: PaddleWebhookOptions = {}): Router {
  const router = Router();
  const secret = opts.webhookSecret || process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[Paddle Webhooks] PADDLE_WEBHOOK_SECRET is not set — webhook verification is DISABLED. Refusing all webhook requests.');
  }
  const paddle = opts.client || new PaddleClient();

  function resolveTenantId(input: { customerId?: string | null; subscriptionId?: string | null; customData?: any }): string | null {
    const customData = input.customData || {};
    const fromCustom = customData.tenantId || customData.tenant_id;
    if (typeof fromCustom === 'string' && fromCustom) return fromCustom;

    if (input.subscriptionId) {
      const bySub = deps.subRepo.findByPaddleSubscriptionId(input.subscriptionId);
      if (bySub) return bySub.tenantId;
    }
    if (input.customerId) {
      const byCustomer = deps.customerRepo.findById(input.customerId);
      if (byCustomer) return byCustomer.tenantId;
      const bySubCustomer = deps.subRepo.findByPaddleCustomerId(input.customerId);
      if (bySubCustomer) return bySubCustomer.tenantId;
    }
    return null;
  }

  function mapPaddleStatus(status: string): string {
    switch (status) {
      case 'active': return 'active';
      case 'trialing': return 'trialing';
      case 'canceled': return 'cancelled';
      case 'past_due': return 'past_due';
      case 'paused': return 'paused';
      default: return 'active';
    }
  }

  /** Upsert a Paddle customer record and link it to a workspace. */
  function syncCustomer(data: any, tenantId: string): void {
    try {
      deps.customerRepo.upsert({
        customerId: data.id,
        tenantId,
        email: data.email,
        name: data.name || undefined,
      });
    } catch (err: any) {
      createContextLogger(logger).warn({ err, customerId: data.id }, 'Customer upsert failed');
    }
  }

  /**
   * Fulfill subscription lifecycle events: upsert the local subscription row
   * (keyed by Paddle subscription id), update the tenant plan/status, and
   * ensure the customer record exists so later events resolve the tenant.
   */
  function syncSubscription(data: any): string | null {
    const subId = data.id || '';
    const customerId = data.customerId || '';
    const item = data.items?.[0] || {};
    const priceId = item.price?.id || '';
    const productId = item.price?.productId || item.product?.id || '';
    const planId = findPlanByPaddlePriceId(priceId);
    const tenantId = resolveTenantId({ customerId, subscriptionId: subId, customData: data.customData });
    if (!tenantId) return null;

    const status = mapPaddleStatus(data.status || 'active') as any;
    const periodStart = data.currentBillingPeriod?.startsAt;
    const periodEnd = data.currentBillingPeriod?.endsAt;
    const trialEnd = item.trialDates?.endsAt || data.trialDates?.endsAt;
    const cancelledAt = data.canceledAt || (status === 'cancelled' ? new Date().toISOString() : undefined);

    if (!deps.subRepo.findByTenant(tenantId)) {
      deps.subRepo.init(tenantId, (planId || 'free') as SubscriptionPlan);
    }
    deps.subRepo.update(tenantId, {
      plan: (planId || undefined) as SubscriptionPlan | undefined,
      status,
      paddleSubscriptionId: subId || undefined,
      paddleCustomerId: customerId || undefined,
      paddlePriceId: priceId || undefined,
      paddleProductId: productId || undefined,
      currentPeriodStart: periodStart || undefined,
      currentPeriodEnd: periodEnd || undefined,
      trialEnd: trialEnd || undefined,
      cancelledAt,
      scheduledChangeAction: data.scheduledChange?.action || undefined,
      scheduledChangeAt: data.scheduledChange?.effectiveAt || undefined,
    });

    deps.tenantRepo.update(tenantId, {
      plan: (planId || undefined) as SubscriptionPlan | undefined,
      subscriptionStatus: status,
      paddleCustomerId: customerId || undefined,
      subscriptionPeriodEnd: periodEnd || undefined,
    });

    if (customerId) {
      // Subscription events don't carry the customer email — reuse the one we
      // already stored from customer.created/updated when available.
      const existingCustomer = deps.customerRepo.findById(customerId);
      syncCustomer({
        id: customerId,
        email: data.email || existingCustomer?.email || '',
        name: data.customerName || existingCustomer?.name,
      }, tenantId);
    }
    return tenantId;
  }

  function handleSubscriptionCanceled(data: any): string | null {
    const subId = data.id || '';
    const tenantId = resolveTenantId({ customerId: data.customerId, subscriptionId: subId, customData: data.customData });
    if (!tenantId) return null;
    if (!deps.subRepo.findByTenant(tenantId)) deps.subRepo.init(tenantId, 'free');
    deps.subRepo.update(tenantId, {
      status: 'cancelled',
      cancelledAt: data.canceledAt || new Date().toISOString(),
      scheduledChangeAction: data.scheduledChange?.action || undefined,
      scheduledChangeAt: data.scheduledChange?.effectiveAt || undefined,
    });
    deps.tenantRepo.update(tenantId, { subscriptionStatus: 'cancelled' });
    return tenantId;
  }

  /** transaction.completed → record the invoice + payment (idempotent on Paddle ids). */
  function handleTransactionCompleted(data: any, tenantId: string): void {
    const transactionId = data.id || '';
    const customerId = data.customerId || '';
    const subscriptionId = data.subscriptionId || '';
    const invoiceId = data.invoiceId || transactionId;
    const amountMinor = data.details?.totals?.grandTotal ?? 0;
    const amount = typeof amountMinor === 'number' ? amountMinor / 100 : 0;
    const currency = (data.currencyCode || 'USD').toUpperCase();
    const paidAt = data.billedAt || data.createdAt || new Date().toISOString();
    const periodStart = data.billingPeriod?.startsAt || new Date().toISOString();
    const periodEnd = data.billingPeriod?.endsAt || new Date().toISOString();

    let sub = subscriptionId ? deps.subRepo.findByPaddleSubscriptionId(subscriptionId) : null;
    if (!sub) sub = deps.subRepo.findByTenant(tenantId);
    if (!sub) sub = deps.subRepo.init(tenantId, 'free');
    const rec = deps.invoiceRepo.upsert({
      tenantId,
      paddleInvoiceId: invoiceId,
      subscriptionId: sub?.id || '',
      status: 'paid',
      amount,
      currency,
      paidAt,
      periodStart,
      periodEnd,
    });

    if (customerId) {
      deps.customerRepo.upsert({
        customerId,
        tenantId,
        email: data.customerEmail || '',
        name: data.customerName || undefined,
      });
    }

    deps.paymentRepo.create({
      tenantId,
      paddlePaymentId: `${transactionId}-payment`,
      invoiceId: rec.id,
      amount,
      currency,
      status: 'completed',
      method: data.payments?.[0]?.methodDetails?.type || 'card',
      paidAt,
    });
  }

  router.post('/', async (req: Request, res: Response) => {
    if (!secret) {
      return res.status(503).json({ error: 'Webhook secret not configured' });
    }
    const signature = req.headers['paddle-signature'] as string;
    if (!signature) {
      createContextLogger(logger).warn('Missing paddle-signature header');
      return res.status(400).json({ error: 'Missing paddle-signature header' });
    }

    // CRITICAL: verify against the RAW request body — never a re-serialized one.
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body || {});

    let event: any;
    try {
      event = await paddle.verifyWebhook(rawBody, signature);
    } catch (err: any) {
      createContextLogger(logger).warn({ err }, 'Paddle webhook verification threw');
      return res.status(400).json({ error: 'Invalid signature' });
    }
    if (!event) {
      createContextLogger(logger).warn('Invalid Paddle webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const eventType = event.eventType || '';
    const eventId = event.eventId || '';
    if (!eventId || !eventType) {
      return res.status(400).json({ error: 'Missing event id or type' });
    }

    createContextLogger(logger).info({ eventType, eventId }, 'Paddle webhook received');

    try {
      // Idempotency: each eventId is processed exactly once.
      const existingEvent = deps.eventRepo.findByPaddleEventId(eventId);
      if (existingEvent) {
        return res.json({ received: true, duplicate: true });
      }

      const data = event.data || {};

      if (eventType === 'customer.created' || eventType === 'customer.updated') {
        const tenantId = resolveTenantId({ customerId: data.id, customData: data.customData });
        if (tenantId) {
          syncCustomer(data, tenantId);
          deps.tenantRepo.update(tenantId, { paddleCustomerId: data.id || undefined });
          deps.eventRepo.create({ tenantId, paddleEventId: eventId, eventType, status: 'completed', payload: rawBody });
          return res.json({ received: true });
        }
        deps.eventRepo.create({ paddleEventId: eventId, eventType, status: 'completed', payload: rawBody });
        return res.json({ received: true });
      }

      if (SUBSCRIPTION_EVENTS.has(eventType)) {
        const tenantId = syncSubscription(data);
        deps.eventRepo.create({ tenantId: tenantId || undefined, paddleEventId: eventId, eventType, status: 'completed', payload: rawBody });
        return res.json({ received: true });
      }

      if (eventType === 'subscription.canceled') {
        const tenantId = handleSubscriptionCanceled(data);
        deps.eventRepo.create({ tenantId: tenantId || undefined, paddleEventId: eventId, eventType, status: 'completed', payload: rawBody });
        return res.json({ received: true });
      }

      if (eventType === 'transaction.completed' || eventType === 'transaction.paid') {
        const tenantId = resolveTenantId({
          customerId: data.customerId,
          subscriptionId: data.subscriptionId,
          customData: data.customData,
        });
        if (!tenantId) {
          createContextLogger(logger).warn({ eventType, transactionId: data.id }, 'Could not resolve tenant for transaction — skipping');
          deps.eventRepo.create({ paddleEventId: eventId, eventType, status: 'completed', payload: rawBody });
          return res.json({ received: true, tenantResolved: false });
        }
        handleTransactionCompleted(data, tenantId);
        deps.eventRepo.create({ tenantId, paddleEventId: eventId, eventType, status: 'completed', payload: rawBody });
        return res.json({ received: true });
      }

      createContextLogger(logger).info({ eventType }, 'Unhandled Paddle event type');
      deps.eventRepo.create({ paddleEventId: eventId, eventType, status: 'completed', payload: rawBody });
      return res.json({ received: true });
    } catch (err: any) {
      createContextLogger(logger).error({ err, eventType }, 'Paddle webhook processing failed');
      try {
        deps.eventRepo.create({ paddleEventId: eventId + '-error', eventType: eventType + '.error', status: 'failed', payload: JSON.stringify({ error: err.message }) });
      } catch { /* event log best-effort */ }
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  return router;
}
