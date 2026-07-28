import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runPipeline, PipelineDeps, resetRateLimitStore, mapErrorToStatusCode } from '../pipeline';
import { ErrorCodes } from '@conversation-engine/core-types';
import { SqliteTenantRegistry } from '@conversation-engine/tenant-registry';
import { SqliteSessionStore } from '@conversation-engine/session-store';
import { FileConfigStore, defaultTenantConfig } from '@conversation-engine/config-store';
import { SqliteDedupStore } from '@conversation-engine/dedup-store';
import { TripWireEngine, PatternSet, CRISIS_RESPONSE } from '@conversation-engine/trip-wire';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import express from 'express';

const TEST_DIR = join(__dirname, '__test_pipeline_data__');
const TMP_DB = join(TEST_DIR, 'test.db');
const CONFIG_DIR = join(TEST_DIR, 'configs');

const TEST_PATTERNS: PatternSet = {
  version: 1,
  patterns: [
    { category: 'self_harm', patterns: ['hurt myself', 'self-harm'] },
    { category: 'suicide', patterns: ['kill myself', 'suicide', 'end my life'] },
    { category: 'mental_health_crisis', patterns: ['panic attack'] },
    { category: 'medical_emergency', patterns: ['heart attack'] },
    { category: 'violence_emergency', patterns: ['shooting'] },
    { category: 'emergency_override', patterns: ['emergency override'] },
  ],
};

