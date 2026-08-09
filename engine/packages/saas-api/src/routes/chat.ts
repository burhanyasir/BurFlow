import { Router, Request, Response } from 'express';
import {
  ConversationRepository, MessageRepository, UsageRepository,
  LeadService, LeadRepository, WebhookRepository, WebhookDeliveryRepository,
  AnalyticsRepository, SessionHandoffService, TAKEOVER_ACKNOWLEDGEMENT,
  extractContactDetails, mapScoreToBuyingIntent, hasContactInfo,
  Lead,
} from '@conversation-engine/saas-core';
import { createLogger, createContextLogger, logAuditEvent } from '@conversation-engine/logger';
import { requireJsonObject, MESSAGE_MAX } from '../middleware/validate';
import { createRateLimit } from '../middleware/rate-limit';
import {
  processConversationBrain,
  DefaultKnowledgeBaseProvider,
  KnowledgeBaseProvider,
  normalizeMessageContent,
  PayloadValidationError,
  UpstreamLLMError,
} from '@conversation-engine/conversation-orchestrator';
import { executePipeline, getState } from '../orchestrator';
import { DEFAULT_TENANT_POLICY } from '../orchestrator/types';
import { dispatchLeadWebhook } from '../services/webhook-dispatcher';
import { dispatchLeadNotifications, LeadNotificationConfig } from '../services/lead-notifier';

const logger = createLogger('saas-api:chat');

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_MESSAGES_PER_IP_OR_SESSION = 20;
const MAX_MESSAGES_PER_TENANT = 100;
const RATE_LIMIT_MESSAGE = 'Rate limit exceeded. Please wait a moment before sending another message.';

const chatClientLimiter = createRateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: MAX_MESSAGES_PER_IP_OR_SESSION,
  keyFn: (req) => {
    const sessionId = (req.body as { sessionId?: string } | undefined)?.sessionId;
    return sessionId ? `session:${sessionId}` : `ip:${req.ip || 'unknown'}`;
  },
  message: RATE_LIMIT_MESSAGE,
});

const chatTenantLimiter = createRateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: MAX_MESSAGES_PER_TENANT,
  keyFn: (req) => `tenant:${req.tenantId || 'unknown'}`,
  message: RATE_LIMIT_MESSAGE,
});

function writeSseEvent(res: Response, event: Record<string, any>) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function chunkText(text: string, size = 24): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size));
  }
  return chunks;
}

export interface LeadCaptureOptions {
  leadService?: LeadService;
  webhookRepo?: WebhookRepository;
  webhookDeliveryRepo?: WebhookDeliveryRepository;
  getNotificationConfig?: (tenantId: string) => LeadNotificationConfig | null | undefined;
  /** Preferred lead-alert hook (Slack + MailerService email with recipient resolution). Falls back to getNotificationConfig + dispatchLeadNotifications when absent. */
  notifyLeadCaptured?: (lead: Lead, context: { message: string }) => void;
  analyticsRepo?: AnalyticsRepository;
  getStarterOptions?: (tenantId: string) => string[] | undefined;
}

