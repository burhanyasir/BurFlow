const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH = process.env.AGENCY_DB_PATH || path.join(__dirname, "..", "..", "agency.db");

let db;

function getDb() {
  if (db) return db;
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate();
  return db;
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      website TEXT,
      industry TEXT DEFAULT 'dental',
      status TEXT DEFAULT 'lead' CHECK(status IN ('lead','prospect','onboarding','active','suspended','churned')),
      pipeline_stage TEXT DEFAULT 'discovery' CHECK(pipeline_stage IN ('discovery','proposal','negotiation','closed_won','closed_lost')),
      source TEXT DEFAULT 'inbound' CHECK(source IN ('referral','inbound','outreach','partner')),
      monthly_budget INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL UNIQUE,
      subdomain TEXT UNIQUE,
      custom_domain TEXT,
      brand_name TEXT,
      brand_logo_url TEXT DEFAULT '',
      brand_primary_color TEXT DEFAULT '#0a66c2',
      brand_secondary_color TEXT DEFAULT '#00b894',
      chatbot_title TEXT DEFAULT 'AI Assistant',
      chatbot_greeting TEXT DEFAULT 'Hi! How can I help you today?',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chatbot_configs (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      config TEXT DEFAULT '{}',
      services TEXT DEFAULT '[]',
      faqs TEXT DEFAULT '[]',
      team TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      title TEXT DEFAULT 'Proposal',
      content TEXT DEFAULT '',
      pricing TEXT DEFAULT '[]',
      total_cents INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','sent','accepted','rejected')),
      sent_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      amount_cents INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','paid','overdue','cancelled')),
      due_date TEXT,
      paid_at TEXT,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS onboarding_tasks (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      task TEXT NOT NULL,
      category TEXT DEFAULT 'setup' CHECK(category IN ('setup','content','branding','deployment')),
      is_completed INTEGER DEFAULT 0,
      completed_at TEXT,
      assigned_to TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scanner_results (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      url TEXT NOT NULL,
      raw_data TEXT DEFAULT '{}',
      services_found TEXT DEFAULT '[]',
      faqs_found TEXT DEFAULT '[]',
      team_found TEXT DEFAULT '[]',
      pages_scanned INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','scanning','complete','failed')),
      error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );
  `);
}

function close() {
  if (db) { db.close(); db = null; }
}

module.exports = { getDb, close };
