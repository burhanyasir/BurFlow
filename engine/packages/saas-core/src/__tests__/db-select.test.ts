import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createPrimaryDatabase, assertSaaSMigrationsApplied, PgDatabase, isPostgresDatabase } from '../index';
import type { SqlDatabase } from '../db/types';

const SQLITE_PATH = (dir: string) => join(dir, 'primary.db');
const UNREACHABLE_URL = 'postgresql://user:pass@127.0.0.1:1/unreachable';
const VALID_URL = 'postgresql://user:pass@127.0.0.1:1/valid';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'db-select-'));
});
afterEach(() => {
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe('createPrimaryDatabase — production database requirement (P0-2)', () => {
  it('production + DATABASE_URL → PostgreSQL backend is selected (never SQLite)', () => {
    let capturedUrl: string | undefined;
    let sqliteTouched = false;
    const fakePg: SqlDatabase = {
      dialect: 'postgres',
      prepare: () => { throw new Error('unused'); },
      exec: () => undefined,
      transaction: (fn: any) => fn,
      close: () => undefined,
    };
    const db = createPrimaryDatabase({
      databaseUrl: VALID_URL,
      sqlitePath: SQLITE_PATH(dir),
      nodeEnv: 'production',
      pgFactory: (url) => {
        capturedUrl = url;
        sqliteTouched = existsSync(SQLITE_PATH(dir));
        return fakePg;
      },
    });
    expect(db).toBe(fakePg);
    expect(capturedUrl).toBe(VALID_URL);
    expect(sqliteTouched).toBe(false);
    expect(isPostgresDatabase(db)).toBe(true);
    expect(existsSync(SQLITE_PATH(dir))).toBe(false);
  });

  it('production + missing DATABASE_URL → clear startup failure (no SQLite fallback)', () => {
    expect(() =>
      createPrimaryDatabase({ databaseUrl: undefined, sqlitePath: SQLITE_PATH(dir), nodeEnv: 'production' }),
    ).toThrowError(/DATABASE_URL is required in production/);
    // The SQLite fallback file must never be created in this path.
    expect(existsSync(SQLITE_PATH(dir))).toBe(false);
  });

  it('production + malformed DATABASE_URL → clear startup failure', () => {
    expect(() =>
      createPrimaryDatabase({ databaseUrl: 'not-a-url', sqlitePath: SQLITE_PATH(dir), nodeEnv: 'production' }),
    ).toThrowError(/postgres:\/\/ or postgresql:\/\//);
  });

  it('production + unreachable DATABASE_URL → clear startup failure (connection error propagates)', () => {
    expect(() =>
      createPrimaryDatabase({
        databaseUrl: UNREACHABLE_URL,
        sqlitePath: SQLITE_PATH(dir),
        nodeEnv: 'production',
        connectionTimeoutMillis: 3000,
      }),
    ).toThrow(); // PgDatabase construction fails with ECONNREFUSED — no fallback.
    expect(existsSync(SQLITE_PATH(dir))).toBe(false);
  });

  it('development/test + no DATABASE_URL → SQLite fallback still works', () => {
    const db = createPrimaryDatabase({ databaseUrl: undefined, sqlitePath: SQLITE_PATH(dir), nodeEnv: 'development' });
    expect(isPostgresDatabase(db)).toBe(false);
    db.prepare('CREATE TABLE IF NOT EXISTS t (id TEXT PRIMARY KEY)').run();
    const r = db.prepare('INSERT INTO t (id) VALUES (?)').run('abc');
    expect(r.changes).toBe(1);
    expect(db.prepare('SELECT id FROM t').get().id).toBe('abc');
    db.close();
  });
});

describe('assertSaaSMigrationsApplied', () => {
  it('is a no-op for the SQLite fallback (local schema applied by createDatabase)', () => {
    const db = createPrimaryDatabase({ databaseUrl: undefined, sqlitePath: SQLITE_PATH(dir), nodeEnv: 'development' });
    expect(() => assertSaaSMigrationsApplied(db)).not.toThrow();
    db.close();
  });

  it('fails clearly on a real unmigrated PostgreSQL database (no silent schema mutation)', () => {
    // Point PgDatabase at a real empty postgres via PGlite is not possible with
    // the pg driver; instead assert the guard throws for a missing migration
    // table using a postgres-tagged stub that reports "does not exist".
    const unmigrated: SqlDatabase = {
      dialect: 'postgres',
      prepare: () => ({
        get: () => { const e: any = new Error('relation "schema_migrations" does not exist'); throw e; },
        all: () => [],
        run: () => ({ changes: 0 }),
      }),
      exec: () => undefined,
      transaction: (fn: any) => fn,
      close: () => undefined,
    };
    expect(() => assertSaaSMigrationsApplied(unmigrated)).toThrowError(/db:migrate/);
  });

  it('fails clearly when migration 001 is missing but the table exists', () => {
    const noRows: SqlDatabase = {
      dialect: 'postgres',
      prepare: () => ({
        get: () => undefined,
        all: () => [],
        run: () => ({ changes: 0 }),
      }),
      exec: () => undefined,
      transaction: (fn: any) => fn,
      close: () => undefined,
    };
    expect(() => assertSaaSMigrationsApplied(noRows)).toThrowError(/db:migrate/);
  });
});

describe('PgDatabase still selectable for tests', () => {
  it('exposes PgDatabase with a pglite backend (smoke)', () => {
    const pg = new PgDatabase({ pglite: true }, { initTimeoutMs: 120000 });
    expect(isPostgresDatabase(pg)).toBe(true);
    pg.prepare('CREATE TABLE IF NOT EXISTS t (id TEXT PRIMARY KEY)').run();
    pg.prepare('INSERT INTO t (id) VALUES (?)').run('x');
    expect(pg.prepare('SELECT id FROM t').get().id).toBe('x');
    pg.close();
  });
});
