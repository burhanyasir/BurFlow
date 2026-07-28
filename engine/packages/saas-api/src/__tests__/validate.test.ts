import { describe, it, expect } from 'vitest';
import {
  isValidUUID, isValidEmail, isValidId, isValidUrl,
  validateRequiredString, validateOptionalString,
  validateRequiredInt, validateOptionalInt,
  validateEnum, validateRequiredEnum,
  validateOptionalBoolean, validateOptionalObject,
  validateEmail, validateUUID, validateId,
  clampInt, parsePagination, validationError,
  PASSWORD_MIN, PASSWORD_MAX, EMAIL_MAX, NAME_MAX, LABEL_MAX, DESCRIPTION_MAX, MESSAGE_MAX,
  VALID_API_KEY_ROLES, VALID_DOC_SOURCE_TYPES,
} from '../middleware/validate';

// ─── isValidUUID ──────────────────────────────────────────────
describe('isValidUUID', () => {
  it('accepts valid UUID v4', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    expect(isValidUUID('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
  });

  it('rejects invalid UUIDs', () => {
    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
    expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false);
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false);
    expect(isValidUUID('g50e8400-e29b-41d4-a716-446655440000')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isValidUUID(undefined)).toBe(false);
    expect(isValidUUID(null)).toBe(false);
    expect(isValidUUID(123)).toBe(false);
    expect(isValidUUID({})).toBe(false);
  });
});

// ─── validateUUID ─────────────────────────────────────────────
describe('validateUUID', () => {
  it('returns null for valid UUID', () => {
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000', 'id')).toBeNull();
  });

  it('returns error for invalid UUID', () => {
    const err = validateUUID('not-a-uuid', 'id');
    expect(err).toEqual({ field: 'id', message: 'Must be a valid UUID' });
  });
});

// ─── isValidEmail ─────────────────────────────────────────────
describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.user+tag@domain.co')).toBe(true);
    expect(isValidEmail('a@b.cc')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('user domain@example.com')).toBe(false);
  });

  it('rejects emails over 254 chars', () => {
    const longEmail = 'a'.repeat(245) + '@example.com';
    expect(isValidEmail(longEmail)).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(123)).toBe(false);
  });
});

// ─── validateEmail ────────────────────────────────────────────
describe('validateEmail', () => {
  it('returns null for valid email', () => {
    expect(validateEmail('user@example.com', 'email')).toBeNull();
  });

  it('returns error for invalid email', () => {
    const err = validateEmail('bad', 'email');
    expect(err).toEqual({ field: 'email', message: 'Must be a valid email address' });
  });
});

// ─── isValidId ────────────────────────────────────────────────
describe('isValidId', () => {
  it('accepts valid IDs', () => {
    expect(isValidId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidId('tenant1_1700000000000_a1b2c3d4')).toBe(true);
    expect(isValidId('my-tenant')).toBe(true);
    expect(isValidId('doc_123')).toBe(true);
    expect(isValidId('ns:bucket:name')).toBe(true);
  });

  it('rejects invalid IDs', () => {
    expect(isValidId('')).toBe(false);
    expect(isValidId('has spaces')).toBe(false);
    expect(isValidId('has@special')).toBe(false);
    expect(isValidId('has/slashes')).toBe(false);
  });

  it('rejects IDs over 255 chars', () => {
    expect(isValidId('a'.repeat(256))).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isValidId(undefined)).toBe(false);
    expect(isValidId(null)).toBe(false);
    expect(isValidId(123)).toBe(false);
  });
});

// ─── validateId ───────────────────────────────────────────────
describe('validateId', () => {
  it('returns null for valid ID', () => {
    expect(validateId('valid-id_123', 'id')).toBeNull();
  });

  it('returns error for invalid ID', () => {
    const err = validateId('bad id!', 'id');
    expect(err).toEqual({ field: 'id', message: 'Must be a valid identifier' });
  });
});

// ─── isValidUrl ───────────────────────────────────────────────
describe('isValidUrl', () => {
  it('accepts valid HTTP/HTTPS URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
    expect(isValidUrl('https://example.com/path?q=1')).toBe(true);
    expect(isValidUrl('https://sub.domain.co.uk/path')).toBe(true);
  });

  it('rejects invalid URLs', () => {
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('ftp://example.com')).toBe(false);
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isValidUrl(undefined)).toBe(false);
    expect(isValidUrl(null)).toBe(false);
  });
});

