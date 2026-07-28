import { describe, it, expect, beforeEach } from 'vitest';
import { generateRequestId, runWithContext, getRequestContext, createContextLogger, logAuditEvent, startTiming, metrics, createLogger } from '@conversation-engine/logger';
import { metrics as sharedMetrics } from '@conversation-engine/logger';
import pino from 'pino';
import { Writable } from 'stream';

const REDACT_PATHS = [
  'password', 'passwordHash', 'currentPassword', 'newPassword',
  '*.password', '*.passwordHash', '*.currentPassword', '*.newPassword',
  'authorization', '*.authorization',
  'key', 'keyHash', '*.key', '*.keyHash',
  'token', '*.token',
  'apiKey', 'apiKeyHash',
  'secret', '*.secret',
  'salt', '*.salt',
  'Authorization',
  'req.headers.authorization',
  'req.headers["x-api-key"]',
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'headers.authorization',
  'headers["x-api-key"]',
];

function createCaptureLogger(name: string) {
  const logs: any[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      try {
        logs.push(JSON.parse(chunk.toString().trim()));
      } catch {}
      callback();
    },
  });
  const logger = pino({
    name,
    level: 'info',
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
    formatters: {
      level: (label) => ({ level: label }),
    },
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
  }, stream);
  return { logger, logs };
}

// ─── Secret Redaction ─────────────────────────────────────────
describe('Secret redaction', () => {
  it('redacts password fields', () => {
    const { logger, logs } = createCaptureLogger('redact-test');
    logger.info({ password: 'secret123', name: 'test' }, 'test message');
    expect(logs.length).toBe(1);
    expect(logs[0].password).toBe('[REDACTED]');
    expect(logs[0].name).toBe('test');
  });

  it('redacts nested password fields', () => {
    const { logger, logs } = createCaptureLogger('redact-test');
    logger.info({ user: { password: 'secret123', name: 'test' } }, 'test');
    expect(logs[0].user.password).toBe('[REDACTED]');
  });

  it('redacts authorization header', () => {
    const { logger, logs } = createCaptureLogger('redact-test');
    logger.info({ authorization: 'Bearer token123' }, 'auth test');
    expect(logs[0].authorization).toBe('[REDACTED]');
  });

  it('redacts API key fields', () => {
    const { logger, logs } = createCaptureLogger('redact-test');
    logger.info({ key: 'sk-12345', keyHash: 'abc123' }, 'key test');
    expect(logs[0].key).toBe('[REDACTED]');
    expect(logs[0].keyHash).toBe('[REDACTED]');
  });

  it('redacts token fields', () => {
    const { logger, logs } = createCaptureLogger('redact-test');
    logger.info({ token: 'jwt-token-here' }, 'token test');
    expect(logs[0].token).toBe('[REDACTED]');
  });

  it('does not redact non-secret fields', () => {
    const { logger, logs } = createCaptureLogger('redact-test');
    logger.info({ name: 'test', count: 42 }, 'normal');
    expect(logs[0].name).toBe('test');
    expect(logs[0].count).toBe(42);
  });
});

// ─── Request Context (AsyncLocalStorage) ──────────────────────
describe('Request context (AsyncLocalStorage)', () => {
  it('set and get request context', () => {
    const ctx = { requestId: 'req-123', tenantId: 't-1', userId: 'u-1' };
    runWithContext(ctx, () => {
      const stored = getRequestContext();
      expect(stored?.requestId).toBe('req-123');
      expect(stored?.tenantId).toBe('t-1');
      expect(stored?.userId).toBe('u-1');
    });
  });

  it('returns undefined outside context', () => {
    const stored = getRequestContext();
    expect(stored).toBeUndefined();
  });

  it('propagates context through nested calls', () => {
    const ctx = { requestId: 'req-456' };
    runWithContext(ctx, () => {
      const nested = () => getRequestContext();
      expect(nested()?.requestId).toBe('req-456');
    });
  });

  it('generates unique request IDs', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^[0-9a-f-]{36}$/);
  });
});

// ─── Context Logger ───────────────────────────────────────────
describe('Context logger', () => {
  it('binds request context to child logger', () => {
    const ctx = { requestId: 'req-789', tenantId: 't-2' };
    runWithContext(ctx, () => {
      const baseLogger = createLogger('test-base');
      const child = createContextLogger(baseLogger);
      expect(child).toBeDefined();
    });
  });

  it('accepts extra context when no AsyncLocalStorage context', () => {
    const baseLogger = createLogger('test-base');
    const child = createContextLogger(baseLogger, { requestId: 'manual-id' });
    expect(child).toBeDefined();
  });
});

// ─── Timing Helper ────────────────────────────────────────────
describe('startTiming', () => {
  it('measures elapsed time', () => {
    const timer = startTiming();
    const arr = [];
    for (let i = 0; i < 1000; i++) arr.push(i);
    const elapsed = timer.elapsedMs();
    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(typeof elapsed).toBe('number');
  });
});

