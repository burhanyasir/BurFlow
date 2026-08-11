import { describe, it, expect } from 'vitest';
import { rewritePlaceholders } from '../db/pg/placeholder';

describe('rewritePlaceholders (SQLite `?` → Postgres `$n`)', () => {
  it('rewrites simple positional placeholders', () => {
    const r = rewritePlaceholders('SELECT * FROM t WHERE a = ? AND b = ?');
    expect(r.sql).toBe('SELECT * FROM t WHERE a = $1 AND b = $2');
    expect(r.count).toBe(2);
  });

  it('handles INSERT VALUES lists and LIMIT/OFFSET', () => {
    const r = rewritePlaceholders('INSERT INTO t (a, b) VALUES (?, ?)');
    expect(r.sql).toBe('INSERT INTO t (a, b) VALUES ($1, $2)');
    const l = rewritePlaceholders('SELECT * FROM t ORDER BY id DESC LIMIT ? OFFSET ?');
    expect(l.sql).toBe('SELECT * FROM t ORDER BY id DESC LIMIT $1 OFFSET $2');
  });

  it('never rewrites `?` inside single-quoted strings', () => {
    const r = rewritePlaceholders("SELECT * FROM t WHERE content = '?' AND flag = ?");
    expect(r.sql).toBe("SELECT * FROM t WHERE content = '?' AND flag = $1");
  });

  it('handles escaped quotes inside strings (doubled quotes)', () => {
    const r = rewritePlaceholders("SELECT * FROM t WHERE note = 'it''s a ? here' AND x = ?");
    expect(r.sql).toBe("SELECT * FROM t WHERE note = 'it''s a ? here' AND x = $1");
  });

  it('ignores `?` in line comments', () => {
    const r = rewritePlaceholders('SELECT * FROM t -- why ? not a param\nWHERE a = ?');
    expect(r.sql).toBe('SELECT * FROM t -- why ? not a param\nWHERE a = $1');
  });

  it('ignores `?` in block comments', () => {
    const r = rewritePlaceholders('SELECT * FROM t /* ? ? */ WHERE a = ?');
    expect(r.sql).toBe('SELECT * FROM t /* ? ? */ WHERE a = $1');
  });

  it('ignores `?` inside double-quoted identifiers', () => {
    const r = rewritePlaceholders('SELECT "col?" FROM t WHERE "col?" = ?');
    expect(r.sql).toBe('SELECT "col?" FROM t WHERE "col?" = $1');
  });

  it('leaves dollar-quoted strings untouched (defensive)', () => {
    const r = rewritePlaceholders("SELECT $tag$? is data$tag$ WHERE a = ?");
    expect(r.sql).toBe("SELECT $tag$? is data$tag$ WHERE a = $1");
  });

  it('preserves LIKE patterns', () => {
    const r = rewritePlaceholders('SELECT * FROM leads WHERE name LIKE ? OR email LIKE ?');
    expect(r.sql).toBe('SELECT * FROM leads WHERE name LIKE $1 OR email LIKE $2');
  });

  it('numbers continuously across multiple statements (bridge will reject those with params)', () => {
    const r = rewritePlaceholders('SELECT ?; SELECT ?');
    expect(r.sql).toBe('SELECT $1; SELECT $2');
  });

  it('returns count 0 when there are no placeholders', () => {
    const r = rewritePlaceholders('SELECT 1');
    expect(r.sql).toBe('SELECT 1');
    expect(r.count).toBe(0);
  });

  it('handles question marks in string content followed by real params', () => {
    const r = rewritePlaceholders("UPDATE t SET q = 'what?? why?', x = ? WHERE id = ?");
    expect(r.sql).toBe("UPDATE t SET q = 'what?? why?', x = $1 WHERE id = $2");
  });
});
