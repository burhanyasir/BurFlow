import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export function createDatabase(dbPath: string): Database.Database {
  const dir = dirname(dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      email_verified INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      owner_id TEXT NOT NULL REFERENCES users(id),
      plan TEXT DEFAULT 'free' CHECK (plan IN ('free','starter','professional','enterprise')),
      subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN ('active','trialing','past_due','cancelled','expired')),
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      trial_ends_at TEXT,
      settings TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tenant_api_keys (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT DEFAULT 'end-user' CHECK (role IN ('admin','operator','service','end-user')),
      last_used_at TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL,
      user_id TEXT,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      message_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK (status IN ('active','ended','escalated'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
      content TEXT NOT NULL,
      sequence_number INTEGER NOT NULL,
      token_count INTEGER,
      latency_ms INTEGER,
      safety_flags TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usage_records (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      period TEXT NOT NULL,
      messages_used INTEGER DEFAULT 0,
      messages_limit INTEGER DEFAULT 100,
      tokens_used INTEGER DEFAULT 0,
      tokens_limit INTEGER DEFAULT 100000,
      storage_used_mb REAL DEFAULT 0,
      storage_limit_mb REAL DEFAULT 100,
      api_calls_used INTEGER DEFAULT 0,
      api_calls_limit INTEGER DEFAULT 1000,
      recorded_at TEXT NOT NULL,
      UNIQUE(tenant_id, period)
    );

    CREATE TABLE IF NOT EXISTS knowledge_bases (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
      document_count INTEGER DEFAULT 0,
      total_chunks INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kb_documents (
      id TEXT PRIMARY KEY,
      knowledge_base_id TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      source_type TEXT NOT NULL CHECK (source_type IN ('pdf','docx','url','faq','text')),
      source_url TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
      chunk_count INTEGER DEFAULT 0,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kb_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
      knowledge_base_id TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      embedding BLOB,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants(owner_id);
    CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
    CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON tenant_api_keys(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON tenant_api_keys(key_prefix);
    CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_usage_tenant_period ON usage_records(tenant_id, period);
    CREATE INDEX IF NOT EXISTS idx_kb_tenant ON knowledge_bases(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_kb_doc_tenant ON kb_documents(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_kb_chunks_document ON kb_chunks(document_id);
    CREATE INDEX IF NOT EXISTS idx_kb_chunks_tenant ON kb_chunks(tenant_id);

    -- Onboarding progress
    CREATE TABLE IF NOT EXISTS onboarding_progress (
      tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
      completed_steps TEXT NOT NULL DEFAULT '[]',
      skipped_steps TEXT NOT NULL DEFAULT '[]',
      current_step TEXT,
      completion_percentage INTEGER DEFAULT 0,
      onboarding_status TEXT DEFAULT 'not_started',
      business_type TEXT,
      primary_website TEXT,
      demo_data_loaded INTEGER DEFAULT 0,
      widget_installed INTEGER DEFAULT 0,
      first_successful_conversation TEXT,
      started_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS widget_configs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
      theme TEXT DEFAULT 'light' CHECK (theme IN ('light','dark','auto')),
      position TEXT DEFAULT 'right' CHECK (position IN ('right','left','bottom-right','bottom-left')),
      primary_color TEXT DEFAULT '#3B82F6',
      logo_url TEXT,
      company_name TEXT NOT NULL,
      greeting TEXT DEFAULT 'Hello! How can I help you today?',
      launcher_text TEXT DEFAULT 'Chat with us',
      allowed_domains TEXT DEFAULT '[]',
      auto_open INTEGER DEFAULT 0,
      auto_open_delay INTEGER DEFAULT 3,
      custom_css TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      event TEXT NOT NULL,
      properties TEXT DEFAULT '{}',
      occurred_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
      plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','starter','professional','enterprise')),
      status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('active','trialing','past_due','cancelled','expired')),
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      current_period_start TEXT NOT NULL,
      current_period_end TEXT NOT NULL,
      trial_start TEXT,
      trial_end TEXT,
      cancelled_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_tenant_event ON analytics_events(tenant_id, event);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
  `);

  // Onboarding columns (additive, safe to re-run)
  try { db.exec(`ALTER TABLE onboarding_progress ADD COLUMN skipped_steps TEXT NOT NULL DEFAULT '[]';`); } catch {}
  try { db.exec(`ALTER TABLE onboarding_progress ADD COLUMN completion_percentage INTEGER DEFAULT 0;`); } catch {}
  try { db.exec(`ALTER TABLE onboarding_progress ADD COLUMN onboarding_status TEXT DEFAULT 'not_started' CHECK (onboarding_status IN ('not_started','in_progress','completed','skipped'));`); } catch {}
  try { db.exec(`ALTER TABLE onboarding_progress ADD COLUMN first_successful_conversation TEXT;`); } catch {}

  // Paddle billing tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      paddle_invoice_id TEXT UNIQUE NOT NULL,
      subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      paid_at TEXT,
      due_at TEXT,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      paddle_payment_id TEXT UNIQUE NOT NULL,
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT 'pending',
      method TEXT,
      paid_at TEXT,
      created_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS billing_events (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      paddle_event_id TEXT UNIQUE NOT NULL,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'received',
      payload TEXT NOT NULL DEFAULT '{}',
      processed_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Paddle columns (additive, safe to re-run)
  try { db.exec(`ALTER TABLE tenants ADD COLUMN paddle_customer_id TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE subscriptions ADD COLUMN paddle_customer_id TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE subscriptions ADD COLUMN paddle_subscription_id TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE subscriptions ADD COLUMN paddle_price_id TEXT;`); } catch {}

  // Auth feature columns (additive, safe to re-run with try-catch)
  try { db.exec(`ALTER TABLE users ADD COLUMN verification_token TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN verification_token_expiry TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN reset_token TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN reset_token_expiry TEXT;`); } catch {}

  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);`); } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);`); } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_billing_events_paddle ON billing_events(paddle_event_id);`); } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle ON subscriptions(paddle_subscription_id);`); } catch {}

  // ─── Customer Activation ─────────────────────────────────────

  db.exec(`
    CREATE TABLE IF NOT EXISTS unanswered_questions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      conversation_id TEXT NOT NULL,
      question TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 0,
      retrieval_status TEXT DEFAULT 'unanswered' CHECK (retrieval_status IN ('unanswered','partial','retrieved')),
      escalation_status TEXT DEFAULT 'none' CHECK (escalation_status IN ('none','pending','escalated','resolved')),
      resolved_at TEXT,
      cluster_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS unanswered_question_clusters (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      topic TEXT NOT NULL,
      question_pattern TEXT NOT NULL,
      occurrence_count INTEGER DEFAULT 1,
      avg_confidence REAL DEFAULT 0,
      resolution_count INTEGER DEFAULT 0,
      last_occurrence_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_suggestions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      cluster_id TEXT REFERENCES unanswered_question_clusters(id) ON DELETE SET NULL,
      suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('add_document','update_faq','improve_answer','new_topic')),
      title TEXT NOT NULL,
      description TEXT,
      impact_score REAL DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK (status IN ('active','applied','dismissed')),
      occurrence_count INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS citation_analytics (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      document_id TEXT NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
      total_citations INTEGER DEFAULT 0,
      unique_conversations INTEGER DEFAULT 0,
      avg_confidence REAL DEFAULT 0,
      last_cited_at TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(tenant_id, document_id)
    );

    CREATE TABLE IF NOT EXISTS conversation_insights (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      total_conversations INTEGER DEFAULT 0,
      total_messages INTEGER DEFAULT 0,
      ai_responses INTEGER DEFAULT 0,
      human_escalations INTEGER DEFAULT 0,
      containment_rate REAL DEFAULT 0,
      avg_confidence REAL DEFAULT 0,
      avg_conversation_length REAL DEFAULT 0,
      avg_sentiment REAL DEFAULT 0,
      top_intents TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      UNIQUE(tenant_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_unanswered_tenant ON unanswered_questions(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_unanswered_created ON unanswered_questions(created_at);
    CREATE INDEX IF NOT EXISTS idx_unanswered_cluster ON unanswered_questions(cluster_id);
    CREATE INDEX IF NOT EXISTS idx_unanswered_clusters_tenant ON unanswered_question_clusters(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_kb_suggestions_tenant ON knowledge_suggestions(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_citation_document ON citation_analytics(document_id);
    CREATE INDEX IF NOT EXISTS idx_citation_tenant ON citation_analytics(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_insights_tenant_date ON conversation_insights(tenant_id, date);
  `);

  // ─── Enterprise Tables ─────────────────────────────────────

  db.exec(`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner','admin','support_agent','viewer')),
      invited_by TEXT NOT NULL,
      joined_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(tenant_id, user_id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner','admin','support_agent','viewer')),
      token TEXT UNIQUE NOT NULL,
      invited_by TEXT NOT NULL,
      invited_by_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','cancelled')),
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_history (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id TEXT,
      user_name TEXT,
      event_type TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      details TEXT NOT NULL DEFAULT '',
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      events TEXT NOT NULL DEFAULT '[]',
      signing_secret TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      last_success_at TEXT,
      last_failure_at TEXT,
      consecutive_failures INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id TEXT PRIMARY KEY,
      webhook_id TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','delivering','delivered','failed')),
      response_code INTEGER,
      response_body TEXT,
      attempt INTEGER DEFAULT 1,
      max_attempts INTEGER DEFAULT 3,
      next_retry_at TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS uptime_history (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      uptime_percentage REAL NOT NULL DEFAULT 100,
      downtime_seconds INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS security_status (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'secure' CHECK (status IN ('secure','ats_risk','needs_attention','critical')),
      last_scan_at TEXT NOT NULL,
      findings TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(tenant_id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
      status TEXT DEFAULT 'investigating' CHECK (status IN ('investigating','identified','monitoring','resolved')),
      resolved_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS compliance_documents (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      document_type TEXT NOT NULL,
      title TEXT NOT NULL,
      file_url TEXT NOT NULL,
      version TEXT NOT NULL,
      effective_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS dpa_documents (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      version TEXT NOT NULL,
      signed_at TEXT,
      expires_at TEXT,
      file_url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS subprocessors (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      purpose TEXT NOT NULL,
      location TEXT NOT NULL,
      data_processed TEXT NOT NULL,
      status TEXT DEFAULT 'active' CHECK (status IN ('active','retired')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_team_members_tenant ON team_members(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_invitations_tenant ON invitations(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
    CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
    CREATE INDEX IF NOT EXISTS idx_activity_tenant ON activity_history(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_history(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON webhooks(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at);
    CREATE INDEX IF NOT EXISTS idx_uptime_tenant_date ON uptime_history(tenant_id, date);
    CREATE INDEX IF NOT EXISTS idx_incidents_tenant ON incidents(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_compliance_docs_tenant ON compliance_documents(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_subprocessors_tenant ON subprocessors(tenant_id);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS topic_response_templates (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      topic TEXT NOT NULL,
      depth INTEGER NOT NULL,
      answer TEXT NOT NULL,
      sources TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(tenant_id, topic, depth)
    );
    CREATE INDEX IF NOT EXISTS idx_trt_tenant_topic ON topic_response_templates(tenant_id, topic);
  `);
}
