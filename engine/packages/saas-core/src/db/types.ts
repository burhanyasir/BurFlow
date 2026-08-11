/**
 * The database seam: a minimal, structural subset of the better-sqlite3 API
 * that both backends satisfy.
 *
 * - SQLite: the raw better-sqlite3 Database instance already conforms (it has
 *   prepare/get/all/run, exec, transaction, close) — no wrapper needed, so
 *   existing behavior is byte-for-byte unchanged.
 * - PostgreSQL: `PgDatabase` (the sync worker bridge) implements this same
 *   surface, so every repository works against either backend without edits.
 *
 * `dialect` is optional so untagged better-sqlite3 instances still satisfy the
 * interface; use `isPostgresDatabase()` to branch on the active backend.
 */

export type DatabaseDialect = 'sqlite' | 'postgres';

export interface SqlRunResult {
  changes: number;
  lastInsertRowid?: number | bigint;
}

export interface SqlStatement {
  get(...params: unknown[]): any;
  all(...params: unknown[]): any[];
  run(...params: unknown[]): SqlRunResult;
}

export interface SqlDatabase {
  readonly dialect?: DatabaseDialect;
  prepare(sql: string): SqlStatement;
  exec(sql: string): void;
  transaction<T = any>(fn: (...params: any[]) => T): (...params: any[]) => T;
  close(): void;
}

export function isPostgresDatabase(db: SqlDatabase): boolean {
  return db.dialect === 'postgres';
}
