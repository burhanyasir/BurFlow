#!/usr/bin/env node
'use strict';

/**
 * `npm run db:migrate:status` — show which migrations are applied vs pending.
 */

const {
  connectPg,
  makePgAdapter,
  migrationStatus,
  loadLocalEnvFile,
} = require('./migrate-core');

// Allow DATABASE_URL to live in the gitignored engine/.env (see .env.example).
loadLocalEnvFile();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith('postgres')) {
    console.error('db:migrate:status: DATABASE_URL is not set (expected a postgres:// or postgresql:// URL)');
    process.exit(1);
  }

  const client = await connectPg(url);
  const adapter = makePgAdapter(client);
  try {
    const result = await migrationStatus(adapter);
    if (result.error) {
      console.error(`db:migrate:status: ${result.error}`);
      process.exit(1);
    }
    console.error('Migration status:');
    for (const row of result.rows) {
      const state = row.appliedAt ? `applied  (${String(row.appliedAt)})` : 'pending ';
      console.error(`  ${row.version}  ${row.name.padEnd(32)} ${state}`);
    }
    const applied = result.rows.filter((r) => r.appliedAt).length;
    console.error(`${applied}/${result.rows.length} migrations applied`);
    process.exit(0);
  } catch (err) {
    console.error(`db:migrate:status: FAILED — ${err && err.message ? err.message : String(err)}`);
    process.exit(1);
  } finally {
    try { await client.end(); } catch { /* ignore */ }
  }
}

main().catch((err) => {
  console.error(`db:migrate:status: ${err && err.message ? err.message : String(err)}`);
  process.exit(1);
});
