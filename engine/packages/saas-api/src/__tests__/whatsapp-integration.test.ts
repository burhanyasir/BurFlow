import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import express from 'express';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import {
  createDatabase, UserRepository, TenantRepository, RefreshTokenRepository,
  ConversationRepository, MessageRepository, UsageRepository, LeadRepository, LeadService, WhatsAppClient,
} from '@conversation-engine/saas-core';
import { createAuthRoutes } from '../routes/auth';
import { createWhatsAppRoutes } from '../routes/whatsapp';
import { executePipeline } from '../orchestrator';

vi.mock('../orchestrator', () => ({
  executePipeline: vi.fn(),
  getState: vi.fn(),
}));

const executePipelineMock = vi.mocked(executePipeline);

function metaPayload(overrides: { messages?: any[]; statuses?: any[]; displayPhoneNumber?: string; from?: string; body?: string; type?: string } = {}) {
  const {
    messages: overrideMessages, statuses = [], displayPhoneNumber = '+1 650 555 8888',
    from = '15551234567', body = 'Hi, I want a demo', type = 'text',
  } = overrides;
  const messages = overrideMessages !== undefined
    ? overrideMessages
    : (statuses.length ? [] : [{ body }]);
  const value: any = {
    messaging_product: 'whatsapp',
    metadata: { display_phone_number: displayPhoneNumber, phone_number_id: '1010101010' },
    contacts: [{ profile: { name: 'Test User' }, wa_id: from }],
  };
  value.messages = messages.map((m, i) => ({
    from: m.from ?? from,
    id: m.id ?? `wamid.${Date.now()}.${i}`,
    timestamp: String(Date.now() + i),
    type: m.type ?? type,
    text: m.text !== undefined
      ? m.text
      : (m.type === 'text' || m.type === undefined ? { body: m.body ?? body } : undefined),
  }));
  if (statuses !== undefined) value.statuses = statuses;
  return {
    object: 'whatsapp',
    entry: [{ id: '12345', changes: [{ field: 'messages', value }] }],
  };
}

const APP_SECRET = 'whatsapp-app-secret-test';

function hubSignature(body: unknown): string {
  const { createHmac } = require('crypto');
  return 'sha256=' + createHmac('sha256', APP_SECRET).update(JSON.stringify(body)).digest('hex');
}

const pipelineResult = {
  response: 'Sure! I can walk you through a demo.',
  strategy: 'answer',
  mood: 'helpful',
  trustScore: 65,
  buyingIntentScore: 82,
  stage: 'qualified',
  composition: {},
  policy: {},
  latencyMs: 12,
  quickReplies: [],
  uiState: undefined,
  cta: null,
  leadCapture: { email: 'demo-user@example.com', name: 'Demo User' },
};

