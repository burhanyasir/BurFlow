import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import {
  createDatabase, UserRepository, TenantRepository, ApiKeyRepository, RefreshTokenRepository,
  ConversationRepository, MessageRepository, UsageRepository, LeadRepository, HandoffRequestRepository,
  SessionHandoffService, TAKEOVER_ACKNOWLEDGEMENT,
} from '@conversation-engine/saas-core';
import { authMiddleware, publicChatAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { createAuthRoutes } from '../routes/auth';
import { createChatRoutes } from '../routes/chat';
import { createAgentChatRoutes } from '../routes/agent-chat';

describe('agent inbox — session list & message thread endpoints', () => {
  const TEST_DB = join(__dirname, '__test_agent_inbox__.db');
  const JWT_SECRET = 'test-secret-key-for-agent-inbox';

  let db: Database.Database;
  let app: express.Express;
  let conversationRepo: ConversationRepository;
  let messageRepo: MessageRepository;
  let leadRepo: LeadRepository;
  let handoffReqRepo: HandoffRequestRepository;
  let tenantAToken: string;
  let tenantAId: string;
  let tenantBToken: string;

  async function request(method: string, path: string, body?: any, token?: string) {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return new Promise<{ status: number; body: any }>((resolve) => {
      const http = require('http');
      const server = app.listen(0, () => {
        const port = (server.address() as any).port;
        const r = http.request({ hostname: '127.0.0.1', port, path, method, headers: h }, (res: any) => {
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

  async function openSession(sessionId: string, message: string, token: string): Promise<{ conversationId: string }> {
    const res = await request('POST', '/api/chat', { message, sessionId }, token);
    expect(res.status).toBe(200);
    return { conversationId: res.body.conversationId };
  }

  beforeAll(async () => {
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
    db = createDatabase(TEST_DB);
    const userRepo = new UserRepository(db);
    const tenantRepo = new TenantRepository(db);
    const apiKeyRepo = new ApiKeyRepository(db);
    const refreshTokenRepo = new RefreshTokenRepository(db);
    conversationRepo = new ConversationRepository(db);
    messageRepo = new MessageRepository(db);
    const usageRepo = new UsageRepository(db);
    leadRepo = new LeadRepository(db);
    handoffReqRepo = new HandoffRequestRepository(db);
    const handoff = new SessionHandoffService(conversationRepo);

    const a = express();
    a.use(express.json({ limit: '10mb' }));
    a.use('/api/auth', createAuthRoutes(userRepo, tenantRepo, refreshTokenRepo, JWT_SECRET));
    const auth = authMiddleware(JWT_SECRET);
    const tenantGuard = requireTenant(tenantRepo);
    a.use('/api/chat', publicChatAuth(JWT_SECRET, apiKeyRepo, tenantRepo), tenantGuard, createChatRoutes(conversationRepo, messageRepo, usageRepo, undefined, undefined, handoff));
    a.use('/api/sessions', auth, tenantGuard, createAgentChatRoutes(conversationRepo, messageRepo, handoff, leadRepo, handoffReqRepo));
    app = a;

    const signupA = await request('POST', '/api/auth/signup', {
      email: 'inbox-a@test.com', password: 'password123', name: 'Inbox A', companyName: 'Inbox Corp A',
    });
    tenantAToken = signupA.body.token;
    tenantAId = signupA.body.tenant.id;

    const signupB = await request('POST', '/api/auth/signup', {
      email: 'inbox-b@test.com', password: 'password123', name: 'Inbox B', companyName: 'Inbox Corp B',
    });
    tenantBToken = signupB.body.token;
  });

  afterAll(() => {
    try { db.close(); } catch {}
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
  });

  it('returns an empty session list initially', async () => {
    const res = await request('GET', '/api/sessions', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.sessions).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('lists active sessions with thread metadata after chat activity', async () => {
    const { conversationId } = await openSession('inbox-sess-1', 'Hi, I want to buy your product', tenantAToken);

    const res = await request('GET', '/api/sessions', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);

    const session = res.body.sessions[0];
    expect(session.id).toBe(conversationId);
    expect(session.sessionId).toBe('inbox-sess-1');
    expect(session.sessionState).toBe('ai_managed');
    expect(session.messageCount).toBe(2);
    expect(session.lastMessage).toBeTruthy();
    expect(session.lastActivityAt).toBeTruthy();
    expect(session.needsTakeover).toBe(false);
  });

  it('flags sessions as needs takeover when the lead score is high', async () => {
    await openSession('inbox-sess-2', 'I need this urgently', tenantAToken);
    const conv = conversationRepo.findBySession(tenantAId, 'inbox-sess-2')!;
    leadRepo.create({
      tenantId: tenantAId,
      sessionId: 'inbox-sess-2',
      conversationId: conv.id,
      email: 'buyer@acme.com',
      name: 'Alice Buyer',
      company: 'Acme Inc',
      qualificationStatus: 'sales_qualified',
      leadScore: 85,
      buyingIntent: 'high',
      source: 'chat',
    });

    const res = await request('GET', '/api/sessions', undefined, tenantAToken);
    const session = res.body.sessions.find((s: any) => s.sessionId === 'inbox-sess-2');
    expect(session).toBeTruthy();
    expect(session.visitorName).toBe('Alice Buyer');
    expect(session.visitorEmail).toBe('buyer@acme.com');
    expect(session.leadScore).toBe(85);
    expect(session.qualificationStatus).toBe('sales_qualified');
    expect(session.needsTakeover).toBe(true);
  });

  it('flags sessions as needs takeover when the visitor requested help', async () => {
    await openSession('inbox-sess-3', 'Can someone talk to me?', tenantAToken);
    handoffReqRepo.create({ tenantId: tenantAId, sessionId: 'inbox-sess-3' });

    const res = await request('GET', '/api/sessions', undefined, tenantAToken);
    const session = res.body.sessions.find((s: any) => s.sessionId === 'inbox-sess-3');
    expect(session.pendingHandoff).toBe(true);
    expect(session.needsTakeover).toBe(true);
  });

  it('no longer flags a session as needs takeover once an agent takes over', async () => {
    const conv = conversationRepo.findBySession(tenantAId, 'inbox-sess-2')!;
    const takeover = await request('POST', `/api/sessions/${conv.id}/takeover`, { agentId: 'rep-1' }, tenantAToken);
    expect(takeover.status).toBe(200);

    const res = await request('GET', '/api/sessions', undefined, tenantAToken);
    const session = res.body.sessions.find((s: any) => s.sessionId === 'inbox-sess-2');
    expect(session.sessionState).toBe('human_takeover');
    expect(session.assignedAgentId).toBe('rep-1');
    expect(session.needsTakeover).toBe(false);
  });

  it('returns the full message thread in ascending order', async () => {
    const conv = conversationRepo.findBySession(tenantAId, 'inbox-sess-1')!;
    const res = await request('GET', `/api/sessions/${conv.id}/messages`, undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe('inbox-sess-1');
    expect(res.body.total).toBe(2);
    expect(res.body.messages.length).toBe(2);
    expect(res.body.messages[0].role).toBe('user');
    expect(res.body.messages[0].content).toBe('Hi, I want to buy your product');
    expect(res.body.messages[1].role).toBe('assistant');
    expect(res.body.messages.map((m: any) => m.sequenceNumber)).toEqual([1, 2]);
  });

  it('includes agent-sent messages in the thread', async () => {
    const conv = conversationRepo.findBySession(tenantAId, 'inbox-sess-2')!;
    const sent = await request('POST', `/api/sessions/${conv.id}/message`, { content: 'Hi Alice, this is Rep-1, how can I help?' }, tenantAToken);
    expect(sent.status).toBe(201);
    expect(sent.body.sender).toBe('agent');

    const res = await request('GET', `/api/sessions/${conv.id}/messages`, undefined, tenantAToken);
    const last = res.body.messages[res.body.messages.length - 1];
    expect(last.role).toBe('assistant');
    expect(last.content).toBe('Hi Alice, this is Rep-1, how can I help?');
    expect(res.body.total).toBe(3);
  });

  it('enforces tenant isolation on the session list and thread', async () => {
    const conv = conversationRepo.findBySession(tenantAId, 'inbox-sess-1')!;

    const list = await request('GET', '/api/sessions', undefined, tenantBToken);
    expect(list.status).toBe(200);
    expect(list.body.sessions).toEqual([]);

    const thread = await request('GET', `/api/sessions/${conv.id}/messages`, undefined, tenantBToken);
    expect(thread.status).toBe(404);
  });

  it('requires authentication (401) and 404s on unknown sessions', async () => {
    const unauth = await request('GET', '/api/sessions');
    expect(unauth.status).toBe(401);

    const missing = await request('GET', '/api/sessions/does-not-exist/messages', undefined, tenantAToken);
    expect(missing.status).toBe(404);
  });
});
