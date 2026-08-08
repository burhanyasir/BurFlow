import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import {
  createDatabase, UserRepository, TenantRepository, ApiKeyRepository, RefreshTokenRepository,
  ConversationRepository, MessageRepository, UsageRepository,
  WebhookRepository, WebhookDeliveryRepository, AuditLogRepository, LeadRepository, LeadService,
} from '@conversation-engine/saas-core';
import { authMiddleware, publicChatAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { createAuthRoutes } from '../routes/auth';
import { createChatRoutes } from '../routes/chat';
import { createLeadRoutes } from '../routes/leads';
import { createWebhookRoutes } from '../routes/webhooks';

// ─── Test Setup ───────────────────────────────────────────

const TEST_DB = join(__dirname, '__test_leads_api__.db');
const JWT_SECRET = 'test-secret-key-for-leads-api';

let db: Database.Database;
let userRepo: UserRepository;
let tenantRepo: TenantRepository;
let apiKeyRepo: ApiKeyRepository;
let refreshTokenRepo: RefreshTokenRepository;
let conversationRepo: ConversationRepository;
let messageRepo: MessageRepository;
let usageRepo: UsageRepository;
let webhookRepo: WebhookRepository;
let webhookDeliveryRepo: WebhookDeliveryRepository;
let auditRepo: AuditLogRepository;
let leadRepo: LeadRepository;
let app: express.Express;

function makeApp() {
  const a = express();
  a.use(express.json({ limit: '10mb' }));
  a.use('/api/auth', createAuthRoutes(userRepo, tenantRepo, refreshTokenRepo, JWT_SECRET));
  const auth = authMiddleware(JWT_SECRET);
  const chatAuth = publicChatAuth(JWT_SECRET, apiKeyRepo, tenantRepo);
  const tenantGuard = requireTenant(tenantRepo);
  const leadService = new LeadService(leadRepo);
  a.use('/api/leads', auth, tenantGuard, createLeadRoutes(leadRepo, webhookRepo, webhookDeliveryRepo));
  a.use('/api/chat', chatAuth, tenantGuard, createChatRoutes(conversationRepo, messageRepo, usageRepo, undefined, { leadService, webhookRepo, webhookDeliveryRepo }));
  a.use('/api/webhooks', auth, tenantGuard, createWebhookRoutes(webhookRepo, webhookDeliveryRepo, auditRepo));
  return a;
}

async function request(method: string, path: string, body?: any, token?: string, extraHeaders?: Record<string, string>) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(extraHeaders || {}) };
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
let tenantBId: string;

beforeAll(async () => {
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
  db = createDatabase(TEST_DB);
  userRepo = new UserRepository(db);
  tenantRepo = new TenantRepository(db);
  apiKeyRepo = new ApiKeyRepository(db);
  refreshTokenRepo = new RefreshTokenRepository(db);
  conversationRepo = new ConversationRepository(db);
  messageRepo = new MessageRepository(db);
  usageRepo = new UsageRepository(db);
  webhookRepo = new WebhookRepository(db);
  webhookDeliveryRepo = new WebhookDeliveryRepository(db);
  auditRepo = new AuditLogRepository(db);
  leadRepo = new LeadRepository(db);
  app = makeApp();

  const signupA = await request('POST', '/api/auth/signup', {
    email: 'leads-a@test.com', password: 'password123', name: 'Leads Admin A', companyName: 'Leads Corp A',
  });
  tenantAToken = signupA.body.token;
  tenantAId = signupA.body.tenant.id;

  const signupB = await request('POST', '/api/auth/signup', {
    email: 'leads-b@test.com', password: 'password123', name: 'Leads Admin B', companyName: 'Leads Corp B',
  });
  tenantBToken = signupB.body.token;
  tenantBId = signupB.body.tenant.id;
});

afterAll(() => {
  try { db.close(); } catch {}
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
});

// ─── Tests ────────────────────────────────────────────────

describe('Lead capture via chat', () => {
  it('creates a lead when visitor shares an email in chat', async () => {
    const res = await request('POST', '/api/chat', {
      message: 'My email is jane@acme.com, please send me pricing details',
      sessionId: 'lead-session-1',
    }, tenantAToken);

    expect(res.status).toBe(200);
    expect(res.body.response).toBeTruthy();

    const lead = leadRepo.findBySession(tenantAId, 'lead-session-1');
    expect(lead).toBeTruthy();
    expect(lead!.email).toBe('jane@acme.com');
    expect(lead!.source).toBe('chat');
    expect(lead!.conversationId).toBeTruthy();
  });

  it('enqueues a lead.captured webhook delivery when webhook is registered', async () => {
    const wh = await request('POST', '/api/webhooks', {
      url: 'https://example.com/hooks/leads',
      events: ['lead.captured', 'lead.qualified'],
    }, tenantAToken);
    expect(wh.status).toBe(201);
    const webhookId = wh.body.id;

    await request('POST', '/api/chat', {
      message: 'Hello, I am Mike Ross and my number is 555-222-3333',
      sessionId: 'lead-session-2',
    }, tenantAToken);

    const deliveries = webhookDeliveryRepo.listByWebhook(webhookId, 1, 50);
    expect(deliveries.total).toBe(1);
    expect(deliveries.deliveries[0].eventType).toBe('lead.captured');
    const payload = JSON.parse(deliveries.deliveries[0].payload);
    expect(payload.event).toBe('lead.captured');
    expect(payload.data.email).toBeUndefined();
    expect(payload.data.phone).toBe('555-222-3333');
    expect(payload.data.name).toBe('Mike Ross');
  });

  it('merges lead data across turns in the same session', async () => {
    await request('POST', '/api/chat', {
      message: 'My name is Alice Wonder',
      sessionId: 'lead-session-3',
    }, tenantAToken);

    await request('POST', '/api/chat', {
      message: 'My email is alice@wonder.io',
      sessionId: 'lead-session-3',
    }, tenantAToken);

    const lead = leadRepo.findBySession(tenantAId, 'lead-session-3');
    expect(lead).toBeTruthy();
    expect(lead!.name).toBe('Alice Wonder');
    expect(lead!.email).toBe('alice@wonder.io');
  });

  it('does not create leads for plain questions without contact info', async () => {
    await request('POST', '/api/chat', {
      message: 'What features do you offer?',
      sessionId: 'lead-session-nocontact',
    }, tenantAToken);

    const lead = leadRepo.findBySession(tenantAId, 'lead-session-nocontact');
    expect(lead).toBeNull();
  });
});

