/**
 * The worker script, embedded as a string and executed with `new Worker(src,
 * { eval: true })`. It is intentionally self-contained:
 *
 *   - never logs the connection string (the URL lives only in workerData)
 *   - owns exactly one connection/client, serializing every op in FIFO order
 *   - normalizes numeric OIDs, bigints and Dates before replying so values
 *     behave like better-sqlite3's
 *   - communicates over shared memory only (see protocol.ts) — no MessagePorts,
 *     so message delivery never depends on the main thread's event loop
 *   - reports fatal connection loss through the shared dead-flag so the main
 *     thread can never wait forever
 */
export const PG_WORKER_SOURCE = `
(function () {
  'use strict';
  var workerThreads = require('worker_threads');
  var workerData = workerThreads.workerData;

  var flag = workerData.flag;          // Int32Array [reqSeq, doneSeq, dead]
  var deadMsg = workerData.deadMsg;    // Uint8Array (256 bytes)
  var reqView = workerData.reqView;    // Uint8Array (REQ_CAP)
  var replyView = workerData.replyView; // Uint8Array (REPLY_CAP)

  var REQ = 0, DONE = 1, DEAD = 2;
  var dead = false;
  var lastReq = 0;

  function writeDeadMessage(message) {
    var bytes = Buffer.from(String(message), 'utf8');
    deadMsg.fill(0);
    deadMsg.set(bytes.subarray(0, deadMsg.length));
  }

  function markDead(message) {
    if (dead) return;
    dead = true;
    writeDeadMessage(message);
    Atomics.store(flag, DEAD, 1);
    Atomics.store(flag, DONE, -1);
    Atomics.notify(flag, DONE);
  }

  // Catches an unexpected pg connection drop (client 'error' event) and any
  // uncaught error inside the worker — always wakes waiters, never hangs main.
  process.on('uncaughtException', function (err) {
    markDead('worker crashed: ' + (err && err.message ? err.message : String(err)));
    setTimeout(function () { process.exit(1); }, 50);
  });
  process.on('unhandledRejection', function (err) {
    markDead('worker rejected: ' + (err && err.message ? err.message : String(err)));
    setTimeout(function () { process.exit(1); }, 50);
  });

  var backend = null;

  function makePgBackend(url, connectionTimeoutMillis) {
    var pg = require('pg');
    var client = new pg.Client({
      connectionString: url,
      connectionTimeoutMillis: connectionTimeoutMillis || 10000
      // sslmode is honored from the connection string (e.g. ?sslmode=require)
    });
    client.on('error', function (err) {
      markDead('PostgreSQL connection lost: ' + (err && err.message ? err.message : String(err)));
    });
    return {
      kind: 'pg',
      connect: function () { return client.connect(); },
      query: function (sql, params) { return client.query(sql, params || []); },
      exec: function (sql) { return client.query(sql); },
      end: function () { return client.end(); },
      destroy: function () { try { client.end(); } catch (e) {} }
    };
  }

  function makePgliteBackend() {
    var pglite = require('@electric-sql/pglite');
    var db = new pglite.PGlite();
    return {
      kind: 'pglite',
      connect: function () {
        // Force readiness before the init handshake completes.
        return db.query('SELECT 1').then(function () {});
      },
      query: function (sql, params) {
        return db.query(sql, params || []).then(function (r) {
          return {
            rows: r.rows,
            fields: r.fields,
            rowCount: r.rowCount != null ? r.rowCount : (r.affectedRows != null ? r.affectedRows : 0)
          };
        });
      },
      exec: function (sql) { return db.exec(sql); },
      end: function () { return db.close(); },
      destroy: function () { try { db.close(); } catch (e) {} }
    };
  }

  // Numeric OIDs: values must come back as JS numbers to mirror SQLite.
  var NUMERIC = { 20: 1, 21: 1, 23: 1, 26: 1, 700: 1, 701: 1, 790: 1, 1700: 1 };

  function coerceRow(row, numericCols) {
    var out = null;
    var i, c, col, v, k, val;
    for (c = 0; c < numericCols.length; c++) {
      col = numericCols[c];
      v = row[col];
      if (v == null) continue;
      if (typeof v === 'bigint') { if (!out) out = {}; out[col] = Number(v); continue; }
      if (typeof v === 'string' && /^-?[0-9]+(\\.[0-9]+)?$/.test(v)) {
        var n = Number(v);
        if (isFinite(n)) { if (!out) out = {}; out[col] = n; }
      }
    }
    for (k in row) {
      if (!Object.prototype.hasOwnProperty.call(row, k)) continue;
      val = row[k];
      if (val instanceof Date) {
        if (!out) out = {};
        out[k] = val.toISOString();
      }
    }
    return out ? Object.assign({}, row, out) : row;
  }

  function normalizeQueryResult(result) {
    var rows = result.rows || [];
    var fields = result.fields || [];
    var numericCols = [];
    var i, f;
    for (i = 0; i < fields.length; i++) {
      f = fields[i];
      if (typeof f.dataTypeID === 'number' && NUMERIC[f.dataTypeID]) numericCols.push(f.name);
    }
    var out = [];
    for (i = 0; i < rows.length; i++) out.push(coerceRow(rows[i], numericCols));
    return { rows: out, rowCount: result.rowCount != null ? result.rowCount : 0 };
  }

  // ---- shared-memory framing (mirrors protocol.ts) ----

  function reviver(key, value) {
    if (value && typeof value === 'object' && typeof value.__bridge === 'string') {
      if (value.__bridge === 'bigint') return BigInt(value.v);
      if (value.__bridge === 'buf') return Buffer.from(value.v, 'base64');
    }
    return value;
  }

  function replacer(key, value) {
    if (typeof value === 'bigint') return { __bridge: 'bigint', v: value.toString() };
    if (value instanceof Uint8Array) return { __bridge: 'buf', v: Buffer.from(value).toString('base64') };
    return value;
  }

  function readRequest() {
    var dv = new DataView(reqView.buffer, reqView.byteOffset, reqView.byteLength);
    var len = dv.getInt32(0, true);
    var json = Buffer.from(reqView.subarray(4, 4 + len)).toString('utf8');
    return JSON.parse(json, reviver);
  }

  function writeReply(reply) {
    var json;
    try {
      json = JSON.stringify(reply, replacer);
    } catch (e) {
      json = JSON.stringify({ id: reply.id, ok: false, error: { name: 'Error', message: 'failed to serialize reply: ' + (e && e.message) } });
    }
    var bytes = Buffer.from(json, 'utf8');
    if (bytes.length + 4 > replyView.length) {
      bytes = Buffer.from(JSON.stringify({ id: reply.id, ok: false, error: { name: 'RangeError', message: 'bridge reply exceeds shared buffer' } }), 'utf8');
    }
    var dv = new DataView(replyView.buffer, replyView.byteOffset, replyView.byteLength);
    dv.setInt32(0, bytes.length, true);
    replyView.set(bytes, 4);
    Atomics.store(flag, DONE, reply.id);
    Atomics.notify(flag, DONE);
  }

  function serializeErr(err) {
    return {
      name: (err && err.name) || 'Error',
      message: (err && err.message) ? err.message : String(err),
      stack: (err && err.stack) || undefined
    };
  }

  // ---- op execution (async; the event loop pumps between ops) ----

  function executeOp(msg) {
    var type = msg.type;
    if (type === 'query') {
      var params = (msg.params || []).map(function (p) {
        // pg and PGlite both bind BigInt params most reliably as strings.
        return typeof p === 'bigint' ? p.toString() : p;
      });
      return backend.query(msg.sql, params).then(normalizeQueryResult);
    }
    if (type === 'exec') return backend.exec(msg.sql).then(function () { return {}; });
    if (type === 'begin') return backend.query('BEGIN').then(function () { return {}; });
    if (type === 'commit') return backend.query('COMMIT').then(function () { return {}; });
    if (type === 'rollback') return backend.query('ROLLBACK').then(function () { return {}; });
    if (type === 'close') return backend.end().then(function () { return {}; });
    if (type === 'sleep') return new Promise(function (res) { setTimeout(res, msg.ms || 0); }).then(function () { return {}; });
    if (type === 'kill') {
      // Simulate an unexpected async connection loss: no reply, dead flag set.
      markDead('connection lost (simulated)');
      return new Promise(function () { /* never resolves */ });
    }
    return Promise.reject(new Error('unknown op: ' + type));
  }

  function pump() {
    var reqSeq = Atomics.load(flag, REQ);
    if (reqSeq === lastReq) {
      // Nothing pending — yield to the event loop so in-flight op promises
      // (and their replies) can settle, then poll again.
      setImmediate(pump);
      return;
    }
    lastReq = reqSeq;
    var msg;
    try {
      msg = readRequest();
    } catch (e) {
      writeReply({ id: reqSeq, ok: false, error: { name: 'Error', message: 'malformed request: ' + (e && e.message) } });
      setImmediate(pump);
      return;
    }
    Promise.resolve()
      .then(function () { return executeOp(msg); })
      .then(function (result) {
        if (dead) return; // e.g. 'kill' or connection loss — no reply expected
        writeReply({ id: reqSeq, ok: true, result: result });
      })
      .catch(function (err) {
        writeReply({ id: reqSeq, ok: false, error: serializeErr(err) });
      })
      .then(function () {
        setImmediate(pump);
      });
  }

  // ---- init handshake ----
  Promise.resolve()
    .then(function () {
      if (workerData.pglite) {
        backend = makePgliteBackend();
      } else {
        backend = makePgBackend(workerData.url, workerData.connectionTimeoutMillis);
      }
      return backend.connect();
    })
    .then(function () {
      writeReply({ id: 1, ok: true, result: { backend: workerData.pglite ? 'pglite' : 'pg' } });
      setImmediate(pump);
    })
    .catch(function (err) {
      writeReply({ id: 1, ok: false, error: { name: 'ConnectionError', message: (err && err.message) ? err.message : String(err) } });
      setTimeout(function () { process.exit(1); }, 50);
    });
})();
`;
