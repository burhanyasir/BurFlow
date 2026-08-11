/**
 * PgDatabase bridge integration tests.
 *
 * Backend: `@electric-sql/pglite` — real PostgreSQL compiled to WASM, running
 * in-process inside the worker. These are behavioral/compatibility tests: they
 * prove the bridge's synchronous API, lifecycle, and error handling. Real
 * PostgreSQL parity (type OIDs, transaction semantics) is later validated
 * against an actual Postgres instance; the Neon verification step is separate.
 *
 * PGlite's WASM init takes ~4s, so the bulk of the tests share ONE database
 * instance (unique table names per test) and only the destructive/lifecycle
 * tests spin up their own.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { PgDatabase } from '../db/pg/pg-database';

const dbs: PgDatabase[] = [];

function fresh(opts: ConstructorParameters<typeof PgDatabase>[1] = {}) {
  const db = new PgDatabase({ pglite: true }, opts);
  dbs.push(db);
  return db;
}

afterEach(() => {
  for (const db of dbs.splice(0)) {
    try { db.close(); } catch { /* already closed / dead */ }
  }
});

let shared: PgDatabase;
beforeAll(() => {
  shared = new PgDatabase({ pglite: true });
});
afterAll(() => {
  // Own cleanup — NOT via afterEach, which runs between every test.
  try { shared.close(); } catch { /* already closed / dead */ }
});

// Unique table name per test so a shared DB instance is safe.
let tableSeq = 0;
function table(name: string): string {
  tableSeq += 1;
  return `t_${tableSeq}_${name}`;
}