// ─── validateRequiredString ───────────────────────────────────
describe('validateRequiredString', () => {
  it('returns null for valid string', () => {
    expect(validateRequiredString('hello', 'name')).toBeNull();
  });

  it('returns error for undefined', () => {
    expect(validateRequiredString(undefined, 'name')).toEqual({ field: 'name', message: 'Required' });
  });

  it('returns error for null', () => {
    expect(validateRequiredString(null, 'name')).toEqual({ field: 'name', message: 'Required' });
  });

  it('returns error for empty string', () => {
    expect(validateRequiredString('', 'name')).toEqual({ field: 'name', message: 'Required' });
  });

  it('returns error for non-string', () => {
    expect(validateRequiredString(123, 'name')).toEqual({ field: 'name', message: 'Must be a string' });
  });

  it('enforces maxLength', () => {
    expect(validateRequiredString('a'.repeat(101), 'name', { maxLength: 100 })).toEqual({
      field: 'name', message: 'Must be at most 100 characters',
    });
  });

  it('enforces minLength', () => {
    expect(validateRequiredString('ab', 'name', { minLength: 3 })).toEqual({
      field: 'name', message: 'Must be at least 3 characters',
    });
  });

  it('enforces pattern', () => {
    expect(validateRequiredString('abc', 'name', { pattern: /^\d+$/, patternMessage: 'Numbers only' })).toEqual({
      field: 'name', message: 'Numbers only',
    });
  });
});

// ─── validateOptionalString ───────────────────────────────────
describe('validateOptionalString', () => {
  it('returns null for undefined', () => {
    expect(validateOptionalString(undefined, 'name')).toBeNull();
  });

  it('returns null for valid string', () => {
    expect(validateOptionalString('hello', 'name')).toBeNull();
  });

  it('returns error for non-string', () => {
    expect(validateOptionalString(123, 'name')).toEqual({ field: 'name', message: 'Must be a string' });
  });

  it('enforces maxLength', () => {
    expect(validateOptionalString('a'.repeat(501), 'desc', { maxLength: 500 })).toEqual({
      field: 'desc', message: 'Must be at most 500 characters',
    });
  });
});

// ─── validateRequiredInt ──────────────────────────────────────
describe('validateRequiredInt', () => {
  it('returns null for valid integer', () => {
    expect(validateRequiredInt(5, 'page')).toBeNull();
    expect(validateRequiredInt('10', 'page')).toBeNull();
  });

  it('returns error for undefined', () => {
    expect(validateRequiredInt(undefined, 'page')).toEqual({ field: 'page', message: 'Required' });
  });

  it('returns error for float', () => {
    expect(validateRequiredInt(1.5, 'page')).toEqual({ field: 'page', message: 'Must be an integer' });
  });

  it('enforces min', () => {
    expect(validateRequiredInt(0, 'page', { min: 1 })).toEqual({
      field: 'page', message: 'Must be at least 1',
    });
  });

  it('enforces max', () => {
    expect(validateRequiredInt(201, 'limit', { max: 200 })).toEqual({
      field: 'limit', message: 'Must be at most 200',
    });
  });
});

// ─── validateOptionalInt ──────────────────────────────────────
describe('validateOptionalInt', () => {
  it('returns null for undefined', () => {
    expect(validateOptionalInt(undefined, 'page')).toBeNull();
  });

  it('returns error for non-integer', () => {
    expect(validateOptionalInt('abc', 'page')).toEqual({ field: 'page', message: 'Must be an integer' });
  });
});

// ─── validateEnum ─────────────────────────────────────────────
describe('validateEnum', () => {
  const colors = ['red', 'green', 'blue'] as const;

  it('returns null for valid value', () => {
    expect(validateEnum('red', 'color', colors)).toBeNull();
  });

  it('returns null for undefined (optional)', () => {
    expect(validateEnum(undefined, 'color', colors)).toBeNull();
  });

  it('returns error for invalid value', () => {
    expect(validateEnum('yellow', 'color', colors)).toEqual({
      field: 'color', message: 'Must be one of: red, green, blue',
    });
  });

  it('returns error for non-string', () => {
    expect(validateEnum(123, 'color', colors)).toEqual({
      field: 'color', message: 'Must be one of: red, green, blue',
    });
  });
});

// ─── validateRequiredEnum ─────────────────────────────────────
describe('validateRequiredEnum', () => {
  const roles = ['admin', 'user'] as const;

  it('returns null for valid value', () => {
    expect(validateRequiredEnum('admin', 'role', roles)).toBeNull();
  });

  it('returns error for undefined', () => {
    expect(validateRequiredEnum(undefined, 'role', roles)).toEqual({
      field: 'role', message: 'Required. Must be one of: admin, user',
    });
  });

  it('returns error for empty string', () => {
    expect(validateRequiredEnum('', 'role', roles)).toEqual({
      field: 'role', message: 'Required. Must be one of: admin, user',
    });
  });
});

