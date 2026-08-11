/**
 * Primary SaaS database selection — shared by saas-api and pipeline-orchestrator
 * so both services always talk to the SAME database backend:
 *
 *   DATABASE_URL set → PostgreSQL via `PgDatabase` (production/Neon).
 *   otherwise       → SQLite at `sqlitePath` (local/test fallback).
 *
 * Exactly one backend is ever active and DATABASE_URL always wins. In
 * production, DATABASE_URL is MANDATORY — a production process must never
 * silently fall back to SQLite for the primary SaaS database (that could make
 * production look healthy while writing to the wrong database).
 *
 * The app never auto-migrates: use `assertSaaSMigrationsApplied` to fail
 * loudly when a PostgreSQL database has not been migrated, and run
 * `npm run db:migrate` as an explicit deployment step.
 */
import { createDatabase } from './database';
import { PgDatabase } from './pg/pg-database';
import type { SqlDatabase } from './types';
import { isPostgresDatabase } from './types';

export interface CreatePrimaryDatabaseOptions {
  /** postgres:// or postgresql:// URL. When present, PostgreSQL is used. */
  databaseUrl?: string;
  /** Local SQLite fallback path — used ONLY when databaseUrl is absent. */
  sqlitePath: string;
  /** 'production' makes DATABASE_URL mandatory (no SQLite fallback). */
  nodeEnv?: string;
  /** Test seam: inject a PgDatabase factory instead of constructing one. */
  pgFactory?: (url: string) => SqlDatabase;
  /** PgDatabase connection timeout (test seam, default 10s). */
  connectionTimeoutMillis?: number;
}

export function createPrimaryDatabase(opts: CreatePrimaryDatabaseOptions): SqlDatabase {
  const { databaseUrl, sqlitePath } = opts;

  if (opts.nodeEnv === 'production' && !databaseUrl) {
    throw new Error(
      'DATABASE_URL is required in production (PostgreSQL). Refusing to start with the SQLite fallback for the primary SaaS database.',
    );
  }

  if (databaseUrl) {
    if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
      throw new Error('DATABASE_URL must be a postgres:// or postgresql:// URL.');
    }
    const makePg = opts.pgFactory ?? ((url: string) => new PgDatabase({ url }, { connectionTimeoutMillis: opts.connectionTimeoutMillis }));
    return makePg(databaseUrl);
  }

  return createDatabase(sqlitePath);
}

/**
 * Fail loudly when the primary database is PostgreSQL but has not been
 * migrated. No-op for SQLite (createDatabase applies the schema locally).
 * The application never auto-migrates on startup — migrations are an explicit
 * `npm run db:migrate` deployment step.
 */
export function assertSaaSMigrationsApplied(db: SqlDatabase): void {
  if (!isPostgresDatabase(db)) return;
  let row: { version?: string } | undefined;
  try {
    row = db.prepare("SELECT version FROM schema_migrations WHERE version = '001'").get() as { version?: string } | undefined;
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('does not exist') || msg.includes('no such table') || msg.includes('relation')) {
      throw new Error('BurFlow PostgreSQL database is not migrated. Run `npm run db:migrate` before starting the application.');
    }
    throw err;
  }
  if (!row) {
    throw new Error('BurFlow PostgreSQL database has no migrations recorded. Run `npm run db:migrate` before starting the application.');
  }
}
