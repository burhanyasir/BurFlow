import { Router, Request, Response } from 'express';
import {
  UnansweredQuestionRepository, UnansweredQuestionClusterRepository,
  KnowledgeSuggestionRepository, CitationAnalyticsRepository,
  ConversationInsightsRepository, TenantRepository, UsageRepository,
  SubscriptionRepository, ConversationRepository, MessageRepository,
} from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { computeInsightOverview, computeInsightTrends } from '../services/conversation-intel';

const logger = createLogger('saas-api:activation');

/** Pages through every conversation for a tenant (listByTenant is page-based). */
function listAllTenantConversations(repo: ConversationRepository, tenantId: string): any[] {
  const all: any[] = [];
  const PAGE_SIZE = 200;
  for (let page = 1; ; page++) {
    const { conversations } = repo.listByTenant(tenantId, page, PAGE_SIZE);
    all.push(...conversations);
    if (conversations.length < PAGE_SIZE) break;
  }
  return all;
}

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
  messageRepo: MessageRepository,
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
      const raw = citationRepo.getConfidenceDistribution(req.tenantId!);
      const total = raw.reduce((sum, r) => sum + r.count, 0);
      const distribution = raw.map(r => ({ ...r, percentage: total > 0 ? Math.round((r.count / total) * 100) : 0 }));
      res.json({ distribution });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Confidence dist failed');
      res.status(500).json({ error: 'Failed to fetch confidence distribution' });
    }
  });

  router.get('/citations/top-documents', adminOnly, (req: Request, res: Response) => {
    try {
      const overview = citationRepo.getOverview(req.tenantId!);
      res.json({ documents: overview.topDocuments });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Top documents failed');
      res.status(500).json({ error: 'Failed to fetch top cited documents' });
    }
  });

  // ── Conversation Insights ──

  router.get('/insights/overview', adminOnly, (req: Request, res: Response) => {
    try {
      const days = Math.min(Math.max(parseInt(req.query.days as string || '30', 10), 1), 365);
      const conversations = listAllTenantConversations(conversationRepo, req.tenantId!);
      const entries = conversations.map(conv => ({
        conversation: conv,
        messages: messageRepo.listByConversation(conv.id, 1, 500).messages,
        lead: null,
      }));
      // The insights table was never populated; compute real insights from the
      // stored conversations so the InsightsDashboard renders actual data in
      // the contract it expects ({ insights: InsightItem[] }).
      res.json({ insights: computeInsightOverview(entries, days) });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Insights overview failed');
      res.status(500).json({ error: 'Failed to fetch insights' });
    }
  });

  router.get('/insights/trend', adminOnly, (req: Request, res: Response) => {
    try {
      const days = Math.min(Math.max(parseInt(req.query.days as string || '30', 10), 1), 365);
      const conversations = listAllTenantConversations(conversationRepo, req.tenantId!);
      const entries = conversations.map(conv => ({
        conversation: conv,
        messages: messageRepo.listByConversation(conv.id, 1, 500).messages,
        lead: null,
      }));
      // Match the frontend TrendItem[] contract ({ metric, currentPeriod,
      // previousPeriod, change }); the previous daily-aggregate shape crashed
      // the InsightsDashboard's trends table.
      res.json(computeInsightTrends(entries, days));
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
        starter: { messages: 3000, tokens: 500000, storage: 500, apiCalls: 5000, seats: 5 },
        pro: { messages: 10000, tokens: 2000000, storage: 2000, apiCalls: 50000, seats: 20 },
        advanced: { messages: 25000, tokens: 10000000, storage: 10000, apiCalls: 500000, seats: 50 },
      };

      const normalizedPlan = tenant?.plan === 'professional' ? 'pro' : tenant?.plan === 'enterprise' ? 'advanced' : tenant?.plan || 'free';
      const limits = planLimits[normalizedPlan] || planLimits.free;
      const pct = (used: number, limit: number) => limit > 0 ? Math.round((used / limit) * 100) : 0;

      const humanEscalations = conversationRepo.countTakeovers(tenantId);
      const activeUsers = Math.max(1, conversationRepo.countActiveUsers(tenantId) + 1);

      const alerts: any[] = [];
      const msgPct = pct(usage.messagesUsed, limits.messages);
      if (msgPct >= 100) alerts.push({ type: 'exceeded', metric: 'messages', used: usage.messagesUsed, limit: limits.messages, percentage: msgPct });
      else if (msgPct >= 90) alerts.push({ type: 'critical', metric: 'messages', used: usage.messagesUsed, limit: limits.messages, percentage: msgPct });
      else if (msgPct >= 80) alerts.push({ type: 'warning', metric: 'messages', used: usage.messagesUsed, limit: limits.messages, percentage: msgPct });

      // Current-month window for the InsightsDashboard usage meter.
      const monthStart = new Date(today + '-01T00:00:00.000Z').toISOString();
      const nextMonth = new Date(monthStart);
      nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
      const monthEnd = nextMonth.toISOString();

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
        // InsightsDashboard Usage Meter contract.
        currentMonthConversations: usageRepo.getCurrentMonthConversations(tenantId),
        monthlyQuota: limits.messages,
        usagePercent: msgPct,
        periodStart: monthStart,
        periodEnd: monthEnd,
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Usage current failed');
      res.status(500).json({ error: 'Failed to fetch usage' });
    }
  });

  router.get('/usage/history', adminOnly, (req: Request, res: Response) => {
    try {
      const result = usageRepo.listByTenant(req.tenantId!);
      // Map raw usage records to the InsightsDashboard UsageHistoryItem
      // contract ({ month, conversations, quota, percent }). The previous raw
      // record shape crashed the history table (item.conversations undefined).
      const history = result.records.map(record => {
        const conversations = usageRepo.countByMonth(req.tenantId!, record.period);
        return {
          month: record.period,
          conversations,
          quota: record.messagesLimit,
          percent: record.messagesLimit > 0 ? Math.round((record.messagesUsed / record.messagesLimit) * 100) : 0,
        };
      });
      res.json(history);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Usage history failed');
      res.status(500).json({ error: 'Failed to fetch usage history' });
    }
  });

  return router;
}
