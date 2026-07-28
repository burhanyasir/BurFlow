import { describe, it, expect, beforeEach } from 'vitest';
import { InputGuardrailEngine } from '../engine';
import { CircuitBreaker } from '../circuit-breaker';
import { GuardrailCategory, ClassifierProvider } from '../types';

class MockProvider implements ClassifierProvider {
  readonly name = 'mock';
  private shouldFlag: boolean = false;
  private flagCategories: GuardrailCategory[] = [];
  private shouldTimeout: boolean = false;
  private shouldThrow: boolean = false;

  setFlag(categories: GuardrailCategory[]): void {
    this.shouldFlag = categories.length > 0;
    this.flagCategories = categories;
  }

  setTimeout(): void {
    this.shouldTimeout = true;
  }

  setThrow(): void {
    this.shouldThrow = true;
  }

  async classify(_message: string, signal: AbortSignal): Promise<{ flagged: boolean; categories: GuardrailCategory[] }> {
    if (this.shouldTimeout) {
      // Simulate timeout by waiting forever (signal will abort)
      await new Promise(() => {});
      return { flagged: false, categories: [] };
    }
    if (this.shouldThrow) {
      throw new Error('Classifier unavailable');
    }
    return { flagged: this.shouldFlag, categories: this.flagCategories };
  }
}

describe('InputGuardrailEngine', () => {
  let provider: MockProvider;
  let breaker: CircuitBreaker;
  let engine: InputGuardrailEngine;

  beforeEach(() => {
    provider = new MockProvider();
    breaker = new CircuitBreaker(3, 100);
    engine = new InputGuardrailEngine(provider, breaker, 5000);
  });

  it('passes normal message through', async () => {
    provider.setFlag([]);
    const result = await engine.check('What are your hours?', new AbortController().signal);
    expect(result.passed).toBe(true);
    expect(result.categories).toEqual([]);
    expect(result.fallbackUsed).toBe(false);
  });

  it('flags hate speech', async () => {
    provider.setFlag(['hate_speech']);
    const result = await engine.check('hate speech content', new AbortController().signal);
    expect(result.passed).toBe(false);
    expect(result.categories).toContain('hate_speech');
  });

  it('flags toxicity', async () => {
    provider.setFlag(['toxicity']);
    const result = await engine.check('toxic content', new AbortController().signal);
    expect(result.passed).toBe(false);
    expect(result.categories).toContain('toxicity');
  });

  it('flags sexual content', async () => {
    provider.setFlag(['sexual']);
    const result = await engine.check('sexual content', new AbortController().signal);
    expect(result.passed).toBe(false);
    expect(result.categories).toContain('sexual');
  });

  it('flags violence', async () => {
    provider.setFlag(['violence']);
    const result = await engine.check('violent content', new AbortController().signal);
    expect(result.passed).toBe(false);
    expect(result.categories).toContain('violence');
  });

  it('flags policy violations', async () => {
    provider.setFlag(['policy_violation']);
    const result = await engine.check('policy violation', new AbortController().signal);
    expect(result.passed).toBe(false);
    expect(result.categories).toContain('policy_violation');
  });

  it('handles multiple categories', async () => {
    provider.setFlag(['hate_speech', 'toxicity']);
    const result = await engine.check('multiple flags', new AbortController().signal);
    expect(result.passed).toBe(false);
    expect(result.categories).toContain('hate_speech');
    expect(result.categories).toContain('toxicity');
  });

  it('degrades gracefully on timeout', async () => {
    provider.setTimeout();
    const controller = new AbortController();
    // Use a very short timeout engine
    const fastEngine = new InputGuardrailEngine(provider, breaker, 1);
    const result = await fastEngine.check('timeout message', controller.signal);
    expect(result.passed).toBe(true);
    expect(result.fallbackUsed).toBe(true);
  }, 10000);

  it('degrades gracefully when classifier throws', async () => {
    provider.setThrow();
    const result = await engine.check('error message', new AbortController().signal);
    expect(result.passed).toBe(true);
    expect(result.fallbackUsed).toBe(true);
  });

  it('opens circuit breaker after threshold failures', async () => {
    provider.setThrow();
    for (let i = 0; i < 3; i++) {
      await engine.check('fail', new AbortController().signal);
    }
    expect(breaker.getState()).toBe('OPEN');
  });

  it('skips classification when circuit breaker is open (degraded)', async () => {
    // Open the breaker
    provider.setThrow();
    for (let i = 0; i < 3; i++) {
      await engine.check('fail', new AbortController().signal);
    }
    expect(breaker.getState()).toBe('OPEN');

    // Now set provider to flag (but it shouldn't be called since breaker is open)
    provider.setFlag(['hate_speech']);
    const result = await engine.check('hate speech', new AbortController().signal);
    expect(result.passed).toBe(true);
    expect(result.fallbackUsed).toBe(true);
    expect(result.categories).toEqual([]);
  });

  it('closes circuit breaker after reset timeout on success', async () => {
    // Force open
    breaker.forceState('OPEN');
    const shortBreaker = new CircuitBreaker(3, 1);
    const fastEngine = new InputGuardrailEngine(provider, shortBreaker, 5000);
    shortBreaker.forceState('OPEN');

    // Wait for reset (1ms)
    await new Promise((r) => setTimeout(r, 5));

    // Should transition to HALF_OPEN, then succeed → CLOSED
    provider.setFlag([]);
    const result = await fastEngine.check('probe', new AbortController().signal);
    expect(result.passed).toBe(true);
    expect(shortBreaker.getState()).toBe('CLOSED');
  });

  it('records failure count', async () => {
    provider.setThrow();
    expect(breaker.getFailureCount()).toBe(0);
    await engine.check('fail', new AbortController().signal);
    expect(breaker.getFailureCount()).toBe(1);
    await engine.check('fail', new AbortController().signal);
    expect(breaker.getFailureCount()).toBe(2);
  });
});

describe('adversarial — input-guardrail', () => {
  let localProvider: MockProvider;
  let localBreaker: CircuitBreaker;
  let localEngine: InputGuardrailEngine;

  beforeEach(() => {
    localProvider = new MockProvider();
    localBreaker = new CircuitBreaker(3, 30000);
    localEngine = new InputGuardrailEngine(localProvider, localBreaker, 5000);
  });

  it('handles very large input message without throwing', async () => {
    localProvider.setFlag([]);
    const largeMsg = 'A'.repeat(100000);
    const result = await localEngine.check(largeMsg, new AbortController().signal);
    expect(result.passed).toBe(true);
  });

  it('handles Unicode and special characters', async () => {
    localProvider.setFlag([]);
    const unicodeMsg = '你好 👋 Привет مرحبا 🎉 こんにちは';
    const result = await localEngine.check(unicodeMsg, new AbortController().signal);
    expect(result.passed).toBe(true);
  });

  it('handles RTL text correctly', async () => {
    localProvider.setFlag([]);
    const rtlMsg = 'مرحبا بكم في خدمة العملاء. נו שלום!';
    const result = await localEngine.check(rtlMsg, new AbortController().signal);
    expect(result.passed).toBe(true);
  });

  it('handles messages with only whitespace and special chars', async () => {
    localProvider.setFlag([]);
    const wsMsg = '   \n\t\r   !@#$%^&*()_+-=[]{}|;\':",./<>?`~';
    const result = await localEngine.check(wsMsg, new AbortController().signal);
    expect(result.passed).toBe(true);
  });
});
