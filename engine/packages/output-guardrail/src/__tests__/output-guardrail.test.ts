import { describe, it, expect, beforeEach } from 'vitest';
import { OutputGuardrailEngine } from '../engine';
import { CircuitBreaker } from '../circuit-breaker';
import { OutputGuardrailCategory, OutputClassifierProvider } from '../types';

class MockProvider implements OutputClassifierProvider {
  readonly name = 'mock';
  private shouldFlag: boolean = false;
  private flagCategories: OutputGuardrailCategory[] = [];
  private shouldTimeout: boolean = false;
  private shouldThrow: boolean = false;

  setFlag(categories: OutputGuardrailCategory[]): void {
    this.shouldFlag = categories.length > 0;
    this.flagCategories = categories;
  }

  setTimeout(): void {
    this.shouldTimeout = true;
  }

  setThrow(): void {
    this.shouldThrow = true;
  }

  async classify(_response: string, _threshold: string, signal: AbortSignal): Promise<{ flagged: boolean; categories: OutputGuardrailCategory[] }> {
    if (this.shouldTimeout) {
      await new Promise(() => {});
      return { flagged: false, categories: [] };
    }
    if (this.shouldThrow) {
      throw new Error('Classifier unavailable');
    }
    return { flagged: this.shouldFlag, categories: this.flagCategories };
  }
}

describe('OutputGuardrailEngine', () => {
  let provider: MockProvider;
  let breaker: CircuitBreaker;
  let engine: OutputGuardrailEngine;

  beforeEach(() => {
    provider = new MockProvider();
    breaker = new CircuitBreaker(3, 100);
    engine = new OutputGuardrailEngine(provider, breaker, 5000);
  });

  it('passes safe response through', async () => {
    provider.setFlag([]);
    const result = await engine.check('Thank you for your inquiry', 'moderate', new AbortController().signal);
    expect(result.passed).toBe(true);
    expect(result.categories).toEqual([]);
    expect(result.fallbackUsed).toBe(false);
  });

  it('flags toxicity in output', async () => {
    provider.setFlag(['toxicity']);
    const result = await engine.check('toxic output', 'moderate', new AbortController().signal);
    expect(result.passed).toBe(false);
    expect(result.categories).toContain('toxicity');
  });

  it('flags hate speech in output', async () => {
    provider.setFlag(['hate']);
    const result = await engine.check('hateful output', 'moderate', new AbortController().signal);
    expect(result.passed).toBe(false);
    expect(result.categories).toContain('hate');
  });

  it('flags sexual content in output', async () => {
    provider.setFlag(['sexual']);
    const result = await engine.check('sexual output', 'moderate', new AbortController().signal);
    expect(result.passed).toBe(false);
    expect(result.categories).toContain('sexual');
  });

  it('flags violence in output', async () => {
    provider.setFlag(['violence']);
    const result = await engine.check('violent output', 'moderate', new AbortController().signal);
    expect(result.passed).toBe(false);
    expect(result.categories).toContain('violence');
  });

  it('flags policy violations in output', async () => {
    provider.setFlag(['policy_violation']);
    const result = await engine.check('policy violation in output', 'moderate', new AbortController().signal);
    expect(result.passed).toBe(false);
    expect(result.categories).toContain('policy_violation');
  });

  it('handles multiple categories', async () => {
    provider.setFlag(['toxicity', 'hate']);
    const result = await engine.check('multiple flags', 'moderate', new AbortController().signal);
    expect(result.passed).toBe(false);
    expect(result.categories).toContain('toxicity');
    expect(result.categories).toContain('hate');
  });

  it('passes threshold to classifier', async () => {
    let capturedThreshold = '';
    const thresholdProvider: OutputClassifierProvider = {
      name: 'threshold-capture',
      async classify(_response: string, threshold: string, _signal: AbortSignal) {
        capturedThreshold = threshold;
        return { flagged: false, categories: [] };
      },
    };
    const thresholdEngine = new OutputGuardrailEngine(thresholdProvider, breaker, 5000);
    await thresholdEngine.check('test', 'strict', new AbortController().signal);
    expect(capturedThreshold).toBe('strict');
  });

  it('degrades gracefully on timeout', async () => {
    provider.setTimeout();
    const fastEngine = new OutputGuardrailEngine(provider, breaker, 1);
    const result = await fastEngine.check('timeout', 'moderate', new AbortController().signal);
    expect(result.passed).toBe(true);
    expect(result.fallbackUsed).toBe(true);
  }, 10000);

  it('degrades gracefully when classifier throws', async () => {
    provider.setThrow();
    const result = await engine.check('error', 'moderate', new AbortController().signal);
    expect(result.passed).toBe(true);
    expect(result.fallbackUsed).toBe(true);
  });

  it('opens circuit breaker after threshold failures', async () => {
    provider.setThrow();
    for (let i = 0; i < 3; i++) {
      await engine.check('fail', 'moderate', new AbortController().signal);
    }
    expect(breaker.getState()).toBe('OPEN');
  });

  it('skips classification when circuit breaker is open (degraded)', async () => {
    provider.setThrow();
    for (let i = 0; i < 3; i++) {
      await engine.check('fail', 'moderate', new AbortController().signal);
    }
    expect(breaker.getState()).toBe('OPEN');

    provider.setFlag(['toxicity']);
    const result = await engine.check('toxic output', 'moderate', new AbortController().signal);
    expect(result.passed).toBe(true);
    expect(result.fallbackUsed).toBe(true);
    expect(result.categories).toEqual([]);
  });

  it('closes circuit breaker after reset timeout on success', async () => {
    const shortBreaker = new CircuitBreaker(3, 1);
    const fastEngine = new OutputGuardrailEngine(provider, shortBreaker, 5000);
    shortBreaker.forceState('OPEN');

    await new Promise((r) => setTimeout(r, 5));

    provider.setFlag([]);
    const result = await fastEngine.check('probe', 'moderate', new AbortController().signal);
    expect(result.passed).toBe(true);
    expect(shortBreaker.getState()).toBe('CLOSED');
  });

  it('records failure count', async () => {
    provider.setThrow();
    expect(breaker.getFailureCount()).toBe(0);
    await engine.check('fail', 'moderate', new AbortController().signal);
    expect(breaker.getFailureCount()).toBe(1);
    await engine.check('fail', 'moderate', new AbortController().signal);
    expect(breaker.getFailureCount()).toBe(2);
  });
});
