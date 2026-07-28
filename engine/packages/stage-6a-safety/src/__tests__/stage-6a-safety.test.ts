import { describe, it, expect, beforeEach } from 'vitest';
import { execute } from '../index';
import { StageInput, StageResult, TenantConfig, TurnContext, ErrorCodes } from '@conversation-engine/core-types';
import { OutputGuardrailEngine, CircuitBreaker as OutputCircuitBreaker, NoopProvider, OutputClassifierProvider, OutputGuardrailCategory } from '@conversation-engine/output-guardrail';
import { GroundingVerifier } from '@conversation-engine/grounding-verifier';
import { PiiDetector } from '@conversation-engine/pii-detector';

const BASE_CONFIG: TenantConfig = {
  tenantId: 'test-tenant',
  configVersion: 1,
  llm: { model: 'gpt-4o', temperature: 0.7, maxTokens: 1024, systemPrompt: 'You are a helpful assistant.' },
  safety: { contentFilterThreshold: 'moderate', piiRedactionEnabled: true, piiRedactionMode: 'mask' },
  rateLimits: { messagesPerMinute: 10, messagesPerHour: 100, concurrentSessions: 5 },
  session: { ttlMinutes: 60, gracePeriodDays: 7, legalHoldDays: 90 },
  fallbackResponse: 'I apologize, but I am unable to process this request at this time.',
  supportedLanguages: ['en', 'es', 'fr'],
  featureFlags: { qualityScoringEnabled: false, analyticsEnabled: false },
};

class MockOutputProvider implements OutputClassifierProvider {
  readonly name = 'mock';
  private shouldFlag: boolean = false;
  private flagCategories: OutputGuardrailCategory[] = [];

  setFlag(categories: OutputGuardrailCategory[]): void {
    this.shouldFlag = categories.length > 0;
    this.flagCategories = categories;
  }

  async classify(_response: string, _threshold: string, _signal: AbortSignal): Promise<{ flagged: boolean; categories: OutputGuardrailCategory[] }> {
    return { flagged: this.shouldFlag, categories: this.flagCategories };
  }
}

