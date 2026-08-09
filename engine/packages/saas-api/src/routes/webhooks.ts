import { Router, Request, Response } from 'express';
import {
  WebhookRepository, WebhookDeliveryRepository, AuditLogRepository,
  WebhookEvent, StripeClient, SubscriptionRepository, TenantRepository,
  InvoiceRepository, PaymentRepository, BillingEventRepository,
  findPlanByPriceId, SubscriptionPlan,
} from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { requireJsonObject, validateRequiredString, validationError } from '../middleware/validate';
import crypto from 'crypto';

const VALID_WEBHOOK_EVENTS: WebhookEvent[] = ['conversation.created', 'conversation.completed', 'escalation.created', 'unanswered.created', 'feedback.received', 'lead.captured', 'lead.qualified'];
const logger = createLogger('saas-api:webhooks');

export function createWebhookRoutes(webhookRepo: WebhookRepository, deliveryRepo: WebhookDeliveryRepository, auditRepo: AuditLogRepository): Router {
  const router = Router();

  const adminOnly = (req: Request, res: Response, next: Function) => {
    if (!req.user?.role || !['admin', 'owner'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };

  router.get('/', (req: Request, res: Response) => {
    try {
      const webhooks = webhookRepo.listByTenant(req.tenantId!);
      res.json({ webhooks: webhooks.map(w => ({ id: w.id, url: w.url, events: w.events, isActive: w.isActive, lastSuccessAt: w.lastSuccessAt, lastFailureAt: w.lastFailureAt, consecutiveFailures: w.consecutiveFailures, createdAt: w.createdAt, updatedAt: w.updatedAt })) });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'List webhooks failed');
      res.status(500).json({ error: 'Failed to list webhooks' });
    }
  });

  router.post('/', adminOnly, requireJsonObject, (req: Request, res: Response) => {
    try {
      const { url, events } = req.body;
      const errors = [
        validateRequiredString(url, 'url'),
      ].filter(Boolean);
      if (errors.length > 0) return validationError(res, errors as any);
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ error: 'At least one event type is required' });
      }
      for (const e of events) {
        if (!VALID_WEBHOOK_EVENTS.includes(e)) {
          return res.status(400).json({ error: `Invalid event type: ${e}` });
        }
      }
      const signingSecret = crypto.randomBytes(32).toString('hex');
      const webhook = webhookRepo.create(req.tenantId!, url, events, signingSecret);
      auditRepo.record(req.tenantId!, { userId: req.user!.sub, userName: req.user!.name, eventType: 'webhook.created', resourceType: 'webhook', resourceId: webhook.id, details: `Webhook created for URL: ${url}` });
      res.status(201).json({ id: webhook.id, url: webhook.url, events: webhook.events, isActive: webhook.isActive, signingSecret });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Create webhook failed');
      res.status(500).json({ error: 'Failed to create webhook' });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    try {
      const webhook = webhookRepo.findById(req.params.id);
      if (!webhook || webhook.tenantId !== req.tenantId) return res.status(404).json({ error: 'Webhook not found' });
      res.json({ id: webhook.id, url: webhook.url, events: webhook.events, isActive: webhook.isActive, lastSuccessAt: webhook.lastSuccessAt, lastFailureAt: webhook.lastFailureAt, consecutiveFailures: webhook.consecutiveFailures, createdAt: webhook.createdAt, updatedAt: webhook.updatedAt });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Get webhook failed');
      res.status(500).json({ error: 'Failed to get webhook' });
    }
  });

  router.put('/:id', adminOnly, requireJsonObject, (req: Request, res: Response) => {
    try {
      const webhook = webhookRepo.findById(req.params.id);
      if (!webhook || webhook.tenantId !== req.tenantId) return res.status(404).json({ error: 'Webhook not found' });
      const { url, events, isActive } = req.body;
      if (events && (!Array.isArray(events) || events.some((e: string) => !VALID_WEBHOOK_EVENTS.includes(e as WebhookEvent)))) {
        return res.status(400).json({ error: 'Invalid event types' });
      }
      const updated = webhookRepo.update(req.params.id, req.tenantId!, { url, events, isActive });
      auditRepo.record(req.tenantId!, { userId: req.user!.sub, userName: req.user!.name, eventType: 'webhook.updated', resourceType: 'webhook', resourceId: req.params.id, details: 'Webhook updated' });
      res.json({ id: updated!.id, url: updated!.url, events: updated!.events, isActive: updated!.isActive });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Update webhook failed');
      res.status(500).json({ error: 'Failed to update webhook' });
    }
  });

  router.delete('/:id', adminOnly, (req: Request, res: Response) => {
    try {
      const deleted = webhookRepo.delete(req.params.id, req.tenantId!);
      if (!deleted) return res.status(404).json({ error: 'Webhook not found' });
      auditRepo.record(req.tenantId!, { userId: req.user!.sub, userName: req.user!.name, eventType: 'webhook.deleted', resourceType: 'webhook', resourceId: req.params.id, details: 'Webhook deleted' });
      res.status(204).send();
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Delete webhook failed');
      res.status(500).json({ error: 'Failed to delete webhook' });
    }
  });

  router.post('/:id/regenerate-secret', adminOnly, (req: Request, res: Response) => {
    try {
      const webhook = webhookRepo.findById(req.params.id);
      if (!webhook || webhook.tenantId !== req.tenantId) return res.status(404).json({ error: 'Webhook not found' });
      const newSecret = crypto.randomBytes(32).toString('hex');
      webhookRepo.update(req.params.id, req.tenantId!, { signingSecret: newSecret });
      auditRepo.record(req.tenantId!, { userId: req.user!.sub, userName: req.user!.name, eventType: 'webhook.secret_regenerated', resourceType: 'webhook', resourceId: req.params.id, details: 'Webhook signing secret regenerated' });
      res.json({ signingSecret: newSecret });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Regenerate secret failed');
      res.status(500).json({ error: 'Failed to regenerate secret' });
    }
  });

  router.get('/:id/deliveries', (req: Request, res: Response) => {
    try {
      const webhook = webhookRepo.findById(req.params.id);
      if (!webhook || webhook.tenantId !== req.tenantId) return res.status(404).json({ error: 'Webhook not found' });
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const result = deliveryRepo.listByWebhook(req.params.id, page, limit);
      res.json(result);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'List deliveries failed');
      res.status(500).json({ error: 'Failed to list deliveries' });
    }
  });

  router.post('/:id/deliveries/:deliveryId/replay', adminOnly, (req: Request, res: Response) => {
    try {
      const delivery = deliveryRepo.replay(req.params.deliveryId);
      res.status(201).json(delivery);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Replay delivery failed');
      res.status(500).json({ error: 'Failed to replay delivery' });
    }
  });

  router.get('/events', (_req: Request, res: Response) => {
    res.json({ events: VALID_WEBHOOK_EVENTS });
  });

  return router;
}

