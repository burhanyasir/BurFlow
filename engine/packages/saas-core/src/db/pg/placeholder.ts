/**
 * Rewrites better-sqlite3 style `?` positional placeholders into PostgreSQL
 * `$n` numbered placeholders, using a small state machine so `?` characters
 * inside SQL literals are never rewritten:
 *
 *   - single-quoted strings ('...' with '' escapes)
 *   - double-quoted identifiers ("...")
 *   - line comments (-- ...)
 *   - block comments (/* ... *\/)
 *   - dollar-quoted strings ($$...$$, $tag$...$tag$) — defensive; SQLite SQL
 *     never uses them, but the parser should not corrupt them either.
 *
 * The input SQL is single-statement SQLite dialect; `$n` output is valid in
 * any PostgreSQL statement. Called once per prepared statement and cached by
 * the caller.
 */

export interface RewrittenSql {
  /** SQL with `$1..$n` placeholders. */
  sql: string;
  /** Number of placeholders found. */
  count: number;
}

export function rewritePlaceholders(input: string): RewrittenSql {
  let out = '';
  let count = 0;
  let i = 0;
  const n = input.length;

  while (i < n) {
    const ch = input[i];
    const next = input[i + 1];

    if (ch === "'") {
      // Single-quoted string literal; '' is an escaped quote.
      out += ch;
      i++;
      while (i < n) {
        if (input[i] === "'") {
          if (input[i + 1] === "'") {
            out += "''";
            i += 2;
            continue;
          }
          out += "'";
          i++;
          break;
        }
        out += input[i];
        i++;
      }
      continue;
    }

    if (ch === '"') {
      // Double-quoted identifier.
      out += ch;
      i++;
      while (i < n) {
        if (input[i] === '"') {
          if (input[i + 1] === '"') {
            out += '""';
            i += 2;
            continue;
          }
          out += '"';
          i++;
          break;
        }
        out += input[i];
        i++;
      }
      continue;
    }

    if (ch === '-' && next === '-') {
      // Line comment to end of line.
      while (i < n && input[i] !== '\n') {
        out += input[i];
        i++;
      }
      continue;
    }

    if (ch === '/' && next === '*') {
      // Block comment.
      out += '/*';
      i += 2;
      while (i < n) {
        if (input[i] === '*' && input[i + 1] === '/') {
          out += '*/';
          i += 2;
          break;
        }
        out += input[i];
        i++;
      }
      continue;
    }

    if (ch === '$') {
      // Dollar-quoted string (defensive): $$...$$ or $tag$...$tag$.
      const tagMatch = /^\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$/.exec(input.slice(i));
      if (tagMatch) {
        const tag = tagMatch[0];
        out += tag;
        i += tag.length;
        const idx = input.indexOf(tag, i);
        if (idx === -1) {
          out += input.slice(i);
          i = n;
        } else {
          out += input.slice(i, idx + tag.length);
          i = idx + tag.length;
        }
        continue;
      }
      out += ch;
      i++;
      continue;
    }

    if (ch === '?') {
      count++;
      out += `$${count}`;
      i++;
      continue;
    }

    out += ch;
    i++;
  }

  return { sql: out, count };
}
