import { Router, Request, Response } from 'express';
import {
  UserRepository, TenantRepository, ConversationRepository,
  UsageRepository, KnowledgeBaseRepository, KbDocumentRepository,
  ApiKeyRepository, AnalyticsRepository, SubscriptionRepository,
  MessageRepository, LeadRepository, HandoffRequestRepository,
  SessionNote,
} from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { parsePagination, requireJsonObject, validationError, validateRequiredString, validateRequiredEnum } from '../middleware/validate';
import { createTtlCache } from '../utils/ttl-cache';

const logger = createLogger('saas-api:admin');

/** 15s TTL cache for the session list — the dashboard polls at 15s. */
const SESSIONS_CACHE_TTL_MS = 15_000;
const sessionsCache = createTtlCache<unknown>(SESSIONS_CACHE_TTL_MS);

const VALID_SESSION_STATUSES = ['active', 'ended', 'escalated'] as const;

function sessionTimeline(conversation: any, messages: any[], notes: SessionNote[], handoff: any) {
  const events: any[] = messages.map((m: any) => ({
    type: 'message' as const,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt || m.sequenceNumber,
    actor: m.role === 'user' ? 'Visitor' : 'Assistant',
  }));
  if (handoff) {
    events.push({
      type: 'handoff' as const,
      status: handoff.status,
      visitorEmail: handoff.visitorEmail,
      createdAt: handoff.createdAt,
      actor: 'System',
      content: 'Visitor requested a human agent',
    });
  }
  if (conversation.takeoverAt) {
    events.push({
      type: 'takeover' as const,
      createdAt: conversation.takeoverAt,
      actor: conversation.assignedAgentId || 'Agent',
      content: 'Human agent took over the conversation',
    });
  }
  for (const n of notes) {
    events.push({ type: 'note' as const, createdAt: n.createdAt, actor: n.authorName, content: n.content });
  }
  return events.sort((a: any, b: any) =>
    new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );
}

