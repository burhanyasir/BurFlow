import Database from 'better-sqlite3';
import type { SqlDatabase, SqlStatement } from './types';

/**
 * Explicit SQLite adapter implementing `SqlDatabase`.
 *
 * Production code can keep using the raw better-sqlite3 instance (it already
 * conforms structurally); this class exists for code that wants a concrete,
 * dialect-tagged SqlDatabase — e.g. the SQLite side of the pg-compat test
 * harness and symmetric typing with `PgDatabase`.
 */
export class SqliteDatabase implements SqlDatabase {
  readonly dialect = 'sqlite' as const;

  constructor(private readonly raw: Database.Database) {}

  prepare(sql: string): SqlStatement {
    return this.raw.prepare(sql);
  }

  exec(sql: string): void {
    this.raw.exec(sql);
  }

  transaction<T = any>(fn: (...params: any[]) => T): (...params: any[]) => T {
    return this.raw.transaction(fn);
  }

  close(): void {
    this.raw.close();
  }

  /** SQLite-only pragma access (WAL, foreign_keys, etc.). */
  pragma(sql: string, ...args: unknown[]): any {
    return (this.raw.pragma as any)(sql, ...args);
  }
}
