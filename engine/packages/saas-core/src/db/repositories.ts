import type { SqlDatabase } from './types';
import { User, Tenant, TenantApiKey, Conversation, Message, UsageRecord, TenantSettings, KnowledgeBase, KbDocument, OnboardingProgress, OnboardingStatus, WidgetConfig, RefreshToken, AnalyticsEvent, Subscription, SubscriptionPlan, Invoice, Payment, BillingEvent, PaddleCustomer, UnansweredQuestion, UnansweredQuestionCluster, KnowledgeSuggestion, CitationAnalytics, ConversationInsights, UnansweredQuestionStats, UsageAlert, TeamMember, Invitation, ActivityEvent, AuditLogEntry, EnhancedApiKey, ApiKeyPermission, ApiKeyUsageStats, Webhook, WebhookDelivery, UptimeHistory, SecurityStatus, Incident, ComplianceDocument, DpaDocument, Subprocessor, TopicResponseTemplate, TeamRole, WebhookEvent, SecurityStatusType, IncidentSeverity, IncidentStatus, Lead, QualificationStatus, BuyingIntentLevel, LeadSource, SessionState, SessionNote, WebsiteScan, ScannedPage, ScanStatus, ScanCrawlMode, ScanSchedule, ScannedPageStatus } from '../types';
import { generateId, hashPassword, generateApiKey, slugify, hashToken } from '../auth';

const DEFAULT_SETTINGS: TenantSettings = {
  branding: { primaryColor: '#3B82F6', companyName: 'My Company', welcomeMessage: 'Hello! How can I help you today?', offlineMessage: 'We are currently offline. Please leave a message.' },
  safety: { contentFilterThreshold: 'moderate', crisisResponseEnabled: true, piiRedactionMode: 'mask' },
  ai: { systemPrompt: 'You are a helpful customer support assistant.', model: 'gpt-4', temperature: 0.7, maxTokens: 1024, fallbackResponse: 'I apologize, but I am unable to process your request at this time.' },
  widget: { position: 'bottom-right', theme: 'light', autoOpen: false },
};

export class UserRepository {
  constructor(private db: SqlDatabase) {}

