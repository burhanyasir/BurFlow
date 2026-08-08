import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import {
  createDatabase, UserRepository, TenantRepository, ApiKeyRepository, RefreshTokenRepository,
  ConversationRepository, MessageRepository, UsageRepository, WidgetConfigRepository,
  Lead, LeadRepository, LeadService,
} from '@conversation-engine/saas-core';
import {
  buildSlackBlocks, buildLeadEmailHtml, sendSlackNotification, sendEmailNotification,
  shouldNotifyLead, dispatchLeadNotifications,
} from '../services/lead-notifier';
import { setEmailProvider, EmailService, EmailPayload } from '../services/email';
import { authMiddleware, publicChatAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { createAuthRoutes } from '../routes/auth';
import { createChatRoutes } from '../routes/chat';

const APP_URL = 'https://app.example.com';
process.env.APP_URL = APP_URL;

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    tenantId: 'tenant-1',
    sessionId: 'session-1',
    conversationId: 'conv-1',
    email: 'jane@acme.com',
    phone: '555-123-4567',
    name: 'Jane Doe',
    company: 'Acme Corp',
    qualificationStatus: 'marketing_qualified',
    leadScore: 45,
    buyingIntent: 'medium',
    source: 'chat',
    metadata: {},
    createdAt: '2026-08-08T00:00:00.000Z',
    updatedAt: '2026-08-08T00:00:00.000Z',
    ...overrides,
  };
}

class FakeEmailProvider implements EmailService {
  public sent: EmailPayload[] = [];
  async send(payload: EmailPayload): Promise<void> { this.sent.push(payload); }
}

describe('lead-notifier — Slack payload', () => {
  it('builds a rich block layout with all lead fields', () => {
    const lead = makeLead();
    const payload = buildSlackBlocks(lead);
    const blocks = payload.blocks as any[];
    expect(blocks[0].type).toBe('header');
    expect(blocks[0].text.text).toBe('🎯 New Lead Captured');
    const fields = blocks[1].fields.map((f: any) => f.text);
    expect(fields).toContain('*Name:* Jane Doe');
    expect(fields).toContain('*Email:* jane@acme.com');
    expect(fields).toContain('*Phone:* 555-123-4567');
    expect(fields).toContain('*Company:* Acme Corp');
    expect(fields).toContain('*Score:* 45/100');
    expect(fields).toContain('*Status:* marketing qualified');
    expect(blocks[2].type).toBe('context');
    expect(blocks[2].elements[0].text).toBe(`<${APP_URL}/admin/conversations/conv-1|View session>`);
  });

  it('uses the sales-qualified header and score for hot leads', () => {
    const lead = makeLead({ qualificationStatus: 'sales_qualified', leadScore: 85 });
    const payload = buildSlackBlocks(lead);
    const blocks = payload.blocks as any[];
    expect(blocks[0].text.text).toBe('🔥 Sales-Qualified Lead');
    expect(blocks[1].fields.map((f: any) => f.text)).toContain('*Score:* 85/100');
  });
});

describe('lead-notifier — email HTML', () => {
  it('renders an HTML template containing lead fields and session link', () => {
    const html = buildLeadEmailHtml(makeLead());
    expect(html).toContain('Jane Doe');
    expect(html).toContain('jane@acme.com');
    expect(html).toContain('555-123-4567');
    expect(html).toContain('Acme Corp');
    expect(html).toContain('45/100');
    expect(html).toContain('marketing qualified');
    expect(html).toContain(`https://app.example.com/admin/conversations/conv-1`);
    expect(html).toContain('<html>');
  });

  it('escapes HTML-sensitive lead values', () => {
    const html = buildLeadEmailHtml(makeLead({ name: '<script>alert(1)</script>', company: 'A & B' }));
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B');
  });
});

describe('lead-notifier — Slack webhook delivery', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const WEBHOOK = 'https://hooks.slack.com/services/T/B/secret';

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs a Slack block payload to the configured webhook URL', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => 'ok' });
    await sendSlackNotification(WEBHOOK, makeLead());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(WEBHOOK);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(init.body);
    expect(body.blocks[0].text.text).toBe('🎯 New Lead Captured');
  });

  it('throws when Slack responds with an error status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });
    await expect(sendSlackNotification(WEBHOOK, makeLead())).rejects.toThrow(/500/);
  });
});

