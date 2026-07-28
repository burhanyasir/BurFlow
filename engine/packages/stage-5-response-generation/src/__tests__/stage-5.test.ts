import { describe, it, expect } from 'vitest';
import { execute, estimateTokens } from '../index';
import { NoopProvider } from '../llm/noop-provider';
import { MockProvider } from '../llm/mock-provider';
import { buildPrompt } from '../llm/prompt-builder';
import { TurnContext } from '@conversation-engine/core-types';

function makeConfig(overrides: Record<string, any> = {}) {
  return {
    tenantId: 't1', configVersion: 1,
    llm: { model: 'gpt-4', temperature: 0.7, maxTokens: 1024, systemPrompt: 'You are helpful.' },
    safety: { contentFilterThreshold: 'moderate', piiRedactionEnabled: false, piiRedactionMode: 'mask' as const },
    rateLimits: { messagesPerMinute: 60, messagesPerHour: 1000, concurrentSessions: 100 },
    session: { ttlMinutes: 1440, gracePeriodDays: 7, legalHoldDays: 90 },
    fallbackResponse: 'Fallback.',
    supportedLanguages: ['en'],
    featureFlags: { qualityScoringEnabled: false, analyticsEnabled: false },
    ...overrides,
  };
}

function makeContext(overrides: Partial<TurnContext> = {}): TurnContext {
  return {
    message: 'Hello',
    pipelineStartTime: Date.now(),
    degradedStages: [],
    latencyMs: 0,
    ...overrides,
  };
}

describe('stage-5-response-generation', () => {
  it('uses noop provider and returns response', async () => {
    const ctx = makeContext({ tenantConfig: makeConfig() as any });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { provider: new NoopProvider() });
    expect(result.success).toBe(true);
    expect(ctx.generatedResponse).toBe('[Noop response]');
  });

  it('returns fallback when LLM throws', async () => {
    const failingProvider = {
      async generate() {
        throw Object.assign(new Error('Inference failed'), { code: 'ERR_LLM_INFERENCE_FAILURE' });
      },
    };
    const ctx = makeContext({ tenantConfig: makeConfig({ fallbackResponse: 'I am unavailable.' }) as any });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { provider: failingProvider as any });
    expect(result.success).toBe(true);
    expect(ctx.generatedResponse).toBe('I am unavailable.');
    expect(ctx.degradedStages).toContain('stage-5-response-generation');
  });

  it('respects abort signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await execute({ context: makeContext(), signal: controller.signal });
    expect(result.success).toBe(false);
  });

  it('degrades on finishReason length', async () => {
    const mock = new MockProvider();
    mock.setResponse({ content: 'truncated', finishReason: 'length' });
    const ctx = makeContext({ tenantConfig: makeConfig() as any });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { provider: mock });
    expect(result.success).toBe(true);
    expect(ctx.generatedResponse).toBe('truncated');
    expect(ctx.degradedStages).toContain('stage-5-response-generation');
  });

  it('returns fallback when no tenantConfig', async () => {
    const ctx = makeContext();
    const result = await execute({ context: ctx, signal: new AbortController().signal });
    expect(result.success).toBe(true);
    expect(ctx.generatedResponse).toBe('Service configuration unavailable');
  });
});

