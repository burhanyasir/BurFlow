'use strict';

/**
 * Migration runner core for the BurFlow PostgreSQL schema.
 *
 * Backend-agnostic: it talks to a minimal adapter —
 *   adapter.query(sql, params?) -> Promise<{ rows }>
 *   adapter.exec(sql)           -> Promise<void>   (multi-statement DDL)
 * — so the same code drives a real `pg` client (production `DATABASE_URL`)
 * and PGlite (fast semantic tests). PGlite is a TEST backend only and is
 * never selected from `DATABASE_URL`; the CLI always uses `pg`.
 *
 * Migration identity is the zero-padded version parsed from the filename
 * (`NNN_name.sql`). Every migration runs inside a transaction and is recorded
 * in `schema_migrations` only after it fully succeeds. Nothing here drops,
 * truncates, or recreates existing objects, and reruns are clean no-ops.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_MIGRATION_DIR = path.join(__dirname, '..', 'migrations');
const DEFAULT_ENV_FILE = path.join(__dirname, '..', '.env');

/**
 * Load KEY=VALUE lines from engine/.env into process.env for unset keys only.
 * Values are never printed or returned. engine/.env is gitignored (see
 * engine/.gitignore: `*.env*` except `.env.example`).
 */
function loadLocalEnvFile(envFile = DEFAULT_ENV_FILE) {
  if (!fs.existsSync(envFile)) return;
  let text;
  try {
    text = fs.readFileSync(envFile, 'utf8');
  } catch {
    return;
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) {
      // Strip surrounding quotes (dotenv-style) but keep the rest verbatim.
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

const MIGRATION_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

/** Parse `migrations/*.sql` deterministically. Throws on malformed/duplicate names. */
function listMigrations(dir = DEFAULT_MIGRATION_DIR) {
  if (!fs.existsSync(dir)) {
    return { error: `migration directory not found: ${dir}`, migrations: [] };
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const migrations = [];
  const seen = new Set();
  for (const file of files) {
    const m = /^(\d+)_([a-zA-Z0-9_-]+)\.sql$/.exec(file);
    if (!m) {
      throw new Error(`malformed migration filename: "${file}" (expected NNN_name.sql)`);
    }
    const version = Number(m[1]);
    if (seen.has(version)) {
      throw new Error(`duplicate migration version ${version} (${file})`);
    }
    seen.add(version);
    migrations.push({
      version,
      versionText: String(version).padStart(3, '0'),
      name: m[2],
      file,
      sql: fs.readFileSync(path.join(dir, file), 'utf8'),
    });
  }
  migrations.sort((a, b) => a.version - b.version);
  return { error: null, migrations };
}

async function connectPg(databaseUrl, timeoutMs = 15000) {
  const { Client } = require('pg');
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: timeoutMs,
    // sslmode is honored from the connection string (e.g. ?sslmode=require)
  });
  await client.connect();
  return client;
}

function makePgAdapter(client) {
  return {
    kind: 'pg',
    async query(sql, params) {
      const r = await client.query(sql, params || []);
      return { rows: r.rows };
    },
    async exec(sql) {
      await client.query(sql);
    },
  };
}

function makePgliteAdapter(db) {
  return {
    kind: 'pglite',
    async query(sql, params) {
      const r = await db.query(sql, params || []);
      return { rows: r.rows };
    },
    async exec(sql) {
      await db.exec(sql);
    },
  };
}

async function ensureMigrationTable(adapter) {
  await adapter.exec(MIGRATION_TABLE_SQL);
}

async function getAppliedVersions(adapter) {
  const r = await adapter.query(
    'SELECT version, name, applied_at FROM schema_migrations ORDER BY version',
  );
  return r.rows.map((row) => ({ version: row.version, name: row.name, appliedAt: row.applied_at }));
}

/** Execute one migration transactionally; record only on success. */
async function runMigration(adapter, migration) {
  await adapter.query('BEGIN');
  try {
    await adapter.exec(migration.sql);
    await adapter.query(
      'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
      [migration.versionText, migration.name],
    );
    await adapter.query('COMMIT');
  } catch (err) {
    try {
      await adapter.query('ROLLBACK');
    } catch {
      // connection may be gone — the original error is what matters
    }
    throw err;
  }
}

/**
 * Report schema drift without touching anything:
 *  - applied versions with no matching migration file (removed/orphaned)
 *  - file versions below the highest applied version that are not applied
 *    (a hole — applying them now would be out of order)
 */
function detectDrift(migrations, applied) {
  const drift = [];
  const appliedVersions = new Set(applied.map((a) => a.version));
  const fileVersions = new Set(migrations.map((m) => m.versionText));
  const maxApplied = applied.reduce((max, a) => (a.version > max ? a.version : max), '0');
  for (const a of applied) {
    if (!fileVersions.has(a.version)) {
      drift.push(`applied migration ${a.version} (${a.name}) has no matching file`);
    }
  }
  for (const m of migrations) {
    if (m.versionText < maxApplied && !appliedVersions.has(m.versionText)) {
      drift.push(`migration file ${m.versionText}_${m.name}.sql is below the highest applied version (${maxApplied}) and has not been applied`);
    }
  }
  return drift;
}

/**
 * Apply all pending migrations. Returns:
 *   { executed: [versionText], applied: [versionText], pending: [versionText], drift: [string], error: string|null }
 */
async function migrate(adapter, dir = DEFAULT_MIGRATION_DIR) {
  const listed = listMigrations(dir);
  if (listed.error) {
    return { error: listed.error, executed: [], applied: [], pending: [], drift: [] };
  }
  await ensureMigrationTable(adapter);
  const applied = await getAppliedVersions(adapter);
  const appliedSet = new Set(applied.map((a) => a.version));
  const pending = listed.migrations.filter((m) => !appliedSet.has(m.versionText));
  const executed = [];
  for (const m of pending) {
    await runMigration(adapter, m);
    executed.push(m.versionText);
  }
  const drift = detectDrift(listed.migrations, applied);
  return {
    error: null,
    executed,
    applied: [...applied.map((a) => a.version), ...executed],
    pending: pending.map((m) => m.versionText),
    drift,
  };
}

/** Current status of every migration file vs the database. */
async function migrationStatus(adapter, dir = DEFAULT_MIGRATION_DIR) {
  const listed = listMigrations(dir);
  if (listed.error) {
    return { error: listed.error, rows: [] };
  }
  await ensureMigrationTable(adapter);
  const applied = await getAppliedVersions(adapter);
  const appliedByVersion = new Map(applied.map((a) => [a.version, a]));
  const rows = listed.migrations.map((m) => ({
    version: m.versionText,
    name: m.name,
    file: m.file,
    appliedAt: appliedByVersion.has(m.versionText) ? appliedByVersion.get(m.versionText).appliedAt : null,
  }));
  return { error: null, rows };
}

module.exports = {
  DEFAULT_MIGRATION_DIR,
  DEFAULT_ENV_FILE,
  loadLocalEnvFile,
  listMigrations,
  connectPg,
  makePgAdapter,
  makePgliteAdapter,
  ensureMigrationTable,
  getAppliedVersions,
  runMigration,
  detectDrift,
  migrate,
  migrationStatus,
};
