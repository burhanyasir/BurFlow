import { Router, Request, Response } from 'express';
import { SessionStore, SessionRecord } from '@conversation-engine/session-store';
import { createLogger } from '@conversation-engine/logger';
import { AdminStore } from './admin-store';
import { buttonTelemetry } from '@conversation-engine/conversation-orchestrator';

const logger = createLogger('admin-api');

const INTEL_STATE_KEY = 'conversationIntel';

interface TurnBrief {
  message: string;
  response: string;
  polarity: number;
  frustration: number;
  urgency: number;
  timestamp: number;
}

interface IntelligenceMemory {
  turns: TurnBrief[];
  persona: string;
  funnelStage: string;
  buyingIntentDetected: boolean;
  buyingIntentPhrase?: string;
  buyingIntentTier?: string;
  objections: string[];
  qualificationState: Record<string, unknown>;
  repeatedPhraseCount: number;
  topics: string[];
  currentStage?: string;
  customerTemperature?: string;
  trustLevel?: 'low' | 'medium' | 'high';
  goalsAchieved?: string[];
  leadScore?: number;
  conversationScore?: number;
}

interface SessionSummary {
  sessionId: string;
  tenantId: string;
  updatedAt: string;
  createdAt: string;
  stateMachine: string;
  sequenceCounter: number;
  turnCount: number;
  persona: string;
  funnelStage: string;
  buyingIntentDetected: boolean;
  currentStage: string;
  customerTemperature: string;
  trustLevel: 'low' | 'medium' | 'high';
  hasIntel: boolean;
}

interface SessionDetail extends SessionSummary {
  turns: TurnBrief[];
  objections: string[];
  qualificationState: Record<string, unknown>;
  repeatedPhraseCount: number;
  topics: string[];
  buyingIntentPhrase?: string;
  buyingIntentTier?: string;
  state: string;
  goalsAchieved?: string[];
  leadScore?: number;
  conversationScore?: number;
}

function parseIntel(state: string): IntelligenceMemory | null {
  try {
    const data = JSON.parse(state);
    const intel = data[INTEL_STATE_KEY];
    if (intel && typeof intel === 'object') return intel as IntelligenceMemory;
  } catch {}
  return null;
}

