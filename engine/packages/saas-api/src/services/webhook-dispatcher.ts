import {
  WebhookRepository, WebhookDeliveryRepository, WebhookEvent, Webhook,
} from '@conversation-engine/saas-core';
import { createLogger } from '@conversation-engine/logger';
import { createHmac, timingSafeEqual } from 'crypto';

const logger = createLogger('saas-api:webhook-dispatcher');

/** Sign a webhook payload with HMAC-SHA256. Returns the hex signature. */
export function signWebhookPayload(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

/** Verify a webhook signature against the expected HMAC-SHA256. */
export function verifyWebhookSignature(body: string, secret: string, signature: string): boolean {
  const expected = signWebhookPayload(body, secret);
  const sigBuf = Buffer.from(signature, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(sigBuf, expectedBuf);
}

export function findMatchingWebhooks(
  webhookRepo: WebhookRepository,
  tenantId: string,
  eventType: WebhookEvent,
): Webhook[] {
  try {
    return webhookRepo.listByTenant(tenantId).filter(w => w.isActive && w.events.includes(eventType));
  } catch (err: any) {
    logger.error({ err, tenantId, eventType }, 'Failed to find matching webhooks');
    return [];
  }
}

export function enqueueWebhookEvent(
  webhookRepo: WebhookRepository,
  deliveryRepo: WebhookDeliveryRepository,
  tenantId: string,
  eventType: WebhookEvent,
  payload: Record<string, unknown>,
): number {
  const webhooks = findMatchingWebhooks(webhookRepo, tenantId, eventType);
  const body = JSON.stringify(payload);
  const timestamp = new Date().toISOString();

  for (const webhook of webhooks) {
    try {
      // C10: HMAC-SHA256 signing — if webhook has a secret, include signature headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-BurFlow-Event': eventType,
        'X-BurFlow-Timestamp': timestamp,
      };
      if (webhook.signingSecret) {
        const signature = signWebhookPayload(body, webhook.signingSecret);
        headers['X-BurFlow-Signature'] = signature;
      }

      deliveryRepo.create(webhook.id, tenantId, eventType, body);
    } catch (err: any) {
      logger.error({ err, webhookId: webhook.id }, 'Failed to enqueue webhook delivery');
    }
  }
  return webhooks.length;
}

export function dispatchLeadWebhook(
  webhookRepo: WebhookRepository,
  deliveryRepo: WebhookDeliveryRepository,
  tenantId: string,
  eventType: WebhookEvent,
  leadPayload: Record<string, unknown>,
): number {
  return enqueueWebhookEvent(webhookRepo, deliveryRepo, tenantId, eventType, {
    event: eventType,
    timestamp: new Date().toISOString(),
    data: leadPayload,
  });
}
