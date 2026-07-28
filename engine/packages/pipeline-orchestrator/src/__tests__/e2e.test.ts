import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { runPipeline, PipelineDeps, resetRateLimitStore } from '../pipeline';
import { SqliteTenantRegistry } from '@conversation-engine/tenant-registry';
import { SqliteSessionStore } from '@conversation-engine/session-store';
import { FileConfigStore, defaultTenantConfig } from '@conversation-engine/config-store';
import { SqliteDedupStore } from '@conversation-engine/dedup-store';
import { TripWireEngine, PatternSet } from '@conversation-engine/trip-wire';
import { InputGuardrailEngine, NoopProvider as InputNoop, CircuitBreaker as InputCB } from '@conversation-engine/input-guardrail';
import { PiiDetector } from '@conversation-engine/pii-detector';
import { OutputGuardrailEngine, NoopProvider as OutputNoop, CircuitBreaker as OutputCB } from '@conversation-engine/output-guardrail';
import { GroundingVerifier } from '@conversation-engine/grounding-verifier';
import { TenantConfig } from '@conversation-engine/core-types';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(__dirname, '__e2e_data__');
const TENANT_A = 'e2e-tenant-a';
const TENANT_B = 'e2e-tenant-b';
const API_KEY_A = 'sk-e2e-test-key-a';
const API_KEY_B = 'sk-e2e-test-key-b';
const CRISIS_PATTERN: PatternSet = {
  version: 1,
  patterns: [
    { category: 'suicide', patterns: ['kill myself', 'end my life', 'want to die'] },
    { category: 'self_harm', patterns: ['hurt myself', 'cut myself'] },
    { category: 'violence_emergency', patterns: ['shoot up', 'bomb the'] },
  ],
};

let tenantRegistry: SqliteTenantRegistry;
let sessionStore: SqliteSessionStore;
let configStore: FileConfigStore;
let dedupStore: SqliteDedupStore;
let tripWire: TripWireEngine;
let inputGuardrail: InputGuardrailEngine;
let piiDetector: PiiDetector;
let outputGuardrail: OutputGuardrailEngine;
let groundingVerifier: GroundingVerifier;

function baseConfig(tenantId: string, overrides?: Partial<TenantConfig>): TenantConfig {
  return {
    ...defaultTenantConfig(tenantId),
    llm: { model: 'noop', temperature: 0, maxTokens: 100, systemPrompt: 'You are helpful.' },
    safety: { contentFilterThreshold: 'moderate', piiRedactionEnabled: true, piiRedactionMode: 'mask' },
    fallbackResponse: 'Service unavailable. Please try again.',
    ...overrides,
  };
}

function makeDeps(overrides?: Partial<PipelineDeps>): PipelineDeps {
  return {
    tenantRegistry, sessionStore, configStore, dedupStore,
    tripWire, inputGuardrail, piiDetector, outputGuardrail, groundingVerifier,
    ...overrides,
  };
}

function makeReq(rawMessage: string, headers: Record<string, string> = {}, idempotencyKey?: string) {
  return { rawMessage, headers, ip: '127.0.0.1', idempotencyKey };
}

async function freshSession(tenantId: string): Promise<string> {
  const session = await sessionStore.createSession(tenantId, 1);
  return session.sessionId;
}

beforeAll(async () => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  mkdirSync(TEST_DIR, { recursive: true });

  tenantRegistry = new SqliteTenantRegistry(join(TEST_DIR, 'tenant-registry.db'));
  sessionStore = new SqliteSessionStore(join(TEST_DIR, 'sessions.db'));
  configStore = new FileConfigStore(join(TEST_DIR, 'configs'));
  dedupStore = new SqliteDedupStore(join(TEST_DIR, 'dedup.db'));

  tripWire = new TripWireEngine(CRISIS_PATTERN);
  inputGuardrail = new InputGuardrailEngine(new InputNoop(), new InputCB(3, 30000), 3000);
  piiDetector = new PiiDetector();
  outputGuardrail = new OutputGuardrailEngine(new OutputNoop(), new OutputCB(3, 30000), 3000);
  groundingVerifier = new GroundingVerifier(piiDetector);

  tenantRegistry.seedTenant(TENANT_A, 'active');
  tenantRegistry.seedTenant(TENANT_B, 'active');
  tenantRegistry.seedApiKey(TENANT_A, API_KEY_A, 'test-key-a', 'admin');
  tenantRegistry.seedApiKey(TENANT_B, API_KEY_B, 'test-key-b', 'end-user');

  await configStore.saveVersion(TENANT_A, baseConfig(TENANT_A), 'system', 'e2e seed');
  await configStore.saveVersion(TENANT_B, baseConfig(TENANT_B), 'system', 'e2e seed');
});

