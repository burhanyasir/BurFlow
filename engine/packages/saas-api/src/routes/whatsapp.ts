import { Router, Request, Response } from 'express';
import {
  ConversationRepository, MessageRepository, UsageRepository,
  LeadService, WhatsAppClient, WhatsAppNotConfiguredError,
  extractContactDetails, mapScoreToBuyingIntent, hasContactInfo,
} from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import {
  processConversationBrain,
  DefaultKnowledgeBaseProvider,
  KnowledgeBaseProvider,
  normalizeMessageContent,
  PayloadValidationError,
} from '@conversation-engine/conversation-orchestrator';
import { executePipeline } from '../orchestrator';
import { DEFAULT_TENANT_POLICY } from '../orchestrator/types';
import { requireJsonObject, MESSAGE_MAX } from '../middleware/validate';
import { dispatchLeadWebhook } from '../services/webhook-dispatcher';
import { dispatchLeadNotifications, LeadNotificationConfig } from '../services/lead-notifier';
import type { LeadCaptureOptions } from './chat';

const logger = createLogger('saas-api:whatsapp');

interface WhatsAppTextMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

interface WhatsAppWebhookValue {
  messaging_product: string;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: { profile?: { name?: string }; wa_id?: string }[];
  messages?: WhatsAppTextMessage[];
  statuses?: unknown[];
}

interface WhatsAppWebhookPayload {
  object?: string;
  entry?: {
    id?: string;
    changes?: { field?: string; value?: WhatsAppWebhookValue }[];
  }[];
}

export interface WhatsAppRouteOptions {
  conversationRepo: ConversationRepository;
  messageRepo: MessageRepository;
  usageRepo: UsageRepository;
  kbProvider?: KnowledgeBaseProvider;
  leadOptions?: LeadCaptureOptions;
  whatsappClient?: WhatsAppClient;
  /** Verification token for GET challenge handshake. Defaults to WHATSAPP_VERIFY_TOKEN env. */
  verifyToken?: string;
  /** Tenant that owns the configured WhatsApp phone number. Defaults to WHATSAPP_TENANT_ID env. */
  tenantId?: string;
}

function isTextMessage(message: unknown): message is WhatsAppTextMessage {
  if (!message || typeof message !== 'object') return false;
  const m = message as WhatsAppTextMessage;
  return typeof m.from === 'string' && typeof m.text?.body === 'string';
}