// ─── validateOptionalBoolean ──────────────────────────────────
describe('validateOptionalBoolean', () => {
  it('returns null for boolean', () => {
    expect(validateOptionalBoolean(true, 'flag')).toBeNull();
    expect(validateOptionalBoolean(false, 'flag')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(validateOptionalBoolean(undefined, 'flag')).toBeNull();
  });

  it('returns error for non-boolean', () => {
    expect(validateOptionalBoolean('true', 'flag')).toEqual({ field: 'flag', message: 'Must be a boolean' });
    expect(validateOptionalBoolean(1, 'flag')).toEqual({ field: 'flag', message: 'Must be a boolean' });
  });
});

// ─── validateOptionalObject ───────────────────────────────────
describe('validateOptionalObject', () => {
  it('returns null for object', () => {
    expect(validateOptionalObject({ a: 1 }, 'settings')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(validateOptionalObject(undefined, 'settings')).toBeNull();
  });

  it('returns error for array', () => {
    expect(validateOptionalObject([1, 2], 'settings')).toEqual({ field: 'settings', message: 'Must be an object' });
  });

  it('returns error for non-object', () => {
    expect(validateOptionalObject('string', 'settings')).toEqual({ field: 'settings', message: 'Must be an object' });
  });
});

// ─── clampInt ─────────────────────────────────────────────────
describe('clampInt', () => {
  it('clamps to range', () => {
    expect(clampInt(5, 1, 10, 1)).toBe(5);
    expect(clampInt(0, 1, 10, 1)).toBe(1);
    expect(clampInt(100, 1, 10, 1)).toBe(10);
  });

  it('returns default for NaN', () => {
    expect(clampInt(undefined, 1, 10, 3)).toBe(3);
    expect(clampInt('abc', 1, 10, 3)).toBe(3);
    expect(clampInt('', 1, 10, 3)).toBe(3);
  });
});

// ─── parsePagination ──────────────────────────────────────────
describe('parsePagination', () => {
  it('parses valid values', () => {
    expect(parsePagination({ page: '2', limit: '50' })).toEqual({ page: 2, limit: 50 });
  });

  it('uses defaults for missing values', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 20 });
  });

  it('clamps limit to maxLimit', () => {
    expect(parsePagination({ limit: '500' }, { maxLimit: 200 })).toEqual({ page: 1, limit: 200 });
  });

  it('clamps negative page to default', () => {
    expect(parsePagination({ page: '-1' })).toEqual({ page: 1, limit: 20 });
  });

  it('clamps zero limit to default', () => {
    expect(parsePagination({ limit: '0' })).toEqual({ page: 1, limit: 20 });
  });

  it('handles non-numeric strings', () => {
    expect(parsePagination({ page: 'abc', limit: 'xyz' })).toEqual({ page: 1, limit: 20 });
  });

  it('supports pageSize alias', () => {
    expect(parsePagination({ pageSize: '100' })).toEqual({ page: 1, limit: 100 });
  });
});

// ─── validationError ──────────────────────────────────────────
describe('validationError', () => {
  it('sends 400 with error details', () => {
    let statusCode: number;
    let jsonBody: any;
    const res = {
      status(code: number) { statusCode = code; return this; },
      json(body: any) { jsonBody = body; },
    } as any;

    validationError(res, [{ field: 'email', message: 'Invalid' }]);

    expect(statusCode!).toBe(400);
    expect(jsonBody!.error).toBe('Validation failed');
    expect(jsonBody!.details).toEqual([{ field: 'email', message: 'Invalid' }]);
  });
});

// ─── Constants ────────────────────────────────────────────────
describe('validation constants', () => {
  it('has reasonable values', () => {
    expect(PASSWORD_MIN).toBe(8);
    expect(PASSWORD_MAX).toBe(128);
    expect(EMAIL_MAX).toBe(254);
    expect(NAME_MAX).toBe(100);
    expect(LABEL_MAX).toBe(100);
    expect(DESCRIPTION_MAX).toBe(500);
    expect(MESSAGE_MAX).toBe(50000);
  });

  it('VALID_API_KEY_ROLES contains expected values', () => {
    expect(VALID_API_KEY_ROLES).toContain('admin');
    expect(VALID_API_KEY_ROLES).toContain('operator');
    expect(VALID_API_KEY_ROLES).toContain('service');
    expect(VALID_API_KEY_ROLES).toContain('end-user');
  });

  it('VALID_DOC_SOURCE_TYPES contains expected values', () => {
    expect(VALID_DOC_SOURCE_TYPES).toContain('pdf');
    expect(VALID_DOC_SOURCE_TYPES).toContain('docx');
    expect(VALID_DOC_SOURCE_TYPES).toContain('text');
    expect(VALID_DOC_SOURCE_TYPES).toContain('url');
    expect(VALID_DOC_SOURCE_TYPES).toContain('faq');
  });
});
