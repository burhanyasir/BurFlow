import { Router, Request, Response } from 'express';
import {
  UnansweredQuestionRepository, UnansweredQuestionClusterRepository,
  KnowledgeSuggestionRepository, CitationAnalyticsRepository,
  ConversationInsightsRepository, TenantRepository, UsageRepository,
  SubscriptionRepository, ConversationRepository,
} from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';

const logger = createLogger('saas-api:activation');

export function createActivationRoutes(
  unansweredRepo: UnansweredQuestionRepository,
  clusterRepo: UnansweredQuestionClusterRepository,
  suggestionRepo: KnowledgeSuggestionRepository,
  citationRepo: CitationAnalyticsRepository,
  insightsRepo: ConversationInsightsRepository,
  tenantRepo: TenantRepository,
  usageRepo: UsageRepository,
  subRepo: SubscriptionRepository,
  conversationRepo: ConversationRepository,
): Router {
  const router = Router();

  const adminOnly = (req: Request, res: Response, next: Function) => {
    if (!req.user?.role || !['admin', 'owner'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };

  // ── Unanswered Questions ──

  router.post('/unanswered/record', adminOnly, (req: Request, res: Response) => {
    try {
      const { conversationId, question, confidence } = req.body;
      const tenantId = req.tenantId!;
      const uq = unansweredRepo.create({ tenantId, conversationId, question, confidence: confidence || 0 });
      res.status(201).json(uq);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Record unanswered failed');
      res.status(500).json({ error: 'Failed to record unanswered question' });
    }
  });

  router.get('/unanswered', adminOnly, (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const period = req.query.period as 'today' | 'week' | 'month' | undefined;
      const resolved = req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined;
      const questions = unansweredRepo.listByTenant(tenantId, { period, resolved });
      res.json(questions);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'List unanswered failed');
      res.status(500).json({ error: 'Failed to list unanswered questions' });
    }
  });

  router.get('/unanswered/stats', adminOnly, (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const period = req.query.period as 'today' | 'week' | 'month' | undefined;
      const stats = unansweredRepo.getStats(tenantId, period);
      res.json(stats);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Unanswered stats failed');
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  router.get('/unanswered/clusters', adminOnly, (req: Request, res: Response) => {
    try {
      const clusters = clusterRepo.listByTenant(req.tenantId!);
      res.json(clusters);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'List clusters failed');
      res.status(500).json({ error: 'Failed to list clusters' });
    }
  });

  router.put('/unanswered/:id/resolve', adminOnly, (req: Request, res: Response) => {
    try {
      unansweredRepo.resolve(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Resolve unanswered failed');
      res.status(500).json({ error: 'Failed to resolve question' });
    }
  });

  // ── Knowledge Suggestions ──

  router.get('/knowledge/suggestions', adminOnly, (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const suggestions = suggestionRepo.listByTenant(req.tenantId!, status);
      res.json(suggestions);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'List suggestions failed');
      res.status(500).json({ error: 'Failed to list suggestions' });
    }
  });

  router.post('/knowledge/suggestions/generate', adminOnly, (req: Request, res: Response) => {
    try {
      const suggestions = suggestionRepo.generateFromClusters(req.tenantId!);
      res.json(suggestions);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Generate suggestions failed');
      res.status(500).json({ error: 'Failed to generate suggestions' });
    }
  });

  router.put('/knowledge/suggestions/:id/dismiss', adminOnly, (req: Request, res: Response) => {
    try {
      suggestionRepo.dismiss(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Dismiss suggestion failed');
      res.status(500).json({ error: 'Failed to dismiss suggestion' });
    }
  });

  router.put('/knowledge/suggestions/:id/apply', adminOnly, (req: Request, res: Response) => {
    try {
      suggestionRepo.apply(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Apply suggestion failed');
      res.status(500).json({ error: 'Failed to apply suggestion' });
    }
  });

  // ── Citation Analytics ──

  router.get('/citations/overview', adminOnly, (req: Request, res: Response) => {
    try {
      const overview = citationRepo.getOverview(req.tenantId!);
      res.json(overview);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Citation overview failed');
      res.status(500).json({ error: 'Failed to fetch citation overview' });
    }
  });

  router.get('/citations/confidence-distribution', adminOnly, (req: Request, res: Response) => {
    try {
      const dist = citationRepo.getConfidenceDistribution(req.tenantId!);
      res.json(dist);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Confidence dist failed');
      res.status(500).json({ error: 'Failed to fetch confidence distribution' });
    }
  });

  // ── Conversation Insights ──

  router.get('/insights/overview', adminOnly, (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string || '30', 10);
      const overview = insightsRepo.getOverview(req.tenantId!, days);
      res.json(overview);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Insights overview failed');
      res.status(500).json({ error: 'Failed to fetch insights' });
    }
  });

  router.get('/insights/trend', adminOnly, (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string || '30', 10);
      const trend = insightsRepo.getTrend(req.tenantId!, days);
      res.json(trend);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Insights trend failed');
      res.status(500).json({ error: 'Failed to fetch insights trend' });
    }
  });

  // ── Usage Dashboard (customer-facing) ──

  router.get('/usage/current', adminOnly, (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const tenant = tenantRepo.findById(tenantId);
      const sub = subRepo.findByTenant(tenantId);
      const today = new Date().toISOString().slice(0, 7);
      const usage = usageRepo.getOrCreate(tenantId, today);
      const convs = conversationRepo.listByTenant(tenantId, 1, 1);

      const planLimits: Record<string, { messages: number; tokens: number; storage: number; apiCalls: number; seats: number }> = {
        free: { messages: 100, tokens: 100000, storage: 100, apiCalls: 1000, seats: 1 },
        starter: { messages: 1000, tokens: 500000, storage: 500, apiCalls: 5000, seats: 5 },
        professional: { messages: 10000, tokens: 2000000, storage: 2000, apiCalls: 50000, seats: 20 },
        enterprise: { messages: 100000, tokens: 10000000, storage: 10000, apiCalls: 500000, seats: 999 },
      };

      const limits = planLimits[tenant?.plan || 'free'] || planLimits.free;
      const pct = (used: number, limit: number) => limit > 0 ? Math.round((used / limit) * 100) : 0;

      const humanEscalations = conversationRepo.countTakeovers(tenantId);
      const activeUsers = Math.max(1, conversationRepo.countActiveUsers(tenantId) + 1);

      const alerts: any[] = [];
      const msgPct = pct(usage.messagesUsed, limits.messages);
      if (msgPct >= 100) alerts.push({ type: 'exceeded', metric: 'messages', used: usage.messagesUsed, limit: limits.messages, percentage: msgPct });
      else if (msgPct >= 90) alerts.push({ type: 'critical', metric: 'messages', used: usage.messagesUsed, limit: limits.messages, percentage: msgPct });
      else if (msgPct >= 80) alerts.push({ type: 'warning', metric: 'messages', used: usage.messagesUsed, limit: limits.messages, percentage: msgPct });

      res.json({
        conversations: convs.total,
        messages: usage.messagesUsed,
        activeUsers,
        aiResponses: usage.messagesUsed,
        humanEscalations,
        monthlyUsage: usage.messagesUsed,
        planLimit: limits.messages,
        planUsagePct: msgPct,
        remainingQuota: Math.max(0, limits.messages - usage.messagesUsed),
        alerts,
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Usage current failed');
      res.status(500).json({ error: 'Failed to fetch usage' });
    }
  });

  router.get('/usage/history', adminOnly, (req: Request, res: Response) => {
    try {
      const result = usageRepo.listByTenant(req.tenantId!);
      res.json(result.records);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Usage history failed');
      res.status(500).json({ error: 'Failed to fetch usage history' });
    }
  });

  return router;
}
