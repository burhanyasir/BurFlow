import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runPipeline, PipelineDeps } from '../pipeline';
import { SqliteTenantRegistry } from '@conversation-engine/tenant-registry';
import { SqliteSessionStore } from '@conversation-engine/session-store';
import { FileConfigStore, defaultTenantConfig } from '@conversation-engine/config-store';
import { SqliteDedupStore } from '@conversation-engine/dedup-store';
import { TripWireEngine, PatternSet } from '@conversation-engine/trip-wire';
import { InputGuardrailEngine, CircuitBreaker, NoopProvider } from '@conversation-engine/input-guardrail';
import { PiiDetector } from '@conversation-engine/pii-detector';
import { OutputGuardrailEngine, CircuitBreaker as OutputCircuitBreaker, NoopProvider as OutputNoopProvider } from '@conversation-engine/output-guardrail';
import { GroundingVerifier } from '@conversation-engine/grounding-verifier';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

const BENCH_DIR = join(__dirname, '__bench_data__');
const TMP_DB = join(BENCH_DIR, 'bench.db');
const CONFIG_DIR = join(BENCH_DIR, 'configs');

const TEST_PATTERNS: PatternSet = {
  version: 1,
  patterns: [
    { category: 'self_harm', patterns: ['hurt myself', 'self-harm'] },
    { category: 'suicide', patterns: ['kill myself', 'suicide', 'end my life'] },
    { category: 'mental_health_crisis', patterns: ['panic attack'] },
  ],
};

// Target latencies from architecture docs
const TARGETS = {
  stage1aLatencyMs: 5,    // SAFETY.md: trip-wire P99 target
  stage1bLatencyMs: 3000, // input-guardrail default timeout
  stage1cLatencyMs: 50,   // PII regex scan
  stage6aLatencyMs: 3000, // Stage 6a default timeout
  pipelineLatencyMs: 200, // Expected happy-path P50 (Noop providers)
};