describe('Leads API', () => {
  it('GET /api/leads lists leads for the tenant', async () => {
    await request('POST', '/api/chat', {
      message: 'Contact me at buyer@corp.com please',
      sessionId: 'lead-list-1',
    }, tenantAToken);

    const res = await request('GET', '/api/leads', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.leads.length).toBeGreaterThan(0);
    expect(res.body.total).toBeGreaterThan(0);
    const emails = res.body.leads.map((l: any) => l.email);
    expect(emails).toContain('buyer@corp.com');
  });

  it('GET /api/leads/:id returns a single lead', async () => {
    const list = await request('GET', '/api/leads', undefined, tenantAToken);
    const first = list.body.leads[0];
    const res = await request('GET', `/api/leads/${first.id}`, undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.lead.id).toBe(first.id);
  });

  it('returns 404 for unknown lead id', async () => {
    const res = await request('GET', '/api/leads/does-not-exist', undefined, tenantAToken);
    expect(res.status).toBe(404);
  });

  it('enforces tenant isolation on leads', async () => {
    await request('POST', '/api/chat', {
      message: 'Email me at only-b@other.com',
      sessionId: 'lead-b-1',
    }, tenantBToken);

    const listB = await request('GET', '/api/leads', undefined, tenantBToken);
    const bLeads = listB.body.leads;
    expect(bLeads.some((l: any) => l.email === 'only-b@other.com')).toBe(true);

    const listA = await request('GET', '/api/leads', undefined, tenantAToken);
    expect(listA.body.leads.some((l: any) => l.email === 'only-b@other.com')).toBe(false);

    const res = await request('GET', `/api/leads/${bLeads[0].id}`, undefined, tenantAToken);
    expect(res.status).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await request('GET', '/api/leads');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/leads/webhook manual trigger', () => {
  it('creates a lead from payload and enqueues lead.captured delivery', async () => {
    const wh = await request('POST', '/api/webhooks', {
      url: 'https://example.com/hooks/manual',
      events: ['lead.captured', 'lead.qualified'],
    }, tenantAToken);
    const webhookId = wh.body.id;

    const res = await request('POST', '/api/leads/webhook', {
      lead: { email: 'manual@lead.com', name: 'Manual Lead', company: 'Manual Corp' },
      leadScore: 35,
      sessionId: 'manual-session-1',
    }, tenantAToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.lead.email).toBe('manual@lead.com');
    expect(res.body.lead.qualificationStatus).toBe('marketing_qualified');
    expect(res.body.isNew).toBe(true);

    const deliveries = webhookDeliveryRepo.listByWebhook(webhookId, 1, 50);
    expect(deliveries.total).toBe(1);
    expect(deliveries.deliveries[0].eventType).toBe('lead.captured');
  });

  it('dispatches lead.qualified when high-intent lead is captured', async () => {
    const wh = await request('POST', '/api/webhooks', {
      url: 'https://example.com/hooks/qualified',
      events: ['lead.captured', 'lead.qualified'],
    }, tenantAToken);
    const webhookId = wh.body.id;

    const res = await request('POST', '/api/leads/webhook', {
      lead: { email: 'hot@lead.com' },
      leadScore: 85,
      buyingIntent: 'high',
      sessionId: 'manual-session-2',
    }, tenantAToken);

    expect(res.status).toBe(200);
    expect(res.body.lead.qualificationStatus).toBe('sales_qualified');
    expect(res.body.webhookDeliveriesEnqueued).toBeGreaterThanOrEqual(2);

    const deliveries = webhookDeliveryRepo.listByWebhook(webhookId, 1, 50);
    expect(deliveries.total).toBe(2);
    const eventTypes = deliveries.deliveries.map(d => d.eventType).sort();
    expect(eventTypes).toEqual(['lead.captured', 'lead.qualified']);
  });

  it('rejects payloads with no contact info and no intent', async () => {
    const res = await request('POST', '/api/leads/webhook', {
      lead: { leadScore: 5 },
      sessionId: 'manual-session-3',
    }, tenantAToken);
    expect(res.status).toBe(400);
  });

  it('triggers webhooks for an existing lead by id', async () => {
    const lead = leadRepo.create({
      tenantId: tenantAId, sessionId: 'manual-session-4', email: 'existing@lead.com',
      qualificationStatus: 'sales_qualified', leadScore: 80, buyingIntent: 'high', source: 'api',
    });

    const wh = await request('POST', '/api/webhooks', {
      url: 'https://example.com/hooks/existing',
      events: ['lead.qualified'],
    }, tenantAToken);
    const webhookId = wh.body.id;

    const res = await request('POST', '/api/leads/webhook', { leadId: lead.id }, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.lead.id).toBe(lead.id);
    expect(res.body.lead.qualificationStatus).toBe('sales_qualified');

    const deliveries = webhookDeliveryRepo.listByWebhook(webhookId, 1, 50);
    expect(deliveries.total).toBe(1);
    expect(deliveries.deliveries[0].eventType).toBe('lead.qualified');
  });
});
