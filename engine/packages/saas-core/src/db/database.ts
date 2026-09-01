import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export function createDatabase(dbPath: string): Database.Database {
  const dir = dirname(dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
  db.pragma('foreign_keys = ON');
  migrate(db);
  setupWalCheckpointing(db, dbPath);
  return db;
}

const WAL_CHECKPOINT_INTERVAL_MS = 15 * 60 * 1000;

let walCheckpointStarted = false;

function setupWalCheckpointing(db: Database.Database, dbPath: string): void {
  if (walCheckpointStarted) return;
  walCheckpointStarted = true;

  const interval = setInterval(() => {
    try {
      const rows = db.pragma('wal_checkpoint(PASSIVE)') as Array<Record<string, unknown>>;
      let hasFrames = false;
      let busy = 0;
      for (const row of rows) {
        const ckpt = Number(row.ckpt ?? 0);
        busy += Number(row.busy ?? 0);
        if (ckpt > 0) hasFrames = true;
      }
      if (hasFrames) {
        console.warn(`[db] WAL checkpoint for ${dbPath} processed frames; busy=${busy}`);
      } else if (busy > 0) {
        console.warn(`[db] WAL checkpoint for ${dbPath} skipped ${busy} busy frames (could not checkpoint without contention)`);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[db] WAL checkpoint failed for ${dbPath}: ${msg}`);
    }
  }, WAL_CHECKPOINT_INTERVAL_MS);

  if (typeof interval.unref === 'function') {
    interval.unref();
  }
}

const LEADS_TABLE_DDL = `
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL,
      conversation_id TEXT,
      email TEXT,
      phone TEXT,
      name TEXT,
      company TEXT,
      qualification_status TEXT DEFAULT 'unqualified' CHECK (qualification_status IN ('unqualified','marketing_qualified','sales_qualified','disqualified')),
      lead_score INTEGER DEFAULT 0,
      buying_intent TEXT DEFAULT 'low' CHECK (buying_intent IN ('low','medium','high')),
      source TEXT DEFAULT 'chat' CHECK (source IN ('chat','form','api','whatsapp')),
      metadata TEXT DEFAULT '{}',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_leads_session ON leads(session_id);
    CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
    CREATE INDEX IF NOT EXISTS idx_leads_qualification ON leads(qualification_status);
  `;

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
      subscription_period_end TEXT,
      trial_ends_at TEXT,
      settings TEXT DEFAULT '{}',
      parent_tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
      custom_domain TEXT,
      white_label_branding TEXT DEFAULT '{}',
      notification_email TEXT,
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
      status TEXT DEFAULT 'active' CHECK (status IN ('active','ended','escalated')),
      session_state TEXT DEFAULT 'ai_managed' CHECK (session_state IN ('ai_managed','human_takeover','closed')),
      assigned_agent_id TEXT,
      takeover_at TEXT,
      updated_at TEXT,
      flagged INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      notes TEXT DEFAULT '[]'
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
      sender TEXT CHECK (sender IN ('agent','bot')),
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
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','published','queued','deleted')),
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
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','published','queued','deleted')),
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
      business_profile TEXT,
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
      primary_color TEXT DEFAULT '#006248',
      logo_url TEXT,
      company_name TEXT NOT NULL,
      greeting TEXT DEFAULT 'Hello! How can I help you today?',
      launcher_text TEXT DEFAULT 'Chat with us',
      allowed_domains TEXT DEFAULT '[]',
      auto_open INTEGER DEFAULT 0,
      auto_open_delay INTEGER DEFAULT 3,
      business_profile TEXT,
      starter_options TEXT,
      custom_css TEXT,
      notification_email TEXT,
      slack_webhook_url TEXT,
      custom_webhook_url TEXT,
      alert_emails TEXT,
      notify_threshold TEXT DEFAULT 'all' CHECK (notify_threshold IN ('all','sales_qualified_only')),
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
      stripe_price_id TEXT,
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
  try { db.exec(`ALTER TABLE onboarding_progress ADD COLUMN business_profile TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE onboarding_progress ADD COLUMN first_successful_conversation TEXT;`); } catch {}

  // Message sender column (additive, safe to re-run) — distinguishes operator
  // replies (sender='agent') from AI-generated assistant messages.
  try { db.exec(`ALTER TABLE messages ADD COLUMN sender TEXT CHECK (sender IN ('agent','bot'));`); } catch {}

  // Session management columns (additive, safe to re-run)
  try { db.exec(`ALTER TABLE conversations ADD COLUMN updated_at TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE conversations ADD COLUMN flagged INTEGER DEFAULT 0;`); } catch {}
  try { db.exec(`ALTER TABLE conversations ADD COLUMN archived INTEGER DEFAULT 0;`); } catch {}
  try { db.exec(`ALTER TABLE conversations ADD COLUMN tags TEXT DEFAULT '[]';`); } catch {}
  try { db.exec(`ALTER TABLE conversations ADD COLUMN notes TEXT DEFAULT '[]';`); } catch {}

  // Relax the conversations.status CHECK to also accept the CRM pipeline
  // statuses agents set from the admin detail page (new/working/qualified/
  // won/lost) alongside the engine lifecycle states (active/ended/escalated).
  // SQLite can't ALTER a CHECK, so rebuild the table when the old constraint is
  // present. Runs once per database, then no-ops.
  const convDdl = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='conversations'`).get() as { sql: string } | undefined;
  if (convDdl && convDdl.sql.includes(`CHECK (status IN ('active','ended','escalated'))`)) {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      BEGIN;
      CREATE TABLE conversations_migrated (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL,
        user_id TEXT,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        message_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active' CHECK (status IN ('active','ended','escalated','new','working','qualified','won','lost')),
        session_state TEXT DEFAULT 'ai_managed' CHECK (session_state IN ('ai_managed','human_takeover','closed')),
        assigned_agent_id TEXT,
        takeover_at TEXT,
        updated_at TEXT,
        flagged INTEGER DEFAULT 0,
        archived INTEGER DEFAULT 0,
        tags TEXT DEFAULT '[]',
        notes TEXT DEFAULT '[]'
      );
      INSERT INTO conversations_migrated SELECT id, tenant_id, session_id, user_id, started_at, ended_at, message_count, status, session_state, assigned_agent_id, takeover_at, updated_at, flagged, archived, tags, notes FROM conversations;
      DROP TABLE conversations;
      ALTER TABLE conversations_migrated RENAME TO conversations;
      CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
      COMMIT;
      PRAGMA foreign_keys=ON;
    `);
  }

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
  try { db.exec(`ALTER TABLE tenants ADD COLUMN subscription_period_end TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE subscriptions ADD COLUMN paddle_customer_id TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE subscriptions ADD COLUMN paddle_subscription_id TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE subscriptions ADD COLUMN paddle_price_id TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE subscriptions ADD COLUMN stripe_price_id TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE subscriptions ADD COLUMN paddle_product_id TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE subscriptions ADD COLUMN scheduled_change_action TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE subscriptions ADD COLUMN scheduled_change_at TEXT;`); } catch {}

  // Paddle customers — maps a Paddle customer (id + email) to a workspace so
  // webhook events can resolve the tenant even without custom_data.
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      customer_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
  `);

  // Relax the subscriptions CHECK constraints: the modern Paddle catalog uses
  // plan ids 'pro'/'advanced', and Paddle reports 'paused' subscriptions.
  // SQLite can't ALTER a CHECK, so rebuild the table when the old constraint is
  // present (mirrors the conversations.status rebuild above).
  const subDdl = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='subscriptions'`).get() as { sql: string } | undefined;
  if (subDdl && subDdl.sql.includes(`CHECK (plan IN ('free','starter','professional','enterprise'))`)) {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      BEGIN;
      CREATE TABLE subscriptions_migrated (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
        plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','starter','professional','enterprise','pro','advanced')),
        status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('active','trialing','past_due','cancelled','expired','paused')),
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        stripe_price_id TEXT,
        paddle_customer_id TEXT,
        paddle_subscription_id TEXT,
        paddle_price_id TEXT,
        paddle_product_id TEXT,
        scheduled_change_action TEXT,
        scheduled_change_at TEXT,
        current_period_start TEXT NOT NULL,
        current_period_end TEXT NOT NULL,
        trial_start TEXT,
        trial_end TEXT,
        cancelled_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO subscriptions_migrated SELECT id, tenant_id, plan, status, stripe_customer_id, stripe_subscription_id, stripe_price_id, paddle_customer_id, paddle_subscription_id, paddle_price_id, paddle_product_id, scheduled_change_action, scheduled_change_at, current_period_start, current_period_end, trial_start, trial_end, cancelled_at, created_at, updated_at FROM subscriptions;
      DROP TABLE subscriptions;
      ALTER TABLE subscriptions_migrated RENAME TO subscriptions;
      CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle ON subscriptions(paddle_subscription_id);
      COMMIT;
      PRAGMA foreign_keys=ON;
    `);
  }

  // Auth feature columns (additive, safe to re-run with try-catch)
  try { db.exec(`ALTER TABLE users ADD COLUMN verification_token TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN verification_token_expiry TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN reset_token TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN reset_token_expiry TEXT;`); } catch {}

  // Starter options column (additive, safe to re-run)
  try { db.exec(`ALTER TABLE widget_configs ADD COLUMN starter_options TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE widget_configs ADD COLUMN suggested_actions TEXT;`); } catch {}

  // Lead notification columns (additive, safe to re-run)
  try { db.exec(`ALTER TABLE widget_configs ADD COLUMN notification_email TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE widget_configs ADD COLUMN slack_webhook_url TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE widget_configs ADD COLUMN notify_threshold TEXT DEFAULT 'all';`); } catch {}

  // Branding column (additive, safe to re-run)
  try { db.exec(`ALTER TABLE widget_configs ADD COLUMN avatar_url TEXT;`); } catch {}

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

  db.exec(`
    CREATE TABLE IF NOT EXISTS handoff_requests (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL,
      visitor_email TEXT,
      conversation_summary TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','resolved')),
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      resolved_by TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_handoff_tenant ON handoff_requests(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_handoff_status ON handoff_requests(status);
    CREATE INDEX IF NOT EXISTS idx_handoff_session ON handoff_requests(session_id);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL,
      conversation_id TEXT,
      email TEXT,
      phone TEXT,
      name TEXT,
      company TEXT,
      qualification_status TEXT DEFAULT 'unqualified' CHECK (qualification_status IN ('unqualified','marketing_qualified','sales_qualified','disqualified')),
      lead_score INTEGER DEFAULT 0,
      buying_intent TEXT DEFAULT 'low' CHECK (buying_intent IN ('low','medium','high')),
      source TEXT DEFAULT 'chat' CHECK (source IN ('chat','form','api','whatsapp')),
      metadata TEXT DEFAULT '{}',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_leads_session ON leads(session_id);
    CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
    CREATE INDEX IF NOT EXISTS idx_leads_qualification ON leads(qualification_status);
  `);

  // WhatsApp channel source — rebuild the table only when a legacy DB still
  // carries the old CHECK constraint that rejects 'whatsapp' (additive, safe).
  try {
    const leadDdl: string = (db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='leads'`).get() as any)?.sql || '';
    if (leadDdl.includes('CHECK (source IN') && !leadDdl.includes('whatsapp')) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        ALTER TABLE leads RENAME TO leads_legacy;
        ${LEADS_TABLE_DDL};
        INSERT INTO leads SELECT * FROM leads_legacy;
        DROP TABLE leads_legacy;
        PRAGMA foreign_keys = ON;
      `);
    }
  } catch (err: any) {
    console.warn(`[db] leads source migration skipped: ${err?.message || err}`);
  }

  // Analytics query indexes (additive, safe to re-run)
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_conversations_tenant_started ON conversations(tenant_id, started_at);`); } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_tenant_created ON messages(tenant_id, created_at);`); } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_leads_tenant_created_score ON leads(tenant_id, created_at, lead_score);`); } catch {}

  // Lead notes column (additive, safe to re-run)
  try { db.exec(`ALTER TABLE leads ADD COLUMN notes TEXT;`); } catch {}

  // Session handoff columns (additive, safe to re-run)
  try { db.exec(`ALTER TABLE conversations ADD COLUMN session_state TEXT DEFAULT 'ai_managed' CHECK (session_state IN ('ai_managed','human_takeover','closed'));`); } catch {}
  try { db.exec(`ALTER TABLE conversations ADD COLUMN assigned_agent_id TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE conversations ADD COLUMN takeover_at TEXT;`); } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_conversations_tenant_session_state ON conversations(tenant_id, session_state);`); } catch {}

  // Website scanner tables (additive, safe to re-run)
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS website_scans (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        root_url TEXT NOT NULL,
        status TEXT DEFAULT 'queued' CHECK (status IN ('queued','crawling','completed','failed','cancelled')),
        crawl_mode TEXT DEFAULT 'discover' CHECK (crawl_mode IN ('discover','update')),
        schedule TEXT DEFAULT 'manual' CHECK (schedule IN ('manual','daily','weekly')),
        max_depth INTEGER DEFAULT 3,
        page_limit INTEGER DEFAULT 50,
        pages_discovered INTEGER DEFAULT 0,
        pages_scanned INTEGER DEFAULT 0,
        pages_indexed INTEGER DEFAULT 0,
        pages_unchanged INTEGER DEFAULT 0,
        pages_added INTEGER DEFAULT 0,
        pages_updated INTEGER DEFAULT 0,
        pages_deleted INTEGER DEFAULT 0,
        brand_tone TEXT,
        primary_ctas TEXT DEFAULT '[]',
        confidence_score REAL,
        next_scan_at TEXT,
        last_error TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scanned_pages (
        id TEXT PRIMARY KEY,
        scan_id TEXT NOT NULL REFERENCES website_scans(id) ON DELETE CASCADE,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        title TEXT,
        content_hash TEXT,
        content TEXT,
        status TEXT DEFAULT 'unchanged' CHECK (status IN ('unchanged','added','updated','deleted')),
        crawled_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_website_scans_tenant ON website_scans(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_website_scans_next_scan ON website_scans(next_scan_at);
      CREATE INDEX IF NOT EXISTS idx_scanned_pages_scan ON scanned_pages(scan_id);
      CREATE INDEX IF NOT EXISTS idx_scanned_pages_tenant ON scanned_pages(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_scanned_pages_url ON scanned_pages(tenant_id, url);
    `);
  } catch (err: any) {
    console.warn(`[db] website scanner schema skipped: ${err?.message || err}`);
  }

  // Agency workspace columns (additive, safe to re-run)
  try { db.exec(`ALTER TABLE tenants ADD COLUMN parent_tenant_id TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE tenants ADD COLUMN custom_domain TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE tenants ADD COLUMN white_label_branding TEXT DEFAULT '{}';`); } catch {}
  try { db.exec(`ALTER TABLE tenants ADD COLUMN notification_email TEXT;`); } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_tenants_parent_tenant ON tenants(parent_tenant_id);`); } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON tenants(custom_domain);`); } catch {}

  // tenant_api_keys extended columns (additive, safe to re-run)
  try { db.exec(`ALTER TABLE tenant_api_keys ADD COLUMN created_by TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE tenant_api_keys ADD COLUMN permissions TEXT DEFAULT '[]';`); } catch {}
  try { db.exec(`ALTER TABLE tenant_api_keys ADD COLUMN total_requests INTEGER DEFAULT 0;`); } catch {}
  try { db.exec(`ALTER TABLE tenant_api_keys ADD COLUMN updated_at TEXT;`); } catch {}
  // C6: Per-tenant cost instrumentation
  try { db.exec(`ALTER TABLE usage_records ADD COLUMN cost_usd REAL DEFAULT 0;`); } catch {}
  try { db.exec(`ALTER TABLE messages ADD COLUMN tokens_used INTEGER DEFAULT 0;`); } catch {}
  try { db.exec(`ALTER TABLE messages ADD COLUMN cost_usd REAL DEFAULT 0;`); } catch {}
  // S1: Idempotency — prevent duplicate messages from retries
  try { db.exec(`ALTER TABLE messages ADD COLUMN idempotency_key TEXT;`); } catch {}
  try { db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_idempotency ON messages(conversation_id, idempotency_key) WHERE idempotency_key IS NOT NULL;`); } catch {}
}