  create(data: { email: string; password: string; name: string; verificationToken?: string; verificationTokenExpiry?: string }): User {
    const id = generateId();
    const now = new Date().toISOString();
    const passwordHash = hashPassword(data.password);
    this.db.prepare(
      'INSERT INTO users (id, email, password_hash, name, verification_token, verification_token_expiry, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.email, passwordHash, data.name, data.verificationToken || null, data.verificationTokenExpiry || null, now, now);
    return this.findById(id)!;
  }

  findById(id: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findByEmail(email: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    return row ? this.mapRow(row) : null;
  }

  update(id: string, data: Partial<Pick<User, 'name' | 'avatarUrl' | 'emailVerified' | 'passwordHash'>> & { verificationToken?: string | null; verificationTokenExpiry?: string | null; resetToken?: string | null; resetTokenExpiry?: string | null; }): User | null {
    const sets: string[] = [];
    const vals: any[] = [];
    if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
    if (data.avatarUrl !== undefined) { sets.push('avatar_url = ?'); vals.push(data.avatarUrl); }
    if (data.emailVerified !== undefined) { sets.push('email_verified = ?'); vals.push(data.emailVerified ? 1 : 0); }
    if (data.passwordHash !== undefined) { sets.push('password_hash = ?'); vals.push(data.passwordHash); }
    if (data.verificationToken !== undefined) { sets.push('verification_token = ?'); vals.push(data.verificationToken); }
    if (data.verificationTokenExpiry !== undefined) { sets.push('verification_token_expiry = ?'); vals.push(data.verificationTokenExpiry); }
    if (data.resetToken !== undefined) { sets.push('reset_token = ?'); vals.push(data.resetToken); }
    if (data.resetTokenExpiry !== undefined) { sets.push('reset_token_expiry = ?'); vals.push(data.resetTokenExpiry); }
    if (sets.length === 0) return this.findById(id);
    sets.push('updated_at = ?');
    vals.push(new Date().toISOString());
    vals.push(id);
    this.db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    return this.findById(id);
  }

  findByVerificationToken(token: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE verification_token = ?').get(token) as any;
    return row ? this.mapRow(row) : null;
  }

  findByResetToken(token: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token) as any;
    return row ? this.mapRow(row) : null;
  }

  private mapRow(row: any): User {
    return {
      id: row.id, email: row.email, passwordHash: row.password_hash,
      name: row.name, avatarUrl: row.avatar_url, emailVerified: !!row.email_verified,
      verificationToken: row.verification_token, verificationTokenExpiry: row.verification_token_expiry,
      resetToken: row.reset_token, resetTokenExpiry: row.reset_token_expiry,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

export class TenantRepository {
  constructor(private db: SqlDatabase) {}

  create(data: { name: string; ownerId: string; parentTenantId?: string; customDomain?: string }): Tenant {
    const id = generateId();
    const now = new Date().toISOString();
    const slug = slugify(data.name) + '-' + id.slice(0, 6);
    const trialEnds = new Date(Date.now() + 14 * 86400000).toISOString();
    this.db.prepare(
      'INSERT INTO tenants (id, name, slug, owner_id, trial_ends_at, settings, parent_tenant_id, custom_domain, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.name, slug, data.ownerId, trialEnds, JSON.stringify(DEFAULT_SETTINGS), data.parentTenantId || null, data.customDomain || null, now, now);
    return this.findById(id)!;
  }

  findById(id: string): Tenant | null {
    const row = this.db.prepare('SELECT * FROM tenants WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findBySlug(slug: string): Tenant | null {
    const row = this.db.prepare('SELECT * FROM tenants WHERE slug = ?').get(slug) as any;
    return row ? this.mapRow(row) : null;
  }

  findBySlugLike(pattern: string): Tenant | null {
    const row = this.db.prepare('SELECT * FROM tenants WHERE LOWER(slug) LIKE LOWER(?) LIMIT 1').get(pattern) as any;
    return row ? this.mapRow(row) : null;
  }

  findByNameLike(pattern: string): Tenant | null {
    const row = this.db.prepare('SELECT * FROM tenants WHERE LOWER(name) LIKE LOWER(?) LIMIT 1').get(pattern) as any;
    return row ? this.mapRow(row) : null;
  }

  findByOwner(ownerId: string): Tenant[] {
    const rows = this.db.prepare('SELECT * FROM tenants WHERE owner_id = ?').all(ownerId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  findSubTenantsByParentId(parentId: string): Tenant[] {
    const rows = this.db.prepare('SELECT * FROM tenants WHERE parent_tenant_id = ? ORDER BY created_at ASC').all(parentId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  findByCustomDomain(domain: string): Tenant | null {
    const row = this.db.prepare('SELECT * FROM tenants WHERE custom_domain = ?').get(domain) as any;
    return row ? this.mapRow(row) : null;
  }

  updateBranding(id: string, data: { customDomain?: string | null; whiteLabelBranding?: Record<string, unknown> }): Tenant | null {
    const sets: string[] = [];
    const vals: any[] = [];
    if (data.customDomain !== undefined) { sets.push('custom_domain = ?'); vals.push(data.customDomain || null); }
    if (data.whiteLabelBranding !== undefined) {
      const current = this.findById(id)?.whiteLabelBranding || {};
      sets.push('white_label_branding = ?');
      vals.push(JSON.stringify({ ...current, ...data.whiteLabelBranding }));
    }
    if (sets.length === 0) return this.findById(id);
    sets.push('updated_at = ?');
    vals.push(new Date().toISOString());
    vals.push(id);
    this.db.prepare(`UPDATE tenants SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    return this.findById(id);
  }

  list(page = 1, limit = 20): { tenants: Tenant[]; total: number } {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM tenants').get() as any).c;
    const rows = this.db.prepare('SELECT * FROM tenants ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(limit, (page - 1) * limit) as any[];
    return { tenants: rows.map(r => this.mapRow(r)), total };
  }

  update(id: string, data: Partial<Pick<Tenant, 'name' | 'plan' | 'subscriptionStatus' | 'settings' | 'notificationEmail'>> & { paddleCustomerId?: string | null; stripeCustomerId?: string | null; stripeSubscriptionId?: string | null; subscriptionPeriodEnd?: string | null }): Tenant | null {
    const sets: string[] = [];
    const vals: any[] = [];
    if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
    if (data.plan !== undefined) { sets.push('plan = ?'); vals.push(data.plan); }
    if (data.subscriptionStatus !== undefined) { sets.push('subscription_status = ?'); vals.push(data.subscriptionStatus); }
    if (data.settings !== undefined) { sets.push('settings = ?'); vals.push(JSON.stringify(data.settings)); }
    if (data.notificationEmail !== undefined) { sets.push('notification_email = ?'); vals.push(data.notificationEmail || null); }
    if (data.paddleCustomerId !== undefined) { sets.push('paddle_customer_id = ?'); vals.push(data.paddleCustomerId); }
    if (data.stripeCustomerId !== undefined) { sets.push('stripe_customer_id = ?'); vals.push(data.stripeCustomerId); }
    if (data.stripeSubscriptionId !== undefined) { sets.push('stripe_subscription_id = ?'); vals.push(data.stripeSubscriptionId); }
    if (data.subscriptionPeriodEnd !== undefined) { sets.push('subscription_period_end = ?'); vals.push(data.subscriptionPeriodEnd); }
    if (sets.length === 0) return this.findById(id);
    sets.push('updated_at = ?');
    vals.push(new Date().toISOString());
    vals.push(id);
    this.db.prepare(`UPDATE tenants SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM tenants WHERE id = ?').run(id);
    return result.changes > 0;
  }

  private mapRow(row: any): Tenant {
    return {
      id: row.id, name: row.name, slug: row.slug, ownerId: row.owner_id,
      plan: row.plan, subscriptionStatus: row.subscription_status,
      stripeCustomerId: row.stripe_customer_id, stripeSubscriptionId: row.stripe_subscription_id,
      subscriptionPeriodEnd: row.subscription_period_end || undefined,
      paddleCustomerId: row.paddle_customer_id,
      trialEndsAt: row.trial_ends_at, settings: JSON.parse(row.settings || '{}'),
      parentTenantId: row.parent_tenant_id || undefined,
      customDomain: row.custom_domain || undefined,
      whiteLabelBranding: row.white_label_branding ? JSON.parse(row.white_label_branding) : undefined,
      notificationEmail: row.notification_email || undefined,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

export class ApiKeyRepository {
  constructor(private db: SqlDatabase) {}

  create(tenantId: string, label: string, role: TenantApiKey['role'] = 'end-user'): { key: string; record: TenantApiKey } {
    const id = generateId();
    const now = new Date().toISOString();
    const { raw, prefix, hash, salt } = generateApiKey();
    this.db.prepare(
      'INSERT INTO tenant_api_keys (id, tenant_id, label, key_prefix, key_hash, salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, tenantId, label, prefix, hash, salt, role, now);
    return { key: raw, record: this.findById(id)! };
  }

  findById(id: string): TenantApiKey | null {
    const row = this.db.prepare('SELECT * FROM tenant_api_keys WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findByTenant(tenantId: string): TenantApiKey[] {
    const rows = this.db.prepare('SELECT * FROM tenant_api_keys WHERE tenant_id = ? AND revoked_at IS NULL ORDER BY created_at DESC').all(tenantId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  findByPrefix(prefix: string): TenantApiKey | null {
    const row = this.db.prepare('SELECT * FROM tenant_api_keys WHERE key_prefix = ? AND revoked_at IS NULL').get(prefix) as any;
    return row ? this.mapRow(row) : null;
  }

  updateLastUsed(id: string): void {
    this.db.prepare('UPDATE tenant_api_keys SET last_used_at = ? WHERE id = ?').run(new Date().toISOString(), id);
  }

  revoke(id: string, tenantId?: string): boolean {
    if (tenantId) {
      const result = this.db.prepare('UPDATE tenant_api_keys SET revoked_at = ? WHERE id = ? AND tenant_id = ? AND revoked_at IS NULL')
        .run(new Date().toISOString(), id, tenantId);
      return result.changes > 0;
    }
    const result = this.db.prepare('UPDATE tenant_api_keys SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL')
      .run(new Date().toISOString(), id);
    return result.changes > 0;
  }

  private mapRow(row: any): TenantApiKey {
    return {
      id: row.id, tenantId: row.tenant_id, label: row.label,
      keyPrefix: row.key_prefix, keyHash: row.key_hash, salt: row.salt,
      role: row.role, lastUsedAt: row.last_used_at, expiresAt: row.expires_at,
      createdAt: row.created_at, revokedAt: row.revoked_at,
    };
  }
}

export class ConversationRepository {
  constructor(private db: SqlDatabase) {}

  create(tenantId: string, sessionId: string): Conversation {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO conversations (id, tenant_id, session_id, started_at, status, session_state) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, tenantId, sessionId, now, 'active', 'ai_managed');
    return this.findById(id)!;
  }

  findById(id: string): Conversation | null {
    const row = this.db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findBySession(tenantId: string, sessionId: string): Conversation | null {
    const row = this.db.prepare('SELECT * FROM conversations WHERE tenant_id = ? AND session_id = ?')
      .get(tenantId, sessionId) as any;
    return row ? this.mapRow(row) : null;
  }

  listByTenant(tenantId: string, page = 1, limit = 20, status?: string): { conversations: (Conversation & { lastMessage?: string })[]; total: number } {
    let whereClause = 'WHERE c.tenant_id = ?';
    const params: any[] = [tenantId];
    if (status) {
      whereClause += ' AND c.status = ?';
      params.push(status);
    }
    const total = (this.db.prepare(`SELECT COUNT(*) as c FROM conversations c ${whereClause}`).get(...params) as any).c;
    const rows = this.db.prepare(
      `SELECT c.*, (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.sequence_number DESC LIMIT 1) as last_message FROM conversations c ${whereClause} ORDER BY c.started_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, (page - 1) * limit) as any[];
    return { conversations: rows.map(r => ({ ...this.mapRow(r), lastMessage: r.last_message || undefined })), total };
  }

  endConversation(id: string): Conversation | null {
    this.db.prepare('UPDATE conversations SET ended_at = ?, status = ? WHERE id = ?')
      .run(new Date().toISOString(), 'ended', id);
    return this.findById(id);
  }

  /**
   * Active (non-ended) conversations for the agent inbox, enriched with the
   * last message content and its timestamp for last-activity sorting.
   */
  listActiveByTenant(tenantId: string, limit = 50): (Conversation & { lastMessage?: string; lastActivityAt?: string })[] {
    // NOTE: the ORDER BY repeats the last-message subquery instead of
    // referencing the `last_activity_at` output alias — PostgreSQL cannot
    // resolve an output alias inside an ORDER BY expression (SQLite can), so
    // the alias form would fail on the PG backend.
    const rows = this.db.prepare(
      `SELECT c.*,
        (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.sequence_number DESC LIMIT 1) as last_message,
        (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.sequence_number DESC LIMIT 1) as last_activity_at
       FROM conversations c
       WHERE c.tenant_id = ? AND c.status = 'active'
       ORDER BY COALESCE(
         (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.sequence_number DESC LIMIT 1),
         c.started_at
       ) DESC
       LIMIT ?`
    ).all(tenantId, limit) as any[];
    return rows.map(r => ({ ...this.mapRow(r), lastMessage: r.last_message || undefined, lastActivityAt: r.last_activity_at || undefined }));
  }

  incrementMessageCount(id: string): void {
    this.db.prepare('UPDATE conversations SET message_count = message_count + 1 WHERE id = ?').run(id);
  }

  updateStatus(id: string, status: string): Conversation | null {
    if (status === 'ended' || status === 'escalated') {
      this.db.prepare('UPDATE conversations SET status = ?, ended_at = ? WHERE id = ?')
        .run(status, new Date().toISOString(), id);
    } else {
      this.db.prepare('UPDATE conversations SET status = ? WHERE id = ?').run(status, id);
    }
    return this.findById(id);
  }

  /**
   * Transitions the session state machine for a conversation.
   * 'human_takeover' records the assigned agent + takeover timestamp;
   * any other state clears the assignment and takeover timestamp.
   */
  setSessionState(id: string, state: SessionState, agentId?: string): Conversation | null {
    const now = new Date().toISOString();
    if (state === 'human_takeover') {
      this.db.prepare(
        'UPDATE conversations SET session_state = ?, assigned_agent_id = ?, takeover_at = ? WHERE id = ?'
      ).run(state, agentId || null, now, id);
    } else {
      this.db.prepare(
        'UPDATE conversations SET session_state = ?, assigned_agent_id = NULL, takeover_at = NULL WHERE id = ?'
      ).run(state, id);
    }
    return this.findById(id);
  }

  /**
   * Partial update for session-management fields (flag, archive, tags, notes,
   * agent assignment). Only the provided fields are written.
   */
  updateSessionMeta(
    id: string,
    data: { status?: Conversation['status']; assignedAgentId?: string | null; flagged?: boolean; archived?: boolean; tags?: string[]; notes?: SessionNote[] },
  ): Conversation | null {
    const sets: string[] = ['updated_at = ?'];
    const vals: any[] = [new Date().toISOString()];
    if (data.status !== undefined) {
      sets.push('status = ?');
      vals.push(data.status);
      if (data.status === 'ended') { sets.push('ended_at = ?'); vals.push(new Date().toISOString()); }
    }
    if (data.assignedAgentId !== undefined) { sets.push('assigned_agent_id = ?'); vals.push(data.assignedAgentId); }
    if (data.flagged !== undefined) { sets.push('flagged = ?'); vals.push(data.flagged ? 1 : 0); }
    if (data.archived !== undefined) { sets.push('archived = ?'); vals.push(data.archived ? 1 : 0); }
    if (data.tags !== undefined) { sets.push('tags = ?'); vals.push(JSON.stringify(data.tags)); }
    if (data.notes !== undefined) { sets.push('notes = ?'); vals.push(JSON.stringify(data.notes)); }
    if (sets.length === 1) return this.findById(id);
    vals.push(id);
    this.db.prepare(`UPDATE conversations SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    return this.findById(id);
  }

  countTakeovers(tenantId: string): number {
    return (this.db.prepare(
      "SELECT COUNT(*) as c FROM conversations WHERE tenant_id = ? AND session_state = 'human_takeover'"
    ).get(tenantId) as any)?.c || 0;
  }

  /**
   * Conversations currently held by a specific agent (session_state =
   * 'human_takeover'). Used for seamless handback when the agent disconnects.
   */
  listTakeoversByAgent(tenantId: string, agentId: string): Conversation[] {
    const rows = this.db.prepare(
      "SELECT * FROM conversations WHERE tenant_id = ? AND assigned_agent_id = ? AND session_state = 'human_takeover'"
    ).all(tenantId, agentId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  countActiveUsers(tenantId: string): number {
    return (this.db.prepare(
      'SELECT COUNT(DISTINCT user_id) as c FROM conversations WHERE tenant_id = ? AND user_id IS NOT NULL'
    ).get(tenantId) as any)?.c || 0;
  }

  countByMonth(tenantId: string): Array<{ month: string; count: number }> {
    const rows = this.db.prepare(
      "SELECT substr(started_at, 1, 7) as month, COUNT(*) as count FROM conversations WHERE tenant_id = ? GROUP BY month ORDER BY month"
    ).all(tenantId) as any[];
    return rows.map(r => ({ month: r.month, count: r.count }));
  }

  private mapRow(row: any): Conversation {
    return {
      id: row.id, tenantId: row.tenant_id, sessionId: row.session_id,
      userId: row.user_id, startedAt: row.started_at, endedAt: row.ended_at,
      messageCount: row.message_count, status: row.status,
      sessionState: row.session_state || 'ai_managed',
      assignedAgentId: row.assigned_agent_id || undefined,
      takeoverAt: row.takeover_at || undefined,
      flagged: !!row.flagged,
      archived: !!row.archived,
      tags: row.tags ? JSON.parse(row.tags) : [],
      notes: row.notes ? JSON.parse(row.notes) : [],
    };
  }
}

export class MessageRepository {
  constructor(private db: SqlDatabase) {}

  create(data: { conversationId: string; tenantId: string; role: Message['role']; content: string; sequenceNumber: number; tokenCount?: number; latencyMs?: number; safetyFlags?: string[]; sender?: 'agent' | 'bot' }): Message {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO messages (id, conversation_id, tenant_id, role, content, sequence_number, token_count, latency_ms, safety_flags, sender, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.conversationId, data.tenantId, data.role, data.content, data.sequenceNumber, data.tokenCount || null, data.latencyMs || null, data.safetyFlags ? JSON.stringify(data.safetyFlags) : null, data.sender || null, now);
    return this.findById(id)!;
  }

  findById(id: string): Message | null {
    const row = this.db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  listByConversation(conversationId: string, page = 1, limit = 50): { messages: Message[]; total: number } {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM messages WHERE conversation_id = ?').get(conversationId) as any).c;
    const rows = this.db.prepare(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY sequence_number ASC LIMIT ? OFFSET ?'
    ).all(conversationId, limit, (page - 1) * limit) as any[];
    return { messages: rows.map(r => this.mapRow(r)), total };
  }

  listByTenant(tenantId: string, page = 1, limit = 50): { messages: Message[]; total: number } {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM messages WHERE tenant_id = ?').get(tenantId) as any).c;
    const rows = this.db.prepare(
      'SELECT * FROM messages WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(tenantId, limit, (page - 1) * limit) as any[];
    return { messages: rows.map(r => this.mapRow(r)), total };
  }

  private mapRow(row: any): Message {
    return {
      id: row.id, conversationId: row.conversation_id, tenantId: row.tenant_id,
      role: row.role, content: row.content, sequenceNumber: row.sequence_number,
      tokenCount: row.token_count, latencyMs: row.latency_ms,
      safetyFlags: row.safety_flags ? JSON.parse(row.safety_flags) : undefined,
      sender: row.sender || undefined,
      createdAt: row.created_at,
    };
  }
}

export class UsageRepository {
  constructor(private db: SqlDatabase) {}

  getOrCreate(tenantId: string, period: string): UsageRecord {
    const existing = this.db.prepare('SELECT * FROM usage_records WHERE tenant_id = ? AND period = ?')
      .get(tenantId, period) as any;
    if (existing) return this.mapRow(existing);

    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO usage_records (id, tenant_id, period, recorded_at) VALUES (?, ?, ?, ?)'
    ).run(id, tenantId, period, now);
    return this.findById(id)!;
  }

  findById(id: string): UsageRecord | null {
    const row = this.db.prepare('SELECT * FROM usage_records WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  // FALSE POSITIVE: better-sqlite3 is synchronous; getOrCreate + increment is atomic
  // within a single call. TOCTOU race is theoretical only in multi-process scenarios.
  incrementMessages(tenantId: string, period: string, count = 1): void {
    const usage = this.getOrCreate(tenantId, period);
    this.db.prepare('UPDATE usage_records SET messages_used = messages_used + ? WHERE id = ?')
      .run(count, usage.id);
  }

  incrementTokens(tenantId: string, period: string, count: number): void {
    const usage = this.getOrCreate(tenantId, period);
    this.db.prepare('UPDATE usage_records SET tokens_used = tokens_used + ? WHERE id = ?')
      .run(count, usage.id);
  }

  incrementApiCalls(tenantId: string, period: string, count = 1): void {
    const usage = this.getOrCreate(tenantId, period);
    this.db.prepare('UPDATE usage_records SET api_calls_used = api_calls_used + ? WHERE id = ?')
      .run(count, usage.id);
  }

  getCurrentMonthConversations(tenantId: string): number {
    const month = new Date().toISOString().slice(0, 7);
    return this.countByMonth(tenantId, month);
  }

  /** Conversations started in a specific 'YYYY-MM' period. */
  countByMonth(tenantId: string, month: string): number {
    const row = this.db.prepare(
      "SELECT COUNT(*) as c FROM conversations WHERE tenant_id = ? AND substr(started_at, 1, 7) = ?"
    ).get(tenantId, month) as any;
    return row?.c || 0;
  }

  listByTenant(tenantId: string, page = 1, limit = 12): { records: UsageRecord[]; total: number } {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM usage_records WHERE tenant_id = ?').get(tenantId) as any).c;
    const rows = this.db.prepare(
      'SELECT * FROM usage_records WHERE tenant_id = ? ORDER BY period DESC LIMIT ? OFFSET ?'
    ).all(tenantId, limit, (page - 1) * limit) as any[];
    return { records: rows.map(r => this.mapRow(r)), total };
  }

  private mapRow(row: any): UsageRecord {
    return {
      id: row.id, tenantId: row.tenant_id, period: row.period,
      messagesUsed: row.messages_used, messagesLimit: row.messages_limit,
      tokensUsed: row.tokens_used, tokensLimit: row.tokens_limit,
      storageUsedMb: row.storage_used_mb, storageLimitMb: row.storage_limit_mb,
      apiCallsUsed: row.api_calls_used, apiCallsLimit: row.api_calls_limit,
      recordedAt: row.recorded_at,
    };
  }
}

export class KnowledgeBaseRepository {
  constructor(private db: SqlDatabase) {}

  create(tenantId: string, name: string, description?: string): KnowledgeBase {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO knowledge_bases (id, tenant_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, tenantId, name, description || null, now, now);
    return this.findById(id)!;
  }

  findById(id: string): KnowledgeBase | null {
    const row = this.db.prepare('SELECT * FROM knowledge_bases WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  listByTenant(tenantId: string): KnowledgeBase[] {
    const rows = this.db.prepare('SELECT * FROM knowledge_bases WHERE tenant_id = ? ORDER BY created_at DESC')
      .all(tenantId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM knowledge_bases WHERE id = ?').run(id);
    return result.changes > 0;
  }

  updateStatus(id: string, status: KnowledgeBase['status'], documentCount?: number): void {
    const now = new Date().toISOString();
    if (documentCount !== undefined) {
      this.db.prepare(
        'UPDATE knowledge_bases SET status = ?, document_count = ?, updated_at = ? WHERE id = ?'
      ).run(status, documentCount, now, id);
    } else {
      this.db.prepare(
        'UPDATE knowledge_bases SET status = ?, updated_at = ? WHERE id = ?'
      ).run(status, now, id);
    }
  }

  private mapRow(row: any): KnowledgeBase {
    return {
      id: row.id, tenantId: row.tenant_id, name: row.name, description: row.description,
      status: row.status, documentCount: row.document_count, totalChunks: row.total_chunks,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

export class KbDocumentRepository {
  constructor(private db: SqlDatabase) {}

  create(data: { knowledgeBaseId: string; tenantId: string; filename: string; sourceType: KbDocument['sourceType']; sourceUrl?: string }): KbDocument {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO kb_documents (id, knowledge_base_id, tenant_id, filename, source_type, source_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.knowledgeBaseId, data.tenantId, data.filename, data.sourceType, data.sourceUrl || null, now, now);
    return this.findById(id)!;
  }

  findById(id: string): KbDocument | null {
    const row = this.db.prepare('SELECT * FROM kb_documents WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  listByKnowledgeBase(kbId: string): KbDocument[] {
    const rows = this.db.prepare('SELECT * FROM kb_documents WHERE knowledge_base_id = ? ORDER BY created_at DESC')
      .all(kbId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  findBySourceUrl(tenantId: string, url: string): KbDocument | null {
    const row = this.db.prepare(
      'SELECT * FROM kb_documents WHERE tenant_id = ? AND source_url = ? ORDER BY created_at DESC LIMIT 1'
    ).get(tenantId, url) as any;
    return row ? this.mapRow(row) : null;
  }

  updateChunkCount(id: string, chunkCount: number): void {
    this.db.prepare('UPDATE kb_documents SET chunk_count = ?, status = ?, error = NULL, updated_at = ? WHERE id = ?')
      .run(chunkCount, 'completed', new Date().toISOString(), id);
  }

  updateStatus(id: string, status: KbDocument['status'], error?: string): void {
    this.db.prepare('UPDATE kb_documents SET status = ?, error = ?, updated_at = ? WHERE id = ?')
      .run(status, error || null, new Date().toISOString(), id);
  }

  listByTenant(tenantId: string): KbDocument[] {
    const rows = this.db.prepare(
      'SELECT * FROM kb_documents WHERE tenant_id = ? ORDER BY created_at DESC'
    ).all(tenantId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  countByStatus(tenantId: string): { total: number; published: number; failed: number; processing: number; queued: number; totalChunks: number } {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM kb_documents WHERE tenant_id = ?').get(tenantId) as any).c;
    const published = (this.db.prepare('SELECT COUNT(*) as c FROM kb_documents WHERE tenant_id = ? AND status = ?').get(tenantId, 'published') as any).c;
    const failed = (this.db.prepare('SELECT COUNT(*) as c FROM kb_documents WHERE tenant_id = ? AND status = ?').get(tenantId, 'failed') as any).c;
    const processing = (this.db.prepare('SELECT COUNT(*) as c FROM kb_documents WHERE tenant_id = ? AND status IN (?,?,?,?)').get(tenantId, 'queued', 'processing', 'parsing', 'embedding') as any).c;
    const queued = (this.db.prepare('SELECT COUNT(*) as c FROM kb_documents WHERE tenant_id = ? AND status = ?').get(tenantId, 'queued') as any).c;
    const chunkSum = (this.db.prepare('SELECT COALESCE(SUM(chunk_count), 0) as c FROM kb_documents WHERE tenant_id = ?').get(tenantId) as any).c;
    return { total, published, failed, processing, queued, totalChunks: chunkSum };
  }

  private mapRow(row: any): KbDocument {
    return {
      id: row.id, knowledgeBaseId: row.knowledge_base_id, tenantId: row.tenant_id,
      filename: row.filename, sourceType: row.source_type, sourceUrl: row.source_url,
      status: row.status, chunkCount: row.chunk_count, error: row.error,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

export class OnboardingProgressRepository {
  constructor(private db: SqlDatabase) {}

  get(tenantId: string): OnboardingProgress | null {
    const row = this.db.prepare('SELECT * FROM onboarding_progress WHERE tenant_id = ?').get(tenantId) as any;
    return row ? this.mapRow(row) : null;
  }

  init(tenantId: string): OnboardingProgress {
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO onboarding_progress (tenant_id, completed_steps, skipped_steps, completion_percentage, onboarding_status, started_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING'
    ).run(tenantId, '[]', '[]', 0, 'not_started', now, now);
    return this.get(tenantId)!;
  }

  update(tenantId: string, data: {
    completedSteps?: string[];
    skippedSteps?: string[];
    currentStep?: string | null;
    completionPercentage?: number;
    onboardingStatus?: OnboardingStatus;
    businessType?: string;
    primaryWebsite?: string;
    businessProfile?: Record<string, unknown>;
    demoDataLoaded?: boolean;
    widgetInstalled?: boolean;
    firstSuccessfulConversation?: string;
    completedAt?: string | null;
  }): OnboardingProgress | null {
    const sets: string[] = [];
    const vals: any[] = [];
    if (data.completedSteps !== undefined) { sets.push('completed_steps = ?'); vals.push(JSON.stringify(data.completedSteps)); }
    if (data.skippedSteps !== undefined) { sets.push('skipped_steps = ?'); vals.push(JSON.stringify(data.skippedSteps)); }
    if (data.currentStep !== undefined) { sets.push('current_step = ?'); vals.push(data.currentStep); }
    if (data.completionPercentage !== undefined) { sets.push('completion_percentage = ?'); vals.push(data.completionPercentage); }
    if (data.onboardingStatus !== undefined) { sets.push('onboarding_status = ?'); vals.push(data.onboardingStatus); }
    if (data.businessType !== undefined) { sets.push('business_type = ?'); vals.push(data.businessType); }
    if (data.primaryWebsite !== undefined) { sets.push('primary_website = ?'); vals.push(data.primaryWebsite); }
    if (data.businessProfile !== undefined) { sets.push('business_profile = ?'); vals.push(JSON.stringify(data.businessProfile)); }
    if (data.demoDataLoaded !== undefined) { sets.push('demo_data_loaded = ?'); vals.push(data.demoDataLoaded ? 1 : 0); }
    if (data.widgetInstalled !== undefined) { sets.push('widget_installed = ?'); vals.push(data.widgetInstalled ? 1 : 0); }
    if (data.firstSuccessfulConversation !== undefined) { sets.push('first_successful_conversation = ?'); vals.push(data.firstSuccessfulConversation); }
    if (data.completedAt !== undefined) { sets.push('completed_at = ?'); vals.push(data.completedAt); }
    if (sets.length === 0) return this.get(tenantId);
    sets.push('updated_at = ?');
    vals.push(new Date().toISOString());
    vals.push(tenantId);
    this.db.prepare(`UPDATE onboarding_progress SET ${sets.join(', ')} WHERE tenant_id = ?`).run(...vals);
    return this.get(tenantId);
  }

  markStepComplete(tenantId: string, step: string): OnboardingProgress | null {
    const progress = this.get(tenantId);
    if (!progress) return this.init(tenantId);
    const completed = progress.completedSteps.includes(step) ? progress.completedSteps : [...progress.completedSteps, step];
    const pct = Math.round((completed.length / 7) * 100);
    const status: OnboardingStatus = pct >= 100 ? 'completed' : 'in_progress';
    return this.update(tenantId, { completedSteps: completed, completionPercentage: pct, onboardingStatus: status });
  }

  skipStep(tenantId: string, step: string): OnboardingProgress | null {
    const progress = this.get(tenantId);
    if (!progress) return this.init(tenantId);
    const skipped = progress.skippedSteps.includes(step) ? progress.skippedSteps : [...progress.skippedSteps, step];
    return this.update(tenantId, { skippedSteps: skipped });
  }

  recordFirstConversation(tenantId: string, conversationId: string): OnboardingProgress | null {
    return this.update(tenantId, { firstSuccessfulConversation: conversationId, onboardingStatus: 'completed', completionPercentage: 100 });
  }

  getFirstSuccessDashboard(tenantId: string): {
    knowledgeUploaded: boolean;
    documentsIndexed: number;
    widgetInstalled: boolean;
    conversationsToday: number;
    averageConfidence: number;
    groundedAnswerRate: number;
    firstUnansweredQuestion: string | null;
    completionPercentage: number;
    currentStep: string | null;
    onboardingStatus: string;
  } {
    const progress = this.get(tenantId);
    const docCount = (this.db.prepare('SELECT COUNT(*) as c FROM kb_documents WHERE tenant_id = ? AND status = ?').get(tenantId, 'published') as any)?.c || 0;
    const todayUtc = new Date().toISOString().slice(0, 10);
    const convToday = (this.db.prepare('SELECT COUNT(*) as c FROM conversations WHERE tenant_id = ? AND substr(started_at, 1, 10) = ?').get(tenantId, todayUtc) as any)?.c || 0;
    const avgConf = (this.db.prepare('SELECT COALESCE(AVG(avg_confidence), 0) as c FROM conversation_insights WHERE tenant_id = ?').get(tenantId) as any)?.c || 0;
    const totalAnswers = (this.db.prepare("SELECT COUNT(*) as c FROM messages WHERE tenant_id = ? AND role = 'assistant'").get(tenantId) as any)?.c || 0;
    const groundedAnswers = (this.db.prepare("SELECT COUNT(*) as c FROM messages m WHERE m.tenant_id = ? AND m.role = 'assistant' AND m.safety_flags IS NOT NULL").get(tenantId) as any)?.c || 0;
    const firstUnanswered = this.db.prepare('SELECT question FROM unanswered_questions WHERE tenant_id = ? ORDER BY created_at ASC LIMIT 1').get(tenantId) as any;
    return {
      knowledgeUploaded: docCount > 0,
      documentsIndexed: docCount,
      widgetInstalled: !!progress?.widgetInstalled,
      conversationsToday: convToday,
      averageConfidence: Math.round(avgConf * 100) / 100,
      groundedAnswerRate: totalAnswers > 0 ? Math.round((groundedAnswers / totalAnswers) * 100) : 0,
      firstUnansweredQuestion: firstUnanswered?.question || null,
      completionPercentage: progress?.completionPercentage || 0,
      currentStep: progress?.currentStep || null,
      onboardingStatus: progress?.onboardingStatus || 'not_started',
    };
  }

  getActivationChecklist(tenantId: string): { items: Array<{ id: string; label: string; completed: boolean; order: number }> } {
    const progress = this.get(tenantId);
    const docCount = (this.db.prepare('SELECT COUNT(*) as c FROM kb_documents WHERE tenant_id = ? AND status = ?').get(tenantId, 'published') as any)?.c || 0;
    const convCount = (this.db.prepare('SELECT COUNT(*) as c FROM conversations WHERE tenant_id = ?').get(tenantId) as any)?.c || 0;
    const teamCount = (this.db.prepare('SELECT COUNT(*) as c FROM team_members WHERE tenant_id = ?').get(tenantId) as any)?.c || 0;
    return {
      items: [
        { id: 'upload_docs', label: 'Upload documents', completed: docCount > 0, order: 1 },
        { id: 'publish_ai', label: 'Publish AI', completed: progress?.demoDataLoaded === true || docCount > 0, order: 2 },
        { id: 'install_widget', label: 'Install widget', completed: !!progress?.widgetInstalled, order: 3 },
        { id: 'test_conversation', label: 'Test conversation', completed: convCount > 0, order: 4 },
        { id: 'invite_teammate', label: 'Invite teammate', completed: teamCount > 0, order: 5 },
        { id: 'go_live', label: 'Go live', completed: progress?.onboardingStatus === 'completed', order: 6 },
      ],
    };
  }

  private mapRow(row: any): OnboardingProgress {
    return {
      tenantId: row.tenant_id,
      completedSteps: JSON.parse(row.completed_steps || '[]'),
      skippedSteps: JSON.parse(row.skipped_steps || '[]'),
      currentStep: row.current_step,
      completionPercentage: row.completion_percentage || 0,
      onboardingStatus: row.onboarding_status || 'not_started',
      businessType: row.business_type,
      primaryWebsite: row.primary_website,
      businessProfile: row.business_profile ? JSON.parse(row.business_profile) : undefined,
      demoDataLoaded: !!row.demo_data_loaded,
      widgetInstalled: !!row.widget_installed,
      firstSuccessfulConversation: row.first_successful_conversation,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
    };
  }
}

export class WidgetConfigRepository {
  constructor(private db: SqlDatabase) {}

  get(tenantId: string): WidgetConfig | null {
    const row = this.db.prepare('SELECT * FROM widget_configs WHERE tenant_id = ?').get(tenantId) as any;
    return row ? this.mapRow(row) : null;
  }

  upsert(tenantId: string, data: Partial<Omit<WidgetConfig, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>): WidgetConfig {
    const existing = this.get(tenantId);
    const now = new Date().toISOString();
    if (existing) {
      const sets: string[] = ['updated_at = ?'];
      const vals: any[] = [now];
      for (const [key, value] of Object.entries(data)) {
        const col = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
        sets.push(`${col} = ?`);
        vals.push(typeof value === 'boolean' ? (value ? 1 : 0) : typeof value === 'object' ? JSON.stringify(value) : value);
      }
      vals.push(tenantId);
      this.db.prepare(`UPDATE widget_configs SET ${sets.join(', ')} WHERE tenant_id = ?`).run(...vals);
      return this.get(tenantId)!;
    }
    const id = generateId();
    const cols = ['id', 'tenant_id', 'company_name', 'created_at', 'updated_at'];
    const vals: any[] = [id, tenantId, data.companyName || 'My Company', now, now];
    if (data.theme) { cols.push('theme'); vals.push(data.theme); }
    if (data.position) { cols.push('position'); vals.push(data.position); }
    if (data.primaryColor) { cols.push('primary_color'); vals.push(data.primaryColor); }
    if (data.logoUrl) { cols.push('logo_url'); vals.push(data.logoUrl); }
    if (data.avatarUrl) { cols.push('avatar_url'); vals.push(data.avatarUrl); }
    if (data.greeting) { cols.push('greeting'); vals.push(data.greeting); }
    if (data.launcherText) { cols.push('launcher_text'); vals.push(data.launcherText); }
    if (data.allowedDomains) { cols.push('allowed_domains'); vals.push(JSON.stringify(data.allowedDomains)); }
    if (data.autoOpen !== undefined) { cols.push('auto_open'); vals.push(data.autoOpen ? 1 : 0); }
    if (data.autoOpenDelay) { cols.push('auto_open_delay'); vals.push(data.autoOpenDelay); }
    if (data.businessProfile !== undefined) { cols.push('business_profile'); vals.push(JSON.stringify(data.businessProfile)); }
    if (data.starterOptions !== undefined) { cols.push('starter_options'); vals.push(JSON.stringify(data.starterOptions)); }
    if (data.customCss) { cols.push('custom_css'); vals.push(data.customCss); }
    if (data.notificationEmail) { cols.push('notification_email'); vals.push(data.notificationEmail); }
    if (data.slackWebhookUrl) { cols.push('slack_webhook_url'); vals.push(data.slackWebhookUrl); }
    if (data.notifyThreshold !== undefined) { cols.push('notify_threshold'); vals.push(data.notifyThreshold); }
    this.db.prepare(`INSERT INTO widget_configs (${cols.join(', ')}) VALUES (${vals.map(() => '?').join(', ')})`).run(...vals);
    return this.get(tenantId)!;
  }

  private mapRow(row: any): WidgetConfig {
    return {
      id: row.id, tenantId: row.tenant_id,
      theme: row.theme, position: row.position,
      primaryColor: row.primary_color, logoUrl: row.logo_url,
      avatarUrl: row.avatar_url || undefined,
      companyName: row.company_name, greeting: row.greeting,
      launcherText: row.launcher_text,
      allowedDomains: JSON.parse(row.allowed_domains || '[]'),
      autoOpen: !!row.auto_open, autoOpenDelay: row.auto_open_delay,
      businessProfile: row.business_profile ? JSON.parse(row.business_profile) : undefined,
      starterOptions: row.starter_options ? JSON.parse(row.starter_options) : undefined,
      customCss: row.custom_css,
      notificationEmail: row.notification_email || undefined,
      slackWebhookUrl: row.slack_webhook_url || undefined,
      notifyThreshold: row.notify_threshold || 'all',
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

export class RefreshTokenRepository {
  constructor(private db: SqlDatabase) {}

  create(userId: string, rawToken: string, expiresAt: string): RefreshToken {
    const id = generateId();
    const now = new Date().toISOString();
    const tokenHash = hashToken(rawToken);
    this.db.prepare('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, userId, tokenHash, expiresAt, now);
    return this.findById(id)!;
  }

  findById(id: string): RefreshToken | null {
    const row = this.db.prepare('SELECT * FROM refresh_tokens WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findByTokenHash(tokenHash: string): RefreshToken | null {
    const row = this.db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NULL').get(tokenHash) as any;
    return row ? this.mapRow(row) : null;
  }

  findByUserId(userId: string): RefreshToken[] {
    const rows = this.db.prepare('SELECT * FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC').all(userId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  revoke(id: string): void {
    this.db.prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?').run(new Date().toISOString(), id);
  }

  revokeAllForUser(userId: string): void {
    this.db.prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').run(new Date().toISOString(), userId);
  }

  cleanExpired(): void {
    this.db.prepare('DELETE FROM refresh_tokens WHERE expires_at < ? OR revoked_at IS NOT NULL').run(new Date().toISOString());
  }

  private mapRow(row: any): RefreshToken {
    return {
      id: row.id, userId: row.user_id, tokenHash: row.token_hash,
      expiresAt: row.expires_at, createdAt: row.created_at, revokedAt: row.revoked_at,
    };
  }
}

export class AnalyticsRepository {
  constructor(private db: SqlDatabase) {}

  record(tenantId: string, event: string, properties: Record<string, unknown> = {}): void {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare('INSERT INTO analytics_events (id, tenant_id, event, properties, occurred_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, tenantId, event, JSON.stringify(properties), now);
  }

  query(tenantId: string, event?: string, from?: string, to?: string, page = 1, limit = 50): { events: AnalyticsEvent[]; total: number } {
    const conditions = ['tenant_id = ?'];
    const params: any[] = [tenantId];
    if (event) { conditions.push('event = ?'); params.push(event); }
    if (from) { conditions.push('occurred_at >= ?'); params.push(from); }
    if (to) { conditions.push('occurred_at <= ?'); params.push(to); }
    const where = conditions.join(' AND ');
    const total = (this.db.prepare(`SELECT COUNT(*) as c FROM analytics_events WHERE ${where}`).get(...params) as any).c;
    const rows = this.db.prepare(`SELECT * FROM analytics_events WHERE ${where} ORDER BY occurred_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, (page - 1) * limit) as any[];
    return { events: rows.map(r => this.mapRow(r)), total };
  }

  private mapRow(row: any): AnalyticsEvent {
    return {
      id: row.id, tenantId: row.tenant_id, event: row.event,
      properties: JSON.parse(row.properties || '{}'), occurredAt: row.occurred_at,
    };
  }
}

export class SubscriptionRepository {
  constructor(private db: SqlDatabase) {}

  init(tenantId: string, plan: SubscriptionPlan = 'free'): Subscription {
    const existing = this.findByTenant(tenantId);
    if (existing) return existing;
    const id = generateId();
    const now = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 30 * 86400000).toISOString();
    this.db.prepare(
      'INSERT INTO subscriptions (id, tenant_id, plan, status, current_period_start, current_period_end, trial_start, trial_end, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, tenantId, plan, 'trialing', now, periodEnd, now, periodEnd, now, now);
    return this.findById(id)!;
  }

  findById(id: string): Subscription | null {
    const row = this.db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findByTenant(tenantId: string): Subscription | null {
    const row = this.db.prepare('SELECT * FROM subscriptions WHERE tenant_id = ?').get(tenantId) as any;
    return row ? this.mapRow(row) : null;
  }

  findByStripeSubscriptionId(stripeSubscriptionId: string): Subscription | null {
    const row = this.db.prepare('SELECT * FROM subscriptions WHERE stripe_subscription_id = ?').get(stripeSubscriptionId) as any;
    return row ? this.mapRow(row) : null;
  }

  findByStripeCustomerId(stripeCustomerId: string): Subscription | null {
    const row = this.db.prepare('SELECT * FROM subscriptions WHERE stripe_customer_id = ?').get(stripeCustomerId) as any;
    return row ? this.mapRow(row) : null;
  }

  findByPaddleSubscriptionId(paddleSubscriptionId: string): Subscription | null {
    const row = this.db.prepare('SELECT * FROM subscriptions WHERE paddle_subscription_id = ?').get(paddleSubscriptionId) as any;
    return row ? this.mapRow(row) : null;
  }

  findByPaddleCustomerId(paddleCustomerId: string): Subscription | null {
    const row = this.db.prepare('SELECT * FROM subscriptions WHERE paddle_customer_id = ?').get(paddleCustomerId) as any;
    return row ? this.mapRow(row) : null;
  }

  update(tenantId: string, data: Partial<Subscription>): Subscription | null {
    const sets: string[] = ['updated_at = ?'];
    const vals: any[] = [new Date().toISOString()];
    if (data.plan) { sets.push('plan = ?'); vals.push(data.plan); }
    if (data.status) { sets.push('status = ?'); vals.push(data.status); }
    if (data.stripeCustomerId) { sets.push('stripe_customer_id = ?'); vals.push(data.stripeCustomerId); }
    if (data.stripeSubscriptionId) { sets.push('stripe_subscription_id = ?'); vals.push(data.stripeSubscriptionId); }
    if (data.paddleCustomerId) { sets.push('paddle_customer_id = ?'); vals.push(data.paddleCustomerId); }
    if (data.paddleSubscriptionId) { sets.push('paddle_subscription_id = ?'); vals.push(data.paddleSubscriptionId); }
    if (data.paddlePriceId) { sets.push('paddle_price_id = ?'); vals.push(data.paddlePriceId); }
    if (data.paddleProductId) { sets.push('paddle_product_id = ?'); vals.push(data.paddleProductId); }
    if (data.scheduledChangeAction !== undefined) { sets.push('scheduled_change_action = ?'); vals.push(data.scheduledChangeAction); }
    if (data.scheduledChangeAt !== undefined) { sets.push('scheduled_change_at = ?'); vals.push(data.scheduledChangeAt); }
    if (data.stripePriceId) { sets.push('stripe_price_id = ?'); vals.push(data.stripePriceId); }
    if (data.currentPeriodStart) { sets.push('current_period_start = ?'); vals.push(data.currentPeriodStart); }
    if (data.currentPeriodEnd) { sets.push('current_period_end = ?'); vals.push(data.currentPeriodEnd); }
    if (data.trialEnd) { sets.push('trial_end = ?'); vals.push(data.trialEnd); }
    if (data.cancelledAt !== undefined) { sets.push('cancelled_at = ?'); vals.push(data.cancelledAt); }
    vals.push(tenantId);
    this.db.prepare(`UPDATE subscriptions SET ${sets.join(', ')} WHERE tenant_id = ?`).run(...vals);
    return this.findByTenant(tenantId);
  }

  list(page = 1, limit = 20): { subscriptions: Subscription[]; total: number } {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM subscriptions').get() as any).c;
    const rows = this.db.prepare('SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(limit, (page - 1) * limit) as any[];
    return { subscriptions: rows.map(r => this.mapRow(r)), total };
  }

  private mapRow(row: any): Subscription {
    return {
      id: row.id, tenantId: row.tenant_id, plan: row.plan, status: row.status,
      stripeCustomerId: row.stripe_customer_id, stripeSubscriptionId: row.stripe_subscription_id,
      paddleCustomerId: row.paddle_customer_id, paddleSubscriptionId: row.paddle_subscription_id,
      paddlePriceId: row.paddle_price_id, paddleProductId: row.paddle_product_id,
      scheduledChangeAction: row.scheduled_change_action, scheduledChangeAt: row.scheduled_change_at,
      stripePriceId: row.stripe_price_id,
      currentPeriodStart: row.current_period_start, currentPeriodEnd: row.current_period_end,
      trialStart: row.trial_start, trialEnd: row.trial_end, cancelledAt: row.cancelled_at,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

/**
 * Maps Paddle customer records to workspaces (upsert by Paddle customer id).
 * Used by the Paddle webhook fulfillment layer to resolve tenants.
 */
export class PaddleCustomerRepository {
  constructor(private db: SqlDatabase) {}

  upsert(data: { customerId: string; tenantId: string; email: string; name?: string }): PaddleCustomer {
    const now = new Date().toISOString();
    this.db.prepare(
      `INSERT INTO customers (customer_id, tenant_id, email, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(customer_id) DO UPDATE SET
         tenant_id = excluded.tenant_id,
         email = excluded.email,
         name = excluded.name,
         updated_at = excluded.updated_at`
    ).run(data.customerId, data.tenantId, data.email, data.name || null, now, now);
    return this.findById(data.customerId)!;
  }

  findById(customerId: string): PaddleCustomer | null {
    const row = this.db.prepare('SELECT * FROM customers WHERE customer_id = ?').get(customerId) as any;
    return row ? this.mapRow(row) : null;
  }

  findByTenant(tenantId: string): PaddleCustomer | null {
    const row = this.db.prepare('SELECT * FROM customers WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1').get(tenantId) as any;
    return row ? this.mapRow(row) : null;
  }

  listByTenant(tenantId: string): PaddleCustomer[] {
    const rows = this.db.prepare('SELECT * FROM customers WHERE tenant_id = ? ORDER BY created_at DESC').all(tenantId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  private mapRow(row: any): PaddleCustomer {
    return {
      customerId: row.customer_id,
      tenantId: row.tenant_id,
      email: row.email,
      name: row.name || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class InvoiceRepository {
  constructor(private db: SqlDatabase) {}

  findById(id: string): Invoice | null {
    const row = this.db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findByTenant(tenantId: string, page = 1, limit = 20): { invoices: Invoice[]; total: number } {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM invoices WHERE tenant_id = ?').get(tenantId) as any).c;
    const rows = this.db.prepare('SELECT * FROM invoices WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(tenantId, limit, (page - 1) * limit) as any[];
    return { invoices: rows.map(r => this.mapRow(r)), total };
  }

  findByPaddleInvoiceId(paddleInvoiceId: string): Invoice | null {
    const row = this.db.prepare('SELECT * FROM invoices WHERE paddle_invoice_id = ?').get(paddleInvoiceId) as any;
    return row ? this.mapRow(row) : null;
  }

  upsert(data: { tenantId: string; paddleInvoiceId: string; subscriptionId: string; status: string; amount: number; currency: string; paidAt?: string; dueAt?: string; periodStart: string; periodEnd: string }): Invoice {
    const existing = this.findByPaddleInvoiceId(data.paddleInvoiceId);
    const now = new Date().toISOString();
    if (existing) {
      this.db.prepare(
        'UPDATE invoices SET status = ?, paid_at = ?, due_at = ?, updated_at = ? WHERE id = ?'
      ).run(data.status, data.paidAt || null, data.dueAt || null, now, existing.id);
      return this.findById(existing.id)!;
    }
    const id = generateId();
    this.db.prepare(
      'INSERT INTO invoices (id, tenant_id, paddle_invoice_id, subscription_id, status, amount, currency, paid_at, due_at, period_start, period_end, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.tenantId, data.paddleInvoiceId, data.subscriptionId, data.status, data.amount, data.currency, data.paidAt || null, data.dueAt || null, data.periodStart, data.periodEnd, now, now);
    return this.findById(id)!;
  }

  private mapRow(row: any): Invoice {
    return {
      id: row.id, tenantId: row.tenant_id, paddleInvoiceId: row.paddle_invoice_id,
      subscriptionId: row.subscription_id, status: row.status, amount: row.amount,
      currency: row.currency, paidAt: row.paid_at, dueAt: row.due_at,
      periodStart: row.period_start, periodEnd: row.period_end,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

export class PaymentRepository {
  constructor(private db: SqlDatabase) {}

  findById(id: string): Payment | null {
    const row = this.db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findByTenant(tenantId: string, page = 1, limit = 20): { payments: Payment[]; total: number } {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM payments WHERE tenant_id = ?').get(tenantId) as any).c;
    const rows = this.db.prepare('SELECT * FROM payments WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(tenantId, limit, (page - 1) * limit) as any[];
    return { payments: rows.map(r => this.mapRow(r)), total };
  }

  findByPaddlePaymentId(paddlePaymentId: string): Payment | null {
    const row = this.db.prepare('SELECT * FROM payments WHERE paddle_payment_id = ?').get(paddlePaymentId) as any;
    return row ? this.mapRow(row) : null;
  }

  create(data: { tenantId: string; paddlePaymentId: string; invoiceId: string; amount: number; currency: string; status: string; method?: string; paidAt?: string }): Payment {
    const existing = this.findByPaddlePaymentId(data.paddlePaymentId);
    if (existing) return existing;
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO payments (id, tenant_id, paddle_payment_id, invoice_id, amount, currency, status, method, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.tenantId, data.paddlePaymentId, data.invoiceId, data.amount, data.currency, data.status, data.method || null, data.paidAt || null, now);
    return this.findById(id)!;
  }

  private mapRow(row: any): Payment {
    return {
      id: row.id, tenantId: row.tenant_id, paddlePaymentId: row.paddle_payment_id,
      invoiceId: row.invoice_id, amount: row.amount, currency: row.currency,
      status: row.status, method: row.method, paidAt: row.paid_at,
      createdAt: row.created_at,
    };
  }
}

export class BillingEventRepository {
  constructor(private db: SqlDatabase) {}

  findByPaddleEventId(paddleEventId: string): BillingEvent | null {
    const row = this.db.prepare('SELECT * FROM billing_events WHERE paddle_event_id = ?').get(paddleEventId) as any;
    return row ? this.mapRow(row) : null;
  }

  create(data: { tenantId?: string; paddleEventId: string; eventType: string; status: string; payload: string }): BillingEvent {
    const existing = this.findByPaddleEventId(data.paddleEventId);
    if (existing) return existing;
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO billing_events (id, tenant_id, paddle_event_id, event_type, status, payload, processed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.tenantId || null, data.paddleEventId, data.eventType, data.status, data.payload, now, now);
    return this.findById(id)!;
  }

  findById(id: string): BillingEvent | null {
    const row = this.db.prepare('SELECT * FROM billing_events WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  listByTenant(tenantId: string, page = 1, limit = 20): { events: BillingEvent[]; total: number } {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM billing_events WHERE tenant_id = ?').get(tenantId) as any).c;
    const rows = this.db.prepare('SELECT * FROM billing_events WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(tenantId, limit, (page - 1) * limit) as any[];
    return { events: rows.map(r => this.mapRow(r)), total };
  }

  private mapRow(row: any): BillingEvent {
    return {
      id: row.id, tenantId: row.tenant_id, paddleEventId: row.paddle_event_id,
      eventType: row.event_type, status: row.status, payload: row.payload,
      processedAt: row.processed_at, createdAt: row.created_at,
    };
  }
}

export class UnansweredQuestionRepository {
  constructor(private db: SqlDatabase) {}

  create(data: { tenantId: string; conversationId: string; question: string; confidence: number; retrievalStatus?: string; escalationStatus?: string; clusterId?: string }): UnansweredQuestion {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO unanswered_questions (id, tenant_id, conversation_id, question, confidence, retrieval_status, escalation_status, cluster_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.tenantId, data.conversationId, data.question, data.confidence, data.retrievalStatus || 'unanswered', data.escalationStatus || 'none', data.clusterId || null, now);
    return this.findById(id)!;
  }

  findById(id: string): UnansweredQuestion | null {
    const row = this.db.prepare('SELECT * FROM unanswered_questions WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  listByTenant(tenantId: string, filter?: { period?: 'today' | 'week' | 'month'; resolved?: boolean }): UnansweredQuestion[] {
    const conditions = ['tenant_id = ?'];
    const params: any[] = [tenantId];
    if (filter?.resolved !== undefined) {
      if (filter.resolved) { conditions.push('resolved_at IS NOT NULL'); }
      else { conditions.push('resolved_at IS NULL'); }
    }
    const dayUtc = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
    if (filter?.period === 'today') { conditions.push('created_at >= ?'); params.push(dayUtc(0)); }
    else if (filter?.period === 'week') { conditions.push('created_at >= ?'); params.push(dayUtc(7)); }
    else if (filter?.period === 'month') { conditions.push('created_at >= ?'); params.push(dayUtc(30)); }
    const rows = this.db.prepare(`SELECT * FROM unanswered_questions WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`).all(...params) as any[];
    return rows.map(r => this.mapRow(r));
  }

  resolve(id: string): void {
    this.db.prepare('UPDATE unanswered_questions SET resolved_at = ?, escalation_status = ? WHERE id = ?')
      .run(new Date().toISOString(), 'resolved', id);
  }

  getStats(tenantId: string, period?: 'today' | 'week' | 'month'): UnansweredQuestionStats {
    const dayUtc = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
    const startParam = period === 'today' ? dayUtc(0) : period === 'week' ? dayUtc(7) : period === 'month' ? dayUtc(30) : null;
    const dateFilter = startParam ? 'AND q.created_at >= ?' : '';
    const dateParams = startParam ? [startParam] : [];

    const totalRow = this.db.prepare(`SELECT COUNT(*) as c FROM unanswered_questions q WHERE tenant_id = ? ${dateFilter}`).get(tenantId, ...dateParams) as any;
    const resolvedRow = this.db.prepare(`SELECT COUNT(*) as c FROM unanswered_questions q WHERE tenant_id = ? AND resolved_at IS NOT NULL ${dateFilter}`).get(tenantId, ...dateParams) as any;
    const avgRow = this.db.prepare(`SELECT COALESCE(AVG(confidence), 0) as c FROM unanswered_questions q WHERE tenant_id = ? ${dateFilter}`).get(tenantId, ...dateParams) as any;

    const topTopic = this.db.prepare(`SELECT c.topic FROM unanswered_question_clusters c WHERE c.tenant_id = ? ORDER BY c.occurrence_count DESC LIMIT 1`).get(tenantId) as any;

    const trendRows = this.db.prepare(`SELECT substr(created_at, 1, 10) as date, COUNT(*) as count FROM unanswered_questions q WHERE tenant_id = ? ${dateFilter} GROUP BY substr(created_at, 1, 10) ORDER BY date ASC LIMIT 30`).all(tenantId, ...dateParams) as any[];

    const total = totalRow?.c || 0;
    return {
      totalUnanswered: total,
      mostRequestedTopic: topTopic?.topic || null,
      resolutionRate: total > 0 ? ((resolvedRow?.c || 0) / total) * 100 : 0,
      avgConfidence: avgRow?.c || 0,
      topMissingDocuments: [],
      trend: trendRows.map(r => ({ date: r.date, count: r.count })),
    };
  }

  private mapRow(row: any): UnansweredQuestion {
    return {
      id: row.id, tenantId: row.tenant_id, conversationId: row.conversation_id,
      question: row.question, confidence: row.confidence,
      retrievalStatus: row.retrieval_status, escalationStatus: row.escalation_status,
      resolvedAt: row.resolved_at, clusterId: row.cluster_id, createdAt: row.created_at,
    };
  }
}

export class UnansweredQuestionClusterRepository {
  constructor(private db: SqlDatabase) {}

  findOrCreate(tenantId: string, topic: string, questionPattern: string, confidence: number): UnansweredQuestionCluster {
    const existing = this.db.prepare('SELECT * FROM unanswered_question_clusters WHERE tenant_id = ? AND topic = ?').get(tenantId, topic) as any;
    const now = new Date().toISOString();
    if (existing) {
      this.db.prepare('UPDATE unanswered_question_clusters SET occurrence_count = occurrence_count + 1, avg_confidence = (avg_confidence + ?) / 2, last_occurrence_at = ? WHERE id = ?').run(confidence, now, existing.id);
      return this.findById(existing.id)!;
    }
    const id = generateId();
    this.db.prepare(
      'INSERT INTO unanswered_question_clusters (id, tenant_id, topic, question_pattern, occurrence_count, avg_confidence, last_occurrence_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, tenantId, topic, questionPattern, 1, confidence, now, now);
    return this.findById(id)!;
  }

  findById(id: string): UnansweredQuestionCluster | null {
    const row = this.db.prepare('SELECT * FROM unanswered_question_clusters WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  listByTenant(tenantId: string): UnansweredQuestionCluster[] {
    const rows = this.db.prepare('SELECT * FROM unanswered_question_clusters WHERE tenant_id = ? ORDER BY occurrence_count DESC').all(tenantId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  private mapRow(row: any): UnansweredQuestionCluster {
    return {
      id: row.id, tenantId: row.tenant_id, topic: row.topic,
      questionPattern: row.question_pattern, occurrenceCount: row.occurrence_count,
      avgConfidence: row.avg_confidence, resolutionCount: row.resolution_count,
      lastOccurrenceAt: row.last_occurrence_at, createdAt: row.created_at,
    };
  }
}

export class KnowledgeSuggestionRepository {
  constructor(private db: SqlDatabase) {}

  create(data: { tenantId: string; clusterId?: string; suggestionType: string; title: string; description?: string; impactScore: number }): KnowledgeSuggestion {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO knowledge_suggestions (id, tenant_id, cluster_id, suggestion_type, title, description, impact_score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.tenantId, data.clusterId || null, data.suggestionType, data.title, data.description || null, data.impactScore, now);
    return this.findById(id)!;
  }

  findById(id: string): KnowledgeSuggestion | null {
    const row = this.db.prepare('SELECT * FROM knowledge_suggestions WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  listByTenant(tenantId: string, status?: string): KnowledgeSuggestion[] {
    const conditions = ['tenant_id = ?'];
    const params: any[] = [tenantId];
    if (status) { conditions.push('status = ?'); params.push(status); }
    const rows = this.db.prepare(`SELECT * FROM knowledge_suggestions WHERE ${conditions.join(' AND ')} ORDER BY impact_score DESC`).all(...params) as any[];
    return rows.map(r => this.mapRow(r));
  }

  dismiss(id: string): void {
    this.db.prepare('UPDATE knowledge_suggestions SET status = ? WHERE id = ?').run('dismissed', id);
  }

  apply(id: string): void {
    this.db.prepare('UPDATE knowledge_suggestions SET status = ? WHERE id = ?').run('applied', id);
  }

  generateFromClusters(tenantId: string): KnowledgeSuggestion[] {
    const clusters = this.db.prepare('SELECT * FROM unanswered_question_clusters WHERE tenant_id = ? ORDER BY occurrence_count DESC').all(tenantId) as any[];
    const suggestions: KnowledgeSuggestion[] = [];
    for (const cluster of clusters) {
      const title = `Add documentation for "${cluster.topic}"`;
      const desc = `Customers have asked about "${cluster.topic}" ${cluster.occurrence_count} time(s). Consider adding knowledge base content.`;
      suggestions.push(this.create({
        tenantId, clusterId: cluster.id,
        suggestionType: cluster.topic.includes('pricing') || cluster.topic.includes('cost') ? 'update_faq' : 'add_document',
        title, description: desc, impactScore: cluster.occurrence_count * (1 - cluster.avg_confidence),
      }));
    }
    return suggestions;
  }

  private mapRow(row: any): KnowledgeSuggestion {
    return {
      id: row.id, tenantId: row.tenant_id, clusterId: row.cluster_id,
      suggestionType: row.suggestion_type, title: row.title,
      description: row.description, impactScore: row.impact_score,
      status: row.status, occurrenceCount: row.occurrence_count,
      createdAt: row.created_at,
    };
  }
}

export class CitationAnalyticsRepository {
  constructor(private db: SqlDatabase) {}

  recordCitation(tenantId: string, documentId: string, confidence: number): void {
    const existing = this.db.prepare('SELECT * FROM citation_analytics WHERE tenant_id = ? AND document_id = ?').get(tenantId, documentId) as any;
    const now = new Date().toISOString();
    if (existing) {
      this.db.prepare('UPDATE citation_analytics SET total_citations = total_citations + 1, avg_confidence = (avg_confidence + ?) / 2, last_cited_at = ? WHERE id = ?').run(confidence, now, existing.id);
    } else {
      const id = generateId();
      this.db.prepare('INSERT INTO citation_analytics (id, tenant_id, document_id, total_citations, unique_conversations, avg_confidence, last_cited_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, tenantId, documentId, 1, 1, confidence, now, now);
    }
  }

  getOverview(tenantId: string): { totalCitations: number; avgConfidence: number; topDocuments: any[]; unusedDocuments: any[] } {
    const totalRow = this.db.prepare('SELECT COALESCE(SUM(total_citations), 0) as c FROM citation_analytics WHERE tenant_id = ?').get(tenantId) as any;
    const avgRow = this.db.prepare('SELECT COALESCE(AVG(avg_confidence), 0) as c FROM citation_analytics WHERE tenant_id = ?').get(tenantId) as any;
    const topDocs = this.db.prepare('SELECT c.*, d.filename FROM citation_analytics c LEFT JOIN kb_documents d ON d.id = c.document_id WHERE c.tenant_id = ? ORDER BY c.total_citations DESC LIMIT 10').all(tenantId) as any[];
    const unusedDocs = this.db.prepare('SELECT d.id, d.filename FROM kb_documents d WHERE d.tenant_id = ? AND d.id NOT IN (SELECT document_id FROM citation_analytics WHERE tenant_id = ?)').all(tenantId, tenantId) as any[];
    return {
      totalCitations: totalRow?.c || 0,
      avgConfidence: avgRow?.c || 0,
      topDocuments: topDocs.map(r => ({ id: r.id, filename: r.filename, citations: r.total_citations, avgConfidence: r.avg_confidence })),
      unusedDocuments: unusedDocs.map(r => ({ id: r.id, filename: r.filename })),
    };
  }

  getConfidenceDistribution(tenantId: string): { range: string; count: number }[] {
    const rows = this.db.prepare(`
      SELECT CASE WHEN confidence < 0.3 THEN 'low' WHEN confidence < 0.7 THEN 'medium' ELSE 'high' END as range, COUNT(*) as count
      FROM messages WHERE tenant_id = ? AND role = 'assistant' GROUP BY range
    `).all(tenantId) as any[];
    return rows.map(r => ({ range: r.range, count: r.count }));
  }
}

export class ConversationInsightsRepository {
  constructor(private db: SqlDatabase) {}

  upsertDaily(tenantId: string, date: string, data: Partial<ConversationInsights>): void {
    const existing = this.db.prepare('SELECT * FROM conversation_insights WHERE tenant_id = ? AND date = ?').get(tenantId, date) as any;
    const now = new Date().toISOString();
    if (existing) {
      const sets: string[] = [];
      const vals: any[] = [];
      if (data.totalConversations !== undefined) { sets.push('total_conversations = ?'); vals.push(data.totalConversations); }
      if (data.totalMessages !== undefined) { sets.push('total_messages = ?'); vals.push(data.totalMessages); }
      if (data.aiResponses !== undefined) { sets.push('ai_responses = ?'); vals.push(data.aiResponses); }
      if (data.humanEscalations !== undefined) { sets.push('human_escalations = ?'); vals.push(data.humanEscalations); }
      if (data.containmentRate !== undefined) { sets.push('containment_rate = ?'); vals.push(data.containmentRate); }
      if (data.avgConfidence !== undefined) { sets.push('avg_confidence = ?'); vals.push(data.avgConfidence); }
      if (data.avgConversationLength !== undefined) { sets.push('avg_conversation_length = ?'); vals.push(data.avgConversationLength); }
      if (data.avgSentiment !== undefined) { sets.push('avg_sentiment = ?'); vals.push(data.avgSentiment); }
      if (data.topIntents !== undefined) { sets.push('top_intents = ?'); vals.push(JSON.stringify(data.topIntents)); }
      if (sets.length === 0) return;
      sets.push('created_at = ?');
      vals.push(now);
      vals.push(existing.id);
      this.db.prepare(`UPDATE conversation_insights SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    } else {
      const id = generateId();
      this.db.prepare(
        'INSERT INTO conversation_insights (id, tenant_id, date, total_conversations, total_messages, ai_responses, human_escalations, containment_rate, avg_confidence, avg_conversation_length, avg_sentiment, top_intents, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(id, tenantId, date, data.totalConversations || 0, data.totalMessages || 0, data.aiResponses || 0, data.humanEscalations || 0, data.containmentRate || 0, data.avgConfidence || 0, data.avgConversationLength || 0, data.avgSentiment || 0, JSON.stringify(data.topIntents || []), now);
    }
  }

  getOverview(tenantId: string, days = 30): ConversationInsights | { totalConversations: number; totalMessages: number; aiResponses: number; humanEscalations: number; containmentRate: number; avgConfidence: number; avgConversationLength: number; } {
    const rows = this.db.prepare('SELECT * FROM conversation_insights WHERE tenant_id = ? ORDER BY date DESC LIMIT ?').all(tenantId, days) as any[];
    if (rows.length === 0) {
      return { totalConversations: 0, totalMessages: 0, aiResponses: 0, humanEscalations: 0, containmentRate: 0, avgConfidence: 0, avgConversationLength: 0 };
    }
    const result: any = { totalConversations: 0, totalMessages: 0, aiResponses: 0, humanEscalations: 0, containmentRate: 0, avgConfidence: 0, avgConversationLength: 0 };
    for (const r of rows) {
      result.totalConversations += r.total_conversations;
      result.totalMessages += r.total_messages;
      result.aiResponses += r.ai_responses;
      result.humanEscalations += r.human_escalations;
      result.avgConfidence += r.avg_confidence;
      result.avgConversationLength += r.avg_conversation_length;
    }
    result.containmentRate = result.totalConversations > 0 ? ((result.totalConversations - result.humanEscalations) / result.totalConversations) * 100 : 0;
    result.avgConfidence = rows.length > 0 ? result.avgConfidence / rows.length : 0;
    result.avgConversationLength = rows.length > 0 ? result.avgConversationLength / rows.length : 0;
    return result;
  }

  getTrend(tenantId: string, days = 30): ConversationInsights[] {
    const rows = this.db.prepare('SELECT * FROM conversation_insights WHERE tenant_id = ? ORDER BY date ASC LIMIT ?').all(tenantId, days) as any[];
    return rows.map(r => ({
      id: r.id, tenantId: r.tenant_id, date: r.date,
      totalConversations: r.total_conversations, totalMessages: r.total_messages,
      aiResponses: r.ai_responses, humanEscalations: r.human_escalations,
      containmentRate: r.containment_rate, avgConfidence: r.avg_confidence,
      avgConversationLength: r.avg_conversation_length, avgSentiment: r.avg_sentiment,
      topIntents: JSON.parse(r.top_intents || '[]'), createdAt: r.created_at,
    }));
  }
}

export class TeamMemberRepository {
  constructor(private db: SqlDatabase) {}

  add(tenantId: string, userId: string, email: string, name: string, role: TeamRole, invitedBy: string): TeamMember {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO team_members (id, tenant_id, user_id, email, name, role, invited_by, joined_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, tenantId, userId, email, name, role, invitedBy, now, now, now);
    return this.findById(id)!;
  }

  findById(id: string): TeamMember | null {
    const row = this.db.prepare('SELECT * FROM team_members WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findByTenant(tenantId: string): TeamMember[] {
    const rows = this.db.prepare('SELECT * FROM team_members WHERE tenant_id = ? ORDER BY created_at ASC').all(tenantId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  findByUser(userId: string): TeamMember[] {
    const rows = this.db.prepare('SELECT * FROM team_members WHERE user_id = ?').all(userId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  findByTenantAndUser(tenantId: string, userId: string): TeamMember | null {
    const row = this.db.prepare('SELECT * FROM team_members WHERE tenant_id = ? AND user_id = ?').get(tenantId, userId) as any;
    return row ? this.mapRow(row) : null;
  }

  updateRole(id: string, role: TeamRole): TeamMember | null {
    this.db.prepare('UPDATE team_members SET role = ?, updated_at = ? WHERE id = ?').run(role, new Date().toISOString(), id);
    return this.findById(id);
  }

  remove(id: string, tenantId: string): boolean {
    const result = this.db.prepare('DELETE FROM team_members WHERE id = ? AND tenant_id = ?').run(id, tenantId);
    return result.changes > 0;
  }

  transferOwnership(tenantId: string, newOwnerUserId: string, newOwnerEmail: string, newOwnerName: string): TeamMember | null {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE team_members SET role = ?, updated_at = ? WHERE tenant_id = ? AND role = ?').run('admin', now, tenantId, 'owner');
    this.db.prepare('UPDATE team_members SET role = ?, updated_at = ?, joined_at = ? WHERE tenant_id = ? AND user_id = ?')
      .run('owner', now, now, tenantId, newOwnerUserId);
    return this.findByTenantAndUser(tenantId, newOwnerUserId);
  }

  countByTenant(tenantId: string): number {
    const row = this.db.prepare('SELECT COUNT(*) as c FROM team_members WHERE tenant_id = ?').get(tenantId) as any;
    return row?.c || 0;
  }

  private mapRow(row: any): TeamMember {
    return {
      id: row.id, tenantId: row.tenant_id, userId: row.user_id, email: row.email, name: row.name,
      role: row.role, invitedBy: row.invited_by, joinedAt: row.joined_at,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

export class InvitationRepository {
  constructor(private db: SqlDatabase) {}

  create(tenantId: string, email: string, role: TeamRole, invitedBy: string, invitedByName: string, token: string, expiresAt: string): Invitation {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO invitations (id, tenant_id, email, role, token, invited_by, invited_by_name, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, tenantId, email, role, token, invitedBy, invitedByName, expiresAt, now, now);
    return this.findById(id)!;
  }

  findById(id: string): Invitation | null {
    const row = this.db.prepare('SELECT * FROM invitations WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findByToken(token: string): Invitation | null {
    const row = this.db.prepare('SELECT * FROM invitations WHERE token = ?').get(token) as any;
    return row ? this.mapRow(row) : null;
  }

  listByTenant(tenantId: string, status?: string): Invitation[] {
    if (status) {
      const rows = this.db.prepare('SELECT * FROM invitations WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC').all(tenantId, status) as any[];
      return rows.map(r => this.mapRow(r));
    }
    const rows = this.db.prepare('SELECT * FROM invitations WHERE tenant_id = ? ORDER BY created_at DESC').all(tenantId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  accept(id: string): void {
    this.db.prepare('UPDATE invitations SET status = ?, updated_at = ? WHERE id = ?').run('accepted', new Date().toISOString(), id);
  }

  cancel(id: string, tenantId: string): boolean {
    const result = this.db.prepare('UPDATE invitations SET status = ?, updated_at = ? WHERE id = ? AND tenant_id = ?').run('cancelled', new Date().toISOString(), id, tenantId);
    return result.changes > 0;
  }

  expirePending(): number {
    const result = this.db.prepare("UPDATE invitations SET status = ?, updated_at = ? WHERE status = 'pending' AND expires_at < ?")
      .run('expired', new Date().toISOString(), new Date().toISOString());
    return result.changes;
  }

  private mapRow(row: any): Invitation {
    return {
      id: row.id, tenantId: row.tenant_id, email: row.email, role: row.role,
      token: row.token, invitedBy: row.invited_by, invitedByName: row.invited_by_name,
      status: row.status, expiresAt: row.expires_at, createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

export class ActivityRepository {
  constructor(private db: SqlDatabase) {}

  record(tenantId: string, userId: string, userName: string, action: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}): ActivityEvent {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO activity_history (id, tenant_id, user_id, user_name, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, tenantId, userId, userName, action, entityType, entityId || null, JSON.stringify(metadata), now);
    return this.findById(id)!;
  }

  findById(id: string): ActivityEvent | null {
    const row = this.db.prepare('SELECT * FROM activity_history WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  listByTenant(tenantId: string, page = 1, limit = 20): { events: ActivityEvent[]; total: number } {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM activity_history WHERE tenant_id = ?').get(tenantId) as any).c;
    const rows = this.db.prepare('SELECT * FROM activity_history WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(tenantId, limit, (page - 1) * limit) as any[];
    return { events: rows.map(r => this.mapRow(r)), total };
  }

  private mapRow(row: any): ActivityEvent {
    return {
      id: row.id, tenantId: row.tenant_id, userId: row.user_id, userName: row.user_name,
      action: row.action, entityType: row.entity_type, entityId: row.entity_id,
      metadata: JSON.parse(row.metadata || '{}'), createdAt: row.created_at,
    };
  }
}

export class AuditLogRepository {
  constructor(private db: SqlDatabase) {}

  record(tenantId: string, data: { userId?: string; userName?: string; eventType: string; resourceType: string; resourceId?: string; details?: string; ipAddress?: string; userAgent?: string }): AuditLogEntry {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO audit_logs (id, tenant_id, user_id, user_name, event_type, resource_type, resource_id, details, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, tenantId, data.userId || null, data.userName || null, data.eventType, data.resourceType, data.resourceId || null, data.details || '', data.ipAddress || null, data.userAgent || null, now);
    return this.findById(id)!;
  }

  findById(id: string): AuditLogEntry | null {
    const row = this.db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  listByTenant(tenantId: string, filter?: { eventType?: string; resourceType?: string; from?: string; to?: string; search?: string }, page = 1, limit = 50): { entries: AuditLogEntry[]; total: number } {
    const conditions = ['tenant_id = ?'];
    const params: any[] = [tenantId];
    if (filter?.eventType) { conditions.push('event_type = ?'); params.push(filter.eventType); }
    if (filter?.resourceType) { conditions.push('resource_type = ?'); params.push(filter.resourceType); }
    if (filter?.from) { conditions.push('created_at >= ?'); params.push(filter.from); }
    if (filter?.to) { conditions.push('created_at <= ?'); params.push(filter.to); }
    if (filter?.search) { conditions.push('(LOWER(details) LIKE LOWER(?) OR LOWER(user_name) LIKE LOWER(?) OR LOWER(resource_type) LIKE LOWER(?))'); const s = `%${filter.search}%`; params.push(s, s, s); }
    const where = conditions.join(' AND ');
    const total = (this.db.prepare(`SELECT COUNT(*) as c FROM audit_logs WHERE ${where}`).get(...params) as any).c;
    const rows = this.db.prepare(`SELECT * FROM audit_logs WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, (page - 1) * limit) as any[];
    return { entries: rows.map(r => this.mapRow(r)), total };
  }

  exportByTenant(tenantId: string, filter?: { eventType?: string; from?: string; to?: string }): AuditLogEntry[] {
    const conditions = ['tenant_id = ?'];
    const params: any[] = [tenantId];
    if (filter?.eventType) { conditions.push('event_type = ?'); params.push(filter.eventType); }
    if (filter?.from) { conditions.push('created_at >= ?'); params.push(filter.from); }
    if (filter?.to) { conditions.push('created_at <= ?'); params.push(filter.to); }
    const where = conditions.join(' AND ');
    const rows = this.db.prepare(`SELECT * FROM audit_logs WHERE ${where} ORDER BY created_at DESC`).all(...params) as any[];
    return rows.map(r => this.mapRow(r));
  }

  private mapRow(row: any): AuditLogEntry {
    return {
      id: row.id, tenantId: row.tenant_id, userId: row.user_id, userName: row.user_name,
      eventType: row.event_type, resourceType: row.resource_type, resourceId: row.resource_id,
      details: row.details, ipAddress: row.ip_address, userAgent: row.user_agent, createdAt: row.created_at,
    };
  }
}

export class EnhancedApiKeyRepository {
  constructor(private db: SqlDatabase) {}

  create(tenantId: string, label: string, role: string, createdBy: string, expiresAt?: string, permissions?: ApiKeyPermission[]): { key: string; record: EnhancedApiKey } {
    const id = generateId();
    const now = new Date().toISOString();
    const { raw, prefix, hash, salt } = generateApiKey();
    this.db.prepare(
      'INSERT INTO tenant_api_keys (id, tenant_id, label, key_prefix, key_hash, salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, tenantId, label, prefix, hash, salt, role, now);
    // Add created_by and permissions via additive columns (try-catch safe)
    try { this.db.prepare('ALTER TABLE tenant_api_keys ADD COLUMN created_by TEXT;').run(); } catch {}
    try { this.db.prepare('ALTER TABLE tenant_api_keys ADD COLUMN permissions TEXT DEFAULT \'[]\';').run(); } catch {}
    try { this.db.prepare('ALTER TABLE tenant_api_keys ADD COLUMN total_requests INTEGER DEFAULT 0;').run(); } catch {}
    try { this.db.prepare('ALTER TABLE tenant_api_keys ADD COLUMN updated_at TEXT;').run(); } catch {}
    this.db.prepare('UPDATE tenant_api_keys SET created_by = ?, permissions = ?, updated_at = ? WHERE id = ?')
      .run(createdBy, JSON.stringify(permissions || []), now, id);
    return { key: raw, record: this.findById(id)! };
  }

  findById(id: string): EnhancedApiKey | null {
    const row = this.db.prepare('SELECT * FROM tenant_api_keys WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findByTenant(tenantId: string): EnhancedApiKey[] {
    const rows = this.db.prepare('SELECT * FROM tenant_api_keys WHERE tenant_id = ? AND revoked_at IS NULL ORDER BY created_at DESC').all(tenantId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  findAllByTenant(tenantId: string): EnhancedApiKey[] {
    const rows = this.db.prepare('SELECT * FROM tenant_api_keys WHERE tenant_id = ? ORDER BY created_at DESC').all(tenantId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  rotate(id: string, tenantId: string): { key: string; record: EnhancedApiKey } | null {
    const existing = this.findById(id);
    if (!existing || existing.tenantId !== tenantId) return null;
    const { raw, prefix, hash, salt } = generateApiKey();
    const now = new Date().toISOString();
    this.db.prepare('UPDATE tenant_api_keys SET key_prefix = ?, key_hash = ?, salt = ?, updated_at = ? WHERE id = ?')
      .run(prefix, hash, salt, now, id);
    return { key: raw, record: this.findById(id)! };
  }

  revoke(id: string, tenantId: string): boolean {
    const result = this.db.prepare('UPDATE tenant_api_keys SET revoked_at = ?, updated_at = ? WHERE id = ? AND tenant_id = ? AND revoked_at IS NULL')
      .run(new Date().toISOString(), new Date().toISOString(), id, tenantId);
    return result.changes > 0;
  }

  incrementRequests(id: string): void {
    this.db.prepare('UPDATE tenant_api_keys SET total_requests = COALESCE(total_requests, 0) + 1, last_used_at = ?, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), new Date().toISOString(), id);
  }

  getUsageStats(tenantId: string): ApiKeyUsageStats {
    const allKeys = this.db.prepare('SELECT * FROM tenant_api_keys WHERE tenant_id = ?').all(tenantId) as any[];
    const activeKeys = allKeys.filter(k => !k.revoked_at);
    const revokedKeys = allKeys.filter(k => k.revoked_at);
    const totalRequests = allKeys.reduce((sum, k) => sum + (k.total_requests || 0), 0);
    const now = Date.now();
    const dayMs = 86400000;
    const last24h = activeKeys.filter(k => k.last_used_at && (now - new Date(k.last_used_at).getTime()) < dayMs).length;
    const last7d = activeKeys.filter(k => k.last_used_at && (now - new Date(k.last_used_at).getTime()) < dayMs * 7).length;
    const last30d = activeKeys.filter(k => k.last_used_at && (now - new Date(k.last_used_at).getTime()) < dayMs * 30).length;
    const never = activeKeys.filter(k => !k.last_used_at).length;
    const keysByRole: Record<string, number> = {};
    for (const k of allKeys) { keysByRole[k.role] = (keysByRole[k.role] || 0) + 1; }
    return {
      totalKeys: allKeys.length, activeKeys: activeKeys.length, revokedKeys: revokedKeys.length,
      totalRequests, averageRequestsPerKey: activeKeys.length > 0 ? Math.round(totalRequests / activeKeys.length) : 0,
      lastUsedDistribution: { last24h, last7d, last30d, never },
      keysByRole,
    };
  }

  private mapRow(row: any): EnhancedApiKey {
    return {
      id: row.id, tenantId: row.tenant_id, label: row.label,
      keyPrefix: row.key_prefix, keyHash: row.key_hash, salt: row.salt,
      role: row.role,
      permissions: row.permissions ? JSON.parse(row.permissions) : [],
      createdBy: row.created_by || '',
      lastUsedAt: row.last_used_at, expiresAt: row.expires_at,
      totalRequests: row.total_requests || 0,
      createdAt: row.created_at, updatedAt: row.updated_at || row.created_at, revokedAt: row.revoked_at,
    };
  }
}

export class WebhookRepository {
  constructor(private db: SqlDatabase) {}

  create(tenantId: string, url: string, events: WebhookEvent[], signingSecret: string): Webhook {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO webhooks (id, tenant_id, url, events, signing_secret, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, tenantId, url, JSON.stringify(events), signingSecret, now, now);
    return this.findById(id)!;
  }

  findById(id: string): Webhook | null {
    const row = this.db.prepare('SELECT * FROM webhooks WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  listByTenant(tenantId: string): Webhook[] {
    const rows = this.db.prepare('SELECT * FROM webhooks WHERE tenant_id = ? ORDER BY created_at DESC').all(tenantId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  update(id: string, tenantId: string, data: { url?: string; events?: WebhookEvent[]; isActive?: boolean; signingSecret?: string }): Webhook | null {
    const sets: string[] = ['updated_at = ?'];
    const vals: any[] = [new Date().toISOString()];
    if (data.url !== undefined) { sets.push('url = ?'); vals.push(data.url); }
    if (data.events !== undefined) { sets.push('events = ?'); vals.push(JSON.stringify(data.events)); }
    if (data.isActive !== undefined) { sets.push('is_active = ?'); vals.push(data.isActive ? 1 : 0); }
    if (data.signingSecret !== undefined) { sets.push('signing_secret = ?'); vals.push(data.signingSecret); }
    vals.push(id, tenantId);
    this.db.prepare(`UPDATE webhooks SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`).run(...vals);
    return this.findById(id);
  }

  delete(id: string, tenantId: string): boolean {
    const result = this.db.prepare('DELETE FROM webhooks WHERE id = ? AND tenant_id = ?').run(id, tenantId);
    return result.changes > 0;
  }

  recordSuccess(id: string): void {
    this.db.prepare('UPDATE webhooks SET last_success_at = ?, consecutive_failures = 0, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), new Date().toISOString(), id);
  }

  recordFailure(id: string): void {
    this.db.prepare('UPDATE webhooks SET last_failure_at = ?, consecutive_failures = consecutive_failures + 1, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), new Date().toISOString(), id);
  }

  private mapRow(row: any): Webhook {
    return {
      id: row.id, tenantId: row.tenant_id, url: row.url,
      events: JSON.parse(row.events || '[]'), signingSecret: row.signing_secret,
      isActive: !!row.is_active, lastSuccessAt: row.last_success_at,
      lastFailureAt: row.last_failure_at, consecutiveFailures: row.consecutive_failures || 0,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

export class WebhookDeliveryRepository {
  constructor(private db: SqlDatabase) {}

  create(webhookId: string, tenantId: string, eventType: WebhookEvent, payload: string, maxAttempts = 3): WebhookDelivery {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO webhook_deliveries (id, webhook_id, tenant_id, event_type, payload, max_attempts, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, webhookId, tenantId, eventType, payload, maxAttempts, now);
    return this.findById(id)!;
  }

  findById(id: string): WebhookDelivery | null {
    const row = this.db.prepare('SELECT * FROM webhook_deliveries WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  listByWebhook(webhookId: string, page = 1, limit = 20): { deliveries: WebhookDelivery[]; total: number } {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM webhook_deliveries WHERE webhook_id = ?').get(webhookId) as any).c;
    const rows = this.db.prepare('SELECT * FROM webhook_deliveries WHERE webhook_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(webhookId, limit, (page - 1) * limit) as any[];
    return { deliveries: rows.map(r => this.mapRow(r)), total };
  }

  listPendingRetry(): WebhookDelivery[] {
    const rows = this.db.prepare("SELECT * FROM webhook_deliveries WHERE status IN ('pending','failed') AND (next_retry_at IS NULL OR next_retry_at <= ?) AND attempt < max_attempts AND status != 'delivered'")
      .all(new Date().toISOString()) as any[];
    return rows.map(r => this.mapRow(r));
  }

  markDelivering(id: string): void {
    this.db.prepare("UPDATE webhook_deliveries SET status = 'delivering', next_retry_at = ? WHERE id = ?")
      .run(new Date(Date.now() + 300000).toISOString(), id);
  }

  markDelivered(id: string, responseCode: number, responseBody?: string): void {
    this.db.prepare("UPDATE webhook_deliveries SET status = 'delivered', response_code = ?, response_body = ?, completed_at = ? WHERE id = ?")
      .run(responseCode, responseBody || null, new Date().toISOString(), id);
  }

  markFailed(id: string, responseCode?: number, responseBody?: string): void {
    const now = new Date().toISOString();
    const row = this.db.prepare('SELECT attempt, max_attempts FROM webhook_deliveries WHERE id = ?').get(id) as any;
    const nextRetry = row && row.attempt < row.max_attempts ? new Date(Date.now() + Math.pow(2, row.attempt) * 60000).toISOString() : null;
    this.db.prepare("UPDATE webhook_deliveries SET status = 'failed', response_code = ?, response_body = ?, attempt = attempt + 1, next_retry_at = ?, completed_at = ? WHERE id = ?")
      .run(responseCode || null, responseBody || null, nextRetry, row && row.attempt >= row.max_attempts ? now : null, id);
  }

  replay(id: string): WebhookDelivery {
    const existing = this.findById(id);
    if (!existing) throw new Error('Delivery not found');
    const newId = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO webhook_deliveries (id, webhook_id, tenant_id, event_type, payload, attempt, max_attempts, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(newId, existing.webhookId, existing.tenantId, existing.eventType, existing.payload, 1, existing.maxAttempts, now);
    return this.findById(newId)!;
  }

  private mapRow(row: any): WebhookDelivery {
    return {
      id: row.id, webhookId: row.webhook_id, tenantId: row.tenant_id,
      eventType: row.event_type, payload: row.payload, status: row.status,
      responseCode: row.response_code, responseBody: row.response_body,
      attempt: row.attempt, maxAttempts: row.max_attempts, nextRetryAt: row.next_retry_at,
      createdAt: row.created_at, completedAt: row.completed_at,
    };
  }
}

export class UptimeRepository {
  constructor(private db: SqlDatabase) {}

  record(tenantId: string, date: string, uptimePercentage: number, downtimeSeconds: number): UptimeHistory {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO uptime_history (id, tenant_id, date, uptime_percentage, downtime_seconds, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, tenantId, date, uptimePercentage, downtimeSeconds, now);
    return this.findById(id)!;
  }

  findById(id: string): UptimeHistory | null {
    const row = this.db.prepare('SELECT * FROM uptime_history WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  listByTenant(tenantId: string, days = 90): UptimeHistory[] {
    const rows = this.db.prepare('SELECT * FROM uptime_history WHERE tenant_id = ? ORDER BY date DESC LIMIT ?').all(tenantId, days) as any[];
    return rows.map(r => this.mapRow(r));
  }

  getAggregate(tenantId: string, days = 30): { avgUptime: number; totalDowntime: number; daysRecorded: number } {
    const rows = this.db.prepare('SELECT * FROM uptime_history WHERE tenant_id = ? ORDER BY date DESC LIMIT ?').all(tenantId, days) as any[];
    if (rows.length === 0) return { avgUptime: 100, totalDowntime: 0, daysRecorded: 0 };
    const avgUptime = rows.reduce((s, r) => s + r.uptime_percentage, 0) / rows.length;
    const totalDowntime = rows.reduce((s, r) => s + r.downtime_seconds, 0);
    return { avgUptime: Math.round(avgUptime * 100) / 100, totalDowntime, daysRecorded: rows.length };
  }

  private mapRow(row: any): UptimeHistory {
    return {
      id: row.id, tenantId: row.tenant_id, date: row.date,
      uptimePercentage: row.uptime_percentage, downtimeSeconds: row.downtime_seconds, createdAt: row.created_at,
    };
  }
}

export class SecurityStatusRepository {
  constructor(private db: SqlDatabase) {}

  upsert(tenantId: string, status: SecurityStatusType, findings: string[]): SecurityStatus {
    const existing = this.db.prepare('SELECT * FROM security_status WHERE tenant_id = ?').get(tenantId) as any;
    const now = new Date().toISOString();
    if (existing) {
      this.db.prepare('UPDATE security_status SET status = ?, last_scan_at = ?, findings = ?, updated_at = ? WHERE tenant_id = ?')
        .run(status, now, JSON.stringify(findings), now, tenantId);
      return this.findByTenant(tenantId)!;
    }
    const id = generateId();
    this.db.prepare(
      'INSERT INTO security_status (id, tenant_id, status, last_scan_at, findings, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, tenantId, status, now, JSON.stringify(findings), now, now);
    return this.findByTenant(tenantId)!;
  }

  findByTenant(tenantId: string): SecurityStatus | null {
    const row = this.db.prepare('SELECT * FROM security_status WHERE tenant_id = ?').get(tenantId) as any;
    return row ? this.mapRow(row) : null;
  }

  private mapRow(row: any): SecurityStatus {
    return {
      id: row.id, tenantId: row.tenant_id, status: row.status,
      lastScanAt: row.last_scan_at, findings: row.findings,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

export class IncidentRepository {
  constructor(private db: SqlDatabase) {}

  create(tenantId: string, title: string, description: string, severity: IncidentSeverity): Incident {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO incidents (id, tenant_id, title, description, severity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, tenantId, title, description, severity, now, now);
    return this.findById(id)!;
  }

  findById(id: string): Incident | null {
    const row = this.db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  listByTenant(tenantId: string, status?: string): Incident[] {
    if (status) {
      const rows = this.db.prepare('SELECT * FROM incidents WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC').all(tenantId, status) as any[];
      return rows.map(r => this.mapRow(r));
    }
    const rows = this.db.prepare('SELECT * FROM incidents WHERE tenant_id = ? ORDER BY created_at DESC').all(tenantId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  updateStatus(id: string, status: IncidentStatus): Incident | null {
    const now = new Date().toISOString();
    const resolvedAt = status === 'resolved' ? now : null;
    this.db.prepare('UPDATE incidents SET status = ?, resolved_at = ?, updated_at = ? WHERE id = ?')
      .run(status, resolvedAt, now, id);
    return this.findById(id);
  }

  private mapRow(row: any): Incident {
    return {
      id: row.id, tenantId: row.tenant_id, title: row.title, description: row.description,
      severity: row.severity, status: row.status, resolvedAt: row.resolved_at,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

export class ComplianceDocumentRepository {
  constructor(private db: SqlDatabase) {}

  create(tenantId: string, documentType: string, title: string, fileUrl: string, version: string, effectiveDate: string): ComplianceDocument {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO compliance_documents (id, tenant_id, document_type, title, file_url, version, effective_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, tenantId, documentType, title, fileUrl, version, effectiveDate, now, now);
    return this.findById(id)!;
  }

  findById(id: string): ComplianceDocument | null {
    const row = this.db.prepare('SELECT * FROM compliance_documents WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  listByTenant(tenantId: string): ComplianceDocument[] {
    const rows = this.db.prepare('SELECT * FROM compliance_documents WHERE tenant_id = ? ORDER BY effective_date DESC').all(tenantId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  private mapRow(row: any): ComplianceDocument {
    return {
      id: row.id, tenantId: row.tenant_id, documentType: row.document_type,
      title: row.title, fileUrl: row.file_url, version: row.version,
      effectiveDate: row.effective_date, createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

export class DpaRepository {
  constructor(private db: SqlDatabase) {}

  upsert(tenantId: string, version: string, fileUrl: string, signedAt?: string, expiresAt?: string): DpaDocument {
    const existing = this.db.prepare('SELECT * FROM dpa_documents WHERE tenant_id = ?').get(tenantId) as any;
    const now = new Date().toISOString();
    if (existing) {
      this.db.prepare('UPDATE dpa_documents SET version = ?, file_url = ?, signed_at = ?, expires_at = ?, updated_at = ? WHERE tenant_id = ?')
        .run(version, fileUrl, signedAt || null, expiresAt || null, now, tenantId);
      return this.findByTenant(tenantId)!;
    }
    const id = generateId();
    this.db.prepare(
      'INSERT INTO dpa_documents (id, tenant_id, version, signed_at, expires_at, file_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, tenantId, version, signedAt || null, expiresAt || null, fileUrl, now, now);
    return this.findByTenant(tenantId)!;
  }

  findByTenant(tenantId: string): DpaDocument | null {
    const row = this.db.prepare('SELECT * FROM dpa_documents WHERE tenant_id = ?').get(tenantId) as any;
    return row ? this.mapRow(row) : null;
  }

  private mapRow(row: any): DpaDocument {
    return {
      id: row.id, tenantId: row.tenant_id, version: row.version,
      signedAt: row.signed_at, expiresAt: row.expires_at, fileUrl: row.file_url,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

export class SubprocessorRepository {
  constructor(private db: SqlDatabase) {}

  create(tenantId: string, name: string, purpose: string, location: string, dataProcessed: string): Subprocessor {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO subprocessors (id, tenant_id, name, purpose, location, data_processed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, tenantId, name, purpose, location, dataProcessed, now, now);
    return this.findById(id)!;
  }

  findById(id: string): Subprocessor | null {
    const row = this.db.prepare('SELECT * FROM subprocessors WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  listByTenant(tenantId: string): Subprocessor[] {
    const rows = this.db.prepare('SELECT * FROM subprocessors WHERE tenant_id = ? ORDER BY name ASC').all(tenantId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  update(id: string, tenantId: string, data: { name?: string; purpose?: string; location?: string; dataProcessed?: string; status?: 'active' | 'retired' }): Subprocessor | null {
    const sets: string[] = ['updated_at = ?'];
    const vals: any[] = [new Date().toISOString()];
    if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
    if (data.purpose !== undefined) { sets.push('purpose = ?'); vals.push(data.purpose); }
    if (data.location !== undefined) { sets.push('location = ?'); vals.push(data.location); }
    if (data.dataProcessed !== undefined) { sets.push('data_processed = ?'); vals.push(data.dataProcessed); }
    if (data.status !== undefined) { sets.push('status = ?'); vals.push(data.status); }
    vals.push(id, tenantId);
    this.db.prepare(`UPDATE subprocessors SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`).run(...vals);
    return this.findById(id);
  }

  delete(id: string, tenantId: string): boolean {
    const result = this.db.prepare('DELETE FROM subprocessors WHERE id = ? AND tenant_id = ?').run(id, tenantId);
    return result.changes > 0;
  }

  private mapRow(row: any): Subprocessor {
    return {
      id: row.id, tenantId: row.tenant_id, name: row.name, purpose: row.purpose,
      location: row.location, dataProcessed: row.data_processed, status: row.status,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

export class TopicResponseTemplateRepository {
  constructor(private db: SqlDatabase) {}

  upsert(tenantId: string, topic: string, depth: number, answer: string, sources?: string[]): TopicResponseTemplate {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO topic_response_templates (id, tenant_id, topic, depth, answer, sources, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id, topic, depth) DO UPDATE SET answer = excluded.answer, sources = excluded.sources, updated_at = excluded.updated_at
    `).run(id, tenantId, topic, depth, answer, JSON.stringify(sources || []), now, now);
    return this.findByTenantTopic(tenantId, topic).find(r => r.depth === depth)!;
  }

  findByTenantTopic(tenantId: string, topic: string): TopicResponseTemplate[] {
    const rows = this.db.prepare('SELECT * FROM topic_response_templates WHERE tenant_id = ? AND topic = ? ORDER BY depth ASC')
      .all(tenantId, topic) as any[];
    return rows.map(r => this.mapRow(r));
  }

  findByTenant(tenantId: string): TopicResponseTemplate[] {
    const rows = this.db.prepare('SELECT * FROM topic_response_templates WHERE tenant_id = ? ORDER BY topic, depth')
      .all(tenantId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  deleteByTenantTopic(tenantId: string, topic: string): void {
    this.db.prepare('DELETE FROM topic_response_templates WHERE tenant_id = ? AND topic = ?').run(tenantId, topic);
  }

  private mapRow(row: any): TopicResponseTemplate {
    return {
      id: row.id, tenantId: row.tenant_id, topic: row.topic, depth: row.depth,
      answer: row.answer, sources: row.sources,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

export interface HandoffRequest {
  id: string;
  tenantId: string;
  sessionId: string;
  visitorEmail?: string;
  conversationSummary?: string;
  status: 'pending' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export class HandoffRequestRepository {
  constructor(private db: SqlDatabase) {}

  create(data: { tenantId: string; sessionId: string; visitorEmail?: string; conversationSummary?: string }): HandoffRequest {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO handoff_requests (id, tenant_id, session_id, visitor_email, conversation_summary, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.tenantId, data.sessionId, data.visitorEmail || null, data.conversationSummary || null, 'pending', now);
    return this.findById(id)!;
  }

  findById(id: string): HandoffRequest | null {
    const row = this.db.prepare('SELECT * FROM handoff_requests WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findBySession(sessionId: string): HandoffRequest | null {
    const row = this.db.prepare('SELECT * FROM handoff_requests WHERE session_id = ? ORDER BY created_at DESC LIMIT 1').get(sessionId) as any;
    return row ? this.mapRow(row) : null;
  }

  listByTenant(tenantId: string, status?: string): HandoffRequest[] {
    let sql = 'SELECT * FROM handoff_requests WHERE tenant_id = ?';
    const params: any[] = [tenantId];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => this.mapRow(r));
  }

  resolve(id: string, resolvedBy: string): HandoffRequest | null {
    this.db.prepare(
      "UPDATE handoff_requests SET status = 'resolved', resolved_at = ?, resolved_by = ? WHERE id = ?"
    ).run(new Date().toISOString(), resolvedBy, id);
    return this.findById(id);
  }

  private mapRow(row: any): HandoffRequest {
    return {
      id: row.id, tenantId: row.tenant_id, sessionId: row.session_id,
      visitorEmail: row.visitor_email, conversationSummary: row.conversation_summary,
      status: row.status, createdAt: row.created_at,
      resolvedAt: row.resolved_at, resolvedBy: row.resolved_by,
    };
  }
}

export class LeadRepository {
  constructor(private db: SqlDatabase) {}

  create(data: {
    tenantId: string;
    sessionId: string;
    conversationId?: string;
    email?: string;
    phone?: string;
    name?: string;
    company?: string;
    qualificationStatus: QualificationStatus;
    leadScore: number;
    buyingIntent: BuyingIntentLevel;
    source: LeadSource;
    metadata?: Record<string, unknown>;
  }): Lead {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO leads (id, tenant_id, session_id, conversation_id, email, phone, name, company, qualification_status, lead_score, buying_intent, source, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.tenantId, data.sessionId, data.conversationId || null,
      data.email || null, data.phone || null, data.name || null, data.company || null,
      data.qualificationStatus, data.leadScore, data.buyingIntent, data.source,
      JSON.stringify(data.metadata || {}), now, now,
    );
    return this.findById(id)!;
  }

  findById(id: string): Lead | null {
    const row = this.db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  findBySession(tenantId: string, sessionId: string): Lead | null {
    const row = this.db.prepare('SELECT * FROM leads WHERE tenant_id = ? AND session_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(tenantId, sessionId) as any;
    return row ? this.mapRow(row) : null;
  }

  findByEmail(tenantId: string, email: string): Lead | null {
    const row = this.db.prepare('SELECT * FROM leads WHERE tenant_id = ? AND email = ? ORDER BY created_at DESC LIMIT 1')
      .get(tenantId, email) as any;
    return row ? this.mapRow(row) : null;
  }

  findByTenant(tenantId: string, page = 1, limit = 20): { leads: Lead[]; total: number } {
    const total = (this.db.prepare('SELECT COUNT(*) as c FROM leads WHERE tenant_id = ?').get(tenantId) as any).c;
    const rows = this.db.prepare('SELECT * FROM leads WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(tenantId, limit, (page - 1) * limit) as any[];
    return { leads: rows.map(r => this.mapRow(r)), total };
  }

  update(id: string, data: Partial<{
    sessionId: string;
    conversationId: string;
    email: string;
    phone: string;
    name: string;
    company: string;
    qualificationStatus: QualificationStatus;
    leadScore: number;
    buyingIntent: BuyingIntentLevel;
    metadata: Record<string, unknown>;
    notes: string;
  }>): Lead | null {
    const sets: string[] = ['updated_at = ?'];
    const vals: any[] = [new Date().toISOString()];
    if (data.sessionId !== undefined) { sets.push('session_id = ?'); vals.push(data.sessionId); }
    if (data.conversationId !== undefined) { sets.push('conversation_id = ?'); vals.push(data.conversationId); }
    if (data.email !== undefined) { sets.push('email = ?'); vals.push(data.email); }
    if (data.phone !== undefined) { sets.push('phone = ?'); vals.push(data.phone); }
    if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
    if (data.company !== undefined) { sets.push('company = ?'); vals.push(data.company); }
    if (data.qualificationStatus !== undefined) { sets.push('qualification_status = ?'); vals.push(data.qualificationStatus); }
    if (data.leadScore !== undefined) { sets.push('lead_score = ?'); vals.push(data.leadScore); }
    if (data.buyingIntent !== undefined) { sets.push('buying_intent = ?'); vals.push(data.buyingIntent); }
    if (data.metadata !== undefined) { sets.push('metadata = ?'); vals.push(JSON.stringify(data.metadata)); }
    if (data.notes !== undefined) { sets.push('notes = ?'); vals.push(data.notes); }
    vals.push(id);
    this.db.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    return this.findById(id);
  }

  updateLead(id: string, tenantId: string, updates: Partial<Lead>): Lead | null {
    const existing = this.findById(id);
    if (!existing || existing.tenantId !== tenantId) return null;

    const sets: string[] = ['updated_at = ?'];
    const vals: any[] = [new Date().toISOString()];
    const fieldMap: [keyof Lead, string][] = [
      ['email', 'email'],
      ['phone', 'phone'],
      ['name', 'name'],
      ['company', 'company'],
      ['qualificationStatus', 'qualification_status'],
      ['leadScore', 'lead_score'],
      ['buyingIntent', 'buying_intent'],
      ['notes', 'notes'],
    ];
    for (const [key, col] of fieldMap) {
      if (updates[key] !== undefined) {
        sets.push(`${col} = ?`);
        vals.push(updates[key] as string | number);
      }
    }
    if (updates.metadata !== undefined) {
      sets.push('metadata = ?');
      vals.push(JSON.stringify(updates.metadata));
    }
    if (sets.length === 1) return existing;
    vals.push(id, tenantId);
    this.db.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`).run(...vals);
    return this.findById(id);
  }

  searchLeads(
    tenantId: string,
    params: {
      status?: string;
      minScore?: number;
      startDate?: string;
      endDate?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ): { leads: Lead[]; total: number } {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(Math.max(1, params.limit || 20), 100);
    const where: string[] = ['tenant_id = ?'];
    const vals: any[] = [tenantId];

    if (params.status) {
      where.push('qualification_status = ?');
      vals.push(params.status);
    }
    if (typeof params.minScore === 'number' && !isNaN(params.minScore)) {
      where.push('lead_score >= ?');
      vals.push(params.minScore);
    }
    if (params.startDate) {
      where.push('created_at >= ?');
      vals.push(params.startDate.length === 10 ? `${params.startDate}T00:00:00.000Z` : params.startDate);
    }
    if (params.endDate) {
      where.push('created_at <= ?');
      vals.push(params.endDate.length === 10 ? `${params.endDate}T23:59:59.999Z` : params.endDate);
    }
    if (params.search) {
      const term = `%${params.search}%`;
      where.push('(LOWER(name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?) OR LOWER(company) LIKE LOWER(?))');
      vals.push(term, term, term);
    }

    const whereSql = where.join(' AND ');
    const total = (this.db.prepare(`SELECT COUNT(*) as c FROM leads WHERE ${whereSql}`).get(...vals) as any).c;
    const rows = this.db.prepare(`SELECT * FROM leads WHERE ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...vals, limit, (page - 1) * limit) as any[];
    return { leads: rows.map(r => this.mapRow(r)), total };
  }

  upsertBySession(data: {
    tenantId: string;
    sessionId: string;
    conversationId?: string;
    email?: string;
    phone?: string;
    name?: string;
    company?: string;
    qualificationStatus: QualificationStatus;
    leadScore: number;
    buyingIntent: BuyingIntentLevel;
    source: LeadSource;
    metadata?: Record<string, unknown>;
  }): { lead: Lead; isNew: boolean; qualificationChanged: boolean } {
    const existing = this.findBySession(data.tenantId, data.sessionId);
    if (existing) {
      const updated = this.update(existing.id, {
        conversationId: data.conversationId,
        email: data.email !== undefined ? data.email : existing.email,
        phone: data.phone !== undefined ? data.phone : existing.phone,
        name: data.name !== undefined ? data.name : existing.name,
        company: data.company !== undefined ? data.company : existing.company,
        qualificationStatus: data.qualificationStatus,
        leadScore: Math.max(existing.leadScore, data.leadScore),
        buyingIntent: data.buyingIntent,
        metadata: { ...(existing.metadata || {}), ...(data.metadata || {}) },
      });
      return {
        lead: updated!,
        isNew: false,
        qualificationChanged: updated!.qualificationStatus !== existing.qualificationStatus,
      };
    }
    const created = this.create(data);
    return { lead: created, isNew: true, qualificationChanged: true };
  }

  delete(id: string, tenantId: string): boolean {
    const result = this.db.prepare('DELETE FROM leads WHERE id = ? AND tenant_id = ?').run(id, tenantId);
    return result.changes > 0;
  }

  private mapRow(row: any): Lead {
    return {
      id: row.id, tenantId: row.tenant_id, sessionId: row.session_id,
      conversationId: row.conversation_id || undefined,
      email: row.email || undefined, phone: row.phone || undefined,
      name: row.name || undefined, company: row.company || undefined,
      qualificationStatus: row.qualification_status,
      leadScore: row.lead_score, buyingIntent: row.buying_intent,
      source: row.source,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      notes: row.notes || undefined,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

export class WebsiteScanRepository {
  constructor(private db: SqlDatabase) {}

  create(data: {
    tenantId: string; rootUrl: string; crawlMode: ScanCrawlMode; schedule: ScanSchedule;
    maxDepth?: number; pageLimit?: number; nextScanAt?: string;
  }): WebsiteScan {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      `INSERT INTO website_scans
        (id, tenant_id, root_url, crawl_mode, schedule, max_depth, page_limit, primary_ctas, next_scan_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?)`
    ).run(id, data.tenantId, data.rootUrl, data.crawlMode, data.schedule,
      data.maxDepth ?? 3, data.pageLimit ?? 50, data.nextScanAt || null, now, now);
    return this.findById(id)!;
  }

  findById(id: string): WebsiteScan | null {
    const row = this.db.prepare('SELECT * FROM website_scans WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  listByTenant(tenantId: string, limit = 50): WebsiteScan[] {
    const rows = this.db.prepare(
      'SELECT * FROM website_scans WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(tenantId, limit) as any[];
    return rows.map(r => this.mapRow(r));
  }

  findLatestByTenant(tenantId: string): WebsiteScan | null {
    const row = this.db.prepare(
      'SELECT * FROM website_scans WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(tenantId) as any;
    return row ? this.mapRow(row) : null;
  }

  findLatestByTenantAndUrl(tenantId: string, rootUrl: string): WebsiteScan | null {
    const row = this.db.prepare(
      'SELECT * FROM website_scans WHERE tenant_id = ? AND root_url = ? ORDER BY created_at DESC LIMIT 1'
    ).get(tenantId, rootUrl) as any;
    return row ? this.mapRow(row) : null;
  }

  listDueScans(nowIso: string): WebsiteScan[] {
    const rows = this.db.prepare(
      `SELECT * FROM website_scans
       WHERE next_scan_at IS NOT NULL AND next_scan_at <= ? AND status IN ('queued','completed','failed')
       ORDER BY next_scan_at ASC`
    ).all(nowIso) as any[];
    return rows.map(r => this.mapRow(r));
  }

  listByStatus(statuses: ScanStatus[]): WebsiteScan[] {
    const placeholders = statuses.map(() => '?').join(',');
    const rows = this.db.prepare(
      `SELECT * FROM website_scans WHERE status IN (${placeholders}) ORDER BY created_at DESC`
    ).all(...statuses) as any[];
    return rows.map(r => this.mapRow(r));
  }

  cancelRunning(tenantId: string): number {
    const now = new Date().toISOString();
    const result = this.db.prepare(
      `UPDATE website_scans SET status = 'cancelled', updated_at = ? WHERE tenant_id = ? AND status IN ('queued','crawling')`
    ).run(now, tenantId);
    return result.changes;
  }

  markRunning(id: string): void {
    const now = new Date().toISOString();
    this.db.prepare(
      "UPDATE website_scans SET status = 'crawling', started_at = ?, last_error = NULL, updated_at = ? WHERE id = ?"
    ).run(now, now, id);
  }

  setCounts(id: string, counts: Partial<{
    pagesDiscovered: number; pagesScanned: number; pagesIndexed: number;
    pagesUnchanged: number; pagesAdded: number; pagesUpdated: number; pagesDeleted: number;
  }>): void {
    const columns: string[] = [];
    const values: (string | number)[] = [];
    const colMap: Record<string, string> = {
      pagesDiscovered: 'pages_discovered', pagesScanned: 'pages_scanned', pagesIndexed: 'pages_indexed',
      pagesUnchanged: 'pages_unchanged', pagesAdded: 'pages_added',
      pagesUpdated: 'pages_updated', pagesDeleted: 'pages_deleted',
    };
    for (const [key, value] of Object.entries(counts)) {
      if (typeof value === 'number' && colMap[key]) {
        columns.push(`${colMap[key]} = ?`);
        values.push(value);
      }
    }
    if (columns.length === 0) return;
    values.push(new Date().toISOString(), id);
    this.db.prepare(`UPDATE website_scans SET ${columns.join(', ')}, updated_at = ? WHERE id = ?`).run(...values);
  }

  markCompleted(id: string, data: {
    counts: Partial<{
      pagesDiscovered: number; pagesScanned: number; pagesIndexed: number;
      pagesUnchanged: number; pagesAdded: number; pagesUpdated: number; pagesDeleted: number;
    }>;
    brandTone?: string; primaryCtas?: string[]; confidenceScore?: number; nextScanAt?: string;
  }): void {
    this.setCounts(id, data.counts);
    const now = new Date().toISOString();
    this.db.prepare(
      `UPDATE website_scans SET status = 'completed', completed_at = ?, brand_tone = ?, primary_ctas = ?, confidence_score = ?, next_scan_at = ?, updated_at = ? WHERE id = ?`
    ).run(now, data.brandTone || null,
      data.primaryCtas ? JSON.stringify(data.primaryCtas) : '[]',
      data.confidenceScore ?? null, data.nextScanAt || null, now, id);
  }

  markFailed(id: string, error: string): void {
    const now = new Date().toISOString();
    this.db.prepare(
      `UPDATE website_scans SET status = 'failed', last_error = ?, completed_at = ?, updated_at = ? WHERE id = ?`
    ).run(error, now, now, id);
  }

  updateSchedule(id: string, schedule: ScanSchedule, nextScanAt?: string): void {
    const now = new Date().toISOString();
    this.db.prepare(
      'UPDATE website_scans SET schedule = ?, next_scan_at = ?, updated_at = ? WHERE id = ?'
    ).run(schedule, nextScanAt || null, now, id);
  }

  private mapRow(row: any): WebsiteScan {
    return {
      id: row.id, tenantId: row.tenant_id, rootUrl: row.root_url,
      status: row.status, crawlMode: row.crawl_mode, schedule: row.schedule,
      maxDepth: row.max_depth, pageLimit: row.page_limit,
      pagesDiscovered: row.pages_discovered, pagesScanned: row.pages_scanned,
      pagesIndexed: row.pages_indexed, pagesUnchanged: row.pages_unchanged,
      pagesAdded: row.pages_added, pagesUpdated: row.pages_updated,
      pagesDeleted: row.pages_deleted,
      brandTone: row.brand_tone || undefined,
      primaryCtas: row.primary_ctas ? JSON.parse(row.primary_ctas) : [],
      confidenceScore: row.confidence_score ?? undefined,
      nextScanAt: row.next_scan_at || undefined,
      lastError: row.last_error || undefined,
      startedAt: row.started_at || undefined,
      completedAt: row.completed_at || undefined,
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

export class ScannedPageRepository {
  constructor(private db: SqlDatabase) {}

  create(data: {
    scanId: string; tenantId: string; url: string;
    title?: string; content?: string; contentHash?: string; status: ScannedPageStatus;
  }): ScannedPage {
    const id = generateId();
    const now = new Date().toISOString();
    this.db.prepare(
      `INSERT INTO scanned_pages (id, scan_id, tenant_id, url, title, content, content_hash, status, crawled_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, data.scanId, data.tenantId, data.url, data.title || null,
      data.content || null, data.contentHash || null, data.status, now, now, now);
    return this.findById(id)!;
  }

  findById(id: string): ScannedPage | null {
    const row = this.db.prepare('SELECT * FROM scanned_pages WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  listByScan(scanId: string): ScannedPage[] {
    const rows = this.db.prepare(
      'SELECT * FROM scanned_pages WHERE scan_id = ? ORDER BY crawled_at ASC'
    ).all(scanId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  listLatestByTenant(tenantId: string): ScannedPage[] {
    const rows = this.db.prepare(
      `SELECT sp.* FROM scanned_pages sp
       JOIN (
         SELECT url, MAX(created_at) AS max_created FROM scanned_pages
         WHERE tenant_id = ? GROUP BY url
       ) m ON sp.url = m.url AND sp.created_at = m.max_created
       WHERE sp.tenant_id = ?`
    ).all(tenantId, tenantId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  updateStatus(id: string, status: ScannedPageStatus): void {
    this.db.prepare(
      'UPDATE scanned_pages SET status = ?, updated_at = ? WHERE id = ?'
    ).run(status, new Date().toISOString(), id);
  }

  private mapRow(row: any): ScannedPage {
    return {
      id: row.id, scanId: row.scan_id, tenantId: row.tenant_id, url: row.url,
      title: row.title || undefined, contentHash: row.content_hash || undefined,
      content: row.content || undefined, status: row.status,
      crawledAt: row.crawled_at, createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}

export class KbChunkRepository {
  constructor(private db: SqlDatabase) {}

  insertMany(knowledgeBaseId: string, tenantId: string, documentId: string, chunks: { content: string; metadata?: Record<string, unknown> }[]): number {
    const now = new Date().toISOString();
    const insert = this.db.prepare(
      `INSERT INTO kb_chunks (id, document_id, knowledge_base_id, tenant_id, content, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const insertMany = this.db.transaction((rows: { content: string; metadata?: Record<string, unknown> }[]) => {
      for (const chunk of rows) {
        insert.run(generateId(), documentId, knowledgeBaseId, tenantId, chunk.content,
          JSON.stringify(chunk.metadata || {}), now);
      }
    });
    insertMany(chunks);
    return chunks.length;
  }

  deleteByDocument(documentId: string): number {
    const result = this.db.prepare('DELETE FROM kb_chunks WHERE document_id = ?').run(documentId);
    return result.changes;
  }

  countByDocument(documentId: string): number {
    const row = this.db.prepare('SELECT COUNT(*) as c FROM kb_chunks WHERE document_id = ?').get(documentId) as any;
    return row?.c || 0;
  }
}