// ─── Stripe webhook handler ────────────────────────────────────

export interface StripeWebhookDeps {
  subRepo: SubscriptionRepository;
  tenantRepo: TenantRepository;
  invoiceRepo: InvoiceRepository;
  paymentRepo: PaymentRepository;
  eventRepo: BillingEventRepository;
}

export interface StripeWebhookOptions {
  webhookSecret?: string;
  client?: StripeClient;
}

export function createStripeWebhookRoutes(deps: StripeWebhookDeps, opts: StripeWebhookOptions = {}): Router {
  const router = Router();
  const secret = opts.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '';
  const stripe = opts.client || new StripeClient();
  const logger = createLogger('saas-api:stripe-webhook');

  function rawPayload(req: Request): string {
    if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
    return JSON.stringify(req.body || {});
  }

  function resolveTenantId(event: any): string | null {
    const metadata = event?.data?.object?.metadata || {};
    const tenantId = metadata?.tenantId || metadata?.tenant_id;
    if (tenantId) return tenantId;

    const customerId = event?.data?.object?.customer || null;
    const subscriptionId = event?.data?.object?.id
      && String(event?.data?.object?.id).startsWith('sub_')
      ? event?.data?.object?.id
      : null;

    if (subscriptionId) {
      const bySub = deps.subRepo.findByStripeSubscriptionId(subscriptionId);
      if (bySub) return bySub.tenantId;
    }
    if (customerId) {
      const byCustomer = deps.subRepo.findByStripeCustomerId(customerId);
      if (byCustomer) return byCustomer.tenantId;
    }
    return null;
  }

  function mapStripeStatus(status: string): string {
    switch (status) {
      case 'active': return 'active';
      case 'trialing':
      case 'incomplete': return 'trialing';
      case 'past_due':
      case 'unpaid': return 'past_due';
      case 'canceled': return 'cancelled';
      case 'incomplete_expired': return 'expired';
      case 'paused': return 'past_due';
      default: return 'active';
    }
  }

  function syncSubscription(event: any): void {
    const sub = event?.data?.object || {};
    const subId = sub.id || '';
    const status = mapStripeStatus(sub.status || 'active');
    const currentPeriodEnd = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : undefined;
    const priceId = sub.items?.data?.[0]?.price?.id || sub.items?.data?.[0]?.price || '';
    const planId = findPlanByPriceId(priceId);
    const customerId = sub.customer || '';
    const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : undefined;

    const tenantId = resolveTenantId(event);
    if (!tenantId) return;

    if (!deps.subRepo.findByTenant(tenantId)) {
      deps.subRepo.init(tenantId, (planId || 'free') as SubscriptionPlan);
    }
    deps.subRepo.update(tenantId, {
      stripeSubscriptionId: subId,
      stripeCustomerId: customerId || undefined,
      stripePriceId: priceId || undefined,
      status: status as any,
      currentPeriodEnd,
      trialEnd,
      ...(planId ? { plan: planId as SubscriptionPlan } : {}),
    });
    deps.tenantRepo.update(tenantId, {
      subscriptionStatus: status as any,
      stripeSubscriptionId: subId,
      stripeCustomerId: customerId || undefined,
      subscriptionPeriodEnd: currentPeriodEnd,
      ...(planId ? { plan: planId as SubscriptionPlan } : {}),
    });
  }

  function handleSubscriptionDeleted(event: any): void {
    const sub = event?.data?.object || {};
    const tenantId = resolveTenantId(event);
    if (!tenantId) return;
    const now = new Date().toISOString();
    if (!deps.subRepo.findByTenant(tenantId)) {
      deps.subRepo.init(tenantId, 'free');
    }
    deps.subRepo.update(tenantId, {
      status: 'cancelled',
      cancelledAt: now,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : undefined,
    });
    deps.tenantRepo.update(tenantId, {
      subscriptionStatus: 'cancelled',
      subscriptionPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : undefined,
    });
  }

  function handleInvoicePaid(event: any): void {
    const invoice = event?.data?.object || {};
    const tenantId = resolveTenantId(event);
    const customerId = invoice.customer || '';
    let foundTenantId = tenantId;
    if (!foundTenantId && customerId) {
      const existing = deps.subRepo.findByStripeCustomerId(customerId);
      if (existing) foundTenantId = existing.tenantId;
    }
    if (!foundTenantId) return;

    const sub = deps.subRepo.findByTenant(foundTenantId);
    const invoiceId = invoice.id || '';
    const amount = invoice.amount_paid || invoice.amount_due || 0;
    const currency = (invoice.currency || 'usd').toUpperCase();
    const periodStart = invoice.lines?.data?.[0]?.period?.start
      ? new Date(invoice.lines.data[0].period.start * 1000).toISOString()
      : sub?.currentPeriodStart || new Date().toISOString();
    const periodEnd = invoice.lines?.data?.[0]?.period?.end
      ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
      : sub?.currentPeriodEnd || new Date().toISOString();

    const rec = deps.invoiceRepo.upsert({
      tenantId: foundTenantId,
      paddleInvoiceId: invoiceId,
      subscriptionId: sub?.id || '',
      status: 'paid',
      amount,
      currency,
      paidAt: new Date().toISOString(),
      periodStart,
      periodEnd,
    });

    deps.paymentRepo.create({
      tenantId: foundTenantId,
      paddlePaymentId: `${invoiceId}-payment`,
      invoiceId: rec.id,
      amount: invoice.amount_paid || 0,
      currency,
      status: 'completed',
      method: invoice.payment_method_details?.type || 'card',
      paidAt: new Date().toISOString(),
    });
  }

  function handleInvoicePaymentFailed(event: any): void {
    const tenantId = resolveTenantId(event);
    if (!tenantId) return;
    if (!deps.subRepo.findByTenant(tenantId)) {
      deps.subRepo.init(tenantId, 'free');
    }
    deps.subRepo.update(tenantId, { status: 'past_due' });
    deps.tenantRepo.update(tenantId, { subscriptionStatus: 'past_due' });
  }

  function handleCheckoutCompleted(event: any): void {
    const session = event?.data?.object || {};
    const tenantId = session.metadata?.tenantId || session.metadata?.tenant_id || null;
    if (!tenantId) return;
    deps.tenantRepo.update(tenantId, {
      stripeCustomerId: session.customer || undefined,
      stripeSubscriptionId: session.subscription || undefined,
    });
  }

  router.post('/', (req: Request, res: Response) => {
    const signatureHeader = req.headers['stripe-signature'] as string;
    if (!signatureHeader) {
      createContextLogger(logger).warn('Missing stripe-signature header');
      return res.status(401).json({ error: 'Missing signature' });
    }
    const rawBody = rawPayload(req);
    if (!stripe.verifyWebhookSignature(rawBody, signatureHeader, secret)) {
      createContextLogger(logger).warn('Invalid stripe webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch (err: any) {
      createContextLogger(logger).warn({ err }, 'Malformed Stripe webhook payload');
      return res.status(400).json({ error: 'Malformed payload' });
    }

    const eventType = event?.type || '';
    const eventId = event?.id || '';
    if (!eventId || !eventType) {
      return res.status(400).json({ error: 'Missing event id or type' });
    }

    createContextLogger(logger).info({ eventType, eventId }, 'Stripe webhook received');

    try {
      const existingEvent = deps.eventRepo.findByPaddleEventId(eventId);
      if (existingEvent) {
        return res.json({ received: true, duplicate: true });
      }

      deps.eventRepo.create({
        paddleEventId: eventId,
        eventType,
        status: 'processing',
        payload: rawBody,
      });

      switch (eventType) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          syncSubscription(event);
          break;
        case 'customer.subscription.deleted':
          handleSubscriptionDeleted(event);
          break;
        case 'invoice.paid':
          handleInvoicePaid(event);
          break;
        case 'invoice.payment_failed':
          handleInvoicePaymentFailed(event);
          break;
        case 'checkout.session.completed':
          handleCheckoutCompleted(event);
          break;
        default:
          createContextLogger(logger).info({ eventType }, 'Unhandled Stripe event type');
      }

      deps.eventRepo.create({
        paddleEventId: eventId + '-done',
        eventType: eventType + '.processed',
        status: 'completed',
        payload: JSON.stringify({ originalEventId: eventId }),
      });

      res.json({ received: true });
    } catch (err: any) {
      createContextLogger(logger).error({ err, eventType }, 'Stripe webhook processing failed');
      deps.eventRepo.create({
        paddleEventId: eventId + '-error',
        eventType: eventType + '.error',
        status: 'failed',
        payload: JSON.stringify({ error: err.message, originalEventId: eventId }),
      });
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  return router;
}
