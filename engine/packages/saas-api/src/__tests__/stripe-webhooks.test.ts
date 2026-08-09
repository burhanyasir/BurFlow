import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import { createHmac } from 'crypto';

vi.hoisted(() => {
  process.env.STRIPE_PRICE_STARTER_MONTHLY = 'price_starter_test';
  process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = 'price_professional_test';
});
import {
  createDatabase, UserRepository, TenantRepository, RefreshTokenRepository,
  ConversationRepository, UsageRepository, SubscriptionRepository,
  InvoiceRepository, PaymentRepository, BillingEventRepository,
} from '@conversation-engine/saas-core';
import { authMiddleware } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { createAuthRoutes } from '../routes/auth';
import { createStripeWebhookRoutes } from '../routes/webhooks';
import { createQuotaGuard } from '../middleware/quota-guard';

const TEST_DB = join(__dirname, '__test_stripe_webhooks__.db');
const JWT_SECRET = 'test-secret-key-for-stripe-webhooks';
const WEBHOOK_SECRET = 'whsec_test_secret_for_signature_verification';

let db: Database.Database;
let userRepo: UserRepository;
let tenantRepo: TenantRepository;
let refreshTokenRepo: RefreshTokenRepository;
let conversationRepo: ConversationRepository;
let usageRepo: UsageRepository;
let subRepo: SubscriptionRepository;
let invoiceRepo: InvoiceRepository;
let paymentRepo: PaymentRepository;
let eventRepo: BillingEventRepository;
let webhookApp: express.Express;
let quotaApp: express.Express;

function signStripeEvent(payload: string, secret = WEBHOOK_SECRET, timestampSec?: number): string {
  const ts = timestampSec ?? Math.floor(Date.now() / 1000);
  const signed = `${ts}.${payload}`;
  const sig = createHmac('sha256', secret).update(signed, 'utf8').digest('hex');
  return `t=${ts},v1=${sig}`;
}

function makeWebhookApp() {
  const a = express();
  a.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
  a.use('/api/webhooks/stripe', createStripeWebhookRoutes(
    { subRepo, tenantRepo, invoiceRepo, paymentRepo, eventRepo },
    { webhookSecret: WEBHOOK_SECRET },
  ));
  return a;
}

function makeQuotaApp() {
  const a = express();
  a.use(express.json());
  a.use('/api/auth', createAuthRoutes(userRepo, tenantRepo, refreshTokenRepo, JWT_SECRET));
  const auth = authMiddleware(JWT_SECRET);
  const tenantGuard = requireTenant(tenantRepo);
  const quotaGuard = createQuotaGuard({
    getCurrentMonthConversations: (tenantId) => usageRepo.getCurrentMonthConversations(tenantId),
    getPlan: (tenantId) => subRepo.findByTenant(tenantId)?.plan || null,
  });
  a.use('/api/chat', auth, tenantGuard, quotaGuard, (_req, res) => {
    res.json({ ok: true, passed: true });
  });
  return a;
}

function httpRequest(serverApp: express.Express, method: string, path: string, body?: string | Buffer, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; body: any; raw: string }>((resolve) => {
    const http = require('http');
    const server = serverApp.listen(0, () => {
      const port = (server.address() as any).port;
      const r = http.request({ hostname: '127.0.0.1', port, path, method, headers }, (res: any) => {
        let data = '';
        res.on('data', (c: string) => data += c);
        res.on('end', () => {
          server.close();
          let parsed: any = null;
          try { parsed = data ? JSON.parse(data) : null; } catch { parsed = null; }
          resolve({ status: res.statusCode, body: parsed, raw: data });
        });
      });
      if (body) r.write(body);
      r.end();
    });
  });
}

async function postStripeEvent(event: any, opts: { header?: string; raw?: string } = {}): Promise<{ status: number; body: any }> {
  const raw = opts.raw ?? JSON.stringify(event);
  const header = opts.header ?? signStripeEvent(raw);
  return httpRequest(webhookApp, 'POST', '/api/webhooks/stripe', raw, {
    'Content-Type': 'application/json',
    'stripe-signature': header,
  });
}