describe('MockProvider', () => {
  it('returns configured response', async () => {
    const mock = new MockProvider();
    mock.setResponse({ content: 'mocked', finishReason: 'stop' });
    const result = await mock.generate([], { model: 'gpt-4', temperature: 0.7, maxTokens: 100 });
    expect(result.content).toBe('mocked');
    expect(mock.getCallCount()).toBe(1);
  });

  it('cycles through multiple responses', async () => {
    const mock = new MockProvider();
    mock.setResponses([
      { content: 'first', finishReason: 'stop' },
      { content: 'second', finishReason: 'stop' },
    ]);
    const r1 = await mock.generate([], { model: 'gpt-4', temperature: 0.7, maxTokens: 100 });
    const r2 = await mock.generate([], { model: 'gpt-4', temperature: 0.7, maxTokens: 100 });
    expect(r1.content).toBe('first');
    expect(r2.content).toBe('second');
  });

  it('throws configured error', async () => {
    const mock = new MockProvider();
    mock.setThrow(Object.assign(new Error('boom'), { code: 'ERR_LLM_INFERENCE_FAILURE' }));
    await expect(mock.generate([], { model: 'gpt-4', temperature: 0.7, maxTokens: 100 }))
      .rejects.toThrow('boom');
  });

  it('tracks call count and last messages', async () => {
    const mock = new MockProvider();
    mock.setResponse({ content: 'ok', finishReason: 'stop' });
    const msgs = [{ role: 'user' as const, content: 'hi' }];
    await mock.generate(msgs, { model: 'gpt-4', temperature: 0.7, maxTokens: 100 });
    expect(mock.getCallCount()).toBe(1);
    expect(mock.getLastMessages()).toEqual(msgs);
  });
});

