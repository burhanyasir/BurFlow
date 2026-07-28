/**
 * Database migration runner.
 * Usage: npx ts-node scripts/migrate.ts [up|down|seed|backup|restore]
 */
import { createDatabase } from '@conversation-engine/saas-core';
import { join } from 'path';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'fs';

const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'data', 'saas.db');
const BACKUP_DIR = process.env.DB_BACKUP_DIR || join(__dirname, '..', 'backups');
const RETENTION_DAYS = parseInt(process.env.DB_BACKUP_RETENTION_DAYS || '30', 10);

function migrateUp(): void {
  console.log(`[migrate] Running migrations on ${DB_PATH}`);
  const db = createDatabase(DB_PATH);
  console.log('[migrate] Database schema is up to date (auto-migrated on connect)');
  db.close();
}

function migrateDown(): void {
  console.log('[migrate] Down migrations not supported — schema is auto-managed.');
  console.log('[migrate] To reset, delete the database file and re-run migrate up.');
}

function seed(): void {
  console.log('[seed] Seeding database...');
  const db = createDatabase(DB_PATH);
  const { hashPassword, generateId } = require('@conversation-engine/saas-core');
  const now = new Date().toISOString();

  try {
    const adminId = generateId();
    const tenantId = generateId();
    const passwordHash = hashPassword('admin123');

    db.prepare(`INSERT OR IGNORE INTO users (id, email, password_hash, name, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)`).run(adminId, 'admin@example.com', passwordHash, 'Admin', now, now);
    db.prepare(`INSERT OR IGNORE INTO tenants (id, name, slug, owner_id, plan, subscription_status, trial_ends_at, settings, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'professional', 'active', ?, '{}', ?, ?)`)
      .run(tenantId, 'Demo Company', `demo-${tenantId.slice(0, 6)}`, adminId,
        new Date(Date.now() + 365 * 86400000).toISOString(), now, now);
    db.prepare(`INSERT OR IGNORE INTO subscriptions (id, tenant_id, plan, status, current_period_start, current_period_end, created_at, updated_at)
      VALUES (?, ?, 'professional', 'active', ?, ?, ?, ?)`)
      .run(generateId(), tenantId, now, new Date(Date.now() + 30 * 86400000).toISOString(), now, now);
    console.log('[seed] Created admin user: admin@example.com / admin123');
    console.log(`[seed] Created tenant: Demo Company (${tenantId})`);
  } catch (err: any) {
    console.error('[seed] Error:', err.message);
  }
  db.close();
}

function backup(): void {
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = join(BACKUP_DIR, `saas-${timestamp}.db`);
  copyFileSync(DB_PATH, dest);
  console.log(`[backup] Created backup: ${dest}`);

  // Clean old backups
  const files = readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('saas-'))
    .map(f => ({ name: f, time: join(BACKUP_DIR, f) }))
    .sort((a, b) => b.name.localeCompare(a.name));
  const cutoff = Date.now() - RETENTION_DAYS * 86400000;
  for (const f of files) {
    const stat = existsSync(f.time) ? require('fs').statSync(f.time) : null;
    if (stat && stat.mtimeMs < cutoff) {
      require('fs').unlinkSync(f.time);
      console.log(`[backup] Removed old backup: ${f.name}`);
    }
  }
}

function restore(): void {
  const args = process.argv.slice(3);
  const source = args[0];
  if (!source) {
    console.error('[restore] Usage: npx ts-node scripts/migrate.ts restore <backup-file>');
    process.exit(1);
  }
  if (!existsSync(source)) {
    console.error(`[restore] Backup file not found: ${source}`);
    process.exit(1);
  }
  copyFileSync(source, DB_PATH);
  console.log(`[restore] Restored ${source} → ${DB_PATH}`);
}

const command = process.argv[2] || 'up';
switch (command) {
  case 'up': migrateUp(); break;
  case 'down': migrateDown(); break;
  case 'seed': seed(); break;
  case 'backup': backup(); break;
  case 'restore': restore(); break;
  default:
    console.log('Usage: npx ts-node scripts/migrate.ts [up|down|seed|backup|restore]');
    process.exit(1);
}
