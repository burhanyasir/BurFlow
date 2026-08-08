import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import {
  createDatabase, UserRepository, TenantRepository, RefreshTokenRepository,
  LeadRepository, Lead, QualificationStatus,
} from '@conversation-engine/saas-core';
import { authMiddleware } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { createAuthRoutes } from '../routes/auth';
import { createLeadRoutes } from '../routes/leads';
import { escapeCsvField, toCsv, parseCsvLine } from '../utils/csv-formatter';

// ─── Test Setup ───────────────────────────────────────────────

const TEST_DB = join(__dirname, '__test_leads_management__.db');
const JWT_SECRET = 'test-secret-key-for-leads-management';

let db: Database.Database;
let leadRepo: LeadRepository;
let tenantAToken: string;
let tenantAId: string;
let tenantBToken: string;
let tenantBId: string;
let app: express.Express;
let server: any;
let port: number;

function makeApp() {
  const a = express();
  a.use(express.json({ limit: '10mb' }));
  a.use('/api/auth', createAuthRoutes(new UserRepository(db), new TenantRepository(db), new RefreshTokenRepository(db), JWT_SECRET));
  const auth = authMiddleware(JWT_SECRET);
  a.use('/api/leads', auth, requireTenant(new TenantRepository(db)), createLeadRoutes(leadRepo));
  return a;
}