let signupCounter = 0;

async function signupTenant(email: string, company: string) {
  const res = await httpRequest(quotaApp, 'POST', '/api/auth/signup', JSON.stringify({ email, password: 'password123', name: 'Signed Up', companyName: company }), { 'Content-Type': 'application/json' });
  return { token: res.body.token, tenantId: res.body.tenant.id };
}

async function freshTenant(): Promise<{ token: string; tenantId: string }> {
  signupCounter += 1;
  return signupTenant(`stripe-fresh-${signupCounter}@test.com`, `Stripe Fresh ${signupCounter}`);
}

function subscriptionEvent(type: string, overrides: Record<string, any> = {}) {
  return {
    id: `evt_${type.replace(/\./g, '_')}_${Date.now()}`,
    object: 'event',
    type,
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: `sub_${Math.random().toString(36).slice(2, 10)}`,
        object: 'subscription',
        status: 'active',
        customer: `cus_${Math.random().toString(36).slice(2, 10)}`,
        current_period_start: Math.floor(Date.now() / 1000) - 86400,
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        trial_end: Math.floor(Date.now() / 1000) + 7 * 86400,
        items: { data: [{ id: 'si_1', price: { id: 'price_professional_test' } }] },
        metadata: {},
        ...overrides,
      },
    },
  };
}

describe('Stripe webhook signature verification', () => {
  beforeAll(async () => {
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
    db = createDatabase(TEST_DB);
    userRepo = new UserRepository(db);
    tenantRepo = new TenantRepository(db);
    refreshTokenRepo = new RefreshTokenRepository(db);
    conversationRepo = new ConversationRepository(db);
    usageRepo = new UsageRepository(db);
    subRepo = new SubscriptionRepository(db);
    invoiceRepo = new InvoiceRepository(db);
    paymentRepo = new PaymentRepository(db);
    eventRepo = new BillingEventRepository(db);
    webhookApp = makeWebhookApp();
    quotaApp = makeQuotaApp();
  });

  afterAll(() => {
    if (db) db.close();
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
  });

  it('rejects webhooks with a missing signature header', async () => {
    const res = await httpRequest(webhookApp, 'POST', '/api/webhooks/stripe', JSON.stringify({}), { 'Content-Type': 'application/json' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/signature/i);
  });

  it('rejects webhooks with an invalid signature', async () => {
    const event = subscriptionEvent('customer.subscription.updated');
    const res = await postStripeEvent(event, { header: 't=1,v1=deadbeef' });
    expect(res.status).toBe(401);
  });

  it('rejects webhooks signed with the wrong secret', async () => {
    const event = subscriptionEvent('customer.subscription.updated');
    const res = await postStripeEvent(event, { header: signStripeEvent(JSON.stringify(event), 'whsec_wrong_secret') });
    expect(res.status).toBe(401);
  });

  it('rejects tampered payloads (signature no longer matches body)', async () => {
    const event = subscriptionEvent('customer.subscription.updated');
    const raw = JSON.stringify(event);
    const header = signStripeEvent(raw);
    const tampered = raw.replace('"status":"active"', '"status":"past_due"');
    const res = await httpRequest(webhookApp, 'POST', '/api/webhooks/stripe', tampered, {
      'Content-Type': 'application/json',
      'stripe-signature': header,
    });
    expect(res.status).toBe(401);
  });

  it('rejects signatures with an expired timestamp (tolerance 300s)', async () => {
    const event = subscriptionEvent('customer.subscription.updated');
    const stale = Math.floor(Date.now() / 1000) - 3600;
    const res = await postStripeEvent(event, { header: signStripeEvent(JSON.stringify(event), WEBHOOK_SECRET, stale) });
    expect(res.status).toBe(401);
  });

  it('accepts a valid signature and acknowledges the event', async () => {
    const event = subscriptionEvent('customer.subscription.updated');
    const res = await postStripeEvent(event);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true });
  });
});