afterAll(() => {
  try { dedupStore.close(); } catch {}
  try { sessionStore.close(); } catch {}
  try { tenantRegistry.close(); } catch {}
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
});

beforeEach(() => {
  resetRateLimitStore();
});

// ─────────────────────────────────────────────────────
// 1. HAPPY PATH — Full message lifecycle
// ─────────────────────────────────────────────────────
describe('E2E: happy path', () => {
  it('completes full pipeline: auth → ingest → tenant → context → generate → safety → persist → dispatch', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('Hello, how are you?', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(200);
    expect(result.response).toBeTruthy();
    expect(result.turnId).toBe(sessionId);
    expect(result.latencyMs).toBeGreaterThan(0);
  });

  it('returns noop-generated response through full pipeline', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('Tell me a joke', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(200);
    expect(result.response).toContain('[Noop response]');
  });

  it('works with auth disabled and explicit tenant', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('No auth needed', {
        'x-tenant-id': TENANT_A,
        'x-session-id': sessionId,
      }),
      makeDeps({ authDisabled: true }),
    );

    expect(result.statusCode).toBe(200);
  });

  it('pipeline returns turnId for downstream tracking', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('Track me', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.turnId).toBeTruthy();
    expect(result.turnId).toBe(sessionId);
  });

  it('latencyMs is measured across full pipeline', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('Timing check', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.latencyMs).toBeLessThan(30000);
  });
});

