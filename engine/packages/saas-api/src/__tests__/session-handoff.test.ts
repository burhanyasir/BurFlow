import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import {
  createDatabase, UserRepository, TenantRepository, ApiKeyRepository, RefreshTokenRepository,
  ConversationRepository, MessageRepository, UsageRepository,
  SessionHandoffService, TAKEOVER_ACKNOWLEDGEMENT,
} from '@conversation-engine/saas-core';
import { authMiddleware, publicChatAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { createAuthRoutes } from '../routes/auth';
import { createChatRoutes } from '../routes/chat';
import { createAgentChatRoutes } from '../routes/agent-chat';

// ─── Unit Tests: SessionHandoffService ─────────────────────────

describe('SessionHandoffService', () => {
  let db: Database.Database;
  let conversationRepo: ConversationRepository;
  let handoff: SessionHandoffService;
  let T1: string;
  let T2: string;
  let sessionA: string;
  let sessionB: string;

  beforeAll(() => {
    db = createDatabase(':memory:');
    conversationRepo = new ConversationRepository(db);
    handoff = new SessionHandoffService(conversationRepo);

    const userRepo = new UserRepository(db);
    const tenantRepo = new TenantRepository(db);
    const owner = userRepo.create({ email: 'owner@unit.test', password: 'password123', name: 'Owner' });
    T1 = tenantRepo.create({ name: 'Tenant 1', ownerId: owner.id }).id;
    T2 = tenantRepo.create({ name: 'Tenant 2', ownerId: owner.id }).id;

    sessionA = conversationRepo.create(T1, 'unit-sess-a').sessionId;
    sessionB = conversationRepo.create(T1, 'unit-sess-b').sessionId;
  });

  afterAll(() => { try { db.close(); } catch {} });

  it('creates conversations in ai_managed state', () => {
    const conv = conversationRepo.findBySession(T1, sessionA)!;
    expect(conv.sessionState).toBe('ai_managed');
    expect(conv.assignedAgentId).toBeUndefined();
    expect(conv.takeoverAt).toBeUndefined();
    expect(handoff.isAiManaged(T1, sessionA)).toBe(true);
  });

  it('initiateTakeover transitions to human_takeover and records agent + timestamp', () => {
    const updated = handoff.initiateTakeover(T1, sessionA, 'agent-42')!;
    expect(updated.sessionState).toBe('human_takeover');
    expect(updated.assignedAgentId).toBe('agent-42');
    expect(updated.takeoverAt).toBeDefined();
    expect(new Date(updated.takeoverAt!).getTime()).not.toBeNaN();
    expect(handoff.isAiManaged(T1, sessionA)).toBe(false);
    expect(handoff.getSessionState(T1, sessionA)).toBe('human_takeover');
  });

  it('releaseTakeover reverts to ai_managed and clears assignment', () => {
    const updated = handoff.releaseTakeover(T1, sessionA)!;
    expect(updated.sessionState).toBe('ai_managed');
    expect(updated.assignedAgentId).toBeUndefined();
    expect(updated.takeoverAt).toBeUndefined();
    expect(handoff.isAiManaged(T1, sessionA)).toBe(true);
  });

  it('releaseTakeover is idempotent on an ai_managed session', () => {
    const updated = handoff.releaseTakeover(T1, sessionA)!;
    expect(updated.sessionState).toBe('ai_managed');
  });

  it('closeSession transitions to closed (terminal)', () => {
    const updated = handoff.closeSession(T1, sessionB)!;
    expect(updated.sessionState).toBe('closed');
    expect(handoff.isAiManaged(T1, sessionB)).toBe(false);
    expect(handoff.getSessionState(T1, sessionB)).toBe('closed');
  });

  it('isAiManaged treats unknown sessions as AI-managed', () => {
    expect(handoff.isAiManaged(T1, 'does-not-exist')).toBe(true);
    expect(handoff.getSessionState(T1, 'does-not-exist')).toBe('ai_managed');
  });

  it('rejects takeover/release of sessions that do not exist in the tenant', () => {
    expect(handoff.initiateTakeover(T2, sessionA, 'agent-1')).toBeNull();
    expect(handoff.initiateTakeover(T1, 'missing', 'agent-1')).toBeNull();
    expect(handoff.releaseTakeover(T2, sessionA)).toBeNull();
  });

  it('state transitions persist across reads (round-trip persistence)', () => {
    handoff.initiateTakeover(T1, sessionA, 'persist-agent');
    const freshRead = conversationRepo.findBySession(T1, sessionA)!;
    expect(freshRead.sessionState).toBe('human_takeover');
    expect(freshRead.assignedAgentId).toBe('persist-agent');
  });
});

// ─── Integration Tests: chat guard + agent routes ──────────────

describe('human takeover — chat guard & agent endpoints', () => {
  const TEST_DB = join(__dirname, '__test_session_handoff__.db');
  const JWT_SECRET = 'test-secret-key-for-handoff';

  let db: Database.Database;
  let app: express.Express;
  let conversationRepo: ConversationRepository;
  let messageRepo: MessageRepository;
  let tenantAToken: string;
  let tenantAId: string;
  let tenantBToken: string;

  async function request(method: string, path: string, body?: any, token?: string, headers?: Record<string, string>) {
    const h: Record<string, string> = { 'Content-Type': 'application/json', ...(headers || {}) };
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
    const handoff = new SessionHandoffService(conversationRepo);

    const a = express();
    a.use(express.json({ limit: '10mb' }));
    a.use('/api/auth', createAuthRoutes(userRepo, tenantRepo, refreshTokenRepo, JWT_SECRET));
    const auth = authMiddleware(JWT_SECRET);
    const tenantGuard = requireTenant(tenantRepo);
    a.use('/api/chat', publicChatAuth(JWT_SECRET, apiKeyRepo, tenantRepo), tenantGuard, createChatRoutes(conversationRepo, messageRepo, usageRepo, undefined, undefined, handoff));
    a.use('/api/sessions', auth, tenantGuard, createAgentChatRoutes(conversationRepo, messageRepo, handoff));
    app = a;

    const signupA = await request('POST', '/api/auth/signup', {
      email: 'handoff-a@test.com', password: 'password123', name: 'Handoff A', companyName: 'Handoff Corp A',
    });
    tenantAToken = signupA.body.token;
    tenantAId = signupA.body.tenant.id;

    const signupB = await request('POST', '/api/auth/signup', {
      email: 'handoff-b@test.com', password: 'password123', name: 'Handoff B', companyName: 'Handoff Corp B',
    });
    tenantBToken = signupB.body.token;
  });

  afterAll(() => {
    try { db.close(); } catch {}
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
  });

  async function lastMessageContent(conversationId: string): Promise<string> {
    const rows = messageRepo.listByConversation(conversationId);
    return rows.messages[rows.messages.length - 1]?.content || '';
  }

  async function conversationIdFor(sessionId: string): Promise<string> {
    return conversationRepo.findBySession(tenantAId, sessionId)!.id;
  }

  it('AI responds normally before takeover', async () => {
    const res = await request('POST', '/api/chat', { message: 'What are your plans?', sessionId: 'ho-sess-1' }, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.humanTakeover).toBeUndefined();
    expect(typeof res.body.response).toBe('string');
    expect(res.body.response.length).toBeGreaterThan(0);
  });

  it('takeover endpoint assigns an agent and sets state', async () => {
    const convId = await conversationIdFor('ho-sess-1');
    const res = await request('POST', `/api/sessions/${convId}/takeover`, { agentId: 'rep-jane' }, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.sessionState).toBe('human_takeover');
    expect(res.body.assignedAgentId).toBe('rep-jane');
    expect(res.body.takeoverAt).toBeDefined();
  });

  it('suppresses the AI brain during takeover but stores the visitor message', async () => {
    const convId = await conversationIdFor('ho-sess-1');
    const before = messageRepo.listByConversation(convId).messages.length;

    const res = await request('POST', '/api/chat', { message: 'I need urgent help', sessionId: 'ho-sess-1' }, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.humanTakeover).toBe(true);
    expect(res.body.response).toBe(TAKEOVER_ACKNOWLEDGEMENT);
    expect(res.body.strategy).toBe('human_takeover');

    const after = messageRepo.listByConversation(convId).messages;
    expect(after.length).toBe(before + 1);
    expect(after[after.length - 1].role).toBe('user');
    expect(after[after.length - 1].content).toBe('I need urgent help');
  });

  it('agent can insert a manual reply visible in session memory', async () => {
    const convId = await conversationIdFor('ho-sess-1');
    const res = await request('POST', `/api/sessions/${convId}/message`, { content: 'Hi, this is Jane — I can help with that right now.' }, tenantAToken);
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('assistant');
    expect(res.body.sender).toBe('agent');
    expect(res.body.content).toContain('Jane');

    const messages = messageRepo.listByConversation(convId).messages;
    const last = messages[messages.length - 1];
    expect(last.content).toBe('Hi, this is Jane — I can help with that right now.');
    expect(last.role).toBe('assistant');
  });

  it('release endpoint hands control back to the AI', async () => {
    const convId = await conversationIdFor('ho-sess-1');
    const res = await request('POST', `/api/sessions/${convId}/release`, {}, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.sessionState).toBe('ai_managed');

    const chat = await request('POST', '/api/chat', { message: 'Can you summarize the plans again?', sessionId: 'ho-sess-1' }, tenantAToken);
    expect(chat.status).toBe(200);
    expect(chat.body.humanTakeover).toBeUndefined();
    expect(typeof chat.body.response).toBe('string');
  });

  it('stream endpoint honours takeover and returns the acknowledgement', async () => {
    const convId = await conversationIdFor('ho-sess-1');
    await request('POST', `/api/sessions/${convId}/takeover`, { agentId: 'rep-jane' }, tenantAToken);

    const res = await request('POST', '/api/chat/stream', { message: 'Can you hear me?', sessionId: 'ho-sess-1' }, tenantAToken, { Accept: 'application/json' });
    expect(res.status).toBe(200);
    expect(res.body.humanTakeover).toBe(true);
    expect(res.body.response).toBe(TAKEOVER_ACKNOWLEDGEMENT);
    expect(res.body.stage).toBe('handoff');
  });

  it('rejects agent messages with empty content (400)', async () => {
    const convId = await conversationIdFor('ho-sess-1');
    const res = await request('POST', `/api/sessions/${convId}/message`, { content: '   ' }, tenantAToken);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_CONTENT');
  });

  it('enforces tenant isolation on takeover and messaging', async () => {
    const convId = await conversationIdFor('ho-sess-1');

    const takeover = await request('POST', `/api/sessions/${convId}/takeover`, { agentId: 'intruder' }, tenantBToken);
    expect(takeover.status).toBe(404);

    const msg = await request('POST', `/api/sessions/${convId}/message`, { content: 'pwned' }, tenantBToken);
    expect(msg.status).toBe(404);

    const release = await request('POST', `/api/sessions/${convId}/release`, {}, tenantBToken);
    expect(release.status).toBe(404);
  });

  it('requires authentication on agent routes (401)', async () => {
    const convId = await conversationIdFor('ho-sess-1');
    const takeover = await request('POST', `/api/sessions/${convId}/takeover`, { agentId: 'x' });
    expect(takeover.status).toBe(401);

    const msg = await request('POST', `/api/sessions/${convId}/message`, { content: 'x' });
    expect(msg.status).toBe(401);
  });

  it('takeover on an unknown session returns 404', async () => {
    const res = await request('POST', '/api/sessions/does-not-exist/takeover', { agentId: 'x' }, tenantAToken);
    expect(res.status).toBe(404);
  });
});
