import { StoreHealth } from '@conversation-engine/core-types';

export interface SecretsVault {
  resolve(ref: string): Promise<string | null>;
  validateRequired(refs: string[]): Promise<{ valid: boolean; missing: string[] }>;
  health(): Promise<StoreHealth>;
}

export class EnvVault implements SecretsVault {
  private store: Map<string, string>;
  private requiredRefs: string[];

  constructor(prefix?: string, requiredRefs?: string[]) {
    this.store = new Map();
    this.requiredRefs = requiredRefs ?? [];
    if (prefix) {
      for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith(prefix) && typeof value === 'string') {
          this.store.set(key, value);
        }
      }
    }
    // Validate critical secrets on construction — fail fast at startup
    for (const ref of this.requiredRefs) {
      if (!this.resolveSync(ref)) {
        throw new Error(`Missing required secret: ${ref}`);
      }
    }
  }

  private resolveSync(ref: string): string | null {
    // Check process.env first to pick up runtime changes (secret rotation)
    const envValue = process.env[ref];
    if (envValue !== undefined) {
      return envValue;
    }
    // Fall back to constructor-loaded store snapshot
    if (this.store.has(ref)) {
      return this.store.get(ref) ?? null;
    }
    return null;
  }

  async resolve(ref: string): Promise<string | null> {
    return this.resolveSync(ref);
  }

  async validateRequired(refs: string[]): Promise<{ valid: boolean; missing: string[] }> {
    const missing: string[] = [];
    for (const ref of refs) {
      if (!this.resolveSync(ref)) missing.push(ref);
    }
    return { valid: missing.length === 0, missing };
  }

  async health(): Promise<StoreHealth> {
    const start = Date.now();
    try {
      const missing: string[] = [];
      for (const ref of this.requiredRefs) {
        // Bypass cache to detect runtime env deletions
        if (!process.env[ref]) missing.push(ref);
      }
      if (missing.length > 0) {
        return { status: 'degraded', latencyMs: Date.now() - start, error: `Missing secrets: ${missing.join(', ')}` };
      }
      return { status: 'healthy', latencyMs: Date.now() - start };
    } catch (err: any) {
      return { status: 'unavailable', latencyMs: Date.now() - start, error: err.message };
    }
  }
}
