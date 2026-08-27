'use strict';

/**
 * Schema verification for the migrated BurFlow database.
 *
 * The expectation is parsed from the migration SQL itself (single source of
 * truth), then compared against PostgreSQL catalogs: table names, column
 * names/nullability/types, primary keys, foreign keys, unique constraints,
 * CHECK constraints, and explicit indexes. Any missing or unexpected object is
 * reported loudly; nothing is ever modified.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_MIGRATION_DIR = path.join(__dirname, '..', 'migrations');
const DEFAULT_SQL_FILE = path.join(DEFAULT_MIGRATION_DIR, '001_initial_schema.sql');

const TYPE_MAP = {
  TEXT: 'text',
  INTEGER: 'integer',
  'DOUBLE PRECISION': 'double precision',
  BYTEA: 'bytea',
};

/** Parse CREATE TABLE / CREATE INDEX from the migration SQL. */
function parseExpected(sql) {
  const tables = new Map(); // name -> { columns: [{name, nullable, type}], pk: [], unique: [], checks: number, fks: Set<refTable> }
  const indexes = [];

  const tableRe = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)\s*\(([\s\S]*?)\);/g;
  let tm;
  while ((tm = tableRe.exec(sql)) !== null) {
    const name = tm[1];
    const body = tm[2];
    const columns = [];
    const pk = [];
    const unique = [];
    let checks = 0;
    const fks = new Set();
    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('--')) continue;
      if (/^(PRIMARY KEY|UNIQUE|CHECK|FOREIGN KEY)\b/.test(line)) {
        // table-level constraint line
        if (/^PRIMARY KEY/.test(line)) {
        const m = /^PRIMARY KEY\s*\(([\w,\s]+)\)/.exec(line);
        if (m) pk.push(...m[1].split(',').map((s) => s.trim()));
      } else if (/^UNIQUE/.test(line)) {
        const m = /^UNIQUE\s*\(([\w,\s]+)\)/.exec(line);
        if (m) unique.push(m[1].split(',').map((s) => s.trim()));
      } else if (/^CHECK\s*\(/.test(line)) {
        checks += 1;
      } else if (/^FOREIGN KEY/.test(line)) {
        const m = /\bREFERENCES\s+(\w+)/.exec(line);
        if (m) fks.add(m[1]);
      }
      } else {
        // column definition — the type is one of the known type words (the
        // migration SQL uses TEXT / INTEGER / DOUBLE PRECISION / BYTEA)
        const cm = /^(\w+)\s+((?:TEXT|INTEGER|DOUBLE PRECISION|BYTEA|TIMESTAMPTZ|TIMESTAMP|BOOLEAN|BIGINT|SMALLINT|REAL|NUMERIC|JSONB|SERIAL|BIGSERIAL))\b\s*(.*)$/.exec(line);
        if (!cm) continue;
        const colName = cm[1];
        const rawType = cm[2].trim();
        const type = TYPE_MAP[rawType] || rawType.toLowerCase();
        const rest = cm[3];
        const nullable = !/\bNOT NULL\b/.test(rest);
        if (/\bPRIMARY KEY\b/.test(rest)) pk.push(colName);
        if (/\bUNIQUE\b/.test(rest)) unique.push([colName]);
        if (/\bCHECK\s*\(/.test(rest)) checks += 1;
        const fkm = /\bREFERENCES\s+(\w+)/.exec(rest);
        if (fkm) fks.add(fkm[1]);
        columns.push({ name: colName, type, nullable });
      }
    }
    // PostgreSQL always marks primary-key columns NOT NULL.
    const colByName = new Map(columns.map((c) => [c.name, c]));
    for (const p of pk) {
      const c = colByName.get(p);
      if (c) c.nullable = false;
    }
    tables.set(name, { columns, pk, unique, checks, fks });
  }

  // Handle ALTER TABLE ... ADD COLUMN from later migrations
  const alterRe = /ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?(\w+)\s+((?:TEXT|INTEGER|DOUBLE PRECISION|BYTEA|TIMESTAMPTZ|TIMESTAMP|BOOLEAN|BIGINT|SMALLINT|REAL|NUMERIC|JSONB|SERIAL|BIGSERIAL|NUMERIC))\b/gi;
  let am;
  while ((am = alterRe.exec(sql)) !== null) {
    const tblName = am[1];
    const colName = am[2];
    const rawType = am[3].trim();
    const type = TYPE_MAP[rawType] || rawType.toLowerCase();
    if (!tables.has(tblName)) {
      tables.set(tblName, { columns: [], pk: [], unique: [], checks: 0, fks: new Set() });
    }
    const tbl = tables.get(tblName);
    if (!tbl.columns.some(c => c.name === colName)) {
      tbl.columns.push({ name: colName, type, nullable: true });
    }
  }

  // CREATE UNIQUE INDEX (supports partial indexes with WHERE clause)
  const uniqueIndexRe = /CREATE UNIQUE INDEX\s+(?:IF NOT EXISTS\s+)?(\w+)\s+ON\s+(\w+)\s*\(([\w,\s]+)\)/g;
  let uim;
  while ((uim = uniqueIndexRe.exec(sql)) !== null) {
    indexes.push({
      name: uim[1],
      table: uim[2],
      columns: uim[3].split(',').map((s) => s.trim()),
    });
  }

  const indexRe = /CREATE INDEX\s+(?:IF NOT EXISTS\s+)?(\w+)\s+ON\s+(\w+)\s*\(([\w,\s]+)\)/g;
  let im;
  while ((im = indexRe.exec(sql)) !== null) {
    indexes.push({
      name: im[1],
      table: im[2],
      columns: im[3].split(',').map((s) => s.trim()),
    });
  }
  return { tables, indexes };
}

