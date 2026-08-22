-- Migration 005: Ensure support and payment tables exist
-- The database was reset at some point and these tables were lost even though
-- migration 004 was recorded as applied. This migration re-creates them
-- idempotently so it's safe to run on any database state.

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  user_email TEXT NOT NULL,
  user_name TEXT,
  subject TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'dashboard',
  status TEXT DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_source ON support_tickets(source);

CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  sender_type TEXT NOT NULL,
  sender_email TEXT,
  content TEXT NOT NULL,
  attachment_url TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id);

CREATE TABLE IF NOT EXISTS payment_confirmations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  user_email TEXT NOT NULL,
  requested_plan TEXT NOT NULL,
  billing_period TEXT DEFAULT 'monthly',
  amount TEXT NOT NULL,
  currency TEXT DEFAULT 'PKR',
  wallet_account TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT DEFAULT 'pending',
  owner_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_confirmations_status ON payment_confirmations(status);
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_tenant ON payment_confirmations(tenant_id);