export function createChatRoutes(
  conversationRepo: ConversationRepository,
  messageRepo: MessageRepository,
  usageRepo: UsageRepository,
  kbProvider?: KnowledgeBaseProvider,
  leadOptions?: LeadCaptureOptions,
  handoff?: SessionHandoffService,
): Router {
  const kb = kbProvider || new DefaultKnowledgeBaseProvider();
  const router = Router();

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
        source: 'chat',
        metadata: { message: input.message.slice(0, 500) },
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
        if (leadOptions.notifyLeadCaptured) {
          leadOptions.notifyLeadCaptured(result.lead, { message: input.message });
        } else if (leadOptions.getNotificationConfig) {
          const notificationConfig = leadOptions.getNotificationConfig(input.tenantId);
          dispatchLeadNotifications(notificationConfig, result.lead);
        }
      }
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Lead capture failed');
    }
  };

  const handleChatRequest = async (req: Request, res: Response, stream = false) => {
    const startTime = Date.now();
    const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const body: unknown = req.body;
      const { message, sessionId } = (typeof body === 'object' && body !== null ? body : {}) as { message: unknown; sessionId?: string };
      const tenantId = req.tenantId;

      console.log(`[TRACE:${traceId}] === CHAT REQUEST ===`);
      console.log(`[TRACE:${traceId}] tenantId: ${tenantId}`);
      console.log(`[TRACE:${traceId}] message: "${typeof message === 'string' ? message?.substring(0, 100) : '[non-string payload]'}"`);
      console.log(`[TRACE:${traceId}] sessionId: ${sessionId}`);

      if (message === undefined || message === null || message === '') {
        console.log(`[TRACE:${traceId}] Validation failed: message is required`);
        return res.status(400).json({ error: 'message is required', code: 'REQUIRED' });
      }

      // Strict runtime payload validation. Rejects non-string messages, oversized
      // messages, and invalid/unsupported image MIME or malformed data URIs before
      // any content reaches the LLM pipeline. Returns 400 to the caller.
      // normalizeMessageContent is a defensive type guard: it accepts plain text
      // strings, multimodal text/image arrays, and rejects everything else
      // (objects, booleans, numbers, unsupported MIME types, malformed data URIs).
      let normalizedText: string;
      try {
        normalizedText = normalizeMessageContent(message, MESSAGE_MAX);
      } catch (validationErr: unknown) {
        if (validationErr instanceof PayloadValidationError) {
          console.log(`[TRACE:${traceId}] Payload validation failed: ${validationErr.message}`);
          return res.status(400).json({ error: validationErr.message, code: validationErr.code });
        }
        throw validationErr;
      }

      const convSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      if (leadOptions?.analyticsRepo && leadOptions?.getStarterOptions) {
        try {
          const starterOptions = leadOptions.getStarterOptions(tenantId!) || [];
          if (starterOptions.some(option => option.trim() === normalizedText.trim())) {
            leadOptions.analyticsRepo.record(tenantId!, 'starter_chip_click', { option: normalizedText, sessionId: convSessionId });
          }
        } catch (err: any) {
          createContextLogger(logger).error({ err }, 'Starter chip analytics failed');
        }
      }

      let conversation = sessionId
        ? conversationRepo.findBySession(tenantId!, sessionId)
        : null;
      if (!conversation) {
        conversation = conversationRepo.create(tenantId!, convSessionId);
      }
      const conversationId = conversation.id;
      console.log(`[TRACE:${traceId}] conversationId: ${conversationId}`);

      messageRepo.create({
        conversationId: conversation.id,
        tenantId: tenantId!,
        role: 'user',
        content: normalizedText,
        sequenceNumber: conversation.messageCount + 1,
      });

      const period = new Date().toISOString().slice(0, 7);
      usageRepo.incrementMessages(tenantId!, period);

      // ─── Live Human Takeover Guard ─────────────────────────────
      // When a human agent has taken over the session, the visitor's
      // message is stored in history (above) but the LLM brain is
      // bypassed. The visitor receives an acknowledgement that a rep
      // is reading; all subsequent replies come from the agent API.
      if (handoff && !handoff.isAiManaged(tenantId!, convSessionId)) {
        conversationRepo.incrementMessageCount(conversation.id);
        console.log(`[TRACE:${traceId}] Session in ${handoff.getSessionState(tenantId!, convSessionId)} — AI bypassed, awaiting human agent`);
        (logger as any).info({ event: 'chat_message_handoff', tenantId, conversationId: conversation.id }, 'Human takeover active — AI response suppressed');

        if (stream) {
          const acceptHeader = String(req.headers.accept || '');
          if (acceptHeader.includes('application/json')) {
            return res.json({
              response: TAKEOVER_ACKNOWLEDGEMENT,
              sessionId: convSessionId,
              conversationId: conversation.id,
              strategy: 'human_takeover',
              mood: 'neutral',
              trustScore: 0,
              buyingIntentScore: 0,
              stage: 'handoff',
              composition: {},
              policy: {},
              latencyMs: 0,
              quickReplies: [],
              uiState: { state: 'handoff' },
              cta: null,
              humanTakeover: true,
            });
          }

          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');
          res.flushHeaders?.();

          writeSseEvent(res, { type: 'ui_state', composition: {}, policy: {}, quickReplies: [], uiState: { state: 'handoff' }, cta: null, humanTakeover: true });
          writeSseEvent(res, { type: 'complete', fullContent: TAKEOVER_ACKNOWLEDGEMENT, turnId: convSessionId, humanTakeover: true });
          writeSseEvent(res, { type: 'done', finishReason: 'handoff' });
          return res.end();
        }

        return res.json({
          response: TAKEOVER_ACKNOWLEDGEMENT,
          sessionId: convSessionId,
          conversationId: conversation.id,
          strategy: 'human_takeover',
          mood: 'neutral',
          trustScore: 0,
          buyingIntentScore: 0,
          stage: 'handoff',
          composition: {},
          policy: {},
          latencyMs: 0,
          quickReplies: [],
          uiState: { state: 'handoff' },
          cta: null,
          humanTakeover: true,
        });
      }

      const brainFn = async (input: any) => processConversationBrain(input);
      const pipelineResult = await executePipeline({
        message: normalizedText,
        sessionId: convSessionId,
        tenantId: tenantId!,
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
        strategy,
        mood,
        trustScore,
        buyingIntentScore,
        stage,
        composition,
        policy,
        latencyMs,
        quickReplies,
        uiState,
        cta,
        leadCapture,
      } = pipelineResult;

      captureLeadFromTurn({
        tenantId: tenantId!,
        sessionId: convSessionId,
        conversationId: conversation.id,
        message: normalizedText,
        leadCapture,
        buyingIntentScore,
      });

      messageRepo.create({
        conversationId: conversation.id,
        tenantId: tenantId!,
        role: 'assistant',
        content: finalResponse,
        sequenceNumber: conversation.messageCount + 2,
      });

      conversationRepo.incrementMessageCount(conversation.id);
      conversationRepo.incrementMessageCount(conversation.id);

      console.log(`[TRACE:${traceId}] Pipeline strategy=${strategy} mood=${mood} trust=${trustScore} buying=${buyingIntentScore} stage=${stage}`);

      (logger as any).info({ event: 'chat_message', tenantId, conversationId: conversation.id, latencyMs, strategy, mood, trustScore }, 'Chat message processed');

      if (stream) {
        const acceptHeader = String(req.headers.accept || '');
        if (acceptHeader.includes('application/json')) {
          return res.json({
            response: finalResponse,
            sessionId: convSessionId,
            conversationId: conversation.id,
            strategy,
            mood,
            trustScore,
            buyingIntentScore,
            stage,
            composition,
            policy,
            latencyMs,
            quickReplies,
            uiState,
            cta,
          });
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders?.();

        for (const chunk of chunkText(finalResponse)) {
          writeSseEvent(res, { type: 'token', content: chunk });
        }
        writeSseEvent(res, { type: 'ui_state', composition, policy, quickReplies, uiState, cta });
        writeSseEvent(res, { type: 'complete', fullContent: finalResponse, turnId: convSessionId });
        writeSseEvent(res, { type: 'done', finishReason: 'stop' });
        return res.end();
      }

      return res.json({
        response: finalResponse,
        sessionId: convSessionId,
        conversationId: conversation.id,
        strategy,
        mood,
        trustScore,
        buyingIntentScore,
        stage,
        composition,
        policy,
        latencyMs,
        quickReplies,
        uiState,
        cta,
      });
    } catch (err: any) {
      console.log(`[TRACE:${traceId}] UNHANDLED EXCEPTION: ${err.message}`);
      console.log(`[TRACE:${traceId}] Stack: ${err.stack}`);
      createContextLogger(logger).error({ err }, 'Chat failed');

      if (err instanceof PayloadValidationError) {
        return res.status(400).json({ error: err.message, code: err.code });
      }
      if (err instanceof UpstreamLLMError) {
        return res.status(502).json({ error: 'Upstream LLM service unavailable. Please try again in a moment.', code: err.code });
      }
      return res.status(500).json({ error: 'Failed to process message' });
    }
  };

  router.post('/', requireJsonObject, chatClientLimiter, chatTenantLimiter, (req: Request, res: Response) => handleChatRequest(req, res, false));
  router.post('/stream', requireJsonObject, chatClientLimiter, chatTenantLimiter, (req: Request, res: Response) => handleChatRequest(req, res, true));

  return router;
}
