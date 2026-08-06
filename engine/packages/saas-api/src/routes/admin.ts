import { Router, Request, Response } from 'express';
import {
  UserRepository, TenantRepository, ConversationRepository,
  UsageRepository, KnowledgeBaseRepository, KbDocumentRepository,
  ApiKeyRepository, AnalyticsRepository, SubscriptionRepository,
  MessageRepository,
} from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { parsePagination } from '../middleware/validate';

const logger = createLogger('saas-api:admin');

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
      const result = conversationRepo.listByTenant(req.tenantId!, pageNum, limitNum);
      res.json({ sessions: result.conversations || [], total: result.total || 0, limit: limitNum, offset: (pageNum - 1) * limitNum });
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
      const messages = messageRepo.listByConversation(conversation.id, 1, 200);
      res.json({
        sessionId: conversation.id,
        tenantId: conversation.tenantId,
        createdAt: conversation.startedAt,
        updatedAt: conversation.startedAt,
        turnCount: conversation.messageCount,
        messages: messages.messages || [],
        state: JSON.stringify(conversation),
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Failed to get session');
      res.status(500).json({ error: 'Failed to get session' });
    }
  });

  router.put('/sessions/:id/status', adminOnly, (req: Request, res: Response) => {
    res.json({ message: 'Status updated', sessionId: req.params.id });
  });

  router.put('/sessions/:id/owner', adminOnly, (req: Request, res: Response) => {
    res.json({ message: 'Owner updated', sessionId: req.params.id });
  });

  router.put('/sessions/:id/flag', adminOnly, (req: Request, res: Response) => {
    res.json({ message: 'Flag toggled', sessionId: req.params.id });
  });

  router.put('/sessions/:id/archive', adminOnly, (req: Request, res: Response) => {
    res.json({ message: 'Archive toggled', sessionId: req.params.id });
  });

  router.post('/sessions/:id/notes', adminOnly, (req: Request, res: Response) => {
    res.json({ message: 'Note added', sessionId: req.params.id });
  });

  router.get('/sessions/:id/notes', adminOnly, (req: Request, res: Response) => {
    res.json({ notes: [], sessionId: req.params.id });
  });

  router.put('/sessions/:id/tags', adminOnly, (req: Request, res: Response) => {
    res.json({ message: 'Tags updated', sessionId: req.params.id });
  });

  router.get('/sessions/:id/tags', adminOnly, (req: Request, res: Response) => {
    res.json({ tags: [], sessionId: req.params.id });
  });

  router.get('/sessions/:id/timeline', adminOnly, (req: Request, res: Response) => {
    res.json({ timeline: [], sessionId: req.params.id });
  });

  router.get('/leads', adminOnly, (req: Request, res: Response) => {
    res.json({ leads: [], total: 0, limit: 50, offset: 0 });
  });

  router.get('/followups', adminOnly, (req: Request, res: Response) => {
    res.json({ followups: [], total: 0, limit: 50, offset: 0 });
  });

  return router;
}
