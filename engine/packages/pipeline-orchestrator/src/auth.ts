import { TurnContext, ErrorCodes } from '@conversation-engine/core-types';
import { TenantRegistry, TenantRegistryRole } from '@conversation-engine/tenant-registry';
import { SecretsVault } from '@conversation-engine/secrets-vault';

export type AuthResult = {
  success: true;
  role?: TenantRegistryRole;
} | {
  success: false;
  errorCode: string;
  message: string;
};

export type { TenantRegistryRole };

/**
 * Authenticate a request before Stage 1.
 *
 * 1. Extract API key from Authorization header (Bearer token) or x-api-key header.
 * 2. Hash the key with its stored salt and look up the tenant.
 * 3. Resolve tenant status; reject deactivated tenants.
 * 4. Set context.tenantId from the resolved identity.
 *
 * The tenant ID from the API key is authoritative. Any x-tenant-id header
 * value is ignored to prevent spoofing.
 */
export async function authenticateRequest(
  headers: Record<string, string>,
  context: TurnContext,
  deps: { tenantRegistry: TenantRegistry; vault?: SecretsVault },
): Promise<AuthResult> {
  // Extract API key from Authorization: Bearer <key> or x-api-key header
  const authHeader = headers['authorization'] || '';
  const apiKey = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (headers['x-api-key'] || '').trim();

  if (!apiKey) {
    return { success: false, errorCode: ErrorCodes.ERR_AUTH_INVALID_KEY, message: 'No API key provided' };
  }

  // Validate via tenant registry
  const result = await deps.tenantRegistry.validateApiKey(apiKey);
  if (!result) {
    return { success: false, errorCode: ErrorCodes.ERR_AUTH_INVALID_KEY, message: 'Invalid API key' };
  }

  const { tenantId, role } = result;

  // Check tenant is active (validateApiKey only returns active tenants, but double-check)
  const tenant = await deps.tenantRegistry.lookupTenant(tenantId);
  if (!tenant) {
    return { success: false, errorCode: ErrorCodes.ERR_TENANT_NOT_FOUND, message: 'Tenant not found' };
  }
  if (tenant.status !== 'active') {
    return { success: false, errorCode: ErrorCodes.ERR_AUTH_TENANT_DEACTIVATED, message: 'Tenant is deactivated' };
  }

  // Set the authenticated tenant ID on the context. This is authoritative.
  context.tenantId = tenantId;
  context.authenticatedUserId = tenantId;

  return { success: true, role };
}

/**
 * Authorize a request based on the caller's role.
 * Throws ERR_FORBIDDEN if the role lacks the required permission level.
 */
export function requireRole(role: TenantRegistryRole | undefined, allowedRoles: TenantRegistryRole[]): void {
  if (!role || !allowedRoles.includes(role)) {
    const err = new Error('Insufficient permissions');
    (err as any).errorCode = ErrorCodes.ERR_FORBIDDEN;
    throw err;
  }
}
