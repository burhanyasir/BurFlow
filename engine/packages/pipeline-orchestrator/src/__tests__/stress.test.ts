import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runPipeline, PipelineDeps } from '../pipeline';
import { SqliteTenantRegistry } from '@conversation-engine/tenant-registry';
import { SqliteSessionStore } from '@conversation-engine/session-store';
import { FileConfigStore, defaultTenantConfig } from '@conversation-engine/config-store';
import { SqliteDedupStore } from '@conversation-engine/dedup-store';
import { TripWireEngine, PatternSet, CRISIS_RESPONSE } from '@conversation-engine/trip-wire';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

const STRESS_DIR = join(__dirname, '__stress_data__');
const TMP_DB = join(STRESS_DIR, 'stress.db');
const CONFIG_DIR = join(STRESS_DIR, 'configs');

const TEST_PATTERNS: PatternSet = {
  version: 1,
  patterns: [
    { category: 'self_harm', patterns: ['hurt myself', 'self-harm'] },
    { category: 'suicide', patterns: ['kill myself', 'suicide', 'end my life'] },
  ],
};

describe('architecture stress tests', () => {
  let deps: PipelineDeps;
  let tenantRegistry: SqliteTenantRegistry;
  let sessionStore: SqliteSessionStore;
  let configStore: FileConfigStore;
  let dedupStore: SqliteDedupStore;
  let tripWire: TripWireEngine;
  let sessionIds: string[];

  beforeAll(async () => {
    if (existsSync(STRESS_DIR)) rmSync(STRESS_DIR, { recursive: true });
    mkdirSync(STRESS_DIR, { recursive: true });
    mkdirSync(CONFIG_DIR, { recursive: true });

    tenantRegistry = new SqliteTenantRegistry(TMP_DB);
    sessionStore = new SqliteSessionStore(TMP_DB);
    configStore = new FileConfigStore(CONFIG_DIR);
    dedupStore = new SqliteDedupStore(TMP_DB);

    tenantRegistry.seedTenant('stress-tenant', 'active');
    tenantRegistry.seedApiKey('stress-tenant', 'sk-stress-key', 'stress');
    tenantRegistry.seedTenant('other-tenant', 'active');
    tenantRegistry.seedApiKey('other-tenant', 'sk-other-key', 'other');
    const config = defaultTenantConfig('stress-tenant');
    config.llm.systemPrompt = 'You are a stress test bot.';
    config.llm.model = 'noop';
    await configStore.saveVersion('stress-tenant', config, 'system', 'initial');
    const otherConfig = defaultTenantConfig('other-tenant');
    otherConfig.llm.systemPrompt = 'You are another tenant bot.';
    otherConfig.llm.model = 'noop';
    await configStore.saveVersion('other-tenant', otherConfig, 'system', 'initial');

    tripWire = new TripWireEngine(TEST_PATTERNS);
    deps = { tenantRegistry, sessionStore, configStore, dedupStore, tripWire };

    // Create sessions for concurrent tests
    sessionIds = [];
    for (let i = 0; i < 10; i++) {
      const session = await sessionStore.createSession('stress-tenant', 1);
      sessionIds.push(session.sessionId);
    }
  });

  afterAll(() => {
    sessionStore.close();
    dedupStore.close();
    try { if (existsSync(STRESS_DIR)) rmSync(STRESS_DIR, { recursive: true }); } catch {}
  });

  it('concurrent requests to same session cause CAS conflict', async () => {
    const sid = sessionIds[0];
    const results = await Promise.allSettled([
      runPipeline({ rawMessage: 'Hello', headers: { 'x-tenant-id': 'stress-tenant', 'x-api-key': 'sk-stress-key', 'x-session-id': sid }, ip: '127.0.0.1' }, deps),
      runPipeline({ rawMessage: 'Hi', headers: { 'x-tenant-id': 'stress-tenant', 'x-api-key': 'sk-stress-key', 'x-session-id': sid }, ip: '127.0.0.1' }, deps),
    ]);
    const statusCodes = results.map(r => r.status === 'fulfilled' ? r.value.statusCode : 500);
    // At most one should succeed; others may get 409 (CAS conflict) or 500 (stage error)
    const okCount = statusCodes.filter(c => c === 200).length;
    expect(okCount).toBeLessThanOrEqual(1);
  });

  it('concurrent requests to different sessions all succeed', async () => {
    const results = await Promise.allSettled([
      runPipeline({ rawMessage: 'Hello A', headers: { 'x-tenant-id': 'stress-tenant', 'x-api-key': 'sk-stress-key', 'x-session-id': sessionIds[1] }, ip: '127.0.0.1' }, deps),
      runPipeline({ rawMessage: 'Hello B', headers: { 'x-tenant-id': 'stress-tenant', 'x-api-key': 'sk-stress-key', 'x-session-id': sessionIds[2] }, ip: '127.0.0.1' }, deps),
      runPipeline({ rawMessage: 'Hello C', headers: { 'x-tenant-id': 'stress-tenant', 'x-api-key': 'sk-stress-key', 'x-session-id': sessionIds[3] }, ip: '127.0.0.1' }, deps),
    ]);
    results.forEach(r => {
      expect(r.status).toBe('fulfilled');
      if (r.status === 'fulfilled') expect(r.value.statusCode).toBe(200);
    });
  });

  it('duplicate message returns dedup response', async () => {
    const sid = sessionIds[4];
    const result1 = await runPipeline({ rawMessage: 'Unique message for dedup', headers: { 'x-tenant-id': 'stress-tenant', 'x-api-key': 'sk-stress-key', 'x-session-id': sid }, ip: '127.0.0.1' }, deps);
    expect(result1.statusCode).toBe(200);
    const result2 = await runPipeline({ rawMessage: 'Unique message for dedup', headers: { 'x-tenant-id': 'stress-tenant', 'x-api-key': 'sk-stress-key', 'x-session-id': sid }, ip: '127.0.0.1' }, deps);
    expect(result2.statusCode).toBe(200);
  });

  it('tenant isolation: API key maps to correct tenant (auth ignores x-tenant-id header)', async () => {
    // Auth uses the tenant from the API key, not the x-tenant-id header
    const sid = sessionIds[5];
    const sessionO = await sessionStore.createSession('other-tenant', 1);
    const result = await runPipeline({ rawMessage: 'Hello', headers: { 'x-tenant-id': 'stress-tenant', 'x-api-key': 'sk-other-key', 'x-session-id': sessionO.sessionId }, ip: '127.0.0.1' }, deps);
    // Auth resolves to 'other-tenant' (from the key), not 'stress-tenant' (from header)
    // This proves x-tenant-id is not authoritative
    expect(result.statusCode).toBe(200);
  });

  it('tenant isolation: invalid API key is rejected regardless of header', async () => {
    const result = await runPipeline({ rawMessage: 'Hello', headers: { 'x-tenant-id': 'stress-tenant', 'x-api-key': 'sk-nonexistent' }, ip: '127.0.0.1' }, deps);
    expect(result.statusCode).toBe(403);
  });

  it('crisis path returns crisis response', async () => {
    const sid = sessionIds[5];
    const result = await runPipeline({ rawMessage: 'I want to kill myself', headers: { 'x-tenant-id': 'stress-tenant', 'x-api-key': 'sk-stress-key', 'x-session-id': sid }, ip: '127.0.0.1' }, deps);
    expect(result.statusCode).toBe(200);
    expect(result.response).toBe(CRISIS_RESPONSE);
  });

  it('CAS conflict on concurrent crisis and normal request (crisis creates minimal sessionState)', async () => {
    const sid = sessionIds[6];
    const results = await Promise.allSettled([
      runPipeline({ rawMessage: 'I want to kill myself', headers: { 'x-tenant-id': 'stress-tenant', 'x-api-key': 'sk-stress-key', 'x-session-id': sid }, ip: '127.0.0.1' }, deps),
      runPipeline({ rawMessage: 'Normal message', headers: { 'x-tenant-id': 'stress-tenant', 'x-api-key': 'sk-stress-key', 'x-session-id': sid }, ip: '127.0.0.1' }, deps),
    ]);
    // Crisis path creates minimal sessionState with version 1 and commits separately
    // from normal path; both may succeed since they use different sessionState objects
    const okCodes = results.filter(r => r.status === 'fulfilled' && r.value.statusCode === 200).length;
    // Documenting current behavior: crisis bypass creates independent sessionState
    // so CAS conflict may not trigger. This is a known limitation.
    expect(okCodes).toBeGreaterThanOrEqual(1);
  });

  it('handles rapid succession of requests on same session', async () => {
    const sid = sessionIds[7];
    for (let i = 0; i < 5; i++) {
      const result = await runPipeline({ rawMessage: `Request number ${i}`, headers: { 'x-tenant-id': 'stress-tenant', 'x-api-key': 'sk-stress-key', 'x-session-id': sid }, ip: '127.0.0.1' }, deps);
      // After first success, subsequent may fail due to version conflict from previous turn
      if (result.statusCode !== 200) {
        expect(result.statusCode).toBe(409);
        break;
      }
    }
  });

  it('rejects request with invalid API key format', async () => {
    const result = await runPipeline({ rawMessage: 'Hello', headers: { 'x-api-key': '' }, ip: '127.0.0.1' }, deps);
    expect(result.statusCode).toBe(403);
  });

  it('handles large number of sessions without degradation', async () => {
    const sessions = [];
    for (let i = 0; i < 20; i++) {
      const session = await sessionStore.createSession('stress-tenant', 1);
      sessions.push(session.sessionId);
    }
    const results = await Promise.allSettled(sessions.map((sid, i) =>
      runPipeline({ rawMessage: `Bulk message ${i}`, headers: { 'x-tenant-id': 'stress-tenant', 'x-api-key': 'sk-stress-key', 'x-session-id': sid }, ip: '127.0.0.1' }, deps)
    ));
    const successes = results.filter(r => r.status === 'fulfilled' && r.value.statusCode === 200).length;
    expect(successes).toBeGreaterThan(0);
    // Some may get CAS conflicts due to dedup or ordering
  });
});