/** Query catalogs for what actually exists. */
async function collectActual(adapter) {
  const t = await adapter.query(
    "SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public'",
  );
  const tables = new Map(t.rows.map((r) => [r.name, { columns: [], pk: [], unique: [], checks: 0, fks: new Set() }]));

  const c = await adapter.query(
    "SELECT table_name AS t, column_name AS n, is_nullable AS nl, data_type AS dt FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position",
  );
  for (const row of c.rows) {
    const tbl = tables.get(row.t);
    if (tbl) tbl.columns.push({ name: row.n, type: row.dt, nullable: row.nl === 'YES' });
  }

  const k = await adapter.query(
    `SELECT tc.table_name AS t, tc.constraint_type AS ty, kcu.column_name AS n, kcu.ordinal_position AS ord
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public' AND tc.constraint_type IN ('PRIMARY KEY','UNIQUE')
      ORDER BY tc.table_name, kcu.ordinal_position`,
  );
  for (const row of k.rows) {
    const tbl = tables.get(row.t);
    if (!tbl) continue;
    if (row.ty === 'PRIMARY KEY') tbl.pk.push(row.n);
    else tbl.unique.push(row.n);
  }

  const f = await adapter.query(
    `SELECT conrelid::regclass::text AS t, confrelid::regclass::text AS ref
       FROM pg_constraint
      WHERE contype = 'f' AND connamespace = 'public'::regnamespace`,
  );
  for (const row of f.rows) {
    const tbl = tables.get(row.t);
    if (tbl) tbl.fks.add(row.ref);
  }

  // Group unique constraints per table (constraint columns, excluding PK backstops)
  const u = await adapter.query(
    `SELECT tc.table_name AS t, tc.constraint_name AS cn, kcu.column_name AS n
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public' AND tc.constraint_type = 'UNIQUE'
      ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position`,
  );
  const uniques = new Map(); // table -> string[] of sorted column-sets
  for (const row of u.rows) {
    if (!uniques.has(row.t)) uniques.set(row.t, new Map());
    const byConst = uniques.get(row.t);
    if (!byConst.has(row.cn)) byConst.set(row.cn, []);
    byConst.get(row.cn).push(row.n);
  }
  const uniquesFinal = new Map();
  for (const [t, byConst] of uniques) {
    const sets = [];
    for (const cols of byConst.values()) {
      const isPk = cols.length === tables.get(t).pk.length && cols.every((c) => tables.get(t).pk.includes(c));
      if (!isPk) sets.push([...cols].sort().join(','));
    }
    uniquesFinal.set(t, sets.sort());
  }

  const ch = await adapter.query(
    `SELECT conrelid::regclass::text AS t
       FROM pg_constraint
      WHERE contype = 'c' AND connamespace = 'public'::regnamespace`,
  );
  for (const row of ch.rows) {
    const tbl = tables.get(row.t);
    if (tbl) tbl.checks += 1;
  }

  const ix = await adapter.query(
    `SELECT indexname AS name FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
        AND indexname NOT LIKE '%_key'`,
  );
  const indexes = new Set(ix.rows.map((r) => r.name));

  return { tables, indexes, uniques: uniquesFinal };
}

