import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import {
  createDatabase, UserRepository, TenantRepository, ApiKeyRepository, RefreshTokenRepository,
  ConversationRepository, MessageRepository, UsageRepository, WidgetConfigRepository,
  AnalyticsRepository, LeadRepository, LeadService,
  AnalyticsService, classifyMessageIntent,
} from '@conversation-engine/saas-core';
import { authMiddleware, publicChatAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { createAuthRoutes } from '../routes/auth';
import { createChatRoutes } from '../routes/chat';
import { createAnalyticsRoutes } from '../routes/analytics';

// ─── Service Unit Tests ───────────────────────────────────────

describe('AnalyticsService', () => {
  let db: Database.Database;
  let service: AnalyticsService;
  let conversationRepo: ConversationRepository;
  let messageRepo: MessageRepository;
  let leadRepo: LeadRepository;
  let analyticsRepo: AnalyticsRepository;
  let T1: string;
  let T2: string;

  beforeAll(() => {
    db = createDatabase(':memory:');
    service = new AnalyticsService(db);
    conversationRepo = new ConversationRepository(db);
    messageRepo = new MessageRepository(db);
    leadRepo = new LeadRepository(db);
    analyticsRepo = new AnalyticsRepository(db);

    const userRepo = new UserRepository(db);
    const tenantRepo = new TenantRepository(db);
    const owner = userRepo.create({ email: 'owner@unit.test', password: 'password123', name: 'Owner' });
    T1 = tenantRepo.create({ name: 'Tenant 1', ownerId: owner.id }).id;
    T2 = tenantRepo.create({ name: 'Tenant 2', ownerId: owner.id }).id;

    const c1 = conversationRepo.create(T1, 'sess-a');
    const c2 = conversationRepo.create(T1, 'sess-b');
    conversationRepo.create(T2, 'other-sess');

    const msg = (conversationId: string, role: string, content: string, createdAt: string) => {
      const m = messageRepo.create({ conversationId, tenantId: role === 'assistant' ? T1 : T1, role, content, sequenceNumber: 1 });
      db.prepare('UPDATE messages SET created_at = ? WHERE id = ?').run(createdAt, m.id);
      return m;
    };
    msg(c1.id, 'user', 'How much does it cost?', '2026-06-01T10:00:00.000Z');
    msg(c1.id, 'assistant', 'Here are our plans.', '2026-06-01T10:00:01.000Z');
    msg(c2.id, 'user', 'Does it support Slack integration?', '2026-07-15T10:00:00.000Z');
    msg(c2.id, 'user', 'Please book me a demo', '2026-07-15T10:00:02.000Z');

    db.prepare(`UPDATE conversations SET started_at = ? WHERE id = ?`).run('2026-06-01T09:00:00.000Z', c1.id);
    db.prepare(`UPDATE conversations SET started_at = ? WHERE id = ?`).run('2026-07-15T09:00:00.000Z', c2.id);

    const mkLead = (sessionId: string, status: string, score: number, createdAt: string) => {
      const lead = leadRepo.create({
        tenantId: T1, sessionId, email: `lead-${sessionId}@x.io`, name: `Lead ${sessionId}`,
        qualificationStatus: status as any, leadScore: score, buyingIntent: 'medium', source: 'chat',
      });
      db.prepare('UPDATE leads SET created_at = ? WHERE id = ?').run(createdAt, lead.id);
      return lead;
    };
    mkLead('sess-a', 'sales_qualified', 85, '2026-06-01T11:00:00.000Z');
    mkLead('sess-b', 'marketing_qualified', 55, '2026-07-15T11:00:00.000Z');
    mkLead('sess-x', 'unqualified', 10, '2026-07-20T11:00:00.000Z');
  });

  afterAll(() => { try { db.close(); } catch {} });

  it('aggregates summary metrics across conversations, messages, and leads', () => {
    const s = service.getSummaryMetrics(T1);
    expect(s.totalConversations).toBe(2);
    expect(s.totalMessages).toBe(4);
    expect(s.uniqueSessions).toBe(2);
    expect(s.totalLeadsCaptured).toBe(3);
    expect(s.qualifiedLeadsCount).toBe(2);
    expect(s.conversionRatePercentage).toBe(66.7);
    expect(s.averageLeadScore).toBe(50);
  });

  it('applies the timeframe filter with inclusive date boundaries', () => {
    const s = service.getSummaryMetrics(T1, { startDate: '2026-06-01', endDate: '2026-07-15' });
    expect(s.totalConversations).toBe(2);
    expect(s.totalMessages).toBe(4);
    expect(s.totalLeadsCaptured).toBe(2);
    expect(s.qualifiedLeadsCount).toBe(2);
    expect(s.averageLeadScore).toBe(70);

    const outside = service.getSummaryMetrics(T1, { startDate: '2026-06-02' });
    expect(outside.totalConversations).toBe(1);
    expect(outside.totalMessages).toBe(2);
    expect(outside.totalLeadsCaptured).toBe(2);
  });

  it('returns zeroed metrics for an empty tenant', () => {
    const s = service.getSummaryMetrics('empty-tenant');
    expect(s).toEqual({
      totalConversations: 0, totalMessages: 0, uniqueSessions: 0,
      totalLeadsCaptured: 0, qualifiedLeadsCount: 0,
      conversionRatePercentage: 0, averageLeadScore: 0,
    });
  });

  it('classifies user messages into intent categories', () => {
    const topics = service.getTopicBreakdown(T1);
    expect(topics.total).toBe(3);
    const byTopic = Object.fromEntries(topics.topics.map(t => [t.topic, t.count]));
    expect(byTopic.pricing).toBe(1);
    expect(byTopic.features).toBe(1);
    expect(byTopic.booking).toBe(1);
    expect(topics.topics[0].count).toBeGreaterThanOrEqual(topics.topics[topics.topics.length - 1].count);
  });

  it('returns empty topic breakdown for zero messages', () => {
    const topics = service.getTopicBreakdown('empty-tenant');
    expect(topics.total).toBe(0);
    expect(topics.topics).toEqual([]);
  });

  it('counts starter chip click-through per option', () => {
    analyticsRepo.record(T1, 'starter_chip_click', { option: 'Show me pricing' });
    analyticsRepo.record(T1, 'starter_chip_click', { option: 'Show me pricing' });
    analyticsRepo.record(T1, 'starter_chip_click', { option: 'Book a demo' });
    analyticsRepo.record(T2, 'starter_chip_click', { option: 'Show me pricing' });

    const stats = service.getStarterOptionStats(T1);
    expect(stats.totalClicks).toBe(3);
    expect(stats.options).toHaveLength(2);
    expect(stats.options[0]).toEqual({ option: 'Show me pricing', clicks: 2, percentage: 66.7 });
    expect(stats.options[1]).toEqual({ option: 'Book a demo', clicks: 1, percentage: 33.3 });

    const other = service.getStarterOptionStats('empty-tenant');
    expect(other.totalClicks).toBe(0);
    expect(other.options).toEqual([]);
  });
});

describe('classifyMessageIntent', () => {
  it('maps messages to the right category', () => {
    expect(classifyMessageIntent('How much is the pro plan?')).toBe('pricing');
    expect(classifyMessageIntent('Does it support API integrations?')).toBe('features');
    expect(classifyMessageIntent('My widget is broken, help')).toBe('support');
    expect(classifyMessageIntent('I want to book a consultation')).toBe('booking');
    expect(classifyMessageIntent('hello there')).toBe('general');
  });
});

// ─── Route Integration Tests ───────────────────────────────────

describe('analytics API routes', () => {
  const TEST_DB = join(__dirname, '__test_analytics_api__.db');
  const JWT_SECRET = 'test-secret-key-for-analytics';

  let db: Database.Database;
  let tenantAToken: string;
  let tenantAId: string;
  let tenantBToken: string;
  let tenantBId: string;
  let analyticsService: AnalyticsService;
  let server: any;
  let port: number;
  let chat: (message: string, sessionId: string, token: string) => Promise<any>;
  let widgetConfigRepo: WidgetConfigRepository;
  let analyticsRepo: AnalyticsRepository;
  let conversationRepo: ConversationRepository;
  let messageRepo: MessageRepository;
  let leadRepo: LeadRepository;
  let requestJson: (path: string, method: string, body?: any, token?: string) => Promise<any>;

  beforeAll(async () => {
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
    db = createDatabase(TEST_DB);
    analyticsService = new AnalyticsService(db);
    analyticsRepo = new AnalyticsRepository(db);
    conversationRepo = new ConversationRepository(db);
    messageRepo = new MessageRepository(db);
    leadRepo = new LeadRepository(db);
    widgetConfigRepo = new WidgetConfigRepository(db);

    const userRepo = new UserRepository(db);
    const tenantRepo = new TenantRepository(db);
    const apiKeyRepo = new ApiKeyRepository(db);
    const refreshTokenRepo = new RefreshTokenRepository(db);
    const usageRepo = new UsageRepository(db);
    const leadService = new LeadService(leadRepo);

    const app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use('/api/auth', createAuthRoutes(userRepo, tenantRepo, refreshTokenRepo, JWT_SECRET));
    const auth = authMiddleware(JWT_SECRET);
    const tenantGuard = requireTenant(tenantRepo);
    app.use('/api/analytics', auth, tenantGuard, createAnalyticsRoutes(analyticsService));
    app.use('/api/chat', publicChatAuth(JWT_SECRET, apiKeyRepo, tenantRepo), tenantGuard, createChatRoutes(
      conversationRepo, messageRepo, usageRepo, undefined,
      {
        leadService,
        analyticsRepo,
        getStarterOptions: (tenantId) => widgetConfigRepo.get(tenantId)?.starterOptions,
      },
    ));

    server = app.listen(0);
    port = (server.address() as any).port;

    const http = require('http');
    requestJson = (path: string, method: string, body?: any, token?: string) => new Promise<any>((resolve, reject) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const r = http.request({ hostname: '127.0.0.1', port, path, method, headers }, (res: any) => {
        let data = '';
        res.on('data', (c: string) => data += c);
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      });
      r.on('error', reject);
      if (body) r.write(JSON.stringify(body));
      r.end();
    });

    const signupA = await requestJson('/api/auth/signup', 'POST', { email: 'analytics-a@test.com', password: 'password123', name: 'Ana A', companyName: 'Ana Corp A' });
    tenantAToken = signupA.body.token;
    tenantAId = signupA.body.tenant.id;
    const signupB = await requestJson('/api/auth/signup', 'POST', { email: 'analytics-b@test.com', password: 'password123', name: 'Ana B', companyName: 'Ana Corp B' });
    tenantBToken = signupB.body.token;
    tenantBId = signupB.body.tenant.id;

    chat = (message: string, sessionId: string, token: string) => requestJson('/api/chat', 'POST', { message, sessionId }, token);

    // Seed tenant A with data
    const c1 = conversationRepo.create(tenantAId, 'ana-sess-1');
    const c2 = conversationRepo.create(tenantAId, 'ana-sess-2');
    const c3 = conversationRepo.create(tenantBId, 'ana-b-sess');
    messageRepo.create({ conversationId: c1.id, tenantId: tenantAId, role: 'user', content: 'What does pricing look like?', sequenceNumber: 1 });
    messageRepo.create({ conversationId: c1.id, tenantId: tenantAId, role: 'assistant', content: 'Plans start at $29.', sequenceNumber: 2 });
    messageRepo.create({ conversationId: c2.id, tenantId: tenantAId, role: 'user', content: 'Book me a demo please', sequenceNumber: 1 });
    messageRepo.create({ conversationId: c3.id, tenantId: tenantBId, role: 'user', content: 'What does pricing look like?', sequenceNumber: 1 });
    leadRepo.create({ tenantId: tenantAId, sessionId: 'ana-sess-1', email: 'hot@ana.io', qualificationStatus: 'sales_qualified', leadScore: 90, buyingIntent: 'high', source: 'chat' });
    leadRepo.create({ tenantId: tenantBId, sessionId: 'ana-b-sess', email: 'hot@b.io', qualificationStatus: 'sales_qualified', leadScore: 90, buyingIntent: 'high', source: 'chat' });
    analyticsRepo.record(tenantAId, 'starter_chip_click', { option: 'Show me pricing' });
    analyticsRepo.record(tenantAId, 'starter_chip_click', { option: 'Show me pricing' });
    analyticsRepo.record(tenantBId, 'starter_chip_click', { option: 'Show me pricing' });
  });

  afterAll(() => {
    server?.close();
    try { db.close(); } catch {}
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
  });

  it('returns summary metrics with tenant isolation', async () => {
    const a = await requestJson('/api/analytics/summary', 'GET', undefined, tenantAToken);
    expect(a.status).toBe(200);
    expect(a.body.totalConversations).toBe(2);
    expect(a.body.totalMessages).toBe(3);
    expect(a.body.uniqueSessions).toBe(2);
    expect(a.body.totalLeadsCaptured).toBe(1);
    expect(a.body.qualifiedLeadsCount).toBe(1);
    expect(a.body.conversionRatePercentage).toBe(100);
    expect(a.body.averageLeadScore).toBe(90);

    const b = await requestJson('/api/analytics/summary', 'GET', undefined, tenantBToken);
    expect(b.body.totalConversations).toBe(1);
    expect(b.body.totalMessages).toBe(1);
    expect(b.body.uniqueSessions).toBe(1);
    expect(b.body.totalLeadsCaptured).toBe(1);
  });

  it('supports date filtering on summary', async () => {
    const res = await requestJson('/api/analytics/summary?startDate=2099-01-01', 'GET', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.totalConversations).toBe(0);
    expect(res.body.totalMessages).toBe(0);
    expect(res.body.totalLeadsCaptured).toBe(0);
  });

  it('returns the topic breakdown and intent distribution', async () => {
    const res = await requestJson('/api/analytics/topics', 'GET', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    const byTopic = Object.fromEntries(res.body.topics.map((t: any) => [t.topic, t.count]));
    expect(byTopic.pricing).toBe(1);
    expect(byTopic.booking).toBe(1);
    expect(res.body.topics[0].percentage).toBe(50);
  });

  it('returns starter chip click-through stats isolated per tenant', async () => {
    const a = await requestJson('/api/analytics/starter-chips', 'GET', undefined, tenantAToken);
    expect(a.status).toBe(200);
    expect(a.body.totalClicks).toBe(2);
    expect(a.body.options).toEqual([{ option: 'Show me pricing', clicks: 2, percentage: 100 }]);

    const b = await requestJson('/api/analytics/starter-chips', 'GET', undefined, tenantBToken);
    expect(b.body.totalClicks).toBe(1);
  });

  it('records starter chip clicks when chat messages match configured options', async () => {
    widgetConfigRepo.upsert(tenantAId, { starterOptions: ['Show me pricing', 'Book a demo'] });

    const hit = await chat('Show me pricing', 'chip-session-1', tenantAToken);
    expect(hit.status).toBe(200);
    await chat('How does it work?', 'chip-session-2', tenantAToken);

    const stats = await requestJson('/api/analytics/starter-chips', 'GET', undefined, tenantAToken);
    expect(stats.body.totalClicks).toBe(3);
    const pricing = stats.body.options.find((o: any) => o.option === 'Show me pricing');
    expect(pricing.clicks).toBe(3);
  });

  it('requires auth for analytics endpoints', async () => {
    const res = await requestJson('/api/analytics/summary', 'GET');
    expect(res.status).toBe(401);
  });
});
