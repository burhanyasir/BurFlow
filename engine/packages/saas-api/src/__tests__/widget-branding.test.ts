import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import { createDatabase, UserRepository, TenantRepository, RefreshTokenRepository, WidgetConfigRepository } from '@conversation-engine/saas-core';
import { authMiddleware } from '../middleware/auth';
import { createAuthRoutes } from '../routes/auth';
import { createWidgetRoutes } from '../routes/widget';
import jwt from 'jsonwebtoken';

describe('widget branding & customization API', () => {
  const TEST_DB = join(__dirname, '__test_widget_branding__.db');
  const JWT_SECRET = 'test-secret-key-for-widget-branding';
  const WIDGET_SECRET = 'test-widget-secret-for-widget-branding';

  let db: Database.Database;
  let app: express.Express;
  let widgetConfigRepo: WidgetConfigRepository;
  let ownerToken: string;
  let widgetToken: string;

  async function request(method: string, path: string, body?: any, token?: string) {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return new Promise<{ status: number; body: any }>((resolve) => {
      const http = require('http');
      const server = app.listen(0, () => {
        const port = (server.address() as any).port;
        const r = http.request({ hostname: '127.0.0.1', port, path, method, headers: h }, (res: any) => {
          let data = '';
          res.on('data', (c: string) => data += c);
          res.on('end', () => {
            server.close();
            resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
          });
        });
        if (body) r.write(JSON.stringify(body));
        r.end();
      });
    });
  }

  beforeAll(async () => {
    process.env.WIDGET_SECRET = WIDGET_SECRET;
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
    db = createDatabase(TEST_DB);
    const userRepo = new UserRepository(db);
    const tenantRepo = new TenantRepository(db);
    const refreshTokenRepo = new RefreshTokenRepository(db);
    widgetConfigRepo = new WidgetConfigRepository(db);

    const a = express();
    a.use(express.json({ limit: '10mb' }));
    a.use('/api/auth', createAuthRoutes(userRepo, tenantRepo, refreshTokenRepo, JWT_SECRET));
    a.use('/api/widget', createWidgetRoutes(widgetConfigRepo, JWT_SECRET));
    app = a;

    const signup = await request('POST', '/api/auth/signup', {
      email: 'branding@test.com', password: 'password123', name: 'Branding', companyName: 'Branding Corp',
    });
    expect(signup.status).toBe(201);
    ownerToken = signup.body.token;

    const tokenRes = await request('POST', '/api/widget/token', {}, ownerToken);
    expect(tokenRes.status).toBe(200);
    widgetToken = tokenRes.body.token;
  });

  afterAll(() => {
    try { db.close(); } catch {}
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
    delete process.env.WIDGET_SECRET;
  });

  it('patches branding fields using spec field names and persists them canonically', async () => {
    const res = await request('PATCH', '/api/widget/config', {
      primaryColor: '#22C55E',
      themeMode: 'dark',
      widgetPosition: 'bottom-left',
      greetingText: 'Welcome to Branding Corp!',
      avatarUrl: 'https://cdn.example.com/avatar.png',
      companyName: '  Branding Corp  ',
    }, ownerToken);
    expect(res.status).toBe(200);
    expect(res.body.config.primaryColor).toBe('#22c55e');
    expect(res.body.config.theme).toBe('dark');
    expect(res.body.config.position).toBe('bottom-left');
    expect(res.body.config.greeting).toBe('Welcome to Branding Corp!');
    expect(res.body.config.avatarUrl).toBe('https://cdn.example.com/avatar.png');
    expect(res.body.config.companyName).toBe('Branding Corp');
  });

  it('exposes branding fields to the public GET without leaking secrets', async () => {
    const res = await request('GET', `/api/widget/config?token=${encodeURIComponent(widgetToken)}`);
    expect(res.status).toBe(200);
    expect(res.body.primaryColor).toBe('#22c55e');
    expect(res.body.theme).toBe('dark');
    expect(res.body.position).toBe('bottom-left');
    expect(res.body.avatarUrl).toBe('https://cdn.example.com/avatar.png');
    expect(res.body.greeting).toBe('Welcome to Branding Corp!');
    expect(res.body).not.toHaveProperty('notificationEmail');
    expect(res.body).not.toHaveProperty('slackWebhookUrl');
  });

  it('accepts legacy field names on PATCH', async () => {
    const res = await request('PATCH', '/api/widget/config', {
      theme: 'light',
      position: 'right',
      greeting: 'Legacy greeting',
    }, ownerToken);
    expect(res.status).toBe(200);
    expect(res.body.config.theme).toBe('light');
    expect(res.body.config.position).toBe('bottom-right');
    expect(res.body.config.greeting).toBe('Legacy greeting');
  });

  it('rejects invalid hex colors', async () => {
    for (const bad of ['red', '#12345', '#GGGGGG', '#1234567', '123456']) {
      const res = await request('PATCH', '/api/widget/config', { primaryColor: bad }, ownerToken);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('hex color');
    }
  });

  it('accepts 3-digit hex colors', async () => {
    const res = await request('PATCH', '/api/widget/config', { primaryColor: '#38f' }, ownerToken);
    expect(res.status).toBe(200);
    expect(res.body.config.primaryColor).toBe('#38f');
  });

  it('rejects invalid theme, position, and threshold values', async () => {
    const badTheme = await request('PATCH', '/api/widget/config', { themeMode: 'neon' }, ownerToken);
    expect(badTheme.status).toBe(400);
    const badPosition = await request('PATCH', '/api/widget/config', { widgetPosition: 'top-left' }, ownerToken);
    expect(badPosition.status).toBe(400);
    const badThreshold = await request('PATCH', '/api/widget/config', { notifyThreshold: 'sometimes' }, ownerToken);
    expect(badThreshold.status).toBe(400);
  });

  it('rejects unknown fields', async () => {
    const res = await request('PATCH', '/api/widget/config', { hoverColor: '#000000' }, ownerToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Unknown field');
  });

  it('rejects invalid types and oversized strings', async () => {
    const notBool = await request('PATCH', '/api/widget/config', { autoOpen: 'yes' }, ownerToken);
    expect(notBool.status).toBe(400);
    const tooLong = await request('PATCH', '/api/widget/config', { greeting: 'x'.repeat(501) }, ownerToken);
    expect(tooLong.status).toBe(400);
    const badEmail = await request('PATCH', '/api/widget/config', { notificationEmail: 'not-an-email' }, ownerToken);
    expect(badEmail.status).toBe(400);
    const badWebhook = await request('PATCH', '/api/widget/config', { slackWebhookUrl: 'http://insecure.example/hook' }, ownerToken);
    expect(badWebhook.status).toBe(400);
  });

  it('sanitizes starter options and allowed domains', async () => {
    const res = await request('PATCH', '/api/widget/config', {
      starterOptions: ['  Pricing  ', 'Pricing', 'Book a demo'],
      allowedDomains: ['Example.com', 'example.com', '*.example.org'],
    }, ownerToken);
    expect(res.status).toBe(200);
    expect(res.body.config.starterOptions).toEqual(['Pricing', 'Book a demo']);
    expect(res.body.config.allowedDomains).toEqual(['example.com', '*.example.org']);
  });

  it('accepts businessProfile, notification settings, and valid emails', async () => {
    const res = await request('PATCH', '/api/widget/config', {
      businessProfile: { companyName: 'Branding Corp', industry: 'SaaS' },
      notificationEmail: 'leads@test.com',
      slackWebhookUrl: 'https://hooks.slack.com/services/T000/B000/XXXX',
      notifyThreshold: 'sales_qualified_only',
      autoOpen: true,
      autoOpenDelay: 5,
      starterOptions: [],
    }, ownerToken);
    expect(res.status).toBe(200);
    expect(res.body.config.businessProfile).toEqual({ companyName: 'Branding Corp', industry: 'SaaS' });
    expect(res.body.config.notificationEmail).toBe('leads@test.com');
    expect(res.body.config.notifyThreshold).toBe('sales_qualified_only');
    expect(res.body.config.autoOpen).toBe(true);
    expect(res.body.config.autoOpenDelay).toBe(5);
    expect(res.body.config.starterOptions).toEqual([]);
  });

  it('does not leak secrets to the public GET even when configured', async () => {
    const res = await request('GET', `/api/widget/config?token=${encodeURIComponent(widgetToken)}`);
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('notificationEmail');
    expect(res.body).not.toHaveProperty('slackWebhookUrl');
  });

  it('requires authentication for PATCH', async () => {
    const noAuth = await request('PATCH', '/api/widget/config', { primaryColor: '#000000' });
    expect(noAuth.status).toBe(401);
    const badToken = await request('PATCH', '/api/widget/config', { primaryColor: '#000000' }, 'not-a-real-token');
    expect(badToken.status).toBe(401);
  });

  it('rejects non-admin roles with 403', async () => {
    const userToken = jwt.sign({ sub: 'some-user', tenantId: 'demo-tenant', role: 'support_agent' }, JWT_SECRET, { algorithm: 'HS256' });
    const res = await request('PATCH', '/api/widget/config', { primaryColor: '#000000' }, userToken);
    expect(res.status).toBe(403);
  });

  it('isolates branding between tenants', async () => {
    const signupB = await request('POST', '/api/auth/signup', {
      email: 'branding-b@test.com', password: 'password123', name: 'Branding B', companyName: 'Branding B Corp',
    });
    expect(signupB.status).toBe(201);
    const tokenB = signupB.body.token;
    const tokenResB = await request('POST', '/api/widget/token', {}, tokenB);
    expect(tokenResB.status).toBe(200);
    const widgetTokenB = tokenResB.body.token;

    const patchB = await request('PATCH', '/api/widget/config', { primaryColor: '#FF00FF', theme: 'light' }, tokenB);
    expect(patchB.status).toBe(200);
    expect(patchB.body.config.primaryColor).toBe('#ff00ff');

    const resB = await request('GET', `/api/widget/config?token=${encodeURIComponent(widgetTokenB)}`);
    expect(resB.status).toBe(200);
    expect(resB.body.primaryColor).toBe('#ff00ff');
    expect(resB.body.theme).toBe('light');
  });
});
