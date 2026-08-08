import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import { createDatabase } from '@conversation-engine/saas-core';
import { createHealthRoutes } from '../routes/health';

const TEST_DB = join(__dirname, '__test_health__.db');

function startApp(db: Database.Database) {
  const app = express();
  app.use(createHealthRoutes(db));
  app.use('/api', createHealthRoutes(db));
  return app;
}

async function request(app: express.Express, path: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const server = app.listen(0, () => {
      const port = (server.address() as any).port;
      const r = http.request({ hostname: '127.0.0.1', port, path, method: 'GET' }, (res: any) => {
        let data = '';
        res.on('data', (c: string) => data += c);
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        });
      });
      r.on('error', reject);
      r.end();
    });
  });
}

describe('health routes', () => {
  let db: Database.Database;
  let app: express.Express;

  beforeAll(() => {
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
    db = createDatabase(TEST_DB);
    app = startApp(db);
  });

  afterAll(() => {
    try { db.close(); } catch {}
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
  });

  it('GET /health returns liveness payload with uptime', async () => {
    const res = await request(app, '/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('saas-api');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    expect(new Date(res.body.timestamp).getTime()).not.toBeNaN();
  });

  it('GET /ready returns readiness with database connected', async () => {
    const res = await request(app, '/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.database).toBe('connected');
    expect(typeof res.body.latencyMs).toBe('number');
    expect(res.body.latencyMs).toBeGreaterThanOrEqual(0);
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('GET /live returns alive payload', async () => {
    const res = await request(app, '/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('alive');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('GET /health/detailed reports dependency checks', async () => {
    const res = await request(app, '/health/detailed');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks.database.status).toBe('healthy');
    expect(res.body.version).toBeTruthy();
  });

  it('legacy /api/* probe paths are preserved for backward compatibility', async () => {
    const health = await request(app, '/api/health');
    expect(health.status).toBe(200);
    expect(health.body.status).toBe('ok');

    const ready = await request(app, '/api/ready');
    expect(ready.status).toBe(200);
    expect(ready.body.status).toBe('ready');
    expect(ready.body.database).toBe('connected');

    const live = await request(app, '/api/live');
    expect(live.status).toBe(200);
    expect(live.body.status).toBe('alive');
  });

  it('GET /ready returns 503 when database is unreachable', async () => {
    const brokenDb = createDatabase(':memory:');
    const brokenApp = startApp(brokenDb);
    brokenDb.close();

    const res = await request(brokenApp, '/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not_ready');
    expect(res.body.database).toBe('disconnected');
    expect(res.body.error).toBe('database_unreachable');
  });
});
