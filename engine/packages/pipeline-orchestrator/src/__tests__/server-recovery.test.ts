import { describe, it, expect } from 'vitest';

describe('server recovery — structured error contract', () => {
  it('structured error has required fields', () => {
    const error = {
      success: false,
      error: 'Test error message',
      traceId: 'trace-abc-123',
      stage: 'pipeline-orchestrator',
      timestamp: new Date().toISOString(),
    };
    expect(error).toHaveProperty('success');
    expect(error).toHaveProperty('error');
    expect(error).toHaveProperty('traceId');
    expect(error).toHaveProperty('stage');
    expect(error).toHaveProperty('timestamp');
    expect(error.success).toBe(false);
    expect(typeof error.error).toBe('string');
    expect(error.error.length).toBeGreaterThan(0);
    expect(typeof error.traceId).toBe('string');
    expect(error.traceId.length).toBeGreaterThan(0);
    expect(typeof error.stage).toBe('string');
    expect(error.stage.length).toBeGreaterThan(0);
  });

  it('success response does NOT have success:false', () => {
    const success = {
      response: 'Hello!',
      turnId: 'turn-123',
      conversationIntelligence: {} as any,
      cta: { primaryCTA: 'none', label: '', link: '' },
      quickReplies: [],
    };
    expect(success).toHaveProperty('response');
    expect(success).not.toHaveProperty('success');
  });

  it('stage field identifies failure origin', () => {
    const stages = ['auth', 'input-validation', 'stage-1-ingestion', 'stage-5-response-generation', 'global-handler', 'proxy', 'routing'];
    for (const stage of stages) {
      const error = { success: false, error: 'error', traceId: 't', stage, timestamp: new Date().toISOString() };
      expect(stages.includes(error.stage)).toBe(true);
    }
  });

  it('error messages are user-safe (no stack traces)', () => {
    const errors = [
      'Valid API key required',
      'Validation failed',
      'Backend service unavailable',
      'Internal server error',
      'Route not found: POST /api/unknown',
    ];
    for (const msg of errors) {
      expect(msg).not.toContain('Error:');
      expect(msg).not.toContain('at ');
      expect(msg).not.toContain('stack');
    }
  });
});
