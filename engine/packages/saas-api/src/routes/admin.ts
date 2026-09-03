import { Router, Request, Response } from 'express';
import {
  UserRepository, TenantRepository, ConversationRepository, Conversation,
  UsageRepository, KnowledgeBaseRepository, KbDocumentRepository,
  ApiKeyRepository, AnalyticsRepository, SubscriptionRepository,
  MessageRepository, LeadRepository, HandoffRequestRepository,
  SessionNote,
} from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { parsePagination, requireJsonObject, validationError, validateRequiredString, validateRequiredEnum } from '../middleware/validate';
import { createTtlCache } from '../utils/ttl-cache';
import { buildSessionSummary, aggregateAnalytics, computeConversationIntel, buildLeadSummary } from '../services/conversation-intel';

const logger = createLogger('saas-api:admin');

/** 15s TTL cache for the session list + analytics — the dashboard polls at 15s. */
const SESSIONS_CACHE_TTL_MS = 15_000;
const sessionsCache = createTtlCache<unknown>(SESSIONS_CACHE_TTL_MS);
const analyticsCache = createTtlCache<unknown>(SESSIONS_CACHE_TTL_MS);

/** Pages through every conversation for a tenant (listByTenant is page-based). */
function listAllTenantConversations(repo: ConversationRepository, tenantId: string): Conversation[] {
  const all: Conversation[] = [];
  const PAGE_SIZE = 200;
  for (let page = 1; ; page++) {
    const { conversations } = repo.listByTenant(tenantId, page, PAGE_SIZE);
    all.push(...conversations);
    if (conversations.length < PAGE_SIZE) break;
  }
  return all;
}

