import { Router, Request, Response } from 'express';
import {
  WebhookRepository, WebhookDeliveryRepository, AuditLogRepository,
  WebhookEvent,
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
      webhookRepo.update(req.params.id, req.tenantId!, { url: webhook.url, events: webhook.events });
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
