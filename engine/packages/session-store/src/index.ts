import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { StoreHealth } from '@conversation-engine/core-types';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CLIENT_SESSION_RE = /^session_[A-Za-z0-9._:-]+$/;

export function isValidSessionId(sessionId: string): boolean {
  return UUID_RE.test(sessionId) || CLIENT_SESSION_RE.test(sessionId);
}

export interface SessionRecord {
  tenantId: string;
  sessionId: string;
  version: number;
  state: string;
  stateMachine: string;
  sequenceCounter: number;
  configVersion: number;
  createdAt: string;
  updatedAt: string;
  ttlMinutes: number;
  gracePeriodDays: number;
  legalHoldDays: number;
}

export interface SessionStore {
  createSession(tenantId: string, configVersion: number, ttlMinutes?: number, sessionId?: string): Promise<SessionRecord>;
  loadSession(tenantId: string, sessionId: string): Promise<SessionRecord | null>;
  commitSession(tenantId: string, sessionId: string, expectedVersion: number, updates: Partial<SessionRecord>): Promise<{ success: boolean; newVersion?: number; sequenceCounter?: number }>;
  incrementSequence(tenantId: string, sessionId: string): Promise<number>;
  listSessions(tenantId: string, limit?: number, offset?: number): Promise<{ sessions: SessionRecord[]; total: number }>;
  health(): Promise<StoreHealth>;
}

