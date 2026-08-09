import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import {
  createDatabase, UserRepository, TenantRepository, RefreshTokenRepository,
  WebsiteScanRepository, ScannedPageRepository, KnowledgeBaseRepository,
  KbDocumentRepository, KbChunkRepository, WebsiteScannerService,
} from '@conversation-engine/saas-core';
import { authMiddleware } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { createAuthRoutes } from '../routes/auth';
import { createWebsiteScannerRoutes } from '../routes/website-scanner';

// ─── Test Setup ───────────────────────────────────────────

const TEST_DB = join(__dirname, '__test_website_scanner_api__.db');
const JWT_SECRET = 'test-secret-key-for-website-scanner';

let db: Database.Database;
let userRepo: UserRepository;
let tenantRepo: TenantRepository;
let refreshTokenRepo: RefreshTokenRepository;
let scanRepo: WebsiteScanRepository;
let pageRepo: ScannedPageRepository;
let kbRepo: KnowledgeBaseRepository;
let docRepo: KbDocumentRepository;
let chunkRepo: KbChunkRepository;
let app: express.Express;

const SITE: Record<string, string> = {
  'https://acme.example/': `<!DOCTYPE html><html><head><title>Acme Home</title></head><body>
    <h1>Acme Corp</h1><p>Welcome. Get started with a free trial. Book a demo.</p>
    <a href="/about">About</a></body></html>`,
  'https://acme.example/about': `<!DOCTYPE html><html><head><title>About Acme</title></head><body>
    <h1>About Us</h1><p>Our team is a trusted enterprise solution.</p></body></html>`,
};

function makeMockFetch(): typeof fetch {
  return (async (input: any) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const html = SITE[url];
    if (!html) {
      return { ok: false, status: 404, headers: new Headers(), text: async () => '' } as any;
    }
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => html,
    } as any;
  }) as any;
}

function makeApp() {
  const a = express();
  a.use(express.json({ limit: '10mb' }));
  a.use('/api/auth', createAuthRoutes(userRepo, tenantRepo, refreshTokenRepo, JWT_SECRET));
  const auth = authMiddleware(JWT_SECRET);
  const tenantGuard = requireTenant(tenantRepo);
  const scanner = new WebsiteScannerService(
    { scanRepo, pageRepo, kbRepo, docRepo, chunkRepo },
    { fetchImpl: makeMockFetch(), allowPrivateHosts: true },
  );
  a.use('/api/knowledge', auth, tenantGuard, createWebsiteScannerRoutes({ scanner, scanRepo, pageRepo }));
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
  return { token: res.body.token, tenantId: res.body.tenant.id };
}

async function waitForScanCompletion(scanId: string, token: string): Promise<any> {
  for (let i = 0; i < 300; i++) {
    const res = await request('GET', `/api/knowledge/scan/status?scanId=${scanId}`, undefined, token);
    if (res.status === 200 && ['completed', 'failed'].includes(res.body.scan.status)) {
      return res.body.scan;
    }
    await new Promise(r => setTimeout(r, 10));
  }
  throw new Error('Scan did not complete in time');
}

let tenantAToken: string;
let tenantAId: string;
let tenantBToken: string;
let tenantBId: string;

beforeAll(async () => {
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
  db = createDatabase(TEST_DB);
  userRepo = new UserRepository(db);
  tenantRepo = new TenantRepository(db);
  refreshTokenRepo = new RefreshTokenRepository(db);
  scanRepo = new WebsiteScanRepository(db);
  pageRepo = new ScannedPageRepository(db);
  kbRepo = new KnowledgeBaseRepository(db);
  docRepo = new KbDocumentRepository(db);
  chunkRepo = new KbChunkRepository(db);
  app = makeApp();

  const tenantA = await signupTenant('scanner-a@test.com', 'Scanner Corp A');
  tenantAToken = tenantA.token;
  tenantAId = tenantA.tenantId;

  const tenantB = await signupTenant('scanner-b@test.com', 'Scanner Corp B');
  tenantBToken = tenantB.token;
  tenantBId = tenantB.tenantId;
});

afterAll(() => {
  if (db) db.close();
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
});

// ─── Tests ────────────────────────────────────────────────

describe('Website scanner API', () => {
  it('requires authentication', async () => {
    const res = await request('POST', '/api/knowledge/scan', { url: 'https://acme.example/' });
    expect(res.status).toBe(401);
  });

  it('validates the url on POST /scan', async () => {
    const res = await request('POST', '/api/knowledge/scan', { url: 'not-a-url' }, tenantAToken);
    expect(res.status).toBe(400);
  });

  it('starts a scan and completes with indexed pages', async () => {
    const start = await request('POST', '/api/knowledge/scan', { url: 'https://acme.example/', maxDepth: 1 }, tenantAToken);
    expect(start.status).toBe(202);
    expect(start.body.scan.status).toBe('queued');

    const done = await waitForScanCompletion(start.body.scan.id, tenantAToken);
    expect(done.status).toBe('completed');
    expect(done.pagesDiscovered).toBe(2);
    expect(done.pagesAdded).toBe(2);
    expect(done.pagesIndexed).toBe(2);

    const kbs = kbRepo.listByTenant(tenantAId);
    expect(kbs.length).toBe(1);
    expect(kbs[0].name).toBe('Website: acme.example');
    expect(docRepo.listByKnowledgeBase(kbs[0].id).length).toBe(2);
  });

  it('returns scan status with crawled pages', async () => {
    const res = await request('GET', '/api/knowledge/scan/status', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.scan.rootUrl).toBe('https://acme.example/');
    expect(Array.isArray(res.body.pages)).toBe(true);
  });

  it('isolates scans between tenants', async () => {
    await request('POST', '/api/knowledge/scan', { url: 'https://acme.example/', maxDepth: 1 }, tenantBToken);
    const res = await request('GET', '/api/knowledge/scan/status', undefined, tenantBToken);
    expect(res.status).toBe(200);
    expect(res.body.scan.tenantId).toBe(tenantBId);
  });

  it('rejects cross-tenant scan access by scanId', async () => {
    const res = await request('GET', `/api/knowledge/scan/status?scanId=unknown-id`, undefined, tenantAToken);
    expect(res.status).toBe(404);
  });

  it('updates the schedule for a scan', async () => {
    const res = await request('PUT', '/api/knowledge/scan/schedule', { url: 'https://acme.example/', schedule: 'daily' }, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.scan.schedule).toBe('daily');
    expect(res.body.scan.nextScanAt).toBeTruthy();
  });

  it('rejects invalid schedules', async () => {
    const res = await request('PUT', '/api/knowledge/scan/schedule', { schedule: 'hourly' }, tenantAToken);
    expect(res.status).toBe(400);
  });

  it('lists scan history for the tenant', async () => {
    const res = await request('GET', '/api/knowledge/scan/history', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.scans.length).toBeGreaterThanOrEqual(1);
    expect(res.body.scans.every((s: any) => s.rootUrl === 'https://acme.example/')).toBe(true);
  });
});
