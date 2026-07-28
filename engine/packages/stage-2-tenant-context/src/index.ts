import { StageInput, StageResult, ErrorCodes } from '@conversation-engine/core-types';
import { TenantRegistry } from '@conversation-engine/tenant-registry';
import { ConfigStore } from '@conversation-engine/config-store';

export interface Stage2Deps {
  tenantRegistry: TenantRegistry;
  configStore: ConfigStore;
}

export async function execute(input: StageInput, deps: Stage2Deps): Promise<StageResult> {
  const { context, signal } = input;

  if (signal.aborted) {
    return { success: false, errorCode: ErrorCodes.ERR_STAGE_TIMEOUT, error: { stage: 'stage-2-tenant-context', errorCode: ErrorCodes.ERR_STAGE_TIMEOUT, message: 'Stage 2 timed out', retryable: true } };
  }

  if (!context.tenantId) {
    return { success: false, errorCode: ErrorCodes.ERR_TENANT_NOT_FOUND, error: { stage: 'stage-2-tenant-context', errorCode: ErrorCodes.ERR_TENANT_NOT_FOUND, message: 'No tenantId provided', retryable: false } };
  }

  // Look up tenant
  const tenant = await deps.tenantRegistry.lookupTenant(context.tenantId);
  if (!tenant) {
    return { success: false, errorCode: ErrorCodes.ERR_TENANT_NOT_FOUND, error: { stage: 'stage-2-tenant-context', errorCode: ErrorCodes.ERR_TENANT_NOT_FOUND, message: 'Tenant not found', retryable: false } };
  }
  if (tenant.status === 'deactivated') {
    return { success: false, errorCode: ErrorCodes.ERR_AUTH_TENANT_DEACTIVATED, error: { stage: 'stage-2-tenant-context', errorCode: ErrorCodes.ERR_AUTH_TENANT_DEACTIVATED, message: 'Tenant is deactivated', retryable: false } };
  }

  // Load latest config
  const config = await deps.configStore.latestVersion(context.tenantId);
  if (!config) {
    return { success: false, errorCode: ErrorCodes.ERR_CONFIG_VERSION_NOT_FOUND, error: { stage: 'stage-2-tenant-context', errorCode: ErrorCodes.ERR_CONFIG_VERSION_NOT_FOUND, message: 'No config found for tenant', retryable: false } };
  }

  context.configVersion = config.configVersion;
  context.tenantConfig = config;

  return { success: true };
}
