import { Router, Request, Response } from 'express';
import { PaddleClient, SubscriptionRepository, TenantRepository, InvoiceRepository, PaymentRepository, BillingEventRepository } from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';

const logger = createLogger('saas-api:billing-webhook');

// Buffer to hold raw body for webhook signature verification
let rawBodyBuffer: Buffer | undefined;

export function setRawBodyBuffer(buf: Buffer | undefined): void {
  rawBodyBuffer = buf;
}

function extractTenantId(event: any): string | null {
  const customData = event?.data?.custom_data || event?.data?.customer?.custom_data || {};
  return customData?.tenantId || null;
}

function extractPaddleCustomerId(event: any): string | null {
  return event?.data?.customer?.id || event?.data?.id || null;
}

export function createBillingWebhookRoutes(
  subRepo: SubscriptionRepository,
  tenantRepo: TenantRepository,
  invoiceRepo: InvoiceRepository,
  paymentRepo: PaymentRepository,
  eventRepo: BillingEventRepository,
): Router {
  const router = Router();
  const paddle = new PaddleClient();

  router.post('/webhook', (req: Request, res: Response) => {
    const signatureHeader = req.headers['paddle-signature'] as string;
    if (!signatureHeader) {
      createContextLogger(logger).warn('Missing paddle-signature header');
      return res.status(401).json({ error: 'Missing signature' });
    }

    const rawBody = rawBodyBuffer ? rawBodyBuffer.toString('utf8') : JSON.stringify(req.body);
    const event = paddle.verifyWebhook(rawBody, signatureHeader);
    if (!event) {
      createContextLogger(logger).warn('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const eventType = event?.eventType || req.body?.event_type;
    const paddleEventId = event?.eventId || req.body?.id || '';
    const payload = JSON.stringify(event || req.body);

    createContextLogger(logger).info({ eventType, paddleEventId }, 'Webhook received');

    try {
      const existingEvent = eventRepo.findByPaddleEventId(paddleEventId);
      if (existingEvent) {
        return res.json({ received: true, duplicate: true });
      }

      eventRepo.create({
        paddleEventId,
        eventType,
        status: 'processing',
        payload,
      });

      const tenantId = extractTenantId(event) || event?.data?.custom_data?.tenantId || null;
      const paddleCustomerId = extractPaddleCustomerId(event);

      switch (eventType) {
        case 'subscription.created':
        case 'subscription.updated': {
          const subData = event?.data || {};
          const subId = subData.id || '';
          const priceId = subData.items?.[0]?.price?.id || subData.items?.[0]?.priceId || '';
          const status = subData.status || '';
          const currentPeriodEnd = subData.currentPeriod?.end || subData.currentPeriodEnd || '';
          const trialEnd = subData.trialDates?.end || subData.trialEnd || '';

          let mappedStatus = 'active';
          if (status === 'trialing') mappedStatus = 'trialing';
          else if (status === 'paused') mappedStatus = 'past_due';
          else if (status === 'canceled') mappedStatus = 'cancelled';

          if (tenantId) {
            subRepo.update(tenantId, {
              paddleSubscriptionId: subId,
              paddlePriceId: priceId,
              status: mappedStatus as any,
              currentPeriodEnd,
              trialEnd: trialEnd || undefined,
            });
            tenantRepo.update(tenantId, { subscriptionStatus: mappedStatus as any });
          } else if (paddleCustomerId) {
            const existing = subRepo.findByPaddleCustomerId(paddleCustomerId);
            if (existing) {
              subRepo.update(existing.tenantId, {
                paddleSubscriptionId: subId,
                paddlePriceId: priceId,
                status: mappedStatus as any,
              });
              tenantRepo.update(existing.tenantId, { subscriptionStatus: mappedStatus as any });
            }
          }

          eventRepo.create({
            paddleEventId: paddleEventId + '-done',
            eventType: eventType + '.processed',
            status: 'completed',
            payload: JSON.stringify({ originalEventId: paddleEventId }),
          });
          break;
        }

        case 'subscription.canceled': {
          const subData = event?.data || {};
          const subId = subData.id || '';
          const canceledAt = new Date().toISOString();

          let foundTenantId = tenantId;
          if (!foundTenantId) {
            const existing = subRepo.findByPaddleSubscriptionId(subId);
            if (existing) foundTenantId = existing.tenantId;
          }

          if (foundTenantId) {
            subRepo.update(foundTenantId, { status: 'cancelled', cancelledAt: canceledAt });
            tenantRepo.update(foundTenantId, { subscriptionStatus: 'cancelled' });
          }
          break;
        }

        case 'transaction.completed': {
          const txData = event?.data || {};
          const paddleTxId = txData.id || '';
          const customerId = paddleCustomerId || '';
          let foundTenantId = tenantId;

          if (!foundTenantId && customerId) {
            const existing = subRepo.findByPaddleCustomerId(customerId);
            if (existing) foundTenantId = existing.tenantId;
          }

          if (foundTenantId) {
            const sub = subRepo.findByTenant(foundTenantId);
            const invoice = invoiceRepo.upsert({
              tenantId: foundTenantId,
              paddleInvoiceId: paddleTxId,
              subscriptionId: sub?.id || '',
              status: 'paid',
              amount: txData.details?.totals?.subtotal || txData.amount || 0,
              currency: txData.currencyCode || txData.currency || 'USD',
              paidAt: new Date().toISOString(),
              periodStart: sub?.currentPeriodStart || new Date().toISOString(),
              periodEnd: sub?.currentPeriodEnd || new Date().toISOString(),
            });

            paymentRepo.create({
              tenantId: foundTenantId,
              paddlePaymentId: paddleTxId + '-payment',
              invoiceId: invoice.id,
              amount: txData.details?.totals?.total || txData.amount || 0,
              currency: txData.currencyCode || txData.currency || 'USD',
              status: 'completed',
              method: txData.paymentMethod?.type || 'card',
              paidAt: new Date().toISOString(),
            });
          }
          break;
        }

        case 'transaction.refunded': {
          const txData = event?.data || {};
          const paddleTxId = txData.id || '';
          let foundTenantId = tenantId;

          if (!foundTenantId) {
            const inv = invoiceRepo.findByPaddleInvoiceId(paddleTxId);
            if (inv) foundTenantId = inv.tenantId;
          }

          if (foundTenantId) {
            const inv = invoiceRepo.findByPaddleInvoiceId(paddleTxId);
            if (inv) invoiceRepo.upsert({
              tenantId: foundTenantId,
              paddleInvoiceId: paddleTxId,
              subscriptionId: inv.subscriptionId,
              status: 'refunded',
              amount: inv.amount,
              currency: inv.currency,
              periodStart: inv.periodStart,
              periodEnd: inv.periodEnd,
            });
          }
          break;
        }

        case 'payment.failed': {
          const payData = event?.data || {};
          const paddleTxId = payData.id || '';
          let foundTenantId = tenantId;

          if (foundTenantId) {
            subRepo.update(foundTenantId, { status: 'past_due' });
            tenantRepo.update(foundTenantId, { subscriptionStatus: 'past_due' });
          }
          break;
        }

        default:
          createContextLogger(logger).info({ eventType }, 'Unhandled webhook event type');
      }

      res.json({ received: true });
    } catch (err: any) {
      createContextLogger(logger).error({ err, eventType }, 'Webhook processing failed');
      eventRepo.create({
        paddleEventId: paddleEventId + '-error',
        eventType: eventType + '.error',
        status: 'failed',
        payload: JSON.stringify({ error: err.message, originalEventId: paddleEventId }),
      });
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  return router;
}