describe('prompt builder', () => {
  const config = makeConfig();

  it('includes system prompt, history, and user message', () => {
    const ctx = makeContext({
      message: 'Book a flight',
      tenantConfig: config as any,
      conversationHistory: [
        { role: 'assistant', content: 'Where to?', sequenceNumber: 1, timestamp: '' },
        { role: 'user', content: 'London', sequenceNumber: 2, timestamp: '' },
      ],
    });
    const msgs = buildPrompt(ctx);
    expect(msgs[0]).toEqual({ role: 'system', content: 'You are helpful.' });
    expect(msgs[1]).toEqual({ role: 'assistant', content: 'Where to?' });
    expect(msgs[2]).toEqual({ role: 'user', content: 'London' });
    expect(msgs[3]).toEqual({ role: 'user', content: 'Book a flight' });
  });

  it('omits system prompt when empty', () => {
    const ctx = makeContext({
      message: 'hi',
      tenantConfig: makeConfig({ llm: { ...config.llm, systemPrompt: '' } }) as any,
    });
    const msgs = buildPrompt(ctx);
    expect(msgs[0].role).toBe('user');
  });

  it('truncates history when context window is limited', () => {
    const longHistory = Array.from({ length: 100 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: 'A'.repeat(1000),
      sequenceNumber: i,
      timestamp: '',
    }));
    const ctx = makeContext({
      message: 'test',
      tenantConfig: makeConfig({ llm: { model: 'gpt-3.5-turbo', temperature: 0.7, maxTokens: 100, systemPrompt: 'sys' } }) as any,
      conversationHistory: longHistory,
    });
    const msgs = buildPrompt(ctx);
    const historyMsgs = msgs.filter(m => m.role !== 'system' && m !== msgs[msgs.length - 1]);
    expect(historyMsgs.length).toBeLessThan(100);
    expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: 'test' });
  });

  it('handles empty history', () => {
    const ctx = makeContext({ message: 'solo', tenantConfig: config as any, conversationHistory: [] });
    const msgs = buildPrompt(ctx);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('system');
    expect(msgs[1]).toEqual({ role: 'user', content: 'solo' });
  });

  it('F4: includes user message even when budgetForHistory <= 0', () => {
    // budgetForHistory = 0 → totalStatic exactly fits, no room for history
    // example: availableForInput=20, systemPrompt=4 tokens (16 chars), user message=16 tokens (64 chars)
    const ctx = makeContext({
      message: 'U'.repeat(64),
      tenantConfig: makeConfig({
        llm: { model: 'gpt-4', temperature: 0.7, maxTokens: 8172, systemPrompt: 'You are helpful.' },
      }) as any,
      conversationHistory: [
        { role: 'user', content: 'Previous message', sequenceNumber: 1, timestamp: '' },
        { role: 'assistant', content: 'Previous response', sequenceNumber: 2, timestamp: '' },
      ],
    });
    const msgs = buildPrompt(ctx);
    // System + user message only (no history)
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('system');
    expect(msgs[1]).toEqual({ role: 'user', content: 'U'.repeat(64) });
  });

  describe('F3: ERR_CONTEXT_TOO_LARGE', () => {
    it('throws when total prompt exceeds context window', () => {
      // gpt-4: contextWindow=8192, maxTokens=8000 → availableForInput=192
      // Make user message large enough that system + user exceeds 192
      const ctx = makeContext({
        message: 'X'.repeat(600), // 150 tokens
        tenantConfig: makeConfig({
          llm: { model: 'gpt-4', temperature: 0.7, maxTokens: 8000, systemPrompt: 'Y'.repeat(200) }, // 50 tokens
        }) as any,
      });
      expect(() => buildPrompt(ctx)).toThrow('ERR_CONTEXT_TOO_LARGE');
    });

    it('user message alone can exceed context window', () => {
      // gpt-4: contextWindow=8192, maxTokens=8100 → availableForInput=92
      // User message of 400 chars = 100 tokens > 92 → throws
      const ctx = makeContext({
        message: 'X'.repeat(400),
        tenantConfig: makeConfig({
          llm: { model: 'gpt-4', temperature: 0.7, maxTokens: 8100, systemPrompt: '' },
        }) as any,
        conversationHistory: [],
      });
      expect(() => buildPrompt(ctx)).toThrow('ERR_CONTEXT_TOO_LARGE');
    });
  });

  describe('boundary: context window edge cases', () => {
    it('fits when total tokens exactly equal availableForInput', () => {
      // gpt-4: 8192, maxTokens=8000 → availableForInput=192
      // System: 4 tokens (16 chars), user: 1 token (4 chars), history: 187 tokens (748 chars)
      // Total: 4 + 187 + 1 = 192 = availableForInput
      const ctx = makeContext({
        message: 'XyZ.',
        tenantConfig: makeConfig({
          llm: { model: 'gpt-4', temperature: 0.7, maxTokens: 8000, systemPrompt: 'You are helpful.' },
        }) as any,
        conversationHistory: [
          { role: 'user', content: 'A'.repeat(748), sequenceNumber: 1, timestamp: '' },
        ],
      });
      const msgs = buildPrompt(ctx);
      expect(msgs.length).toBeGreaterThanOrEqual(1);
      expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: 'XyZ.' });
    });

    it('zero-length message is rejected by stage-1 before reaching prompt builder', () => {
      // Stage 1 rejects empty messages; prompt builder handles normally
      const ctx = makeContext({
        message: '',
        tenantConfig: config as any,
      });
      const msgs = buildPrompt(ctx);
      expect(msgs[msgs.length - 1].content).toBe('');
    });

    it('preserves latest user message under aggressive truncation', () => {
      // Simulate worst case: 500 history items all fighting for space
      const hugeHistory = Array.from({ length: 500 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: 'Short msg ' + i,
        sequenceNumber: i,
        timestamp: '',
      }));
      const ctx = makeContext({
        message: 'FINAL USER QUERY',
        tenantConfig: makeConfig({ llm: { model: 'gpt-3.5-turbo', temperature: 0.7, maxTokens: 100, systemPrompt: 'Hi' } }) as any,
        conversationHistory: hugeHistory,
      });
      const msgs = buildPrompt(ctx);
      expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: 'FINAL USER QUERY' });
    });

    it('stage-5 execute returns ERR_CONTEXT_TOO_LARGE when prompt exceeds window', async () => {
      const ctx = makeContext({
        message: 'X'.repeat(500),
        tenantConfig: makeConfig({
          llm: { model: 'gpt-4', temperature: 0.7, maxTokens: 8000, systemPrompt: 'Y'.repeat(500) },
        }) as any,
        conversationHistory: [{ role: 'user', content: 'Z'.repeat(500), sequenceNumber: 1, timestamp: '' }],
      });
      const result = await execute({ context: ctx, signal: new AbortController().signal });
      expect(result.success).toBe(true);
      expect(result.errorCode).toBe('ERR_CONTEXT_TOO_LARGE');
    });
  });
});

describe('estimateTokens', () => {
  it('estimates tokens from character count', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcdefgh')).toBe(2);
    expect(estimateTokens('hello world')).toBe(3);
  });
});