describe('lead-notifier — email delivery', () => {
  const emailProvider = new FakeEmailProvider();

  beforeAll(() => setEmailProvider(emailProvider));
  afterAll(() => setEmailProvider(new FakeEmailProvider()));

  it('sends an HTML email to the recipient with lead details', async () => {
    await sendEmailNotification('ops@acme.com', makeLead());
    expect(emailProvider.sent.length).toBe(1);
    const email = emailProvider.sent[0];
    expect(email.to).toBe('ops@acme.com');
    expect(email.subject).toContain('New Lead: Jane Doe');
    expect(email.html).toContain('jane@acme.com');
    expect(email.text).toContain('Jane Doe');
  });

  it('marks sales-qualified leads in the subject', async () => {
    await sendEmailNotification('ops@acme.com', makeLead({ qualificationStatus: 'sales_qualified' }));
    expect(emailProvider.sent[1].subject).toContain('Sales-Qualified Lead');
  });
});

describe('lead-notifier — dispatch logic', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const emailProvider = new FakeEmailProvider();
  const flush = () => new Promise(r => setTimeout(r, 20));

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => 'ok' });
    vi.stubGlobal('fetch', fetchMock);
    setEmailProvider(emailProvider);
    emailProvider.sent = [];
  });

  afterEach(() => vi.unstubAllGlobals());

  it('skips when no channels are configured', async () => {
    const count = dispatchLeadNotifications({}, makeLead());
    await flush();
    expect(count).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(emailProvider.sent).toEqual([]);
  });

  it('dispatches to Slack and email when both are configured', async () => {
    const config = { notificationEmail: 'ops@acme.com', slackWebhookUrl: 'https://hooks.slack.com/x' };
    const count = dispatchLeadNotifications(config, makeLead());
    await flush();
    expect(count).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(emailProvider.sent.length).toBe(1);
  });

  it('suppresses non-qualified leads when threshold is sales_qualified_only', async () => {
    const config = { notificationEmail: 'ops@acme.com', slackWebhookUrl: 'https://hooks.slack.com/x', notifyThreshold: 'sales_qualified_only' };
    const count = dispatchLeadNotifications(config, makeLead({ qualificationStatus: 'unqualified' }));
    await flush();
    expect(count).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(emailProvider.sent).toEqual([]);
  });

  it('notifies sales-qualified leads when threshold is sales_qualified_only', async () => {
    const config = { notificationEmail: 'ops@acme.com', slackWebhookUrl: 'https://hooks.slack.com/x', notifyThreshold: 'sales_qualified_only' };
    const count = dispatchLeadNotifications(config, makeLead({ qualificationStatus: 'sales_qualified' }));
    await flush();
    expect(count).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(emailProvider.sent.length).toBe(1);
  });

  it('never throws when delivery fails (fire-and-forget)', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const config = { notificationEmail: 'ops@acme.com', slackWebhookUrl: 'https://hooks.slack.com/x' };
    expect(() => dispatchLeadNotifications(config, makeLead())).not.toThrow();
    await flush();
  });

  it('shouldNotifyLead evaluates channels and threshold', () => {
    const lead = makeLead();
    expect(shouldNotifyLead(null, lead)).toBe(false);
    expect(shouldNotifyLead(undefined, lead)).toBe(false);
    expect(shouldNotifyLead({}, lead)).toBe(false);
    expect(shouldNotifyLead({ notificationEmail: 'a@b.com' }, lead)).toBe(true);
    expect(shouldNotifyLead({ slackWebhookUrl: 'https://x' }, lead)).toBe(true);
    expect(shouldNotifyLead({ notificationEmail: 'a@b.com', notifyThreshold: 'sales_qualified_only' }, makeLead({ qualificationStatus: 'unqualified' }))).toBe(false);
    expect(shouldNotifyLead({ notificationEmail: 'a@b.com', notifyThreshold: 'sales_qualified_only' }, makeLead({ qualificationStatus: 'sales_qualified' }))).toBe(true);
  });
});

