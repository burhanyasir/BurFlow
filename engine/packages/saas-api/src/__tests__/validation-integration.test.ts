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
import { createKnowledgeRoutes, KnowledgeRouteDeps } from '../routes/knowledge';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';

const TEST_DB = join(__dirname, '__test_validation__.db');
const JWT_SECRET = 'test-secret-for-validation';

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
  const knowledgeDeps: KnowledgeRouteDeps = { db };
  a.use('/api/knowledge', auth, createKnowledgeRoutes(knowledgeDeps));
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
  db?.close();
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
});

let userToken: string;
let tenantId: string;

beforeAll(async () => {
  const signupRes = await request('POST', '/api/auth/signup', {
    email: 'validation@example.com', password: 'Test1234!@', name: 'Validator',
  });
  userToken = signupRes.body.token;
  tenantId = signupRes.body.tenant.id;
});

// ─── M-13: Email Format Validation ────────────────────────────
describe('M-13: Email format validation', () => {
  it('signup rejects invalid email format', async () => {
    const res = await request('POST', '/api/auth/signup', {
      email: 'not-an-email', password: 'Test1234!@', name: 'Test',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'email' })]),
    );
  });

  it('signup rejects email without @', async () => {
    const res = await request('POST', '/api/auth/signup', {
      email: 'userexample.com', password: 'Test1234!@', name: 'Test',
    });
    expect(res.status).toBe(400);
  });

  it('login rejects invalid email format', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'bad-email', password: 'test',
    });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'email' })]),
    );
  });
});

// ─── M-15: API Key Role Validation ────────────────────────────
describe('M-15: API key role validation', () => {
  it('rejects invalid role', async () => {
    const res = await request('POST', '/api/api-keys', {
      label: 'test-key', role: 'superadmin',
    }, userToken);
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'role' })]),
    );
  });

  it('accepts valid role', async () => {
    const res = await request('POST', '/api/api-keys', {
      label: 'test-valid-role', role: 'operator',
    }, userToken);
    expect(res.status).toBe(201);
  });

  it('defaults to end-user when role omitted', async () => {
    const res = await request('POST', '/api/api-keys', {
      label: 'test-default-role',
    }, userToken);
    expect(res.status).toBe(201);
    expect(res.body.apiKey.role).toBe('end-user');
  });
});

// ─── M-16: Name/String Length Bounds ──────────────────────────
describe('M-16: Name/string length bounds', () => {
  it('signup rejects name exceeding 100 chars', async () => {
    const res = await request('POST', '/api/auth/signup', {
      email: 'longname@example.com', password: 'Test1234!@', name: 'A'.repeat(101),
    });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'name' })]),
    );
  });

  it('tenant create rejects name exceeding 100 chars', async () => {
    const res = await request('POST', '/api/tenants', {
      name: 'A'.repeat(101),
    }, userToken);
    expect(res.status).toBe(400);
  });

  it('api key create rejects label exceeding 100 chars', async () => {
    const res = await request('POST', '/api/api-keys', {
      label: 'A'.repeat(101),
    }, userToken);
    expect(res.status).toBe(400);
  });

  it('password rejects exceeding 128 chars', async () => {
    const res = await request('POST', '/api/auth/signup', {
      email: 'longpw@example.com', password: 'A'.repeat(129), name: 'Test',
    });
    expect(res.status).toBe(400);
  });

  it('accepts name at exactly 100 chars', async () => {
    const res = await request('POST', '/api/tenants', {
      name: 'B'.repeat(100),
    }, userToken);
    expect(res.status).toBe(201);
  });
});

// ─── M-17: UUID Path Parameter Validation ─────────────────────
describe('M-17: UUID path parameter validation', () => {
  it('rejects non-UUID tenant id', async () => {
    const res = await request('GET', '/api/tenants/not-a-uuid', undefined, userToken);
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'id' })]),
    );
  });

  it('rejects non-UUID api key id', async () => {
    const res = await request('DELETE', '/api/api-keys/not-a-uuid', undefined, userToken);
    expect(res.status).toBe(400);
  });

  it('rejects non-UUID conversation id', async () => {
    const res = await request('GET', '/api/conversations/not-a-uuid', undefined, userToken);
    expect(res.status).toBe(400);
  });

  it('rejects non-UUID knowledge base id', async () => {
    const res = await request('GET', '/api/knowledge-bases/not-a-uuid', undefined, userToken);
    expect(res.status).toBe(400);
  });

  it('accepts valid UUID', async () => {
    const res = await request('GET', '/api/tenants/550e8400-e29b-41d4-a716-446655440000', undefined, userToken);
    expect(res.status).toBe(404);
  });
});

