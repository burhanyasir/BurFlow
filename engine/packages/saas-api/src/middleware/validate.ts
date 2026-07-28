import { Request, Response, NextFunction } from 'express';

// ─── Standard Error Response ──────────────────────────────────
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export function validationError(res: Response, errors: ValidationErrorDetail[]): void {
  res.status(400).json({
    error: 'Validation failed',
    details: errors,
  });
}

// ─── Body Type Guard ──────────────────────────────────────────
export function requireJsonObject(req: Request, res: Response, next: NextFunction): void {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return validationError(res, [{ field: 'body', message: 'Request body must be a JSON object' }]);
  }
  next();
}

// ─── UUID Validation ──────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: unknown): boolean {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function validateUUID(value: unknown, field: string): ValidationErrorDetail | null {
  if (!isValidUUID(value)) {
    return { field, message: `Must be a valid UUID` };
  }
  return null;
}

// ─── Generic ID Validation (accepts pipeline IDs, UUIDs, etc.) ─
const SAFE_ID_RE = /^[a-zA-Z0-9_\-:.]+$/;

export function isValidId(value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0 || value.length > 255) return false;
  return SAFE_ID_RE.test(value);
}

export function validateId(value: unknown, field: string): ValidationErrorDetail | null {
  if (!isValidId(value)) {
    return { field, message: 'Must be a valid identifier' };
  }
  return null;
}

// ─── Email Validation ─────────────────────────────────────────
const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isValidEmail(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (value.length > 254) return false;
  return EMAIL_RE.test(value);
}

export function validateEmail(value: unknown, field: string): ValidationErrorDetail | null {
  if (!isValidEmail(value)) {
    return { field, message: 'Must be a valid email address' };
  }
  return null;
}

// ─── String Validation ────────────────────────────────────────
export function validateRequiredString(
  value: unknown,
  field: string,
  opts: { minLength?: number; maxLength?: number; pattern?: RegExp; patternMessage?: string } = {},
): ValidationErrorDetail | null {
  if (value === undefined || value === null || value === '') {
    return { field, message: 'Required' };
  }
  if (typeof value !== 'string') {
    return { field, message: 'Must be a string' };
  }
  if (opts.minLength !== undefined && value.length < opts.minLength) {
    return { field, message: `Must be at least ${opts.minLength} characters` };
  }
  if (opts.maxLength !== undefined && value.length > opts.maxLength) {
    return { field, message: `Must be at most ${opts.maxLength} characters` };
  }
  if (opts.pattern && !opts.pattern.test(value)) {
    return { field, message: opts.patternMessage || 'Invalid format' };
  }
  return null;
}

export function validateOptionalString(
  value: unknown,
  field: string,
  opts: { maxLength?: number; pattern?: RegExp; patternMessage?: string } = {},
): ValidationErrorDetail | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    return { field, message: 'Must be a string' };
  }
  if (opts.maxLength !== undefined && value.length > opts.maxLength) {
    return { field, message: `Must be at most ${opts.maxLength} characters` };
  }
  if (opts.pattern && !opts.pattern.test(value)) {
    return { field, message: opts.patternMessage || 'Invalid format' };
  }
  return null;
}

// ─── Number Validation ────────────────────────────────────────
export function validateRequiredInt(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number } = {},
): ValidationErrorDetail | null {
  if (value === undefined || value === null) {
    return { field, message: 'Required' };
  }
  const n = Number(value);
  if (!Number.isInteger(n)) {
    return { field, message: 'Must be an integer' };
  }
  if (opts.min !== undefined && n < opts.min) {
    return { field, message: `Must be at least ${opts.min}` };
  }
  if (opts.max !== undefined && n > opts.max) {
    return { field, message: `Must be at most ${opts.max}` };
  }
  return null;
}

export function validateOptionalInt(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number } = {},
): ValidationErrorDetail | null {
  if (value === undefined || value === null) return null;
  const n = Number(value);
  if (!Number.isInteger(n)) {
    return { field, message: 'Must be an integer' };
  }
  if (opts.min !== undefined && n < opts.min) {
    return { field, message: `Must be at least ${opts.min}` };
  }
  if (opts.max !== undefined && n > opts.max) {
    return { field, message: `Must be at most ${opts.max}` };
  }
  return null;
}