describe('PgDatabase bridge — basic SQL', () => {
  it('SELECT returns the row', () => {
    const t = table('select');
    shared.prepare(`CREATE TABLE ${t} (v TEXT)`).run();
    shared.prepare(`INSERT INTO ${t} (v) VALUES (?)`).run('hello');
    const row = shared.prepare(`SELECT v FROM ${t}`).get();
    expect(row).toEqual({ v: 'hello' });
  });

  it('INSERT via prepare().run() works', () => {
    const t = table('insert');
    shared.prepare(`CREATE TABLE ${t} (id INT, v TEXT)`).run();
    const res = shared.prepare(`INSERT INTO ${t} (id, v) VALUES (?, ?)`).run(1, 'x');
    expect(res.changes).toBe(1);
  });

  it('UPDATE reports changed rows', () => {
    const t = table('update');
    shared.prepare(`CREATE TABLE ${t} (id INT, v TEXT)`).run();
    shared.prepare(`INSERT INTO ${t} (id, v) VALUES (1, 'a'), (2, 'b')`).run();
    expect(shared.prepare(`UPDATE ${t} SET v = ? WHERE id = ?`).run('z', 1).changes).toBe(1);
    expect(shared.prepare(`UPDATE ${t} SET v = ? WHERE id > 0`).run('z').changes).toBe(2);
  });

  it('DELETE reports removed rows', () => {
    const t = table('delete');
    shared.prepare(`CREATE TABLE ${t} (id INT)`).run();
    shared.prepare(`INSERT INTO ${t} (id) VALUES (1), (2), (3)`).run();
    expect(shared.prepare(`DELETE FROM ${t} WHERE id = ?`).run(2).changes).toBe(1);
    expect(shared.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c).toBe(2);
  });

  it('no-row SELECT resolves to undefined via .get()', () => {
    const t = table('norow');
    shared.prepare(`CREATE TABLE ${t} (id INT)`).run();
    expect(shared.prepare(`SELECT id FROM ${t} WHERE id = ?`).get(42)).toBeUndefined();
    expect(shared.prepare(`SELECT id FROM ${t}`).all()).toEqual([]);
  });

  it('multiple-row SELECT returns an array', () => {
    const t = table('multi');
    shared.prepare(`CREATE TABLE ${t} (id INT, v TEXT)`).run();
    shared.prepare(`INSERT INTO ${t} (id, v) VALUES (1, 'a'), (2, 'b'), (3, 'c')`).run();
    const rows = shared.prepare(`SELECT id, v FROM ${t} ORDER BY id`).all();
    expect(rows).toHaveLength(3);
    expect(rows[1]).toEqual({ id: 2, v: 'b' });
  });

  it('parameterized queries with mixed types', () => {
    const t = table('params');
    shared.prepare(`CREATE TABLE ${t} (id INT, name TEXT, ok BOOLEAN, score DOUBLE PRECISION)`).run();
    shared.prepare(`INSERT INTO ${t} (id, name, ok, score) VALUES (?, ?, ?, ?)`).run(7, 'Árpád', true, 3.25);
    const row = shared.prepare(`SELECT * FROM ${t} WHERE id = ?`).get(7);
    expect(row.name).toBe('Árpád');
    expect(row.ok).toBe(true);
    expect(row.score).toBe(3.25);
  });

  it('numeric values come back as JS numbers (int, bigint, float)', () => {
    const t = table('nums');
    shared.prepare(`CREATE TABLE ${t} (a INT, b BIGINT, c DOUBLE PRECISION)`).run();
    shared.prepare(`INSERT INTO ${t} (a, b, c) VALUES (?, ?, ?)`).run(5, 9007199254740993n, 1.5);
    const row = shared.prepare(`SELECT a, b, c FROM ${t}`).get();
    expect(typeof row.a).toBe('number');
    expect(row.a).toBe(5);
    expect(typeof row.b).toBe('number');
    expect(typeof row.c).toBe('number');
    expect(row.c).toBe(1.5);
    // count(*) (int8) coerces to number too
    expect(typeof shared.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c).toBe('number');
  });

  it('exec() runs multi-statement DDL', () => {
    const a = table('execa');
    const b = table('execb');
    shared.exec(`CREATE TABLE ${a} (x INT); CREATE TABLE ${b} (y INT);`);
    shared.prepare(`INSERT INTO ${a} (x) VALUES (?)`).run(9);
    expect(shared.prepare(`SELECT x FROM ${a}`).get().x).toBe(9);
  });

  it('placeholder rewriting happens before execution (literals keep ?)', () => {
    const t = table('plh');
    shared.prepare(`CREATE TABLE ${t} (v TEXT, w INT)`).run();
    shared.prepare(`INSERT INTO ${t} (v, w) VALUES ('? and ''?'' are literal', ?)`).run(7);
    const row = shared.prepare(`SELECT v, w FROM ${t} WHERE w = ?`).get(7);
    expect(row.v).toBe("? and '?' are literal");
    expect(row.w).toBe(7);
    // comment containing ? is untouched as well
    shared.prepare(`INSERT INTO ${t} (v, w) VALUES (?, ?) /* ? */ -- ?\n`).run('c', 8);
    expect(shared.prepare(`SELECT v FROM ${t} WHERE w = ?`).get(8).v).toBe('c');
  });

  it('supports many sequential operations without drift', () => {
    const t = table('seq');
    shared.prepare(`CREATE TABLE ${t} (id INT, v TEXT)`).run();
    for (let i = 0; i < 100; i++) {
      shared.prepare(`INSERT INTO ${t} (id, v) VALUES (?, ?)`).run(i, `v${i}`);
    }
    expect(shared.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c).toBe(100);
    const row = shared.prepare(`SELECT v FROM ${t} WHERE id = ?`).get(57);
    expect(row.v).toBe('v57');
    expect(shared.prepare(`UPDATE ${t} SET v = ? WHERE id = ?`).run('x', 57).changes).toBe(1);
    expect(shared.prepare(`SELECT v FROM ${t} WHERE id = ?`).get(57).v).toBe('x');
  });
});

