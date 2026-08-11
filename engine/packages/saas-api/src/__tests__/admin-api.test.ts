import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import {
  createDatabase, UserRepository, TenantRepository, RefreshTokenRepository,
  ConversationRepository, MessageRepository, UsageRepository,
  KnowledgeBaseRepository, KbDocumentRepository, ApiKeyRepository,
  AnalyticsRepository, SubscriptionRepository, LeadRepository,
  HandoffRequestRepository, LeadService,
  UnansweredQuestionRepository, UnansweredQuestionClusterRepository,
  KnowledgeSuggestionRepository, CitationAnalyticsRepository,
  ConversationInsightsRepository,
} from '@conversation-engine/saas-core';
import { authMiddleware } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { createAuthRoutes } from '../routes/auth';
import { createAdminRoutes } from '../routes/admin';
import { createActivationRoutes } from '../routes/admin-activation';
import { createChatRoutes } from '../routes/chat';

// ─── Test Setup ───────────────────────────────────────────

const TEST_DB = join(__dirname, '__test_admin_api__.db');
const JWT_SECRET = 'test-secret-key-for-admin-api';

let db: Database.Database;
let userRepo: UserRepository;
let tenantRepo: TenantRepository;
let refreshTokenRepo: RefreshTokenRepository;
let conversationRepo: ConversationRepository;
let messageRepo: MessageRepository;
let usageRepo: UsageRepository;
let kbRepo: KnowledgeBaseRepository;
let docRepo: KbDocumentRepository;
let apiKeyRepo: ApiKeyRepository;
let analyticsRepo: AnalyticsRepository;
let subRepo: SubscriptionRepository;
let leadRepo: LeadRepository;
let handoffReqRepo: HandoffRequestRepository;
let unansweredRepo: UnansweredQuestionRepository;
let app: express.Express;

function makeApp() {
  const a = express();
  a.use(express.json({ limit: '10mb' }));
  a.use('/api/auth', createAuthRoutes(userRepo, tenantRepo, refreshTokenRepo, JWT_SECRET));
  const auth = authMiddleware(JWT_SECRET);
  const tenantGuard = requireTenant(tenantRepo);
  a.use('/api/admin', auth, tenantGuard, createAdminRoutes(userRepo, tenantRepo, conversationRepo, usageRepo, kbRepo, docRepo, apiKeyRepo, analyticsRepo, subRepo, messageRepo, leadRepo, handoffReqRepo));
  a.use('/api/admin', auth, tenantGuard, createActivationRoutes(
    unansweredRepo,
    new UnansweredQuestionClusterRepository(db),
    new KnowledgeSuggestionRepository(db),
    new CitationAnalyticsRepository(db),
    new ConversationInsightsRepository(db),
    tenantRepo, usageRepo, subRepo, conversationRepo, messageRepo,
  ));
  const leadService = new LeadService(leadRepo);
  a.use('/api/chat', auth, tenantGuard, createChatRoutes(conversationRepo, messageRepo, usageRepo, undefined, { leadService }, undefined, unansweredRepo));
  return a;
}

async function request(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new Promise<{ status: number; body: any }>((resolve) => {
    const http = require('http');
    const server = app.listen(0, () => {
      const port = (server.address() as any).port;
      const r = http.request({ hostname: '127.0.0.1', port, path, method, headers }, (res: any) => {
        let data = '';
        res.on('data', (c: string) => data += c);
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        });
      });
      if (body) r.write(JSON.stringify(body));
      r.end();
    });
  });
}

let tenantAToken: string;
let tenantAId: string;
let tenantBToken: string;
let memberToken: string;

