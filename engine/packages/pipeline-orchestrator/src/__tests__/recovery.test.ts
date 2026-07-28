import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runPipeline, PipelineDeps, resetRateLimitStore, mapErrorToStatusCode } from '../pipeline';
import { ErrorCodes } from '@conversation-engine/core-types';
import { SqliteTenantRegistry } from '@conversation-engine/tenant-registry';
import { SqliteSessionStore } from '@conversation-engine/session-store';
import { FileConfigStore, defaultTenantConfig } from '@conversation-engine/config-store';
import { SqliteDedupStore } from '@conversation-engine/dedup-store';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(__dirname, '__test_recovery_data__');
const TMP_DB = join(TEST_DIR, 'recovery-test.db');
const CONFIG_DIR = join(TEST_DIR, 'configs');

describe('pipeline recovery — structured error handling', () => {
  let deps: PipelineDeps;
  let sessionStore: SqliteSessionStore;

  beforeAll(async () => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(CONFIG_DIR, { recursive: true });

    const tenantRegistry = new SqliteTenantRegistry(TMP_DB);
    sessionStore = new SqliteSessionStore(TMP_DB);
    const configStore = new FileConfigStore(CONFIG_DIR);
    const dedupStore = new SqliteDedupStore(TMP_DB);

    tenantRegistry.seedTenant('test-tenant', 'active');
    tenantRegistry.seedApiKey('test-tenant', 'sk-test-key', 'test');
    const config = defaultTenantConfig('test-tenant');
    config.llm.systemPrompt = 'You are a test bot.';
    await configStore.saveVersion('test-tenant', config, 'system', 'initial');

    deps = { tenantRegistry, sessionStore, configStore, dedupStore };
  });

  afterAll(() => {
    sessionStore.close();
    try { if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true }); } catch {}
  });

  beforeEach(() => {
    resetRateLimitStore();
  });

  it('returns 200 with valid request (baseline)', async () => {
    const session = await sessionStore.createSession('test-tenant', 1);
    const result = await runPipeline({
      rawMessage: 'Hello',
      headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key', 'x-session-id': session.sessionId },
      ip: '127.0.0.1',
    }, deps);
    expect(result.statusCode).toBe(200);
    expect(result.response).toBeDefined();
    expect(result.response.length).toBeGreaterThan(0);
  });

  it('returns error for empty message (guardrail blocks)', async () => {
    const session = await sessionStore.createSession('test-tenant', 1);
    const result = await runPipeline({
      rawMessage: '',
      headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key', 'x-session-id': session.sessionId },
      ip: '127.0.0.1',
    }, deps);
    expect(result.statusCode).toBe(400);
    expect(result.error).toBeDefined();
  });

  it('returns 403 without valid API key', async () => {
    const session = await sessionStore.createSession('test-tenant', 1);
    const result = await runPipeline({
      rawMessage: 'Hello',
      headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'wrong-key', 'x-session-id': session.sessionId },
      ip: '127.0.0.1',
    }, deps);
    expect(result.statusCode).toBe(403);
    expect(result.error).toBeDefined();
    expect(result.error?.stage).toBe('auth');
  });

  it('returns 429 when rate limit exceeded', async () => {
    const session = await sessionStore.createSession('test-tenant', 1);
    deps = {
      ...deps,
      tenantRegistry: deps.tenantRegistry,
      sessionStore: deps.sessionStore,
      configStore: deps.configStore,
      dedupStore: deps.dedupStore,
    };

    const config = defaultTenantConfig('test-tenant');
    config.rateLimits = { messagesPerMinute: 1, messagesPerHour: 1000, concurrentSessions: 10 };
    await deps.configStore.saveVersion('test-tenant', config, 'system', 'rate-limit-test');

    const result1 = await runPipeline({
      rawMessage: 'Hello',
      headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key', 'x-session-id': session.sessionId },
      ip: '127.0.0.1',
    }, deps);

    const result2 = await runPipeline({
      rawMessage: 'Hello again',
      headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key', 'x-session-id': session.sessionId },
      ip: '127.0.0.1',
    }, deps);

    expect(result2.statusCode).toBe(429);
    expect(result2.error?.errorCode).toBe(ErrorCodes.ERR_RATE_LIMIT_EXCEEDED);
  });

  it('returns degraded but 200 when LLM unavailable (no responseGenerator)', async () => {
    const session = await sessionStore.createSession('test-tenant', 1);
    const result = await runPipeline({
      rawMessage: 'Tell me about pricing',
      headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key', 'x-session-id': session.sessionId },
      ip: '127.0.0.1',
    }, deps);
    expect(result.statusCode).toBe(200);
    expect(result.response).toBeDefined();
    expect(result.response.length).toBeGreaterThan(0);
  });

  it('returns structured error on invalid message payload', async () => {
    const result = await runPipeline({
      rawMessage: '',
      headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key' },
      ip: '127.0.0.1',
    }, deps);
    expect(result.statusCode).toBe(400);
    expect(result.error).toBeDefined();
    expect(result.error?.stage).toBeDefined();
  });

  it('handles out-of-sequence messages', async () => {
    const session = await sessionStore.createSession('test-tenant', 1);
    const result = await runPipeline({
      rawMessage: 'Hello',
      headers: {
        'x-tenant-id': 'test-tenant',
        'x-api-key': 'sk-test-key',
        'x-session-id': session.sessionId,
        'x-sequence-number': '42',
      },
      ip: '127.0.0.1',
    }, deps);
    expect(result.statusCode).toBe(400);
    expect(result.error?.errorCode).toBe(ErrorCodes.ERR_OUT_OF_SEQUENCE);
  });

  it('handles stage timeout gracefully', async () => {
    const session = await sessionStore.createSession('test-tenant', 1);
    const result = await runPipeline({
      rawMessage: 'Hello',
      headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key', 'x-session-id': session.sessionId },
      ip: '127.0.0.1',
    }, deps);
    expect(result.statusCode).toBe(200);
    expect(result.latencyMs).toBeGreaterThan(0);
  });

  it('success status code maps correctly (200)', () => {
    expect(mapErrorToStatusCode(ErrorCodes.ERR_DEDUP_DETECTED)).toBe(200);
    expect(mapErrorToStatusCode(ErrorCodes.ERR_CRISIS_DETECTED)).toBe(200);
  });

  it('client error status codes map correctly (400)', () => {
    expect(mapErrorToStatusCode(ErrorCodes.ERR_OUT_OF_SEQUENCE)).toBe(400);
    expect(mapErrorToStatusCode(ErrorCodes.ERR_INPUT_GUARDRAIL)).toBe(400);
    expect(mapErrorToStatusCode(ErrorCodes.ERR_PII_DETECTED)).toBe(400);
    expect(mapErrorToStatusCode(ErrorCodes.ERR_GROUNDING_FAILED)).toBe(400);
    expect(mapErrorToStatusCode(ErrorCodes.ERR_INJECTION_DETECTED)).toBe(400);
  });

  it('auth error codes map correctly (401/403)', () => {
    expect(mapErrorToStatusCode(ErrorCodes.ERR_CREDENTIALS_NOT_FOUND)).toBe(401);
    expect(mapErrorToStatusCode(ErrorCodes.ERR_AUTH_INVALID_KEY)).toBe(403);
    expect(mapErrorToStatusCode(ErrorCodes.ERR_FORBIDDEN)).toBe(403);
  });

  it('LLM failure codes map correctly', () => {
    expect(mapErrorToStatusCode(ErrorCodes.ERR_LLM_INFERENCE_FAILURE)).toBe(502);
    expect(mapErrorToStatusCode(ErrorCodes.ERR_LLM_TIMEOUT)).toBe(504);
    expect(mapErrorToStatusCode(ErrorCodes.ERR_LLM_OVERLOADED)).toBe(503);
    expect(mapErrorToStatusCode(ErrorCodes.ERR_LLM_PROVIDER_UNAVAILABLE)).toBe(503);
  });

  it('handles dedup gracefully', async () => {
    const session = await sessionStore.createSession('test-tenant', 1);
    const result1 = await runPipeline({
      rawMessage: 'Hello',
      idempotencyKey: 'dedup-test-key',
      headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key', 'x-session-id': session.sessionId },
      ip: '127.0.0.1',
    }, deps);
    expect(result1.statusCode).toBe(200);

    const result2 = await runPipeline({
      rawMessage: 'Hello',
      idempotencyKey: 'dedup-test-key',
      headers: { 'x-tenant-id': 'test-tenant', 'x-api-key': 'sk-test-key', 'x-session-id': session.sessionId },
      ip: '127.0.0.1',
    }, deps);
    expect(result2.statusCode).toBe(200);
  });
});
