import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import { createDatabase, UserRepository, TenantRepository, RefreshTokenRepository, verifyToken } from '@conversation-engine/saas-core';
import { authMiddleware } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { createAuthRoutes } from '../routes/auth';
import { createAgencyRoutes } from '../routes/agency';

// ─── Test Setup ───────────────────────────────────────────

const TEST_DB = join(__dirname, '__test_agency_api__.db');
const JWT_SECRET = 'test-secret-key-for-agency-api';

let db: Database.Database;
let userRepo: UserRepository;
let tenantRepo: TenantRepository;
let refreshTokenRepo: RefreshTokenRepository;
let app: express.Express;

function makeApp() {
  const a = express();
  a.use(express.json({ limit: '10mb' }));
  a.use('/api/auth', createAuthRoutes(userRepo, tenantRepo, refreshTokenRepo, JWT_SECRET));
  const auth = authMiddleware(JWT_SECRET);
  const tenantGuard = requireTenant(tenantRepo);
  a.use('/api/agency', auth, tenantGuard, createAgencyRoutes({ tenantRepo, jwtSecret: JWT_SECRET }));
  return a;
}

async function request(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new Promise<{ status: number; body: any }>((resolve) => {
    const http = require('http');
    const server = app.listen(0, () => {
      const port = (server.address() as any).port;
      const r = http.request({ hostname: '127.0.0.1', port, path, method, headers }, (res: any) => {
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

async function signupTenant(email: string, company: string) {
  const res = await request('POST', '/api/auth/signup', { email, password: 'password123', name: 'Signed Up', companyName: company });
  return { token: res.body.token, tenantId: res.body.tenant.id, userId: res.body.user.id };
}

let tenantAToken: string;
let tenantAId: string;
let tenantAUser: string;
let tenantBToken: string;
let tenantBId: string;
let agentToken: string;

beforeAll(async () => {
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
  db = createDatabase(TEST_DB);
  userRepo = new UserRepository(db);
  tenantRepo = new TenantRepository(db);
  refreshTokenRepo = new RefreshTokenRepository(db);
  app = makeApp();

  const tenantA = await signupTenant('agency-a@test.com', 'Agency Corp A');
  tenantAToken = tenantA.token;
  tenantAId = tenantA.tenantId;
  tenantAUser = tenantA.userId;

  const tenantB = await signupTenant('agency-b@test.com', 'Agency Corp B');
  tenantBToken = tenantB.token;
  tenantBId = tenantB.tenantId;

  agentToken = jwt.sign(
    { sub: 'agent-user', email: 'agent@test.com', name: 'Agent', tenantId: tenantAId, role: 'agent' },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
});

afterAll(() => {
  if (db) db.close();
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
});

// ─── Tests ────────────────────────────────────────────────

describe('Agency workspaces API', () => {
  it('requires authentication', async () => {
    const res = await request('GET', '/api/agency/workspaces');
    expect(res.status).toBe(401);
  });

  it('rejects non-admin roles with 403', async () => {
    const list = await request('GET', '/api/agency/workspaces', undefined, agentToken);
    expect(list.status).toBe(403);
    const create = await request('POST', '/api/agency/workspaces', { name: 'Nope' }, agentToken);
    expect(create.status).toBe(403);
    const sw = await request('POST', '/api/agency/switch-workspace', { subTenantId: 'x' }, agentToken);
    expect(sw.status).toBe(403);
    const br = await request('PUT', '/api/agency/branding', { primaryColor: '#111111' }, agentToken);
    expect(br.status).toBe(403);
  });

  it('starts with no sub-tenants', async () => {
    const res = await request('GET', '/api/agency/workspaces', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.workspaces).toEqual([]);
  });

  it('validates workspace creation payload', async () => {
    const noName = await request('POST', '/api/agency/workspaces', {}, tenantAToken);
    expect(noName.status).toBe(400);
    const badDomain = await request('POST', '/api/agency/workspaces', { name: 'Client One', customDomain: 'not a domain' }, tenantAToken);
    expect(badDomain.status).toBe(400);
  });

  it('creates a sub-tenant workspace under the agency', async () => {
    const res = await request('POST', '/api/agency/workspaces', { name: 'Client One', customDomain: 'clientone.example.com' }, tenantAToken);
    expect(res.status).toBe(201);
    expect(res.body.workspace.name).toBe('Client One');
    expect(res.body.workspace.customDomain).toBe('clientone.example.com');

    const sub = tenantRepo.findById(res.body.workspace.id)!;
    expect(sub.parentTenantId).toBe(tenantAId);
    expect(sub.ownerId).toBe(tenantAUser);
    expect(sub.customDomain).toBe('clientone.example.com');
    expect(tenantRepo.findSubTenantsByParentId(tenantAId).length).toBe(1);
  });

  it('rejects duplicate custom domains', async () => {
    const res = await request('POST', '/api/agency/workspaces', { name: 'Client Dup', customDomain: 'clientone.example.com' }, tenantAToken);
    expect(res.status).toBe(409);
  });

  it('lists sub-tenants and isolates them between agencies', async () => {
    const listA = await request('GET', '/api/agency/workspaces', undefined, tenantAToken);
    expect(listA.status).toBe(200);
    expect(listA.body.workspaces.length).toBe(1);
    expect(listA.body.workspaces[0].name).toBe('Client One');
    expect(listA.body.parent).toBeNull();

    const listB = await request('GET', '/api/agency/workspaces', undefined, tenantBToken);
    expect(listB.status).toBe(200);
    expect(listB.body.workspaces).toEqual([]);
  });

  it('returns the parent workspace from a sub-tenant context', async () => {
    const workspaces = await request('GET', '/api/agency/workspaces', undefined, tenantAToken);
    const subTenantId = workspaces.body.workspaces[0].id;
    const subToken = jwt.sign(
      { sub: tenantAUser, email: 'agency-a@test.com', name: 'Signed Up', tenantId: subTenantId, role: 'owner' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    const res = await request('GET', '/api/agency/workspaces', undefined, subToken);
    expect(res.status).toBe(200);
    expect(res.body.workspaces).toEqual([]);
    expect(res.body.parent).toMatchObject({ id: tenantAId, name: 'Agency Corp A' });
  });

  it('allows creating a workspace without a custom domain', async () => {
    const res = await request('POST', '/api/agency/workspaces', { name: 'Client Two' }, tenantAToken);
    expect(res.status).toBe(201);
    expect(res.body.workspace.customDomain).toBeNull();
  });

  it('switches the session into a sub-tenant with a new JWT', async () => {
    const workspaces = await request('GET', '/api/agency/workspaces', undefined, tenantAToken);
    const subTenantId = workspaces.body.workspaces[0].id;

    const res = await request('POST', '/api/agency/switch-workspace', { subTenantId }, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.tenant.id).toBe(subTenantId);
    expect(res.body.tenant.name).toBe('Client One');

    const payload = verifyToken(res.body.token, JWT_SECRET)!;
    expect(payload.tenantId).toBe(subTenantId);
    expect(payload.sub).toBe(tenantAUser);
    expect(payload.role).toBe('owner');
  });

  it('switches back from a sub-tenant to the parent workspace', async () => {
    const workspaces = await request('GET', '/api/agency/workspaces', undefined, tenantAToken);
    const subTenantId = workspaces.body.workspaces[0].id;
    const subToken = jwt.sign(
      { sub: tenantAUser, email: 'agency-a@test.com', name: 'Signed Up', tenantId: subTenantId, role: 'owner' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    const res = await request('POST', '/api/agency/switch-workspace', { subTenantId: tenantAId }, subToken);
    expect(res.status).toBe(200);
    expect(res.body.tenant.id).toBe(tenantAId);
    expect(verifyToken(res.body.token, JWT_SECRET)!.tenantId).toBe(tenantAId);
  });

  it('rejects switching to unknown or foreign workspaces', async () => {
    const missing = await request('POST', '/api/agency/switch-workspace', { subTenantId: 'does-not-exist' }, tenantAToken);
    expect(missing.status).toBe(404);

    const foreign = await request('POST', '/api/agency/switch-workspace', { subTenantId: tenantBId }, tenantAToken);
    expect(foreign.status).toBe(403);
  });
});

describe('Agency branding API', () => {
  it('updates white-label branding and custom domain', async () => {
    const res = await request('PUT', '/api/agency/branding', {
      companyName: 'Client One Inc.',
      primaryColor: '#7C3AED',
      hideBranding: true,
      customDomain: 'branded.example.com',
    }, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.tenant.customDomain).toBe('branded.example.com');
    expect(res.body.whiteLabelBranding.primaryColor).toBe('#7C3AED');
    expect(res.body.whiteLabelBranding.hideBranding).toBe(true);

    const tenant = tenantRepo.findById(tenantAId)!;
    expect(tenant.customDomain).toBe('branded.example.com');
    expect(tenant.whiteLabelBranding).toMatchObject({ companyName: 'Client One Inc.', primaryColor: '#7C3AED', hideBranding: true });
  });

  it('merges branding updates without dropping existing values', async () => {
    const res = await request('PUT', '/api/agency/branding', { logoUrl: 'https://cdn.example.com/logo.png' }, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.whiteLabelBranding.primaryColor).toBe('#7C3AED');
    expect(res.body.whiteLabelBranding.logoUrl).toBe('https://cdn.example.com/logo.png');
  });

  it('validates color and domain values', async () => {
    const badColor = await request('PUT', '/api/agency/branding', { primaryColor: 'blue' }, tenantAToken);
    expect(badColor.status).toBe(400);
    const badDomain = await request('PUT', '/api/agency/branding', { customDomain: '!!bad!!' }, tenantAToken);
    expect(badDomain.status).toBe(400);
  });

  it('rejects custom domains already used by another tenant', async () => {
    const sub = tenantRepo.findSubTenantsByParentId(tenantAId)[0];
    const res = await request('PUT', '/api/agency/branding', { customDomain: sub.customDomain! }, tenantAToken);
    expect(res.status).toBe(409);
  });

  it('clears the custom domain when nulled', async () => {
    const res = await request('PUT', '/api/agency/branding', { customDomain: null }, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.tenant.customDomain).toBeNull();
    expect(tenantRepo.findById(tenantAId)!.customDomain).toBeUndefined();
  });
});