beforeAll(async () => {
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
  db = createDatabase(TEST_DB);
  userRepo = new UserRepository(db);
  tenantRepo = new TenantRepository(db);
  refreshTokenRepo = new RefreshTokenRepository(db);
  conversationRepo = new ConversationRepository(db);
  messageRepo = new MessageRepository(db);
  usageRepo = new UsageRepository(db);
  kbRepo = new KnowledgeBaseRepository(db);
  docRepo = new KbDocumentRepository(db);
  apiKeyRepo = new ApiKeyRepository(db);
  analyticsRepo = new AnalyticsRepository(db);
  subRepo = new SubscriptionRepository(db);
  leadRepo = new LeadRepository(db);
  handoffReqRepo = new HandoffRequestRepository(db);
  unansweredRepo = new UnansweredQuestionRepository(db);
  app = makeApp();

  const signupA = await request('POST', '/api/auth/signup', { email: 'admin-a@test.com', password: 'password123', name: 'Admin A', companyName: 'Admin Corp A' });
  tenantAToken = signupA.body.token;
  tenantAId = signupA.body.tenant.id;

  const signupB = await request('POST', '/api/auth/signup', { email: 'admin-b@test.com', password: 'password123', name: 'Admin B', companyName: 'Admin Corp B' });
  tenantBToken = signupB.body.token;

  memberToken = jwt.sign(
    { sub: 'member-user', email: 'member@test.com', name: 'Team Member', tenantId: tenantAId, role: 'member' },
    JWT_SECRET,
    { expiresIn: '1h' },
  );

  // Seed a conversation with messages for tenant A
  const conv = conversationRepo.create(tenantAId, 'admin-session-1');
  messageRepo.create({ conversationId: conv.id, tenantId: tenantAId, role: 'user', content: 'I need help with billing', sequenceNumber: 1 });
  messageRepo.create({ conversationId: conv.id, tenantId: tenantAId, role: 'assistant', content: 'I can help with that', sequenceNumber: 2 });
});

afterAll(() => {
  if (db) db.close();
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
});

// ─── Session Management ───────────────────────────────────

