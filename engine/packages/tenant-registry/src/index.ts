import Database from 'better-sqlite3';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { StoreHealth } from '@conversation-engine/core-types';

export interface TenantRegistryEntry {
  tenantId: string;
  status: 'active' | 'deactivated';
  createdAt: string;
  deactivatedAt?: string;
  deactivationReason?: string;
}

export type TenantRegistryRole = 'admin' | 'operator' | 'service' | 'end-user';

export interface ApiKeyRecord {
  keyHash: string;
  keyPrefix: string;
  salt: string;
  tenantId: string;
  role: TenantRegistryRole;
  label?: string;
  createdAt: string;
  revokedAt?: string;
}

export interface TenantRegistry {
  lookupTenant(tenantId: string): Promise<TenantRegistryEntry | null>;
  resolveApiKey(keyHash: string): Promise<string | null>;
  validateApiKey(rawKey: string): Promise<{ tenantId: string; role: TenantRegistryRole } | null>;
  health(): Promise<StoreHealth>;
}

export class SqliteTenantRegistry implements TenantRegistry {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tenant_registry (
        tenant_id TEXT NOT NULL PRIMARY KEY,
        status TEXT NOT NULL CHECK (status IN ('active', 'deactivated')),
        created_at TEXT NOT NULL,
        deactivated_at TEXT,
        deactivation_reason TEXT
      );
      CREATE TABLE IF NOT EXISTS api_keys (
        key_hash TEXT NOT NULL PRIMARY KEY,
        key_prefix TEXT NOT NULL,
        salt TEXT NOT NULL,
        tenant_id TEXT NOT NULL REFERENCES tenant_registry(tenant_id),
        role TEXT NOT NULL DEFAULT 'end-user' CHECK (role IN ('admin', 'operator', 'service', 'end-user')),
        label TEXT,
        created_at TEXT NOT NULL,
        revoked_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
    `);
    // Add columns missing in databases created by earlier schema versions
    try { this.db.exec('ALTER TABLE api_keys ADD COLUMN role TEXT NOT NULL DEFAULT \'end-user\''); } catch {}
    try { this.db.exec('ALTER TABLE api_keys ADD COLUMN label TEXT'); } catch {}
    try { this.db.exec('ALTER TABLE api_keys ADD COLUMN revoked_at TEXT'); } catch {}
  }

  async lookupTenant(tenantId: string): Promise<TenantRegistryEntry | null> {
    const row = this.db.prepare(
      'SELECT tenant_id, status, created_at, deactivated_at, deactivation_reason FROM tenant_registry WHERE tenant_id = ?'
    ).get(tenantId) as any;
    if (!row) return null;
    return {
      tenantId: row.tenant_id,
      status: row.status,
      createdAt: row.created_at,
      deactivatedAt: row.deactivated_at ?? undefined,
      deactivationReason: row.deactivation_reason ?? undefined,
    };
  }

  async resolveApiKey(keyHash: string): Promise<string | null> {
    const row = this.db.prepare(
      `SELECT r.tenant_id FROM api_keys k
       JOIN tenant_registry r ON k.tenant_id = r.tenant_id
       WHERE k.key_hash = ? AND k.revoked_at IS NULL AND r.status = 'active'`
    ).get(keyHash) as any;
    return row?.tenant_id ?? null;
  }

  async validateApiKey(rawKey: string): Promise<{ tenantId: string; role: TenantRegistryRole } | null> {
    if (!rawKey || rawKey.length < 8) return null;
    const prefix = rawKey.substring(0, 8);
    const candidates = this.db.prepare(
      'SELECT key_hash, salt, tenant_id, role FROM api_keys WHERE key_prefix = ? AND revoked_at IS NULL'
    ).all(prefix) as Array<{ key_hash: string; salt: string; tenant_id: string; role: string }>;

    for (const candidate of candidates) {
      const computedHash = createHash('sha256').update(candidate.salt + rawKey).digest('hex');
      const hashBuf = Buffer.from(computedHash, 'hex');
      const candidateBuf = Buffer.from(candidate.key_hash, 'hex');
      if (hashBuf.length === candidateBuf.length && timingSafeEqual(hashBuf, candidateBuf)) {
        const tenant = this.db.prepare(
          'SELECT status FROM tenant_registry WHERE tenant_id = ?'
        ).get(candidate.tenant_id) as any;
        if (tenant && tenant.status === 'active') {
          return { tenantId: candidate.tenant_id, role: candidate.role as TenantRegistryRole };
        }
        return null;
      }
    }
    return null;
  }

  async health(): Promise<StoreHealth> {
    const start = Date.now();
    try {
      this.db.prepare('SELECT 1').get();
      return { status: 'healthy', latencyMs: Date.now() - start };
    } catch (err: any) {
      return { status: 'unavailable', latencyMs: Date.now() - start, error: err.message };
    }
  }

  close(): void {
    this.db.close();
  }

  // Seed helpers for dev/test
  seedTenant(tenantId: string, status: 'active' | 'deactivated' = 'active'): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO tenant_registry (tenant_id, status, created_at)
      VALUES (?, ?, datetime('now'))
    `).run(tenantId, status);
  }

  seedApiKey(tenantId: string, rawKey: string, label?: string, role: TenantRegistryRole = 'end-user'): { keyHash: string; salt: string } {
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update(salt + rawKey).digest('hex');
    const prefix = rawKey.substring(0, 8);
    this.db.prepare(`
      INSERT OR REPLACE INTO api_keys (key_hash, key_prefix, salt, tenant_id, role, label, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(hash, prefix, salt, tenantId, role, label ?? null);
    return { keyHash: hash, salt };
  }
}
