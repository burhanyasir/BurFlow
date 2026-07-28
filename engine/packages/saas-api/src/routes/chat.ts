import { Router, Request, Response } from 'express';
import {
  ConversationRepository, MessageRepository, UsageRepository,
} from '@conversation-engine/saas-core';
import { createLogger, createContextLogger, logAuditEvent } from '@conversation-engine/logger';
import { requireJsonObject, validateRequiredString, validationError, MESSAGE_MAX } from '../middleware/validate';
import { processConversationBrain, DefaultKnowledgeBaseProvider, KnowledgeBaseProvider } from '@conversation-engine/conversation-orchestrator';
import { executePipeline, getState } from '../orchestrator';
import { DEFAULT_TENANT_POLICY } from '../orchestrator/types';

const logger = createLogger('saas-api:chat');

export function createChatRoutes(
  conversationRepo: ConversationRepository,
  messageRepo: MessageRepository,
  usageRepo: UsageRepository,
  kbProvider?: KnowledgeBaseProvider,
): Router {
  const kb = kbProvider || new DefaultKnowledgeBaseProvider();
  const router = Router();

  router.post('/', requireJsonObject, (req: Request, res: Response) => {
    const startTime = Date.now();
    const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const { message, sessionId } = req.body as ChatRequest;
      const tenantId = req.tenantId;

      console.log(`[TRACE:${traceId}] === CHAT REQUEST ===`);
      console.log(`[TRACE:${traceId}] tenantId: ${tenantId}`);
      console.log(`[TRACE:${traceId}] message: "${message?.substring(0,100)}"`);
      console.log(`[TRACE:${traceId}] sessionId: ${sessionId}`);

      const errors = [
        validateRequiredString(message, 'message', { maxLength: MESSAGE_MAX }),
      ].filter(Boolean);
      if (errors.length > 0) {
        console.log(`[TRACE:${traceId}] Validation failed: ${JSON.stringify(errors)}`);
        return validationError(res, errors as any);
      }

      const convSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

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
        content: message,
        sequenceNumber: conversation.messageCount + 1,
      });

      const period = new Date().toISOString().slice(0, 7);
      usageRepo.incrementMessages(tenantId!, period);

      // ── Phase 10: Conversation Intelligence Orchestrator ────────────
      const brainFn = (input: any) => processConversationBrain(input);
      const pipelineResult = executePipeline({
        message,
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

      const { response: finalResponse, strategy, mood, trustScore, buyingIntentScore, stage, state: orchState, composition, policy: policyDec, isRapportHandled, traceId: orchTrace, latencyMs } = pipelineResult;

      // Persist user + assistant messages
      messageRepo.create({
        conversationId: conversation.id,
        tenantId: tenantId!,
        role: 'assistant',
        content: finalResponse,
        sequenceNumber: conversation.messageCount + 2,
      });

      conversationRepo.incrementMessageCount(conversation.id);
      conversationRepo.incrementMessageCount(conversation.id);

      console.log(`[TRACE:${traceId}] Pipeline strategy=${strategy} mood=${mood} trust=${trustScore} buying=${buyingIntentScore} stage=${stage} compLag=${composition.leakageDetected ? 'LEAK' : 'clean'}`);

      (logger as any).info({ event: 'chat_message', tenantId, conversationId: conversation.id, latencyMs, strategy, mood, trustScore }, 'Chat message processed');

      res.json({
        response: finalResponse,
        sessionId: convSessionId,
        conversationId: conversation.id,
        strategy,
        mood,
        trustScore,
        buyingIntentScore,
        stage,
        cta: null,
        latencyMs,
      });
    } catch (err: any) {
      console.log(`[TRACE:${traceId}] UNHANDLED EXCEPTION: ${err.message}`);
      console.log(`[TRACE:${traceId}] Stack: ${err.stack}`);
      createContextLogger(logger).error({ err }, 'Chat failed');
      res.status(500).json({ error: 'Failed to process message' });
    }
  });

  return router;
}
