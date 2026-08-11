import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { SqliteDatabase } from '../db/sqlite';

function makeDb(): SqliteDatabase {
  const raw = new Database(':memory:');
  raw.exec(`
    CREATE TABLE items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      flagged INTEGER NOT NULL DEFAULT 0
    );
  `);
  return new SqliteDatabase(raw);
}

describe('SqliteDatabase adapter', () => {
  it('reports dialect sqlite', () => {
    const db = makeDb();
    expect(db.dialect).toBe('sqlite');
    expect(db.dialect === 'postgres').toBe(false);
    db.close();
  });

  it('prepare().run() returns changes and supports inserts', () => {
    const db = makeDb();
    const run = db.prepare('INSERT INTO items (id, name, flagged) VALUES (?, ?, ?)').run('a', 'alpha', 1);
    expect(run.changes).toBe(1);
    const row = db.prepare('SELECT * FROM items WHERE id = ?').get('a');
    expect(row.name).toBe('alpha');
    expect(row.flagged).toBe(1);
    db.close();
  });

  it('get() returns undefined when no row matches', () => {
    const db = makeDb();
    const row = db.prepare('SELECT * FROM items WHERE id = ?').get('missing');
    expect(row).toBeUndefined();
    db.close();
  });

  it('all() returns arrays and empty arrays', () => {
    const db = makeDb();
    db.prepare('INSERT INTO items (id, name) VALUES (?, ?)').run('a', 'alpha');
    db.prepare('INSERT INTO items (id, name) VALUES (?, ?)').run('b', 'beta');
    expect(db.prepare('SELECT * FROM items ORDER BY id').all()).toHaveLength(2);
    expect(db.prepare('SELECT * FROM items WHERE flagged = ?').all(1)).toHaveLength(0);
    db.close();
  });

  it('update changes count reflects affected rows', () => {
    const db = makeDb();
    db.prepare('INSERT INTO items (id, name) VALUES (?, ?)').run('a', 'alpha');
    const up = db.prepare('UPDATE items SET name = ? WHERE id = ?').run('altered', 'a');
    expect(up.changes).toBe(1);
    const noop = db.prepare('UPDATE items SET name = ? WHERE id = ?').run('altered', 'nope');
    expect(noop.changes).toBe(0);
    db.close();
  });

  it('transaction() commits all writes and rolls back on error', () => {
    const db = makeDb();
    const insert = db.prepare('INSERT INTO items (id, name) VALUES (?, ?)');
    const tx = db.transaction((rows: Array<[string, string]>) => {
      for (const [id, name] of rows) insert.run(id, name);
    });
    tx([['a', 'alpha'], ['b', 'beta']]);
    expect(db.prepare('SELECT COUNT(*) as c FROM items').get().c).toBe(2);

    const failing = db.transaction(() => {
      insert.run('c', 'gamma');
      throw new Error('boom');
    });
    expect(() => failing()).toThrow('boom');
    expect(db.prepare('SELECT COUNT(*) as c FROM items').get().c).toBe(2);
    db.close();
  });

  it('exec() runs multi-statement DDL', () => {
    const db = makeDb();
    db.exec('CREATE TABLE extra (id TEXT PRIMARY KEY); CREATE INDEX idx_extra ON extra(id);');
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='extra'").get()).toBeTruthy();
    db.close();
  });
});
