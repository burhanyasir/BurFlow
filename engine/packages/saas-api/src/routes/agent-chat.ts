import { Router, Request, Response } from 'express';
import {
  ConversationRepository, MessageRepository, SessionHandoffService,
} from '@conversation-engine/saas-core';
import { createLogger } from '@conversation-engine/logger';
import { MESSAGE_MAX } from '../middleware/validate';

const logger = createLogger('saas-api:agent-chat');

export const AGENT_MESSAGE_MAX = MESSAGE_MAX;

function requireString(value: unknown, field: string): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return `${field} must be a non-empty string`;
  }
  if (value.length > AGENT_MESSAGE_MAX) {
    return `${field} exceeds the ${AGENT_MESSAGE_MAX} character limit`;
  }
  return null;
}

/**
 * Live human agent takeover + messaging endpoints.
 * All routes are tenant-scoped (auth + tenantGuard) — a session from
 * another tenant resolves to 404, preventing cross-tenant interference.
 */
export function createAgentChatRoutes(
  conversationRepo: ConversationRepository,
  messageRepo: MessageRepository,
  handoff: SessionHandoffService,
): Router {
  const router = Router();

  // POST /api/sessions/:id/takeover — take control of a live session
  router.post('/:id/takeover', (req: Request, res: Response) => {
    const { id } = req.params;
    const body = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as { agentId?: unknown };
    const agentId = typeof body.agentId === 'string' && body.agentId.trim()
      ? body.agentId.trim()
      : (req.user?.sub || 'agent');

    const conversation = conversationRepo.findById(id);
    if (!conversation || conversation.tenantId !== req.tenantId) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (conversation.sessionState === 'closed') {
      return res.status(409).json({ error: 'Session is closed and can no longer be taken over' });
    }

    const updated = handoff.initiateTakeover(req.tenantId!, conversation.sessionId, agentId);
    if (!updated) {
      return res.status(409).json({ error: 'Session is not open for takeover' });
    }

    logger.info({ tenantId: req.tenantId, sessionId: conversation.sessionId, agentId }, 'Human takeover initiated');
    return res.status(200).json({
      sessionId: conversation.sessionId,
      conversationId: updated.id,
      sessionState: updated.sessionState,
      assignedAgentId: updated.assignedAgentId,
      takeoverAt: updated.takeoverAt,
    });
  });

  // POST /api/sessions/:id/release — hand control back to the AI
  router.post('/:id/release', (req: Request, res: Response) => {
    const { id } = req.params;

    const conversation = conversationRepo.findById(id);
    if (!conversation || conversation.tenantId !== req.tenantId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const updated = handoff.releaseTakeover(req.tenantId!, conversation.sessionId);
    if (!updated) {
      return res.status(409).json({ error: 'Session is not open for release' });
    }

    logger.info({ tenantId: req.tenantId, sessionId: conversation.sessionId }, 'Takeover released — AI resumed');
    return res.status(200).json({
      sessionId: conversation.sessionId,
      conversationId: updated.id,
      sessionState: updated.sessionState,
      assignedAgentId: updated.assignedAgentId,
      takeoverAt: updated.takeoverAt,
    });
  });

  // POST /api/sessions/:id/message — agent sends a manual reply to the visitor
  router.post('/:id/message', (req: Request, res: Response) => {
    const { id } = req.params;
    const body = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as { content?: unknown };

    const contentError = requireString(body.content, 'content');
    if (contentError) {
      return res.status(400).json({ error: contentError, code: 'INVALID_CONTENT' });
    }

    const conversation = conversationRepo.findById(id);
    if (!conversation || conversation.tenantId !== req.tenantId) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (conversation.sessionState === 'closed' || conversation.status === 'ended') {
      return res.status(409).json({ error: 'Session is closed and can no longer receive messages' });
    }

    const message = messageRepo.create({
      conversationId: conversation.id,
      tenantId: req.tenantId!,
      role: 'assistant',
      content: body.content as string,
      sequenceNumber: conversation.messageCount + 1,
    });
    conversationRepo.incrementMessageCount(conversation.id);

    logger.info({ tenantId: req.tenantId, conversationId: conversation.id, agentId: req.user?.sub }, 'Agent message sent');
    return res.status(201).json({
      id: message.id,
      conversationId: message.conversationId,
      role: 'assistant',
      content: message.content,
      sequenceNumber: message.sequenceNumber,
      createdAt: message.createdAt,
      sender: 'agent',
    });
  });

  return router;
}