describe('WhatsApp Business API integration', () => {
  const TEST_DB = join(__dirname, '__test_whatsapp__.db');

  let db: Database.Database;
  let app: express.Express;
  let conversationRepo: ConversationRepository;
  let messageRepo: MessageRepository;
  let leadRepo: LeadRepository;
  let tenantAId: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  /**
   * signatureHeader: undefined → auto-sign the body with the test app secret;
   * null → omit the header; string → use verbatim.
   */
  async function request(method: string, path: string, body?: any, signatureHeader?: string | null) {
    return new Promise<{ status: number; headers: any; body: any }>((resolve) => {
      const http = require('http');
      const server = app.listen(0, () => {
        const port = (server.address() as any).port;
        const headers: any = {};
        if (body) headers['Content-Type'] = 'application/json';
        if (body !== undefined && signatureHeader !== null) {
          headers['X-Hub-Signature-256'] = signatureHeader === undefined ? hubSignature(body) : signatureHeader;
        }
        const r = http.request({
          hostname: '127.0.0.1', port, path, method,
          headers: Object.keys(headers).length ? headers : undefined,
        }, (res: any) => {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (c: string) => data += c);
          res.on('end', () => {
            server.close();
            const contentType = res.headers['content-type'] || '';
            resolve({ status: res.statusCode, headers: res.headers, body: contentType.includes('json') ? (data ? JSON.parse(data) : null) : data });
          });
        });
        if (body) r.write(JSON.stringify(body));
        r.end();
      });
    });
  }

  beforeAll(async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'test-verify-token';
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
    db = createDatabase(TEST_DB);
    const userRepo = new UserRepository(db);
    const tenantRepo = new TenantRepository(db);
    const refreshTokenRepo = new RefreshTokenRepository(db);
    conversationRepo = new ConversationRepository(db);
    messageRepo = new MessageRepository(db);
    const usageRepo = new UsageRepository(db);
    leadRepo = new LeadRepository(db);
    const leadService = new LeadService(leadRepo);

    const a = express();
    a.use(express.json({ verify: (req: any, _res: any, buf: Buffer) => { req.rawBody = buf; } }));
    a.use('/api/auth', createAuthRoutes(userRepo, tenantRepo, refreshTokenRepo, 'whatsapp-test-secret'));
    app = a;

    const signup = await request('POST', '/api/auth/signup', {
      email: 'whatsapp@test.com', password: 'password123', name: 'WhatsApp', companyName: 'WhatsApp Corp',
    });
    tenantAId = signup.body.tenant.id;

    app.use('/api/webhooks/whatsapp', createWhatsAppRoutes({
      conversationRepo,
      messageRepo,
      usageRepo,
      leadOptions: { leadService },
      whatsappClient: new WhatsAppClient({ phoneNumberId: '1010101010', token: 'meta-test-token' }),
      verifyToken: 'test-verify-token',
      appSecret: APP_SECRET,
      tenantId: tenantAId,
    }));
  });

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => 'ok' });
    vi.stubGlobal('fetch', fetchMock);
    executePipelineMock.mockReset();
    executePipelineMock.mockResolvedValue(pipelineResult);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    try { db.close(); } catch {}
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
  });

  describe('webhook verification challenge', () => {
    it('verifies the challenge when the token matches', async () => {
      const res = await request('GET', '/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=1158201444');
      expect(res.status).toBe(200);
      expect(res.body).toBe('1158201444');
    });

    it('rejects a mismatched verify token', async () => {
      const res = await request('GET', '/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=1158201444');
      expect(res.status).toBe(403);
    });

    it('rejects missing challenge parameters', async () => {
      const res = await request('GET', '/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-verify-token');
      expect(res.status).toBe(403);
    });
  });

  describe('inbound message processing', () => {
    it('routes an inbound text message through the brain and sends the reply back', async () => {
      const res = await request('POST', '/api/webhooks/whatsapp', metaPayload({ body: 'Show me pricing' }));

      expect(res.status).toBe(200);
      expect(executePipelineMock).toHaveBeenCalledTimes(1);
      const pipelineInput = executePipelineMock.mock.calls[0][0];
      expect(pipelineInput.message).toBe('Show me pricing');
      expect(pipelineInput.sessionId).toBe('whatsapp:15551234567');
      expect(pipelineInput.tenantId).toBe(tenantAId);

      const conversation = conversationRepo.findBySession(tenantAId, 'whatsapp:15551234567');
      expect(conversation).not.toBeNull();
      const messages = messageRepo.listByConversation(conversation!.id).messages;
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Show me pricing');
      expect(messages[1].role).toBe('assistant');
      expect(messages[1].content).toBe(pipelineResult.response);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://graph.facebook.com/v18.0/1010101010/messages');
      expect(init.method).toBe('POST');
      expect(init.headers['Authorization']).toBe('Bearer meta-test-token');
      const sent = JSON.parse(init.body);
      expect(sent.messaging_product).toBe('whatsapp');
      expect(sent.to).toBe('15551234567');
      expect(sent.text.body).toBe(pipelineResult.response);
    });

    it('reuses the same conversation for follow-ups from the same sender', async () => {
      await request('POST', '/api/webhooks/whatsapp', metaPayload({ body: 'First message', from: '19998887777' }));
      await request('POST', '/api/webhooks/whatsapp', metaPayload({ body: 'Second message', from: '19998887777' }));

      const conversations = db.prepare('SELECT * FROM conversations WHERE tenant_id = ?').all(tenantAId);
      const waSessions = conversations.filter((c: any) => c.session_id.startsWith('whatsapp:'));
      expect(waSessions).toHaveLength(2);
      const reused = waSessions.find((c: any) => c.session_id === 'whatsapp:19998887777');
      expect((reused as any).message_count).toBe(4);
      expect(executePipelineMock).toHaveBeenCalledTimes(2);
    });

    it('ignores non-text messages and status receipts', async () => {
      const res = await request('POST', '/api/webhooks/whatsapp', metaPayload({
        messages: [{ type: 'image', body: undefined }],
      }));
      expect(res.status).toBe(200);
      expect(executePipelineMock).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();

      const statusRes = await request('POST', '/api/webhooks/whatsapp', metaPayload({ statuses: [{ id: 's1' }] }));
      expect(statusRes.status).toBe(200);
      expect(executePipelineMock).not.toHaveBeenCalled();
    });

    it('ignores self-sent echo messages from the business phone', async () => {
      const res = await request('POST', '/api/webhooks/whatsapp', metaPayload({ displayPhoneNumber: '+1 555 123 4567', from: '15551234567' }));
      expect(res.status).toBe(200);
      expect(executePipelineMock).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('processes multiple messages in a single payload', async () => {
      const res = await request('POST', '/api/webhooks/whatsapp', metaPayload({
        messages: [{ body: 'Msg A', from: '10001' }, { body: 'Msg B', from: '10002' }],
      }));
      expect(res.status).toBe(200);
      expect(executePipelineMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const sentPhones = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).to);
      expect(sentPhones).toEqual(['10001', '10002']);
    });

    it('captures qualified leads from WhatsApp turns', async () => {
      await request('POST', '/api/webhooks/whatsapp', metaPayload({ body: 'my email is lead@example.com' }));

      const lead = leadRepo.findBySession(tenantAId, 'whatsapp:15551234567');
      expect(lead).not.toBeNull();
      expect(lead!.email).toBe('demo-user@example.com');
      expect(lead!.source).toBe('whatsapp');
      expect(lead!.leadScore).toBe(82);
    });

    it('acknowledges non-whatsapp payloads without processing', async () => {
      const res = await request('POST', '/api/webhooks/whatsapp', { object: 'instagram', entry: [] });
      expect(res.status).toBe(200);
      expect(res.body.received).toBe(false);
      expect(executePipelineMock).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('returns 500 when the brain pipeline throws', async () => {
      executePipelineMock.mockRejectedValue(new Error('LLM unavailable'));
      const res = await request('POST', '/api/webhooks/whatsapp', metaPayload());
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('WhatsApp message processing failed');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns 502 when the outbound Meta send fails', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 429, text: async () => 'rate limited' });
      const res = await request('POST', '/api/webhooks/whatsapp', metaPayload({ from: '14445556666' }));
      expect(res.status).toBe(502);
      expect(executePipelineMock).toHaveBeenCalledTimes(1);
    });

    it('rejects empty text content with 400', async () => {
      const res = await request('POST', '/api/webhooks/whatsapp', metaPayload({ body: '' }));
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Message content is required');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  // Runs last: these tests create real conversations and the tests above count
  // whatsapp sessions globally, so the DB must be left as they expect.
  describe('webhook signature verification (X-Hub-Signature-256)', () => {
    it('rejects POSTs with a missing signature header', async () => {
      const res = await request('POST', '/api/webhooks/whatsapp', metaPayload(), null);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid signature');
    });

    it('rejects a malformed signature header', async () => {
      const res = await request('POST', '/api/webhooks/whatsapp', metaPayload(), 'not-a-signature');
      expect(res.status).toBe(401);
      const res2 = await request('POST', '/api/webhooks/whatsapp', metaPayload(), 'sha256=zzz');
      expect(res2.status).toBe(401);
    });

    it('rejects a signature computed with the wrong secret', async () => {
      const { createHmac } = require('crypto');
      const bad = 'sha256=' + createHmac('sha256', 'wrong-secret').update(JSON.stringify(metaPayload())).digest('hex');
      const res = await request('POST', '/api/webhooks/whatsapp', metaPayload(), bad);
      expect(res.status).toBe(401);
    });

    it('rejects a tampered payload (signature no longer matches the body)', async () => {
      const original = metaPayload();
      const goodSignature = hubSignature(original); // signed while intact
      const tampered = { ...original, entry: [{ id: 'tampered' }] };
      const res = await request('POST', '/api/webhooks/whatsapp', tampered, goodSignature);
      expect(res.status).toBe(401);
    });

    it('accepts a valid signature and processes the message', async () => {
      const res = await request('POST', '/api/webhooks/whatsapp', metaPayload({ from: '15559990001', body: 'Signed hello' }));
      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });
  });
});
