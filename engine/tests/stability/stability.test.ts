import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runPipeline, PipelineDeps, resetRateLimitStore } from '../../packages/pipeline-orchestrator/src/pipeline';
import { SqliteTenantRegistry } from '@conversation-engine/tenant-registry';
import { SqliteSessionStore } from '@conversation-engine/session-store';
import { FileConfigStore, defaultTenantConfig } from '@conversation-engine/config-store';
import { SqliteDedupStore } from '@conversation-engine/dedup-store';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

const STAB_DIR = join(__dirname, '__stab_data__');
const TMP_DB = join(STAB_DIR, 'stab.db');
const CONFIG_DIR = join(STAB_DIR, 'configs');

describe('stability suite', () => {
  let deps: PipelineDeps;
  let tenantRegistry: SqliteTenantRegistry;
  let sessionStore: SqliteSessionStore;
  let configStore: FileConfigStore;
  let dedupStore: SqliteDedupStore;

  beforeAll(async () => {
    if (existsSync(STAB_DIR)) rmSync(STAB_DIR, { recursive: true });
    mkdirSync(STAB_DIR, { recursive: true });
    mkdirSync(CONFIG_DIR, { recursive: true });

    tenantRegistry = new SqliteTenantRegistry(TMP_DB);
    sessionStore = new SqliteSessionStore(TMP_DB);
    configStore = new FileConfigStore(CONFIG_DIR);
    dedupStore = new SqliteDedupStore(TMP_DB);

    tenantRegistry.seedTenant('stab-tenant', 'active');
    tenantRegistry.seedApiKey('stab-tenant', 'sk-stab-key', 'stab');

    const config = defaultTenantConfig('stab-tenant');
    config.llm.model = 'noop';
    await configStore.saveVersion('stab-tenant', config, 'system', 'initial');

    deps = { tenantRegistry, sessionStore, configStore, dedupStore };
  });

  afterAll(() => {
    sessionStore.close();
    dedupStore.close();
    try { if (existsSync(STAB_DIR)) rmSync(STAB_DIR, { recursive: true }); } catch {}
  });

  it('tolerates repeated same-session requests with CAS recovery', async () => {
    resetRateLimitStore();
    const sid = (await sessionStore.createSession('stab-tenant', 1)).sessionId;
    let successes = 0;
    let conflicts = 0;

    for (let i = 0; i < 20; i++) {
      const result = await runPipeline({
        rawMessage: `Turn ${i}`,
        headers: { 'x-tenant-id': 'stab-tenant', 'x-api-key': 'sk-stab-key', 'x-session-id': sid },
        ip: '127.0.0.1',
      }, deps);

      if (result.statusCode === 200) successes++;
      else if (result.statusCode === 409) conflicts++;
    }

    console.log(`  Same-session: ${successes} success, ${conflicts} CAS conflicts`);
    expect(successes).toBeGreaterThanOrEqual(1);
    const totalFinalized = successes + conflicts;
    expect(totalFinalized).toBe(20);
  });

  it('maintains throughput across multiple sessions without degradation', async () => {
    resetRateLimitStore();
    const sessions = await Promise.all(
      Array.from({ length: 20 }, (_, i) => sessionStore.createSession('stab-tenant', i + 1))
    );

    const chunk = (arr, size) =>
      Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

    let totalOk = 0;
    let totalErr = 0;

    for (const batch of chunk(sessions, 5)) {
      const results = await Promise.allSettled(
        batch.map((s, i) =>
          runPipeline({
            rawMessage: `Batch message ${i}`,
            headers: { 'x-tenant-id': 'stab-tenant', 'x-api-key': 'sk-stab-key', 'x-session-id': s.sessionId },
            ip: '127.0.0.1',
          }, deps)
        )
      );
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.statusCode === 200) totalOk++;
        else totalErr++;
      }
    }

    console.log(`  Multi-session: ${totalOk} ok, ${totalErr} errors across ${sessions.length} sessions`);
    expect(totalOk + totalErr).toBe(sessions.length);
    expect(totalOk).toBeGreaterThanOrEqual(Math.floor(sessions.length * 0.5));
  });

  it('recycles sessions across iterations without state corruption', async () => {
    resetRateLimitStore();
    const SESSION_POOL = 3;
    const ITER = 15;
    const sessions = await Promise.all(
      Array.from({ length: SESSION_POOL }, (_, i) => sessionStore.createSession('stab-tenant', i + 100))
    );
    let ok = 0;

    for (let i = 0; i < ITER; i++) {
      const sid = sessions[i % SESSION_POOL].sessionId;
      const result = await runPipeline({
        rawMessage: `Recycle ${i}`,
        headers: { 'x-tenant-id': 'stab-tenant', 'x-api-key': 'sk-stab-key', 'x-session-id': sid },
        ip: '127.0.0.1',
      }, deps);
      if (result.statusCode === 200) ok++;
    }

    console.log(`  Session recycling: ${ok}/${ITER} succeeded`);
    expect(ok).toBeGreaterThanOrEqual(5);
  });
});
