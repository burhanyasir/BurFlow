import { describe, it, expect } from 'vitest';
import { execute } from '../index';
import { TurnContext } from '@conversation-engine/core-types';

function makeContext(overrides: Partial<TurnContext> = {}): TurnContext {
  return { message: 'hi', pipelineStartTime: Date.now(), degradedStages: [], latencyMs: 0, ...overrides };
}

describe('stage-8-dispatch', () => {
  it('dispatches generated response', async () => {
    const ctx = makeContext({ generatedResponse: 'Hello, how can I help?' });
    const result = await execute({ context: ctx, signal: new AbortController().signal });
    expect(result.success).toBe(true);
    expect(ctx.finalResponse).toBe('Hello, how can I help?');
    expect(ctx.statusCode).toBe(200);
  });

  it('provides default response when none generated', async () => {
    const ctx = makeContext({ generatedResponse: undefined, finalResponse: undefined });
    const result = await execute({ context: ctx, signal: new AbortController().signal });
    expect(result.success).toBe(true);
    expect(ctx.finalResponse).toBe('Request received');
  });
});
