import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

// ─── Request Context (AsyncLocalStorage) ──────────────────────
export interface RequestContext {
  requestId: string;
  tenantId?: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
}

const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return requestContext.run(ctx, fn);
}

export function generateRequestId(): string {
  return randomUUID();
}

// ─── Secret Redaction Paths ───────────────────────────────────
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

// ─── Logger Factory ───────────────────────────────────────────
export type Logger = pino.Logger;

export function createLogger(name: string): Logger {
  return pino({
    name,
    level: process.env.LOG_LEVEL || 'info',
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
    formatters: {
      level: (label) => ({ level: label }),
    },
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

// ─── Context-Aware Child Logger ───────────────────────────────
export function createContextLogger(
  baseLogger: Logger,
  extra?: Partial<RequestContext>,
): Logger {
  const ctx = getRequestContext();
  return baseLogger.child({
    requestId: ctx?.requestId || extra?.requestId,
    tenantId: ctx?.tenantId || extra?.tenantId,
    userId: ctx?.userId || extra?.userId,
    sessionId: ctx?.sessionId || extra?.sessionId,
  });
}

// ─── Timing Helper ────────────────────────────────────────────
export function startTiming(): { elapsedMs: () => number } {
  const start = performance.now();
  return {
    elapsedMs: () => Math.round(performance.now() - start),
  };
}

// ─── Audit Event Logger ───────────────────────────────────────
export interface AuditEvent {
  event: string;
  success: boolean;
  tenantId?: string;
  userId?: string;
  ip?: string;
  detail?: string;
}

export function logAuditEvent(logger: Logger, event: AuditEvent): void {
  const ctx = getRequestContext();
  logger.info({
    audit: true,
    event: event.event,
    success: event.success,
    tenantId: event.tenantId || ctx?.tenantId,
    userId: event.userId || ctx?.userId,
    ip: event.ip || ctx?.ip,
    detail: event.detail,
  }, `audit: ${event.event} ${event.success ? 'succeeded' : 'failed'}`);
}

// Re-export pino types
export { pino };

// Re-export metrics
export { metrics } from './metrics';
export type { Metrics } from './metrics';
