import { describe, it, expect, beforeEach } from 'vitest';
import { execute, resetRateLimitStore } from '../index';
import { TurnContext, ErrorCodes } from '@conversation-engine/core-types';
import { TripWireEngine, PatternSet } from '@conversation-engine/trip-wire';
import { InputGuardrailEngine, CircuitBreaker } from '@conversation-engine/input-guardrail';
import { PiiDetector } from '@conversation-engine/pii-detector';
import { GuardrailCategory, ClassifierProvider } from '@conversation-engine/input-guardrail';

function makeContext(overrides: Partial<TurnContext> = {}): TurnContext {
  return {
    message: 'hello',
    pipelineStartTime: Date.now(),
    degradedStages: [],
    latencyMs: 0,
    ...overrides,
  };
}

// --- TripWire setup ---
const TEST_PATTERNS: PatternSet = {
  version: 1,
  patterns: [
    { category: 'self_harm', patterns: ['hurt myself', 'self-harm'] },
    { category: 'suicide', patterns: ['kill myself', 'suicide'] },
  ],
};
const tripWire = new TripWireEngine(TEST_PATTERNS);

// --- Mock Classifier for guardrail tests ---
class MockClassifier implements ClassifierProvider {
  readonly name = 'mock';
  private _shouldFlag = false;
  private _flagCategories: GuardrailCategory[] = [];
  private _shouldTimeout = false;
  private _shouldThrow = false;

  setFlag(categories: GuardrailCategory[]): void {
    this._shouldFlag = categories.length > 0;
    this._flagCategories = categories;
  }
  setTimeout(): void { this._shouldTimeout = true; }
  setThrow(): void { this._shouldThrow = true; }

  async classify(_message: string, signal: AbortSignal): Promise<{ flagged: boolean; categories: GuardrailCategory[] }> {
    if (this._shouldTimeout) { await new Promise(() => {}); }
    if (this._shouldThrow) { throw new Error('Unavailable'); }
    return { flagged: this._shouldFlag, categories: this._flagCategories };
  }
}

const piiDetector = new PiiDetector();