describe('Stripe webhook subscription sync', () => {
  let tenantId: string;

  beforeAll(async () => {
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
    db = createDatabase(TEST_DB);
    userRepo = new UserRepository(db);
    tenantRepo = new TenantRepository(db);
    refreshTokenRepo = new RefreshTokenRepository(db);
    conversationRepo = new ConversationRepository(db);
    usageRepo = new UsageRepository(db);
    subRepo = new SubscriptionRepository(db);
    invoiceRepo = new InvoiceRepository(db);
    paymentRepo = new PaymentRepository(db);
    eventRepo = new BillingEventRepository(db);
    webhookApp = makeWebhookApp();
    quotaApp = makeQuotaApp();
    tenantId = (await freshTenant()).tenantId;
    subRepo.init(tenantId, 'free');
  });

  afterAll(() => {
    if (db) db.close();
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
  });

  it('syncs subscription status, period end, stripe ids, and plan tier to subscriptions and tenants tables', async () => {
    const subId = 'sub_sync_test_1';
    const customerId = 'cus_sync_test_1';
    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86400;
    const event = subscriptionEvent('customer.subscription.updated', {
      id: subId,
      customer: customerId,
      current_period_end: periodEnd,
      metadata: { tenantId },
      items: { data: [{ id: 'si_1', price: { id: 'price_professional_test' } }] },
    });
    const res = await postStripeEvent(event);
    expect(res.status).toBe(200);

    const sub = subRepo.findByTenant(tenantId)!;
    expect(sub.status).toBe('active');
    expect(sub.stripeSubscriptionId).toBe(subId);
    expect(sub.stripeCustomerId).toBe(customerId);
    expect(sub.plan).toBe('professional');
    expect(sub.currentPeriodEnd).toBe(new Date(periodEnd * 1000).toISOString());

    const tenant = tenantRepo.findById(tenantId)!;
    expect(tenant.subscriptionStatus).toBe('active');
    expect(tenant.subscriptionPeriodEnd).toBe(new Date(periodEnd * 1000).toISOString());
    expect(tenant.stripeSubscriptionId).toBe(subId);
    expect(tenant.stripeCustomerId).toBe(customerId);
    expect(tenant.plan).toBe('professional');
  });

  it('creates a subscription row when a fresh tenant receives subscription.updated', async () => {
    const fresh = await freshTenant();
    const subId = 'sub_fresh_test_1';
    const customerId = 'cus_fresh_test_1';
    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86400;
    const event = subscriptionEvent('customer.subscription.updated', {
      id: subId,
      customer: customerId,
      current_period_end: periodEnd,
      metadata: { tenantId: fresh.tenantId },
      items: { data: [{ id: 'si_fresh_1', price: { id: 'price_starter_test' } }] },
    });
    const res = await postStripeEvent(event);
    expect(res.status).toBe(200);

    const sub = subRepo.findByTenant(fresh.tenantId)!;
    expect(sub).not.toBeNull();
    expect(sub.plan).toBe('starter');
    expect(sub.status).toBe('active');
    expect(sub.stripeSubscriptionId).toBe(subId);
    expect(sub.stripeCustomerId).toBe(customerId);
    expect(sub.stripePriceId).toBe('price_starter_test');
    expect(sub.currentPeriodEnd).toBe(new Date(periodEnd * 1000).toISOString());

    const tenant = tenantRepo.findById(fresh.tenantId)!;
    expect(tenant.plan).toBe('starter');
    expect(tenant.subscriptionStatus).toBe('active');
    expect(tenant.subscriptionPeriodEnd).toBe(new Date(periodEnd * 1000).toISOString());
  });

  it('maps past_due subscription status', async () => {
    const event = subscriptionEvent('customer.subscription.updated', {
      status: 'past_due',
      metadata: { tenantId },
    });
    await postStripeEvent(event);
    expect(subRepo.findByTenant(tenantId)!.status).toBe('past_due');
    expect(tenantRepo.findById(tenantId)!.subscriptionStatus).toBe('past_due');
  });

  it('maps canceled subscription deletion to cancelled', async () => {
    const subId = 'sub_cancel_test_1';
    subRepo.update(tenantId, { stripeSubscriptionId: subId });
    const event = subscriptionEvent('customer.subscription.deleted', {
      id: subId,
      status: 'canceled',
      metadata: { tenantId },
    });
    const res = await postStripeEvent(event);
    expect(res.status).toBe(200);
    expect(subRepo.findByTenant(tenantId)!.status).toBe('cancelled');
    expect(tenantRepo.findById(tenantId)!.subscriptionStatus).toBe('cancelled');
  });

  it('resolves the tenant by stripe subscription id when metadata is absent', async () => {
    const subId = 'sub_lookup_by_sub';
    subRepo.update(tenantId, { stripeSubscriptionId: subId, status: 'active' });
    const event = subscriptionEvent('customer.subscription.updated', {
      id: subId,
      status: 'trialing',
      metadata: {},
    });
    const res = await postStripeEvent(event);
    expect(res.status).toBe(200);
    expect(subRepo.findByTenant(tenantId)!.status).toBe('trialing');
  });

  it('resolves the tenant by stripe customer id as a last resort', async () => {
    const customerId = 'cus_lookup_fallback';
    subRepo.update(tenantId, { stripeCustomerId: customerId, status: 'active' });
    const event = subscriptionEvent('customer.subscription.updated', {
      customer: customerId,
      status: 'past_due',
      metadata: {},
    });
    const res = await postStripeEvent(event);
    expect(res.status).toBe(200);
    expect(subRepo.findByTenant(tenantId)!.status).toBe('past_due');
  });

  it('ignores duplicate events', async () => {
    const event = subscriptionEvent('customer.subscription.updated', { metadata: { tenantId } });
    const raw = JSON.stringify(event);
    const header = signStripeEvent(raw);
    await httpRequest(webhookApp, 'POST', '/api/webhooks/stripe', raw, { 'Content-Type': 'application/json', 'stripe-signature': header });
    const second = await httpRequest(webhookApp, 'POST', '/api/webhooks/stripe', raw, { 'Content-Type': 'application/json', 'stripe-signature': header });
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ received: true, duplicate: true });
  });

  it('records invoices and payments on invoice.paid', async () => {
    const invoiceCustomer = 'cus_invoice_paid_test';
    subRepo.update(tenantId, { stripeCustomerId: invoiceCustomer, status: 'active' });
    const event = {
      id: `evt_invoice_paid_${Date.now()}`,
      object: 'event',
      type: 'invoice.paid',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: `in_${Math.random().toString(36).slice(2, 10)}`,
          object: 'invoice',
          customer: invoiceCustomer,
          amount_paid: 9900,
          amount_due: 9900,
          currency: 'usd',
          payment_method_details: { type: 'card' },
          lines: {
            data: [{
              period: {
                start: Math.floor(Date.now() / 1000) - 86400,
                end: Math.floor(Date.now() / 1000) + 29 * 86400,
              },
            }],
          },
        },
      },
    };
    const res = await postStripeEvent(event);
    expect(res.status).toBe(200);
    const { invoices } = invoiceRepo.findByTenant(tenantId);
    expect(invoices.length).toBeGreaterThan(0);
    expect(invoices[0].status).toBe('paid');
    expect(invoices[0].amount).toBe(9900);
    expect(invoices[0].currency).toBe('USD');
    const { payments } = paymentRepo.findByTenant(tenantId);
    expect(payments.length).toBeGreaterThan(0);
    expect(payments[0].status).toBe('completed');
  });

  it('marks the subscription past_due on invoice.payment_failed', async () => {
    const invoiceCustomer = 'cus_invoice_failed_test';
    subRepo.update(tenantId, { stripeCustomerId: invoiceCustomer, status: 'active' });
    const event = {
      id: `evt_invoice_failed_${Date.now()}`,
      object: 'event',
      type: 'invoice.payment_failed',
      created: Math.floor(Date.now() / 1000),
      data: { object: { id: `in_${Math.random().toString(36).slice(2, 10)}`, object: 'invoice', customer: invoiceCustomer } },
    };
    const res = await postStripeEvent(event);
    expect(res.status).toBe(200);
    expect(subRepo.findByTenant(tenantId)!.status).toBe('past_due');
  });

  it('binds stripe customer and subscription ids on checkout.session.completed', async () => {
    const event = {
      id: `evt_checkout_${Date.now()}`,
      object: 'event',
      type: 'checkout.session.completed',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: `cs_${Math.random().toString(36).slice(2, 10)}`,
          object: 'checkout.session',
          customer: 'cus_checkout_test',
          subscription: 'sub_checkout_test',
          metadata: { tenantId },
        },
      },
    };
    const res = await postStripeEvent(event);
    expect(res.status).toBe(200);
    const tenant = tenantRepo.findById(tenantId)!;
    expect(tenant.stripeCustomerId).toBe('cus_checkout_test');
    expect(tenant.stripeSubscriptionId).toBe('sub_checkout_test');
  });

  it('acknowledges unknown event types without erroring', async () => {
    const event = { id: `evt_unknown_${Date.now()}`, object: 'event', type: 'charge.succeeded', created: Math.floor(Date.now() / 1000), data: { object: { id: 'ch_1' } } };
    const res = await postStripeEvent(event);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true });
  });
});

