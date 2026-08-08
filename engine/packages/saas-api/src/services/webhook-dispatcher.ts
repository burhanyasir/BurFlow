import {
  WebhookRepository, WebhookDeliveryRepository, WebhookEvent, Webhook,
} from '@conversation-engine/saas-core';
import { createLogger } from '@conversation-engine/logger';

const logger = createLogger('saas-api:webhook-dispatcher');

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
  for (const webhook of webhooks) {
    try {
      deliveryRepo.create(webhook.id, tenantId, eventType, JSON.stringify(payload));
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