describe('performance benchmarks', () => {
  let deps: PipelineDeps;
  let tenantRegistry: SqliteTenantRegistry;
  let sessionStore: SqliteSessionStore;
  let configStore: FileConfigStore;
  let dedupStore: SqliteDedupStore;
  let tripWire: TripWireEngine;
  let inputGuardrail: InputGuardrailEngine;
  let outputGuardrail: OutputGuardrailEngine;
  let piiDetector: PiiDetector;
  let groundingVerifier: GroundingVerifier;
  let sessionId: string;

  beforeAll(async () => {
    if (existsSync(BENCH_DIR)) rmSync(BENCH_DIR, { recursive: true });
    mkdirSync(BENCH_DIR, { recursive: true });
    mkdirSync(CONFIG_DIR, { recursive: true });

    tenantRegistry = new SqliteTenantRegistry(TMP_DB);
    sessionStore = new SqliteSessionStore(TMP_DB);
    configStore = new FileConfigStore(CONFIG_DIR);
    dedupStore = new SqliteDedupStore(TMP_DB);

    tenantRegistry.seedTenant('bench-tenant', 'active');
    tenantRegistry.seedApiKey('bench-tenant', 'sk-bench-key', 'bench');
    const config = defaultTenantConfig('bench-tenant');
    config.llm.systemPrompt = 'You are a test bot.';
    config.llm.model = 'noop';
    await configStore.saveVersion('bench-tenant', config, 'system', 'initial');

    const session = await sessionStore.createSession('bench-tenant', 1);
    sessionId = session.sessionId;

    tripWire = new TripWireEngine(TEST_PATTERNS);
    inputGuardrail = new InputGuardrailEngine(new NoopProvider(), new CircuitBreaker(3, 30000), 3000);
    piiDetector = new PiiDetector();
    outputGuardrail = new OutputGuardrailEngine(new OutputNoopProvider(), new OutputCircuitBreaker(3, 30000), 3000);
    groundingVerifier = new GroundingVerifier(piiDetector);

    deps = { tenantRegistry, sessionStore, configStore, dedupStore, authDisabled: true, tripWire, inputGuardrail, piiDetector, outputGuardrail, groundingVerifier };
  });

  afterAll(() => {
    sessionStore.close();
    dedupStore.close();
    try { if (existsSync(BENCH_DIR)) rmSync(BENCH_DIR, { recursive: true }); } catch {}
  });

  it('Stage 1a (trip-wire) P99 latency under 5ms', async () => {
    const latencies: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      tripWire.check('What are your hours of operation?');
      latencies.push(performance.now() - start);
    }
    latencies.sort((a, b) => a - b);
    const p99 = latencies[98];
    console.log(`  Stage 1a P99: ${p99.toFixed(3)}ms (target: <${TARGETS.stage1aLatencyMs}ms)`);
    expect(p99).toBeLessThan(TARGETS.stage1aLatencyMs);
  });

  it('Stage 1a matches crisis pattern under 5ms', async () => {
    const latencies: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      tripWire.check('I want to kill myself');
      latencies.push(performance.now() - start);
    }
    latencies.sort((a, b) => a - b);
    const p99 = latencies[98];
    console.log(`  Stage 1a crisis P99: ${p99.toFixed(3)}ms (target: <5ms)`);
    expect(p99).toBeLessThan(5);
  });

  it('Stage 1b (input guardrail, Noop) completes under 50ms', async () => {
    const latencies: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await inputGuardrail.check('What are your hours?', new AbortController().signal);
      latencies.push(performance.now() - start);
    }
    latencies.sort((a, b) => a - b);
    const p99 = latencies[98];
    console.log(`  Stage 1b P99: ${p99.toFixed(3)}ms (Noop provider)`);
    expect(p99).toBeLessThan(50);
  });

  it('Stage 1c (PII detection) completes under 10ms', async () => {
    const latencies: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      piiDetector.check('Contact john@example.com or call 555-123-4567', 'mask');
      latencies.push(performance.now() - start);
    }
    latencies.sort((a, b) => a - b);
    const p99 = latencies[98];
    console.log(`  Stage 1c P99: ${p99.toFixed(3)}ms`);
    expect(p99).toBeLessThan(10);
  });

  it('Stage 6a completes under 100ms with all checks (Noop providers)', async () => {
    const latencies: number[] = [];
    for (let i = 0; i < 100; i++) {
      const { execute } = await import('@conversation-engine/stage-6a-safety');
      const context: any = {
        message: 'test',
        tenantId: 'bench-tenant',
        tenantConfig: defaultTenantConfig('bench-tenant'),
        generatedResponse: 'This is a safe response from the assistant.',
        pipelineStartTime: Date.now(),
        degradedStages: [],
        latencyMs: 0,
        safetyVerdict: { passed: true, crisisDetected: false, guardrailFlags: [], piiRedacted: false },
        sessionState: {
          sessionId: 'bench-session', version: 1, stateMachine: 'active', data: {},
          sequenceCounter: 1, configVersion: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        },
      };
      const start = performance.now();
      await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier, piiDetector });
      latencies.push(performance.now() - start);
    }
    latencies.sort((a, b) => a - b);
    const p50 = latencies[49];
    const p95 = latencies[94];
    const p99 = latencies[98];
    console.log(`  Stage 6a P50: ${p50.toFixed(3)}ms`);
    console.log(`  Stage 6a P95: ${p95.toFixed(3)}ms`);
    console.log(`  Stage 6a P99: ${p99.toFixed(3)}ms`);
    expect(p99).toBeLessThan(100);
  });

  it('full pipeline P50 latency under 500ms (Noop path)', async () => {
    const latencies: number[] = [];
    for (let i = 0; i < 50; i++) {
      const start = Date.now();
      await runPipeline({
        rawMessage: 'What are your hours?',
        headers: { 'x-tenant-id': 'bench-tenant', 'x-api-key': 'sk-bench-key', 'x-session-id': sessionId },
        ip: '127.0.0.1',
      }, deps);
      latencies.push(Date.now() - start);
    }
    latencies.sort((a, b) => a - b);
    const p50 = latencies[24];
    const p95 = latencies[47];
    const p99 = latencies[49];
    console.log(`  Full pipeline P50: ${p50}ms`);
    console.log(`  Full pipeline P95: ${p95}ms`);
    console.log(`  Full pipeline P99: ${p99}ms`);
    expect(p50).toBeLessThan(500);
    expect(p95).toBeLessThan(1000);
  });
});