export function createAdminRoutes(
  userRepo: UserRepository,
  tenantRepo: TenantRepository,
  conversationRepo: ConversationRepository,
  usageRepo: UsageRepository,
  kbRepo: KnowledgeBaseRepository,
  docRepo: KbDocumentRepository,
  apiKeyRepo: ApiKeyRepository,
  analyticsRepo: AnalyticsRepository,
  subRepo: SubscriptionRepository,
  messageRepo: MessageRepository,
  leadRepo: LeadRepository,
  handoffReqRepo: HandoffRequestRepository,
): Router {
  const router = Router();

  const adminOnly = (req: Request, res: Response, next: Function) => {
    if (!req.user?.role || !['admin', 'owner'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };

  router.get('/overview', adminOnly, (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const convs = conversationRepo.listByTenant(tenantId, 1, 1);
      const usage = usageRepo.listByTenant(tenantId, 1, 1);
      const kbs = kbRepo.listByTenant(tenantId);
      const currentUsage = usage.records[0];
      res.json({
        totalConversations: convs.total,
        totalMessages: currentUsage?.messagesUsed || 0,
        totalTokens: currentUsage?.tokensUsed || 0,
        totalKnowledgeBases: kbs.length,
        totalDocuments: kbs.reduce((sum: number, kb: any) => sum + (kb.documentCount || 0), 0),
        usage: currentUsage || null,
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Admin overview failed');
      res.status(500).json({ error: 'Failed to fetch overview' });
    }
  });

  router.get('/analytics', adminOnly, (req: Request, res: Response) => {
    try {
      const { page, limit } = parsePagination(req.query as any, { limit: 20, maxLimit: 100 });
      const event = req.query.event as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const result = analyticsRepo.query(req.tenantId!, event, from, to, page, limit);
      res.json(result);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Analytics query failed');
      res.status(500).json({ error: 'Failed to query analytics' });
    }
  });

  router.get('/users', adminOnly, (req: Request, res: Response) => {
    try {
      const { page, limit } = parsePagination(req.query as any, { limit: 20, maxLimit: 100 });
      const tenant = tenantRepo.findById(req.tenantId!);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
      const owner = userRepo.findById(tenant.ownerId);
      if (!owner) return res.status(404).json({ error: 'Owner not found' });
      res.json({ users: [owner], total: 1, page, limit });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Admin users fetch failed');
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  router.get('/subscription', adminOnly, (req: Request, res: Response) => {
    try {
      const sub = subRepo.findByTenant(req.tenantId!);
      res.json({ subscription: sub || { plan: 'free', status: 'active', tenantId: req.tenantId } });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Subscription fetch failed');
      res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  });

  router.get('/api-keys', adminOnly, (req: Request, res: Response) => {
    try {
      const keys = apiKeyRepo.findByTenant(req.tenantId!);
      res.json({ apiKeys: keys.map(k => ({ id: k.id, label: k.label, keyPrefix: k.keyPrefix, role: k.role, lastUsedAt: k.lastUsedAt, createdAt: k.createdAt })) });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'API keys fetch failed');
      res.status(500).json({ error: 'Failed to fetch API keys' });
    }
  });

  router.get('/logs', adminOnly, (req: Request, res: Response) => {
    try {
      const { page, limit } = parsePagination(req.query as any, { limit: 20, maxLimit: 100 });
      const result = analyticsRepo.query(req.tenantId!, undefined, undefined, undefined, page, limit);
      res.json({ ...result, events: result.events.map(e => ({
        id: e.id, event: e.event, properties: e.properties, occurredAt: e.occurredAt,
      })) });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Logs fetch failed');
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  router.get('/knowledge/monitoring', adminOnly, (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const stats = docRepo.countByStatus(tenantId);
      const kbs = kbRepo.listByTenant(tenantId);
      const totalChunks = kbs.reduce((sum: number, kb: any) => sum + (kb.totalChunks || 0), 0);
      const embeddingProgress = stats.total > 0 ? stats.published / stats.total : 0;
      res.json({
        totalDocuments: stats.total,
        indexedDocuments: stats.published,
        failedDocuments: stats.failed,
        processingDocuments: stats.processing,
        queuedDocuments: stats.queued,
        totalChunks: stats.totalChunks || totalChunks,
        embeddingProgress,
        knowledgeBases: kbs.length,
        coveragePercent: Math.round(embeddingProgress * 100),
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Knowledge monitoring failed');
      res.status(500).json({ error: 'Failed to fetch knowledge monitoring' });
    }
  });

  router.get('/knowledge/embedding-status', adminOnly, (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const kbs = kbRepo.listByTenant(tenantId);
      const docs = docRepo.listByTenant(tenantId);
      const publishedDocs = docs.filter(d => d.status === 'published');
      const lastPublished = publishedDocs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
      res.json({
        embeddingModel: process.env.EMBEDDING_MODEL || 'default',
        activeChunks: kbs.reduce((sum: number, kb: any) => sum + (kb.totalChunks || 0), 0),
        currentKnowledgeVersion: kbs.length,
        lastPublishedAt: lastPublished?.updatedAt || null,
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Embedding status fetch failed');
      res.status(500).json({ error: 'Failed to fetch embedding status' });
    }
  });

  router.get('/knowledge/documents', adminOnly, (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10), 1), 200);
      const offset = Math.max(parseInt(String(req.query.offset || '0'), 10), 0);
      const status = req.query.status as string | undefined;
      const q = req.query.q as string | undefined;
      let allDocs = docRepo.listByTenant(tenantId);
      if (status) allDocs = allDocs.filter(d => d.status === status);
      if (q) {
        const lower = q.toLowerCase();
        allDocs = allDocs.filter(d => (d.filename && d.filename.toLowerCase().includes(lower)) || (d.sourceUrl && d.sourceUrl.toLowerCase().includes(lower)));
      }
      const docs = allDocs.slice(offset, offset + limit);
      res.json({ documents: docs, total: allDocs.length, limit, offset });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Failed to list documents');
      res.status(500).json({ error: 'Failed to list documents' });
    }
  });

  router.delete('/knowledge/documents/:documentId', adminOnly, (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      docRepo.updateStatus(documentId, 'deleted' as any);
      res.json({ status: 'deleted' });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Failed to delete document');
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  router.post('/knowledge/documents/:documentId/retry', adminOnly, (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      docRepo.updateStatus(documentId, 'queued' as any);
      res.json({ status: 'queued' });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Failed to retry document');
      res.status(500).json({ error: 'Failed to retry document' });
    }
  });

  router.get('/sessions', adminOnly, (req: Request, res: Response) => {
    try {
      const { page = '1', limit = '50' } = req.query as Record<string, string>;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
      // Cache key is tenant-scoped so reads never leak across tenants.
      const cacheKey = `${req.tenantId}|${pageNum}|${limitNum}`;
      const cached = sessionsCache.get(cacheKey);
      if (cached !== undefined) {
        return res.json(cached);
      }
      const result = conversationRepo.listByTenant(req.tenantId!, pageNum, limitNum);
      const payload = { sessions: result.conversations || [], total: result.total || 0, limit: limitNum, offset: (pageNum - 1) * limitNum };
      sessionsCache.set(cacheKey, payload);
      res.json(payload);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Failed to list sessions');
      res.status(500).json({ error: 'Failed to list sessions' });
    }
  });

  router.get('/sessions/:id', adminOnly, (req: Request, res: Response) => {
    try {
      const conversation = conversationRepo.findById(req.params.id);
      if (!conversation || conversation.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Session not found' });
      }
      const { messages } = messageRepo.listByConversation(conversation.id, 1, 500);

      // Build the turn transcript from stored messages. Per-turn intelligence
      // (polarity, strategy) is computed at runtime by the brain and not
      // persisted, so those fields default to neutral/empty values.
      const turns = (messages || []).map(m => ({
        role: m.role,
        content: m.content,
        message: m.role === 'user' ? m.content : '',
        response: m.role === 'assistant' ? m.content : '',
        polarity: 0,
        frustration: 0.1,
        urgency: 0.1,
        timestamp: new Date(m.createdAt).getTime(),
        metadata: m.safetyFlags && m.safetyFlags.length > 0 ? { safetyFlags: m.safetyFlags } : undefined,
      }));

      const notes = (conversation.notes || []).map(n => ({
        id: n.id,
        tenantId: conversation.tenantId,
        sessionId: conversation.id,
        author: n.authorName || n.authorId,
        message: n.content,
        createdAt: n.createdAt,
        updatedAt: n.createdAt,
      }));

      res.json({
        sessionId: conversation.id,
        tenantId: conversation.tenantId,
        createdAt: conversation.startedAt,
        updatedAt: conversation.startedAt,
        stateMachine: conversation.sessionState,
        sequenceCounter: conversation.messageCount,
        turnCount: conversation.messageCount,
        // Intelligence fields are not persisted per conversation — return safe
        // defaults so the UI renders rather than throwing.
        persona: '',
        funnelStage: '',
        buyingIntentDetected: false,
        buyingIntentReason: null,
        hasIntel: false,
        status: conversation.status,
        owner: conversation.assignedAgentId || null,
        flagged: !!conversation.flagged,
        archived: !!conversation.archived,
        tags: conversation.tags || [],
        turns,
        objections: [],
        qualificationState: {},
        repeatedPhraseCount: 0,
        topics: [],
        state: JSON.stringify(conversation),
        conversationIntelligence: {
          score: 0,
          personaReason: '',
          qualificationProgress: 'not_started',
          topObjections: [],
          sentiment: { polarity: 0, frustration: 0.1, urgency: 0.1 },
        },
        notes,
        timeline: [],
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Failed to get session');
      res.status(500).json({ error: 'Failed to get session' });
    }
  });

  const requireSession = (req: Request, res: Response): ReturnType<ConversationRepository['findById']> | null => {
    const conversation = conversationRepo.findById(req.params.id);
    if (!conversation || conversation.tenantId !== req.tenantId) {
      res.status(404).json({ error: 'Session not found' });
      return null;
    }
    return conversation;
  };

  router.put('/sessions/:id/status', adminOnly, requireJsonObject, (req: Request, res: Response) => {
    try {
      const conversation = requireSession(req, res);
      if (!conversation) return;
      const statusError = validateRequiredEnum(req.body.status, 'status', VALID_SESSION_STATUSES);
      if (statusError) return validationError(res, [statusError]);
      conversationRepo.updateStatus(conversation.id, req.body.status);
      res.json({ message: 'Status updated', sessionId: conversation.id, status: req.body.status });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Session status update failed');
      res.status(500).json({ error: 'Failed to update session status' });
    }
  });

  router.put('/sessions/:id/owner', adminOnly, requireJsonObject, (req: Request, res: Response) => {
    try {
      const conversation = requireSession(req, res);
      if (!conversation) return;
      const ownerId = req.body.ownerId;
      if (ownerId !== null && (typeof ownerId !== 'string' || ownerId.length === 0)) {
        return res.status(400).json({ error: 'ownerId must be a string or null' });
      }
      conversationRepo.updateSessionMeta(conversation.id, { assignedAgentId: ownerId });
      res.json({ message: 'Owner updated', sessionId: conversation.id, ownerId: ownerId || null });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Session owner update failed');
      res.status(500).json({ error: 'Failed to update session owner' });
    }
  });

  router.put('/sessions/:id/flag', adminOnly, requireJsonObject, (req: Request, res: Response) => {
    try {
      const conversation = requireSession(req, res);
      if (!conversation) return;
      const flagged = req.body.flagged;
      if (typeof flagged !== 'boolean') return res.status(400).json({ error: 'flagged must be a boolean' });
      conversationRepo.updateSessionMeta(conversation.id, { flagged });
      res.json({ message: 'Flag toggled', sessionId: conversation.id, flagged });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Session flag update failed');
      res.status(500).json({ error: 'Failed to update session flag' });
    }
  });

  router.put('/sessions/:id/archive', adminOnly, requireJsonObject, (req: Request, res: Response) => {
    try {
      const conversation = requireSession(req, res);
      if (!conversation) return;
      const archived = req.body.archived;
      if (typeof archived !== 'boolean') return res.status(400).json({ error: 'archived must be a boolean' });
      conversationRepo.updateSessionMeta(conversation.id, { archived });
      res.json({ message: 'Archive toggled', sessionId: conversation.id, archived });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Session archive update failed');
      res.status(500).json({ error: 'Failed to update session archive' });
    }
  });

  router.post('/sessions/:id/notes', adminOnly, requireJsonObject, (req: Request, res: Response) => {
    try {
      const conversation = requireSession(req, res);
      if (!conversation) return;
      const error = validateRequiredString(req.body.content, 'content', { maxLength: 4000 });
      if (error) return validationError(res, [error]);
      const note: SessionNote = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        authorId: req.user!.sub,
        authorName: req.user!.name || req.user!.sub,
        content: req.body.content,
        createdAt: new Date().toISOString(),
      };
      const notes = [...(conversation.notes || []), note];
      conversationRepo.updateSessionMeta(conversation.id, { notes });
      res.status(201).json({ message: 'Note added', sessionId: conversation.id, note });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Add session note failed');
      res.status(500).json({ error: 'Failed to add note' });
    }
  });

  router.get('/sessions/:id/notes', adminOnly, (req: Request, res: Response) => {
    try {
      const conversation = requireSession(req, res);
      if (!conversation) return;
      res.json({ notes: conversation.notes || [], sessionId: conversation.id });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'List session notes failed');
      res.status(500).json({ error: 'Failed to list notes' });
    }
  });

  router.put('/sessions/:id/tags', adminOnly, requireJsonObject, (req: Request, res: Response) => {
    try {
      const conversation = requireSession(req, res);
      if (!conversation) return;
      const { tags } = req.body;
      if (!Array.isArray(tags) || tags.some(t => typeof t !== 'string' || t.length > 50)) {
        return res.status(400).json({ error: 'tags must be an array of strings (max 50 chars each)' });
      }
      conversationRepo.updateSessionMeta(conversation.id, { tags });
      res.json({ message: 'Tags updated', sessionId: conversation.id, tags });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Session tags update failed');
      res.status(500).json({ error: 'Failed to update session tags' });
    }
  });

  router.get('/sessions/:id/tags', adminOnly, (req: Request, res: Response) => {
    try {
      const conversation = requireSession(req, res);
      if (!conversation) return;
      res.json({ tags: conversation.tags || [], sessionId: conversation.id });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'List session tags failed');
      res.status(500).json({ error: 'Failed to list tags' });
    }
  });

  router.get('/sessions/:id/timeline', adminOnly, (req: Request, res: Response) => {
    try {
      const conversation = requireSession(req, res);
      if (!conversation) return;
      const messages = (messageRepo.listByConversation(conversation.id, 1, 500).messages || []);
      const handoff = handoffReqRepo.findBySession(conversation.sessionId);
      res.json({ timeline: sessionTimeline(conversation, messages, conversation.notes || [], handoff), sessionId: conversation.id });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Session timeline fetch failed');
      res.status(500).json({ error: 'Failed to fetch timeline' });
    }
  });

  router.get('/leads', adminOnly, (req: Request, res: Response) => {
    try {
      const { page, limit } = parsePagination(req.query as any, { limit: 50, maxLimit: 200 });
      const result = leadRepo.findByTenant(req.tenantId!, page, limit);
      res.json({ leads: result.leads, total: result.total, limit, offset: (page - 1) * limit });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Admin leads fetch failed');
      res.status(500).json({ error: 'Failed to fetch leads' });
    }
  });

  router.get('/followups', adminOnly, (req: Request, res: Response) => {
    try {
      const { page, limit } = parsePagination(req.query as any, { limit: 50, maxLimit: 200 });
      const result = leadRepo.findByTenant(req.tenantId!, page, limit);
      const followups = result.leads.filter(l => l.qualificationStatus !== 'disqualified');
      res.json({ followups, total: result.total, limit, offset: (page - 1) * limit });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Followups fetch failed');
      res.status(500).json({ error: 'Failed to fetch followups' });
    }
  });

  return router;
}