describe('lead-notifier — chat route integration', () => {
  const TEST_DB = join(__dirname, '__test_lead_notifier__.db');
  const JWT_SECRET = 'test-secret-key-for-lead-notifier';
  let fetchMock: ReturnType<typeof vi.fn>;
  const emailProvider = new FakeEmailProvider();
  const flush = () => new Promise(r => setTimeout(r, 30));

  let db: Database.Database;
  let widgetConfigRepo: WidgetConfigRepository;
  let tenantId: string;
  let token: string;
  let server: any;
  let port: number;
  let chat: (message: string, sessionId: string) => Promise<any>;

  beforeAll(async () => {
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
    db = createDatabase(TEST_DB);

    const userRepo = new UserRepository(db);
    const tenantRepo = new TenantRepository(db);
    const apiKeyRepo = new ApiKeyRepository(db);
    const refreshTokenRepo = new RefreshTokenRepository(db);
    const conversationRepo = new ConversationRepository(db);
    const messageRepo = new MessageRepository(db);
    const usageRepo = new UsageRepository(db);
    widgetConfigRepo = new WidgetConfigRepository(db);
    const leadRepo = new LeadRepository(db);
    const leadService = new LeadService(leadRepo);

    const app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use('/api/auth', createAuthRoutes(userRepo, tenantRepo, refreshTokenRepo, JWT_SECRET));
    const chatAuth = publicChatAuth(JWT_SECRET, apiKeyRepo, tenantRepo);
    app.use('/api/chat', chatAuth, requireTenant(tenantRepo), createChatRoutes(
      conversationRepo, messageRepo, usageRepo, undefined,
      { leadService, getNotificationConfig: (tid) => widgetConfigRepo.get(tid) },
    ));

    server = app.listen(0);
    port = (server.address() as any).port;

    const http = require('http');
    const requestJson = (path: string, method: string, body?: any, authToken?: string) => new Promise<any>((resolve, reject) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const r = http.request({ hostname: '127.0.0.1', port, path, method, headers }, (res: any) => {
        let data = '';
        res.on('data', (c: string) => data += c);
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      });
      r.on('error', reject);
      if (body) r.write(JSON.stringify(body));
      r.end();
    });

    const signup = await requestJson('/api/auth/signup', 'POST', { email: 'notif@test.com', password: 'password123', name: 'Notif Admin', companyName: 'Notif Corp' });
    token = signup.body.token;
    tenantId = signup.body.tenant.id;

    chat = (message: string, sessionId: string) => requestJson('/api/chat', 'POST', { message, sessionId }, token);
  });

  afterAll(() => {
    server?.close();
    try { db.close(); } catch {}
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
  });

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => 'ok' });
    vi.stubGlobal('fetch', fetchMock);
    setEmailProvider(emailProvider);
    emailProvider.sent = [];
  });

  afterEach(() => vi.unstubAllGlobals());

  it('dispatches Slack and email alerts when a lead is captured in chat', async () => {
    widgetConfigRepo.upsert(tenantId, { notificationEmail: 'ops@acme.com', slackWebhookUrl: 'https://hooks.slack.com/leads', notifyThreshold: 'all' });

    const res = await chat('Contact me at hot@lead.io please, I want to buy today', 'notif-session-1');

    expect(res.status).toBe(200);
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://hooks.slack.com/leads');
    const body = JSON.parse(init.body);
    expect(body.blocks[1].fields.map((f: any) => f.text)).toContain('*Email:* hot@lead.io');

    expect(emailProvider.sent.length).toBe(1);
    expect(emailProvider.sent[0].to).toBe('ops@acme.com');
    expect(emailProvider.sent[0].html).toContain('hot@lead.io');
  });

  it('does not notify when threshold is sales_qualified_only and lead is not qualified', async () => {
    widgetConfigRepo.upsert(tenantId, { notificationEmail: 'ops@acme.com', slackWebhookUrl: 'https://hooks.slack.com/leads', notifyThreshold: 'sales_qualified_only' });

    const res = await chat('My name is Bob Smith', 'notif-session-2');

    expect(res.status).toBe(200);
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(emailProvider.sent).toEqual([]);
  });

  it('does not block the chat response when the Slack endpoint is unreachable', async () => {
    widgetConfigRepo.upsert(tenantId, { notificationEmail: 'ops@acme.com', slackWebhookUrl: 'https://hooks.slack.com/leads', notifyThreshold: 'all' });
    fetchMock.mockRejectedValue(new Error('timeout'));

    const start = Date.now();
    const res = await chat('Email me at fast@lead.io', 'notif-session-3');
    const elapsed = Date.now() - start;

    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThan(2000);
    await flush();
  });
});
