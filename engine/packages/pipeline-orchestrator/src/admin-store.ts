import Database from 'better-sqlite3';

export interface ConversationMeta {
  tenantId: string;
  sessionId: string;
  status: string;
  owner: string | null;
  flagged: boolean;
  archived: boolean;
}

export interface ConversationNote {
  id: number;
  tenantId: string;
  sessionId: string;
  author: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: number;
  tenantId: string;
  sessionId: string;
  eventType: string;
  actor: string | null;
  details: string;
  createdAt: string;
}

export class AdminStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_metadata (
        tenant_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        owner TEXT DEFAULT NULL,
        flagged INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (tenant_id, session_id)
      );

      CREATE TABLE IF NOT EXISTS conversation_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        author TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS conversation_tags (
        tenant_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (tenant_id, session_id, tag)
      );

      CREATE TABLE IF NOT EXISTS conversation_timeline (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        actor TEXT DEFAULT NULL,
        details TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_timeline_session ON conversation_timeline(tenant_id, session_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_metadata_status ON conversation_metadata(tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_notes_session ON conversation_notes(tenant_id, session_id);
      CREATE INDEX IF NOT EXISTS idx_tags_session ON conversation_tags(tenant_id, session_id);
    `);
  }

  private addTimelineEntry(tenantId: string, sessionId: string, eventType: string, actor: string | null, details: Record<string, unknown>): void {
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO conversation_timeline (tenant_id, session_id, event_type, actor, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(tenantId, sessionId, eventType, actor, JSON.stringify(details), now);
  }

  // ─── Status ──────────────────────────────────────────────
  getOrCreateMeta(tenantId: string, sessionId: string): ConversationMeta {
    const existing = this.db.prepare(
      'SELECT tenant_id, session_id, status, owner, flagged, archived FROM conversation_metadata WHERE tenant_id = ? AND session_id = ?'
    ).get(tenantId, sessionId) as any;
    if (existing) {
      return {
        tenantId: existing.tenant_id,
        sessionId: existing.session_id,
        status: existing.status,
        owner: existing.owner,
        flagged: !!existing.flagged,
        archived: !!existing.archived,
      };
    }
    this.db.prepare(
      'INSERT OR IGNORE INTO conversation_metadata (tenant_id, session_id, status) VALUES (?, ?, \'new\')'
    ).run(tenantId, sessionId);
    return { tenantId, sessionId, status: 'new', owner: null, flagged: false, archived: false };
  }

  updateStatus(tenantId: string, sessionId: string, status: string, actor: string | null): ConversationMeta {
    this.getOrCreateMeta(tenantId, sessionId);
    this.db.prepare(
      'UPDATE conversation_metadata SET status = ? WHERE tenant_id = ? AND session_id = ?'
    ).run(status, tenantId, sessionId);
    this.addTimelineEntry(tenantId, sessionId, 'status_change', actor, { status, previous: this.getPreviousStatus(tenantId, sessionId) });
    return this.getOrCreateMeta(tenantId, sessionId);
  }

  private getPreviousStatus(tenantId: string, sessionId: string): string {
    const row = this.db.prepare(
      'SELECT details FROM conversation_timeline WHERE tenant_id = ? AND session_id = ? AND event_type = \'status_change\' ORDER BY id DESC LIMIT 1 OFFSET 1'
    ).get(tenantId, sessionId) as any;
    if (row) {
      try { return JSON.parse(row.details).status || 'new'; } catch {}
    }
    return 'new';
  }

  assignOwner(tenantId: string, sessionId: string, owner: string, actor: string | null): ConversationMeta {
    this.getOrCreateMeta(tenantId, sessionId);
    this.db.prepare(
      'UPDATE conversation_metadata SET owner = ? WHERE tenant_id = ? AND session_id = ?'
    ).run(owner, tenantId, sessionId);
    this.addTimelineEntry(tenantId, sessionId, 'assignment', actor, { owner });
    return this.getOrCreateMeta(tenantId, sessionId);
  }

  setFlagged(tenantId: string, sessionId: string, flagged: boolean, actor: string | null): ConversationMeta {
    this.getOrCreateMeta(tenantId, sessionId);
    this.db.prepare(
      'UPDATE conversation_metadata SET flagged = ? WHERE tenant_id = ? AND session_id = ?'
    ).run(flagged ? 1 : 0, tenantId, sessionId);
    this.addTimelineEntry(tenantId, sessionId, 'flag', actor, { flagged });
    return this.getOrCreateMeta(tenantId, sessionId);
  }

  setArchived(tenantId: string, sessionId: string, archived: boolean, actor: string | null): ConversationMeta {
    this.getOrCreateMeta(tenantId, sessionId);
    this.db.prepare(
      'UPDATE conversation_metadata SET archived = ? WHERE tenant_id = ? AND session_id = ?'
    ).run(archived ? 1 : 0, tenantId, sessionId);
    this.addTimelineEntry(tenantId, sessionId, 'archive', actor, { archived });
    return this.getOrCreateMeta(tenantId, sessionId);
  }

  // ─── Tags ─────────────────────────────────────────────────
  getTags(tenantId: string, sessionId: string): string[] {
    const rows = this.db.prepare(
      'SELECT tag FROM conversation_tags WHERE tenant_id = ? AND session_id = ?'
    ).all(tenantId, sessionId) as any[];
    return rows.map(r => r.tag);
  }

  setTags(tenantId: string, sessionId: string, tags: string[], actor: string | null): string[] {
    const prev = this.getTags(tenantId, sessionId);
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM conversation_tags WHERE tenant_id = ? AND session_id = ?').run(tenantId, sessionId);
      const insert = this.db.prepare('INSERT INTO conversation_tags (tenant_id, session_id, tag) VALUES (?, ?, ?)');
      for (const tag of tags) {
        insert.run(tenantId, sessionId, tag);
      }
    })();
    if (JSON.stringify(prev) !== JSON.stringify(tags)) {
      this.addTimelineEntry(tenantId, sessionId, 'tags', actor, { added: tags.filter(t => !prev.includes(t)), removed: prev.filter(t => !tags.includes(t)) });
    }
    return tags;
  }

  // ─── Notes ────────────────────────────────────────────────
  createNote(tenantId: string, sessionId: string, author: string, message: string): ConversationNote {
    const now = new Date().toISOString();
    const result = this.db.prepare(
      'INSERT INTO conversation_notes (tenant_id, session_id, author, message, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(tenantId, sessionId, author, message, now, now);
    this.addTimelineEntry(tenantId, sessionId, 'note', author, { noteId: result.lastInsertRowid });
    return {
      id: result.lastInsertRowid as number,
      tenantId, sessionId, author, message, createdAt: now, updatedAt: now,
    };
  }

  getNotes(tenantId: string, sessionId: string): ConversationNote[] {
    const rows = this.db.prepare(
      'SELECT id, tenant_id, session_id, author, message, created_at, updated_at FROM conversation_notes WHERE tenant_id = ? AND session_id = ? ORDER BY created_at DESC'
    ).all(tenantId, sessionId) as any[];
    return rows.map(r => ({
      id: r.id,
      tenantId: r.tenant_id,
      sessionId: r.session_id,
      author: r.author,
      message: r.message,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  updateNote(tenantId: string, sessionId: string, noteId: number, author: string, message: string): ConversationNote | null {
    const existing = this.db.prepare(
      'SELECT id, author FROM conversation_notes WHERE tenant_id = ? AND session_id = ? AND id = ?'
    ).get(tenantId, sessionId, noteId) as any;
    if (!existing) return null;
    if (existing.author !== author) return null;
    const now = new Date().toISOString();
    this.db.prepare(
      'UPDATE conversation_notes SET message = ?, updated_at = ? WHERE id = ?'
    ).run(message, now, noteId);
    return this.getNotes(tenantId, sessionId).find(n => n.id === noteId) ?? null;
  }

  // ─── Timeline ─────────────────────────────────────────────
  getTimeline(tenantId: string, sessionId: string): TimelineEvent[] {
    const rows = this.db.prepare(
      'SELECT id, tenant_id, session_id, event_type, actor, details, created_at FROM conversation_timeline WHERE tenant_id = ? AND session_id = ? ORDER BY id DESC'
    ).all(tenantId, sessionId) as any[];
    return rows.map(r => ({
      id: r.id,
      tenantId: r.tenant_id,
      sessionId: r.session_id,
      eventType: r.event_type,
      actor: r.actor,
      details: r.details,
      createdAt: r.created_at,
    }));
  }

  // ─── Leads ────────────────────────────────────────────────
  getLeads(tenantId: string, limit = 50, offset = 0): { sessionId: string; status: string; owner: string | null; flagged: boolean; archived: boolean }[] {
    const rows = this.db.prepare(
      "SELECT session_id, status, owner, flagged, archived FROM conversation_metadata WHERE tenant_id = ? AND status IN ('new', 'working', 'qualified') ORDER BY CASE status WHEN 'qualified' THEN 0 WHEN 'working' THEN 1 ELSE 2 END, session_id DESC LIMIT ? OFFSET ?"
    ).all(tenantId, limit, offset) as any[];
    return rows.map(r => ({
      sessionId: r.session_id,
      status: r.status,
      owner: r.owner,
      flagged: !!r.flagged,
      archived: !!r.archived,
    }));
  }

  getLeadsTotal(tenantId: string): number {
    const row = this.db.prepare(
      "SELECT COUNT(*) as count FROM conversation_metadata WHERE tenant_id = ? AND status IN ('new', 'working', 'qualified')"
    ).get(tenantId) as any;
    return row?.count ?? 0;
  }

  // ─── Follow-ups (based on conditions) ─────────────────────
  getFollowUps(tenantId: string, limit = 50, offset = 0): { sessionId: string; reason: string; status: string; owner: string | null }[] {
    const rows = this.db.prepare(
      "SELECT cm.session_id, cm.status, cm.owner FROM conversation_metadata cm WHERE cm.tenant_id = ? AND cm.archived = 0 AND cm.status NOT IN ('won', 'lost') ORDER BY cm.session_id DESC LIMIT ? OFFSET ?"
    ).all(tenantId, limit, offset) as any[];
    return rows.map(r => ({
      sessionId: r.session_id,
      reason: 'needs_followup',
      status: r.status,
      owner: r.owner,
    }));
  }

  getFollowUpsTotal(tenantId: string): number {
    const row = this.db.prepare(
      "SELECT COUNT(*) as count FROM conversation_metadata cm WHERE cm.tenant_id = ? AND cm.archived = 0 AND cm.status NOT IN ('won', 'lost')"
    ).get(tenantId) as any;
    return row?.count ?? 0;
  }

  close(): void {
    this.db.close();
  }
}