/** Compare expected vs actual. Returns { errors, summary }. */
async function verifySchema(adapter, sqlFile = DEFAULT_SQL_FILE) {
  // Merge schema from 001_initial_schema.sql + all subsequent ALTER TABLE migrations
  const expected = { tables: new Map(), indexes: [] };

  // Load all .sql files in the migrations directory in order
  const migrationDir = path.dirname(sqlFile);
  const sqlFiles = fs.readdirSync(migrationDir)
    .filter(f => f.endsWith('.sql'))
    .sort()
    .map(f => path.join(migrationDir, f));

  for (const file of sqlFiles) {
    const sql = fs.readFileSync(file, 'utf8');
    const parsed = parseExpected(sql);
    // Merge tables
    for (const [name, tbl] of parsed.tables) {
      if (!expected.tables.has(name)) {
        expected.tables.set(name, { columns: [...tbl.columns], pk: [...tbl.pk], unique: [...tbl.unique], checks: tbl.checks, fks: new Set(tbl.fks) });
      } else {
        const existing = expected.tables.get(name);
        for (const col of tbl.columns) {
          if (!existing.columns.some(c => c.name === col.name)) {
            existing.columns.push(col);
          }
        }
      }
    }
    // Merge indexes
    for (const idx of parsed.indexes) {
      if (!expected.indexes.some(e => e.name === idx.name)) {
        expected.indexes.push(idx);
      }
    }
  }
  const actual = await collectActual(adapter);
  const errors = [];

  // Tables
  const expectedTables = [...expected.tables.keys()].sort();
  const actualTables = [...actual.tables.keys()].sort();
  for (const name of expectedTables) {
    if (!actual.tables.has(name)) errors.push(`missing table: ${name}`);
  }
  for (const name of actualTables) {
    if (name === 'schema_migrations') continue;
    if (!expected.tables.has(name)) errors.push(`unexpected table: ${name}`);
  }

  // Per-table detail
  for (const [name, exp] of expected.tables) {
    const act = actual.tables.get(name);
    if (!act) continue;
    const actCols = new Map(act.columns.map((c) => [c.name, c]));
    for (const col of exp.columns) {
      const got = actCols.get(col.name);
      if (!got) {
        errors.push(`table ${name}: missing column ${col.name}`);
        continue;
      }
      if (got.type !== col.type) {
        errors.push(`table ${name}: column ${col.name} type ${got.type} != expected ${col.type}`);
      }
      if (got.nullable !== col.nullable) {
        errors.push(`table ${name}: column ${col.name} nullability mismatch (actual ${got.nullable ? 'nullable' : 'NOT NULL'})`);
      }
    }
    for (const gotCol of act.columns) {
      if (!exp.columns.some((c) => c.name === gotCol.name)) {
        errors.push(`table ${name}: unexpected column ${gotCol.name}`);
      }
    }
    // PK
    const expPk = [...exp.pk].sort().join(',');
    const actPk = [...act.pk].sort().join(',');
    if (expPk !== actPk) {
      errors.push(`table ${name}: primary key mismatch (expected [${expPk}] actual [${actPk}])`);
    }
    // Unique constraints — compare sets of column-sets (grouped per constraint)
    const expUnique = exp.unique.map((u) => [...u].sort().join(',')).sort();
    const actUnique = (actual.uniques.get(name) || []).sort();
    if (expUnique.join('|') !== actUnique.join('|')) {
      errors.push(`table ${name}: unique constraints mismatch (expected [${expUnique.join(' | ')}] actual [${actUnique.join(' | ')}])`);
    }
    // FKs
    const expFks = [...exp.fks].sort();
    const actFks = [...act.fks].sort();
    if (expFks.join(',') !== actFks.join(',')) {
      errors.push(`table ${name}: foreign keys mismatch (expected -> ${expFks.join(', ')}, actual -> ${actFks.join(', ')})`);
    }
    // CHECKs
    if (act.checks !== exp.checks) {
      errors.push(`table ${name}: CHECK constraint count mismatch (expected ${exp.checks}, actual ${act.checks})`);
    }
  }

  // Indexes
  for (const exp of expected.indexes) {
    if (!actual.indexes.has(exp.name)) {
      errors.push(`missing index: ${exp.name} on ${exp.table}(${exp.columns.join(',')})`);
    }
  }
  for (const name of actual.indexes) {
    if (!expected.indexes.some((i) => i.name === name)) {
      errors.push(`unexpected index: ${name}`);
    }
  }

  const summary = {
    tables: expectedTables.length,
    columns: [...expected.tables.values()].reduce((n, t) => n + t.columns.length, 0),
    indexes: expected.indexes.length,
  };
  return { errors, summary };
}

module.exports = { parseExpected, verifySchema, DEFAULT_MIGRATION_DIR };
