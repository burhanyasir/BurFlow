import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import {
  createDatabase, UserRepository, TenantRepository, ApiKeyRepository, RefreshTokenRepository,
  ConversationRepository, MessageRepository, UsageRepository, LeadRepository, HandoffRequestRepository,
  SessionHandoffService,
} from '@conversation-engine/saas-core';
import { authMiddleware, publicChatAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { createAuthRoutes } from '../routes/auth';
import { createChatRoutes } from '../routes/chat';
import { createAgentChatRoutes } from '../routes/agent-chat';

describe('takeover event stream (SSE) & agent-disconnect handback', () => {
  const TEST_DB = join(__dirname, '__test_takeover_events__.db');
  const JWT_SECRET = 'test-secret-key-for-takeover-events';

  let db: Database.Database;
  let app: express.Express;
  let conversationRepo: ConversationRepository;
  let messageRepo: MessageRepository;
  let tenantAToken: string;
  let sseServer: ReturnType<express.Express['listen']> | null = null;

  // Per-request ephemeral server (the takeover hub is a module singleton, so
  // events emitted here still reach SSE connections on the persistent server).
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

  /** Opens a long-lived SSE GET on the persistent server and collects data frames. */
  function openSse(path: string, token: string): {
    frames: Array<Record<string, unknown>>;
    waitFor: (type: string, timeoutMs?: number) => Promise<Record<string, unknown>>;
    close: () => void;
  } {
    const http = require('http');
    const frames: Array<Record<string, unknown>> = [];
    const port = (sseServer!.address() as any).port;
    const req = http.request(
      { hostname: '127.0.0.1', port, path, method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      (res: any) => {
        let buffer = '';
        res.on('data', (chunk: Buffer) => {
          buffer += chunk.toString('utf8');
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';
          for (const part of parts) {
            const dataLine = part.split('\n').find((l: string) => l.startsWith('data:'));
            if (!dataLine) continue;
            const raw = dataLine.slice(5).trim();
            if (!raw) continue;
            try {
              frames.push(JSON.parse(raw));
            } catch { /* skip */ }
          }
        });
      },
    );
    req.end();

    const waitFor = (type: string, timeoutMs = 4000): Promise<Record<string, unknown>> =>
      new Promise((resolve, reject) => {
        const started = Date.now();
        const tick = () => {
          const found = frames.find((f) => f.type === type);
          if (found) return resolve(found);
          if (Date.now() - started > timeoutMs) return reject(new Error(`Timed out waiting for ${type} — frames: ${JSON.stringify(frames)}`));
          setTimeout(tick, 20);
        };
        tick();
      });

    return { frames, waitFor, close: () => req.destroy() };
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
    const leadRepo = new LeadRepository(db);
    const handoffReqRepo = new HandoffRequestRepository(db);
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
      email: 'events-a@test.com', password: 'password123', name: 'Events A', companyName: 'Events Corp A',
    });
    tenantAToken = signupA.body.token;

    // Persistent server for SSE streams (stays open across REST calls).
    sseServer = app.listen(0);
  });

  afterAll(() => {
    if (sseServer) sseServer.close();
    try { db.close(); } catch {}
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
  });

  it('streams TAKEOVER_STARTED / OPERATOR_MESSAGE / TAKEOVER_ENDED to the visitor widget', async () => {
    const { conversationId } = await openSession('visitor-sess-1', 'I need a human', tenantAToken);
    const sse = openSse('/api/chat/events?sessionId=visitor-sess-1', tenantAToken);

    await request('POST', `/api/sessions/${conversationId}/takeover`, { agentId: 'rep-1' }, tenantAToken);
    const started = await sse.waitFor('TAKEOVER_STARTED');
    expect(started.payload).toMatchObject({ agentId: 'rep-1' });

    await request('POST', `/api/sessions/${conversationId}/message`, { content: 'Hi, rep here' }, tenantAToken);
    const opMsg = await sse.waitFor('OPERATOR_MESSAGE');
    expect(opMsg.payload).toMatchObject({ content: 'Hi, rep here', sender: 'agent' });

    await request('POST', `/api/sessions/${conversationId}/release`, {}, tenantAToken);
    const ended = await sse.waitFor('TAKEOVER_ENDED');
    expect(ended.type).toBe('TAKEOVER_ENDED');

    sse.close();
  });

  it('reports the current takeover state immediately when a visitor subscribes mid-takeover', async () => {
    const { conversationId } = await openSession('visitor-sess-2', 'hello', tenantAToken);
    await request('POST', `/api/sessions/${conversationId}/takeover`, { agentId: 'rep-2' }, tenantAToken);

    const sse = openSse('/api/chat/events?sessionId=visitor-sess-2', tenantAToken);
    const started = await sse.waitFor('TAKEOVER_STARTED');
    expect(started.payload).toMatchObject({ agentId: 'rep-2' });
    sse.close();
  });

  it('hands the session back to the AI when the agent presence stream disconnects', async () => {
    const { conversationId } = await openSession('visitor-sess-3', 'hello again', tenantAToken);
    // No explicit agentId — the route defaults to the authenticated user's sub,
    // which is also the identity used by the agent presence stream.
    await request('POST', `/api/sessions/${conversationId}/takeover`, {}, tenantAToken);

    let sessionState = (await request('GET', `/api/sessions/${conversationId}/messages`, undefined, tenantAToken)).body.sessionState;
    expect(sessionState).toBe('human_takeover');

    // Agent opens the presence stream, then closes the tab.
    const presence = openSse('/api/sessions/events', tenantAToken);
    await presence.waitFor('AGENT_CONNECTED');
    presence.close();
    await new Promise((r) => setTimeout(r, 150));

    sessionState = (await request('GET', `/api/sessions/${conversationId}/messages`, undefined, tenantAToken)).body.sessionState;
    expect(sessionState).toBe('ai_managed');
  });
});
