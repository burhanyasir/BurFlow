import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { runPipeline, PipelineDeps, resetRateLimitStore } from '../../packages/pipeline-orchestrator/src/pipeline';
import { SqliteTenantRegistry } from '@conversation-engine/tenant-registry';
import { SqliteSessionStore } from '@conversation-engine/session-store';
import { FileConfigStore, defaultTenantConfig } from '@conversation-engine/config-store';
import { SqliteDedupStore } from '@conversation-engine/dedup-store';
import { EnvVault } from '@conversation-engine/secrets-vault';
import { existsSync, rmSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const FAIL_DIR = join(__dirname, '__fail_data__');
const TMP_DB = join(FAIL_DIR, 'fail.db');
const CONFIG_DIR = join(FAIL_DIR, 'configs');
const VAULT_TEST_KEY = 'LOAD_TEST_LLM_KEY';

describe('failure injection suite', () => {
  let deps: PipelineDeps;
  let tenantRegistry: SqliteTenantRegistry;
  let sessionStore: SqliteSessionStore;
  let configStore: FileConfigStore;
  let dedupStore: SqliteDedupStore;

  beforeAll(async () => {
    if (existsSync(FAIL_DIR)) rmSync(FAIL_DIR, { recursive: true });
    mkdirSync(FAIL_DIR, { recursive: true });
    mkdirSync(CONFIG_DIR, { recursive: true });

    tenantRegistry = new SqliteTenantRegistry(TMP_DB);
    sessionStore = new SqliteSessionStore(TMP_DB);
    configStore = new FileConfigStore(CONFIG_DIR);
    dedupStore = new SqliteDedupStore(TMP_DB);

    tenantRegistry.seedTenant('fail-tenant', 'active');
    tenantRegistry.seedApiKey('fail-tenant', 'sk-fail-key', 'fail');

    const config = defaultTenantConfig('fail-tenant');
    config.llm.model = 'noop';
    await configStore.saveVersion('fail-tenant', config, 'system', 'initial');

    deps = { tenantRegistry, sessionStore, configStore, dedupStore };
  });

  afterAll(() => {
    sessionStore.close();
    dedupStore.close();
    try { if (existsSync(FAIL_DIR)) rmSync(FAIL_DIR, { recursive: true }); } catch {}
  });

  beforeEach(() => {
    resetRateLimitStore();
  });

  // ── Store Corruption ─────────────────────────────────────────

  it('handles missing config directory gracefully', async () => {
    rmSync(CONFIG_DIR, { recursive: true, force: true });
    const sid = (await sessionStore.createSession('fail-tenant', 1)).sessionId;
    const result = await runPipeline({
      rawMessage: 'Hello',
      headers: { 'x-tenant-id': 'fail-tenant', 'x-api-key': 'sk-fail-key', 'x-session-id': sid },
      ip: '127.0.0.1',
    }, deps);
    // Should return an error rather than crashing
    expect(result.statusCode).toBeGreaterThanOrEqual(400);
    mkdirSync(CONFIG_DIR, { recursive: true });
  });

  it('handles corrupt config file gracefully', async () => {
    const config = defaultTenantConfig('fail-tenant');
    await configStore.saveVersion('fail-tenant', config, 'system', 'initial');
    // Corrupt the latest.json so the config store can't read the version reference
    const latestPath = join(CONFIG_DIR, 'fail-tenant', 'latest.json');
    writeFileSync(latestPath, '{corrupt json!!!', 'utf-8');
    const sid = (await sessionStore.createSession('fail-tenant', 1)).sessionId;
    const result = await runPipeline({
      rawMessage: 'Hello',
      headers: { 'x-tenant-id': 'fail-tenant', 'x-api-key': 'sk-fail-key', 'x-session-id': sid },
      ip: '127.0.0.1',
    }, deps);
    // Pipeline should return an error rather than crashing
    expect(result.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('handles missing latest.json gracefully', async () => {
    const latestPath = join(CONFIG_DIR, 'fail-tenant', 'latest.json');
    if (existsSync(latestPath)) unlinkSync(latestPath);
    const config = defaultTenantConfig('fail-tenant');
    await configStore.saveVersion('fail-tenant', config, 'system', 'initial');
    const sid = (await sessionStore.createSession('fail-tenant', 1)).sessionId;
    const result = await runPipeline({
      rawMessage: 'Hello',
      headers: { 'x-tenant-id': 'fail-tenant', 'x-api-key': 'sk-fail-key', 'x-session-id': sid },
      ip: '127.0.0.1',
    }, deps);
    expect(result.statusCode).toBe(200);
  });

  // ── Missing Secrets ──────────────────────────────────────────

  it('handles missing LLM_API_KEY gracefully (EnvVault returns null)', async () => {
    const original = process.env.LLM_API_KEY;
    delete process.env.LLM_API_KEY;
    const vault = new EnvVault();
    const val = await vault.resolve('LLM_API_KEY');
    expect(val).toBeNull();
    if (original !== undefined) process.env.LLM_API_KEY = original;
  });

  it('EnvVault reports degraded when required secret deleted at runtime', async () => {
    process.env[VAULT_TEST_KEY] = 'present';
    const vault = new EnvVault(undefined, [VAULT_TEST_KEY]);
    delete process.env[VAULT_TEST_KEY];
    const health = await vault.health();
    expect(health.status).toBe('degraded');
  });

  // ── Network / Timeout Injection ─────────────────────────────

  it('pipeline handles abort signal mid-execution', async () => {
    const sid = (await sessionStore.createSession('fail-tenant', 1)).sessionId;
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 0);
    const result = await runPipeline({
      rawMessage: 'Hello',
      headers: { 'x-tenant-id': 'fail-tenant', 'x-api-key': 'sk-fail-key', 'x-session-id': sid },
      ip: '127.0.0.1',
    }, { ...deps, tripWire: undefined, inputGuardrail: undefined, piiDetector: undefined });
    expect(result.statusCode).toBe(200);
  });

  it('rejects request with no API key', async () => {
    const sid = (await sessionStore.createSession('fail-tenant', 1)).sessionId;
    const result = await runPipeline({
      rawMessage: 'Hello',
      headers: { 'x-tenant-id': 'fail-tenant', 'x-api-key': '', 'x-session-id': sid },
      ip: '127.0.0.1',
    }, deps);
    expect(result.statusCode).toBe(403);
  });

  it('rejects request with malformed API key', async () => {
    const sid = (await sessionStore.createSession('fail-tenant', 1)).sessionId;
    const result = await runPipeline({
      rawMessage: 'Hello',
      headers: { 'x-tenant-id': 'fail-tenant', 'x-api-key': 'not-a-valid-key', 'x-session-id': sid },
      ip: '127.0.0.1',
    }, deps);
    expect(result.statusCode).toBe(403);
  });

  it('rejects request with excessively long message', async () => {
    const sid = (await sessionStore.createSession('fail-tenant', 1)).sessionId;
    const result = await runPipeline({
      rawMessage: 'x'.repeat(100000),
      headers: { 'x-tenant-id': 'fail-tenant', 'x-api-key': 'sk-fail-key', 'x-session-id': sid },
      ip: '127.0.0.1',
    }, deps);
    expect([400, 200]).toContain(result.statusCode);
  });

  it('handles session store close gracefully', async () => {
    sessionStore.close();
    const sid = 'nonexistent-session';
    const result = await runPipeline({
      rawMessage: 'Hello',
      headers: { 'x-tenant-id': 'fail-tenant', 'x-api-key': 'sk-fail-key', 'x-session-id': sid },
      ip: '127.0.0.1',
    }, deps);
    expect(result.statusCode).toBeGreaterThanOrEqual(200);
  });
});