describe('Quota guard middleware', () => {
  beforeAll(async () => {
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
    db = createDatabase(TEST_DB);
    userRepo = new UserRepository(db);
    tenantRepo = new TenantRepository(db);
    refreshTokenRepo = new RefreshTokenRepository(db);
    conversationRepo = new ConversationRepository(db);
    usageRepo = new UsageRepository(db);
    subRepo = new SubscriptionRepository(db);
    invoiceRepo = new InvoiceRepository(db);
    paymentRepo = new PaymentRepository(db);
    eventRepo = new BillingEventRepository(db);
    webhookApp = makeWebhookApp();
    quotaApp = makeQuotaApp();
  });

  afterAll(() => {
    if (db) db.close();
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
  });

  it('lets chat requests through while under the plan limit', async () => {
    const { token } = await freshTenant();
    const res = await httpRequest(quotaApp, 'POST', '/api/chat', JSON.stringify({ message: 'hello' }), {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });

  it('blocks chat with 429 once the current-month conversation count hits the plan limit', async () => {
    const { token, tenantId } = await freshTenant();
    subRepo.init(tenantId, 'free');
    for (let i = 0; i < 100; i++) {
      conversationRepo.create(tenantId, `quota-session-${i}`);
    }
    expect(usageRepo.getCurrentMonthConversations(tenantId)).toBe(100);
    const res = await httpRequest(quotaApp, 'POST', '/api/chat', JSON.stringify({ message: 'hello' }), {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('CONVERSATION_QUOTA_EXCEEDED');
    expect(res.body.limit).toBe(100);
    expect(res.body.used).toBe(100);
    expect(res.body.upgradeUrl).toBe('/dashboard/billing');
    expect(res.body.message.length).toBeGreaterThan(10);
  });

  it('passes unlimited plans through even with heavy usage', async () => {
    const { token, tenantId } = await freshTenant();
    subRepo.init(tenantId, 'enterprise');
    for (let i = 0; i < 150; i++) {
      conversationRepo.create(tenantId, `quota-enterprise-${i}`);
    }
    const res = await httpRequest(quotaApp, 'POST', '/api/chat', JSON.stringify({ message: 'hello' }), {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    expect(res.status).toBe(200);
  });

  it('uses a custom conversation limit provider when supplied', async () => {
    const customApp = express();
    customApp.use(express.json());
    customApp.use('/api/auth', createAuthRoutes(userRepo, tenantRepo, refreshTokenRepo, JWT_SECRET));
    const auth = authMiddleware(JWT_SECRET);
    const tenantGuard = requireTenant(tenantRepo);
    const guard = createQuotaGuard({
      getCurrentMonthConversations: () => 5,
      getPlan: () => 'starter',
      getConversationLimit: () => 3,
    });
    customApp.use('/api/chat', auth, tenantGuard, guard, (_req, res) => res.json({ ok: true }));
    const { token } = await freshTenant();
    const res = await httpRequest(customApp, 'POST', '/api/chat', JSON.stringify({ message: 'hello' }), {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
    expect(res.status).toBe(429);
    expect(res.body.limit).toBe(3);
    expect(res.body.used).toBe(5);
  });
});
