import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import {
  createDatabase, UserRepository, TenantRepository, RefreshTokenRepository, WidgetConfigRepository,
  TeamMemberRepository, InvitationRepository, ActivityRepository,
} from '@conversation-engine/saas-core';
import { authMiddleware } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { createAuthRoutes } from '../routes/auth';
import { createTeamRoutes } from '../routes/team';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';

const TEST_DB = join(__dirname, '__test_team__.db');
const JWT_SECRET = 'test-secret-key-for-team-tests';

let db: Database.Database;
let userRepo: UserRepository;
let tenantRepo: TenantRepository;
let refreshTokenRepo: RefreshTokenRepository;
let widgetConfigRepo: WidgetConfigRepository;
let teamRepo: TeamMemberRepository;
let invitationRepo: InvitationRepository;
let activityRepo: ActivityRepository;
let app: express.Express;

function makeApp() {
  const a = express();
  a.use(express.json());
  a.use('/api/auth', createAuthRoutes(userRepo, tenantRepo, refreshTokenRepo, JWT_SECRET, widgetConfigRepo));
  const auth = authMiddleware(JWT_SECRET);
  const tenantGuard = requireTenant(tenantRepo);
  a.use('/api/team', auth, tenantGuard, createTeamRoutes(teamRepo, invitationRepo, activityRepo, tenantRepo, userRepo));
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

let ownerToken = '';

beforeAll(async () => {
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
  db = createDatabase(TEST_DB);
  userRepo = new UserRepository(db);
  tenantRepo = new TenantRepository(db);
  refreshTokenRepo = new RefreshTokenRepository(db);
  widgetConfigRepo = new WidgetConfigRepository(db);
  teamRepo = new TeamMemberRepository(db);
  invitationRepo = new InvitationRepository(db);
  activityRepo = new ActivityRepository(db);
  app = makeApp();

  const res = await request('POST', '/api/auth/signup', {
    email: 'owner@example.com', password: 'password123', name: 'Owner', companyName: 'Owner Co',
  });
  ownerToken = res.body.token;
});

afterAll(() => {
  try { db.close(); } catch {}
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
});

describe('Team invitation', () => {
  it('invites a brand-new email (no existing account) and records a pending invitation', async () => {
    const res = await request('POST', '/api/team/invite', { email: 'new-person@example.com', role: 'support_agent' }, ownerToken);
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('new-person@example.com');
    expect(res.body.role).toBe('support_agent');
    expect(res.body.status).toBe('pending');
    expect(res.body.token).toBeTruthy();
  });

  it('invites an email that has an account but is not yet a member', async () => {
    // Create a second user directly so they exist but are not in the tenant.
    const second = userRepo.create({ email: 'second@example.com', password: 'password123', name: 'Second' });
    expect(second.id).toBeTruthy();
    const res = await request('POST', '/api/team/invite', { email: 'second@example.com', role: 'viewer' }, ownerToken);
    expect(res.status).toBe(201);
  });

  it('rejects a duplicate pending invitation for the same email', async () => {
    const res = await request('POST', '/api/team/invite', { email: 'new-person@example.com', role: 'admin' }, ownerToken);
    expect(res.status).toBe(409);
  });

  it('rejects invalid role values', async () => {
    const res = await request('POST', '/api/team/invite', { email: 'role-test@example.com', role: 'member' }, ownerToken);
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request('POST', '/api/team/invite', { email: 'anon@example.com', role: 'admin' });
    expect(res.status).toBe(401);
  });
});
