import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import {
  createDatabase, UserRepository, TenantRepository, RefreshTokenRepository,
  ConversationRepository, UsageRepository,
  KnowledgeBaseRepository, KbDocumentRepository, SubscriptionRepository,
  InvoiceRepository, PaymentRepository, BillingEventRepository,
} from '@conversation-engine/saas-core';
import { authMiddleware } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { createAuthRoutes } from '../routes/auth';
import { createBillingRoutes } from '../routes/billing';

// ─── Test Setup ───────────────────────────────────────────

const TEST_DB = join(__dirname, '__test_billing_api__.db');
const JWT_SECRET = 'test-secret-key-for-billing-api';

let db: Database.Database;
let userRepo: UserRepository;
let tenantRepo: TenantRepository;
let refreshTokenRepo: RefreshTokenRepository;
let conversationRepo: ConversationRepository;
let usageRepo: UsageRepository;
let kbRepo: KnowledgeBaseRepository;
let docRepo: KbDocumentRepository;
let subRepo: SubscriptionRepository;
let invoiceRepo: InvoiceRepository;
let paymentRepo: PaymentRepository;
let eventRepo: BillingEventRepository;
let app: express.Express;

function makeApp() {
  const a = express();
  a.use(express.json({ limit: '10mb' }));
  a.use('/api/auth', createAuthRoutes(userRepo, tenantRepo, refreshTokenRepo, JWT_SECRET));
  const auth = authMiddleware(JWT_SECRET);
  const tenantGuard = requireTenant(tenantRepo);
  a.use('/api/billing', auth, tenantGuard, createBillingRoutes(
    subRepo, tenantRepo, invoiceRepo, paymentRepo, eventRepo,
    conversationRepo, usageRepo, docRepo,
  ));
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

let signupCounter = 0;

async function signupTenant(email: string, company: string) {
  const res = await request('POST', '/api/auth/signup', { email, password: 'password123', name: 'Signed Up', companyName: company });
  return { token: res.body.token, tenantId: res.body.tenant.id };
}

async function freshTenant(): Promise<{ token: string; tenantId: string }> {
  signupCounter += 1;
  return signupTenant(`billing-fresh-${signupCounter}@test.com`, `Billing Fresh ${signupCounter}`);
}

let tenantAToken: string;
let tenantAId: string;
let tenantBToken: string;

beforeAll(async () => {
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
  db = createDatabase(TEST_DB);
  userRepo = new UserRepository(db);
  tenantRepo = new TenantRepository(db);
  refreshTokenRepo = new RefreshTokenRepository(db);
  conversationRepo = new ConversationRepository(db);
  usageRepo = new UsageRepository(db);
  kbRepo = new KnowledgeBaseRepository(db);
  docRepo = new KbDocumentRepository(db);
  subRepo = new SubscriptionRepository(db);
  invoiceRepo = new InvoiceRepository(db);
  paymentRepo = new PaymentRepository(db);
  eventRepo = new BillingEventRepository(db);
  app = makeApp();

  const tenantA = await signupTenant('billing-a@test.com', 'Billing Corp A');
  tenantAToken = tenantA.token;
  tenantAId = tenantA.tenantId;

  const tenantB = await signupTenant('billing-b@test.com', 'Billing Corp B');
  tenantBToken = tenantB.token;
});

afterAll(() => {
  if (db) db.close();
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
});

// ─── Plans ────────────────────────────────────────────────

describe('Billing plans', () => {
  it('requires authentication', async () => {
    const res = await request('GET', '/api/billing/plans');
    expect(res.status).toBe(401);
  });

  it('lists configured plans with limits', async () => {
    const res = await request('GET', '/api/billing/plans', undefined, tenantAToken);
    expect(res.status).toBe(200);
    const ids = res.body.plans.map((p: any) => p.id);
    expect(ids).toContain('free');
    expect(ids).toContain('starter');
    expect(ids).toContain('professional');
    expect(ids).toContain('enterprise');
    const free = res.body.plans.find((p: any) => p.id === 'free');
    expect(free.limits.conversations).toBeGreaterThan(0);
    const starter = res.body.plans.find((p: any) => p.id === 'starter');
    expect(starter.price).toBeGreaterThan(0);
  });
});

// ─── Current Subscription ─────────────────────────────────

describe('Billing current subscription', () => {
  it('returns free plan defaults for a tenant without a subscription', async () => {
    const res = await request('GET', '/api/billing/current', undefined, tenantBToken);
    expect(res.status).toBe(200);
    expect(res.body.planId).toBe('free');
    expect(res.body.status).toBe('active');
    expect(res.body.onTrial).toBe(false);
    expect(res.body.conversationsUsed).toBe(0);
    expect(res.body.documentsUsed).toBe(0);
    expect(res.body.teamMembers).toBeGreaterThanOrEqual(1);
  });

  it('reflects real conversation and document counts', async () => {
    conversationRepo.create(tenantAId, 'billing-current-conv-1');
    kbRepo.create(tenantAId, 'Billing KB');
    const kb = kbRepo.listByTenant(tenantAId)[0];
    docRepo.create({ knowledgeBaseId: kb.id, tenantId: tenantAId, filename: 'pricing.pdf', sourceType: 'pdf' });

    const res = await request('GET', '/api/billing/current', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.conversationsUsed).toBe(conversationRepo.listByTenant(tenantAId, 1, 1).total);
    expect(res.body.documentsUsed).toBe(docRepo.countByStatus(tenantAId).total);
    expect(res.body.conversationsLimit).toBeGreaterThan(0);
    expect(res.body.documentsLimit).toBeGreaterThan(0);
    expect(Array.isArray(res.body.features)).toBe(true);
  });

  it('reports trial state from the subscription', async () => {
    subRepo.init(tenantAId, 'free');
    const res = await request('GET', '/api/billing/current', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('trialing');
    expect(res.body.onTrial).toBe(true);
    expect(res.body.daysLeftInTrial).toBeGreaterThan(0);
    expect(res.body.daysLeftInTrial).toBeLessThanOrEqual(30);
  });
});

// ─── Usage Metrics ────────────────────────────────────────

describe('Billing usage metrics', () => {
  it('returns 404 when no subscription exists', async () => {
    const res = await request('GET', '/api/billing/usage', undefined, tenantBToken);
    expect(res.status).toBe(404);
  });

  it('returns real monthly conversation, message, and document counts', async () => {
    const month = new Date().toISOString().slice(0, 7);
    const baseConvs = conversationRepo.countByMonth(tenantAId).find(r => r.month === month)?.count || 0;
    const baseDocs = docRepo.listByTenant(tenantAId).filter(d => (d.createdAt || '').slice(0, 7) === month).length;

    conversationRepo.create(tenantAId, 'conv-usage-2');
    conversationRepo.create(tenantAId, 'conv-usage-3');
    usageRepo.incrementMessages(tenantAId, month, 3);
    usageRepo.incrementTokens(tenantAId, month, 1500);
    const kb = kbRepo.listByTenant(tenantAId)[0];
    docRepo.create({ knowledgeBaseId: kb.id, tenantId: tenantAId, filename: 'terms.pdf', sourceType: 'pdf' });

    const res = await request('GET', '/api/billing/usage', undefined, tenantAToken);
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('free');
    const current = res.body.usage.find((u: any) => u.date.startsWith(month));
    expect(current).toBeTruthy();
    expect(current.conversations).toBe(baseConvs + 2);
    expect(current.messages).toBe(3);
    expect(current.documentsUploaded).toBe(baseDocs + 1);
  });

  it('emits a zeroed entry for the current month when no usage exists yet', async () => {
    const fresh = await freshTenant();
    subRepo.init(fresh.tenantId, 'free');
    const res = await request('GET', '/api/billing/usage', undefined, fresh.token);
    expect(res.status).toBe(200);
    expect(res.body.usage).toHaveLength(1);
    expect(res.body.usage[0].conversations).toBe(0);
    expect(res.body.usage[0].messages).toBe(0);
    expect(res.body.usage[0].documentsUploaded).toBe(0);
  });
});

// ─── Checkout & Plan Changes ──────────────────────────────

describe('Billing checkout and plan changes', () => {
  it('rejects an invalid plan', async () => {
    const fresh = await freshTenant();
    const res = await request('POST', '/api/billing/checkout', { plan: 'ultra' }, fresh.token);
    expect(res.status).toBe(400);
  });

  it('rejects checkout when no Paddle price ID is configured', async () => {
    const fresh = await freshTenant();
    const res = await request('POST', '/api/billing/checkout', { plan: 'professional' }, fresh.token);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Plan not available for checkout');
  });

  it('rejects change-plan when no subscription exists', async () => {
    const fresh = await freshTenant();
    const res = await request('POST', '/api/billing/change-plan', { plan: 'professional' }, fresh.token);
    expect(res.status).toBe(404);
  });

  it('rejects change-plan when the target Paddle price is unconfigured', async () => {
    const fresh = await freshTenant();
    subRepo.init(fresh.tenantId, 'free');
    const res = await request('POST', '/api/billing/change-plan', { plan: 'professional' }, fresh.token);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('not configured');
  });
});

// ─── Cancel / Resume / Manage ─────────────────────────────

describe('Billing lifecycle', () => {
  it('returns 404 for cancel without a subscription', async () => {
    const fresh = await freshTenant();
    const res = await request('POST', '/api/billing/cancel', {}, fresh.token);
    expect(res.status).toBe(404);
  });

  it('cancels and resumes a subscription locally without Paddle IDs', async () => {
    const fresh = await freshTenant();
    subRepo.init(fresh.tenantId, 'free');
    const cancel = await request('POST', '/api/billing/cancel', {}, fresh.token);
    expect(cancel.status).toBe(200);
    expect(subRepo.findByTenant(fresh.tenantId)!.status).toBe('cancelled');
    expect(subRepo.findByTenant(fresh.tenantId)!.cancelledAt).toBeTruthy();
    expect(tenantRepo.findById(fresh.tenantId)!.subscriptionStatus).toBe('cancelled');

    const resume = await request('POST', '/api/billing/resume', {}, fresh.token);
    expect(resume.status).toBe(200);
    expect(subRepo.findByTenant(fresh.tenantId)!.status).toBe('active');
    expect(tenantRepo.findById(fresh.tenantId)!.subscriptionStatus).toBe('active');
  });

  it('returns 400 for manage without a Paddle subscription', async () => {
    const fresh = await freshTenant();
    subRepo.init(fresh.tenantId, 'free');
    const res = await request('POST', '/api/billing/manage', {}, fresh.token);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('No Paddle subscription');
  });
});

// ─── Payment History ──────────────────────────────────────

describe('Billing payment history', () => {
  it('returns seeded invoices and payments for the tenant only', async () => {
    const fresh = await freshTenant();
    subRepo.init(fresh.tenantId, 'free');
    const sub = subRepo.findByTenant(fresh.tenantId)!;
    const periodStart = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 30 * 86400000).toISOString();
    invoiceRepo.upsert({
      tenantId: fresh.tenantId, paddleInvoiceId: 'inv-fresh-1', subscriptionId: sub.id,
      status: 'paid', amount: 99, currency: 'USD', paidAt: new Date().toISOString(),
      periodStart, periodEnd,
    });
    const invoice = invoiceRepo.findByTenant(fresh.tenantId).invoices[0];
    paymentRepo.create({
      tenantId: fresh.tenantId, paddlePaymentId: 'pay-fresh-1', invoiceId: invoice.id,
      amount: 99, currency: 'USD', status: 'paid', method: 'card', paidAt: new Date().toISOString(),
    });

    const res = await request('GET', '/api/billing/payment-history', undefined, fresh.token);
    expect(res.status).toBe(200);
    expect(res.body.invoices).toHaveLength(1);
    expect(res.body.invoices[0].amount).toBe(99);
    expect(res.body.payments).toHaveLength(1);
    expect(res.body.payments[0].method).toBe('card');

    const other = await request('GET', '/api/billing/payment-history', undefined, tenantAToken);
    expect(other.status).toBe(200);
    expect(other.body.invoices).toHaveLength(0);
    expect(other.body.payments).toHaveLength(0);
  });
});