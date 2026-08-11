import { Worker } from 'worker_threads';
import type { SqlDatabase, SqlStatement, SqlRunResult } from '../types';
import { rewritePlaceholders } from './placeholder';
import type { WorkerOp, WorkerReply } from './protocol';
import {
  deserializeError,
  encodePayload,
  decodePayload,
  writeFramed,
  readFramed,
  REQ_CAP,
  HEADER_BYTES,
  DEAD_MSG_BYTES,
  REQ_START,
  REPLY_START,
  CHANNEL_BYTES,
} from './protocol';
import { PG_WORKER_SOURCE } from './worker-source';

export interface PgDatabaseOptions {
  /** Per-op watchdog: how long the main thread waits before declaring the bridge dead. */
  opTimeoutMs?: number;
  /** How long to wait for the worker's connection handshake. */
  initTimeoutMs?: number;
  /** pg.Client connectionTimeoutMillis (real pg backend). */
  connectionTimeoutMillis?: number;
}

interface PgStatementCached {
  sql: string;
  count: number;
}

const FLAG_REQ = 0;
const FLAG_DONE = 1;
const FLAG_DEAD = 2;

/**
 * A synchronous PostgreSQL `SqlDatabase` implementation.
 *
 * A worker thread owns the pg connection and serializes every operation; the
 * main thread blocks on Atomics.wait until the worker signals completion, so
 * callers keep the exact better-sqlite3-style synchronous API. All traffic
 * travels over a SHARED MEMORY channel (see protocol.ts) — no MessagePorts —
 * so delivery works identically on the process main thread and inside any
 * worker thread (e.g. test runners) without event-loop participation.
 *
 * A watchdog timeout plus a shared dead-flag guarantee the main thread can
 * never wait forever, even if the worker crashes or the connection drops.
 * The connection string lives only in workerData and is never logged.
 */
export class PgDatabase implements SqlDatabase {
  readonly dialect = 'postgres' as const;

  private worker: Worker;
  private flag: Int32Array;
  private deadMsg: Uint8Array;
  private reqView: Uint8Array;
  private replyView: Uint8Array;
  // Init handshake occupies seq 1; the first real op must be 2+ so it can
  // never read the stale init reply.
  private seq = 1;
  private closed = false;
  private dead = false;
  private deadMessage: string | null = null;
  private opTimeoutMs: number;
  private initTimeoutMs: number;
  private readonly statements = new Map<string, PgStatementCached>();

  constructor(
    backend: { url: string } | { pglite: true },
    opts: PgDatabaseOptions = {},
  ) {
    this.opTimeoutMs = opts.opTimeoutMs ?? 60_000;
    this.initTimeoutMs = opts.initTimeoutMs ?? 30_000;

    const sab = new SharedArrayBuffer(CHANNEL_BYTES);
    this.flag = new Int32Array(sab, 0, 3);
    this.deadMsg = new Uint8Array(sab, HEADER_BYTES, DEAD_MSG_BYTES);
    this.reqView = new Uint8Array(sab, REQ_START, REQ_CAP);
    this.replyView = new Uint8Array(sab, REPLY_START);

    const workerData: Record<string, unknown> = {
      flag: this.flag,
      deadMsg: this.deadMsg,
      reqView: this.reqView,
      replyView: this.replyView,
    };
    if ('url' in backend) {
      workerData.url = backend.url;
      workerData.connectionTimeoutMillis = opts.connectionTimeoutMillis ?? 10_000;
    } else {
      workerData.pglite = true;
    }

    this.worker = new Worker(PG_WORKER_SOURCE, { eval: true, workerData });
    this.worker.unref();

    this.worker.on('error', (err: Error) => {
      this.markDead('worker error: ' + (err?.message || String(err)));
    });
    this.worker.on('exit', () => {
      if (!this.closed) this.markDead('worker exited unexpectedly');
    });

    try {
      this.waitForDone(1, this.initTimeoutMs, 'database initialization timed out');
      const init = this.readReply();
      if (!init.ok) {
        throw deserializeError(init.error!);
      }
    } catch (err) {
      this.destroyWorker();
      throw err;
    }
  }

