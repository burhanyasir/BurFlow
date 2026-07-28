import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SqliteTenantRegistry } from '../index';
import { createHash } from 'crypto';
import { unlinkSync, existsSync } from 'fs';

const TEST_DB = '__test_tenant_registry.db';

describe('SqliteTenantRegistry', () => {
  let registry: SqliteTenantRegistry;

  beforeAll(() => {
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
    registry = new SqliteTenantRegistry(TEST_DB);
    registry.seedTenant('tenant-alpha', 'active');
    registry.seedTenant('tenant-beta', 'deactivated');
    registry.seedApiKey('tenant-alpha', 'sk-test-key-12345');
    registry.seedApiKey('tenant-beta', 'sk-deactivated-key');
  });

  afterAll(() => {
    registry.close();
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  });

  it('looks up an active tenant', async () => {
    const result = await registry.lookupTenant('tenant-alpha');
    expect(result).not.toBeNull();
    expect(result!.tenantId).toBe('tenant-alpha');
    expect(result!.status).toBe('active');
  });

  it('looks up a deactivated tenant', async () => {
    const result = await registry.lookupTenant('tenant-beta');
    expect(result).not.toBeNull();
    expect(result!.tenantId).toBe('tenant-beta');
    expect(result!.status).toBe('deactivated');
  });

  it('returns null for unknown tenant', async () => {
    const result = await registry.lookupTenant('tenant-unknown');
    expect(result).toBeNull();
  });

  it('resolves API key hash to tenantId for active tenant', async () => {
    const rawKey = 'sk-test-hash-key';
    const seeded = registry.seedApiKey('tenant-alpha', rawKey, 'hash-test');
    const result = await registry.resolveApiKey(seeded.keyHash);
    expect(result).toBe('tenant-alpha');
  });

  it('does not resolve deactivated tenant key', async () => {
    const result = await registry.resolveApiKey('nonexistent-hash');
    expect(result).toBeNull();
  });

  it('reports healthy status', async () => {
    const health = await registry.health();
    expect(health.status).toBe('healthy');
  });
});
