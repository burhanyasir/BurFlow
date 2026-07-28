import Database from 'better-sqlite3';
import { StoreHealth } from '@conversation-engine/core-types';

export interface DedupEntry {
  tenantId: string;
  messageId: string;
  originalSequence: number;
  responseHash?: string;
  responseBody?: string;
  createdAt: number;
  expiresAt: number;
  dedupVersion: number;
}

export interface DedupStore {
  checkAndSet(tenantId: string, messageId: string, ttlSeconds: number): Promise<{ isDuplicate: boolean; existing?: DedupEntry }>;
  get(tenantId: string, messageId: string): Promise<DedupEntry | null>;
  markProcessed(tenantId: string, messageId: string, expectedVersion: number, responseHash?: string, responseBody?: string): Promise<{ success: boolean }>;
  health(): Promise<StoreHealth>;
}

function validateInput(tenantId: string, messageId: string, ttlSeconds?: number): void {
  if (!tenantId || typeof tenantId !== 'string') throw new Error('tenantId must be a non-empty string');
  if (!messageId || typeof messageId !== 'string') throw new Error('messageId must be a non-empty string');
  if (ttlSeconds !== undefined && (typeof ttlSeconds !== 'number' || ttlSeconds <= 0 || !Number.isFinite(ttlSeconds))) {
    throw new Error('ttlSeconds must be a positive number');
  }
}

const TENANT_ID_RE = /^[a-zA-Z0-9_\-]+$/;

function sanitizeTenantId(tenantId: string): string | null {
  if (!tenantId || typeof tenantId !== 'string') return null;
  if (tenantId.length > 255) return null;
  if (tenantId.includes('..') || tenantId.includes('/') || tenantId.includes('\\') || tenantId.includes('\0')) return null;
  if (!TENANT_ID_RE.test(tenantId)) return null;
  return tenantId;
}

export class SqliteDedupStore implements DedupStore {
  private db: Database.Database;
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.migrate();
    this.cleanupTimer = setInterval(() => this.cleanup(), 60000);
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dedup_cache (
        tenant_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        original_sequence INTEGER NOT NULL,
        response_hash TEXT,
        response_body TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        dedup_version INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (tenant_id, message_id)
      );
      CREATE INDEX IF NOT EXISTS idx_dedup_expires ON dedup_cache(expires_at);
    `);
  }

  async checkAndSet(tenantId: string, messageId: string, ttlSeconds: number): Promise<{ isDuplicate: boolean; existing?: DedupEntry }> {
    validateInput(tenantId, messageId, ttlSeconds);
    if (!sanitizeTenantId(tenantId)) throw new Error(`Invalid tenantId: ${tenantId}`);

    const now = Date.now();
    const existing = this.db.prepare(
      'SELECT tenant_id, message_id, original_sequence, response_hash, response_body, created_at, expires_at, dedup_version FROM dedup_cache WHERE tenant_id = ? AND message_id = ? AND expires_at > ?'
    ).get(tenantId, messageId, now) as any;

    if (existing) {
      return {
        isDuplicate: true,
        existing: {
          tenantId: existing.tenant_id,
          messageId: existing.message_id,
          originalSequence: existing.original_sequence,
          responseHash: existing.response_hash ?? undefined,
          responseBody: existing.response_body ?? undefined,
          createdAt: existing.created_at,
          expiresAt: existing.expires_at,
          dedupVersion: existing.dedup_version,
        },
      };
    }

    const expiresAt = now + ttlSeconds * 1000;
    const deleteExpired = this.db.prepare('DELETE FROM dedup_cache WHERE tenant_id = ? AND message_id = ? AND expires_at <= ?');
    const insertNew = this.db.prepare(`
      INSERT INTO dedup_cache (tenant_id, message_id, original_sequence, created_at, expires_at, dedup_version)
      VALUES (?, ?, 0, ?, ?, 1)
    `);

    const transaction = this.db.transaction(() => {
      deleteExpired.run(tenantId, messageId, now);
      insertNew.run(tenantId, messageId, now, expiresAt);
    });

    try {
      transaction();
    } catch {
      const existingAfterRace = this.db.prepare(
        'SELECT tenant_id, message_id, original_sequence, response_hash, response_body, created_at, expires_at, dedup_version FROM dedup_cache WHERE tenant_id = ? AND message_id = ? AND expires_at > ?'
      ).get(tenantId, messageId, now) as any;
      if (existingAfterRace) {
        return {
          isDuplicate: true,
          existing: {
            tenantId: existingAfterRace.tenant_id,
            messageId: existingAfterRace.message_id,
            originalSequence: existingAfterRace.original_sequence,
            responseHash: existingAfterRace.response_hash ?? undefined,
            responseBody: existingAfterRace.response_body ?? undefined,
            createdAt: existingAfterRace.created_at,
            expiresAt: existingAfterRace.expires_at,
            dedupVersion: existingAfterRace.dedup_version,
          },
        };
      }
      return { isDuplicate: true };
    }

    return { isDuplicate: false };
  }

  async markProcessed(tenantId: string, messageId: string, expectedVersion: number, responseHash?: string, responseBody?: string): Promise<{ success: boolean }> {
    validateInput(tenantId, messageId);
    const result = this.db.prepare(`
      UPDATE dedup_cache SET dedup_version = ?, response_hash = ?, response_body = ?
      WHERE tenant_id = ? AND message_id = ? AND dedup_version = ?
    `).run(expectedVersion + 1, responseHash ?? null, responseBody ?? null, tenantId, messageId, expectedVersion);
    return { success: result.changes > 0 };
  }

  async get(tenantId: string, messageId: string): Promise<DedupEntry | null> {
    validateInput(tenantId, messageId);
    const row = this.db.prepare(
      'SELECT tenant_id, message_id, original_sequence, response_hash, response_body, created_at, expires_at, dedup_version FROM dedup_cache WHERE tenant_id = ? AND message_id = ? AND expires_at > ?'
    ).get(tenantId, messageId, Date.now()) as any;
    if (!row) return null;
    return {
      tenantId: row.tenant_id,
      messageId: row.message_id,
      originalSequence: row.original_sequence,
      responseHash: row.response_hash ?? undefined,
      responseBody: row.response_body ?? undefined,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      dedupVersion: row.dedup_version,
    };
  }

  private cleanup(): void {
    this.db.prepare('DELETE FROM dedup_cache WHERE expires_at <= ?').run(Date.now());
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
    clearInterval(this.cleanupTimer);
    this.db.close();
  }
}
