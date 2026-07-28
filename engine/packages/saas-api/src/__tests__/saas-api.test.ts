import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import {
  createDatabase, UserRepository, TenantRepository, ApiKeyRepository, RefreshTokenRepository,
  ConversationRepository, MessageRepository, UsageRepository,
  KnowledgeBaseRepository, KbDocumentRepository,
} from '@conversation-engine/saas-core';
import { authMiddleware } from '../middleware/auth';
import { createAuthRoutes } from '../routes/auth';
import { createTenantRoutes } from '../routes/tenants';
import { createApiKeyRoutes } from '../routes/api-keys';
import { createConversationRoutes } from '../routes/conversations';
import { createUsageRoutes } from '../routes/usage';
import { createKnowledgeBaseRoutes } from '../routes/knowledge-base';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';

const TEST_DB = join(__dirname, '__test_saas__.db');
const JWT_SECRET = 'test-secret-key-for-testing';

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
let app: express.Express;

function makeApp() {
  const a = express();
  a.use(express.json());
  a.use('/api/auth', createAuthRoutes(userRepo, tenantRepo, refreshTokenRepo, JWT_SECRET));
  const auth = authMiddleware(JWT_SECRET);
  a.use('/api/tenants', auth, createTenantRoutes(tenantRepo, userRepo));
  a.use('/api/api-keys', auth, createApiKeyRoutes(apiKeyRepo, tenantRepo));
  a.use('/api/conversations', auth, createConversationRoutes(conversationRepo, messageRepo));
  a.use('/api/usage', auth, createUsageRoutes(usageRepo));
  a.use('/api/knowledge-bases', auth, createKnowledgeBaseRoutes(kbRepo, docRepo));
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

beforeAll(() => {
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
  app = makeApp();
});

afterAll(() => {
  try { db.close(); } catch {}
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
});

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────
describe('Auth', () => {
  it('signup creates user and tenant', async () => {
    const res = await request('POST', '/api/auth/signup', {
      email: 'test@example.com', password: 'password123', name: 'Test User', companyName: 'Test Co',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.tenant.name).toBe('Test Co');
    expect(res.body.token).toBeTruthy();
  });

  it('signup rejects duplicate email', async () => {
    const res = await request('POST', '/api/auth/signup', {
      email: 'test@example.com', password: 'password123', name: 'Duplicate',
    });
    expect(res.status).toBe(409);
  });

  it('signup rejects short password', async () => {
    const res = await request('POST', '/api/auth/signup', {
      email: 'new@example.com', password: 'short', name: 'User',
    });
    expect(res.status).toBe(400);
  });

  it('signup rejects missing fields', async () => {
    const res = await request('POST', '/api/auth/signup', { email: 'x@x.com' });
    expect(res.status).toBe(400);
  });

  it('login succeeds with correct credentials', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'test@example.com', password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('login fails with wrong password', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'test@example.com', password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  it('login fails with nonexistent email', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'nonexistent@example.com', password: 'password123',
    });
    expect(res.status).toBe(401);
  });

  it('GET /me returns user info', async () => {
    const login = await request('POST', '/api/auth/login', {
      email: 'test@example.com', password: 'password123',
    });
    const res = await request('GET', '/api/auth/me', undefined, login.body.token);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.tenants.length).toBeGreaterThan(0);
  });

  it('PUT /me updates user name', async () => {
    const login = await request('POST', '/api/auth/login', {
      email: 'test@example.com', password: 'password123',
    });
    const res = await request('PUT', '/api/auth/me', { name: 'Updated Name' }, login.body.token);
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Updated Name');
  });

  it('PUT /password changes password', async () => {
    const login = await request('POST', '/api/auth/login', {
      email: 'test@example.com', password: 'password123',
    });
    const res = await request('PUT', '/api/auth/password', {
      currentPassword: 'password123', newPassword: 'newpassword123',
    }, login.body.token);
    expect(res.status).toBe(200);

    const login2 = await request('POST', '/api/auth/login', {
      email: 'test@example.com', password: 'newpassword123',
    });
    expect(login2.status).toBe(200);
  });

  it('protected routes reject unauthenticated', async () => {
    const res = await request('GET', '/api/tenants');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────
// TENANTS
// ─────────────────────────────────────────
describe('Tenants', () => {
  let token: string;
  let tenantId: string;

  beforeAll(async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'test@example.com', password: 'newpassword123',
    });
    token = res.body.token;
    tenantId = res.body.tenant.id;
  });

  it('GET / lists tenants', async () => {
    const res = await request('GET', '/api/tenants', undefined, token);
    expect(res.status).toBe(200);
    expect(res.body.tenants.length).toBeGreaterThan(0);
  });

  it('GET /:id returns tenant details', async () => {
    const res = await request('GET', `/api/tenants/${tenantId}`, undefined, token);
    expect(res.status).toBe(200);
    expect(res.body.tenant.id).toBe(tenantId);
    expect(res.body.tenant.settings).toBeDefined();
  });

  it('POST / creates new tenant', async () => {
    const res = await request('POST', '/api/tenants', { name: 'Second Org' }, token);
    expect(res.status).toBe(201);
    expect(res.body.tenant.name).toBe('Second Org');
  });

  it('PUT /:id updates tenant settings', async () => {
    const settings = { branding: { primaryColor: '#FF0000', companyName: 'Updated', welcomeMessage: 'Hi', offlineMessage: 'Bye' } };
    const res = await request('PUT', `/api/tenants/${tenantId}`, { settings }, token);
    expect(res.status).toBe(200);
    expect(res.body.tenant.settings.branding.primaryColor).toBe('#FF0000');
  });

  it('GET /:id/members returns owner', async () => {
    const res = await request('GET', `/api/tenants/${tenantId}/members`, undefined, token);
    expect(res.status).toBe(200);
    expect(res.body.members.length).toBe(1);
    expect(res.body.members[0].role).toBe('owner');
  });
});

// ─────────────────────────────────────────
// API KEYS
// ─────────────────────────────────────────
describe('API Keys', () => {
  let token: string;

  beforeAll(async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'test@example.com', password: 'newpassword123',
    });
    token = res.body.token;
  });

  it('POST / creates API key', async () => {
    const res = await request('POST', '/api/api-keys', { label: 'Test Key', role: 'operator' }, token);
    expect(res.status).toBe(201);
    expect(res.body.key).toBeTruthy();
    expect(res.body.apiKey.label).toBe('Test Key');
    expect(res.body.apiKey.keyPrefix).toBeTruthy();
  });

  it('GET / lists API keys', async () => {
    const res = await request('GET', '/api/api-keys', undefined, token);
    expect(res.status).toBe(200);
    expect(res.body.keys.length).toBeGreaterThan(0);
  });

  it('DELETE /:id revokes API key', async () => {
    const create = await request('POST', '/api/api-keys', { label: 'To Revoke' }, token);
    const res = await request('DELETE', `/api/api-keys/${create.body.apiKey.id}`, undefined, token);
    expect(res.status).toBe(200);
  });

  it('POST / requires label', async () => {
    const res = await request('POST', '/api/api-keys', {}, token);
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────
// CONVERSATIONS
// ─────────────────────────────────────────
describe('Conversations', () => {
  let token: string;
  let tenantId: string;

  beforeAll(async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'test@example.com', password: 'newpassword123',
    });
    token = res.body.token;
    tenantId = res.body.tenant.id;

    const conv = conversationRepo.create(tenantId, 'session-1');
    messageRepo.create({ conversationId: conv.id, tenantId, role: 'user', content: 'Hello', sequenceNumber: 1 });
    messageRepo.create({ conversationId: conv.id, tenantId, role: 'assistant', content: 'Hi there!', sequenceNumber: 2 });
    messageRepo.create({ conversationId: conv.id, tenantId, role: 'user', content: 'Help me', sequenceNumber: 3 });
  });

  it('GET / lists conversations', async () => {
    const res = await request('GET', '/api/conversations', undefined, token);
    expect(res.status).toBe(200);
    expect(res.body.conversations.length).toBeGreaterThan(0);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('GET /:id returns conversation', async () => {
    const list = await request('GET', '/api/conversations', undefined, token);
    const id = list.body.conversations[0].id;
    const res = await request('GET', `/api/conversations/${id}`, undefined, token);
    expect(res.status).toBe(200);
    expect(res.body.conversation.id).toBe(id);
  });

  it('GET /:id/messages returns messages', async () => {
    const list = await request('GET', '/api/conversations', undefined, token);
    const id = list.body.conversations[0].id;
    const res = await request('GET', `/api/conversations/${id}/messages`, undefined, token);
    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBe(3);
  });
});

// ─────────────────────────────────────────
// USAGE
// ─────────────────────────────────────────
describe('Usage', () => {
  let token: string;
  let tenantId: string;

  beforeAll(async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'test@example.com', password: 'newpassword123',
    });
    token = res.body.token;
    tenantId = res.body.tenant.id;
    const period = new Date().toISOString().slice(0, 7);
    usageRepo.incrementMessages(tenantId, period, 42);
    usageRepo.incrementTokens(tenantId, period, 1500);
  });

  it('GET /current returns current period usage', async () => {
    const res = await request('GET', '/api/usage/current', undefined, token);
    expect(res.status).toBe(200);
    expect(res.body.usage.messagesUsed).toBe(42);
    expect(res.body.usage.tokensUsed).toBe(1500);
  });

  it('GET / lists usage history', async () => {
    const res = await request('GET', '/api/usage', undefined, token);
    expect(res.status).toBe(200);
    expect(res.body.records.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────
// KNOWLEDGE BASES
// ─────────────────────────────────────────
describe('Knowledge Bases', () => {
  let token: string;
  let kbId: string;

  beforeAll(async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'test@example.com', password: 'newpassword123',
    });
    token = res.body.token;
  });

  it('POST / creates knowledge base', async () => {
    const res = await request('POST', '/api/knowledge-bases', { name: 'Product Docs', description: 'Product documentation' }, token);
    expect(res.status).toBe(201);
    expect(res.body.knowledgeBase.name).toBe('Product Docs');
    kbId = res.body.knowledgeBase.id;
  });

  it('GET / lists knowledge bases', async () => {
    const res = await request('GET', '/api/knowledge-bases', undefined, token);
    expect(res.status).toBe(200);
    expect(res.body.knowledgeBases.length).toBeGreaterThan(0);
  });

  it('GET /:id returns knowledge base', async () => {
    const res = await request('GET', `/api/knowledge-bases/${kbId}`, undefined, token);
    expect(res.status).toBe(200);
    expect(res.body.knowledgeBase.id).toBe(kbId);
  });

  it('POST /:id/documents adds document', async () => {
    const res = await request('POST', `/api/knowledge-bases/${kbId}/documents`, {
      filename: 'guide.pdf', sourceType: 'pdf',
    }, token);
    expect(res.status).toBe(201);
    expect(res.body.document.filename).toBe('guide.pdf');
  });

  it('GET /:id/documents lists documents', async () => {
    const res = await request('GET', `/api/knowledge-bases/${kbId}/documents`, undefined, token);
    expect(res.status).toBe(200);
    expect(res.body.documents.length).toBe(1);
  });

  it('DELETE /:id deletes knowledge base', async () => {
    const res = await request('DELETE', `/api/knowledge-bases/${kbId}`, undefined, token);
    expect(res.status).toBe(200);
  });
});
