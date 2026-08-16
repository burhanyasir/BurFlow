import { describe, it, expect } from 'vitest';
import express from 'express';
import http from 'http';
import { requireTenant } from '../middleware/tenant';

describe('requireTenant demo-tenant tolerance', () => {
  const tenantRepo = {
    findById: (id: string) => (id === 'tenant-123' ? { id: 'tenant-123', slug: 'acme' } : null),
  };

  function startServer(allowDemoTenants: boolean): Promise<{ port: number; close: () => Promise<void> }> {
    return new Promise((resolve) => {
      const app = express();
      app.use((req: any, _res: any, next: any) => {
        req.tenantId = (req.query.tenantId as string) || undefined;
        next();
      });
      app.get('/guard', requireTenant(tenantRepo as any, { allowDemoTenants }), (req: any, res: any) => {
        res.json({ ok: true, tenant: req.tenant });
      });
      const server = app.listen(0, () => {
        resolve({
          port: (server.address() as any).port,
          close: () => new Promise<void>((resolveClose) => server.close(() => resolveClose())),
        });
      });
    });
  }

  async function request(port: number, path: string): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port, path, method: 'GET' }, (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: raw }));
      });
      req.on('error', reject);
      req.end();
    });
  }

  it('allows a known demo tenant when allowDemoTenants is enabled', async () => {
    const server = await startServer(true);
    try {
      const res = await request(server.port, '/guard?tenantId=burflow-saas');
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.tenant.id).toBe('burflow-saas');
    } finally {
      await server.close();
    }
  });

  it('still rejects an unknown tenant when allowDemoTenants is enabled', async () => {
    const server = await startServer(true);
    try {
      const res = await request(server.port, '/guard?tenantId=nope');
      expect(res.statusCode).toBe(404);
    } finally {
      await server.close();
    }
  });

  it('rejects demo tenants by default (strict mode for admin routes)', async () => {
    const server = await startServer(false);
    try {
      const res = await request(server.port, '/guard?tenantId=burflow-saas');
      expect(res.statusCode).toBe(404);
    } finally {
      await server.close();
    }
  });

  it('bootstraps a missing demo tenant row via ensureDemoTenant before proceeding', async () => {
    let bootstrapped = false;
    const bootstrappingRepo = {
      findById: (id: string) => (id === 'burflow-saas' && bootstrapped ? { id: 'burflow-saas', slug: 'burflow-saas' } : null),
      ensureDemoTenant: (id: string) => { bootstrapped = id === 'burflow-saas'; },
    };

    return new Promise<void>((resolve, reject) => {
      const app = express();
      app.use((req: any, _res: any, next: any) => { req.tenantId = 'burflow-saas'; next(); });
      app.get('/guard', requireTenant(bootstrappingRepo as any, { allowDemoTenants: true }), (req: any, res: any) => {
        res.json({ ok: true, tenant: req.tenant });
      });
      const server = app.listen(0, async () => {
        try {
          const port = (server.address() as any).port;
          const res = await request(port, '/guard');
          expect(res.statusCode).toBe(200);
          expect(bootstrapped).toBe(true);
          const body = JSON.parse(res.body);
          expect(body.tenant.id).toBe('burflow-saas');
          await new Promise<void>((closeResolve) => server.close(() => closeResolve()));
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  });

  it('passes through and attaches the tenant for an existing tenant row', async () => {
    const server = await startServer(true);
    try {
      const res = await request(server.port, '/guard?tenantId=tenant-123');
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.tenant.id).toBe('tenant-123');
    } finally {
      await server.close();
    }
  });

  it('requires a tenant context', async () => {
    const server = await startServer(true);
    try {
      const res = await request(server.port, '/guard');
      expect(res.statusCode).toBe(400);
    } finally {
      await server.close();
    }
  });
});
