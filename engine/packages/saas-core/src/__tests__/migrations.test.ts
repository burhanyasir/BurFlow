/**
 * Migration system tests.
 *
 * Backend: `@electric-sql/pglite` — real PostgreSQL semantics in-process.
 * These are PostgreSQL-semantic tests of the runner, NOT proof of Neon
 * compatibility; real Neon verification is a separate, later step.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import os from 'os';
import path from 'path';

// engine/scripts (one level above packages/saas-core)
const {
  makePgliteAdapter,
  migrate,
  listMigrations,
  migrationStatus,
} = require('../../../../scripts/migrate-core.js');
const { verifySchema } = require('../../../../scripts/verify-schema.js');

const REAL_MIGRATION_DIR = path.join(__dirname, '..', '..', '..', '..', 'migrations');

let pg: PGlite;
let adapter: ReturnType<typeof makePgliteAdapter>;

beforeAll(async () => {
  pg = new PGlite();
  adapter = makePgliteAdapter(pg);
});

afterAll(async () => {
  try { await pg.close(); } catch { /* already closed */ }
});

function tempDir(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'burflow-mig-'));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

describe('migration runner — initial schema', () => {
  it('applies all pending migrations on an empty database', async () => {
    const res = await migrate(adapter, REAL_MIGRATION_DIR);
    expect(res.error).toBeNull();
    expect(res.executed).toEqual(['001', '002', '003', '004', '005']);
  });

  it('records all migrations in schema_migrations', async () => {
    const r = await adapter.query('SELECT version, name, applied_at FROM schema_migrations ORDER BY version');
    expect(r.rows).toHaveLength(5);
    expect(r.rows[0].version).toBe('001');
    expect(r.rows[0].name).toBe('initial_schema');
    expect(r.rows[0].applied_at).toBeTruthy();
  });

  it('re-running is a clean no-op', async () => {
    const res = await migrate(adapter, REAL_MIGRATION_DIR);
    expect(res.error).toBeNull();
    expect(res.executed).toEqual([]);
    expect(res.pending).toEqual([]);
  });

  it('verification passes: 40 tables, 449 columns, 66 explicit indexes', async () => {
    const check = await verifySchema(adapter);
    expect(check.errors).toEqual([]);
    expect(check.summary).toEqual({ tables: 44, columns: 488, indexes: 75 });
  });
});

describe('migration runner — safety and ordering', () => {
  it('failed migration rolls back and is NOT recorded', async () => {
    const dir = tempDir({
      '100_ok.sql': 'CREATE TABLE ok_t (id TEXT PRIMARY KEY);',
      '101_bad.sql': 'CREATE TABLE rollback_test (id TEXT PRIMARY KEY); INSERT INTO no_such_table_xyz VALUES (1);',
    });
    await expect(migrate(adapter, dir)).rejects.toThrow();
    // 101 must not be recorded
    const r = await adapter.query("SELECT version FROM schema_migrations WHERE version = '101'");
    expect(r.rows).toHaveLength(0);
    // partial work from the failed migration must be rolled back
    const t = await adapter.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rollback_test'",
    );
    expect(t.rows).toHaveLength(0);
    // and the migration before it stays applied
    const ok = await adapter.query("SELECT version FROM schema_migrations WHERE version = '100'");
    expect(ok.rows).toHaveLength(1);
  });

  it('executes migrations in deterministic version order regardless of filename order', async () => {
    const dir = tempDir({
      '310_a.sql': 'CREATE TABLE order_310 (id TEXT PRIMARY KEY);',
      '99_b.sql': 'CREATE TABLE order_099 (id TEXT PRIMARY KEY);',
    });
    const res = await migrate(adapter, dir);
    expect(res.error).toBeNull();
    expect(res.executed).toEqual(['099', '310']);
  });

  it('detects duplicate migration versions', () => {
    const dir = tempDir({
      '400_x.sql': 'CREATE TABLE dup_x (id TEXT PRIMARY KEY);',
      '400_y.sql': 'CREATE TABLE dup_y (id TEXT PRIMARY KEY);',
    });
    expect(() => listMigrations(dir)).toThrow(/duplicate migration version 400/);
  });

  it('rejects malformed migration filenames', () => {
    const dir = tempDir({ 'hello.sql': 'SELECT 1;' });
    expect(() => listMigrations(dir)).toThrow(/malformed migration filename/);
  });

  it('handles a missing migration directory clearly', async () => {
    const res = await migrate(adapter, path.join(os.tmpdir(), 'definitely-not-a-migration-dir-xyz'));
    expect(res.error).toMatch(/migration directory not found/);
  });

  it('reports migration status correctly', async () => {
    const dir = tempDir({ '500_new.sql': 'CREATE TABLE status_new (id TEXT PRIMARY KEY);' });
    const status = await migrationStatus(adapter, dir);
    expect(status.error).toBeNull();
    expect(status.rows).toHaveLength(1);
    expect(status.rows[0].version).toBe('500');
    expect(status.rows[0].appliedAt).toBeNull();
    // real dir: 001 already applied
    const realStatus = await migrationStatus(adapter, REAL_MIGRATION_DIR);
    expect(realStatus.rows[0].version).toBe('001');
    expect(realStatus.rows[0].appliedAt).toBeTruthy();
  });
});

describe('schema verification — fails loudly on drift', () => {
  it('reports a dropped table as a verification error', async () => {
    const pg2 = new PGlite();
    try {
      const a2 = makePgliteAdapter(pg2);
      await migrate(a2, REAL_MIGRATION_DIR);
      // dpa_documents has no dependents, so the drop succeeds and exposes drift.
      await a2.exec('DROP TABLE dpa_documents;');
      const check = await verifySchema(a2);
      expect(check.errors.some((e: string) => e.includes('missing table: dpa_documents'))).toBe(true);
    } finally {
      try { await pg2.close(); } catch { /* ignore */ }
    }
  });
});
