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

export function createChatRoutes(
  conversationRepo: ConversationRepository,
  messageRepo: MessageRepository,
  usageRepo: UsageRepository,
  kbProvider?: KnowledgeBaseProvider,
): Router {
  const kb = kbProvider || new DefaultKnowledgeBaseProvider();
  const router = Router();

  const handleChatRequest = async (req: Request, res: Response, stream = false) => {
    const startTime = Date.now();
    const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const { message, sessionId } = req.body as { message: string; sessionId?: string };
      const tenantId = req.tenantId;

      console.log(`[TRACE:${traceId}] === CHAT REQUEST ===`);
      console.log(`[TRACE:${traceId}] tenantId: ${tenantId}`);
      console.log(`[TRACE:${traceId}] message: "${message?.substring(0, 100)}"`);
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

      const brainFn = async (input: any) => processConversationBrain(input);
      const pipelineResult = await executePipeline({
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
      } = pipelineResult;

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
      return res.status(500).json({ error: 'Failed to process message' });
    }
  };

  router.post('/', requireJsonObject, (req: Request, res: Response) => handleChatRequest(req, res, false));
  router.post('/stream', requireJsonObject, (req: Request, res: Response) => handleChatRequest(req, res, true));

  return router;
}