describe('Admin session management', () => {
  it('updates session status', async () => {
    const conv = conversationRepo.create(tenantAId, 'admin-status-session');
    const res = await request('PUT', `/api/admin/sessions/${conv.id}/status`, { status: 'ended' }, tenantAToken);
    expect(res.status).toBe(200);
    expect(conversationRepo.findById(conv.id)!.status).toBe('ended');
    expect(conversationRepo.findById(conv.id)!.endedAt).toBeTruthy();
  });

  it('accepts CRM pipeline statuses from the detail page', async () => {
    const conv = conversationRepo.create(tenantAId, 'admin-crmstatus-session');
    for (const status of ['new', 'working', 'qualified', 'won', 'lost']) {
      const res = await request('PUT', `/api/admin/sessions/${conv.id}/status`, { status }, tenantAToken);
      expect(res.status).toBe(200);
      expect(conversationRepo.findById(conv.id)!.status).toBe(status);
    }
  });

  it('rejects invalid session status', async () => {
    const conv = conversationRepo.create(tenantAId, 'admin-badstatus-session');
    const res = await request('PUT', `/api/admin/sessions/${conv.id}/status`, { status: 'paused' }, tenantAToken);
    expect(res.status).toBe(400);
  });

  it('assigns and clears session owner', async () => {
    const conv = conversationRepo.create(tenantAId, 'admin-owner-session');
    const res = await request('PUT', `/api/admin/sessions/${conv.id}/owner`, { ownerId: 'agent-1' }, tenantAToken);
    expect(res.status).toBe(200);
    expect(conversationRepo.findById(conv.id)!.assignedAgentId).toBe('agent-1');

    const clear = await request('PUT', `/api/admin/sessions/${conv.id}/owner`, { ownerId: null }, tenantAToken);
    expect(clear.status).toBe(200);
    expect(conversationRepo.findById(conv.id)!.assignedAgentId).toBeUndefined();
  });

  it('toggles flag and archive', async () => {
    const conv = conversationRepo.create(tenantAId, 'admin-flag-session');
    const flag = await request('PUT', `/api/admin/sessions/${conv.id}/flag`, { flagged: true }, tenantAToken);
    expect(flag.status).toBe(200);
    expect(conversationRepo.findById(conv.id)!.flagged).toBe(true);

    const archive = await request('PUT', `/api/admin/sessions/${conv.id}/archive`, { archived: true }, tenantAToken);
    expect(archive.status).toBe(200);
    expect(conversationRepo.findById(conv.id)!.archived).toBe(true);
  });

  it('adds and lists session notes with author', async () => {
    const conv = conversationRepo.create(tenantAId, 'admin-notes-session');
    const add = await request('POST', `/api/admin/sessions/${conv.id}/notes`, { content: 'Follow up on pricing' }, tenantAToken);
    expect(add.status).toBe(201);
    expect(add.body.note.authorName).toBe('Admin A');

    const list = await request('GET', `/api/admin/sessions/${conv.id}/notes`, undefined, tenantAToken);
    expect(list.status).toBe(200);
    expect(list.body.notes).toHaveLength(1);
    expect(list.body.notes[0].content).toBe('Follow up on pricing');
  });

  it('validates note content', async () => {
    const conv = conversationRepo.create(tenantAId, 'admin-notes-bad');
    const res = await request('POST', `/api/admin/sessions/${conv.id}/notes`, { content: '' }, tenantAToken);
    expect(res.status).toBe(400);
  });

  it('updates and lists session tags', async () => {
    const conv = conversationRepo.create(tenantAId, 'admin-tags-session');
    const update = await request('PUT', `/api/admin/sessions/${conv.id}/tags`, { tags: ['urgent', 'billing'] }, tenantAToken);
    expect(update.status).toBe(200);
    expect(conversationRepo.findById(conv.id)!.tags).toEqual(['urgent', 'billing']);

    const list = await request('GET', `/api/admin/sessions/${conv.id}/tags`, undefined, tenantAToken);
    expect(list.status).toBe(200);
    expect(list.body.tags).toEqual(['urgent', 'billing']);
  });

  it('rejects non-string tags', async () => {
    const conv = conversationRepo.create(tenantAId, 'admin-tags-bad');
    const res = await request('PUT', `/api/admin/sessions/${conv.id}/tags`, { tags: [123] }, tenantAToken);
    expect(res.status).toBe(400);
  });

  it('builds a timeline from messages, notes, and handoff', async () => {
    const conv = conversationRepo.create(tenantAId, 'admin-timeline-session');
    messageRepo.create({ conversationId: conv.id, tenantId: tenantAId, role: 'user', content: 'hello', sequenceNumber: 1 });
    await request('POST', `/api/admin/sessions/${conv.id}/notes`, { content: 'Priority account' }, tenantAToken);
    handoffReqRepo.create({ tenantId: tenantAId, sessionId: conv.sessionId });

    const res = await request('GET', `/api/admin/sessions/${conv.id}/timeline`, undefined, tenantAToken);
    expect(res.status).toBe(200);
    const types = res.body.timeline.map((e: any) => e.type);
    expect(types).toContain('message');
    expect(types).toContain('note');
    expect(types).toContain('handoff');
  });

  it('returns conversation detail with turns built from messages and derived intelligence', async () => {
    const conv = conversationRepo.create(tenantAId, 'admin-detail-session');
    messageRepo.create({ conversationId: conv.id, tenantId: tenantAId, role: 'user', content: 'Do you support SSO?', sequenceNumber: 1 });
    messageRepo.create({ conversationId: conv.id, tenantId: tenantAId, role: 'assistant', content: 'Yes, SAML 2.0 and OIDC are supported.', sequenceNumber: 2 });
    conversationRepo.incrementMessageCount(conv.id);
    conversationRepo.incrementMessageCount(conv.id);
    await request('PUT', `/api/admin/sessions/${conv.id}/tags`, { tags: ['pricing'] }, tenantAToken);

    const res = await request('GET', `/api/admin/sessions/${conv.id}`, undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe(conv.id);
    // Turn count is derived from the stored transcript (1 user+assistant pair).
    expect(res.body.turnCount).toBe(1);
    expect(Array.isArray(res.body.turns)).toBe(true);
    expect(res.body.turns).toHaveLength(2);
    expect(res.body.turns[0]).toMatchObject({ role: 'user', content: 'Do you support SSO?', timestamp: expect.any(Number) });
    expect(res.body.turns[1]).toMatchObject({ role: 'assistant', content: 'Yes, SAML 2.0 and OIDC are supported.' });
    // Intelligence is derived at read time from the transcript — the SSO
    // conversation has no buying-intent signal but is a real 1-turn flow.
    expect(res.body.hasIntel).toBe(true);
    expect(res.body.funnelStage).toBe('discovery');
    expect(res.body.buyingIntentDetected).toBe(false);
    expect(res.body.conversationIntelligence.qualificationProgress).toBe('not_started');
    expect(Array.isArray(res.body.tags)).toBe(true);
    expect(res.body.tags).toContain('pricing');
    expect(Array.isArray(res.body.timeline)).toBe(true);
    expect(Array.isArray(res.body.notes)).toBe(true);
    // Score is derived (no lead, 1 turn → 2/10); qualification stays not_started.
    expect(res.body.conversationIntelligence).toMatchObject({ score: 2, qualificationProgress: 'not_started' });
  });

  it('returns 404 for cross-tenant session access', async () => {
    const conv = conversationRepo.create(tenantAId, 'admin-cross-tenant');
    const res = await request('PUT', `/api/admin/sessions/${conv.id}/flag`, { flagged: true }, tenantBToken);
    expect(res.status).toBe(404);
  });

  it('returns 404 for unknown session', async () => {
    const res = await request('PUT', '/api/admin/sessions/does-not-exist/status', { status: 'ended' }, tenantAToken);
    expect(res.status).toBe(404);
  });

  it('lists sessions enriched with intelligence derived from messages', async () => {
    const conv = conversationRepo.findBySession(tenantAId, 'admin-session-1')!;
    const res = await request('GET', '/api/admin/sessions?limit=50', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    const match = res.body.sessions.find((s: any) => s.sessionId === conv.id);
    expect(match).toBeDefined();
    // sessionId must be the conversation id so dashboard detail links resolve.
    expect(match.sessionId).toBe(conv.id);
    // Seeded conversation has one user message + one assistant reply.
    expect(match.hasIntel).toBe(true);
    expect(match.turnCount).toBe(1);
    expect(match.funnelStage).toBe('discovery');
    expect(typeof match.buyingIntentDetected).toBe('boolean');
    expect(Array.isArray(match.tags)).toBe(true);
    expect(match.status).toBe('active');
  });

  it('reports analytics in the dashboard AnalyticsResponse shape', async () => {
    const res = await request('GET', '/api/admin/analytics', undefined, tenantAToken);
    expect(res.status).toBe(200);
    const body = res.body;
    expect(body.totalSessions).toBeGreaterThanOrEqual(1);
    expect(typeof body.avgTurns).toBe('number');
    expect(typeof body.handoffRate).toBe('number');
    expect(typeof body.escalationRate).toBe('number');
    expect(typeof body.qualificationCompletionRate).toBe('number');
    expect(typeof body.avgBuyingIntentRate).toBe('number');
    expect(Array.isArray(body.stageDistribution)).toBe(true);
    expect(Array.isArray(body.topObjections)).toBe(true);
    for (const stage of body.stageDistribution) {
      expect(typeof stage.stage).toBe('string');
      expect(typeof stage.count).toBe('number');
      expect(typeof stage.percentage).toBe('number');
    }
  });

  it('returns conversation insights in the InsightsDashboard contract', async () => {
    const res = await request('GET', '/api/admin/insights/overview', undefined, tenantAToken);
    expect(res.status).toBe(200);
    const insights = Array.isArray(res.body) ? res.body : res.body.insights || [];
    expect(Array.isArray(insights)).toBe(true);
    // Tenant A has seeded conversations, so real insights should be generated.
    expect(insights.length).toBeGreaterThan(0);
    for (const item of insights) {
      expect(typeof item.id).toBe('string');
      expect(typeof item.type).toBe('string');
      expect(['info', 'warning', 'critical', 'success']).toContain(item.severity);
      expect(typeof item.text).toBe('string');
      expect(typeof item.dateGenerated).toBe('string');
    }
  });

  it('returns insight trends in the TrendItem[] contract (no crash on render)', async () => {
    const res = await request('GET', '/api/admin/insights/trend', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const item of res.body) {
      expect(typeof item.metric).toBe('string');
      expect(typeof item.currentPeriod).toBe('number');
      expect(typeof item.previousPeriod).toBe('number');
      expect(typeof item.change).toBe('number');
    }
  });
});

// ─── Leads & Followups ────────────────────────────────────

describe('Admin leads and followups', () => {
  it('lists leads for the tenant', async () => {
    await request('POST', '/api/chat', { message: 'Contact me at admin-lead@corp.com', sessionId: 'admin-lead-1' }, tenantAToken);
    const res = await request('GET', '/api/admin/leads', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.leads.length).toBeGreaterThan(0);
    expect(res.body.leads.some((l: any) => l.email === 'admin-lead@corp.com')).toBe(true);
  });

  it('lists followups excluding disqualified leads', async () => {
    await request('POST', '/api/chat', { message: 'Reach me at admin-followup@corp.com', sessionId: 'admin-followup-1' }, tenantAToken);
    const lead = leadRepo.findBySession(tenantAId, 'admin-followup-1')!;
    leadRepo.updateLead(lead.id, tenantAId, { qualificationStatus: 'disqualified' });

    const res = await request('GET', '/api/admin/followups', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.followups.some((l: any) => l.email === 'admin-followup@corp.com')).toBe(false);
  });
});

// ─── Usage Metrics ────────────────────────────────────────

describe('Admin usage metrics', () => {
  it('reports real conversation and escalation counts', async () => {
    const conv = conversationRepo.create(tenantAId, 'admin-usage-session');
    messageRepo.create({ conversationId: conv.id, tenantId: tenantAId, role: 'user', content: 'Talk to a human', sequenceNumber: 1 });
    conversationRepo.setSessionState(conv.id, 'human_takeover', 'agent-9');

    const res = await request('GET', '/api/admin/usage/current', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.conversations).toBeGreaterThanOrEqual(4);
    expect(res.body.humanEscalations).toBe(1);
    expect(res.body.activeUsers).toBeGreaterThanOrEqual(1);
  });
});

// ─── AdminOnly Authorization Guard ────────────────────────

describe('Admin activation route authorization', () => {
  it('rejects team members (role=member) with 403', async () => {
    const cases = [
      'GET /api/admin/unanswered',
      'GET /api/admin/unanswered/stats',
      'GET /api/admin/unanswered/clusters',
      'GET /api/admin/knowledge/suggestions',
      'GET /api/admin/citations/overview',
      'GET /api/admin/citations/confidence-distribution',
      'GET /api/admin/insights/overview',
      'GET /api/admin/insights/trend',
      'GET /api/admin/usage/current',
      'GET /api/admin/usage/history',
    ];
    for (const entry of cases) {
      const [method, path] = entry.split(' ');
      const res = await request(method, path, undefined, memberToken);
      expect(res.status, `${method} ${path}`).toBe(403);
    }
  });

  it('rejects member writes with 403', async () => {
    const conv = conversationRepo.create(tenantAId, 'member-write-blocked');
    const res = await request('POST', '/api/admin/unanswered/record', { conversationId: conv.id, question: 'Blocked?' }, memberToken);
    expect(res.status).toBe(403);
  });

  it('allows owners and admins through the guard', async () => {
    const res = await request('GET', '/api/admin/usage/current', undefined, tenantAToken);
    expect(res.status).toBe(200);
  });
});

// ─── Knowledge Gap Recording ──────────────────────────────

describe('Knowledge gap recording', () => {
  it('records an unanswered question when the brain falls back to heuristics', async () => {
    const question = `What is the return window for gap-test-${Date.now()}?`;
    const chat = await request('POST', '/api/chat', { message: question, sessionId: `gap-session-${Date.now()}` }, tenantAToken);
    expect(chat.status).toBe(200);

    // In the test environment no LLM keys are configured, so the brain degrades
    // to heuristic templates and the turn is flagged as a fallback → gap recorded.
    const res = await request('GET', '/api/admin/unanswered?resolved=false', undefined, tenantAToken);
    expect(res.status).toBe(200);
    const gaps = res.body as any[];
    expect(gaps.length).toBeGreaterThan(0);
    const match = gaps.find((g: any) => g.question === question);
    expect(match).toBeDefined();
    expect(match.resolvedAt).toBeFalsy();
    expect(match.retrievalStatus).toBe('unanswered');
  });

  it('does not record gaps for other tenants', async () => {
    const resA = await request('GET', '/api/admin/unanswered?resolved=false', undefined, tenantAToken);
    const resB = await request('GET', '/api/admin/unanswered?resolved=false', undefined, tenantBToken);
    const questionsA = (resA.body as any[]).map((g: any) => g.question);
    for (const g of (resB.body as any[])) {
      expect(questionsA).not.toContain(g.question);
    }
  });
});
