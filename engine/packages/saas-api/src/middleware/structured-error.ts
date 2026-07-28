import { Request, Response, NextFunction } from 'express';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
const log = createLogger('saas-api:error');

export interface StructuredError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public details?: Record<string, unknown>;

  constructor(code: string, message: string, statusCode = 400, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super('FORBIDDEN', message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(errors: string[]) {
    super('VALIDATION_ERROR', 'Validation failed', 400, { errors });
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('RATE_LIMIT_EXCEEDED', 'Too many requests', 429, retryAfter ? { retryAfterSeconds: retryAfter } : undefined);
  }
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = (req as any).requestId || 'unknown';
  
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
      requestId,
    } as ErrorResponse);
    return;
  }

  if ((err as any).type === 'entity.parse.failed') {
    res.status(400).json({
      error: 'Invalid JSON in request body',
      code: 'INVALID_JSON',
      requestId,
    } as ErrorResponse);
    return;
  }

  // Unknown errors - log and don't leak details
  createContextLogger(log).error({ err, requestId }, 'Unhandled error');

  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    requestId,
  } as ErrorResponse);
}