export class SqliteSessionStore implements SessionStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        tenant_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        state TEXT NOT NULL DEFAULT '{}',
        state_machine TEXT NOT NULL DEFAULT 'initial',
        sequence_counter INTEGER NOT NULL DEFAULT 0,
        config_version INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        ttl_minutes INTEGER NOT NULL DEFAULT 1440,
        grace_period_days INTEGER NOT NULL DEFAULT 7,
        legal_hold_days INTEGER NOT NULL DEFAULT 90,
        PRIMARY KEY (tenant_id, session_id)
      );
    `);
  }

  async createSession(tenantId: string, configVersion: number, ttlMinutes = 1440, sessionId?: string): Promise<SessionRecord> {
    const normalizedSessionId = sessionId || uuid();
    if (sessionId && !isValidSessionId(sessionId)) {
      throw new Error('Invalid sessionId format');
    }

    const existingForTenant = this.db.prepare(
      'SELECT tenant_id, session_id, version, state, state_machine, sequence_counter, config_version, created_at, updated_at, ttl_minutes, grace_period_days, legal_hold_days FROM sessions WHERE tenant_id = ? AND session_id = ?'
    ).get(tenantId, normalizedSessionId) as any;

    if (existingForTenant) {
      return {
        tenantId: existingForTenant.tenant_id,
        sessionId: existingForTenant.session_id,
        version: existingForTenant.version,
        state: existingForTenant.state,
        stateMachine: existingForTenant.state_machine,
        sequenceCounter: existingForTenant.sequence_counter,
        configVersion: existingForTenant.config_version,
        createdAt: existingForTenant.created_at,
        updatedAt: existingForTenant.updated_at,
        ttlMinutes: existingForTenant.ttl_minutes,
        gracePeriodDays: existingForTenant.grace_period_days,
        legalHoldDays: existingForTenant.legal_hold_days,
      };
    }

    const existingAnyTenant = this.db.prepare(
      'SELECT tenant_id FROM sessions WHERE session_id = ? LIMIT 1'
    ).get(normalizedSessionId) as any;

    if (sessionId && existingAnyTenant && existingAnyTenant.tenant_id !== tenantId) {
      throw new Error('SessionId already exists for a different tenant');
    }

    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO sessions (tenant_id, session_id, version, state, state_machine, sequence_counter, config_version, created_at, updated_at, ttl_minutes)
      VALUES (?, ?, 1, '{}', 'initial', 0, ?, ?, ?, ?)
    `).run(tenantId, normalizedSessionId, configVersion, now, now, ttlMinutes);
    return {
      tenantId, sessionId: normalizedSessionId, version: 1, state: '{}', stateMachine: 'initial',
      sequenceCounter: 0, configVersion, createdAt: now, updatedAt: now,
      ttlMinutes, gracePeriodDays: 7, legalHoldDays: 90,
    };
  }

  async loadSession(tenantId: string, sessionId: string): Promise<SessionRecord | null> {
    const row = this.db.prepare(
      'SELECT tenant_id, session_id, version, state, state_machine, sequence_counter, config_version, created_at, updated_at, ttl_minutes, grace_period_days, legal_hold_days FROM sessions WHERE tenant_id = ? AND session_id = ?'
    ).get(tenantId, sessionId) as any;
    if (!row) return null;

    const updatedAt = new Date(row.updated_at).getTime();
    const ttlMs = row.ttl_minutes * 60 * 1000;
    let stateMachine = row.state_machine;
    if (Date.now() - updatedAt > ttlMs) {
      this.db.prepare("UPDATE sessions SET state_machine = 'expired' WHERE tenant_id = ? AND session_id = ? AND state_machine != 'expired'")
        .run(tenantId, sessionId);
      stateMachine = 'expired';
    }

    return {
      tenantId: row.tenant_id,
      sessionId: row.session_id,
      version: row.version,
      state: row.state,
      stateMachine,
      sequenceCounter: row.sequence_counter,
      configVersion: row.config_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ttlMinutes: row.ttl_minutes,
      gracePeriodDays: row.grace_period_days,
      legalHoldDays: row.legal_hold_days,
    };
  }

  async commitSession(tenantId: string, sessionId: string, expectedVersion: number, updates: Partial<SessionRecord>): Promise<{ success: boolean; newVersion?: number; sequenceCounter?: number }> {
    const now = new Date().toISOString();
    const newVersion = expectedVersion + 1;
    const sets: string[] = ['version = ?', 'updated_at = ?', 'sequence_counter = sequence_counter + 1'];
    const params: any[] = [newVersion, now];

    if (updates.state !== undefined) { sets.push('state = ?'); params.push(updates.state); }
    if (updates.stateMachine !== undefined) { sets.push('state_machine = ?'); params.push(updates.stateMachine); }
    if (updates.configVersion !== undefined) { sets.push('config_version = ?'); params.push(updates.configVersion); }

    params.push(tenantId, sessionId, expectedVersion);

    const updateStmt = this.db.prepare(
      `UPDATE sessions SET ${sets.join(', ')} WHERE tenant_id = ? AND session_id = ? AND version = ?`
    );
    const selectStmt = this.db.prepare(
      'SELECT sequence_counter FROM sessions WHERE tenant_id = ? AND session_id = ?'
    );

    const transaction = this.db.transaction(() => {
      const result = updateStmt.run(...params);
      if (result.changes === 0) {
        return { success: false as const };
      }
      const row = selectStmt.get(tenantId, sessionId) as any;
      return { success: true as const, newVersion, sequenceCounter: row.sequence_counter };
    });

    return transaction();
  }

  async incrementSequence(tenantId: string, sessionId: string): Promise<number> {
    const result = this.db.prepare(
      'UPDATE sessions SET sequence_counter = sequence_counter + 1 WHERE tenant_id = ? AND session_id = ?'
    ).run(tenantId, sessionId);
    if (result.changes === 0) throw new Error('Session not found for sequence increment');
    const row = this.db.prepare(
      'SELECT sequence_counter FROM sessions WHERE tenant_id = ? AND session_id = ?'
    ).get(tenantId, sessionId) as any;
    return row.sequence_counter;
  }

  async listSessions(tenantId: string, limit = 50, offset = 0): Promise<{ sessions: SessionRecord[]; total: number }> {
    const total = (this.db.prepare(
      'SELECT COUNT(*) as count FROM sessions WHERE tenant_id = ?'
    ).get(tenantId) as any)?.count || 0;

    const rows = this.db.prepare(
      'SELECT tenant_id, session_id, version, state, state_machine, sequence_counter, config_version, created_at, updated_at, ttl_minutes, grace_period_days, legal_hold_days FROM sessions WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?'
    ).all(tenantId, limit, offset) as any[];

    const sessions: SessionRecord[] = rows.map(row => ({
      tenantId: row.tenant_id,
      sessionId: row.session_id,
      version: row.version,
      state: row.state,
      stateMachine: row.state_machine,
      sequenceCounter: row.sequence_counter,
      configVersion: row.config_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ttlMinutes: row.ttl_minutes,
      gracePeriodDays: row.grace_period_days,
      legalHoldDays: row.legal_hold_days,
    }));

    return { sessions, total };
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
}