function createContext(overrides?: Partial<TurnContext>): TurnContext {
  return {
    message: 'test message',
    tenantId: 'test-tenant',
    tenantConfig: BASE_CONFIG,
    generatedResponse: 'This is a generated response from the assistant.',
    pipelineStartTime: Date.now(),
    degradedStages: [],
    latencyMs: 0,
    safetyVerdict: { passed: true, crisisDetected: false, guardrailFlags: [], piiRedacted: false },
    sessionState: {
      sessionId: 'test-session',
      version: 1,
      stateMachine: 'active',
      data: {},
      sequenceCounter: 1,
      configVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

describe('stage-6a-safety', () => {
  let mockProvider: MockOutputProvider;
  let outputGuardrail: OutputGuardrailEngine;
  let piiDetector: PiiDetector;
  let groundingVerifier: GroundingVerifier;

  beforeEach(() => {
    mockProvider = new MockOutputProvider();
    outputGuardrail = new OutputGuardrailEngine(mockProvider, new OutputCircuitBreaker(3, 30000), 5000);
    piiDetector = new PiiDetector();
    groundingVerifier = new GroundingVerifier(piiDetector);
  });

  it('returns success when no response generated', async () => {
    const result = await execute({ context: createContext({ generatedResponse: undefined }), signal: new AbortController().signal }, { outputGuardrail, groundingVerifier, piiDetector });
    expect(result.success).toBe(true);
  });

  it('passes safe response through all checks', async () => {
    mockProvider.setFlag([]);
    const context = createContext({ generatedResponse: 'Thank you for your inquiry.' });
    const result = await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier, piiDetector });
    expect(result.success).toBe(true);
    expect(context.generatedResponse).toBe('Thank you for your inquiry.');
    expect(context.degradedStages).toEqual([]);
  });

  it('replaces response with fallback when grounding fails', async () => {
    const context = createContext({ generatedResponse: 'The total cost will be $15,000.' });
    const result = await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier, piiDetector });
    expect(result.success).toBe(true);
    expect(context.generatedResponse).toBe(BASE_CONFIG.fallbackResponse);
    expect(context.safetyVerdict?.groundingVerification?.passed).toBe(false);
    expect(context.safetyVerdict?.groundingVerification?.failures).toContain('entity_mismatch');
    expect(context.degradedStages).toContain('grounding-verifier');
  });

  it('replaces response with fallback when output guardrail flags', async () => {
    mockProvider.setFlag(['toxicity']);
    const context = createContext({ generatedResponse: 'toxic output from bot' });
    const result = await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier, piiDetector });
    expect(result.success).toBe(true);
    expect(context.generatedResponse).toBe(BASE_CONFIG.fallbackResponse);
    expect(context.safetyVerdict?.outputGuardrail?.passed).toBe(false);
    expect(context.safetyVerdict?.outputGuardrail?.categories).toContain('toxicity');
    expect(context.degradedStages).toContain('output-guardrail');
  });

  it('preserves original response in outputGuardrail verdict', async () => {
    mockProvider.setFlag(['toxicity']);
    const context = createContext({ generatedResponse: 'toxic output from bot' });
    await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier, piiDetector });
    expect(context.safetyVerdict?.outputGuardrail?.originalResponse).toBe('toxic output from bot');
  });

  it('masks PII in output response (grounding passes, PII detection masks)', async () => {
    mockProvider.setFlag([]);
    // Use a grounding verifier without PII detection so PII gets to step 3
    const groundingNoPii = new GroundingVerifier();
    const context = createContext({ generatedResponse: 'Contact me at john@example.com for help.' });
    const result = await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier: groundingNoPii, piiDetector });
    expect(result.success).toBe(true);
    expect(context.generatedResponse).toContain('[EMAIL]');
    expect(context.generatedResponse).not.toContain('john@example.com');
    expect(context.safetyVerdict?.piiRedaction?.outputPiiFound).toBe(true);
    expect(context.safetyVerdict?.piiRedacted).toBe(true);
  });

  it('blocks PII in output when mode is block', async () => {
    mockProvider.setFlag([]);
    const blockConfig = { ...BASE_CONFIG, safety: { ...BASE_CONFIG.safety, piiRedactionMode: 'block' as const } };
    const groundingNoPii = new GroundingVerifier();
    const context = createContext({ generatedResponse: 'My email is john@example.com', tenantConfig: blockConfig });
    const result = await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier: groundingNoPii, piiDetector });
    expect(result.success).toBe(true);
    expect(context.generatedResponse).toBe(BASE_CONFIG.fallbackResponse);
    expect(context.degradedStages).toContain('pii-detector-output');
  });

  it('handles degraded mode when guardrail unavailable', async () => {
    // Make the breaker fail by having provider throw, which sets lastFailureTime
    const throwingMock = new MockOutputProvider();
    const realClassify = throwingMock.classify.bind(throwingMock);
    let classifyCalled = false;
    throwingMock.classify = async (_r, _t, _s) => {
      classifyCalled = true;
      throw new Error('Unavailable');
    };
    const failingBreaker = new OutputCircuitBreaker(1, 50);
    const failingGuardrail = new OutputGuardrailEngine(throwingMock, failingBreaker, 1);

    // First trigger the open
    await failingGuardrail.check('fail', 'moderate', new AbortController().signal);
    classifyCalled = false;

    // Now open and stay open (lastFailureTime was set by onFailure)
    mockProvider.setFlag(['toxicity']);
    const context = createContext({ generatedResponse: 'toxic output' });
    const result = await execute({ context, signal: new AbortController().signal }, { outputGuardrail: failingGuardrail, groundingVerifier, piiDetector });
    expect(result.success).toBe(true);
    expect(context.generatedResponse).toBe('toxic output');
  });

  it('returns error on aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await execute({ context: createContext(), signal: controller.signal }, { outputGuardrail, groundingVerifier, piiDetector });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(ErrorCodes.ERR_STAGE_TIMEOUT);
  });

  it('sets groundVerification and outputGuardrail fields in safety verdict', async () => {
    mockProvider.setFlag([]);
    const context = createContext({ generatedResponse: 'Safe response.' });
    await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier, piiDetector });
    expect(context.safetyVerdict?.groundingVerification).toBeDefined();
    expect(context.safetyVerdict?.outputGuardrail).toBeDefined();
    expect(context.safetyVerdict?.piiRedaction?.outputPiiFound).toBe(false);
  });

  it('handles escalation for repeated policy violations', async () => {
    mockProvider.setFlag(['policy_violation']);
    const context = createContext({
      generatedResponse: 'policy violating response',
      sessionState: {
        sessionId: 'test-session',
        version: 1,
        stateMachine: 'active',
        data: { policyViolationCount: 2 },
        sequenceCounter: 1,
        configVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    const result = await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier, piiDetector });
    expect(result.success).toBe(true);
    expect(context.safetyVerdict?.escalation?.policyViolationCount).toBe(3);
    expect(context.safetyVerdict?.escalation?.triggered).toBe(true);
    expect(context.safetyVerdict?.escalation?.reason).toBe('repeated_policy_violations');
  });

  it('does not escalate for first policy violation', async () => {
    mockProvider.setFlag(['policy_violation']);
    const context = createContext({ generatedResponse: 'policy violating response' });
    await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier, piiDetector });
    expect(context.safetyVerdict?.escalation?.policyViolationCount).toBe(1);
    expect(context.safetyVerdict?.escalation?.triggered).toBe(false);
  });

  it('chains checks: grounding failure still runs guardrail on fallback', async () => {
    mockProvider.setFlag([]);
    const context = createContext({ generatedResponse: 'The total cost will be $15,000. Contact me at john@example.com.' });
    const result = await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier, piiDetector });
    expect(result.success).toBe(true);
    // Grounding fails first (entity_mismatch), fallback is used, then guardrail checks fallback
    // Fallback should NOT contain PII, so PII check should not trigger
    expect(context.generatedResponse).toBe(BASE_CONFIG.fallbackResponse);
    expect(context.safetyVerdict?.groundingVerification?.passed).toBe(false);
    // PII check ran on the fallback (no PII), so outputPiiFound should be false
    expect(context.safetyVerdict?.piiRedaction?.outputPiiFound).toBe(false);
  });

  it('works with no deps (minimal mode)', async () => {
    const context = createContext({ generatedResponse: 'Some response.' });
    const result = await execute({ context, signal: new AbortController().signal }, {});
    expect(result.success).toBe(true);
    expect(context.generatedResponse).toBe('Some response.');
  });

  it('works with only output guardrail', async () => {
    mockProvider.setFlag([]);
    const context = createContext({ generatedResponse: 'Safe response.' });
    const result = await execute({ context, signal: new AbortController().signal }, { outputGuardrail });
    expect(result.success).toBe(true);
    expect(context.safetyVerdict?.outputGuardrail).toBeDefined();
  });

  it('works with only grounding verifier', async () => {
    const context = createContext({ generatedResponse: 'Safe response.' });
    const result = await execute({ context, signal: new AbortController().signal }, { groundingVerifier });
    expect(result.success).toBe(true);
    expect(context.safetyVerdict?.groundingVerification).toBeDefined();
  });

  it('works with only PII detector', async () => {
    const context = createContext({ generatedResponse: 'Safe response.' });
    const result = await execute({ context, signal: new AbortController().signal }, { piiDetector });
    expect(result.success).toBe(true);
    expect(context.safetyVerdict?.piiRedaction?.outputPiiFound).toBe(false);
  });
});