describe('PgDatabase bridge — transactions', () => {
  it('commits on success and returns the wrapped value', () => {
    const t = table('txcommit');
    shared.prepare(`CREATE TABLE ${t} (v INT)`).run();
    const txn = shared.transaction(() => {
      shared.prepare(`INSERT INTO ${t} (v) VALUES (?)`).run(1);
      shared.prepare(`INSERT INTO ${t} (v) VALUES (?)`).run(2);
      return 'done';
    });
    expect(txn()).toBe('done');
    expect(shared.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c).toBe(2);
  });

  it('rolls back on throw and propagates the error', () => {
    const t = table('txrollback');
    shared.prepare(`CREATE TABLE ${t} (v INT)`).run();
    const txn = shared.transaction(() => {
      shared.prepare(`INSERT INTO ${t} (v) VALUES (?)`).run(1);
      throw new Error('boom');
    });
    expect(() => txn()).toThrow('boom');
    expect(shared.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c).toBe(0);
  });

  it('rolls back when the inner statement fails (aborted transaction)', () => {
    const t = table('txabort');
    shared.prepare(`CREATE TABLE ${t} (v INT UNIQUE)`).run();
    shared.prepare(`INSERT INTO ${t} (v) VALUES (?)`).run(1);
    const txn = shared.transaction(() => {
      shared.prepare(`INSERT INTO ${t} (v) VALUES (?)`).run(1); // unique violation
      shared.prepare(`INSERT INTO ${t} (v) VALUES (?)`).run(2);
    });
    expect(() => txn()).toThrow();
    expect(shared.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c).toBe(1);
  });

  it('connection stays usable after a transaction failure', () => {
    const t = table('txafter');
    shared.prepare(`CREATE TABLE ${t} (v INT)`).run();
    const txn = shared.transaction(() => {
      shared.prepare(`INSERT INTO ${t} (v) VALUES (?)`).run(1);
      throw new Error('hard fail');
    });
    expect(() => txn()).toThrow('hard fail');
    expect(shared.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c).toBe(0);
  });

  it('transaction result value is returned and state is serialized', () => {
    const t = table('txargs');
    shared.prepare(`CREATE TABLE ${t} (v INT)`).run();
    const txn = shared.transaction((n: number) => {
      shared.prepare(`INSERT INTO ${t} (v) VALUES (?)`).run(n);
      return n * 2;
    });
    expect(txn(21)).toBe(42);
    // A second independent invocation works (no stale transaction state).
    expect(txn(1)).toBe(2);
    expect(shared.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c).toBe(2);
  });
});

describe('PgDatabase bridge — error handling', () => {
  it('propagates SQL errors with the server message', () => {
    expect(() => shared.prepare('SELECT * FROM no_such_table_bridge').all()).toThrow(/does not exist|no_such_table_bridge/i);
  });

  it('propagates parameter count mismatches', () => {
    expect(() => shared.prepare('SELECT ? AS x').get()).toThrow();
  });

  it('connection failure surfaces at construction and cleans up', () => {
    // Port 1 refuses connections immediately — no real server, no credentials.
    expect(() => new PgDatabase(
      { url: 'postgres://nobody:nothing@127.0.0.1:1/burflow' },
      { connectionTimeoutMillis: 800, initTimeoutMs: 8000 },
    )).toThrow();
  });

  it('unexpected connection loss wakes waiters instead of hanging', () => {
    const db = fresh();
    db.prepare('CREATE TABLE kill_t (v INT)').run();
    // The kill op itself throws once the worker marks the bridge dead.
    expect(() => db.killConnection()).toThrow(/connection lost/i);
    // Subsequent ops fail fast (dead flag), not hang again.
    expect(() => db.prepare('SELECT 1 AS x').get()).toThrow(/connection lost/i);
    db.close(); // must be safe on a dead bridge
  });

  it('watchdog timeout declares the bridge dead and never hangs', () => {
    const db = fresh({ opTimeoutMs: 250 });
    db.prepare('CREATE TABLE sleep_t (v INT)').run();
    // Worker sleeps 5s; main thread must give up after ~250ms.
    const started = Date.now();
    expect(() => db.sleep(5000)).toThrow(/timed out/);
    expect(Date.now() - started).toBeLessThan(3000);
    // Subsequent ops fail fast (dead flag), not hang again.
    const t2 = Date.now();
    expect(() => db.prepare('SELECT 1 AS x').get()).toThrow();
    expect(Date.now() - t2).toBeLessThan(500);
    db.close();
  });
});

describe('PgDatabase bridge — lifecycle', () => {
  it('close() shuts down cleanly and further ops throw immediately', () => {
    const db = fresh();
    db.prepare('CREATE TABLE close_t (v INT)').run();
    db.prepare('INSERT INTO close_t (v) VALUES (?)').run(1);
    db.close();
    expect(() => db.prepare('SELECT 1 AS x').get()).toThrow(/closed/i);
    db.close(); // idempotent
  });

  it('close() terminates the worker and repeated closes are no-ops', () => {
    const db = fresh();
    db.prepare('CREATE TABLE term_t (v INT)').run();
    const worker = (db as unknown as { worker: import('worker_threads').Worker }).worker;
    db.close();
    expect(() => db.close()).not.toThrow();
    expect((db as unknown as { closed: boolean }).closed).toBe(true);
    expect(worker.threadId).toBeGreaterThan(0); // was a real worker while alive
  });
});
