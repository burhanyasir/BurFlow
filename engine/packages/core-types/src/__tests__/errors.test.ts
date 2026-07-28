import { describe, it, expect } from 'vitest';
import { ErrorCodes, ErrorCode } from '../errors';

describe('ErrorCodes', () => {
  it('exports all expected error codes', () => {
    const codes: ErrorCode[] = Object.values(ErrorCodes);
    expect(codes).toContain('ERR_AUTH_INVALID_KEY');
    expect(codes).toContain('ERR_OUT_OF_SEQUENCE');
    expect(codes).toContain('ERR_SESSION_VERSION_CONFLICT');
    expect(codes).toContain('ERR_STAGE_TIMEOUT');
    expect(codes).toContain('ERR_INTERNAL');
  });

  it('all error codes are non-empty strings', () => {
    for (const code of Object.values(ErrorCodes)) {
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(3);
    }
  });

  it('no duplicate error code values', () => {
    const values = Object.values(ErrorCodes);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('enumerates all 35 error codes', () => {
    const codes = Object.values(ErrorCodes);
    expect(codes).toHaveLength(35);
  });
});
