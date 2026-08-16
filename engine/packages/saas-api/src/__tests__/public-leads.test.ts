import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { createDatabase, LeadRepository, TenantRepository } from '@conversation-engine/saas-core';
import { createPublicRoutes } from '../routes/public';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';

const TEST_DB = join(__dirname, '__test_public_leads__.db');

let db: Database.Database;
let leadRepo: LeadRepository;
let tenantRepo: TenantRepository;
let app: express.Express;

function makeApp() {
  const a = express();
  a.use(express.json());
  a.use('/api/public', createPublicRoutes(leadRepo, tenantRepo));
  return a;
}

async function request(method: string, path: string, body?: any) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
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

beforeAll(() => {
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
  db = createDatabase(TEST_DB);
  leadRepo = new LeadRepository(db);
  tenantRepo = new TenantRepository(db);
  app = makeApp();
});

afterAll(() => {
  try { db.close(); } catch {}
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
});

describe('Public lead capture', () => {
  it('captures a contact lead with no auth and persists it under the sales tenant', async () => {
    const res = await request('POST', '/api/public/leads', {
      source: 'contact', name: 'Sarah Jenkins', email: 'sarah@acme.com', company: 'Acme Inc', message: 'Interested in enterprise', volume: '10k–50k',
    });
    expect(res.status).toBe(201);
    const leads = leadRepo.searchLeads('burflow-saas', {});
    const lead = leads.leads.find((l: any) => l.email === 'sarah@acme.com');
    expect(lead).toBeTruthy();
    expect(lead.name).toBe('Sarah Jenkins');
    expect(lead.company).toBe('Acme Inc');
    expect(lead.source).toBe('form');
    expect(lead.metadata?.source).toBe('contact');
    expect(lead.metadata?.volume).toBe('10k–50k');
  });

  it('captures a demo booking lead with slot details', async () => {
    const res = await request('POST', '/api/public/leads', {
      source: 'demo', name: 'Ali Khan', email: 'ali@example.com', company: 'Example', teamSize: '11-50', preferredDate: '2026-08-20', preferredTime: '10:00', focus: 'Pricing tiers',
    });
    expect(res.status).toBe(201);
    const leads = leadRepo.searchLeads('burflow-saas', {});
    const lead = leads.leads.find((l: any) => l.email === 'ali@example.com');
    expect(lead?.metadata?.source).toBe('demo');
    expect(lead?.metadata?.teamSize).toBe('11-50');
    expect(lead?.metadata?.preferredDate).toBe('2026-08-20');
  });

  it('captures a scan lead from just a website URL (no email required)', async () => {
    const res = await request('POST', '/api/public/leads', { source: 'scan', websiteUrl: 'https://customer-site.com' });
    expect(res.status).toBe(201);
    const leads = leadRepo.searchLeads('burflow-saas', {});
    const lead = leads.leads.find((l: any) => l.metadata?.websiteUrl === 'https://customer-site.com');
    expect(lead).toBeTruthy();
    expect(lead.metadata?.source).toBe('scan');
  });

  it('rejects contact leads without a valid email', async () => {
    const res = await request('POST', '/api/public/leads', { source: 'contact', name: 'No Email', email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('rejects contact leads without a name', async () => {
    const res = await request('POST', '/api/public/leads', { source: 'contact', email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('rejects scan leads without a website URL', async () => {
    const res = await request('POST', '/api/public/leads', { source: 'scan' });
    expect(res.status).toBe(400);
  });

  it('rejects unknown sources', async () => {
    const res = await request('POST', '/api/public/leads', { source: 'carrier-pigeon', email: 'a@b.com', name: 'X' });
    expect(res.status).toBe(400);
  });
});
