/**
 * Shared protocol for the synchronous PostgreSQL bridge.
 *
 * Requests and replies travel over SHARED MEMORY (one SharedArrayBuffer), not
 * MessagePorts, so the main thread's Atomics.wait works identically on the
 * process main thread and inside any worker thread (e.g. test runners) — no
 * event-loop participation is required for message delivery.
 *
 * Shared buffer layout (bytes):
 *   [0..11]     Int32Array: [reqSeq, doneSeq, dead]
 *   [16..271]   dead-message slot (256 bytes, NUL-terminated UTF-8)
 *   [272..]     request buffer: 4-byte little-endian length + JSON payload
 *   [REQ_START+REQ_CAP..] reply buffer: 4-byte little-endian length + JSON
 *
 * Each direction is strictly single-writer/single-reader and ordered by the
 * seq flags, so the fixed-size buffers are race-free.
 */

export const REQ_CAP = 2 * 1024 * 1024;    // 2 MB of request JSON
export const REPLY_CAP = 16 * 1024 * 1024; // 16 MB of reply JSON
export const HEADER_BYTES = 16;            // 3 int32 + padding
export const DEAD_MSG_BYTES = 256;
export const REQ_START = HEADER_BYTES + DEAD_MSG_BYTES;
export const REPLY_START = REQ_START + REQ_CAP;
export const CHANNEL_BYTES = REPLY_START + REPLY_CAP;

export type WorkerOpType =
  | 'query'    // { sql, params? } → { rows, rowCount }
  | 'exec'     // { sql } → void (multi-statement, no params)
  | 'begin' | 'commit' | 'rollback'
  | 'close'
  // Test-only lifecycle probes (never used by the app):
  | 'sleep'    // { ms } — simulate a hung worker
  | 'kill'     // simulate an unexpected async connection loss (no reply)

export interface WorkerOp {
  id: number;
  type: WorkerOpType;
  sql?: string;
  params?: unknown[];
  ms?: number;
}

export interface WorkerReply {
  id: number;
  ok: boolean;
  result?: unknown;
  error?: SerializedError;
}

export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
}

export interface QueryReply {
  rows: any[];
  rowCount: number;
}

/**
 * Lossless JSON round-trip between the main thread and the worker. Plain JSON
 * cannot represent BigInt or Buffer/Uint8Array values, so they are tagged and
 * restored by the matching reviver.
 */
const TAG = '__bridge';

export function encodePayload(value: unknown): string {
  return JSON.stringify(value, function (_key, v: unknown) {
    if (typeof v === 'bigint') return { [TAG]: 'bigint', v: v.toString() };
    if (v instanceof Uint8Array) return { [TAG]: 'buf', v: Buffer.from(v).toString('base64') };
    return v;
  });
}

export function decodePayload<T = unknown>(json: string): T {
  return JSON.parse(json, function (_key, v: unknown) {
    if (v && typeof v === 'object' && (v as Record<string, unknown>)[TAG] === 'bigint') {
      return BigInt((v as Record<string, string>).v);
    }
    if (v && typeof v === 'object' && (v as Record<string, unknown>)[TAG] === 'buf') {
      return Buffer.from((v as Record<string, string>).v, 'base64');
    }
    return v;
  }) as T;
}

/** Write a length-framed UTF-8 payload into a shared view. Returns false on overflow. */
export function writeFramed(view: Uint8Array, payload: string): boolean {
  const bytes = Buffer.from(payload, 'utf8');
  if (bytes.length + 4 > view.length) return false;
  new DataView(view.buffer, view.byteOffset, 4).setInt32(0, bytes.length, true);
  view.set(bytes, 4);
  return true;
}

/** Read a length-framed UTF-8 payload from a shared view. */
export function readFramed(view: Uint8Array): string {
  const len = new DataView(view.buffer, view.byteOffset, 4).getInt32(0, true);
  return Buffer.from(view.subarray(4, 4 + len)).toString('utf8');
}

export function serializeError(err: unknown): SerializedError {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { name: 'Error', message: String(err) };
}

export function deserializeError(se: SerializedError): Error {
  const err = new Error(se.message);
  err.name = se.name;
  if (se.stack) err.stack = se.stack;
  return err;
}

// Postgres OIDs whose values must come back as JS numbers to mirror
// better-sqlite3 (SQLite has no int8-as-string or numeric-as-string).
const NUMERIC_OIDS = new Set([
  20,   // int8
  21,   // int2
  23,   // int4
  26,   // oid
  700,  // float4
  701,  // float8
  790,  // money
  1700, // numeric
]);

export function coerceNumericValue(value: unknown): unknown {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return value;
}

/** Convert every numeric-typed column in a result row to a JS number. */
export function coerceRows(rows: any[], fields: Array<{ name: string; dataTypeID?: number }>): any[] {
  const numericCols = fields
    .filter(f => f.dataTypeID !== undefined && NUMERIC_OIDS.has(f.dataTypeID))
    .map(f => f.name);
  if (numericCols.length === 0) return rows;
  return rows.map(row => {
    let changed = false;
    const out: any = { ...row };
    for (const col of numericCols) {
      const v = out[col];
      if (v === null || v === undefined) continue;
      const coerced = coerceNumericValue(v);
      if (coerced !== v) { out[col] = coerced; changed = true; }
    }
    return changed ? out : row;
  });
}