export function clampInt(value: unknown, min: number, max: number, defaultValue: number): number {
  const n = parseInt(String(value), 10);
  if (isNaN(n)) return defaultValue;
  return Math.max(min, Math.min(max, n));
}

// ─── Enum Validation ──────────────────────────────────────────
export function validateEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): ValidationErrorDetail | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    return { field, message: `Must be one of: ${allowed.join(', ')}` };
  }
  if (!(allowed as readonly string[]).includes(value)) {
    return { field, message: `Must be one of: ${allowed.join(', ')}` };
  }
  return null;
}

export function validateRequiredEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): ValidationErrorDetail | null {
  if (value === undefined || value === null || value === '') {
    return { field, message: `Required. Must be one of: ${allowed.join(', ')}` };
  }
  return validateEnum(value, field, allowed);
}

// ─── Boolean Validation ───────────────────────────────────────
export function validateOptionalBoolean(value: unknown, field: string): ValidationErrorDetail | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'boolean') {
    return { field, message: 'Must be a boolean' };
  }
  return null;
}

// ─── Object Validation ────────────────────────────────────────
export function validateOptionalObject(value: unknown, field: string): ValidationErrorDetail | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) {
    return { field, message: 'Must be an object' };
  }
  return null;
}

// ─── URL Validation ───────────────────────────────────────────
export function isValidUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateUrl(value: unknown, field: string): ValidationErrorDetail | null {
  if (!isValidUrl(value)) {
    return { field, message: 'Must be a valid HTTP or HTTPS URL' };
  }
  return null;
}

// ─── Pagination Validation ────────────────────────────────────
export interface PaginationParams {
  page: number;
  limit: number;
}

export function parsePagination(
  query: Record<string, unknown>,
  defaults: { page?: number; limit?: number; maxLimit?: number } = {},
): PaginationParams {
  const defaultPage = defaults.page ?? 1;
  const defaultLimit = defaults.limit ?? 20;
  const maxLimit = defaults.maxLimit ?? 200;

  const rawPage = parseInt(String(query.page), 10);
  const rawLimit = parseInt(String(query.limit ?? query.pageSize), 10);

  const page = isNaN(rawPage) || rawPage < 1 ? defaultPage : rawPage;
  const limit = isNaN(rawLimit) || rawLimit < 1 ? defaultLimit : Math.min(rawLimit, maxLimit);

  return { page, limit };
}

// ─── Composite Validator (middleware builder) ──────────────────
export type ValidationSpec = {
  body?: Array<(req: Request) => ValidationErrorDetail | null>;
  params?: Array<(req: Request) => ValidationErrorDetail | null>;
  query?: Array<(req: Request) => ValidationErrorDetail | null>;
};

export function validate(spec: ValidationSpec) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: ValidationErrorDetail[] = [];

    if (spec.body) {
      for (const fn of spec.body) {
        const err = fn(req);
        if (err) errors.push(err);
      }
    }
    if (spec.params) {
      for (const fn of spec.params) {
        const err = fn(req);
        if (err) errors.push(err);
      }
    }
    if (spec.query) {
      for (const fn of spec.query) {
        const err = fn(req);
        if (err) errors.push(err);
      }
    }

    if (errors.length > 0) {
      return validationError(res, errors);
    }
    next();
  };
}

// ─── Commonly-Used Field Validators ────────────────────────────
export const EMAIL_MAX = 254;
export const NAME_MAX = 100;
export const LABEL_MAX = 100;
export const DESCRIPTION_MAX = 500;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const MESSAGE_MAX = 50000;

export const VALID_API_KEY_ROLES = ['admin', 'operator', 'service', 'end-user'] as const;
export const VALID_SUBSCRIPTION_PLANS = ['free', 'starter', 'professional', 'enterprise'] as const;
export const VALID_KB_SOURCE_TYPES = ['pdf', 'docx', 'text', 'markdown', 'html', 'faq', 'url'] as const;
export const VALID_DOC_SOURCE_TYPES = ['pdf', 'docx', 'url', 'faq', 'text'] as const;
export const VALID_INGESTION_STATUSES = ['queued', 'parsing', 'normalizing', 'chunking', 'embedding', 'indexed', 'published', 'failed'] as const;