export function createWhatsAppRoutes(options: WhatsAppRouteOptions): Router {
  const {
    conversationRepo, messageRepo, usageRepo,
    kbProvider, leadOptions, whatsappClient,
  } = options;
  const router = Router();
  const kb = kbProvider || new DefaultKnowledgeBaseProvider();
  const client = whatsappClient || new WhatsAppClient();

  const verifyToken = (): string => {
    const token = options.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN || '';
    if (!token) throw new WhatsAppNotConfiguredError('VERIFY_TOKEN');
    return token;
  };

  const resolveTenantId = (): string | null => {
    const tenantId = options.tenantId || process.env.WHATSAPP_TENANT_ID || '';
    return tenantId || null;
  };

  const captureLeadFromTurn = (input: {
    tenantId: string;
    sessionId: string;
    conversationId: string;
    message: string;
    leadCapture?: { email?: string; phone?: string; name?: string; company?: string } | null;
    buyingIntentScore: number;
  }) => {
    if (!leadOptions?.leadService) return;
    try {
      const regexExtracted = extractContactDetails(input.message);
      const llmCapture = input.leadCapture || {};
      const extracted = {
        email: llmCapture.email ?? regexExtracted.email,
        phone: llmCapture.phone ?? regexExtracted.phone,
        name: llmCapture.name ?? regexExtracted.name,
        company: llmCapture.company ?? regexExtracted.company,
      };
      if (!hasContactInfo(extracted) && input.buyingIntentScore < 60) return;

      const result = leadOptions.leadService.upsertLead({
        tenantId: input.tenantId,
        sessionId: input.sessionId,
        conversationId: input.conversationId,
        email: extracted?.email,
        phone: extracted?.phone,
        name: extracted?.name,
        company: extracted?.company,
        leadScore: input.buyingIntentScore,
        buyingIntent: mapScoreToBuyingIntent(input.buyingIntentScore),
        source: 'whatsapp',
        metadata: { message: input.message.slice(0, 500), channel: 'whatsapp' },
      });
      if (!result) return;

      const payload = {
        id: result.lead.id,
        tenantId: result.lead.tenantId,
        sessionId: result.lead.sessionId,
        conversationId: result.lead.conversationId,
        email: result.lead.email,
        phone: result.lead.phone,
        name: result.lead.name,
        company: result.lead.company,
        qualificationStatus: result.lead.qualificationStatus,
        leadScore: result.lead.leadScore,
        buyingIntent: result.lead.buyingIntent,
        source: result.lead.source,
        createdAt: result.lead.createdAt,
        updatedAt: result.lead.updatedAt,
      };
      if (result.isNew && leadOptions.webhookRepo && leadOptions.webhookDeliveryRepo) {
        dispatchLeadWebhook(leadOptions.webhookRepo, leadOptions.webhookDeliveryRepo, input.tenantId, 'lead.captured', payload);
      }
      if (result.qualificationChanged && result.lead.qualificationStatus === 'sales_qualified' && leadOptions.webhookRepo && leadOptions.webhookDeliveryRepo) {
        dispatchLeadWebhook(leadOptions.webhookRepo, leadOptions.webhookDeliveryRepo, input.tenantId, 'lead.qualified', payload);
      }

      if (result.isNew || (result.qualificationChanged && result.lead.qualificationStatus === 'sales_qualified')) {
        if (leadOptions.getNotificationConfig) {
          const notificationConfig = leadOptions.getNotificationConfig(input.tenantId);
          dispatchLeadNotifications(notificationConfig, result.lead);
        }
      }
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'WhatsApp lead capture failed');
    }
  };

  const processInboundMessage = async (message: WhatsAppTextMessage, value: WhatsAppWebhookValue): Promise<{ status: number; error?: string }> => {
    const tenantId = resolveTenantId();
    if (!tenantId) {
      logger.error('WHATSAPP_TENANT_ID not configured');
      return { status: 500, error: 'WhatsApp tenant not configured' };
    }

    // Self-sent messages from the business phone are echoed back by Meta — ignore.
    if (value.metadata?.display_phone_number && message.from === value.metadata.display_phone_number.replace(/\D/g, '')) {
      return { status: 200 };
    }

    let normalizedText: string;
    try {
      normalizedText = normalizeMessageContent(message.text!.body, MESSAGE_MAX);
    } catch (err: unknown) {
      if (err instanceof PayloadValidationError) {
        return { status: 400, error: err.message };
      }
      throw err;
    }
    if (!normalizedText.trim()) {
      return { status: 400, error: 'Message content is required' };
    }

    // Map the sender's phone number to a persistent session so follow-ups
    // continue the same conversation through the LLM brain pipeline.
    const sessionId = `whatsapp:${message.from}`;
    let conversation = conversationRepo.findBySession(tenantId, sessionId);
    if (!conversation) {
      conversation = conversationRepo.create(tenantId, sessionId);
    }
    const conversationId = conversation.id;

    messageRepo.create({
      conversationId,
      tenantId,
      role: 'user',
      content: normalizedText,
      sequenceNumber: conversation.messageCount + 1,
    });

    const period = new Date().toISOString().slice(0, 7);
    usageRepo.incrementMessages(tenantId, period);

    const brainFn = async (input: any) => processConversationBrain(input);
    const pipelineResult = await executePipeline({
      message: normalizedText,
      sessionId,
      tenantId,
      brainFunction: brainFn,
      knowledgeBaseProvider: kb,
      policy: {
        qualification: DEFAULT_TENANT_POLICY.qualification,
        cta: DEFAULT_TENANT_POLICY.cta,
        smallTalk: DEFAULT_TENANT_POLICY.smallTalk,
        trustBuilding: DEFAULT_TENANT_POLICY.trustBuilding,
      },
    });

    const {
      response: finalResponse,
      buyingIntentScore,
      leadCapture,
    } = pipelineResult;

    captureLeadFromTurn({
      tenantId,
      sessionId,
      conversationId,
      message: normalizedText,
      leadCapture,
      buyingIntentScore,
    });

    messageRepo.create({
      conversationId,
      tenantId,
      role: 'assistant',
      content: finalResponse,
      sequenceNumber: conversation.messageCount + 2,
    });

    conversationRepo.incrementMessageCount(conversation.id);
    conversationRepo.incrementMessageCount(conversation.id);

    const sendResult = await client.sendWhatsAppMessage(message.from, finalResponse);
    if (!sendResult.ok) {
      logger.error({ err: sendResult.error, status: sendResult.status, to: message.from }, 'WhatsApp outbound send failed');
      return { status: 502, error: 'Failed to deliver WhatsApp message' };
    }

    logger.info({ event: 'whatsapp_message', tenantId, conversationId, to: message.from }, 'WhatsApp message processed');
    return { status: 200 };
  };

  // ─── Webhook verification challenge (Meta handshake) ─────────────
  router.get('/', (req: Request, res: Response) => {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      if (mode === 'subscribe' && typeof token === 'string' && token === verifyToken() && typeof challenge === 'string') {
        return res.status(200).send(challenge);
      }
      return res.status(403).json({ error: 'Verification failed: invalid hub.mode, hub.verify_token, or hub.challenge' });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'WhatsApp verification failed');
      return res.status(403).json({ error: 'Verification failed' });
    }
  });

  // ─── Inbound webhook events ──────────────────────────────────────
  router.post('/', requireJsonObject, async (req: Request, res: Response) => {
    const payload = req.body as WhatsAppWebhookPayload;

    if (payload?.object !== 'whatsapp' || !Array.isArray(payload.entry)) {
      return res.status(200).json({ received: false });
    }

    let processingError: { status: number; error: string } | null = null;

    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value || !Array.isArray(value.messages)) continue;

        for (const rawMessage of value.messages) {
          if (!isTextMessage(rawMessage)) continue; // ignore non-text (image, audio, etc.)
          try {
            const result = await processInboundMessage(rawMessage, value);
            if (result.status >= 400) {
              processingError = { status: result.status, error: result.error || 'WhatsApp inbound processing failed' };
              createContextLogger(logger).warn({ status: result.status, error: result.error }, 'WhatsApp inbound processing failed');
            }
          } catch (err: any) {
            processingError = { status: 500, error: err?.message || String(err) };
            createContextLogger(logger).error({ err }, 'WhatsApp inbound processing error');
          }
        }
      }
    }

    if (processingError) {
      const message = processingError.status >= 500 ? 'WhatsApp message processing failed' : processingError.error;
      return res.status(processingError.status).json({ error: message });
    }
    return res.status(200).json({ received: true });
  });

  return router;
}