export function buildAdminAnalyticsReport(sessions: SessionRecord[]) {
  const withIntel = sessions.map(s => ({ s, intel: parseIntel(s.state) })).filter(x => x.intel);
  const total = withIntel.length;
  const stageCounts: Record<string, number> = {};
  const temperatureCounts: Record<string, number> = {};
  const trustCounts: Record<string, number> = {};
  const objections: string[] = [];
  let turnSum = 0;
  let buyingIntentCount = 0;
  let qualifiedCount = 0;
  let demoBookings = 0;
  let trialStarts = 0;
  let purchases = 0;
  let leadScoreTotal = 0;
  let conversationScoreTotal = 0;
  let knowledgeConfidenceTotal = 0;
  let knowledgeConfidenceCount = 0;

  for (const { s, intel } of withIntel) {
    const stage = intel.currentStage || intel.funnelStage || 'greeting';
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    const temp = intel.customerTemperature || 'cold';
    temperatureCounts[temp] = (temperatureCounts[temp] || 0) + 1;
    const trust = intel.trustLevel || 'medium';
    trustCounts[trust] = (trustCounts[trust] || 0) + 1;
    objections.push(...intel.objections);
    turnSum += intel.turns.length;
    if (intel.buyingIntentDetected) buyingIntentCount += 1;
    if (intel.qualificationState?.completed === true) qualifiedCount += 1;
    const goals = intel.goalsAchieved || [];
    if (goals.includes('schedule_demo')) demoBookings += 1;
    if (goals.includes('close_trial')) trialStarts += 1;
    if (goals.includes('finish_conversation')) purchases += 1;
    if (typeof intel.leadScore === 'number') leadScoreTotal += intel.leadScore;
    if (typeof intel.conversationScore === 'number') conversationScoreTotal += intel.conversationScore;
    if (typeof (intel as any).knowledgeEvidenceConfidence === 'number') {
      knowledgeConfidenceTotal += (intel as any).knowledgeEvidenceConfidence;
      knowledgeConfidenceCount += 1;
    }
  }

  const topObjections = Object.entries(objections.reduce<Record<string, number>>((acc, obj) => {
    acc[obj] = (acc[obj] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 }));

  const topButtons = Object.entries(buttonTelemetry.snapshot().byButton)
    .map(([buttonId, metrics]) => ({ buttonId, ...metrics }))
    .sort((a, b) => b.ctr - a.ctr)
    .slice(0, 10);

  const stageDistribution = Object.entries(stageCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([stage, count]) => ({ stage, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 }));

  const temperatureDistribution = Object.entries(temperatureCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([temperature, count]) => ({ temperature, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 }));

  const trustDistribution = Object.entries(trustCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([trust, count]) => ({ trust, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 }));

  return {
    totalSessions: total,
    avgConversationScore: total > 0 ? Math.round(conversationScoreTotal / total) : 0,
    avgLeadScore: total > 0 ? Math.round(leadScoreTotal / total) : 0,
    avgSentiment: 0,
    avgBuyingIntentRate: total > 0 ? Math.round((buyingIntentCount / total) * 100) : 0,
    topObjections,
    topCtaClicks: topButtons,
    mostCommonFunnelEntry: stageDistribution.length > 0 ? stageDistribution[0].stage : '',
    mostCommonFunnelExit: stageDistribution.length > 0 ? stageDistribution[stageDistribution.length - 1].stage : '',
    qualificationCompletionRate: total > 0 ? Math.round((qualifiedCount / total) * 100) : 0,
    avgTurns: total > 0 ? Math.round(turnSum / total) : 0,
    escalationRate: 0,
    handoffRate: 0,
    stageDistribution,
    temperatureDistribution,
    trustDistribution,
    demoBookings,
    trialStarts,
    purchases,
    conversionRate: total > 0 ? Math.round((purchases / total) * 100) : 0,
    avgKnowledgeConfidence: knowledgeConfidenceCount > 0 ? Math.round((knowledgeConfidenceTotal / knowledgeConfidenceCount) * 100) / 100 : 0,
  };
}

function getTenantId(req: Request): string {
  const id = req.headers['x-tenant-id'] as string | undefined;
  if (!id) throw new Error('x-tenant-id header is required');
  return id;
}

function getActor(req: Request): string | null {
  return (req.headers['x-actor'] as string) || null;
}

function getSessionId(req: Request): string {
  const id = req.params.sessionId;
  return Array.isArray(id) ? id[0] : id;
}

export function createAdminRouter(sessionStore: SessionStore, adminStore: AdminStore): Router {
  const router = Router();

  // Require x-tenant-id on all admin routes — no fallback to demo-tenant
  router.use((req: Request, res: Response, next) => {
    if (!req.headers['x-tenant-id']) {
      return res.status(401).json({ error: 'x-tenant-id header is required' });
    }
    next();
  });

  // ─── Helper: build enriched SessionSummary from session record ──────
  function toSummary(s: SessionRecord): SessionSummary {
    const intel = parseIntel(s.state);
    return {
      sessionId: s.sessionId,
      tenantId: s.tenantId,
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
      stateMachine: s.stateMachine,
      sequenceCounter: s.sequenceCounter,
      turnCount: intel?.turns?.length ?? 0,
      persona: intel?.persona ?? 'unknown',
      funnelStage: intel?.funnelStage ?? 'greeting',
      currentStage: intel?.currentStage || intel?.funnelStage || 'greeting',
      customerTemperature: intel?.customerTemperature || 'cold',
      trustLevel: intel?.trustLevel || 'medium',
      buyingIntentDetected: intel?.buyingIntentDetected ?? false,
      hasIntel: intel !== null,
    };
  }

  function toDetail(s: SessionRecord): SessionDetail {
    const intel = parseIntel(s.state);
    return {
      ...toSummary(s),
      turns: intel?.turns ?? [],
      objections: intel?.objections ?? [],
      qualificationState: intel?.qualificationState ?? {},
      repeatedPhraseCount: intel?.repeatedPhraseCount ?? 0,
      topics: intel?.topics ?? [],
      buyingIntentPhrase: intel?.buyingIntentPhrase,
      buyingIntentTier: intel?.buyingIntentTier,
      state: s.state,
      goalsAchieved: intel?.goalsAchieved,
      leadScore: intel?.leadScore,
      conversationScore: intel?.conversationScore,
    };
  }

  function buyingIntentReason(intel: IntelligenceMemory | null): string | null {
    if (!intel?.buyingIntentDetected) return null;
    return intel.buyingIntentPhrase || intel.buyingIntentTier || 'High buying intent detected';
  }

  // ─── GET /admin/sessions ──────────────────────────────────
  router.get('/admin/sessions', async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10), 1), 200);
      const offset = Math.max(parseInt(String(req.query.offset || '0'), 10), 0);

      const { sessions, total } = await sessionStore.listSessions(tenantId, limit, offset);
      const summaries = sessions.map(s => {
        const summary = toSummary(s);
        const meta = adminStore.getOrCreateMeta(tenantId, s.sessionId);
        const tags = adminStore.getTags(tenantId, s.sessionId);
        const intel = parseIntel(s.state);
        return {
          ...summary,
          status: meta.status,
          owner: meta.owner,
          flagged: meta.flagged,
          archived: meta.archived,
          tags,
          buyingIntentReason: buyingIntentReason(intel),
        };
      });

      res.json({ sessions: summaries, total, limit, offset });
    } catch (err: any) {
      logger.error({ err }, 'Failed to list sessions');
      res.status(500).json({ error: 'Failed to list sessions' });
    }
  });

  // ─── GET /admin/sessions/:sessionId ───────────────────────
  router.get('/admin/sessions/:sessionId', async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const sessionId = getSessionId(req);

      const session = await sessionStore.loadSession(tenantId, sessionId);
      if (!session) return res.status(404).json({ error: 'Session not found' });

      const detail = toDetail(session);
      const meta = adminStore.getOrCreateMeta(tenantId, sessionId);
      const tags = adminStore.getTags(tenantId, sessionId);
      const notes = adminStore.getNotes(tenantId, sessionId);
      const timeline = adminStore.getTimeline(tenantId, sessionId);
      const intel = parseIntel(session.state);

      res.json({
        ...detail,
        status: meta.status,
        owner: meta.owner,
        flagged: meta.flagged,
        archived: meta.archived,
        tags,
        notes,
        timeline,
        buyingIntentReason: buyingIntentReason(intel),
      });
    } catch (err: any) {
      logger.error({ err }, 'Failed to load session');
      res.status(500).json({ error: 'Failed to load session' });
    }
  });

  // ─── GET /admin/analytics ─────────────────────────────────
  router.get('/admin/analytics', async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { sessions } = await sessionStore.listSessions(tenantId, 500, 0);
      const report = buildAdminAnalyticsReport(sessions);
      res.json(report);
    } catch (err: any) {
      logger.error({ err }, 'Failed to compute analytics');
      res.status(500).json({ error: 'Failed to compute analytics' });
    }
  });

  // ═══════════════════════════════════════════════════════════
  //  OPERATIONAL ENDPOINTS (conversation management)
  // ═══════════════════════════════════════════════════════════

  // ─── PUT /admin/sessions/:sessionId/status ────────────────
  router.put('/admin/sessions/:sessionId/status', async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const sessionId = getSessionId(req);
      const { status } = req.body;
      const valid = ['new', 'working', 'qualified', 'won', 'lost', 'archived'];
      if (!valid.includes(status)) return res.status(400).json({ error: `Invalid status. Must be one of: ${valid.join(', ')}` });

      const session = await sessionStore.loadSession(tenantId, sessionId);
      if (!session) return res.status(404).json({ error: 'Session not found' });

      const meta = adminStore.updateStatus(tenantId, sessionId, status, getActor(req));
      res.json(meta);
    } catch (err: any) {
      logger.error({ err }, 'Failed to update status');
      res.status(500).json({ error: 'Failed to update status' });
    }
  });

  // ─── PUT /admin/sessions/:sessionId/owner ─────────────────
  router.put('/admin/sessions/:sessionId/owner', async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const sessionId = getSessionId(req);
      const { owner } = req.body;
      if (!owner || typeof owner !== 'string') return res.status(400).json({ error: 'owner is required' });

      const session = await sessionStore.loadSession(tenantId, sessionId);
      if (!session) return res.status(404).json({ error: 'Session not found' });

      const meta = adminStore.assignOwner(tenantId, sessionId, owner, getActor(req));
      res.json(meta);
    } catch (err: any) {
      logger.error({ err }, 'Failed to assign owner');
      res.status(500).json({ error: 'Failed to assign owner' });
    }
  });

  // ─── PUT /admin/sessions/:sessionId/flag ──────────────────
  router.put('/admin/sessions/:sessionId/flag', async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const sessionId = getSessionId(req);
      const { flagged } = req.body;
      if (typeof flagged !== 'boolean') return res.status(400).json({ error: 'flagged must be a boolean' });

      const session = await sessionStore.loadSession(tenantId, sessionId);
      if (!session) return res.status(404).json({ error: 'Session not found' });

      const meta = adminStore.setFlagged(tenantId, sessionId, flagged, getActor(req));
      res.json(meta);
    } catch (err: any) {
      logger.error({ err }, 'Failed to update flag');
      res.status(500).json({ error: 'Failed to update flag' });
    }
  });

  // ─── PUT /admin/sessions/:sessionId/archive ───────────────
  router.put('/admin/sessions/:sessionId/archive', async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const sessionId = getSessionId(req);
      const { archived } = req.body;
      if (typeof archived !== 'boolean') return res.status(400).json({ error: 'archived must be a boolean' });

      const session = await sessionStore.loadSession(tenantId, sessionId);
      if (!session) return res.status(404).json({ error: 'Session not found' });

      const meta = adminStore.setArchived(tenantId, sessionId, archived, getActor(req));
      res.json(meta);
    } catch (err: any) {
      logger.error({ err }, 'Failed to update archive');
      res.status(500).json({ error: 'Failed to update archive' });
    }
  });

  // ─── GET/POST /admin/sessions/:sessionId/notes ────────────
  router.get('/admin/sessions/:sessionId/notes', async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const sessionId = getSessionId(req);
      const notes = adminStore.getNotes(tenantId, sessionId);
      res.json(notes);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load notes' });
    }
  });

  router.post('/admin/sessions/:sessionId/notes', async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const sessionId = getSessionId(req);
      const { author, message } = req.body;
      if (!author || !message) return res.status(400).json({ error: 'author and message are required' });

      const session = await sessionStore.loadSession(tenantId, sessionId);
      if (!session) return res.status(404).json({ error: 'Session not found' });

      const note = adminStore.createNote(tenantId, sessionId, author, message);
      res.status(201).json(note);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create note' });
    }
  });

  // ─── GET/PUT /admin/sessions/:sessionId/tags ──────────────
  router.get('/admin/sessions/:sessionId/tags', async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const sessionId = getSessionId(req);
      const tags = adminStore.getTags(tenantId, sessionId);
      res.json({ tags });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load tags' });
    }
  });

  router.put('/admin/sessions/:sessionId/tags', async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const sessionId = getSessionId(req);
      const { tags } = req.body;
      if (!Array.isArray(tags)) return res.status(400).json({ error: 'tags must be an array of strings' });

      const session = await sessionStore.loadSession(tenantId, sessionId);
      if (!session) return res.status(404).json({ error: 'Session not found' });

      const updated = adminStore.setTags(tenantId, sessionId, tags, getActor(req));
      res.json({ tags: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update tags' });
    }
  });

  // ─── GET /admin/sessions/:sessionId/timeline ──────────────
  router.get('/admin/sessions/:sessionId/timeline', async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const sessionId = getSessionId(req);
      const timeline = adminStore.getTimeline(tenantId, sessionId);
      res.json(timeline);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load timeline' });
    }
  });

  // ─── GET /admin/leads ─────────────────────────────────────
  router.get('/admin/leads', async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10), 1), 200);
      const offset = Math.max(parseInt(String(req.query.offset || '0'), 10), 0);

      const leadRefs = adminStore.getLeads(tenantId, limit, offset);
      const total = adminStore.getLeadsTotal(tenantId);

      // Enrich with session data
      const enriched = [];
      for (const ref of leadRefs) {
        const session = await sessionStore.loadSession(tenantId, ref.sessionId);
        if (!session) continue;
        const intel = parseIntel(session.state);
        const tags = adminStore.getTags(tenantId, ref.sessionId);
        enriched.push({
          ...toSummary(session),
          status: ref.status,
          owner: ref.owner,
          flagged: ref.flagged,
          archived: ref.archived,
          tags,
          buyingIntentReason: buyingIntentReason(intel),
          leadScore: 0,
          conversationScore: 0,
        });
      }

      res.json({ leads: enriched, total, limit, offset });
    } catch (err: any) {
      logger.error({ err }, 'Failed to list leads');
      res.status(500).json({ error: 'Failed to list leads' });
    }
  });

  // ─── GET /admin/followups ─────────────────────────────────
  router.get('/admin/followups', async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10), 1), 200);
      const offset = Math.max(parseInt(String(req.query.offset || '0'), 10), 0);

      const followUpRefs = adminStore.getFollowUps(tenantId, limit, offset);
      const total = adminStore.getFollowUpsTotal(tenantId);

      const enriched = [];
      for (const ref of followUpRefs) {
        const session = await sessionStore.loadSession(tenantId, ref.sessionId);
        if (!session) continue;
        const intel = parseIntel(session.state);
        let reason = 'needs_followup';
        if (intel?.buyingIntentDetected) reason = 'high_buying_intent';
        if (intel?.funnelStage === 'purchase_intent') reason = 'purchase_intent';
        if (session.stateMachine === 'expired' && intel && intel.turns.length > 0) reason = 'abandoned';

        const tags = adminStore.getTags(tenantId, ref.sessionId);
        enriched.push({
          ...toSummary(session),
          status: ref.status,
          owner: ref.owner,
          tags,
          followUpReason: reason,
          buyingIntentReason: buyingIntentReason(intel),
        });
      }

      res.json({ followups: enriched, total, limit, offset });
    } catch (err: any) {
      logger.error({ err }, 'Failed to list follow-ups');
      res.status(500).json({ error: 'Failed to list follow-ups' });
    }
  });

  // ─── GET /admin/agents ─────────────────────────────────
  router.get('/admin/agents', async (_req: Request, res: Response) => {
    // Return a list of known agent/owner names extracted from conversation_metadata
    try {
      const tenantId = getTenantId(_req);
      // We'll return a default set since we don't have a dedicated agents table
      res.json({ agents: [
        { id: 'alice', name: 'Alice Johnson', email: 'alice@example.com' },
        { id: 'bob', name: 'Bob Smith', email: 'bob@example.com' },
        { id: 'carol', name: 'Carol Davis', email: 'carol@example.com' },
      ]});
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to list agents' });
    }
  });

  return router;
}
