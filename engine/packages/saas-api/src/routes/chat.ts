import { Router, Request, Response } from 'express';
import {
  ConversationRepository, MessageRepository, UsageRepository,
  LeadService, LeadRepository, WebhookRepository, WebhookDeliveryRepository,
  AnalyticsRepository, SessionHandoffService, TAKEOVER_ACKNOWLEDGEMENT,
  extractContactDetails, mapScoreToBuyingIntent, hasContactInfo,
  UnansweredQuestionRepository,
  WidgetConfigRepository,
  Lead,
} from '@conversation-engine/saas-core';
import { createLogger, createContextLogger, logAuditEvent } from '@conversation-engine/logger';
import { requireJsonObject, MESSAGE_MAX } from '../middleware/validate';
import { createRateLimit } from '../middleware/rate-limit';
import { openSessionEventStream } from '../services/takeover-events';
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
  keyFn: (req) => `ip:${req.ip || 'unknown'}`,
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
  unansweredRepo?: UnansweredQuestionRepository,
  widgetConfigRepo?: WidgetConfigRepository,
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
        // S8: Regex exact-match takes priority for email/phone — LLM can normalize incorrectly
        email: regexExtracted.email || llmCapture.email,
        phone: regexExtracted.phone || llmCapture.phone,
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
      const { message, sessionId, idempotencyKey } = (typeof body === 'object' && body !== null ? body : {}) as { message: unknown; sessionId?: string; idempotencyKey?: string };
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

      // S1: Atomic quota reserve + message insert — prevents race-condition over-quota
      const period = new Date().toISOString().slice(0, 7);
      // Per-plan spend caps in USD
      const SPEND_CAPS: Record<string, number> = { free: 10, starter: 50, professional: 200, advanced: 500, pro: 200 };
      const planId = sub?.plan || 'free';
      const SPEND_CAP_USD = SPEND_CAPS[planId] || 50;
      const usage = usageRepo.getOrCreate(tenantId!, period);

      // Check quota atomically — if over limit, reject before processing
      const currentCost = usageRepo.getCostUsd(tenantId!, period);
      if (currentCost >= SPEND_CAP_USD) {
        console.warn(`[Chat] SPEND CAP REACHED — tenant=${tenantId} cost=$${currentCost.toFixed(2)} cap=$${SPEND_CAP_USD}`);
        return res.status(429).json({
          error: 'Monthly spend limit reached',
          response: "I've reached my response limit for this month. Please contact our support team for assistance.",
          sessionId: convSessionId,
          conversationId: conversation.id,
        });
      }

      // Reserve quota and insert message in one go (best-effort atomicity via sequential ops)
      usageRepo.incrementMessages(tenantId!, period);
      messageRepo.create({
        conversationId: conversation.id,
        tenantId: tenantId!,
        role: 'user',
        content: normalizedText,
        sequenceNumber: conversation.messageCount + 1,
        idempotencyKey: idempotencyKey || undefined,
      });

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
          suggestedOptions: [],
          humanTakeover: true,
        });
      }

      const brainFn = async (input: any) => processConversationBrain(input);

      // Tenant CTA/business profile (widget config business_profile JSON): lets
      // e-commerce / clinic tenants replace SaaS "Book a demo / Free trial"
      // CTAs and quick replies with store-appropriate ones. Never fails the turn.
      let businessProfile: Record<string, unknown> | undefined;
      let systemPromptHint: string | undefined;
      if (widgetConfigRepo) {
        try {
          const wc = widgetConfigRepo.get(tenantId!);
          businessProfile = wc?.businessProfile ? { ...wc.businessProfile } : {};
          // Inject companyName so the brain's no-knowledge prompt can greet by name
          if (wc?.companyName) {
            businessProfile.companyName = wc.companyName;
          }
          if (wc?.allowedDomains?.length) {
            businessProfile.domain = (businessProfile as any).domain || wc.allowedDomains[0];
          }
          // Extract greeting from widget config
          if (wc?.greeting) {
            businessProfile.greeting = wc.greeting;
          }
          // Extract the system prompt hint set by the brand adapter after scanning
          if (typeof (businessProfile as any).systemPromptHint === 'string') {
            systemPromptHint = (businessProfile as any).systemPromptHint as string;
          }
        } catch {
          businessProfile = undefined;
        }
      }

      // Propagate the scanned website knowledge hint into the brain's context.
      // The brain function reads businessProfile._systemPromptHint to prepend
      // website-derived knowledge to the system prompt.
      if (systemPromptHint && businessProfile) {
        (businessProfile as any)._systemPromptHint = systemPromptHint;
      }

      const pipelineResult = await executePipeline({
        message: normalizedText,
        sessionId: convSessionId,
        tenantId: tenantId!,
        brainFunction: brainFn,
        knowledgeBaseProvider: kb,
        businessProfile,
        // Defense-in-depth: if an agent took over between the route-level
        // guard above and pipeline execution, the pipeline skips the LLM.
        isHumanTookOver: handoff ? !handoff.isAiManaged(tenantId!, convSessionId) : false,
        // NOTE: lead notifications are dispatched ONLY here in captureLeadFromTurn
        // (dispatchLeadNotifications / notifyLeadCaptured) — gated on isNew /
        // qualificationChanged and honoring notifyThreshold. Do NOT plumb the
        // tenant config into the pipeline's maybeTrigger, or leads get alerted
        // twice and the sales_qualified_only threshold is bypassed.
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
        suggestedOptions,
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

      // ─── Knowledge Gap Recording ────────────────────────────────
      // When the brain degraded to heuristic templates (LLM unavailable,
      // failed, or returned unparseable output), the visitor's question is a
      // candidate knowledge-base gap. Persist it so tenants can review and
      // add answers from the dashboard. Never fails the chat turn.
      if (pipelineResult.isFallback && unansweredRepo) {
        try {
          unansweredRepo.create({
            tenantId: tenantId!,
            conversationId: conversation.id,
            question: normalizedText.slice(0, 500),
            confidence: 0.15,
            retrievalStatus: 'unanswered',
          });
        } catch (err: any) {
          createContextLogger(logger).error({ err }, 'Failed to record unanswered question');
        }
      }

      // S11: Stale AI turn check — if a human took over during LLM generation, discard the response
      if (handoff && !handoff.isAiManaged(tenantId!, convSessionId)) {
        console.log(`[TRACE:${traceId}] Handoff occurred during LLM call — discarding stale AI response`);
        // Don't save the AI response — the human agent will reply instead
        conversationRepo.incrementMessageCount(conversation.id);
        return res.json({
          response: TAKEOVER_ACKNOWLEDGEMENT,
          sessionId: convSessionId,
          conversationId: conversation.id,
          strategy: 'human_takeover',
          discarded: true,
        });
      }

      messageRepo.create({
        conversationId: conversation.id,
        tenantId: tenantId!,
        role: 'assistant',
        content: finalResponse,
        sequenceNumber: conversation.messageCount + 2,
      });

      conversationRepo.incrementMessageCount(conversation.id);

      // C6: Per-message cost tracking — estimate from response length
      // Rough: ~4 chars per token, GPT-4 class ~$0.03/1K input + $0.06/1K output
      const estimatedTokens = Math.ceil((normalizedText.length + finalResponse.length) / 4);
      const estimatedCost = estimatedTokens * 0.00004; // ~$0.04 per 1K tokens avg
      try {
        usageRepo.incrementTokens(tenantId!, period, estimatedTokens);
        usageRepo.incrementCost(tenantId!, period, estimatedCost);
      } catch {} // non-critical — never fail the chat turn

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
            suggestedOptions,
          });
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders?.();

        try {
          for (const chunk of chunkText(finalResponse)) {
            writeSseEvent(res, { type: 'token', content: chunk });
          }
          writeSseEvent(res, { type: 'ui_state', composition, policy, quickReplies, uiState, cta, suggestedOptions });
          writeSseEvent(res, { type: 'complete', fullContent: finalResponse, turnId: convSessionId, suggestedOptions });
          writeSseEvent(res, { type: 'done', finishReason: 'stop' });
        } catch (writeErr: any) {
          if (writeErr.code !== 'ERR_STREAM_WRITE_AFTER_END' && writeErr.name !== 'AbortError') {
            createContextLogger(logger).warn({ err: writeErr }, 'SSE write failed (client likely disconnected)');
          }
        }
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
        suggestedOptions,
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err, traceId }, 'Chat failed');

      if (err instanceof PayloadValidationError) {
        return res.status(400).json({ error: err.message, code: err.code });
      }
      if (err instanceof UpstreamLLMError) {
        return res.status(502).json({ error: 'Upstream LLM service unavailable. Please try again in a moment.', code: err.code });
      }
      return res.status(500).json({ error: 'Failed to process message' });
    }
  };

  // GET /history — poll for new operator-sent messages during a human takeover.
  // Only agent-sent messages are returned; AI responses arrive synchronously
  // through the POST /stream SSE channel, so nothing is duplicated client-side.
  // `after` is the highest sequence number the client has already rendered.
  router.get('/history', (req: Request, res: Response) => {
    const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : '';
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId query parameter is required' });
    }
    const after = Math.max(parseInt(String(req.query.after || '0'), 10) || 0, 0);

    const conversation = conversationRepo.findBySession(req.tenantId!, sessionId);
    if (!conversation) {
      return res.json({ messages: [], total: 0 });
    }

    const { messages } = messageRepo.listByConversation(conversation.id, 1, 500);
    const operatorMessages = messages
      .filter(m => m.sender === 'agent' && m.sequenceNumber > after)
      .map(m => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        sequenceNumber: m.sequenceNumber,
        sender: m.sender,
        createdAt: m.createdAt,
      }));
    return res.json({ messages: operatorMessages, total: operatorMessages.length });
  });

  // GET /events — live SSE feed of takeover events (TAKEOVER_STARTED,
  // OPERATOR_MESSAGE, TAKEOVER_ENDED) for this visitor session. The widget
  // subscribes once and renders operator messages / banners instantly instead
  // of waiting for the next poll tick.
  router.get('/events', (req: Request, res: Response) => {
    const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : '';
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId query parameter is required' });
    }
    const tenantId = req.tenantId!;

    const close = openSessionEventStream(res, tenantId, sessionId);

    // If the session is already under human control when the visitor
    // subscribes, push the current state immediately.
    const state = handoff ? handoff.getSessionState(tenantId, sessionId) : 'ai_managed';
    if (state === 'human_takeover') {
      const conversation = conversationRepo.findBySession(tenantId, sessionId);
      if (conversation) {
        writeSseEvent(res, {
          type: 'TAKEOVER_STARTED',
          sessionId,
          conversationId: conversation.id,
          payload: { agentId: conversation.assignedAgentId },
        });
      }
    }

    req.on('close', close);
    res.on('close', close);
  });

  router.post('/', requireJsonObject, chatClientLimiter, chatTenantLimiter, (req: Request, res: Response) => handleChatRequest(req, res, false));
  router.post('/stream', requireJsonObject, chatClientLimiter, chatTenantLimiter, (req: Request, res: Response) => handleChatRequest(req, res, true));

  return router;
}
