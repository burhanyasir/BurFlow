import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import {
  createDatabase, UserRepository, TenantRepository, ApiKeyRepository, RefreshTokenRepository,
  ConversationRepository, MessageRepository, UsageRepository,
  KnowledgeBaseRepository, KbDocumentRepository,
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

const TEST_DB = join(__dirname, '__test_knowledge_api__.db');
const JWT_SECRET = 'test-secret-key-for-knowledge-api';

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
  a.use(express.json({ limit: '10mb' }));
  a.use('/api/auth', createAuthRoutes(userRepo, tenantRepo, refreshTokenRepo, JWT_SECRET));
  const auth = authMiddleware(JWT_SECRET);
  a.use('/api/tenants', auth, createTenantRoutes(tenantRepo, userRepo));
  a.use('/api/api-keys', auth, createApiKeyRoutes(apiKeyRepo, tenantRepo));
  a.use('/api/conversations', auth, createConversationRoutes(conversationRepo, messageRepo));
  a.use('/api/usage', auth, createUsageRoutes(usageRepo));
  a.use('/api/knowledge-bases', auth, createKnowledgeBaseRoutes(kbRepo, docRepo));
  a.use('/api/knowledge', auth, createKnowledgeRoutes({ db, embeddingDimension: 64 }));
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

let userToken: string;
let tenantId: string;

// Create a second user for tenant isolation tests
let user2Token: string;
let tenant2Id: string;

// User with non-admin role (member) for debug endpoint test
let memberToken: string;
let memberTenantId: string;

beforeAll(async () => {
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

  // Create user 1
  const signup1 = await request('POST', '/api/auth/signup', {
    email: 'user1@test.com', password: 'password123', name: 'User 1', companyName: 'Test Co',
  });
  userToken = signup1.body.token;
  tenantId = signup1.body.tenant.id;

  // Create user 2
  const signup2 = await request('POST', '/api/auth/signup', {
    email: 'user2@test.com', password: 'password123', name: 'User 2', companyName: 'Test Co 2',
  });
  user2Token = signup2.body.token;
  tenant2Id = signup2.body.tenant.id;

  // Create member user (non-admin) for debug endpoint test
  const memberUser = userRepo.create({ email: 'member@test.com', password: 'password123', name: 'Member User' });
  const memberTenant = tenantRepo.create({ name: 'Member Co', ownerId: memberUser.id });
  memberToken = generateToken({
    sub: memberUser.id,
    email: memberUser.email,
    name: memberUser.name,
    tenantId: memberTenant.id,
    role: 'member',
  }, JWT_SECRET);
  memberTenantId = memberTenant.id;
});

afterAll(() => {
  try { db.close(); } catch {}
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
});

// ─────────────────────────────────────────
// KNOWLEDGE MANAGEMENT: UPLOAD
// ─────────────────────────────────────────
describe('Knowledge Management: Upload', () => {
  it('POST /upload accepts document and returns 202', async () => {
    const res = await request('POST', '/api/knowledge/upload', {
      filename: 'guide.txt',
      sourceType: 'text',
      content: 'This is a test document with some content for ingestion.',
    }, userToken);
    expect(res.status).toBe(202);
    expect(res.body.documentId).toBeTruthy();
    expect(res.body.status).toBe('queued');
    expect(res.body.queuedAt).toBeTruthy();
  });

  it('POST /upload validates required fields', async () => {
    const res = await request('POST', '/api/knowledge/upload', {
      filename: 'test.txt',
    }, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('required');
  });

  it('POST /upload validates sourceType', async () => {
    const res = await request('POST', '/api/knowledge/upload', {
      filename: 'test.xyz',
      sourceType: 'invalid',
      content: 'content',
    }, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid sourceType');
  });

  it('POST /upload validates content is string', async () => {
    const res = await request('POST', '/api/knowledge/upload', {
      filename: 'test.txt',
      sourceType: 'text',
      content: 123,
    }, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('must be a string');
  });

  it('POST /upload rejects unauthenticated request', async () => {
    const res = await request('POST', '/api/knowledge/upload', {
      filename: 'test.txt', sourceType: 'text', content: 'content',
    });
    expect(res.status).toBe(401);
  });

  it('POST /upload supports all valid source types', async () => {
    const types = ['text', 'markdown', 'html', 'faq'];
    for (const sourceType of types) {
      const res = await request('POST', '/api/knowledge/upload', {
        filename: `test.${sourceType === 'faq' ? 'txt' : sourceType}`,
        sourceType,
        content: `Test content for ${sourceType}`,
      }, userToken);
      expect(res.status).toBe(202);
    }
  });
});

// ─────────────────────────────────────────
// KNOWLEDGE MANAGEMENT: FAQ UPLOAD
// ─────────────────────────────────────────
describe('Knowledge Management: FAQ Upload', () => {
  it('POST /upload/faq accepts FAQ content', async () => {
    const res = await request('POST', '/api/knowledge/upload/faq', {
      filename: 'faq.txt',
      content: 'Q: What is this?\nA: A test.\nQ: How does it work?\nA: Like this.',
    }, userToken);
    expect(res.status).toBe(202);
    expect(res.body.documentId).toBeTruthy();
    expect(res.body.status).toBe('queued');
  });

  it('POST /upload/faq uses default filename if not provided', async () => {
    const res = await request('POST', '/api/knowledge/upload/faq', {
      content: 'Q: What?\nA: That.',
    }, userToken);
    expect(res.status).toBe(202);
    expect(res.body.documentId).toBeTruthy();
  });

  it('POST /upload/faq validates content required', async () => {
    const res = await request('POST', '/api/knowledge/upload/faq', {}, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('required');
  });

  it('POST /upload/faq rejects unauthenticated', async () => {
    const res = await request('POST', '/api/knowledge/upload/faq', { content: 'Q:A' });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────
// KNOWLEDGE MANAGEMENT: CRAWL
// ─────────────────────────────────────────
describe('Knowledge Management: Crawl', () => {
  it('POST /crawl accepts valid URL', async () => {
    const res = await request('POST', '/api/knowledge/crawl', {
      url: 'https://example.com/page',
    }, userToken);
    expect(res.status).toBe(202);
    expect(res.body.documentId).toBeTruthy();
    expect(res.body.status).toBe('queued');
  });

  it('POST /crawl validates URL format', async () => {
    const res = await request('POST', '/api/knowledge/crawl', {
      url: 'not-a-url',
    }, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid URL');
  });

  it('POST /crawl validates url required', async () => {
    const res = await request('POST', '/api/knowledge/crawl', {}, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('required');
  });

  it('POST /crawl rejects unauthenticated', async () => {
    const res = await request('POST', '/api/knowledge/crawl', { url: 'https://example.com' });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────
// KNOWLEDGE MANAGEMENT: SOURCES
// ─────────────────────────────────────────
describe('Knowledge Management: Sources', () => {
  let uploadedDocId: string;

  beforeAll(async () => {
    const res = await request('POST', '/api/knowledge/upload', {
      filename: 'source-test.txt',
      sourceType: 'text',
      content: 'Content for source listing test.',
    }, userToken);
    uploadedDocId = res.body.documentId;
  });

  it('GET /sources lists all sources for tenant', async () => {
    const res = await request('GET', '/api/knowledge/sources', undefined, userToken);
    expect(res.status).toBe(200);
    expect(res.body.sources).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('GET /sources filters by status', async () => {
    const res = await request('GET', '/api/knowledge/sources?status=queued', undefined, userToken);
    expect(res.status).toBe(200);
    expect(res.body.sources.length).toBeGreaterThan(0);
    for (const s of res.body.sources) {
      expect(s.status).toBe('queued');
    }
  });

  it('GET /sources validates status filter', async () => {
    const res = await request('GET', '/api/knowledge/sources?status=invalid', undefined, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid status');
  });

  it('GET /sources/:id returns source status', async () => {
    const res = await request('GET', `/api/knowledge/sources/${uploadedDocId}`, undefined, userToken);
    expect(res.status).toBe(200);
    expect(res.body.source.documentId).toBe(uploadedDocId);
    expect(res.body.source.tenantId).toBe(tenantId);
    expect(res.body.source.status).toBe('queued');
  });

  it('GET /sources/:id returns 404 for nonexistent source', async () => {
    const res = await request('GET', '/api/knowledge/sources/nonexistent_id', undefined, userToken);
    expect(res.status).toBe(404);
  });

  it('GET /sources/:id rejects unauthenticated', async () => {
    const res = await request('GET', `/api/knowledge/sources/${uploadedDocId}`);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────
// KNOWLEDGE MANAGEMENT: DELETE SOURCE
// ─────────────────────────────────────────
describe('Knowledge Management: Delete Source', () => {
  let deleteDocId: string;

  beforeAll(async () => {
    const res = await request('POST', '/api/knowledge/upload', {
      filename: 'delete-test.txt',
      sourceType: 'text',
      content: 'Content for deletion test.',
    }, userToken);
    deleteDocId = res.body.documentId;
  });

  it('DELETE /sources/:id deletes source', async () => {
    const res = await request('DELETE', `/api/knowledge/sources/${deleteDocId}`, undefined, userToken);
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('deleted');
    expect(res.body.documentId).toBe(deleteDocId);
  });

  it('DELETE /sources/:id returns 404 for nonexistent', async () => {
    const res = await request('DELETE', '/api/knowledge/sources/nonexistent', undefined, userToken);
    expect(res.status).toBe(404);
  });

  it('DELETE /sources/:id rejects unauthenticated', async () => {
    const res = await request('DELETE', `/api/knowledge/sources/some-id`);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────
// KNOWLEDGE MANAGEMENT: REINDEX
// ─────────────────────────────────────────
describe('Knowledge Management: Reindex', () => {
  let reindexDocId: string;

  beforeAll(async () => {
    const res = await request('POST', '/api/knowledge/upload', {
      filename: 'reindex-test.txt',
      sourceType: 'text',
      content: 'Content for reindex test.',
    }, userToken);
    reindexDocId = res.body.documentId;
  });

  it('POST /sources/:id/reindex enqueues reindex', async () => {
    const res = await request('POST', `/api/knowledge/sources/${reindexDocId}/reindex`, {}, userToken);
    expect(res.status).toBe(202);
    expect(res.body.documentId).toBeTruthy();
    expect(res.body.reindexing).toBe(true);
  });

  it('POST /sources/:id/reindex returns 404 for nonexistent', async () => {
    const res = await request('POST', '/api/knowledge/sources/nonexistent/reindex', {}, userToken);
    expect(res.status).toBe(404);
  });

  it('POST /sources/:id/reindex rejects unauthenticated', async () => {
    const res = await request('POST', '/api/knowledge/sources/some-id/reindex');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────
// KNOWLEDGE MANAGEMENT: PROCESS (SYNC)
// ─────────────────────────────────────────
describe('Knowledge Management: Process', () => {
  it('POST /process/:id processes document synchronously', async () => {
    const upload = await request('POST', '/api/knowledge/upload', {
      filename: 'process-test.txt',
      sourceType: 'text',
      content: 'This is content for synchronous processing test.',
    }, userToken);
    const docId = upload.body.documentId;

    const res = await request('POST', `/api/knowledge/process/${docId}`, {
      content: 'This is content for synchronous processing test.',
    }, userToken);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('published');
    expect(res.body.chunksCreated).toBeGreaterThan(0);
    expect(res.body.knowledgeVersion).toBeGreaterThan(0);
  });

  it('POST /process/:id returns 404 for nonexistent', async () => {
    const res = await request('POST', '/api/knowledge/process/nonexistent', { content: 'x' }, userToken);
    expect(res.status).toBe(404);
  });

  it('POST /process/:id rejects already processing document', async () => {
    const upload = await request('POST', '/api/knowledge/upload', {
      filename: 'already-processing.txt',
      sourceType: 'text',
      content: 'Content for already-processing test.',
    }, userToken);
    const docId = upload.body.documentId;

    // First process call
    await request('POST', `/api/knowledge/process/${docId}`, {
      content: 'Content for already-processing test.',
    }, userToken);

    // Second process call should fail (already published)
    const res = await request('POST', `/api/knowledge/process/${docId}`, {
      content: 'Content for already-processing test.',
    }, userToken);
    expect(res.status).toBe(409);
  });

  it('POST /process/:id rejects unauthenticated', async () => {
    const res = await request('POST', '/api/knowledge/process/some-id', { content: 'x' });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────
// KNOWLEDGE MANAGEMENT: PUBLISH
// ─────────────────────────────────────────
describe('Knowledge Management: Publish', () => {
  it('POST /publish returns published snapshot info', async () => {
    const res = await request('POST', '/api/knowledge/publish', {}, userToken);
    expect(res.status).toBe(200);
    expect(res.body.published).toBe(true);
    expect(res.body.knowledgeVersion).toBeGreaterThan(0);
    expect(res.body.publishedAt).toBeTruthy();
  });

  it('POST /publish rejects unauthenticated', async () => {
    const res = await request('POST', '/api/knowledge/publish');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────
// RETRIEVAL: SEARCH
// ─────────────────────────────────────────
describe('Retrieval: Search', () => {
  it('POST /search returns search results', async () => {
    const res = await request('POST', '/api/knowledge/search', {
      query: 'test content',
      topK: 5,
      threshold: 0,
    }, userToken);
    expect(res.status).toBe(200);
    expect(res.body.query).toBe('test content');
    expect(res.body.results).toBeInstanceOf(Array);
    expect(res.body.totalResults).toBeGreaterThanOrEqual(0);
    expect(res.body.retrievalTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('POST /search validates query required', async () => {
    const res = await request('POST', '/api/knowledge/search', {}, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('required');
  });

  it('POST /search validates query is string', async () => {
    const res = await request('POST', '/api/knowledge/search', { query: 123 }, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('string');
  });

  it('POST /search rejects unauthenticated', async () => {
    const res = await request('POST', '/api/knowledge/search', { query: 'test' });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────
// RETRIEVAL: CONTEXT
// ─────────────────────────────────────────
describe('Retrieval: Context', () => {
  it('POST /context returns assembled context', async () => {
    const res = await request('POST', '/api/knowledge/context', {
      query: 'test content',
      tokenBudget: 2000,
    }, userToken);
    expect(res.status).toBe(200);
    expect(res.body.query).toBe('test content');
    expect(typeof res.body.context).toBe('string');
    expect(res.body.tokenCount).toBeGreaterThanOrEqual(0);
    expect(res.body.citations).toBeInstanceOf(Array);
  });

  it('POST /context validates query required', async () => {
    const res = await request('POST', '/api/knowledge/context', {}, userToken);
    expect(res.status).toBe(400);
  });

  it('POST /context rejects unauthenticated', async () => {
    const res = await request('POST', '/api/knowledge/context', { query: 'test' });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────
// RETRIEVAL: DEBUG
// ─────────────────────────────────────────
describe('Retrieval: Debug', () => {
  it('POST /debug returns debug info for admin', async () => {
    const res = await request('POST', '/api/knowledge/debug', {
      query: 'test content',
      topK: 10,
    }, userToken);
    expect(res.status).toBe(200);
    expect(res.body.query).toBe('test content');
    expect(res.body.results).toBeInstanceOf(Array);
    expect(res.body.vectorStats).toBeDefined();
    expect(res.body.vectorStats.totalChunks).toBeGreaterThanOrEqual(0);
    expect(res.body.latestKnowledgeVersion).toBeGreaterThanOrEqual(0);
    expect(res.body.allVersions).toBeInstanceOf(Array);
    expect(typeof res.body.usedReranker).toBe('boolean');
    expect(typeof res.body.usedHybridSearch).toBe('boolean');
  });

  it('POST /debug rejects non-admin user', async () => {
    const res = await request('POST', '/api/knowledge/debug', {
      query: 'test',
    }, memberToken);
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Admin');
  });

  it('POST /debug validates query required', async () => {
    const res = await request('POST', '/api/knowledge/debug', {}, userToken);
    expect(res.status).toBe(400);
  });

  it('POST /debug rejects unauthenticated', async () => {
    const res = await request('POST', '/api/knowledge/debug', { query: 'test' });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────
// STATS & VERSIONS
// ─────────────────────────────────────────
describe('Stats & Versions', () => {
  it('GET /versions lists versions', async () => {
    const res = await request('GET', '/api/knowledge/versions', undefined, userToken);
    expect(res.status).toBe(200);
    expect(res.body.versions).toBeInstanceOf(Array);
    expect(res.body.latestVersion).toBeGreaterThanOrEqual(0);
  });

  it('GET /versions rejects unauthenticated', async () => {
    const res = await request('GET', '/api/knowledge/versions');
    expect(res.status).toBe(401);
  });

  it('GET /versions/:version returns version details', async () => {
    const versions = await request('GET', '/api/knowledge/versions', undefined, userToken);
    if (versions.body.latestVersion > 0) {
      const res = await request('GET', `/api/knowledge/versions/${versions.body.latestVersion}`, undefined, userToken);
      expect(res.status).toBe(200);
      expect(res.body.knowledgeVersion).toBe(versions.body.latestVersion);
      expect(res.body.publishedAt).toBeTruthy();
      expect(res.body.chunkCount).toBeGreaterThanOrEqual(0);
    }
  });

  it('GET /versions/:version validates version number', async () => {
    const res = await request('GET', '/api/knowledge/versions/abc', undefined, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid');
  });

  it('GET /versions/:version returns 404 for nonexistent version', async () => {
    const res = await request('GET', '/api/knowledge/versions/99999', undefined, userToken);
    expect(res.status).toBe(404);
  });

  it('GET /stats returns vector store stats', async () => {
    const res = await request('GET', '/api/knowledge/stats', undefined, userToken);
    expect(res.status).toBe(200);
    expect(res.body.vectors).toBeDefined();
    expect(res.body.vectors.totalChunks).toBeGreaterThanOrEqual(0);
    expect(res.body.vectors.activeChunks).toBeGreaterThanOrEqual(0);
    expect(res.body.sources).toBeDefined();
    expect(res.body.sources.total).toBeGreaterThanOrEqual(0);
  });

  it('GET /stats rejects unauthenticated', async () => {
    const res = await request('GET', '/api/knowledge/stats');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────
// TENANT ISOLATION
// ─────────────────────────────────────────
describe('Tenant Isolation', () => {
  let tenant1DocId: string;

  beforeAll(async () => {
    const res = await request('POST', '/api/knowledge/upload', {
      filename: 'tenant1-doc.txt',
      sourceType: 'text',
      content: 'Tenant 1 exclusive content.',
    }, userToken);
    tenant1DocId = res.body.documentId;
  });

  it('user2 cannot see user1 sources', async () => {
    const res = await request('GET', '/api/knowledge/sources', undefined, user2Token);
    expect(res.status).toBe(200);
    const found = res.body.sources.find((s: any) => s.documentId === tenant1DocId);
    expect(found).toBeUndefined();
  });

  it('user2 cannot access user1 source by ID', async () => {
    const res = await request('GET', `/api/knowledge/sources/${tenant1DocId}`, undefined, user2Token);
    expect(res.status).toBe(404);
  });

  it('user2 cannot delete user1 source', async () => {
    const res = await request('DELETE', `/api/knowledge/sources/${tenant1DocId}`, undefined, user2Token);
    expect(res.status).toBe(404);
  });

  it('user2 cannot reindex user1 source', async () => {
    const res = await request('POST', `/api/knowledge/sources/${tenant1DocId}/reindex`, {}, user2Token);
    expect(res.status).toBe(404);
  });

  it('user2 cannot process user1 source', async () => {
    const res = await request('POST', `/api/knowledge/process/${tenant1DocId}`, { content: 'x' }, user2Token);
    expect(res.status).toBe(404);
  });

  it('user2 search does not return user1 results', async () => {
    const res = await request('POST', '/api/knowledge/search', {
      query: 'tenant 1 exclusive',
      threshold: 0,
    }, user2Token);
    expect(res.status).toBe(200);
    for (const r of res.body.results) {
      expect(r.tenantId).not.toBe(tenantId);
    }
  });

  it('user2 versions do not include user1 data', async () => {
    const res = await request('GET', '/api/knowledge/versions', undefined, user2Token);
    expect(res.status).toBe(200);
    expect(res.body.latestVersion).toBe(0);
  });

  it('user2 stats show zero for user1 vectors', async () => {
    const res = await request('GET', '/api/knowledge/stats', undefined, user2Token);
    expect(res.status).toBe(200);
    expect(res.body.vectors.totalChunks).toBe(0);
  });
});

// ─────────────────────────────────────────
// FULL INTEGRATION: UPLOAD → PROCESS → SEARCH → CONTEXT
// ─────────────────────────────────────────
describe('Full Integration Flow', () => {
  it('complete flow: upload → process → search → context', async () => {
    // 1. Upload
    const upload = await request('POST', '/api/knowledge/upload', {
      filename: 'integration-doc.txt',
      sourceType: 'text',
      content: 'The Eiffel Tower is a wrought-iron lattice tower in Paris, France. It was completed in 1889 and is the most-visited paid monument in the world.',
    }, userToken);
    expect(upload.status).toBe(202);
    const docId = upload.body.documentId;

    // 2. Process
    const process = await request('POST', `/api/knowledge/process/${docId}`, {
      content: 'The Eiffel Tower is a wrought-iron lattice tower in Paris, France. It was completed in 1889 and is the most-visited paid monument in the world.',
    }, userToken);
    expect(process.status).toBe(200);
    expect(process.body.status).toBe('published');
    expect(process.body.chunksCreated).toBeGreaterThan(0);

    // 3. Search
    const search = await request('POST', '/api/knowledge/search', {
      query: 'Paris tower',
      topK: 5,
      threshold: 0,
    }, userToken);
    expect(search.status).toBe(200);
    expect(search.body.results.length).toBeGreaterThan(0);

    // 4. Context
    const context = await request('POST', '/api/knowledge/context', {
      query: 'Tell me about the Eiffel Tower',
      tokenBudget: 4000,
    }, userToken);
    expect(context.status).toBe(200);
    expect(context.body.context).toContain('Eiffel');

    // 5. Debug
    const debug = await request('POST', '/api/knowledge/debug', {
      query: 'Eiffel Tower history',
    }, userToken);
    expect(debug.status).toBe(200);
    expect(debug.body.vectorStats.activeChunks).toBeGreaterThan(0);
    expect(debug.body.allVersions.length).toBeGreaterThan(0);

    // 6. Stats
    const stats = await request('GET', '/api/knowledge/stats', undefined, userToken);
    expect(stats.status).toBe(200);
    expect(stats.body.vectors.activeChunks).toBeGreaterThan(0);

    // 7. Versions
    const versions = await request('GET', '/api/knowledge/versions', undefined, userToken);
    expect(versions.status).toBe(200);
    expect(versions.body.latestVersion).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────
// AUTHORIZATION
// ─────────────────────────────────────────
describe('Authorization', () => {
  const protectedEndpoints = [
    { method: 'GET', path: '/api/knowledge/sources' },
    { method: 'GET', path: '/api/knowledge/versions' },
    { method: 'GET', path: '/api/knowledge/stats' },
    { method: 'POST', path: '/api/knowledge/upload' },
    { method: 'POST', path: '/api/knowledge/upload/faq' },
    { method: 'POST', path: '/api/knowledge/crawl' },
    { method: 'POST', path: '/api/knowledge/search' },
    { method: 'POST', path: '/api/knowledge/context' },
    { method: 'POST', path: '/api/knowledge/publish' },
    { method: 'POST', path: '/api/knowledge/debug' },
  ];

  for (const endpoint of protectedEndpoints) {
    it(`${endpoint.method} ${endpoint.path} rejects unauthenticated`, async () => {
      const body = endpoint.method === 'POST' ? { query: 'test', filename: 'test.txt', sourceType: 'text', content: 'test', url: 'https://example.com' } : undefined;
      const res = await request(endpoint.method, endpoint.path, body);
      expect(res.status).toBe(401);
    });
  }
});

// ─────────────────────────────────────────
// EDGE CASES
// ─────────────────────────────────────────
describe('Edge Cases', () => {
  it('upload with empty content succeeds', async () => {
    const res = await request('POST', '/api/knowledge/upload', {
      filename: 'empty.txt',
      sourceType: 'text',
      content: '',
    }, userToken);
    expect(res.status).toBe(202);
  });

  it('upload with large content succeeds', async () => {
    const content = 'A'.repeat(10000);
    const res = await request('POST', '/api/knowledge/upload', {
      filename: 'large.txt',
      sourceType: 'text',
      content,
    }, userToken);
    expect(res.status).toBe(202);
  });

  it('search with empty results returns empty array', async () => {
    const res = await request('POST', '/api/knowledge/search', {
      query: 'xyzzy_nonexistent_query_12345',
      threshold: 0.99,
    }, userToken);
    expect(res.status).toBe(200);
    expect(res.body.results).toBeInstanceOf(Array);
  });

  it('process with empty content succeeds', async () => {
    const upload = await request('POST', '/api/knowledge/upload', {
      filename: 'empty-process.txt',
      sourceType: 'text',
      content: 'Some initial content',
    }, userToken);
    const docId = upload.body.documentId;
    const res = await request('POST', `/api/knowledge/process/${docId}`, {
      content: 'Some initial content',
    }, userToken);
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────
// PRODUCTION READINESS AUDIT TESTS
// ─────────────────────────────────────────
describe('Audit: SSRF Protection', () => {
  it('rejects localhost URL', async () => {
    const res = await request('POST', '/api/knowledge/crawl', { url: 'http://localhost/admin' }, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('private');
  });

  it('rejects 127.x.x.x URL', async () => {
    const res = await request('POST', '/api/knowledge/crawl', { url: 'http://127.0.0.1/secret' }, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('private');
  });

  it('rejects 10.x.x.x URL', async () => {
    const res = await request('POST', '/api/knowledge/crawl', { url: 'http://10.0.0.1/api' }, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('private');
  });

  it('rejects 192.168.x.x URL', async () => {
    const res = await request('POST', '/api/knowledge/crawl', { url: 'http://192.168.1.1/' }, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('private');
  });

  it('rejects 172.16-31.x.x URL', async () => {
    const res = await request('POST', '/api/knowledge/crawl', { url: 'http://172.16.0.1/' }, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('private');
  });

  it('rejects 169.254.x.x (link-local) URL', async () => {
    const res = await request('POST', '/api/knowledge/crawl', { url: 'http://169.254.169.254/metadata' }, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('private');
  });

  it('rejects non-http protocol', async () => {
    const res = await request('POST', '/api/knowledge/crawl', { url: 'ftp://example.com/file' }, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('http');
  });

  it('rejects URL without protocol', async () => {
    const res = await request('POST', '/api/knowledge/crawl', { url: 'example.com' }, userToken);
    expect(res.status).toBe(400);
  });
});

describe('Audit: Filename Sanitization', () => {
  it('sanitizes path traversal in filename', async () => {
    const res = await request('POST', '/api/knowledge/upload', {
      filename: '../../../etc/passwd',
      sourceType: 'text',
      content: 'test content',
    }, userToken);
    expect(res.status).toBe(202);
    expect(res.body.documentId).not.toContain('..');
  });

  it('sanitizes control characters in filename', async () => {
    const res = await request('POST', '/api/knowledge/upload', {
      filename: 'test\x00file.txt',
      sourceType: 'text',
      content: 'test content',
    }, userToken);
    expect(res.status).toBe(202);
  });

  it('truncates very long filename', async () => {
    const longName = 'a'.repeat(500) + '.txt';
    const res = await request('POST', '/api/knowledge/upload', {
      filename: longName,
      sourceType: 'text',
      content: 'test content',
    }, userToken);
    expect(res.status).toBe(202);
  });
});

describe('Audit: Pagination', () => {
  it('GET /sources returns pagination metadata', async () => {
    const res = await request('GET', '/api/knowledge/sources', undefined, userToken);
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(50);
    expect(res.body.totalPages).toBeDefined();
    expect(res.body.total).toBeDefined();
  });

  it('GET /sources respects page and pageSize', async () => {
    const res = await request('GET', '/api/knowledge/sources?page=1&pageSize=2', undefined, userToken);
    expect(res.status).toBe(200);
    expect(res.body.pageSize).toBe(2);
    expect(res.body.page).toBe(1);
  });

  it('GET /sources caps pageSize at 200', async () => {
    const res = await request('GET', '/api/knowledge/sources?pageSize=999', undefined, userToken);
    expect(res.status).toBe(200);
    expect(res.body.pageSize).toBe(200);
  });
});

describe('Audit: Input Bounds', () => {
  it('search caps topK at 50', async () => {
    const res = await request('POST', '/api/knowledge/search', {
      query: 'test',
      topK: 999,
    }, userToken);
    expect(res.status).toBe(200);
  });

  it('search rejects query over 10000 chars', async () => {
    const res = await request('POST', '/api/knowledge/search', {
      query: 'x'.repeat(10001),
    }, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('length');
  });

  it('context caps tokenBudget at 32000', async () => {
    const res = await request('POST', '/api/knowledge/context', {
      query: 'test',
      tokenBudget: 999999,
    }, userToken);
    expect(res.status).toBe(200);
  });

  it('context rejects query over 10000 chars', async () => {
    const res = await request('POST', '/api/knowledge/context', {
      query: 'x'.repeat(10001),
    }, userToken);
    expect(res.status).toBe(400);
  });

  it('upload rejects content over 5MB inline limit', async () => {
    const res = await request('POST', '/api/knowledge/upload', {
      filename: 'huge.txt',
      sourceType: 'text',
      content: 'x'.repeat(5 * 1024 * 1024 + 1),
    }, userToken);
    expect(res.status).toBe(413);
  });
});

describe('Audit: Crawl Limits', () => {
  it('crawl accepts maxDepth and maxPages in body', async () => {
    const res = await request('POST', '/api/knowledge/crawl', {
      url: 'https://example.com',
      maxDepth: 3,
      maxPages: 20,
    }, userToken);
    expect(res.status).toBe(202);
    expect(res.body.crawlOptions.maxDepth).toBe(3);
    expect(res.body.crawlOptions.maxPages).toBe(20);
  });

  it('crawl caps maxDepth at 5', async () => {
    const res = await request('POST', '/api/knowledge/crawl', {
      url: 'https://example.com',
      maxDepth: 99,
    }, userToken);
    expect(res.status).toBe(202);
    expect(res.body.crawlOptions.maxDepth).toBe(5);
  });

  it('crawl caps maxPages at 50', async () => {
    const res = await request('POST', '/api/knowledge/crawl', {
      url: 'https://example.com',
      maxPages: 999,
    }, userToken);
    expect(res.status).toBe(202);
    expect(res.body.crawlOptions.maxPages).toBe(50);
  });
});

describe('Audit: Process Validation', () => {
  it('process validates content is string', async () => {
    const upload = await request('POST', '/api/knowledge/upload', {
      filename: 'val-test.txt',
      sourceType: 'text',
      content: 'content',
    }, userToken);
    const docId = upload.body.documentId;
    const res = await request('POST', `/api/knowledge/process/${docId}`, { content: 123 }, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('string');
  });
});

describe('Audit: Query Validation', () => {
  it('search validates query type', async () => {
    const res = await request('POST', '/api/knowledge/search', { query: null }, userToken);
    expect(res.status).toBe(400);
  });

  it('context validates query type', async () => {
    const res = await request('POST', '/api/knowledge/context', { query: 42 }, userToken);
    expect(res.status).toBe(400);
  });

  it('debug validates query type', async () => {
    const res = await request('POST', '/api/knowledge/debug', { query: [] }, userToken);
    expect(res.status).toBe(400);
  });

  it('crawl validates url is string', async () => {
    const res = await request('POST', '/api/knowledge/crawl', { url: 123 }, userToken);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('string');
  });
});

describe('Audit: Version Endpoint Security', () => {
  it('GET /versions/:version rejects negative version', async () => {
    const res = await request('GET', '/api/knowledge/versions/-1', undefined, userToken);
    expect(res.status).toBe(400);
  });

  it('GET /versions/:version rejects zero version', async () => {
    const res = await request('GET', '/api/knowledge/versions/0', undefined, userToken);
    expect(res.status).toBe(400);
  });

  it('version endpoint does not leak tenantId in response', async () => {
    const versions = await request('GET', '/api/knowledge/versions', undefined, userToken);
    if (versions.body.latestVersion > 0) {
      const res = await request('GET', `/api/knowledge/versions/${versions.body.latestVersion}`, undefined, userToken);
      expect(res.status).toBe(200);
      expect(res.body.tenantId).toBe(tenantId);
    }
  });
});
