/**
 * Starts the local BurFlow SaaS API (engine/packages/saas-api) for the E2E
 * suite. Used as a Playwright webServer entry (waits for /api/health).
 *
 * Env resolution (all local-only — production Neon DATABASE_URL is stripped
 * so the API runs against SQLite at engine/data/saas.db):
 *   - JWT_SECRET / WIDGET_SECRET / DB_PATH      ← saas-api/.env.local
 *   - GROQ_API_KEY / OPENROUTER_API_KEY          ← engine/.env (fallback .env.local)
 *   - NODE_ENV=development, PORT=3457
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENGINE = join(ROOT, 'engine');
const API_PKG = join(ENGINE, 'packages', 'saas-api');
const API_PORT = Number(process.env.E2E_API_PORT || 3457);

function findNode() {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const candidates = [
    process.env.NODE_BIN,
    'node',
    join(home, 'AppData', 'Local', 'Temp', 'opencode', 'node24', 'node-v24.3.0-win-x64', 'node.exe'),
    join(home, 'AppData', 'Local', 'Temp', 'opencode', 'node20', 'node-v20.20.2-win-x64', 'node.exe'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const res = spawnSync(candidate, ['--version'], { stdio: 'ignore' });
      if (res.status === 0) return candidate;
    } catch {}
  }
  return null;
}

function parseEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    let key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value.includes('#')) value = value.split(' #')[0].trim();
    out[key] = value;
  }
  return out;
}

const rootEnv = parseEnv(join(ENGINE, '.env'));
const apiEnv = parseEnv(join(API_PKG, '.env.local'));

const env = { ...process.env };
// NEVER touch the production database from the E2E suite.
delete env.DATABASE_URL;
delete env.KNOWLEDGE_DB_PATH;

env.NODE_ENV = 'development';
env.PORT = String(API_PORT);
env.JWT_SECRET = apiEnv.JWT_SECRET || rootEnv.JWT_SECRET;
env.WIDGET_SECRET = apiEnv.WIDGET_SECRET || rootEnv.WIDGET_SECRET;
env.DB_PATH = apiEnv.DB_PATH || join(ENGINE, 'data', 'saas.db');
env.KNOWLEDGE_DB_PATH = join(ENGINE, 'data', 'knowledge-saas.db');
env.GROQ_API_KEY = rootEnv.GROQ_API_KEY || apiEnv.GROQ_API_KEY || '';
env.GROQ_API_KEY_2 = rootEnv.GROQ_API_KEY_2 || apiEnv.GROQ_API_KEY_2 || '';
env.OPENROUTER_API_KEY = rootEnv.OPENROUTER_API_KEY || apiEnv.OPENROUTER_API_KEY || '';

const node = findNode();
if (!node) {
  console.error('[e2e:api] node not found on PATH or known locations — cannot start the engine API');
  process.exit(1);
}

// The engine runs against a compiled dist (tsc -b) because better-sqlite3's
// native binding requires a real Node runtime (bun refuses to load it) and
// Node's type-stripping cannot resolve the engine's extensionless imports.
const entry = join(API_PKG, 'dist', 'index.js');
if (!existsSync(entry)) {
  console.error(
    `[e2e:api] ${entry} not found — build the engine first: ` +
      `cd engine && bun run build (tsc -b) or npm run build`
  );
  process.exit(1);
}

const child = spawn(node, [entry], {
  cwd: ENGINE,
  env,
  stdio: ['ignore', 'inherit', 'inherit'],
  windowsHide: false,
  shell: false,
});

child.on('error', (err) => {
  console.error('[e2e:api] failed to spawn API:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  console.error(`[e2e:api] API exited with code ${code}`);
  process.exit(code ?? 1);
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));

async function waitForHealth() {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${API_PORT}/api/health`);
      if (res.ok) {
        console.log(`[e2e:api] healthy on :${API_PORT}`);
        return;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 750));
  }
  console.error('[e2e:api] API did not become healthy in time');
  child.kill('SIGKILL');
  process.exit(1);
}

waitForHealth();
