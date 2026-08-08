import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import express from 'express';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import {
  createDatabase, UserRepository, TenantRepository, ApiKeyRepository, RefreshTokenRepository,
  ConversationRepository, MessageRepository, UsageRepository,
  KnowledgeBaseRepository, KbDocumentRepository, WidgetConfigRepository,
  generateToken,
} from '@conversation-engine/saas-core';
import { authMiddleware } from '../middleware/auth';
import { createAuthRoutes } from '../routes/auth';
import { createTenantRoutes } from '../routes/tenants';
import { createApiKeyRoutes } from '../routes/api-keys';
import { createConversationRoutes } from '../routes/conversations';
import { createUsageRoutes } from '../routes/usage';
import { createKnowledgeBaseRoutes } from '../routes/knowledge-base';
import { createKnowledgeRoutes } from '../routes/knowledge';
import { createWidgetRoutes } from '../routes/widget';

// ─── Mocks ────────────────────────────────────────────────

// Track which tenant is crawling so we can return different mock content per tenant
let currentCrawlTenantId = '';
let currentCrawlUrl = '';

// Mock knowledge-pipeline to avoid real HTTP requests and DB vector inserts
vi.mock('@conversation-engine/knowledge-pipeline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@conversation-engine/knowledge-pipeline')>();
  return {
    ...actual,
    KnowledgePipeline: class {
      private queueMap = new Map<string, any>();
      registerParser() {}
      async enqueue(tenantId: string, _sourceType: string, originalName: string, _content: string, _meta?: Record<string, unknown>) {
        const docId = `mock-doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this.queueMap.set(docId, { tenantId, status: 'queued', queuedAt: new Date().toISOString() });
        return docId;
      }
      async processParsedDocument(documentId: string, _parsed: any) {
        const entry = this.queueMap.get(documentId);
        if (entry) entry.status = 'published';
        return { chunks: [], knowledgeVersion: 1 };
      }
      getQueueStatus(documentId: string) {
        const entry = this.queueMap.get(documentId);
        return entry ? { status: entry.status, queuedAt: entry.queuedAt } : null;
      }
      listByTenant(_tenantId: string, _status?: string) { return []; }
    },
    WebsiteCrawler: class {
      async crawl(url: string, tenantId: string, _opts?: any) {
        currentCrawlUrl = url;
        currentCrawlTenantId = tenantId;

        // E-commerce tenant
        if (url.includes('clothing') || url.includes('ecommerce')) {
          return [
            {
              title: 'Summer Collection - Shop Online',
              content: 'Browse our latest summer dresses, t-shirts, and accessories. Free shipping on orders over $50.',
              metadata: { sourceUrl: 'https://shop.example.com/catalog' },
              sections: [{ title: 'Catalog', content: 'Browse our latest summer dresses, t-shirts, and accessories.' }],
              headings: [{ level: 1, text: 'Summer Collection' }],
              tables: [],
              lists: [],
            },
            {
              title: 'Shipping & Returns Policy',
              content: 'We offer free standard shipping on orders over $50. Returns accepted within 30 days with original receipt.',
              metadata: { sourceUrl: 'https://shop.example.com/shipping' },
              sections: [{ title: 'Shipping', content: 'Free standard shipping on orders over $50.' }],
              headings: [{ level: 1, text: 'Shipping & Returns' }],
              tables: [],
              lists: [],
            },
            {
              title: 'Track Your Order',
              content: 'Enter your order number to track your package in real-time. Delivery updates sent via email.',
              metadata: { sourceUrl: 'https://shop.example.com/track' },
              sections: [{ title: 'Track', content: 'Enter your order number to track your package.' }],
              headings: [{ level: 1, text: 'Track Order' }],
              tables: [],
              lists: [],
            },
          ];
        }

        // Healthcare/dental tenant
        if (url.includes('dental') || url.includes('clinic')) {
          return [
            {
              title: 'Our Dental Services',
              content: 'We provide cleanings, fillings, root canals, teeth whitening, and emergency dental care.',
              metadata: { sourceUrl: 'https://dental.example.com/services' },
              sections: [{ title: 'Services', content: 'We provide cleanings, fillings, root canals.' }],
              headings: [{ level: 1, text: 'Dental Services' }],
              tables: [],
              lists: [],
            },
            {
              title: 'Book an Appointment',
              content: 'Schedule your next dental cleaning or consultation online. New patients welcome.',
              metadata: { sourceUrl: 'https://dental.example.com/book' },
              sections: [{ title: 'Book', content: 'Schedule your next dental cleaning online.' }],
              headings: [{ level: 1, text: 'Book Appointment' }],
              tables: [],
              lists: [],
            },
            {
              title: 'Insurance & Payment',
              content: 'We accept most major dental insurance plans. Payment plans available for uninsured patients.',
              metadata: { sourceUrl: 'https://dental.example.com/insurance' },
              sections: [{ title: 'Insurance', content: 'We accept most major dental insurance plans.' }],
              headings: [{ level: 1, text: 'Insurance & Payment' }],
              tables: [],
              lists: [],
            },
          ];
        }

        // Fallback: empty/minimal content
        return [
          {
            title: '',
            content: '',
            metadata: { sourceUrl: url },
            sections: [],
            headings: [],
            tables: [],
            lists: [],
          },
        ];
      }
    },
  };
});

// Mock Groq to return industry-specific starter options
vi.mock('groq-sdk', () => {
  return {
    default: class {
      chat = {
        completions: {
          create: async (opts: any) => {
            const userMsg = opts.messages?.find((m: any) => m.role === 'user')?.content || '';

            // E-commerce: clothing, shipping, returns, track
            if (userMsg.includes('clothing') || userMsg.includes('shipping') || userMsg.includes('summer') || userMsg.includes('Track Your Order')) {
              return {
                choices: [{ message: { content: '["Track my order", "What is your return policy?", "Do you offer free shipping?"]' } }],
              };
            }

            // Healthcare: dental, cleaning, insurance, emergency
            if (userMsg.includes('dental') || userMsg.includes('cleaning') || userMsg.includes('Insurance') || userMsg.includes('Appointment')) {
              return {
                choices: [{ message: { content: '["Book a dental cleaning", "Do you accept my insurance?", "Emergency dental care available?"]' } }],
              };
            }

            // Generic fallback
            return {
              choices: [{ message: { content: '["How does it work?", "Book a demo", "What services do you offer?"]' } }],
            };
          },
        },
      };
    },
  };
});

// ─── Test Setup ───────────────────────────────────────────

const TEST_DB = join(__dirname, '__test_starter_e2e__.db');
const JWT_SECRET = 'test-secret-key-for-starter-e2e';

let db: Database.Database;
let userRepo: UserRepository;
let tenantRepo: TenantRepository;
let apiKeyRepo: ApiKeyRepository;
let refreshTokenRepo: RefreshTokenRepository;
let conversationRepo: ConversationRepository;
let messageRepo: MessageRepository;
let usageRepo: UsageRepository;
let kbRepo: KnowledgeBaseRepository;
let docRepo: KbDocumentRepository;
let widgetConfigRepo: WidgetConfigRepository;
let app: express.Express;

function makeApp() {
  const a = express();
  a.use(express.json({ limit: '10mb' }));
  a.use('/api/auth', createAuthRoutes(userRepo, tenantRepo, refreshTokenRepo, JWT_SECRET));
  const auth = authMiddleware(JWT_SECRET);
  a.use('/api/tenants', auth, createTenantRoutes(tenantRepo, userRepo));
  a.use('/api/api-keys', auth, createApiKeyRoutes(apiKeyRepo, tenantRepo));
  a.use('/api/conversations', auth, createConversationRoutes(conversationRepo, messageRepo));
  a.use('/api/usage', auth, createUsageRoutes(usageRepo));
  a.use('/api/knowledge-bases', auth, createKnowledgeBaseRoutes(kbRepo, docRepo));
  a.use('/api/knowledge', auth, createKnowledgeRoutes({ db, embeddingDimension: 64 }));
  a.use('/api/widget', createWidgetRoutes(widgetConfigRepo, JWT_SECRET));
  return a;
}

async function request(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const req = { method, path, headers, body: body ? JSON.stringify(body) : undefined };
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

let ecommerceToken: string;
let ecommerceTenantId: string;
let healthcareToken: string;
let healthcareTenantId: string;
let fallbackToken: string;
let fallbackTenantId: string;

beforeAll(async () => {
  // Ensure Groq path is taken (mocked)
  process.env.GROQ_API_KEY = 'test-mock-key';

  if (existsSync(TEST_DB)) rmSync(TEST_DB);
  db = createDatabase(TEST_DB);
  userRepo = new UserRepository(db);
  tenantRepo = new TenantRepository(db);
  apiKeyRepo = new ApiKeyRepository(db);
  refreshTokenRepo = new RefreshTokenRepository(db);
  conversationRepo = new ConversationRepository(db);
  messageRepo = new MessageRepository(db);
  usageRepo = new UsageRepository(db);
  kbRepo = new KnowledgeBaseRepository(db);
  docRepo = new KbDocumentRepository(db);
  widgetConfigRepo = new WidgetConfigRepository(db);
  app = makeApp();

  // Create e-commerce tenant
  const signup1 = await request('POST', '/api/auth/signup', {
    email: 'shop@test.com', password: 'password123', name: 'Shop Admin', companyName: 'Clothing Store',
  });
  ecommerceToken = signup1.body.token;
  ecommerceTenantId = signup1.body.tenant.id;

  // Create healthcare tenant
  const signup2 = await request('POST', '/api/auth/signup', {
    email: 'dental@test.com', password: 'password123', name: 'Dental Admin', companyName: 'Dental Clinic',
  });
  healthcareToken = signup2.body.token;
  healthcareTenantId = signup2.body.tenant.id;

  // Create fallback tenant
  const signup3 = await request('POST', '/api/auth/signup', {
    email: 'fallback@test.com', password: 'password123', name: 'Fallback Admin', companyName: 'Minimal Site',
  });
  fallbackToken = signup3.body.token;
  fallbackTenantId = signup3.body.tenant.id;
});

afterAll(() => {
  try { db.close(); } catch {}
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────

describe('Starter Options E2E: E-Commerce Tenant', () => {
  it('POST /knowledge/crawl generates retail-focused options and saves to DB', async () => {
    const res = await request('POST', '/api/knowledge/crawl', {
      url: 'https://clothing-store.example.com',
    }, ecommerceToken);

    expect(res.status).toBe(202);
    expect(res.body.pagesCrawled).toBe(3);

    // Verify options were saved to widget_configs
    const config = widgetConfigRepo.get(ecommerceTenantId);
    expect(config).toBeTruthy();
    expect(config!.starterOptions).toBeTruthy();
    expect(config!.starterOptions!.length).toBe(3);

    // Verify retail-focused options
    const options = config!.starterOptions!;
    expect(options.some(o => o.toLowerCase().includes('track'))).toBe(true);
    expect(options.some(o => o.toLowerCase().includes('return'))).toBe(true);
    expect(options.some(o => o.toLowerCase().includes('shipping'))).toBe(true);
  });

  it('GET /api/widget/config returns the retail options', async () => {
    // First trigger a crawl to populate options
    await request('POST', '/api/knowledge/crawl', {
      url: 'https://clothing-store.example.com/shop',
    }, ecommerceToken);

    const res = await request('GET', '/api/widget/config', undefined, ecommerceToken);
    expect(res.status).toBe(200);
    expect(res.body.starterOptions).toBeTruthy();
    expect(res.body.starterOptions.length).toBe(3);

    const options = res.body.starterOptions;
    expect(options.some((o: string) => o.toLowerCase().includes('track'))).toBe(true);
    expect(options.some((o: string) => o.toLowerCase().includes('return'))).toBe(true);
    expect(options.some((o: string) => o.toLowerCase().includes('shipping'))).toBe(true);
  });
});

describe('Starter Options E2E: Healthcare/Clinic Tenant', () => {
  it('POST /knowledge/crawl generates healthcare-focused options', async () => {
    const res = await request('POST', '/api/knowledge/crawl', {
      url: 'https://dental-clinic.example.com',
    }, healthcareToken);

    expect(res.status).toBe(202);
    expect(res.body.pagesCrawled).toBe(3);

    // Verify options were saved
    const config = widgetConfigRepo.get(healthcareTenantId);
    expect(config).toBeTruthy();
    expect(config!.starterOptions).toBeTruthy();
    expect(config!.starterOptions!.length).toBe(3);

    // Verify healthcare-focused options
    const options = config!.starterOptions!;
    expect(options.some(o => o.toLowerCase().includes('cleaning') || o.toLowerCase().includes('book'))).toBe(true);
    expect(options.some(o => o.toLowerCase().includes('insurance'))).toBe(true);
    expect(options.some(o => o.toLowerCase().includes('emergency'))).toBe(true);
  });

  it('GET /api/widget/config returns the healthcare options for this tenant', async () => {
    await request('POST', '/api/knowledge/crawl', {
      url: 'https://dental-clinic.example.com/appointments',
    }, healthcareToken);

    const res = await request('GET', '/api/widget/config', undefined, healthcareToken);
    expect(res.status).toBe(200);
    expect(res.body.starterOptions).toBeTruthy();
    expect(res.body.starterOptions.length).toBe(3);

    const options = res.body.starterOptions;
    expect(options.some((o: string) => o.toLowerCase().includes('cleaning') || o.toLowerCase().includes('book'))).toBe(true);
    expect(options.some((o: string) => o.toLowerCase().includes('insurance'))).toBe(true);
    expect(options.some((o: string) => o.toLowerCase().includes('emergency'))).toBe(true);
  });

  it('tenant isolation: healthcare options do not leak to e-commerce tenant', async () => {
    // Crawl for both tenants
    await request('POST', '/api/knowledge/crawl', {
      url: 'https://clothing-store.example.com/catalog',
    }, ecommerceToken);
    await request('POST', '/api/knowledge/crawl', {
      url: 'https://dental-clinic.example.com/services',
    }, healthcareToken);

    const shopConfig = widgetConfigRepo.get(ecommerceTenantId);
    const dentalConfig = widgetConfigRepo.get(healthcareTenantId);

    // E-commerce should have retail options
    expect(shopConfig!.starterOptions!.some(o => o.toLowerCase().includes('shipping'))).toBe(true);

    // Healthcare should have dental options
    expect(dentalConfig!.starterOptions!.some(o => o.toLowerCase().includes('insurance') || o.toLowerCase().includes('emergency'))).toBe(true);

    // They should be different
    expect(shopConfig!.starterOptions).not.toEqual(dentalConfig!.starterOptions);
  });
});

describe('Starter Options E2E: Fallback / Empty Content', () => {
  it('crawling a site with empty content falls back to heuristic options', async () => {
    const res = await request('POST', '/api/knowledge/crawl', {
      url: 'https://empty-site.example.com',
    }, fallbackToken);

    // Should still succeed (202) even with empty content
    expect(res.status).toBe(202);

    // Verify fallback options were saved
    const config = widgetConfigRepo.get(fallbackTenantId);
    expect(config).toBeTruthy();
    expect(config!.starterOptions).toBeTruthy();
    expect(config!.starterOptions!.length).toBe(3);

    // Should contain generic fallback options
    const options = config!.starterOptions!;
    expect(options.some(o => o.length > 0)).toBe(true);
  });

  it('GET /api/widget/config returns fallback options for empty-content tenant', async () => {
    await request('POST', '/api/knowledge/crawl', {
      url: 'https://empty-site.example.com/page',
    }, fallbackToken);

    const res = await request('GET', '/api/widget/config', undefined, fallbackToken);
    expect(res.status).toBe(200);
    expect(res.body.starterOptions).toBeTruthy();
    expect(res.body.starterOptions.length).toBe(3);
  });

  it('GET /api/widget/config returns correct output shape', async () => {
    await request('POST', '/api/knowledge/crawl', {
      url: 'https://empty-site.example.com/home',
    }, fallbackToken);

    const res = await request('GET', '/api/widget/config', undefined, fallbackToken);
    expect(res.status).toBe(200);

    // Verify WidgetConfig shape
    const config = res.body;
    expect(config).toHaveProperty('theme');
    expect(config).toHaveProperty('position');
    expect(config).toHaveProperty('primaryColor');
    expect(config).toHaveProperty('companyName');
    expect(config).toHaveProperty('greeting');
    expect(config).toHaveProperty('launcherText');
    expect(config).toHaveProperty('starterOptions');
    expect(Array.isArray(config.starterOptions)).toBe(true);
    expect(config.starterOptions.length).toBe(3);
  });
});
