import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import http from 'http';
import { createWidgetRoutes } from '../routes/widget';
import { createHmac } from 'crypto';

function signWidgetToken(encoded: string, secret: string) {
  return createHmac('sha256', secret).update(encoded).digest('hex');
}

function makeToken(tenantId: string, secret: string) {
  const payload = {
    tenantId,
    type: 'widget' as const,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = signWidgetToken(encoded, secret);
  return `${encoded}.${sig}`;
}

describe('widget token verification', () => {
  const servers: http.Server[] = [];
  const REAL_WIDGET_SECRET = 'test-widget-secret-1234567890abcdef';

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    })));
    delete process.env.WIDGET_SECRET;
  });

  async function requestWithToken(token: string): Promise<{ statusCode: number; body: string }> {
    const app = express();
    app.use(express.json());
    const widgetConfigRepo = {
      get: () => ({ theme: 'light', position: 'bottom-right', primaryColor: '#6366f1', logoUrl: undefined, companyName: 'BurFlow', greeting: 'Hi!', launcherText: 'Start', businessProfile: undefined, allowedDomains: [], autoOpen: false, autoOpenDelay: 3 }),
    };
    app.use('/api/widget', createWidgetRoutes(widgetConfigRepo as any));

    const server = app.listen(0);
    servers.push(server);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const port = (server.address() as any).port;

    return new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port, path: `/api/widget/config?token=${encodeURIComponent(token)}`, method: 'GET' }, (response) => {
        let raw = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { raw += chunk; });
        response.on('end', () => resolve({ statusCode: response.statusCode || 0, body: raw }));
      });
      req.on('error', reject);
      req.end();
    });
  }

  it('rejects widget tokens signed with a legacy dev secret', async () => {
    // Regression guard: tokens signed with published dev secrets must never be
    // accepted once a real WIDGET_SECRET is configured.
    process.env.WIDGET_SECRET = REAL_WIDGET_SECRET;

    const token = makeToken('demo-tenant', 'development-widget-secret-do-not-use-in-production');
    const res = await requestWithToken(token);

    expect(res.statusCode).toBe(401);
  });

  it('accepts widget tokens signed with the configured secret', async () => {
    process.env.WIDGET_SECRET = REAL_WIDGET_SECRET;

    const token = makeToken('demo-tenant', REAL_WIDGET_SECRET);
    const res = await requestWithToken(token);

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.theme).toBe('light');
  });

  it('rejects all widget tokens when WIDGET_SECRET is not configured', async () => {
    delete process.env.WIDGET_SECRET;

    const token = makeToken('demo-tenant', REAL_WIDGET_SECRET);
    const res = await requestWithToken(token);

    expect(res.statusCode).toBe(401);
  });
});
