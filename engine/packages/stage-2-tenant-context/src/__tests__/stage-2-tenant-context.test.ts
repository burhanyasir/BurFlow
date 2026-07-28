import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execute } from '../index';
import { SqliteTenantRegistry } from '@conversation-engine/tenant-registry';
import { FileConfigStore, defaultTenantConfig } from '@conversation-engine/config-store';
import { TurnContext } from '@conversation-engine/core-types';
import { unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_REG_DB = '__test_stage2_reg.db';
const TEST_CONFIG_DIR = join(__dirname, '__test_stage2_configs');

describe('stage-2-tenant-context', () => {
  let registry: SqliteTenantRegistry;
  let configStore: FileConfigStore;

  beforeAll(async () => {
    if (existsSync(TEST_REG_DB)) unlinkSync(TEST_REG_DB);
    if (!existsSync(TEST_CONFIG_DIR)) mkdirSync(TEST_CONFIG_DIR, { recursive: true });
    registry = new SqliteTenantRegistry(TEST_REG_DB);
    configStore = new FileConfigStore(TEST_CONFIG_DIR);
    registry.seedTenant('tenant-active', 'active');
    registry.seedTenant('tenant-disabled', 'deactivated');
    await configStore.saveVersion('tenant-active', defaultTenantConfig('tenant-active'));
  });

  afterAll(() => {
    registry.close();
    if (existsSync(TEST_REG_DB)) unlinkSync(TEST_REG_DB);
    rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
  });

  function makeContext(overrides: Partial<TurnContext> = {}): TurnContext {
    return { message: 'hi', pipelineStartTime: Date.now(), degradedStages: [], latencyMs: 0, ...overrides };
  }

  it('loads config for active tenant', async () => {
    const ctx = makeContext({ tenantId: 'tenant-active' });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { tenantRegistry: registry, configStore });
    expect(result.success).toBe(true);
    expect(ctx.configVersion).toBeGreaterThanOrEqual(1);
    expect(ctx.tenantConfig).toBeDefined();
    expect(ctx.tenantConfig!.tenantId).toBe('tenant-active');
  });

  it('rejects deactivated tenant', async () => {
    const ctx = makeContext({ tenantId: 'tenant-disabled' });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { tenantRegistry: registry, configStore });
    expect(result.success).toBe(false);
  });

  it('rejects unknown tenant', async () => {
    const ctx = makeContext({ tenantId: 'unknown' });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { tenantRegistry: registry, configStore });
    expect(result.success).toBe(false);
  });

  it('rejects missing tenantId', async () => {
    const ctx = makeContext({ tenantId: undefined });
    const result = await execute({ context: ctx, signal: new AbortController().signal }, { tenantRegistry: registry, configStore });
    expect(result.success).toBe(false);
  });
});