  prepare(sql: string): SqlStatement {
    let cached = this.statements.get(sql);
    if (!cached) {
      const rewritten = rewritePlaceholders(sql);
      cached = { sql: rewritten.sql, count: rewritten.count };
      this.statements.set(sql, cached);
    }
    const db = this;
    return {
      get(...params: unknown[]): any {
        const reply = db.syncCall({ type: 'query', sql: cached!.sql, params });
        const rows = (reply as { rows: any[] }).rows;
        return rows.length > 0 ? rows[0] : undefined;
      },
      all(...params: unknown[]): any[] {
        const reply = db.syncCall({ type: 'query', sql: cached!.sql, params });
        return (reply as { rows: any[] }).rows;
      },
      run(...params: unknown[]): SqlRunResult {
        const reply = db.syncCall({ type: 'query', sql: cached!.sql, params });
        return { changes: (reply as { rowCount: number }).rowCount, lastInsertRowid: undefined };
      },
    };
  }

  exec(sql: string): void {
    this.syncCall({ type: 'exec', sql });
  }

  transaction<T = any>(fn: (...args: any[]) => T): (...args: any[]) => T {
    const db = this;
    return function (...args: any[]): T {
      db.syncCall({ type: 'begin' });
      try {
        const result = fn(...args);
        db.syncCall({ type: 'commit' });
        return result;
      } catch (err) {
        try { db.syncCall({ type: 'rollback' }); } catch { /* connection may be gone */ }
        throw err;
      }
    };
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    try {
      this.syncCall({ type: 'close' });
    } catch {
      // Even if the worker is unresponsive, tear it down below.
    }
    this.destroyWorker();
  }

  /** Test hook: simulate an unexpected async connection loss (no reply). */
  killConnection(): void {
    this.syncCall({ type: 'kill' });
  }

  /** Test hook: make the worker sleep for `ms` without replying. */
  sleep(ms: number): void {
    this.syncCall({ type: 'sleep', ms });
  }

  private syncCall(op: Omit<WorkerOp, 'id'>): unknown {
    if (this.closed) throw new Error('Database is closed');
    if (this.dead) throw new Error(this.deadMessage || 'PostgreSQL connection lost');

    const id = ++this.seq;
    this.sendRequest({ id, ...op } as WorkerOp);

    try {
      this.waitForDone(id, this.opTimeoutMs, `database operation timed out after ${this.opTimeoutMs}ms`);
      const reply = this.readReply();
      if (!reply.ok) throw deserializeError(reply.error!);
      return reply.result;
    } catch (err) {
      // A timeout means the worker is wedged — terminate it so nothing leaks.
      if (err instanceof Error && /timed out/.test(err.message)) {
        this.markDead(err.message);
        this.destroyWorker();
      }
      throw err;
    }
  }

  private sendRequest(op: WorkerOp): void {
    const json = encodePayload(op);
    if (!writeFramed(this.reqView, json)) {
      throw new Error('bridge request exceeds shared buffer');
    }
    Atomics.store(this.flag, FLAG_REQ, op.id);
    Atomics.notify(this.flag, FLAG_REQ);
  }

  private readReply(): WorkerReply {
    return decodePayload<WorkerReply>(readFramed(this.replyView));
  }

  private waitForDone(seq: number, timeoutMs: number, timeoutMessage: string): void {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      if (this.dead) throw new Error(this.deadMessage || 'PostgreSQL connection lost');
      if (Atomics.load(this.flag, FLAG_DEAD) === 1) {
        throw new Error(this.readDeadMessage() || 'PostgreSQL connection lost');
      }
      if (Atomics.load(this.flag, FLAG_DONE) === seq) return;
      const now = Date.now();
      if (now >= deadline) throw new Error(timeoutMessage);
      const current = Atomics.load(this.flag, FLAG_DONE);
      Atomics.wait(this.flag, FLAG_DONE, current, Math.min(100, deadline - now));
    }
  }

  private readDeadMessage(): string {
    let end = 0;
    for (let i = 0; i < this.deadMsg.length; i++) {
      if (this.deadMsg[i] === 0) break;
      end = i + 1;
    }
    return Buffer.from(this.deadMsg.subarray(0, end)).toString('utf8');
  }

  private markDead(message: string): void {
    if (this.dead) return;
    this.dead = true;
    this.deadMessage = message;
  }

  private destroyWorker(): void {
    try { void this.worker.terminate(); } catch { /* already gone */ }
  }
}
