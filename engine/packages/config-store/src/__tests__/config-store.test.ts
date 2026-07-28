import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FileConfigStore, defaultTenantConfig, sanitizeTenantId } from '../index';
import { rmSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(__dirname, '__test_configs');

describe('FileConfigStore', () => {
  let store: FileConfigStore;

  beforeAll(() => {
    if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true });
    store = new FileConfigStore(TEST_DIR);
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('saves a config version', async () => {
    const config = defaultTenantConfig('tenant-x');
    const version = await store.saveVersion('tenant-x', config);
    expect(version).toBe(1);
  });

  it('loads a saved version', async () => {
    const config = defaultTenantConfig('tenant-y');
    config.llm.model = 'claude-3';
    const version = await store.saveVersion('tenant-y', config);
    const loaded = await store.loadVersion('tenant-y', version);
    expect(loaded).not.toBeNull();
    expect(loaded!.llm.model).toBe('claude-3');
    expect(loaded!.configVersion).toBe(version);
  });

  it('returns null for missing version', async () => {
    const loaded = await store.loadVersion('tenant-z', 999);
    expect(loaded).toBeNull();
  });

  it('returns latest version', async () => {
    const config1 = defaultTenantConfig('tenant-w');
    config1.llm.model = 'model-a';
    await store.saveVersion('tenant-w', config1);

    const config2 = defaultTenantConfig('tenant-w');
    config2.llm.model = 'model-b';
    await store.saveVersion('tenant-w', config2);

    const latest = await store.latestVersion('tenant-w');
    expect(latest).not.toBeNull();
    expect(latest!.llm.model).toBe('model-b');
  });

  it('returns null for non-existent tenant latest', async () => {
    const latest = await store.latestVersion('nonexistent');
    expect(latest).toBeNull();
  });

  it('increments version numbers', async () => {
    const config = defaultTenantConfig('tenant-v');
    const v1 = await store.saveVersion('tenant-v', config);
    const v2 = await store.saveVersion('tenant-v', config);
    expect(v2).toBe(v1 + 1);
  });

  it('M-04: latest.json is never partially written', async () => {
    const config = defaultTenantConfig('tenant-atomic');
    config.llm.model = 'test-atomic';
    await store.saveVersion('tenant-atomic', config);
    // Verify latest.json exists and is valid JSON
    const latest = await store.latestVersion('tenant-atomic');
    expect(latest).not.toBeNull();
    expect(latest!.llm.model).toBe('test-atomic');
    // Verify no .tmp file is left behind
    const { existsSync } = require('fs');
    expect(existsSync(join(TEST_DIR, 'tenant-atomic', 'latest.json.tmp'))).toBe(false);
  });

  it('M-05: concurrent saves produce correct version numbers', async () => {
    const config = defaultTenantConfig('tenant-concurrent');
    // Fire 5 concurrent saves
    const saves = Array.from({ length: 5 }, (_, i) => {
      const c = defaultTenantConfig('tenant-concurrent');
      c.llm.model = `model-${i}`;
      return store.saveVersion('tenant-concurrent', c);
    });
    const versions = await Promise.all(saves);
    // All versions should be unique
    const unique = new Set(versions);
    expect(unique.size).toBe(5);
    // Latest should be version 5
    const latest = await store.latestVersion('tenant-concurrent');
    expect(latest).not.toBeNull();
  });

  describe('path traversal prevention', () => {
    it('sanitizeTenantId rejects dotdot', () => {
      expect(sanitizeTenantId('../etc/passwd')).toBeNull();
    });

    it('sanitizeTenantId rejects slash', () => {
      expect(sanitizeTenantId('foo/bar')).toBeNull();
    });

    it('sanitizeTenantId rejects backslash', () => {
      expect(sanitizeTenantId('foo\\bar')).toBeNull();
    });

    it('sanitizeTenantId rejects empty string', () => {
      expect(sanitizeTenantId('')).toBeNull();
    });

    it('sanitizeTenantId rejects null byte', () => {
      expect(sanitizeTenantId('foo\0bar')).toBeNull();
    });

    it('sanitizeTenantId rejects non-string', () => {
      expect(sanitizeTenantId(null as any)).toBeNull();
      expect(sanitizeTenantId(undefined as any)).toBeNull();
    });

    it('sanitizeTenantId rejects special characters', () => {
      expect(sanitizeTenantId('tenant id')).toBeNull();
      expect(sanitizeTenantId('tenant.id')).toBeNull();
      expect(sanitizeTenantId('tenant,id')).toBeNull();
    });

    it('sanitizeTenantId accepts valid tenant IDs', () => {
      expect(sanitizeTenantId('tenant-abc')).toBe('tenant-abc');
      expect(sanitizeTenantId('tenant_123')).toBe('tenant_123');
      expect(sanitizeTenantId('ACME_Corp')).toBe('ACME_Corp');
    });

    it('sanitizeTenantId rejects strings over 255 characters', () => {
      expect(sanitizeTenantId('a'.repeat(256))).toBeNull();
    });

    it('saveVersion throws on path traversal attempt', async () => {
      const config = defaultTenantConfig('victim');
      await expect(store.saveVersion('../evil', config)).rejects.toThrow('Invalid tenantId');
    });

    it('latestVersion throws on path traversal attempt', async () => {
      await expect(store.latestVersion('../evil')).rejects.toThrow('Invalid tenantId');
    });

    it('loadVersion throws on path traversal attempt', async () => {
      await expect(store.loadVersion('../evil', 1)).rejects.toThrow('Invalid tenantId');
    });
  });
});