function requestJson(method: string, path: string, body?: any, token?: string) {
  return new Promise<{ status: number; body: any; headers: Record<string, any> }>((resolve, reject) => {
    const http = require('http');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const r = http.request({ hostname: '127.0.0.1', port, path, method, headers }, (res: any) => {
      let data = '';
      res.on('data', (c: string) => data += c);
      res.on('end', () => {
        let parsed: any = data;
        try { parsed = JSON.parse(data); } catch { /* raw body (CSV) */ }
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function seedLead(overrides: Partial<Lead> = {}): Lead {
  const lead = leadRepo.create({
    tenantId: tenantAId,
    sessionId: `mgmt-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    email: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@seed.io`,
    name: 'Seed Lead',
    company: 'Seed Corp',
    qualificationStatus: 'unqualified',
    leadScore: 10,
    buyingIntent: 'low',
    source: 'chat',
    ...overrides,
  });
  if (overrides.createdAt) {
    db.prepare('UPDATE leads SET created_at = ? WHERE id = ?').run(overrides.createdAt, lead.id);
    if (overrides.updatedAt) {
      db.prepare('UPDATE leads SET updated_at = ? WHERE id = ?').run(overrides.updatedAt, lead.id);
    }
  }
  return leadRepo.findById(lead.id)!;
}

beforeAll(async () => {
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
  db = createDatabase(TEST_DB);
  leadRepo = new LeadRepository(db);
  app = makeApp();
  server = app.listen(0);
  port = (server.address() as any).port;

  const signupA = await requestJson('POST', '/api/auth/signup', {
    email: 'mgmt-a@test.com', password: 'password123', name: 'Mgmt A', companyName: 'Mgmt Corp A',
  });
  tenantAToken = signupA.body.token;
  tenantAId = signupA.body.tenant.id;

  const signupB = await requestJson('POST', '/api/auth/signup', {
    email: 'mgmt-b@test.com', password: 'password123', name: 'Mgmt B', companyName: 'Mgmt Corp B',
  });
  tenantBToken = signupB.body.token;
  tenantBId = signupB.body.tenant.id;
});

afterAll(() => {
  server?.close();
  try { db.close(); } catch {}
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
});

// ─── Pagination ───────────────────────────────────────────────

describe('GET /api/leads — pagination', () => {
  it('paginates with page/limit and returns the total count', async () => {
    for (let i = 0; i < 25; i++) {
      leadRepo.create({
        tenantId: tenantAId, sessionId: `pager-${i}`, email: `pager-${i}@seed.io`,
        qualificationStatus: 'unqualified', leadScore: 10, buyingIntent: 'low', source: 'chat',
      });
    }
    const res = await requestJson('GET', '/api/leads?page=2&limit=10', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.leads.length).toBe(10);
    expect(res.body.total).toBe(25);
    expect(res.body.page).toBe(2);
    expect(res.body.limit).toBe(10);
    expect(res.body.leads[0].id).not.toBe(res.body.leads[9].id);
  });

  it('clamps limit to 100', async () => {
    const res = await requestJson('GET', '/api/leads?limit=500', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(100);
  });
});

// ─── Filtering ────────────────────────────────────────────────

describe('GET /api/leads — filtering', () => {
  let hotLead: Lead;
  let coldLead: Lead;

  beforeAll(() => {
    hotLead = seedLead({ email: 'hot.lead@alpha.io', name: 'Hot Prospect', company: 'Alpha Industries', qualificationStatus: 'sales_qualified', leadScore: 88, buyingIntent: 'high' });
    seedLead({ email: 'warm.lead@beta.io', name: 'Warm Prospect', company: 'Beta Labs', qualificationStatus: 'marketing_qualified', leadScore: 45, buyingIntent: 'medium' });
    coldLead = seedLead({ email: 'cold.lead@gamma.io', name: 'Cold Prospect', company: 'Gamma LLC', qualificationStatus: 'unqualified', leadScore: 12, buyingIntent: 'low' });
    seedLead({ email: 'dated.lead@delta.io', name: 'Dated Prospect', company: 'Delta Corp', qualificationStatus: 'marketing_qualified', leadScore: 55, buyingIntent: 'medium', createdAt: '2026-01-15T10:00:00.000Z' });
    seedLead({ email: 'feb.lead@epsilon.io', name: 'Feb Prospect', company: 'Epsilon Inc', qualificationStatus: 'marketing_qualified', leadScore: 60, buyingIntent: 'medium', createdAt: '2026-02-10T10:00:00.000Z' });
  });

  it('filters by qualification status', async () => {
    const res = await requestJson('GET', '/api/leads?status=sales_qualified', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.leads[0].id).toBe(hotLead.id);
  });

  it('filters by minimum lead score', async () => {
    const res = await requestJson('GET', '/api/leads?minScore=50', undefined, tenantAToken);
    expect(res.status).toBe(200);
    const ids = res.body.leads.map((l: any) => l.id);
    expect(ids).toContain(hotLead.id);
    expect(ids).not.toContain(coldLead.id);
    for (const l of res.body.leads) expect(l.leadScore).toBeGreaterThanOrEqual(50);
  });

  it('searches by name, email, or company (case-insensitive)', async () => {
    const byCompany = await requestJson('GET', '/api/leads?search=ALPHA', undefined, tenantAToken);
    expect(byCompany.body.total).toBe(1);
    expect(byCompany.body.leads[0].id).toBe(hotLead.id);

    const byName = await requestJson('GET', `/api/leads?search=${encodeURIComponent('warm prospect')}`, undefined, tenantAToken);
    expect(byName.body.total).toBe(1);
    expect(byName.body.leads[0].email).toBe('warm.lead@beta.io');
  });

  it('filters by date range (inclusive)', async () => {
    const res = await requestJson('GET', '/api/leads?startDate=2026-02-01&endDate=2026-02-28', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.leads[0].email).toBe('feb.lead@epsilon.io');
  });

  it('combines multiple filters', async () => {
    const res = await requestJson('GET', '/api/leads?status=marketing_qualified&minScore=55&search=delta', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.leads[0].email).toBe('dated.lead@delta.io');
  });
});

// ─── Mutation ─────────────────────────────────────────────────

describe('PATCH /api/leads/:id', () => {
  it('updates qualification status and adds notes', async () => {
    const lead = seedLead({ email: 'patch.me@seed.io' });
    const res = await requestJson('PATCH', `/api/leads/${lead.id}`, {
      qualificationStatus: 'sales_qualified',
      notes: 'Called back on Aug 8 — wants a demo',
    }, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.lead.qualificationStatus).toBe('sales_qualified');
    expect(res.body.lead.notes).toBe('Called back on Aug 8 — wants a demo');

    const fromDb = leadRepo.findById(lead.id)!;
    expect(fromDb.qualificationStatus).toBe('sales_qualified');
    expect(fromDb.notes).toBe('Called back on Aug 8 — wants a demo');
  });

  it('updates contact information and lead score', async () => {
    const lead = seedLead({ email: 'old@seed.io', name: 'Old Name' });
    const res = await requestJson('PATCH', `/api/leads/${lead.id}`, {
      email: 'new@seed.io', name: 'New Name', leadScore: 72,
    }, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.lead.email).toBe('new@seed.io');
    expect(res.body.lead.name).toBe('New Name');
    expect(res.body.lead.leadScore).toBe(72);
  });

  it('rejects an invalid qualification status with 400', async () => {
    const lead = seedLead({ email: 'invalid.status@seed.io' });
    const res = await requestJson('PATCH', `/api/leads/${lead.id}`, { qualificationStatus: 'super_hot' }, tenantAToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 404 for an unknown lead id', async () => {
    const res = await requestJson('PATCH', '/api/leads/does-not-exist', { notes: 'hi' }, tenantAToken);
    expect(res.status).toBe(404);
  });

  it('enforces tenant isolation (404 for another tenant\'s lead)', async () => {
    const otherLead = leadRepo.create({
      tenantId: tenantBId, sessionId: 'other-tenant-session', email: 'other@tenant.io',
      qualificationStatus: 'unqualified', leadScore: 5, buyingIntent: 'low', source: 'chat',
    });
    const res = await requestJson('PATCH', `/api/leads/${otherLead.id}`, { qualificationStatus: 'sales_qualified' }, tenantAToken);
    expect(res.status).toBe(404);

    const untouched = leadRepo.findById(otherLead.id)!;
    expect(untouched.qualificationStatus).toBe('unqualified');
  });

  it('returns 401 without auth', async () => {
    const res = await requestJson('PATCH', '/api/leads/some-id', { notes: 'x' });
    expect(res.status).toBe(401);
  });
});

// ─── CSV / JSON Export ────────────────────────────────────────

describe('GET /api/leads/export', () => {
  beforeAll(async () => {
    leadRepo.create({
      tenantId: tenantAId, sessionId: 'export-session-1', email: 'export.one@seed.io', name: 'Export One',
      company: 'Acme, "Inc."', qualificationStatus: 'sales_qualified', leadScore: 90, buyingIntent: 'high', source: 'chat',
    });
    leadRepo.create({
      tenantId: tenantAId, sessionId: 'export-session-2', email: 'export.two@seed.io', name: 'Export Two',
      company: 'Simple Corp', qualificationStatus: 'marketing_qualified', leadScore: 40, buyingIntent: 'medium', source: 'form',
    });
  });

  it('downloads a CSV with standard headers and escaped fields', async () => {
    const res = await requestJson('GET', '/api/leads/export', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('leads-export.csv');

    const csv = res.body as string;
    expect(csv.startsWith('Date,Name,Email,Phone,Company,Score,Status,Source,Session ID\r\n')).toBe(true);
    expect(csv).toContain('Export One');
    expect(csv).toContain('export.one@seed.io');
    expect(csv).toContain('"Acme, ""Inc."""');
    expect(csv).toContain('sales_qualified,chat');
    expect(csv).toContain('marketing_qualified,form');
  });

  it('honors query filters when exporting', async () => {
    const res = await requestJson('GET', '/api/leads/export?status=sales_qualified', undefined, tenantAToken);
    const csv = res.body as string;
    const lines = csv.split('\r\n');
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines[1]).toContain('export.one@seed.io');
    expect(csv).not.toContain('export.two@seed.io');
    for (const line of lines.slice(1).filter(Boolean)) {
      expect(line).toContain('sales_qualified');
    }
  });

  it('exports JSON when format=json', async () => {
    const res = await requestJson('GET', '/api/leads/export?format=json', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['content-disposition']).toContain('leads-export.json');
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((l: any) => l.email === 'export.one@seed.io')).toBe(true);
    expect(res.body[0]).toHaveProperty('sessionId');
  });

  it('does not leak other tenants\' leads in exports', async () => {
    const res = await requestJson('GET', '/api/leads/export', undefined, tenantBToken);
    const csv = res.body as string;
    expect(csv).not.toContain('export.one@seed.io');
    expect(csv).toContain('other@tenant.io');
  });
});

// ─── CSV Formatter Unit Tests ─────────────────────────────────

describe('csv-formatter utility', () => {
  it('escapes fields containing commas, quotes, and newlines', () => {
    expect(escapeCsvField('plain')).toBe('plain');
    expect(escapeCsvField('Acme, Inc.')).toBe('"Acme, Inc."');
    expect(escapeCsvField('Say "hi"')).toBe('"Say ""hi"""');
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(42)).toBe('42');
  });

  it('builds RFC-4180 rows with CRLF line endings', () => {
    const csv = toCsv(['A', 'B'], [['x', 'y, z'], ['"quoted"', 7]]);
    expect(csv).toBe('A,B\r\nx,"y, z"\r\n"""quoted""",7');
  });

  it('parseCsvLine round-trips escaped fields', () => {
    const line = 'plain,"with, comma","with ""quotes""","multi\nline"';
    const parsed = parseCsvLine(line);
    expect(parsed).toEqual(['plain', 'with, comma', 'with "quotes"', 'multi\nline']);
  });
});
