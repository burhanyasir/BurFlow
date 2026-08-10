import { Router, Request, Response } from 'express';
import {
  ConversationRepository, MessageRepository, LeadRepository, HandoffRequestRepository,
  SessionHandoffService, Lead, HandoffRequest,
} from '@conversation-engine/saas-core';
import { createLogger } from '@conversation-engine/logger';
import { MESSAGE_MAX } from '../middleware/validate';
import { takeoverEvents, writeSseEvent, openSessionEventStream } from '../services/takeover-events';

const logger = createLogger('saas-api:agent-chat');

export const AGENT_MESSAGE_MAX = MESSAGE_MAX;

/** Lead score at or above which a session is flagged for proactive takeover. */
export const TAKEOVER_LEAD_SCORE_THRESHOLD = 60;

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
  leadRepo?: LeadRepository,
  handoffReqRepo?: HandoffRequestRepository,
): Router {
  const router = Router();

  // GET /api/sessions — active sessions for the agent inbox
  router.get('/', (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const conversations = conversationRepo.listActiveByTenant(tenantId, 100);
    const sessions = conversations.map((c) => {
      const lead: Lead | null = leadRepo?.findBySession(tenantId, c.sessionId) ?? null;
      const handoffReq: HandoffRequest | null = handoffReqRepo?.findBySession(c.sessionId) ?? null;
      const pendingHandoff = handoffReq?.status === 'pending';
      const leadScore = lead?.leadScore ?? 0;
      const needsTakeover = c.sessionState === 'ai_managed' && (
        leadScore >= TAKEOVER_LEAD_SCORE_THRESHOLD ||
        lead?.qualificationStatus === 'sales_qualified' ||
        pendingHandoff
      );
      return {
        id: c.id,
        sessionId: c.sessionId,
        visitorName: lead?.name || undefined,
        visitorEmail: lead?.email || undefined,
        leadScore: lead?.leadScore ?? null,
        qualificationStatus: lead?.qualificationStatus ?? null,
        buyingIntent: lead?.buyingIntent ?? null,
        sessionState: c.sessionState,
        assignedAgentId: c.assignedAgentId,
        takeoverAt: c.takeoverAt,
        startedAt: c.startedAt,
        messageCount: c.messageCount,
        lastMessage: c.lastMessage,
        lastActivityAt: c.lastActivityAt || c.startedAt,
        pendingHandoff,
        needsTakeover,
      };
    });
    return res.json({ sessions, total: sessions.length });
  });

  // GET /api/sessions/events — agent presence stream. While the agent inbox
  // holds this connection open, the session stays in human_takeover. When the
  // agent closes the tab / navigates away, the connection drops and every
  // session that agent was holding is handed back to the AI automatically.
  router.get('/events', (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const agentId = req.user?.sub || 'agent';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    writeSseEvent(res, { type: 'AGENT_CONNECTED', agentId });

    const heartbeat = setInterval(() => {
      try {
        res.write(`: ping\n\n`);
      } catch {
        /* stream closed */
      }
    }, 15000);
    if (heartbeat.unref) heartbeat.unref();

    const onClose = () => {
      clearInterval(heartbeat);
      // Handback: release every session this agent still holds, so the AI
      // resumes driving the conversation the moment the agent leaves.
      const heldIds = new Set<string>([
        ...takeoverEvents.getAgentSessions(agentId),
        ...conversationRepo.listTakeoversByAgent(tenantId, agentId).map((c) => c.id),
      ]);
      for (const conversationId of heldIds) {
        const conversation = conversationRepo.findById(conversationId);
        if (!conversation || conversation.tenantId !== tenantId) continue;
        const released = handoff.releaseTakeover(tenantId, conversation.sessionId);
        if (!released) continue;
        takeoverEvents.untrackAgentSession(agentId, conversationId);
        takeoverEvents.emit({
          type: 'TAKEOVER_ENDED',
          tenantId,
          sessionId: conversation.sessionId,
          conversationId: conversation.id,
          payload: { reason: 'agent_disconnected' },
        });
        logger.info({ tenantId, sessionId: conversation.sessionId, agentId }, 'Agent disconnected — takeover released, AI resumed');
      }
      takeoverEvents.clearAgent(agentId);
      try {
        res.end();
      } catch {
        /* already closed */
      }
    };

    req.on('close', onClose);
    res.on('close', onClose);
  });

  // GET /api/sessions/:id/messages — full thread history for a session
  router.get('/:id/messages', (req: Request, res: Response) => {
    const { id } = req.params;

    const conversation = conversationRepo.findById(id);
    if (!conversation || conversation.tenantId !== req.tenantId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { messages, total } = messageRepo.listByConversation(id, 1, 500);
    return res.json({
      sessionId: conversation.sessionId,
      conversationId: conversation.id,
      sessionState: conversation.sessionState,
      messages,
      total,
    });
  });

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

    takeoverEvents.trackAgentSession(agentId, updated.id);
    takeoverEvents.emit({
      type: 'TAKEOVER_STARTED',
      tenantId: req.tenantId!,
      sessionId: conversation.sessionId,
      conversationId: updated.id,
      payload: { agentId },
    });

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

    const priorAgent = conversation.assignedAgentId;
    const updated = handoff.releaseTakeover(req.tenantId!, conversation.sessionId);
    if (!updated) {
      return res.status(409).json({ error: 'Session is not open for release' });
    }

    if (priorAgent) takeoverEvents.untrackAgentSession(priorAgent, conversation.id);
    takeoverEvents.emit({
      type: 'TAKEOVER_ENDED',
      tenantId: req.tenantId!,
      sessionId: conversation.sessionId,
      conversationId: conversation.id,
    });

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
      sender: 'agent',
    });
    conversationRepo.incrementMessageCount(conversation.id);

    takeoverEvents.emit({
      type: 'OPERATOR_MESSAGE',
      tenantId: req.tenantId!,
      sessionId: conversation.sessionId,
      conversationId: conversation.id,
      payload: {
        id: message.id,
        content: message.content,
        sequenceNumber: message.sequenceNumber,
        sender: 'agent',
        createdAt: message.createdAt,
      },
    });

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
