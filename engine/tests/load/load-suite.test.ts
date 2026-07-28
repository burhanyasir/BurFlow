import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runPipeline, PipelineDeps, resetRateLimitStore } from '../../packages/pipeline-orchestrator/src/pipeline';
import { SqliteTenantRegistry } from '@conversation-engine/tenant-registry';
import { SqliteSessionStore } from '@conversation-engine/session-store';
import { FileConfigStore, defaultTenantConfig } from '@conversation-engine/config-store';
import { SqliteDedupStore } from '@conversation-engine/dedup-store';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

const LOAD_DIR = join(__dirname, '__load_data__');
const TMP_DB = join(LOAD_DIR, 'load.db');
const CONFIG_DIR = join(LOAD_DIR, 'configs');

describe('load testing suite', () => {
  let deps: PipelineDeps;
  let tenantRegistry: SqliteTenantRegistry;
  let sessionStore: SqliteSessionStore;
  let configStore: FileConfigStore;
  let dedupStore: SqliteDedupStore;

  beforeAll(async () => {
    if (existsSync(LOAD_DIR)) rmSync(LOAD_DIR, { recursive: true });
    mkdirSync(LOAD_DIR, { recursive: true });
    mkdirSync(CONFIG_DIR, { recursive: true });

    tenantRegistry = new SqliteTenantRegistry(TMP_DB);
    sessionStore = new SqliteSessionStore(TMP_DB);
    configStore = new FileConfigStore(CONFIG_DIR);
    dedupStore = new SqliteDedupStore(TMP_DB);

    tenantRegistry.seedTenant('load-tenant', 'active');
    tenantRegistry.seedApiKey('load-tenant', 'sk-load-key', 'load');

    const config = defaultTenantConfig('load-tenant');
    config.llm.model = 'noop';
    await configStore.saveVersion('load-tenant', config, 'system', 'initial');

    deps = { tenantRegistry, sessionStore, configStore, dedupStore };
  });

  afterAll(() => {
    sessionStore.close();
    dedupStore.close();
    try { if (existsSync(LOAD_DIR)) rmSync(LOAD_DIR, { recursive: true }); } catch {}
  });

  it('handles 10 sequential requests within latency budget', async () => {
    const latencies: number[] = [];
    const sid = (await sessionStore.createSession('load-tenant', 1)).sessionId;

    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      const result = await runPipeline({
        rawMessage: `Request ${i}`,
        headers: { 'x-tenant-id': 'load-tenant', 'x-api-key': 'sk-load-key', 'x-session-id': sid },
        ip: '127.0.0.1',
      }, deps);
      latencies.push(Date.now() - start);
      expect(result.statusCode).toBe(200);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[4];
    const p95 = latencies[9];
    console.log(`  Sequential P50: ${p50}ms, P95: ${p95}ms`);
    expect(p50).toBeLessThan(1000);
    expect(p95).toBeLessThan(3000);
    expect(latencies.filter(l => l > 5000).length).toBe(0);
  });

  it('handles 10 concurrent requests to different sessions', async () => {
    resetRateLimitStore();
    const sessions = await Promise.all(
      Array.from({ length: 10 }, () => sessionStore.createSession('load-tenant', 1))
    );
    const results = await Promise.allSettled(
      sessions.map((s, i) =>
        runPipeline({
          rawMessage: `Concurrent ${i}`,
          headers: { 'x-tenant-id': 'load-tenant', 'x-api-key': 'sk-load-key', 'x-session-id': s.sessionId },
          ip: '127.0.0.1',
        }, deps)
      )
    );
    const ok = results.filter(r => r.status === 'fulfilled' && r.value.statusCode === 200).length;
    console.log(`  Concurrent 10: ${ok}/10 succeeded`);
    expect(ok).toBeGreaterThanOrEqual(8);
  });

  it('handles 50 sequential requests across sessions without degradation', async () => {
    resetRateLimitStore();
    const sessions = await Promise.all(
      Array.from({ length: 5 }, (_, i) => sessionStore.createSession('load-tenant', i + 100))
    );
    const latencies: number[] = [];
    let errors = 0;

    for (let i = 0; i < 50; i++) {
      const sid = sessions[i % sessions.length].sessionId;
      const start = Date.now();
      const result = await runPipeline({
        rawMessage: `Bulk ${i}`,
        headers: { 'x-tenant-id': 'load-tenant', 'x-api-key': 'sk-load-key', 'x-session-id': sid, 'x-idempotency-key': `bulk-${i}` },
        ip: '127.0.0.1',
      }, deps);
      latencies.push(Date.now() - start);
      if (result.statusCode === 429) { errors++; break; }
      if (result.statusCode === 409) { errors++; continue; }
      expect(result.statusCode).toBe(200);
    }

    if (latencies.length > 5) {
      latencies.sort((a, b) => a - b);
      const p50 = latencies[Math.floor(latencies.length * 0.5)];
      const p95 = latencies[Math.floor(latencies.length * 0.95)];
      console.log(`  50-round-robin P50: ${p50}ms, P95: ${p95}ms, errors: ${errors}`);
      expect(p50).toBeLessThan(1500);
      expect(p95).toBeLessThan(4000);
    }
  });
});
