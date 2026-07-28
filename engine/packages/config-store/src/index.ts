import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync } from 'fs';
import { resolve, join, sep } from 'path';
import { StoreHealth, TenantConfig } from '@conversation-engine/core-types';

export interface ConfigStore {
  saveVersion(tenantId: string, config: TenantConfig, changedBy?: string, reason?: string): Promise<number>;
  loadVersion(tenantId: string, configVersion: number): Promise<TenantConfig | null>;
  latestVersion(tenantId: string): Promise<TenantConfig | null>;
  health(): Promise<StoreHealth>;
}

const TENANT_ID_RE = /^[a-zA-Z0-9_\-]+$/;

export function sanitizeTenantId(tenantId: string): string | null {
  if (!tenantId || typeof tenantId !== 'string') return null;
  if (tenantId.length > 255) return null;
  if (tenantId.includes('..') || tenantId.includes('/') || tenantId.includes('\\') || tenantId.includes('\0')) return null;
  if (!TENANT_ID_RE.test(tenantId)) return null;
  return tenantId;
}

export class FileConfigStore implements ConfigStore {
  private basePath: string;
  private versionLocks = new Map<string, Promise<number>>();

  constructor(basePath: string) {
    this.basePath = resolve(basePath);
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
    }
  }

  private tenantPath(tenantId: string): string {
    const clean = sanitizeTenantId(tenantId);
    if (!clean) throw new Error(`Invalid tenantId: ${tenantId}`);
    return join(this.basePath, clean);
  }

  private versionPath(tenantId: string, version: number): string {
    return join(this.tenantPath(tenantId), `v${version}.json`);
  }

  private latestPath(tenantId: string): string {
    return join(this.tenantPath(tenantId), 'latest.json');
  }

  async saveVersion(tenantId: string, config: TenantConfig, changedBy?: string, reason?: string): Promise<number> {
    const cleanId = sanitizeTenantId(tenantId);
    if (!cleanId) throw new Error(`Invalid tenantId: ${tenantId}`);

    const validation = validateTenantConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid tenant config: ${validation.errors.join('; ')}`);
    }

    const tenantDir = this.tenantPath(cleanId);
    if (!existsSync(tenantDir)) mkdirSync(tenantDir, { recursive: true });

    // Serialize version calculation per tenant to prevent TOCTOU race.
    // Chain promises so the next call waits for the full operation to complete.
    const prevLock = this.versionLocks.get(tenantId) || Promise.resolve(0);
    const operation = prevLock.then(async () => {
      const existingVersions = existsSync(tenantDir)
        ? readdirSync(tenantDir).filter(f => f.match(/^v(\d+)\.json$/)).map(f => parseInt(f.match(/^v(\d+)\.json$/)![1]))
        : [];
      const nextVersion = existingVersions.length > 0 ? Math.max(...existingVersions) + 1 : 1;

      config.configVersion = nextVersion;
      const data = { ...config, changedBy: changedBy ?? 'system', reason: reason ?? '', createdAt: new Date().toISOString() };
      const json = JSON.stringify(data, null, 2);

      // Atomic write: write to temp file, then rename (atomic on most filesystems)
      const latestTmp = this.latestPath(tenantId) + '.tmp';
      writeFileSync(this.versionPath(tenantId, nextVersion), json);
      writeFileSync(latestTmp, json);
      renameSync(latestTmp, this.latestPath(tenantId));

      return nextVersion;
    });
    // Store the chained promise so subsequent calls wait for this one
    this.versionLocks.set(tenantId, operation);

    return operation;
  }

  async loadVersion(tenantId: string, configVersion: number): Promise<TenantConfig | null> {
    const path = this.versionPath(tenantId, configVersion);
    if (!existsSync(path)) return null;
    try {
      const data = JSON.parse(readFileSync(path, 'utf-8'));
      const { changedBy, reason, createdAt, ...config } = data;
      const validation = validateTenantConfig(config);
      if (!validation.valid) {
        return null;
      }
      return config as TenantConfig;
    } catch {
      return null;
    }
  }

  async latestVersion(tenantId: string): Promise<TenantConfig | null> {
    const path = this.latestPath(tenantId);
    if (!existsSync(path)) return null;
    try {
      const data = JSON.parse(readFileSync(path, 'utf-8'));
      const { changedBy, reason, createdAt, ...config } = data;
      const validation = validateTenantConfig(config);
      if (!validation.valid) {
        return null;
      }
      return config as TenantConfig;
    } catch {
      return null;
    }
  }

  async health(): Promise<StoreHealth> {
    const start = Date.now();
    try {
      if (!existsSync(this.basePath)) return { status: 'degraded', latencyMs: Date.now() - start, error: 'Base path does not exist' };
      return { status: 'healthy', latencyMs: Date.now() - start };
    } catch (err: any) {
      return { status: 'unavailable', latencyMs: Date.now() - start, error: err.message };
    }
  }
}

export function validateTenantConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Config must be a non-null object'] };
  }
  if (typeof config.tenantId !== 'string' || !config.tenantId) {
    errors.push('tenantId must be a non-empty string');
  }
  if (typeof config.configVersion !== 'number') {
    errors.push('configVersion must be a number');
  }

  // LLM section
  if (!config.llm || typeof config.llm !== 'object') {
    errors.push('llm must be an object');
  } else {
    if (typeof config.llm.model !== 'string') errors.push('llm.model must be a string');
    if (typeof config.llm.temperature !== 'number' || config.llm.temperature < 0 || config.llm.temperature > 2) {
      errors.push('llm.temperature must be a number between 0 and 2');
    }
    if (typeof config.llm.maxTokens !== 'number' || config.llm.maxTokens < 1) {
      errors.push('llm.maxTokens must be a positive number');
    }
    if (typeof config.llm.systemPrompt !== 'string') errors.push('llm.systemPrompt must be a string');
  }

  // Safety section
  if (config.safety && typeof config.safety === 'object') {
    const validThresholds = ['strict', 'moderate', 'relaxed'];
    if (config.safety.contentFilterThreshold && !validThresholds.includes(config.safety.contentFilterThreshold)) {
      errors.push(`safety.contentFilterThreshold must be one of: ${validThresholds.join(', ')}`);
    }
    const validModes = ['allow', 'notify', 'mask', 'block'];
    if (config.safety.piiRedactionMode && !validModes.includes(config.safety.piiRedactionMode)) {
      errors.push(`safety.piiRedactionMode must be one of: ${validModes.join(', ')}`);
    }
  }

  // Rate limits
  if (config.rateLimits && typeof config.rateLimits === 'object') {
    if (config.rateLimits.messagesPerMinute !== undefined && (typeof config.rateLimits.messagesPerMinute !== 'number' || config.rateLimits.messagesPerMinute < 0)) {
      errors.push('rateLimits.messagesPerMinute must be a non-negative number');
    }
    if (config.rateLimits.messagesPerHour !== undefined && (typeof config.rateLimits.messagesPerHour !== 'number' || config.rateLimits.messagesPerHour < 0)) {
      errors.push('rateLimits.messagesPerHour must be a non-negative number');
    }
  }

  // Session section
  if (config.session && typeof config.session === 'object') {
    if (config.session.ttlMinutes !== undefined && (typeof config.session.ttlMinutes !== 'number' || config.session.ttlMinutes < 1)) {
      errors.push('session.ttlMinutes must be a positive number');
    }
  }

  // Fallback response
  if (config.fallbackResponse !== undefined && typeof config.fallbackResponse !== 'string') {
    errors.push('fallbackResponse must be a string');
  }

  // Supported languages
  if (config.supportedLanguages !== undefined) {
    if (!Array.isArray(config.supportedLanguages)) {
      errors.push('supportedLanguages must be an array of strings');
    } else if (!config.supportedLanguages.every((l: any) => typeof l === 'string')) {
      errors.push('supportedLanguages must be an array of strings');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function defaultTenantConfig(tenantId: string): TenantConfig {
  return {
    tenantId,
    configVersion: 0,
    llm: { model: 'gpt-4', temperature: 0.7, maxTokens: 1024, systemPrompt: 'You are a helpful assistant.' },
    safety: { contentFilterThreshold: 'moderate', piiRedactionEnabled: true, piiRedactionMode: 'mask' },
    rateLimits: { messagesPerMinute: 60, messagesPerHour: 1000, concurrentSessions: 100 },
    session: { ttlMinutes: 1440, gracePeriodDays: 7, legalHoldDays: 90 },
    fallbackResponse: 'I apologize, but I am unable to process your request at this time. Please try again later.',
    supportedLanguages: ['en'],
    featureFlags: { qualityScoringEnabled: false, analyticsEnabled: true },
  };
}