describe('adversarial — stage-6a-safety', () => {
  let mockProvider: MockOutputProvider;
  let outputGuardrail: OutputGuardrailEngine;
  let piiDetector: PiiDetector;
  let groundingVerifier: GroundingVerifier;

  beforeEach(() => {
    mockProvider = new MockOutputProvider();
    outputGuardrail = new OutputGuardrailEngine(mockProvider, new OutputCircuitBreaker(3, 30000), 5000);
    piiDetector = new PiiDetector();
    groundingVerifier = new GroundingVerifier(piiDetector);
  });

  it('simultaneous grounding + output guardrail failure: grounding wins (runs first)', async () => {
    mockProvider.setFlag(['toxicity']);
    const context = createContext({ generatedResponse: 'The total is $15,000 and it is toxic.' });
    await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier, piiDetector });
    // Grounding fails first → fallback. Guardrail then runs on fallback (mock flags it).
    expect(context.safetyVerdict?.groundingVerification?.passed).toBe(false);
    expect(context.safetyVerdict?.outputGuardrail?.passed).toBe(false);
    expect(context.safetyVerdict?.outputGuardrail?.originalResponse).toBe(BASE_CONFIG.fallbackResponse);
    expect(context.generatedResponse).toBe(BASE_CONFIG.fallbackResponse);
  });

  it('handles very large generated response', async () => {
    mockProvider.setFlag([]);
    const largeResponse = 'A'.repeat(100000);
    const context = createContext({ generatedResponse: largeResponse });
    const result = await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier, piiDetector });
    expect(result.success).toBe(true);
    expect(context.safetyVerdict?.groundingVerification).toBeDefined();
    expect(context.safetyVerdict?.outputGuardrail).toBeDefined();
  });

  it('handles Unicode and RTL text in generated response', async () => {
    mockProvider.setFlag([]);
    const rtlResponse = 'مرحبا بكم في خدمة العملاء لدينا. נו שלום שלום 🎉 你好';
    const context = createContext({ generatedResponse: rtlResponse });
    const result = await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier, piiDetector });
    expect(result.success).toBe(true);
    expect(context.generatedResponse).toBe(rtlResponse);
  });

  it('handles emoji and special characters in response', async () => {
    mockProvider.setFlag([]);
    const emojiResponse = 'Thank you! 😊 We\'ll help you with your order #1234 @support 🚀';
    const context = createContext({ generatedResponse: emojiResponse });
    const result = await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier, piiDetector });
    expect(result.success).toBe(true);
    expect(context.generatedResponse).toBe(emojiResponse);
  });

  it('preserves policy violation count across stages', async () => {
    mockProvider.setFlag(['policy_violation']);
    const context = createContext({
      generatedResponse: 'policy violation',
      sessionState: {
        sessionId: 'test-session', version: 1, stateMachine: 'active', data: { policyViolationCount: 2 },
        sequenceCounter: 1, configVersion: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
    });
    await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier, piiDetector });
    expect(context.safetyVerdict?.escalation?.policyViolationCount).toBe(3);
  });

  it('handles missing tenantConfig gracefully', async () => {
    mockProvider.setFlag([]);
    const context = createContext({ tenantConfig: undefined as any });
    const result = await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier, piiDetector });
    expect(result.success).toBe(true);
    expect(context.generatedResponse).toBeDefined();
  });

  it('handles null generatedResponse', async () => {
    const context = createContext({ generatedResponse: null as any });
    const result = await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier, piiDetector });
    expect(result.success).toBe(true);
  });

  it('overlapping PII types in output (email + phone)', async () => {
    mockProvider.setFlag([]);
    const groundingNoPii = new GroundingVerifier();
    const context = createContext({ generatedResponse: 'Call me at 555-123-4567 or email test@example.com' });
    await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier: groundingNoPii, piiDetector });
    expect(context.safetyVerdict?.piiRedaction?.outputPiiFound).toBe(true);
  });

  it('grounding pass + guardrail flag + PII mask chains correctly', async () => {
    const groundingNoPii = new GroundingVerifier();
    mockProvider.setFlag(['toxicity']);
    const context = createContext({ generatedResponse: 'toxic message with john@example.com' });
    await execute({ context, signal: new AbortController().signal }, { outputGuardrail, groundingVerifier: groundingNoPii, piiDetector });
    // Guardrail flags first (toxicity) → fallback. Then PII runs on fallback (no PII).
    expect(context.safetyVerdict?.outputGuardrail?.passed).toBe(false);
    expect(context.generatedResponse).toBe(BASE_CONFIG.fallbackResponse);
    expect(context.safetyVerdict?.piiRedaction?.outputPiiFound).toBe(false);
  });
});