// ─── M-18: Pagination Bounds ──────────────────────────────────
describe('M-18: Pagination bounds', () => {
  it('handles negative page gracefully', async () => {
    const res = await request('GET', '/api/conversations?page=-5&limit=10', undefined, userToken);
    expect(res.status).toBe(200);
  });

  it('clamps limit above max to 200', async () => {
    const res = await request('GET', '/api/conversations?limit=999', undefined, userToken);
    expect(res.status).toBe(200);
  });

  it('handles non-numeric page/limit gracefully', async () => {
    const res = await request('GET', '/api/conversations?page=abc&limit=xyz', undefined, userToken);
    expect(res.status).toBe(200);
  });

  it('handles usage pagination', async () => {
    const res = await request('GET', '/api/usage?page=0&limit=-1', undefined, userToken);
    expect(res.status).toBe(200);
  });
});

// ─── Body Type Validation ─────────────────────────────────────
describe('Body type validation', () => {
  it('rejects array body on signup', async () => {
    const res = await request('POST', '/api/auth/signup', [1, 2, 3]);
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'body' })]),
    );
  });

  it('rejects array body on login', async () => {
    const res = await request('POST', '/api/auth/login', []);
    expect(res.status).toBe(400);
  });

  it('rejects array body on api-keys', async () => {
    const res = await request('POST', '/api/api-keys', [], userToken);
    expect(res.status).toBe(400);
  });
});

// ─── Required Field Validation ────────────────────────────────
describe('Required field validation', () => {
  it('signup rejects missing email', async () => {
    const res = await request('POST', '/api/auth/signup', {
      password: 'Test1234!@', name: 'Test',
    });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'email' })]),
    );
  });

  it('signup rejects missing name', async () => {
    const res = await request('POST', '/api/auth/signup', {
      email: 'noname@example.com', password: 'Test1234!@',
    });
    expect(res.status).toBe(400);
  });

  it('api key create rejects missing label', async () => {
    const res = await request('POST', '/api/api-keys', {}, userToken);
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'label' })]),
    );
  });

  it('knowledge base create rejects missing name', async () => {
    const res = await request('POST', '/api/knowledge-bases', {
      description: 'no name',
    }, userToken);
    expect(res.status).toBe(400);
  });
});

// ─── Type Validation ──────────────────────────────────────────
describe('Type validation', () => {
  it('PUT /me rejects non-string name', async () => {
    const res = await request('PUT', '/api/auth/me', { name: 12345 }, userToken);
    expect(res.status).toBe(400);
  });

  it('PUT /password rejects non-string passwords', async () => {
    const res = await request('PUT', '/api/auth/password', {
      currentPassword: 123, newPassword: 456,
    }, userToken);
    expect(res.status).toBe(400);
  });

  it('tenant update rejects non-string name', async () => {
    const res = await request('PUT', `/api/tenants/${tenantId}`, {
      name: 123,
    }, userToken);
    expect(res.status).toBe(400);
  });

  it('tenant update rejects non-object settings', async () => {
    const res = await request('PUT', `/api/tenants/${tenantId}`, {
      settings: 'not-object',
    }, userToken);
    expect(res.status).toBe(400);
  });
});

// ─── Knowledge Base Document sourceType Enum ──────────────────
describe('Knowledge base document sourceType enum', () => {
  let kbId: string;

  beforeAll(async () => {
    const kb = await request('POST', '/api/knowledge-bases', {
      name: 'Enum Test KB',
    }, userToken);
    kbId = kb.body.knowledgeBase.id;
  });

  it('rejects invalid sourceType', async () => {
    const res = await request('POST', `/api/knowledge-bases/${kbId}/documents`, {
      filename: 'test.pdf', sourceType: 'invalid',
    }, userToken);
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'sourceType' })]),
    );
  });

  it('accepts valid sourceType', async () => {
    const res = await request('POST', `/api/knowledge-bases/${kbId}/documents`, {
      filename: 'test.pdf', sourceType: 'pdf',
    }, userToken);
    expect(res.status).toBe(201);
  });
});

// ─── Error Response Format ────────────────────────────────────
describe('Consistent error response format', () => {
  it('returns { error, details } format', async () => {
    const res = await request('POST', '/api/auth/signup', {});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation failed');
    expect(res.body).toHaveProperty('details');
    expect(Array.isArray(res.body.details)).toBe(true);
    for (const detail of res.body.details) {
      expect(detail).toHaveProperty('field');
      expect(detail).toHaveProperty('message');
    }
  });
});

// ─── Knowledge Pipeline Input Validation ──────────────────────
describe('Knowledge pipeline input validation', () => {
  it('upload rejects non-string filename', async () => {
    const res = await request('POST', '/api/knowledge/upload', {
      filename: 123, sourceType: 'text', content: 'hello',
    }, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('filename must be a string');
  });

  it('upload rejects non-string sourceType', async () => {
    const res = await request('POST', '/api/knowledge/upload', {
      filename: 'test.txt', sourceType: 123, content: 'hello',
    }, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('sourceType must be a string');
  });
});