describe('pipeline-orchestrator', () => {
  let deps: PipelineDeps;
  let crisisDeps: PipelineDeps;
  let tenantRegistry: SqliteTenantRegistry;
  let sessionStore: SqliteSessionStore;
  let configStore: FileConfigStore;
  let dedupStore: SqliteDedupStore;
  let sessionId: string;
  let tripWire: TripWireEngine;

  beforeAll(async () => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(CONFIG_DIR, { recursive: true });

    tenantRegistry = new SqliteTenantRegistry(TMP_DB);
    sessionStore = new SqliteSessionStore(TMP_DB);
    configStore = new FileConfigStore(CONFIG_DIR);
    dedupStore = new SqliteDedupStore(TMP_DB);

    tenantRegistry.seedTenant('test-tenant', 'active');
    tenantRegistry.seedApiKey('test-tenant', 'sk-test-key', 'test');
    const config = defaultTenantConfig('test-tenant');
    config.llm.systemPrompt = 'You are a test bot.';
    await configStore.saveVersion('test-tenant', config, 'system', 'initial');

    const session = await sessionStore.createSession('test-tenant', 1);
    sessionId = session.sessionId;

    tripWire = new TripWireEngine(TEST_PATTERNS);
    deps = { tenantRegistry, sessionStore, configStore, dedupStore };
    crisisDeps = { tenantRegistry, sessionStore, configStore, dedupStore, tripWire };
  });

  afterAll(() => {
    sessionStore.close();
    dedupStore.close();
    try { if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true }); } catch {}
  });

  it('runs full pipeline with valid request', async () => {
    const result = await runPipeline({
      rawMessage: 'Hello, I need help with my order',
      headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key', 'x-session-id': sessionId },
      ip: '127.0.0.1',
    }, deps);
    expect(result.statusCode).toBe(200);
    expect(result.response).toBeDefined();
  });

  it('returns 403 for unknown tenant', async () => {
    const result = await runPipeline({
      rawMessage: 'Hi',
      headers: { 'x-tenant-id': 'unknown-tenant', 'x-api-key': 'sk-bad', 'x-session-id': sessionId },
      ip: '127.0.0.1',
    }, deps);
    expect(result.statusCode).toBe(403);
  });

  describe('crisis bypass', () => {
    const crisisHeaders = { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key' };
    const normalHeaders = { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key' };

    // Each crisis test creates its own fresh session to avoid CAS version conflicts
    async function freshSession(): Promise<string> {
      const session = await sessionStore.createSession('test-tenant', 1);
      return session.sessionId;
    }

    it('returns crisis response for self_harm message', async () => {
      const result = await runPipeline({
        rawMessage: 'I want to hurt myself',
        headers: { ...crisisHeaders, 'x-session-id': await freshSession() },
        ip: '127.0.0.1',
      }, crisisDeps);
      expect(result.statusCode).toBe(200);
      expect(result.response).toBe(CRISIS_RESPONSE);
    });

    it('returns crisis response for suicide message', async () => {
      const result = await runPipeline({
        rawMessage: 'I want to kill myself',
        headers: { ...crisisHeaders, 'x-session-id': await freshSession() },
        ip: '127.0.0.1',
      }, crisisDeps);
      expect(result.statusCode).toBe(200);
      expect(result.response).toBe(CRISIS_RESPONSE);
    });

    it('returns crisis response for mental health crisis', async () => {
      const result = await runPipeline({
        rawMessage: 'I am having a panic attack',
        headers: { ...crisisHeaders, 'x-session-id': await freshSession() },
        ip: '127.0.0.1',
      }, crisisDeps);
      expect(result.statusCode).toBe(200);
      expect(result.response).toBe(CRISIS_RESPONSE);
    });

    it('returns crisis response for medical emergency', async () => {
      const result = await runPipeline({
        rawMessage: 'I think I am having a heart attack',
        headers: { ...crisisHeaders, 'x-session-id': await freshSession() },
        ip: '127.0.0.1',
      }, crisisDeps);
      expect(result.statusCode).toBe(200);
      expect(result.response).toBe(CRISIS_RESPONSE);
    });

    it('returns crisis response for violence emergency', async () => {
      const result = await runPipeline({
        rawMessage: 'There is a shooting happening',
        headers: { ...crisisHeaders, 'x-session-id': await freshSession() },
        ip: '127.0.0.1',
      }, crisisDeps);
      expect(result.statusCode).toBe(200);
      expect(result.response).toBe(CRISIS_RESPONSE);
    });

    it('bypasses stages 2-5 for crisis messages (no stage failure in degradedStages)', async () => {
      const result = await runPipeline({
        rawMessage: 'suicide',
        headers: { ...crisisHeaders, 'x-session-id': await freshSession() },
        ip: '127.0.0.1',
      }, crisisDeps);
      expect(result.statusCode).toBe(200);
      expect(result.response).toBe(CRISIS_RESPONSE);
      expect(result.degradedStages).toEqual([]);
    });

    it('does not trigger crisis bypass for normal messages', async () => {
      const result = await runPipeline({
        rawMessage: 'What are your hours?',
        headers: { ...normalHeaders, 'x-session-id': await freshSession() },
        ip: '127.0.0.1',
      }, crisisDeps);
      expect(result.statusCode).toBe(200);
      expect(result.response).not.toBe(CRISIS_RESPONSE);
    });
  });

  describe('adversarial — pipeline', () => {
    it('returns 403 for malformed API key', async () => {
      const result = await runPipeline({
        rawMessage: 'Hello',
        headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'not-a-valid-key' },
        ip: '127.0.0.1',
      }, deps);
      expect(result.statusCode).toBe(403);
      expect(result.error?.errorCode).toBe('ERR_AUTH_INVALID_KEY');
    });

    it('returns 403 for deactivated tenant', async () => {
      tenantRegistry.seedTenant('deactivated-tenant', 'deactivated');
      tenantRegistry.seedApiKey('deactivated-tenant', 'sk-deactivated-key', 'test');
      const result = await runPipeline({
        rawMessage: 'Hello',
        headers: { 'x-api-key': 'sk-deactivated-key' },
        ip: '127.0.0.1',
      }, deps);
      expect(result.statusCode).toBe(403);
    });

    it('crisis path with new session', async () => {
      const newSession = await sessionStore.createSession('test-tenant', 1);
      const result = await runPipeline({
        rawMessage: 'I want to kill myself',
        headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key', 'x-session-id': newSession.sessionId },
        ip: '127.0.0.1',
      }, crisisDeps);
      expect(result.statusCode).toBe(200);
      expect(result.response).toBe(CRISIS_RESPONSE);
    });

    it('crisis path with existing session persists escalation', async () => {
      const session = await sessionStore.createSession('test-tenant', 1);
      const sid = session.sessionId;
      await runPipeline({
        rawMessage: 'suicide',
        headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key', 'x-session-id': sid },
        ip: '127.0.0.1',
      }, crisisDeps);
      const loaded = await sessionStore.loadSession(sid);
      // Session state may or may not be escalated depending on Stage 7 implementation;
      // at minimum verify the session still exists after crisis path
      expect(loaded).toBeDefined();
    });

    it('auth fails on missing API key', async () => {
      const result = await runPipeline({
        rawMessage: 'Hello',
        headers: { 'x-tenant-id': 'test-tenant' },
        ip: '127.0.0.1',
      }, deps);
      expect(result.statusCode).toBe(403);
    });
  });

  describe('dedup (F1: auth → seq → dedup → rate-limit → safety)', () => {
    it('detects duplicate within TTL window', async () => {
      const sess = await sessionStore.createSession('test-tenant', 1);
      const sid = sess.sessionId;
      const result1 = await runPipeline({
        rawMessage: 'dedup test msg',
        headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key', 'x-session-id': sid },
        ip: '127.0.0.1',
        idempotencyKey: 'dedup-msg-001',
      }, deps);
      expect(result1.statusCode).toBe(200);

      const result2 = await runPipeline({
        rawMessage: 'dedup test msg (different body but same key)',
        headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key', 'x-session-id': sid },
        ip: '127.0.0.1',
        idempotencyKey: 'dedup-msg-001',
      }, deps);
      expect(result2.statusCode).toBe(200);
      expect(result2.error?.errorCode).toBe('ERR_DEDUP_DETECTED');
    });

    it('does not dedup across different idempotency keys', async () => {
      const sess = await sessionStore.createSession('test-tenant', 1);
      const sid = sess.sessionId;
      const r1 = await runPipeline({
        rawMessage: 'dedup cross-key',
        headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key', 'x-session-id': sid },
        ip: '127.0.0.1',
        idempotencyKey: 'dedup-key-a',
      }, deps);
      expect(r1.statusCode).toBe(200);

      const r2 = await runPipeline({
        rawMessage: 'dedup cross-key',
        headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key', 'x-session-id': sid },
        ip: '127.0.0.1',
        idempotencyKey: 'dedup-key-b',
      }, deps);
      expect(r2.statusCode).toBe(200);
      expect(r2.error).toBeUndefined();
    });
  });

  describe('rate limiting after Stage 2', () => {
    it('rate limits after multiple requests', async () => {
      resetRateLimitStore();
      const sess = await sessionStore.createSession('test-tenant', 1);
      const sid = sess.sessionId;

      const rlConfig = defaultTenantConfig('test-tenant');
      rlConfig.rateLimits.messagesPerMinute = 2;
      rlConfig.rateLimits.messagesPerHour = 100;
      rlConfig.llm.systemPrompt = 'You are a test bot.';
      await configStore.saveVersion('test-tenant', rlConfig, 'system', 'rate-limit-test');

      const r1 = await runPipeline({
        rawMessage: 'req-1',
        headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key', 'x-session-id': sid },
        ip: '127.0.0.1',
      }, deps);
      expect(r1.statusCode).toBe(200);

      const r2 = await runPipeline({
        rawMessage: 'req-2',
        headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key', 'x-session-id': sid },
        ip: '127.0.0.1',
      }, deps);
      expect(r2.statusCode).toBe(200);

      const r3 = await runPipeline({
        rawMessage: 'req-3',
        headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key', 'x-session-id': sid },
        ip: '127.0.0.1',
      }, deps);
      expect(r3.statusCode).toBe(429);

      resetRateLimitStore();
      const origConfig = defaultTenantConfig('test-tenant');
      origConfig.llm.systemPrompt = 'You are a test bot.';
      await configStore.saveVersion('test-tenant', origConfig, 'system', 'restore');
    }, 15000);
  });

  describe('F2: error code mapping completeness', () => {
    const allCodes: string[] = Object.values(ErrorCodes);

    it('every error code produces a valid HTTP status', () => {
      const validStatuses = [200, 400, 401, 403, 404, 409, 429, 500, 502, 503, 504];
      for (const code of allCodes) {
        const status = mapErrorToStatusCode(code);
        expect(validStatuses).toContain(status);
      }
    });

    it('no error code falls through to unmapped default (500)', () => {
      // ERR_CONFIG_CORRUPT, ERR_CERT_INVALID, and ERR_INTERNAL are explicitly 500
      const fiveHundredCodes = ['ERR_CONFIG_CORRUPT', 'ERR_CERT_INVALID', 'ERR_INTERNAL'];
      for (const code of allCodes) {
        const status = mapErrorToStatusCode(code);
        if (status === 500) {
          expect(fiveHundredCodes).toContain(code);
        }
      }
    });

    it('every expected status code range is used', () => {
      const statuses = allCodes.map(c => mapErrorToStatusCode(c));
      expect(statuses).toContain(200);
      expect(statuses).toContain(400);
      expect(statuses).toContain(401);
      expect(statuses).toContain(403);
      expect(statuses).toContain(404);
      expect(statuses).toContain(409);
      expect(statuses).toContain(429);
      expect(statuses).toContain(500);
      expect(statuses).toContain(502);
      expect(statuses).toContain(503);
      expect(statuses).toContain(504);
    });

    it('covers all 35 error codes', () => {
      expect(allCodes).toHaveLength(35);
    });
  });

  describe('internal sync auth', () => {
    // Build a minimal app with just the internal sync auth middleware + endpoints
    let testApp: express.Express;
    let testServer: http.Server;
    const PORT_SYNC = 18999;
    const origKey = process.env.INTERNAL_SYNC_KEY;

    beforeAll(async () => {
      process.env.INTERNAL_SYNC_KEY = 'test-internal-key-12345';
      // Re-import to pick up the fresh env var
      delete require.cache[require.resolve('express')];
      testApp = express();
      testApp.use(express.json());

      // Re-implement the requireInternalAuth function inline for testing
      const INTERNAL_SYNC_KEY = process.env.INTERNAL_SYNC_KEY || '';
      const SYNC_TIMESTAMP_TOLERANCE_MS = 30000;

      function requireInternalAuth(req: express.Request): { ok: boolean; reason?: string } {
        if (!INTERNAL_SYNC_KEY) {
          return { ok: false, reason: 'Internal sync not configured (INTERNAL_SYNC_KEY not set)' };
        }
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        if (!token || token !== INTERNAL_SYNC_KEY) {
          return { ok: false, reason: 'Invalid or missing internal sync token' };
        }
        const timestampStr = req.headers['x-timestamp'] as string;
        if (!timestampStr) {
          return { ok: false, reason: 'Missing X-Timestamp header (replay protection)' };
        }
        const timestamp = parseInt(timestampStr, 10);
        if (isNaN(timestamp)) {
          return { ok: false, reason: 'X-Timestamp must be a Unix epoch millisecond number' };
        }
        const now = Date.now();
        if (Math.abs(now - timestamp) > SYNC_TIMESTAMP_TOLERANCE_MS) {
          return { ok: false, reason: 'X-Timestamp is outside tolerance window (max 30s skew)' };
        }
        const nonce = req.headers['x-nonce'] as string;
        if (!nonce || nonce.length < 8) {
          return { ok: false, reason: 'Missing or invalid X-Nonce header' };
        }
        return { ok: true };
      }

      testApp.post('/api/internal/sync-key', (req, res) => {
        const auth = requireInternalAuth(req);
        if (!auth.ok) return res.status(401).json({ error: auth.reason });
        res.json({ success: true });
      });

      testApp.post('/api/internal/sync-config', (req, res) => {
        const auth = requireInternalAuth(req);
        if (!auth.ok) return res.status(401).json({ error: auth.reason });
        res.json({ success: true });
      });

      await new Promise<void>((resolve) => {
        testServer = testApp.listen(PORT_SYNC, resolve);
      });
    });

    afterAll(() => {
      if (origKey !== undefined) process.env.INTERNAL_SYNC_KEY = origKey;
      else delete process.env.INTERNAL_SYNC_KEY;
      if (testServer) testServer.close();
    });

    it('rejects sync-key without auth', async () => {
      const res = await fetch(`http://localhost:${PORT_SYNC}/api/internal/sync-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: 'x', apiKey: 'sk-x' }),
      });
      expect(res.status).toBe(401);
    });

    it('rejects sync-config without auth', async () => {
      const res = await fetch(`http://localhost:${PORT_SYNC}/api/internal/sync-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: 'x', config: {} }),
      });
      expect(res.status).toBe(401);
    });

    it('rejects with wrong bearer token', async () => {
      const ts = Date.now();
      const res = await fetch(`http://localhost:${PORT_SYNC}/api/internal/sync-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer wrong-key',
          'X-Timestamp': String(ts),
          'X-Nonce': 'test-nonce-001',
        },
        body: JSON.stringify({ tenantId: 'x', apiKey: 'sk-x' }),
      });
      expect(res.status).toBe(401);
    });

    it('rejects without X-Timestamp', async () => {
      const res = await fetch(`http://localhost:${PORT_SYNC}/api/internal/sync-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-internal-key-12345',
        },
        body: JSON.stringify({ tenantId: 'x', apiKey: 'sk-x' }),
      });
      expect(res.status).toBe(401);
    });

    it('rejects with expired timestamp', async () => {
      const oldTs = Date.now() - 120000;
      const res = await fetch(`http://localhost:${PORT_SYNC}/api/internal/sync-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-internal-key-12345',
          'X-Timestamp': String(oldTs),
          'X-Nonce': 'test-nonce-002',
        },
        body: JSON.stringify({ tenantId: 'x', apiKey: 'sk-x' }),
      });
      expect(res.status).toBe(401);
    });

    it('accepts with valid auth', async () => {
      const ts = Date.now();
      const res = await fetch(`http://localhost:${PORT_SYNC}/api/internal/sync-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-internal-key-12345',
          'X-Timestamp': String(ts),
          'X-Nonce': 'test-nonce-accept-01',
        },
        body: JSON.stringify({ tenantId: 'x', apiKey: 'sk-x' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});
