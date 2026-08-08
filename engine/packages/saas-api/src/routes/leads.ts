import { Router, Request, Response } from 'express';
import {
  LeadRepository, LeadService, WebhookRepository, WebhookDeliveryRepository,
  Lead, QualificationStatus, BuyingIntentLevel,
} from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { requireJsonObject, validationError } from '../middleware/validate';
import { dispatchLeadWebhook } from '../services/webhook-dispatcher';
import { toCsv } from '../utils/csv-formatter';

const logger = createLogger('saas-api:leads');

const VALID_QUALIFICATION_STATUSES: QualificationStatus[] = ['unqualified', 'marketing_qualified', 'sales_qualified', 'disqualified'];
const VALID_BUYING_INTENTS: BuyingIntentLevel[] = ['low', 'medium', 'high'];

const EXPORT_HEADERS = ['Date', 'Name', 'Email', 'Phone', 'Company', 'Score', 'Status', 'Source', 'Session ID'];

function serializeLead(lead: Lead) {
  return {
    id: lead.id,
    sessionId: lead.sessionId,
    conversationId: lead.conversationId,
    email: lead.email,
    phone: lead.phone,
    name: lead.name,
    company: lead.company,
    qualificationStatus: lead.qualificationStatus,
    leadScore: lead.leadScore,
    buyingIntent: lead.buyingIntent,
    source: lead.source,
    metadata: lead.metadata,
    notes: lead.notes,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

function leadToCsvRow(lead: Lead): (string | number)[] {
  return [
    lead.createdAt.slice(0, 10),
    lead.name || '',
    lead.email || '',
    lead.phone || '',
    lead.company || '',
    lead.leadScore,
    lead.qualificationStatus,
    lead.source,
    lead.sessionId,
  ];
}

export function createLeadRoutes(
  leadRepo: LeadRepository,
  webhookRepo?: WebhookRepository,
  webhookDeliveryRepo?: WebhookDeliveryRepository,
): Router {
  const router = Router();
  const leadService = new LeadService(leadRepo);

  router.get('/', (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 20), 100);
      const status = req.query.status as string | undefined;
      const email = req.query.email as string | undefined;
      const search = req.query.search as string | undefined;
      const minScore = req.query.minScore !== undefined ? parseInt(req.query.minScore as string, 10) : undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      let result: { leads: Lead[]; total: number };
      if (email) {
        const byEmail = leadRepo.findByEmail(tenantId, email);
        result = {
          leads: byEmail ? [byEmail] : [],
          total: byEmail ? 1 : 0,
        };
      } else {
        result = leadRepo.searchLeads(tenantId, {
          status, search, minScore, startDate, endDate, page, limit,
        });
      }

      res.json({
        leads: result.leads.map(serializeLead),
        total: result.total,
        page,
        limit,
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'List leads failed');
      res.status(500).json({ error: 'Failed to list leads' });
    }
  });

  router.get('/export', (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const format = (req.query.format as string || 'csv').toLowerCase();
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const minScore = req.query.minScore !== undefined ? parseInt(req.query.minScore as string, 10) : undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const result = leadRepo.searchLeads(tenantId, {
        status, search, minScore, startDate, endDate, page: 1, limit: 100000,
      });
      const leads = result.leads;

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="leads-export.json"');
        return res.send(JSON.stringify(leads.map(serializeLead), null, 2));
      }

      const csv = toCsv(EXPORT_HEADERS, leads.map(leadToCsvRow));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="leads-export.csv"');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.send(csv);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Export leads failed');
      res.status(500).json({ error: 'Failed to export leads' });
    }
  });

  router.patch('/:id', requireJsonObject, (req: Request, res: Response) => {
    try {
      const lead = leadRepo.findById(req.params.id);
      if (!lead || lead.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      const body = (req.body || {}) as Record<string, any>;
      const updates: Partial<Lead> = {};
      const errors: string[] = [];

      if (body.qualificationStatus !== undefined) {
        if (VALID_QUALIFICATION_STATUSES.includes(body.qualificationStatus)) {
          updates.qualificationStatus = body.qualificationStatus;
        } else {
          errors.push(`qualificationStatus must be one of: ${VALID_QUALIFICATION_STATUSES.join(', ')}`);
        }
      }
      if (body.buyingIntent !== undefined) {
        if (VALID_BUYING_INTENTS.includes(body.buyingIntent)) {
          updates.buyingIntent = body.buyingIntent;
        } else {
          errors.push(`buyingIntent must be one of: ${VALID_BUYING_INTENTS.join(', ')}`);
        }
      }
      if (body.leadScore !== undefined) {
        if (typeof body.leadScore === 'number' && !isNaN(body.leadScore)) {
          updates.leadScore = Math.min(Math.max(0, Math.round(body.leadScore)), 100);
        } else {
          errors.push('leadScore must be a number between 0 and 100');
        }
      }
      if (body.notes !== undefined) {
        if (typeof body.notes === 'string') {
          updates.notes = body.notes;
        } else {
          errors.push('notes must be a string');
        }
      }
      for (const field of ['email', 'phone', 'name', 'company'] as const) {
        if (body[field] !== undefined) {
          if (typeof body[field] === 'string') {
            updates[field] = body[field];
          } else {
            errors.push(`${field} must be a string`);
          }
        }
      }

      if (errors.length > 0) return validationError(res, errors as any);

      const updated = leadRepo.updateLead(lead.id, req.tenantId!, updates);
      res.json({ lead: serializeLead(updated!) });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Update lead failed');
      res.status(500).json({ error: 'Failed to update lead' });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    try {
      const lead = leadRepo.findById(req.params.id);
      if (!lead || lead.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      res.json({ lead: serializeLead(lead) });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Get lead failed');
      res.status(500).json({ error: 'Failed to get lead' });
    }
  });

  router.post('/webhook', requireJsonObject, (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const body = req.body as Record<string, any>;

      let lead: Lead | null = null;
      let isNew = false;
      let qualificationChanged = false;

      if (body.leadId) {
        lead = leadRepo.findById(String(body.leadId));
        if (!lead || lead.tenantId !== tenantId) {
          return res.status(404).json({ error: 'Lead not found' });
        }
        isNew = false;
        qualificationChanged = true;
      } else {
        const data = body.lead && typeof body.lead === 'object'
          ? { ...body.lead, ...body }
          : body;
        const leadScore = typeof data.leadScore === 'number' ? data.leadScore : 0;
        const buyingIntent = (data.buyingIntent || 'low') as BuyingIntentLevel;
        const sessionId = data.sessionId || `webhook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const result = leadService.upsertLead({
          tenantId,
          sessionId: String(sessionId),
          conversationId: data.conversationId ? String(data.conversationId) : undefined,
          email: data.email ? String(data.email) : undefined,
          phone: data.phone ? String(data.phone) : undefined,
          name: data.name ? String(data.name) : undefined,
          company: data.company ? String(data.company) : undefined,
          leadScore,
          buyingIntent,
          source: 'api',
          metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata : undefined,
        });
        if (!result) {
          return res.status(400).json({ error: 'Lead requires at least one contact field (email, phone, name, company)' });
        }
        lead = result.lead;
        isNew = result.isNew;
        qualificationChanged = result.qualificationChanged;
      }

      let deliveries = 0;
      if (webhookRepo && webhookDeliveryRepo) {
        if (isNew || lead.source === 'api') {
          deliveries += dispatchLeadWebhook(webhookRepo, webhookDeliveryRepo, tenantId, 'lead.captured', serializeLead(lead));
        }
        if (qualificationChanged && lead.qualificationStatus === 'sales_qualified') {
          deliveries += dispatchLeadWebhook(webhookRepo, webhookDeliveryRepo, tenantId, 'lead.qualified', serializeLead(lead));
        }
      }

      res.json({
        success: true,
        lead: serializeLead(lead),
        isNew,
        qualificationChanged,
        webhookDeliveriesEnqueued: deliveries,
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Lead webhook trigger failed');
      res.status(500).json({ error: 'Failed to trigger lead webhook' });
    }
  });

  return router;
}
