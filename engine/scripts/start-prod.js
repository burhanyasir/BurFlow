'use strict';

/**
 * Production supervisor for Render deployment.
 *
 * Runs:
 *  1. Database migration (node scripts/db-migrate.js) — exits non-zero on failure.
 *  2. Pipeline orchestrator (PORT=3456) and SaaS API (Render-injected PORT) as
 *     child processes, each reusing their own startup + shutdown mechanisms.
 *
 * Forwards SIGTERM/SIGINT to children. If either child dies, terminates the other
 * and exits non-zero so Render restarts the container.
 */

const { spawn } = require('child_process');
const path = require('path');

// ---------------------------------------------------------------------------
// Paths (relative to engine/)
// ---------------------------------------------------------------------------

const ORCHESTRATOR_SCRIPT = path.join(__dirname, '..', 'packages', 'pipeline-orchestrator', 'dist', 'server.js');
const SAAS_API_SCRIPT = path.join(__dirname, '..', 'packages', 'saas-api', 'dist', 'index.js');
const MIGRATE_SCRIPT = path.join(__dirname, 'db-migrate.js');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ORCHESTRATOR_PORT = '3456';
const SAAS_API_PORT = process.env.PORT || '3000';
const SHUTDOWN_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Logging (pino-compatible JSON to stderr)
// ---------------------------------------------------------------------------

function log(level, msg, extra) {
  const entry = { time: new Date().toISOString(), level, msg, ...extra };
  process.stderr.write(JSON.stringify(entry) + '\n');
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let shuttingDown = false;
let orchestrator = null;
let saasApi = null;

// ---------------------------------------------------------------------------
// Child-process helpers
// ---------------------------------------------------------------------------

function spawnChild(label, command, args, env) {
  log('info', `Starting ${label}`, { command, args, env });

  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: false,
  });

  child.on('error', (err) => {
    log('error', `${label} failed to start`, { error: err.message, pid: child.pid });
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    if (signal) {
      log('error', `${label} exited by signal`, { signal, pid: child.pid });
    } else {
      log('error', `${label} exited unexpectedly`, { code, pid: child.pid });
    }
  });

  return child;
}

function killChild(child, label) {
  if (!child || child.killed) return;
  try {
    child.kill('SIGTERM');
    log('info', `Sent SIGTERM to ${label}`, { pid: child.pid });
  } catch (err) {
    log('warn', `Failed to SIGTERM ${label}`, { error: err.message, pid: child.pid });
  }
}

function escalateToKill(child, label) {
  if (!child || child.killed) return;
  try {
    child.kill('SIGKILL');
    log('warn', `Sent SIGKILL to ${label} after timeout`, { pid: child.pid });
  } catch (err) {
    log('error', `Failed to SIGKILL ${label}`, { error: err.message, pid: child.pid });
  }
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

function runMigration() {
  log('info', 'Running database migration', { script: MIGRATE_SCRIPT });

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [MIGRATE_SCRIPT], {
      env: process.env,
      stdio: ['ignore', 'inherit', 'inherit'],
      shell: false,
    });

    child.on('error', (err) => {
      log('error', 'Migration process failed to start', { error: err.message });
      reject(err);
    });

    child.on('exit', (code, signal) => {
      if (code === 0) {
        log('info', 'Migration succeeded');
        resolve();
      } else {
        const detail = signal ? `signal ${signal}` : `code ${code}`;
        log('error', `Migration failed (${detail})`, { code, signal });
        reject(new Error(`Migration failed: ${detail}`));
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Start both services
// ---------------------------------------------------------------------------

function startServices() {
  // Pipeline orchestrator — always on port 3456
  orchestrator = spawnChild(
    'pipeline-orchestrator',
    process.execPath,
    [ORCHESTRATOR_SCRIPT],
    { PORT: ORCHESTRATOR_PORT },
  );

  // SaaS API — port from Render (injected as $PORT)
  saasApi = spawnChild(
    'saas-api',
    process.execPath,
    [SAAS_API_SCRIPT],
    { PORT: SAAS_API_PORT },
  );

  // --- Orchestrator exit handler ---
  orchestrator.on('exit', (code, signal) => {
    if (shuttingDown) return;
    log('error', 'Orchestrator died — terminating saas-api and exiting', { code, signal, pid: orchestrator.pid });
    killChild(saasApi, 'saas-api');
    setTimeout(() => process.exit(1), 2000);
  });

  // --- SaaS API exit handler (primary service) ---
  saasApi.on('exit', (code, signal) => {
    if (shuttingDown) return;
    log('error', 'SaaS API died — terminating orchestrator and exiting', { code, signal, pid: saasApi.pid });
    killChild(orchestrator, 'pipeline-orchestrator');
    setTimeout(() => process.exit(code || 1), 2000);
  });

  log('info', 'Both services launched', {
    orchestratorPid: orchestrator.pid,
    saasApiPid: saasApi.pid,
    orchestratorPort: ORCHESTRATOR_PORT,
    saasApiPort: SAAS_API_PORT,
  });
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  log('info', `Received ${signal} — shutting down`, {
    orchestratorPid: orchestrator?.pid,
    saasApiPid: saasApi?.pid,
  });

  killChild(orchestrator, 'pipeline-orchestrator');
  killChild(saasApi, 'saas-api');

  // Wait for children to exit, then force-kill after timeout
  let remaining = 0;
  if (orchestrator && !orchestrator.killed) remaining++;
  if (saasApi && !saasApi.killed) remaining++;

  const timer = setTimeout(() => {
    escalateToKill(orchestrator, 'pipeline-orchestrator');
    escalateToKill(saasApi, 'saas-api');
    process.exit(0);
  }, SHUTDOWN_TIMEOUT_MS);

  function onChildExit() {
    remaining--;
    if (remaining <= 0) {
      clearTimeout(timer);
      log('info', 'All services stopped');
      process.exit(0);
    }
  }

  if (orchestrator && !orchestrator.killed) orchestrator.on('exit', onChildExit);
  if (saasApi && !saasApi.killed) saasApi.on('exit', onChildExit);

  // If already dead, decrement immediately
  if (orchestrator && orchestrator.killed) remaining--;
  if (saasApi && saasApi.killed) remaining--;
  if (remaining <= 0) {
    clearTimeout(timer);
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  log('info', 'start-prod.js supervisor starting', { pid: process.pid });

  // 1. Run migration — fail fast if schema is not ready
  try {
    await runMigration();
  } catch (err) {
    log('error', 'Migration failed — aborting startup', { error: err.message });
    process.exit(1);
  }

  // 2. Launch both services
  startServices();
}

main();