describe('stage-1-ingestion', () => {
  beforeEach(() => resetRateLimitStore());

  it('passes with a valid message', async () => {
    const config = { tenantId: 't1', configVersion: 1, llm: { model: 'gpt-4', temperature: 0.7, maxTokens: 1024, systemPrompt: '' }, safety: { contentFilterThreshold: 'moderate' as const, piiRedactionEnabled: true, piiRedactionMode: 'mask' as const }, rateLimits: { messagesPerMinute: 60, messagesPerHour: 1000, concurrentSessions: 100 }, session: { ttlMinutes: 1440, gracePeriodDays: 7, legalHoldDays: 90 }, fallbackResponse: '', supportedLanguages: ['en'], featureFlags: { qualityScoringEnabled: false, analyticsEnabled: false } };
    const ctx = makeContext({ tenantId: 't1', tenantConfig: config } as any);
    const result = await execute({ context: ctx, signal: new AbortController().signal });
    expect(result.success).toBe(true);
  });

  it('rejects empty message', async () => {
    const ctx = makeContext({ message: '  ' });
    const result = await execute({ context: ctx, signal: new AbortController().signal });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(ErrorCodes.ERR_INJECTION_DETECTED);
  });

  // Rate limiting moved to pipeline-orchestrator (runs after Stage 2 loads tenantConfig)

  it('respects abort signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const ctx = makeContext();
    const result = await execute({ context: ctx, signal: controller.signal });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(ErrorCodes.ERR_STAGE_TIMEOUT);
  });

  // --- Trip-wire (1a) tests ---
  it('sets safetyVerdict when trip-wire detects crisis', async () => {
    const ctx = makeContext({ message: 'I want to kill myself' });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { tripWire });
    expect(result.success).toBe(true);
    expect(ctx.safetyVerdict!.crisisDetected).toBe(true);
    expect(ctx.safetyVerdict!.crisisCategory).toBe('suicide');
    expect(ctx.safetyVerdict!.tripWireTriggered).toBe(true);
    expect(ctx.safetyVerdict!.escalation!.triggered).toBe(true);
    expect(ctx.safetyVerdict!.escalation!.reason).toBe('suicide');
  });

  it('does not set safetyVerdict on normal message', async () => {
    const ctx = makeContext({ message: 'What are your hours?' });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { tripWire });
    expect(result.success).toBe(true);
    expect(ctx.safetyVerdict).toBeUndefined();
  });

  // --- Input Guardrail (1b) tests ---
  it('passes normal message through guardrail', async () => {
    const classifier = new MockClassifier();
    const breaker = new CircuitBreaker();
    const guardrail = new InputGuardrailEngine(classifier, breaker);
    const ctx = makeContext({ message: 'What are your hours?' });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { inputGuardrail: guardrail });
    expect(result.success).toBe(true);
    expect(ctx.safetyVerdict!.inputGuardrail!.passed).toBe(true);
    expect(ctx.safetyVerdict!.inputGuardrail!.categories).toEqual([]);
  });

  it('rejects hate speech via guardrail', async () => {
    const classifier = new MockClassifier();
    const breaker = new CircuitBreaker();
    const guardrail = new InputGuardrailEngine(classifier, breaker);
    classifier.setFlag(['hate_speech']);
    const ctx = makeContext({ message: 'hate speech content' });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { inputGuardrail: guardrail });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(ErrorCodes.ERR_INPUT_GUARDRAIL);
    expect(result.error!.message).toContain('hate_speech');
  });

  it('rejects toxicity via guardrail', async () => {
    const classifier = new MockClassifier();
    const breaker = new CircuitBreaker();
    const guardrail = new InputGuardrailEngine(classifier, breaker);
    classifier.setFlag(['toxicity']);
    const ctx = makeContext({ message: 'toxic content' });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { inputGuardrail: guardrail });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(ErrorCodes.ERR_INPUT_GUARDRAIL);
  });

  it('rejects violence via guardrail', async () => {
    const classifier = new MockClassifier();
    const breaker = new CircuitBreaker();
    const guardrail = new InputGuardrailEngine(classifier, breaker);
    classifier.setFlag(['violence']);
    const ctx = makeContext({ message: 'violent content' });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { inputGuardrail: guardrail });
    expect(result.success).toBe(false);
  });

  it('rejects policy violations via guardrail', async () => {
    const classifier = new MockClassifier();
    const breaker = new CircuitBreaker();
    const guardrail = new InputGuardrailEngine(classifier, breaker);
    classifier.setFlag(['policy_violation']);
    const ctx = makeContext({ message: 'policy violation' });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { inputGuardrail: guardrail });
    expect(result.success).toBe(false);
  });

  it('degrades gracefully when classifier times out', async () => {
    const classifier = new MockClassifier();
    const breaker = new CircuitBreaker();
    classifier.setTimeout();
    const guardrail = new InputGuardrailEngine(classifier, breaker, 1);
    const ctx = makeContext({ message: 'timeout test' });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { inputGuardrail: guardrail });
    expect(result.success).toBe(true);
    expect(ctx.safetyVerdict!.inputGuardrail!.fallbackUsed).toBe(true);
    expect(ctx.degradedStages).toContain('input-guardrail');
  }, 10000);

  it('degrades gracefully when classifier is unavailable', async () => {
    const classifier = new MockClassifier();
    const breaker = new CircuitBreaker();
    classifier.setThrow();
    const guardrail = new InputGuardrailEngine(classifier, breaker);
    const ctx = makeContext({ message: 'error test' });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { inputGuardrail: guardrail });
    expect(result.success).toBe(true);
    expect(ctx.safetyVerdict!.inputGuardrail!.fallbackUsed).toBe(true);
  });

  it('skips guardrail classification when circuit breaker is open', async () => {
    const classifier = new MockClassifier();
    const breaker = new CircuitBreaker(1, 5000);
    classifier.setThrow();
    const guardrail = new InputGuardrailEngine(classifier, breaker);

    // First call fails → breaker opens
    await execute({ context: makeContext({ message: 'fail' }), signal: new AbortController().signal }, { inputGuardrail: guardrail });
    expect(breaker.getState()).toBe('OPEN');

    // Second call should skip classification (degraded)
    classifier.setFlag(['hate_speech']);
    const ctx = makeContext({ message: 'hate speech' });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { inputGuardrail: guardrail });
    expect(result.success).toBe(true);
    expect(ctx.safetyVerdict!.inputGuardrail!.fallbackUsed).toBe(true);
    expect(ctx.safetyVerdict!.inputGuardrail!.categories).toEqual([]);
  });

  // --- PII Detection (1c) tests ---
  it('detects and masks email in mask mode', async () => {
    const ctx = makeContext({
      message: 'Contact me at user@example.com',
      tenantId: 't1',
      tenantConfig: { tenantId: 't1', configVersion: 1, llm: { model: 'gpt-4', temperature: 0.7, maxTokens: 1024, systemPrompt: '' }, safety: { contentFilterThreshold: 'moderate', piiRedactionEnabled: true, piiRedactionMode: 'mask' }, rateLimits: { messagesPerMinute: 60, messagesPerHour: 1000, concurrentSessions: 100 }, session: { ttlMinutes: 1440, gracePeriodDays: 7, legalHoldDays: 90 }, fallbackResponse: '', supportedLanguages: ['en'], featureFlags: { qualityScoringEnabled: false, analyticsEnabled: false } },
    } as any);
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { piiDetector });
    expect(result.success).toBe(true);
    expect(ctx.message).not.toContain('user@example.com');
    expect(ctx.message).toContain('[EMAIL]');
    expect(ctx.safetyVerdict!.piiRedacted).toBe(true);
    expect(ctx.safetyVerdict!.piiRedaction!.inputPiiFound).toBe(true);
    expect(ctx.safetyVerdict!.piiRedaction!.redactedFields).toContain('email');
  });

  it('blocks message with PII in block mode', async () => {
    const ctx = makeContext({
      message: 'My SSN is 123-45-6789',
      tenantId: 't1',
      tenantConfig: { tenantId: 't1', configVersion: 1, llm: { model: 'gpt-4', temperature: 0.7, maxTokens: 1024, systemPrompt: '' }, safety: { contentFilterThreshold: 'moderate', piiRedactionEnabled: true, piiRedactionMode: 'block' }, rateLimits: { messagesPerMinute: 60, messagesPerHour: 1000, concurrentSessions: 100 }, session: { ttlMinutes: 1440, gracePeriodDays: 7, legalHoldDays: 90 }, fallbackResponse: '', supportedLanguages: ['en'], featureFlags: { qualityScoringEnabled: false, analyticsEnabled: false } },
    } as any);
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { piiDetector });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(ErrorCodes.ERR_PII_DETECTED);
  });

  it('allows PII in allow mode (no action)', async () => {
    const ctx = makeContext({
      message: 'My card is 4111-1111-1111-1111',
      tenantId: 't1',
      tenantConfig: { tenantId: 't1', configVersion: 1, llm: { model: 'gpt-4', temperature: 0.7, maxTokens: 1024, systemPrompt: '' }, safety: { contentFilterThreshold: 'moderate', piiRedactionEnabled: true, piiRedactionMode: 'allow' }, rateLimits: { messagesPerMinute: 60, messagesPerHour: 1000, concurrentSessions: 100 }, session: { ttlMinutes: 1440, gracePeriodDays: 7, legalHoldDays: 90 }, fallbackResponse: '', supportedLanguages: ['en'], featureFlags: { qualityScoringEnabled: false, analyticsEnabled: false } },
    } as any);
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { piiDetector });
    expect(result.success).toBe(true);
    expect(ctx.message).toContain('4111-1111-1111-1111');
    expect(ctx.safetyVerdict!.piiRedaction!.inputPiiFound).toBe(true);
    expect(ctx.safetyVerdict!.piiRedaction!.redactedFields).toEqual([]);
  });

  it('notifies on PII in notify mode', async () => {
    const ctx = makeContext({
      message: 'IP: 192.168.1.1',
      tenantId: 't1',
      tenantConfig: { tenantId: 't1', configVersion: 1, llm: { model: 'gpt-4', temperature: 0.7, maxTokens: 1024, systemPrompt: '' }, safety: { contentFilterThreshold: 'moderate', piiRedactionEnabled: true, piiRedactionMode: 'notify' }, rateLimits: { messagesPerMinute: 60, messagesPerHour: 1000, concurrentSessions: 100 }, session: { ttlMinutes: 1440, gracePeriodDays: 7, legalHoldDays: 90 }, fallbackResponse: '', supportedLanguages: ['en'], featureFlags: { qualityScoringEnabled: false, analyticsEnabled: false } },
    } as any);
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { piiDetector });
    expect(result.success).toBe(true);
    expect(ctx.message).toContain('192.168.1.1');
    expect(ctx.safetyVerdict!.piiRedaction!.inputPiiFound).toBe(true);
    expect(ctx.safetyVerdict!.piiRedaction!.redactedFields).toContain('ip_address');
  });

  it('detects multiple PII types in one message', async () => {
    const ctx = makeContext({
      message: 'Email: test@test.com, Phone: 555-123-4567',
      tenantId: 't1',
      tenantConfig: { tenantId: 't1', configVersion: 1, llm: { model: 'gpt-4', temperature: 0.7, maxTokens: 1024, systemPrompt: '' }, safety: { contentFilterThreshold: 'moderate', piiRedactionEnabled: true, piiRedactionMode: 'mask' }, rateLimits: { messagesPerMinute: 60, messagesPerHour: 1000, concurrentSessions: 100 }, session: { ttlMinutes: 1440, gracePeriodDays: 7, legalHoldDays: 90 }, fallbackResponse: '', supportedLanguages: ['en'], featureFlags: { qualityScoringEnabled: false, analyticsEnabled: false } },
    } as any);
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { piiDetector });
    expect(result.success).toBe(true);
    expect(ctx.message).not.toContain('test@test.com');
    expect(ctx.message).not.toContain('555-123-4567');
    expect(ctx.safetyVerdict!.piiRedaction!.redactedFields).toContain('email');
    expect(ctx.safetyVerdict!.piiRedaction!.redactedFields).toContain('phone');
  });

  // --- Integration: sub-step ordering and crisis short-circuit ---
  it('Stage 1a short-circuits Stage 1b and 1c on crisis', async () => {
    const classifier = new MockClassifier();
    classifier.setFlag(['hate_speech']);
    const guardrail = new InputGuardrailEngine(classifier, new CircuitBreaker());
    const ctx = makeContext({ message: 'kill myself' });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { tripWire, inputGuardrail: guardrail, piiDetector });
    expect(result.success).toBe(true);
    expect(ctx.safetyVerdict!.crisisDetected).toBe(true);
    // Guardrail should NOT have been called
    expect(ctx.safetyVerdict!.inputGuardrail).toBeUndefined();
    // PII should NOT have been called
    expect(ctx.safetyVerdict!.piiRedaction).toBeUndefined();
  });

  it('Stage 1b runs before Stage 1c on non-crisis messages', async () => {
    const classifier = new MockClassifier();
    const guardrail = new InputGuardrailEngine(classifier, new CircuitBreaker());
    const ctx = makeContext({
      message: 'Hello, email me at test@test.com',
      tenantId: 't1',
      tenantConfig: { tenantId: 't1', configVersion: 1, llm: { model: 'gpt-4', temperature: 0.7, maxTokens: 1024, systemPrompt: '' }, safety: { contentFilterThreshold: 'moderate', piiRedactionEnabled: true, piiRedactionMode: 'mask' }, rateLimits: { messagesPerMinute: 60, messagesPerHour: 1000, concurrentSessions: 100 }, session: { ttlMinutes: 1440, gracePeriodDays: 7, legalHoldDays: 90 }, fallbackResponse: '', supportedLanguages: ['en'], featureFlags: { qualityScoringEnabled: false, analyticsEnabled: false } },
    } as any);
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { tripWire, inputGuardrail: guardrail, piiDetector });
    expect(result.success).toBe(true);
    // Guardrail ran (no categories)
    expect(ctx.safetyVerdict!.inputGuardrail!.categories).toEqual([]);
    // PII ran (masked email)
    expect(ctx.safetyVerdict!.piiRedaction!.inputPiiFound).toBe(true);
    expect(ctx.message).toContain('[EMAIL]');
  });

  it('classifier is never called on crisis-path requests', async () => {
    let classifierCalled = false;
    const trackingClassifier: ClassifierProvider = {
      name: 'tracking',
      async classify(_msg: string, _sig: AbortSignal) {
        classifierCalled = true;
        return { flagged: false, categories: [] };
      },
    };
    const guardrail = new InputGuardrailEngine(trackingClassifier, new CircuitBreaker());
    const ctx = makeContext({ message: 'kill myself' });
    await execute({ context: ctx, signal: new AbortController().signal }, { tripWire, inputGuardrail: guardrail, piiDetector });
    expect(classifierCalled).toBe(false);
  });

  it('populates SafetyVerdict with all three sub-step results when all run', async () => {
    const classifier = new MockClassifier();
    const guardrail = new InputGuardrailEngine(classifier, new CircuitBreaker());
    const ctx = makeContext({
      message: 'Hello, email test@test.com',
      tenantId: 't1',
      tenantConfig: { tenantId: 't1', configVersion: 1, llm: { model: 'gpt-4', temperature: 0.7, maxTokens: 1024, systemPrompt: '' }, safety: { contentFilterThreshold: 'moderate', piiRedactionEnabled: true, piiRedactionMode: 'mask' }, rateLimits: { messagesPerMinute: 60, messagesPerHour: 1000, concurrentSessions: 100 }, session: { ttlMinutes: 1440, gracePeriodDays: 7, legalHoldDays: 90 }, fallbackResponse: '', supportedLanguages: ['en'], featureFlags: { qualityScoringEnabled: false, analyticsEnabled: false } },
    } as any);
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { tripWire, inputGuardrail: guardrail, piiDetector });
    expect(result.success).toBe(true);
    // Trip-wire: not triggered
    expect(ctx.safetyVerdict!.crisisDetected).toBe(false);
    // Guardrail: passed
    expect(ctx.safetyVerdict!.inputGuardrail!.passed).toBe(true);
    // PII: found and masked
    expect(ctx.safetyVerdict!.piiRedaction!.inputPiiFound).toBe(true);
    expect(ctx.safetyVerdict!.piiRedaction!.redactedFields).toContain('email');
  });
});