// Conversation status mixes the engine lifecycle (active/ended/escalated) with
// the CRM pipeline statuses the detail page lets agents set (new/working/
// qualified/won/lost). Accept both so the status PUT never 400s on a valid
// agent action.
const VALID_SESSION_STATUSES = ['active', 'ended', 'escalated', 'new', 'working', 'qualified', 'won', 'lost'] as const;

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
    // Verify the user is the actual owner of this tenant, not just any user with role='owner'
    if (!req.user?.sub || !req.tenantId) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const tenant = tenantRepo.findById(req.tenantId);
    if (!tenant || tenant.ownerId !== req.user.sub) {
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
      // Tenant-scoped 15s cache — the dashboard polls this endpoint every 15s.
      const cacheKey = `analytics:${req.tenantId}`;
      const cached = analyticsCache.get(cacheKey);
      if (cached !== undefined) {
        return res.json(cached);
      }

      const conversations = listAllTenantConversations(conversationRepo, req.tenantId!);
      const entries = conversations.map(conv => {
        const { messages } = messageRepo.listByConversation(conv.id, 1, 500);
        return {
          conversation: conv,
          messages,
          lead: leadRepo.findBySession(req.tenantId!, conv.sessionId),
        };
      });
      const payload = aggregateAnalytics(entries);
      analyticsCache.set(cacheKey, payload);
      res.json(payload);
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

  const VALID_MANUAL_PLANS = ['free', 'starter', 'pro', 'professional', 'advanced', 'enterprise'];

  router.post('/billing/activate', adminOnly, (req: Request, res: Response) => {
    try {
      const { plan, tenantId: targetTenantId } = req.body;
      if (!plan || !VALID_MANUAL_PLANS.includes(plan)) {
        return res.status(400).json({ error: `Invalid plan. Must be one of: ${VALID_MANUAL_PLANS.join(', ')}` });
      }
      const tid = targetTenantId || req.tenantId!;
      const now = new Date().toISOString();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const normalizedPlan = plan === 'professional' ? 'pro' : plan;
      subRepo.update(tid, {
        plan: normalizedPlan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
      tenantRepo.update(tid, { plan: normalizedPlan, subscriptionStatus: 'active', subscriptionPeriodEnd: periodEnd });
      createContextLogger(logger).info({ tenantId: tid, plan: normalizedPlan }, 'Manual plan activation');
      res.json({ ok: true, plan: normalizedPlan, status: 'active', periodEnd });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Manual activation failed');
      res.status(500).json({ error: 'Failed to activate plan' });
    }
  });

  router.get('/tenants', adminOnly, (_req: Request, res: Response) => {
    try {
      const page = Math.max(1, Number(_req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(_req.query.limit) || 50));
      const result = subRepo.list(page, limit);
      const tenants = result.subscriptions.map(s => {
        const tenant = tenantRepo.findById(s.tenantId);
        const owner = tenant ? userRepo.findById(tenant.ownerId) : null;
        return {
          tenantId: s.tenantId,
          tenantName: tenant?.name || 'Unknown',
          ownerEmail: owner?.email || 'Unknown',
          plan: s.plan,
          status: s.status,
          currentPeriodEnd: s.currentPeriodEnd,
        };
      });
      res.json({ tenants, total: result.total, page, limit });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Tenant list failed');
      res.status(500).json({ error: 'Failed to list tenants' });
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
      // Enrich each conversation with intelligence derived from its stored
      // transcript + captured lead so the dashboard's hasIntel gate passes and
      // persona/funnel/buying-intent fields render real values.
      const sessions = result.conversations.map(conv => {
        const { messages } = messageRepo.listByConversation(conv.id, 1, 500);
        const lead = leadRepo.findBySession(req.tenantId!, conv.sessionId);
        return buildSessionSummary(conv, messages, lead);
      });
      const payload = { sessions, total: result.total || 0, limit: limitNum, offset: (pageNum - 1) * limitNum };
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

      // Derive intelligence from the stored transcript + captured lead so the
      // detail page shows real funnel stage, buying intent, objections, and score.
      const lead = leadRepo.findBySession(req.tenantId!, conversation.sessionId);
      const intel = computeConversationIntel(conversation, messages, lead);
      // Score on a 0-10 scale: prefer the captured lead score when present,
      // otherwise a composite of buying intent + conversation depth.
      const score = lead
        ? Math.round(lead.leadScore / 10)
        : Math.min(10, (intel.buyingIntentDetected ? 3 : 0) + Math.min(intel.turnCount * 2, 7));
      const qualificationProgress = lead ? 'completed' : intel.turnCount >= 3 ? 'in_progress' : 'not_started';
      const personaReason = lead
        ? `Captured lead (score ${lead.leadScore}, ${lead.buyingIntent} buying intent)`
        : intel.buyingIntentReason || (intel.turnCount > 0 ? 'Multi-turn conversation with stored transcript' : 'No substantive conversation yet');

      res.json({
        sessionId: conversation.id,
        tenantId: conversation.tenantId,
        createdAt: conversation.startedAt,
        updatedAt: conversation.startedAt,
        stateMachine: conversation.sessionState,
        sequenceCounter: conversation.messageCount,
        turnCount: intel.turnCount,
        persona: intel.persona,
        funnelStage: intel.funnelStage,
        buyingIntentDetected: intel.buyingIntentDetected,
        buyingIntentReason: intel.buyingIntentReason,
        hasIntel: intel.hasIntel,
        status: conversation.status,
        owner: conversation.assignedAgentId || null,
        flagged: !!conversation.flagged,
        archived: !!conversation.archived,
        tags: conversation.tags || [],
        turns,
        objections: intel.objections,
        qualificationState: {},
        repeatedPhraseCount: 0,
        topics: [],
        state: JSON.stringify(conversation),
        conversationIntelligence: {
          score,
          personaReason,
          qualificationProgress,
          topObjections: intel.objections,
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

  // Enrich each lead with intelligence derived from its conversation transcript
  // so the Lead Inbox renders persona/funnel/intent/turns instead of blanks, and
  // sessionId points at the conversation id (the detail page + status/owner
  // actions resolve by conversation id).
  const enrichLead = (tenantId: string) => (lead: import('@conversation-engine/saas-core').Lead) => {
    const conversation = lead.conversationId
      ? conversationRepo.findById(lead.conversationId)
      : null;
    const conv = conversation || conversationRepo.findBySession(tenantId, lead.sessionId);
    const messages = conv ? (messageRepo.listByConversation(conv.id, 1, 500).messages || []) : [];
    return buildLeadSummary(conv, messages, lead);
  };

  router.get('/leads', adminOnly, (req: Request, res: Response) => {
    try {
      const { page, limit } = parsePagination(req.query as any, { limit: 50, maxLimit: 200 });
      const result = leadRepo.findByTenant(req.tenantId!, page, limit);
      res.json({ leads: result.leads.map(enrichLead(req.tenantId!)), total: result.total, limit, offset: (page - 1) * limit });
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
      res.json({ followups: followups.map(enrichLead(req.tenantId!)), total: result.total, limit, offset: (page - 1) * limit });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Followups fetch failed');
      res.status(500).json({ error: 'Failed to fetch followups' });
    }
  });

  return router;
}