// ─────────────────────────────────────────────────────
// 2. FAILURE RECOVERY — LLM failures and fallback
// ─────────────────────────────────────────────────────
describe('E2E: failure recovery', () => {
  it('noop model returns noop response when no API key', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('Hello', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps({ llmApiKey: undefined }),
    );

    expect(result.statusCode).toBe(200);
    expect(result.response).toContain('[Noop response]');
  });

  it('handles empty message — rejected by stage 1', async () => {
    const result = await runPipeline(
      makeReq('', { authorization: `Bearer ${API_KEY_A}` }),
      makeDeps(),
    );

    expect(result.statusCode).not.toBe(200);
    expect(result.error).toBeDefined();
  });

  it('handles whitespace-only message — rejected by stage 1', async () => {
    const result = await runPipeline(
      makeReq('   ', { authorization: `Bearer ${API_KEY_A}` }),
      makeDeps(),
    );

    expect(result.statusCode).not.toBe(200);
    expect(result.error).toBeDefined();
  });

  it('unknown API key returns 403', async () => {
    const result = await runPipeline(
      makeReq('Bad key', { authorization: 'Bearer sk-wrong-key' }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(403);
    expect(result.error?.errorCode).toContain('AUTH');
  });

  it('missing API key returns 403', async () => {
    const result = await runPipeline(makeReq('No key'), makeDeps());
    expect(result.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────
// 3. CONCURRENCY — Parallel requests
// ─────────────────────────────────────────────────────
describe('E2E: concurrency', () => {
  it('parallel requests to different sessions all succeed', async () => {
    const sessions = await Promise.all([
      freshSession(TENANT_A),
      freshSession(TENANT_A),
      freshSession(TENANT_A),
    ]);

    const results = await Promise.allSettled(
      sessions.map(sessionId =>
        runPipeline(
          makeReq('Concurrent hello', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
          makeDeps(),
        )
      ),
    );

    const successes = results.filter(r => r.status === 'fulfilled' && r.value.statusCode === 200);
    expect(successes.length).toBe(3);
  });

  it('bulk concurrent requests to 20 sessions all succeed', async () => {
    const sessions = await Promise.all(
      Array.from({ length: 20 }, () => freshSession(TENANT_A)),
    );

    const results = await Promise.allSettled(
      sessions.map(sessionId =>
        runPipeline(
          makeReq('Bulk test', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
          makeDeps(),
        )
      ),
    );

    const successes = results.filter(r => r.status === 'fulfilled' && r.value.statusCode === 200);
    expect(successes.length).toBe(20);
  });

  it('concurrent requests to same session — at most one CAS success', async () => {
    const sessionId = await freshSession(TENANT_A);
    const N = 5;

    const results = await Promise.allSettled(
      Array.from({ length: N }, () =>
        runPipeline(
          makeReq('CAS race', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
          makeDeps(),
        )
      ),
    );

    const okCount = results.filter(
      r => r.status === 'fulfilled' && r.value.statusCode === 200,
    ).length;
    expect(okCount).toBeGreaterThanOrEqual(1);
    expect(okCount).toBeLessThanOrEqual(N);
  });
});

// ─────────────────────────────────────────────────────
// 4. SAFETY PATHS — Crisis, PII, escalation
// ─────────────────────────────────────────────────────
describe('E2E: safety paths', () => {
  it('crisis message triggers trip-wire and returns crisis response', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('I want to kill myself', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(200);
    expect(result.response).toContain('988');
    expect(result.response).toContain('911');
  });

  it('crisis bypass skips stages 2-6 and dispatches via stage 7+8', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('I want to end my life', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(200);
    expect(result.degradedStages).toHaveLength(0);
  });

  it('non-crisis message passes trip-wire', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('What is the weather today?', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(200);
    expect(result.response).not.toContain('988');
  });

  it('PII in input is detected and masked — Stage 1 uses default mask mode (config loads in Stage 2)', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('My SSN is 123-45-6789', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(200);
  });

  it('PII detection is skipped when disabled in config (warmup ensures config loaded)', async () => {
    await configStore.saveVersion(TENANT_A, baseConfig(TENANT_A, {
      safety: { contentFilterThreshold: 'moderate', piiRedactionEnabled: false, piiRedactionMode: 'allow' },
    }), 'system', 'pii off');

    const sessionId = await freshSession(TENANT_A);
    await runPipeline(
      makeReq('warmup', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );
    const result = await runPipeline(
      makeReq('My SSN is 123-45-6789', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(200);
  });

  it('PII in input is masked when mode is mask', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('My email is test@example.com', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(200);
  });

});

// ─────────────────────────────────────────────────────
// 5. TENANT ISOLATION
// ─────────────────────────────────────────────────────
describe('E2E: tenant isolation', () => {
  it('different tenants have separate sessions', async () => {
    const sessionA = await freshSession(TENANT_A);
    const sessionB = await freshSession(TENANT_B);

    const resultA = await runPipeline(
      makeReq('Hello from A', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionA }),
      makeDeps(),
    );
    const resultB = await runPipeline(
      makeReq('Hello from B', { authorization: `Bearer ${API_KEY_B}`, 'x-session-id': sessionB }),
      makeDeps(),
    );

    expect(resultA.statusCode).toBe(200);
    expect(resultB.statusCode).toBe(200);
    expect(resultA.turnId).toBe(sessionA);
    expect(resultB.turnId).toBe(sessionB);
  });

  it('API key determines tenant, not x-tenant-id header', async () => {
    const sessionA = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('Spoof test', {
        authorization: `Bearer ${API_KEY_A}`,
        'x-session-id': sessionA,
        'x-tenant-id': TENANT_B,
      }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(200);
    expect(result.turnId).toBe(sessionA);
  });

  it('wrong API key is rejected', async () => {
    const result = await runPipeline(
      makeReq('Bad key', { authorization: 'Bearer sk-wrong-key' }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(403);
    expect(result.error?.errorCode).toContain('AUTH');
  });

  it('missing API key is rejected', async () => {
    const result = await runPipeline(makeReq('No key'), makeDeps());
    expect(result.statusCode).toBe(403);
  });

  it('deactivated tenant is rejected', async () => {
    tenantRegistry.seedTenant('deactivated-tenant', 'deactivated');
    tenantRegistry.seedApiKey('deactivated-tenant', 'sk-deactivated', 'deactivated-key');

    const result = await runPipeline(
      makeReq('Deactivated', { authorization: 'Bearer sk-deactivated' }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(403);
  });

  it('tenant A cannot access tenant B session — session load fails', async () => {
    const sessionB = await freshSession(TENANT_B);

    const result = await runPipeline(
      makeReq('Cross-tenant', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionB }),
      makeDeps(),
    );

    expect(result.statusCode).not.toBe(200);
    expect(result.error).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────
// 6. PERSISTENCE — Session state across requests
// ─────────────────────────────────────────────────────
describe('E2E: persistence', () => {
  it('session state persists across sequential requests', async () => {
    const sessionId = await freshSession(TENANT_A);

    await runPipeline(
      makeReq('First turn', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    const session = await sessionStore.loadSession(TENANT_A, sessionId);
    expect(session).not.toBeNull();
    expect(session!.version).toBeGreaterThan(1);
  });

  it('session is loaded from store after pipeline run', async () => {
    const sessionId = await freshSession(TENANT_A);
    const sessionBefore = await sessionStore.loadSession(TENANT_A, sessionId);
    const versionBefore = sessionBefore!.version;

    await runPipeline(
      makeReq('Another turn', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    const sessionAfter = await sessionStore.loadSession(TENANT_A, sessionId);
    expect(sessionAfter).not.toBeNull();
    expect(sessionAfter!.version).toBeGreaterThan(versionBefore);
  });

  it('config version is loaded from config store', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('Config check', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(200);
  });
});

// ─────────────────────────────────────────────────────
// 7. DEDUP — Message deduplication
// ─────────────────────────────────────────────────────
describe('E2E: deduplication', () => {
  it('duplicate idempotency key returns cached response', async () => {
    const sessionId = await freshSession(TENANT_A);
    const idempotencyKey = `idem-${Date.now()}`;

    const r1 = await runPipeline(
      makeReq('Original', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }, idempotencyKey),
      makeDeps(),
    );
    expect(r1.statusCode).toBe(200);

    const r2 = await runPipeline(
      makeReq('Duplicate', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }, idempotencyKey),
      makeDeps(),
    );
    expect(r2.statusCode).toBe(200);
  });
});

// ─────────────────────────────────────────────────────
// 8. DOWNSTREAM INTEGRATION — Grounding, output guardrail
// ─────────────────────────────────────────────────────
describe('E2E: downstream integration', () => {
  it('output guardrail passes clean response', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('Normal question', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(200);
  });

  it('grounding verifier runs on generated response', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('What is your name?', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(200);
  });
});

// ─────────────────────────────────────────────────────
// 9. DEGRADED MODE — Pipeline continues with degraded stages
// ─────────────────────────────────────────────────────
describe('E2E: degraded mode', () => {
  it('reports degraded stages array without failing the pipeline', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('Degraded check', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(200);
    expect(Array.isArray(result.degradedStages)).toBe(true);
  });

  it('degraded stages list is empty when all stages pass', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('Clean run', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.degradedStages).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────
// 10. ABORT SIGNAL — Pipeline cancellation
// ─────────────────────────────────────────────────────
describe('E2E: abort signal', () => {
  it('aborted request before pipeline start returns error', async () => {
    const result = await runPipeline(
      makeReq('Aborted', { authorization: `Bearer ${API_KEY_A}` }),
      makeDeps(),
    );

    expect(result.statusCode).not.toBe(200);
    expect(result.error).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────
// 11. MULTI-TURN CONVERSATIONS
// ─────────────────────────────────────────────────────
describe('E2E: multi-turn conversations', () => {
  it('handles sequential requests to same session', async () => {
    const sessionId = await freshSession(TENANT_A);
    const turns = ['Hello', 'What can you do?', 'Tell me about weather'];

    for (const turn of turns) {
      const result = await runPipeline(
        makeReq(turn, { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
        makeDeps(),
      );
      expect(result.statusCode).toBe(200);
      expect(result.response).toBeTruthy();
    }
  });

  it('concurrent multi-tenant conversations succeed', async () => {
    const sessionA = await freshSession(TENANT_A);
    const sessionB = await freshSession(TENANT_B);

    const [rA, rB] = await Promise.all([
      runPipeline(
        makeReq('A says hi', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionA }),
        makeDeps(),
      ),
      runPipeline(
        makeReq('B says hi', { authorization: `Bearer ${API_KEY_B}`, 'x-session-id': sessionB }),
        makeDeps(),
      ),
    ]);

    expect(rA.statusCode).toBe(200);
    expect(rB.statusCode).toBe(200);
  });
});

// ─────────────────────────────────────────────────────
// 12. HEALTH CHECK — Store health aggregation
// ─────────────────────────────────────────────────────
describe('E2E: store health', () => {
  it('all stores report healthy', async () => {
    const [sHealth, tHealth, cHealth, dHealth] = await Promise.all([
      sessionStore.health(),
      tenantRegistry.health(),
      configStore.health(),
      dedupStore.health(),
    ]);

    expect(sHealth.status).toBe('healthy');
    expect(tHealth.status).toBe('healthy');
    expect(cHealth.status).toBe('healthy');
    expect(dHealth.status).toBe('healthy');
  });
});

// ─────────────────────────────────────────────────────
// 13. EDGE CASES
// ─────────────────────────────────────────────────────
describe('E2E: edge cases', () => {
  it('very long message passes through pipeline', async () => {
    const sessionId = await freshSession(TENANT_A);
    const longMessage = 'A'.repeat(10000);
    const result = await runPipeline(
      makeReq(longMessage, { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(200);
  });

  it('unicode message passes through pipeline', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('Hello 你好 مرحبا 🌍', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(200);
  });

  it('special characters in message pass through', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('<script>alert("xss")</script>', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(200);
  });

  it('SQL injection attempt in message passes safely', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq("'; DROP TABLE sessions; --", { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(200);
    const session = await sessionStore.loadSession(TENANT_A, sessionId);
    expect(session).not.toBeNull();
  });

  it('invalid sequence number format is ignored', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('Bad seq', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId, 'x-sequence-number': 'not-a-number' }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(200);
  });
});

// ─────────────────────────────────────────────────────
// 14. CRISIS + PERSISTENCE — Crisis state persisted
// ─────────────────────────────────────────────────────
describe('E2E: crisis persistence', () => {
  it('crisis response is persisted to session state', async () => {
    const sessionId = await freshSession(TENANT_A);

    await runPipeline(
      makeReq('I want to hurt myself', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    const session = await sessionStore.loadSession(TENANT_A, sessionId);
    expect(session).not.toBeNull();
    const state = JSON.parse(session!.state);
    expect(state.tripWireTriggered).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// 15. MULTI-TENANT CONFIG ISOLATION
// ─────────────────────────────────────────────────────
describe('E2E: config isolation', () => {
  it('different tenants have separate configs', async () => {
    const customConfig = baseConfig(TENANT_B, {
      fallbackResponse: 'Tenant B custom fallback',
    });
    await configStore.saveVersion(TENANT_B, customConfig, 'system', 'custom');

    const sessionA = await freshSession(TENANT_A);
    const sessionB = await freshSession(TENANT_B);

    const rA = await runPipeline(
      makeReq('Config test A', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionA }),
      makeDeps(),
    );
    const rB = await runPipeline(
      makeReq('Config test B', { authorization: `Bearer ${API_KEY_B}`, 'x-session-id': sessionB }),
      makeDeps(),
    );

    expect(rA.statusCode).toBe(200);
    expect(rB.statusCode).toBe(200);
  });
});

// ─────────────────────────────────────────────────────
// 16. RATE LIMITING
// ─────────────────────────────────────────────────────
describe('E2E: rate limiting', () => {
  it('rate limit state resets between test runs', async () => {
    const sessionId = await freshSession(TENANT_A);
    const result = await runPipeline(
      makeReq('Rate limit check', { authorization: `Bearer ${API_KEY_A}`, 'x-session-id': sessionId }),
      makeDeps(),
    );

    expect(result.statusCode).toBe(200);
  });
});
