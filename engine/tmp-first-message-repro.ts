import { runPipeline } from './packages/pipeline-orchestrator/src/pipeline.ts';
import { SqliteTenantRegistry } from './packages/tenant-registry/src/index.ts';
import { SqliteSessionStore } from './packages/session-store/src/index.ts';
import { FileConfigStore, defaultTenantConfig } from './packages/config-store/src/index.ts';
import { SqliteDedupStore } from './packages/dedup-store/src/index.ts';
import { TripWireEngine } from './packages/trip-wire/src/index.ts';
import { InputGuardrailEngine, NoopProvider as InputNoop, CircuitBreaker as InputCB } from './packages/input-guardrail/src/index.ts';
import { PiiDetector } from './packages/pii-detector/src/index.ts';
import { OutputGuardrailEngine, NoopProvider as OutputNoop, CircuitBreaker as OutputCB } from './packages/output-guardrail/src/index.ts';
import { GroundingVerifier } from './packages/grounding-verifier/src/index.ts';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(process.cwd(), 'tmp-first-message-debug');
if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
mkdirSync(TEST_DIR, { recursive: true });

const tenantRegistry = new SqliteTenantRegistry(join(TEST_DIR, 'tenant-registry.db'));
const sessionStore = new SqliteSessionStore(join(TEST_DIR, 'sessions.db'));
const configStore = new FileConfigStore(join(TEST_DIR, 'configs'));
const dedupStore = new SqliteDedupStore(join(TEST_DIR, 'dedup.db'));
const tripWire = new TripWireEngine({ version: 1, patterns: [] });
const inputGuardrail = new InputGuardrailEngine(new InputNoop(), new InputCB(3, 30000), 3000);
const piiDetector = new PiiDetector();
const outputGuardrail = new OutputGuardrailEngine(new OutputNoop(), new OutputCB(3, 30000), 3000);
const groundingVerifier = new GroundingVerifier(piiDetector);

tenantRegistry.seedTenant('widget-tenant', 'active');
await configStore.saveVersion('widget-tenant', {
  ...defaultTenantConfig('widget-tenant'),
  llm: { model: 'noop', temperature: 0, maxTokens: 100, systemPrompt: 'You are helpful.' },
  safety: { contentFilterThreshold: 'moderate', piiRedactionEnabled: true, piiRedactionMode: 'mask' },
  fallbackResponse: 'Service unavailable. Please try again.',
  supportedLanguages: ['en'],
  featureFlags: { qualityScoringEnabled: false, analyticsEnabled: false },
}, 'system', 'seed');

const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
const result = await runPipeline(
  { rawMessage: 'Hello widget', headers: { 'x-tenant-id': 'widget-tenant', 'x-session-id': sessionId }, ip: '127.0.0.1' },
  { tenantRegistry, sessionStore, configStore, dedupStore, tripWire, inputGuardrail, piiDetector, outputGuardrail, groundingVerifier, authDisabled: true, authenticatedTenantId: 'widget-tenant' }
);
console.log(JSON.stringify({ sessionId, result }, null, 2));
if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