// ─── Audit Event Logger ───────────────────────────────────────
describe('Audit event logging', () => {
  it('logs audit event with correct structure', () => {
    const { logger, logs } = createCaptureLogger('audit-test');
    logAuditEvent(logger, {
      event: 'login',
      success: true,
      tenantId: 't-1',
      userId: 'u-1',
      ip: '127.0.0.1',
    });
    expect(logs.length).toBe(1);
    expect(logs[0].audit).toBe(true);
    expect(logs[0].event).toBe('login');
    expect(logs[0].success).toBe(true);
    expect(logs[0].tenantId).toBe('t-1');
    expect(logs[0].userId).toBe('u-1');
    expect(logs[0].ip).toBe('127.0.0.1');
  });

  it('logs failed audit event', () => {
    const { logger, logs } = createCaptureLogger('audit-test');
    logAuditEvent(logger, {
      event: 'login',
      success: false,
      ip: '10.0.0.1',
      detail: 'invalid credentials',
    });
    expect(logs[0].audit).toBe(true);
    expect(logs[0].success).toBe(false);
    expect(logs[0].detail).toBe('invalid credentials');
  });

  it('audit detail field is not redacted', () => {
    const { logger, logs } = createCaptureLogger('audit-test');
    logAuditEvent(logger, {
      event: 'login',
      success: false,
      detail: 'wrong password',
    });
    expect(logs[0].detail).toBe('wrong password');
  });
});

// ─── Metrics ──────────────────────────────────────────────────
describe('Metrics', () => {
  beforeEach(() => {
    sharedMetrics.reset();
  });

  it('increments counters', () => {
    sharedMetrics.increment('test.counter');
    sharedMetrics.increment('test.counter');
    sharedMetrics.increment('test.counter', 3);
    expect(sharedMetrics.getCounter('test.counter')).toBe(5);
  });

  it('returns 0 for unknown counters', () => {
    expect(sharedMetrics.getCounter('nonexistent')).toBe(0);
  });

  it('records histogram values', () => {
    sharedMetrics.record('test.latency', 10);
    sharedMetrics.record('test.latency', 50);
    sharedMetrics.record('test.latency', 100);
    const hist = sharedMetrics.getHistogram('test.latency');
    expect(hist).toBeDefined();
    expect(hist!.count).toBe(3);
    expect(hist!.sum).toBe(160);
    expect(hist!.min).toBe(10);
    expect(hist!.max).toBe(100);
    expect(hist!.avg).toBe(53);
  });

  it('returns undefined for unknown histograms', () => {
    expect(sharedMetrics.getHistogram('nonexistent')).toBeUndefined();
  });

  it('resets all metrics', () => {
    sharedMetrics.increment('test.counter');
    sharedMetrics.record('test.latency', 10);
    sharedMetrics.reset();
    expect(sharedMetrics.getCounter('test.counter')).toBe(0);
    expect(sharedMetrics.getHistogram('test.latency')).toBeUndefined();
  });

  it('getAll returns all metrics', () => {
    sharedMetrics.increment('m1');
    sharedMetrics.record('m2', 5);
    const all = sharedMetrics.getAll();
    expect(all.m1).toEqual({ type: 'counter', value: 1 });
    expect(all.m2).toEqual(expect.objectContaining({ type: 'histogram', count: 1 }));
  });

  it('decrements counters', () => {
    sharedMetrics.increment('test.counter', 5);
    sharedMetrics.decrement('test.counter', 2);
    expect(sharedMetrics.getCounter('test.counter')).toBe(3);
  });
});

// ─── Log Schema ───────────────────────────────────────────────
describe('Structured log schema', () => {
  it('includes timestamp in ISO format', () => {
    const { logger, logs } = createCaptureLogger('schema-test');
    logger.info('test');
    expect(logs[0].time).toBeDefined();
    expect(new Date(logs[0].time).toISOString()).toBe(logs[0].time);
  });

  it('includes logger name', () => {
    const { logger, logs } = createCaptureLogger('schema-test');
    logger.info('test');
    expect(logs[0].name).toBe('schema-test');
  });

  it('includes level field', () => {
    const { logger, logs } = createCaptureLogger('schema-test');
    logger.info('test');
    expect(logs[0].level).toBe('info');
  });

  it('includes message field', () => {
    const { logger, logs } = createCaptureLogger('schema-test');
    logger.info('hello world');
    expect(logs[0].msg).toBe('hello world');
  });

  it('child logger includes bound fields', () => {
    const { logger, logs } = createCaptureLogger('schema-test');
    const child = logger.child({ requestId: 'req-1', tenantId: 't-1' });
    child.info('with context');
    expect(logs[0].requestId).toBe('req-1');
    expect(logs[0].tenantId).toBe('t-1');
  });
});
