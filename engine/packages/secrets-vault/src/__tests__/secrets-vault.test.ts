import { describe, it, expect } from 'vitest';
import { EnvVault } from '../index';

describe('EnvVault', () => {
  afterEach(() => {
    delete process.env.TEST_SECRET;
    delete process.env.TEST_REQUIRED;
    delete process.env.TEST_HEALTH_SECRET;
  });

  it('resolves env var by name', async () => {
    process.env.TEST_SECRET = 'test-value-123';
    const vault = new EnvVault();
    const val = await vault.resolve('TEST_SECRET');
    expect(val).toBe('test-value-123');
  });

  it('returns null for missing ref', async () => {
    const vault = new EnvVault();
    const val = await vault.resolve('MISSING_SECRET_X');
    expect(val).toBeNull();
  });

  describe('S4: health check', () => {
    it('returns healthy when required refs are present', async () => {
      process.env.TEST_REQUIRED = 'present';
      const vault = new EnvVault(undefined, ['TEST_REQUIRED']);
      const health = await vault.health();
      expect(health.status).toBe('healthy');
    });

    it('returns degraded when required ref goes missing at runtime', async () => {
      process.env.TEST_HEALTH_SECRET = 'present';
      const vault = new EnvVault(undefined, ['TEST_HEALTH_SECRET']);
      delete process.env.TEST_HEALTH_SECRET;
      const health = await vault.health();
      expect(health.status).toBe('degraded');
    });

    it('returns healthy when no required refs', async () => {
      const vault = new EnvVault();
      const health = await vault.health();
      expect(health.status).toBe('healthy');
    });
  });

  describe('rotation: picks up runtime env changes', () => {
    it('resolve picks up new env var set after construction', async () => {
      const vault = new EnvVault();
      process.env.TEST_SECRET = 'rotated-value';
      const val = await vault.resolve('TEST_SECRET');
      expect(val).toBe('rotated-value');
    });

    it('resolve picks up changed env var after construction', async () => {
      process.env.TEST_SECRET = 'original';
      const vault = new EnvVault();
      process.env.TEST_SECRET = 'updated';
      const val = await vault.resolve('TEST_SECRET');
      expect(val).toBe('updated');
    });

    it('returns null when env var is deleted after construction', async () => {
      process.env.TEST_SECRET = 'original';
      const vault = new EnvVault();
      delete process.env.TEST_SECRET;
      const val = await vault.resolve('TEST_SECRET');
      expect(val).toBeNull();
    });
  });

  describe('S3: startup validation', () => {
    it('constructs successfully when required refs are present', () => {
      process.env.TEST_REQUIRED = 'present';
      const vault = new EnvVault(undefined, ['TEST_REQUIRED']);
      expect(vault).toBeDefined();
    });

    it('throws on construction when required ref is missing', () => {
      expect(() => new EnvVault(undefined, ['MISSING_STARTUP'])).toThrow('Missing required secret: MISSING_STARTUP');
    });

    it('constructs without requiredRefs', () => {
      const vault = new EnvVault();
      expect(vault).toBeDefined();
    });
  });
});