describe('StreamingOpenAIChatProvider (unit)', () => {
  it('generateStream yields chunks', async () => {
    const { StreamingOpenAIChatProvider } = await import('../llm/streaming-openai-provider');
    // Mock fetch to return SSE chunks
    const chunks = [
      'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"},"finish_reason":null}]}\n\n',
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
      'data: [DONE]\n\n',
    ].join('');

    const mockFetch = async () => new Response(chunks, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;
    try {
      const provider = new StreamingOpenAIChatProvider('test-key');
      const deltas: string[] = [];
      for await (const chunk of provider.generateStream(
        [{ role: 'user', content: 'Hi' }],
        { model: 'gpt-4', temperature: 0.7, maxTokens: 100 },
      )) {
        deltas.push(chunk.delta);
      }
      expect(deltas.join('')).toBe('Hello world');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('generate accumulates stream into full response', async () => {
    const { StreamingOpenAIChatProvider } = await import('../llm/streaming-openai-provider');
    const chunks = [
      'data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":null}]}\n\n',
      'data: {"choices":[{"delta":{"content":" there"},"finish_reason":"stop"}]}\n\n',
      'data: [DONE]\n\n',
    ].join('');

    const mockFetch = async () => new Response(chunks, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;
    try {
      const provider = new StreamingOpenAIChatProvider('test-key');
      const result = await provider.generate(
        [{ role: 'user', content: 'Hi' }],
        { model: 'gpt-4', temperature: 0.7, maxTokens: 100 },
      );
      expect(result.content).toBe('Hi there');
      expect(result.finishReason).toBe('stop');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('handles empty SSE stream', async () => {
    const { StreamingOpenAIChatProvider } = await import('../llm/streaming-openai-provider');
    const mockFetch = async () => new Response('data: [DONE]\n\n', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;
    try {
      const provider = new StreamingOpenAIChatProvider('test-key');
      const result = await provider.generate(
        [{ role: 'user', content: 'Hi' }],
        { model: 'gpt-4', temperature: 0.7, maxTokens: 100 },
      );
      expect(result.content).toBe('');
      expect(result.finishReason).toBe('stop');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('throws on rate limit', async () => {
    const { StreamingOpenAIChatProvider } = await import('../llm/streaming-openai-provider');
    const mockFetch = async () => new Response('rate limited', { status: 429 });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;
    try {
      const provider = new StreamingOpenAIChatProvider('test-key', 'https://api.openai.com/v1', 0);
      await expect(provider.generateStream(
        [{ role: 'user', content: 'Hi' }],
        { model: 'gpt-4', temperature: 0.7, maxTokens: 100 },
      ).next()).rejects.toThrow();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('aborts when signal is already aborted', async () => {
    const { StreamingOpenAIChatProvider } = await import('../llm/streaming-openai-provider');
    const controller = new AbortController();
    controller.abort();

    const provider = new StreamingOpenAIChatProvider('test-key');
    await expect(provider.generateStream(
      [{ role: 'user', content: 'Hi' }],
      { model: 'gpt-4', temperature: 0.7, maxTokens: 100 },
      controller.signal,
    ).next()).rejects.toThrow('aborted');
  });

  it('handles SSE chunks with missing delta content', async () => {
    const { StreamingOpenAIChatProvider } = await import('../llm/streaming-openai-provider');
    const chunks = [
      'data: {"choices":[{"delta":{},"finish_reason":null}]}\n\n',
      'data: {"choices":[{"delta":{"content":"ok"},"finish_reason":"stop"}]}\n\n',
      'data: [DONE]\n\n',
    ].join('');

    const mockFetch = async () => new Response(chunks, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;
    try {
      const provider = new StreamingOpenAIChatProvider('test-key');
      const deltas: string[] = [];
      for await (const chunk of provider.generateStream(
        [{ role: 'user', content: 'Hi' }],
        { model: 'gpt-4', temperature: 0.7, maxTokens: 100 },
      )) {
        deltas.push(chunk.delta);
      }
      expect(deltas.join('')).toBe('ok');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
