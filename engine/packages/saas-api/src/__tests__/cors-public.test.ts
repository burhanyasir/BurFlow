import { describe, it, expect } from 'vitest';
import express from 'express';
import cors from 'cors';

/**
 * Regression: public widget/chat/lead endpoints are embedded on arbitrary
 * customer sites, so they must emit Access-Control-Allow-Origin even when
 * CORS_ORIGIN is unset. They are mounted BEFORE the CORS_ORIGIN-gated global
 * cors so a missing CORS_ORIGIN can never block an embedded widget.
 */
function makeApp() {
  const a = express();
  const publicCors = cors({ origin: true, credentials: false });
  a.use('/api/widget', publicCors);
  a.use('/api/chat', publicCors);
  a.use('/api/public', publicCors);
  // Simulate the production default: CORS_ORIGIN unset → origin: false (no ACAO).
  a.use(cors({ origin: false, credentials: true }));
  a.get('/api/widget/ping', (_req, res) => res.json({ ok: true }));
  a.get('/api/chat/ping', (_req, res) => res.json({ ok: true }));
  a.get('/api/public/ping', (_req, res) => res.json({ ok: true }));
  // Admin route: must NOT emit ACAO when CORS_ORIGIN is unset.
  a.get('/api/admin/ping', (_req, res) => res.json({ ok: true }));
  return a;
}

async function request(path: string, origin?: string) {
  return new Promise<{ status: number; headers: Record<string, string | string[] | undefined> }>((resolve) => {
    const http = require('http');
    const app = makeApp();
    const server = app.listen(0, () => {
      const port = (server.address() as any).port;
      const headers: Record<string, string> = origin ? { Origin: origin } : {};
      const r = http.request({ hostname: '127.0.0.1', port, path, method: 'GET', headers }, (res: any) => {
        server.close();
        resolve({ status: res.statusCode, headers: res.headers });
      });
      r.end();
    });
  });
}

describe('Public endpoint CORS', () => {
  it('reflects the request origin on /api/widget when CORS_ORIGIN is unset', async () => {
    const { status, headers } = await request('/api/widget/ping', 'https://customer-site.com');
    expect(status).toBe(200);
    expect(headers['access-control-allow-origin']).toBe('https://customer-site.com');
  });

  it('reflects the request origin on /api/chat when CORS_ORIGIN is unset', async () => {
    const { status, headers } = await request('/api/chat/ping', 'https://customer-site.com');
    expect(status).toBe(200);
    expect(headers['access-control-allow-origin']).toBe('https://customer-site.com');
  });

  it('reflects the request origin on /api/public when CORS_ORIGIN is unset', async () => {
    const { status, headers } = await request('/api/public/ping', 'https://customer-site.com');
    expect(status).toBe(200);
    expect(headers['access-control-allow-origin']).toBe('https://customer-site.com');
  });

  it('does not emit ACAO on /api/admin when CORS_ORIGIN is unset (same-origin only)', async () => {
    const { status, headers } = await request('/api/admin/ping', 'https://customer-site.com');
    expect(status).toBe(200);
    expect(headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers OPTIONS preflight with a reflected origin on public paths', async () => {
    return new Promise<void>((resolve) => {
      const http = require('http');
      const app = makeApp();
      const server = app.listen(0, () => {
        const port = (server.address() as any).port;
        const r = http.request({
          hostname: '127.0.0.1', port, path: '/api/widget/ping', method: 'OPTIONS',
          headers: {
            Origin: 'https://customer-site.com',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'authorization',
          },
        }, (res: any) => {
          server.close();
          expect(res.statusCode).toBe(204);
          expect(res.headers['access-control-allow-origin']).toBe('https://customer-site.com');
          expect(res.headers['access-control-allow-methods']).toContain('GET');
          resolve();
        });
        r.end();
      });
    });
  });
});
