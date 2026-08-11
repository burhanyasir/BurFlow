#!/usr/bin/env node
'use strict';

/**
 * `npm run db:migrate` — explicit deployment operation.
 *
 * Reads DATABASE_URL, applies pending migrations from engine/migrations in
 * deterministic order, records each in schema_migrations only after success,
 * then verifies the resulting schema against the migration SQL. Fails loudly
 * (non-zero exit) on any error and never prints the connection string or
 * password. Startup never calls this — migration is an explicit step.
 */

const {
  connectPg,
  makePgAdapter,
  migrate,
  loadLocalEnvFile,
} = require('./migrate-core');
const { verifySchema } = require('./verify-schema');

// Allow DATABASE_URL to live in the gitignored engine/.env (see .env.example).
loadLocalEnvFile();

function sanitizedTarget(url) {
  // Only ever show a redacted host hint, never credentials.
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}`;
  } catch {
    return '(postgres)';
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith('postgres')) {
    console.error('db:migrate: DATABASE_URL is not set (expected a postgres:// or postgresql:// URL)');
    process.exit(1);
  }

  console.error(`db:migrate: connecting to ${sanitizedTarget(url)} ...`);
  const client = await connectPg(url);
  const adapter = makePgAdapter(client);
  try {
    const result = await migrate(adapter);
    if (result.error) {
      console.error(`db:migrate: ${result.error}`);
      process.exit(1);
    }

    if (result.executed.length === 0) {
      console.error('db:migrate: no pending migrations (database is up to date)');
    } else {
      for (const v of result.executed) {
        console.error(`db:migrate: applied ${v}`);
      }
    }

    if (result.drift.length > 0) {
      console.error('db:migrate: WARNING — schema drift detected (not modified):');
      for (const d of result.drift) {
        console.error(`  - ${d}`);
      }
    }

    console.error('db:migrate: verifying schema ...');
    const check = await verifySchema(adapter);
    if (check.errors.length > 0) {
      console.error(`db:migrate: schema verification FAILED with ${check.errors.length} issue(s):`);
      for (const e of check.errors) {
        console.error(`  - ${e}`);
      }
      process.exit(1);
    }
    console.error(
      `db:migrate: schema verified OK — ${check.summary.tables} tables, ${check.summary.columns} columns, ${check.summary.indexes} explicit indexes`,
    );
    process.exit(0);
  } catch (err) {
    console.error(`db:migrate: FAILED — ${err && err.message ? err.message : String(err)}`);
    process.exit(1);
  } finally {
    try { await client.end(); } catch { /* ignore */ }
  }
}

main().catch((err) => {
  console.error(`db:migrate: ${err && err.message ? err.message : String(err)}`);
  process.exit(1);
});
