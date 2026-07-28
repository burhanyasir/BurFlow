import { Router, Request, Response } from 'express';
import { EnhancedApiKeyRepository, TenantRepository, AuditLogRepository } from '@conversation-engine/saas-core';
import {
  requireJsonObject, validateRequiredString, validateRequiredEnum,
  validationError, LABEL_MAX,
} from '../middleware/validate';
import { createLogger, createContextLogger } from '@conversation-engine/logger';

const PIPELINE_URL = (process.env.PIPELINE_URL || '').replace(/\/+$/, '');
const PIPELINE_SYNC_KEY = process.env.INTERNAL_SYNC_KEY || '';

if (PIPELINE_URL.startsWith('http://') && !PIPELINE_URL.includes('localhost') && !PIPELINE_URL.includes('127.0.0.1') && !PIPELINE_URL.includes('[::1]')) {
  const bold = '\x1b[1m';
  const dim = '\x1b[2m';
  const reset = '\x1b[0m';
  const yellow = '\x1b[33m';
  console.warn(`${yellow}[SECURITY]${reset} ${bold}PIPELINE_URL (${PIPELINE_URL}) uses HTTP to a non-localhost target.${reset}
${dim}  API key sync traffic will be transmitted in plaintext.
  Set PIPELINE_URL to an HTTPS endpoint in production, or use localhost for development.${reset}`);
}

async function syncKeyToPipeline(tenantId: string, apiKey: string, label: string, role: string): Promise<void> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (PIPELINE_SYNC_KEY) {
      headers['Authorization'] = `Bearer ${PIPELINE_SYNC_KEY}`;
      headers['X-Timestamp'] = String(Date.now());
      headers['X-Nonce'] = `saas-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
    await fetch(`${PIPELINE_URL}/api/internal/sync-key`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ tenantId, apiKey, label, role }),
    });
  } catch { /* pipeline may not be available */ }
}

const VALID_ROLES = ['admin', 'operator', 'service', 'end-user'] as const;

export function createApiKeyRoutes(
  apiKeyRepo: EnhancedApiKeyRepository,
  tenantRepo: TenantRepository,
  auditRepo: AuditLogRepository,
): Router {
  const router = Router();
  const logger = createLogger('saas-api:api-keys');

  const adminOnly = (req: Request, res: Response, next: Function) => {
    if (!req.user?.role || !['admin', 'owner'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };

  const sanitize = (k: EnhancedApiKey) => ({
    id: k.id,
    label: k.label,
    keyPrefix: k.keyPrefix,
    role: k.role,
    lastUsedAt: k.lastUsedAt,
    createdAt: k.createdAt,
    expiresAt: k.expiresAt,
    createdBy: k.createdBy,
    permissions: k.permissions,
  });

  router.get('/', (req: Request, res: Response) => {
    try {
      if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });
      const keys = apiKeyRepo.findByTenant(req.user.tenantId);
      res.json({ keys: keys.map(k => sanitize(k)) });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'List API keys failed');
      res.status(500).json({ error: 'Failed to list API keys' });
    }
  });

  router.post('/', requireJsonObject, adminOnly, (req: Request, res: Response) => {
    try {
      if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

      const { label, role, expiresAt, permissions } = req.body;

      const errors = [
        validateRequiredString(label, 'label', { maxLength: LABEL_MAX }),
        validateRequiredEnum(role || 'end-user', 'role', VALID_ROLES),
      ].filter(Boolean);

      if (errors.length > 0) return validationError(res, errors as any);

      const tenant = tenantRepo.findById(req.user.tenantId);
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

      const { key, record } = apiKeyRepo.create(
        req.user.tenantId, label, role || 'end-user', req.user.sub || req.user.userId || '',
        expiresAt || undefined, permissions || undefined,
      );

      syncKeyToPipeline(req.user.tenantId, key, label, role || 'end-user');

      auditRepo.record(req.user.tenantId, {
        userId: req.user.sub,
        userName: req.user.name || req.user.email,
        eventType: 'api_key.created',
        resourceType: 'api_key',
        resourceId: record.id,
        details: JSON.stringify({ label, role: role || 'end-user' }),
      });

      res.status(201).json({
        key,
        id: record.id,
        label: record.label,
        keyPrefix: record.keyPrefix,
        role: record.role,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        permissions: record.permissions,
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Create API key failed');
      res.status(500).json({ error: 'Failed to create API key' });
    }
  });

  router.get('/stats', adminOnly, (req: Request, res: Response) => {
    try {
      if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });
      const stats = apiKeyRepo.getUsageStats(req.user.tenantId);
      res.json(stats);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'API key stats failed');
      res.status(500).json({ error: 'Failed to fetch API key stats' });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    try {
      if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });
      const key = apiKeyRepo.findById(req.params.id);
      if (!key || key.tenantId !== req.user.tenantId || key.revokedAt) {
        return res.status(404).json({ error: 'API key not found' });
      }
      res.json(sanitize(key));
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Get API key failed');
      res.status(500).json({ error: 'Failed to fetch API key' });
    }
  });

  router.put('/:id/rotate', adminOnly, (req: Request, res: Response) => {
    try {
      if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });
      const result = apiKeyRepo.rotate(req.params.id, req.user.tenantId);
      if (!result) return res.status(404).json({ error: 'API key not found' });

      auditRepo.record(req.user.tenantId, {
        userId: req.user.sub,
        userName: req.user.name || req.user.email,
        eventType: 'api_key.rotated',
        resourceType: 'api_key',
        resourceId: result.record.id,
        details: JSON.stringify({ label: result.record.label }),
      });

      res.json({
        key: result.key,
        id: result.record.id,
        label: result.record.label,
        keyPrefix: result.record.keyPrefix,
        role: result.record.role,
        createdAt: result.record.createdAt,
        expiresAt: result.record.expiresAt,
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Rotate API key failed');
      res.status(500).json({ error: 'Failed to rotate API key' });
    }
  });

  router.delete('/:id', adminOnly, (req: Request, res: Response) => {
    try {
      if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });
      const key = apiKeyRepo.findById(req.params.id);
      if (!key || key.tenantId !== req.user.tenantId) {
        return res.status(404).json({ error: 'API key not found' });
      }

      const revoked = apiKeyRepo.revoke(req.params.id, req.user.tenantId);
      if (!revoked) return res.status(404).json({ error: 'API key not found or already revoked' });

      auditRepo.record(req.user.tenantId, {
        userId: req.user.sub,
        userName: req.user.name || req.user.email,
        eventType: 'api_key.deleted',
        resourceType: 'api_key',
        resourceId: key.id,
        details: JSON.stringify({ label: key.label }),
      });

      res.status(204).send();
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Revoke API key failed');
      res.status(500).json({ error: 'Failed to revoke API key' });
    }
  });

  router.get('/:id/usage', (req: Request, res: Response) => {
    try {
      if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });
      const key = apiKeyRepo.findById(req.params.id);
      if (!key || key.tenantId !== req.user.tenantId || key.revokedAt) {
        return res.status(404).json({ error: 'API key not found' });
      }
      res.json({
        keyId: key.id,
        label: key.label,
        totalRequests: key.totalRequests,
        lastUsedAt: key.lastUsedAt,
        createdAt: key.createdAt,
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'API key usage failed');
      res.status(500).json({ error: 'Failed to fetch API key usage' });
    }
  });

  return router;
}