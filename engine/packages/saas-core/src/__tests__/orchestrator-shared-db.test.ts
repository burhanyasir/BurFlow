import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import {
  PgDatabase, isPostgresDatabase, createPrimaryDatabase, assertSaaSMigrationsApplied,
  UserRepository, TenantRepository,
  WebsiteScanRepository, ScannedPageRepository,
  KnowledgeBaseRepository, KbDocumentRepository, KbChunkRepository,
  ConversationRepository, MessageRepository,
} from '../index';
import type { SqlDatabase } from '../db/types';

const { migrate } = require('../../../../scripts/migrate-core.js');
const REAL_MIGRATION_DIR = join(__dirname, '..', '..', '..', '..', 'migrations');

/** migrate-core adapter over the sync bridge (placeholders rewritten there). */
function makeBridgeAdapter(db: SqlDatabase) {
  return {
    kind: 'bridge' as const,
    async query(sql: string, params: unknown[] = []) {
      const st = db.prepare(sql);
      return { rows: st.all(...params) };
    },
    async exec(sql: string) {
      db.exec(sql);
    },
  };
}

/**
 * P0-5 regression: pipeline-orchestrator used to create its OWN SQLite saas.db
 * (split-brain). With DATABASE_URL configured, BOTH services must resolve to
 * the SAME PostgreSQL primary database — SaaS repos used by each service must
 * see identical tenant/user/knowledge/scan data.
 */
describe('saas-api and pipeline-orchestrator share one primary database (P0-5)', () => {
  let sharedPg: SqlDatabase;
  let dir: string;

  beforeAll(async () => {
    sharedPg = new PgDatabase({ pglite: true });
    await migrate(makeBridgeAdapter(sharedPg), REAL_MIGRATION_DIR);
    dir = mkdtempSync(join(tmpdir(), 'orchestrator-shared-'));
  });

  afterAll(() => {
    sharedPg.close();
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('createPrimaryDatabase routes BOTH services to PostgreSQL when DATABASE_URL is set', () => {
    // The exact option shape each service passes (saas-api and pipeline-orchestrator).
    let apiBackend: SqlDatabase | undefined;
    let orchestratorBackend: SqlDatabase | undefined;
    const sharedFactory = (url: string) => {
      expect(url).toBe('postgresql://user:pass@example.com:5432/burflow');
      return sharedPg;
    };
    // saas-api style call
    apiBackend = createPrimaryDatabase({
      databaseUrl: 'postgresql://user:pass@example.com:5432/burflow',
      sqlitePath: join(dir, 'api.db'),
      nodeEnv: 'production',
      pgFactory: sharedFactory,
    });
    // pipeline-orchestrator style call
    orchestratorBackend = createPrimaryDatabase({
      databaseUrl: 'postgresql://user:pass@example.com:5432/burflow',
      sqlitePath: join(dir, 'saas.db'),
      nodeEnv: 'production',
      pgFactory: sharedFactory,
    });
    expect(apiBackend).toBe(sharedPg);
    expect(orchestratorBackend).toBe(sharedPg);
    expect(isPostgresDatabase(apiBackend)).toBe(true);
    expect(isPostgresDatabase(orchestratorBackend)).toBe(true);
    // No SQLite fallback file may be created while DATABASE_URL is present.
    expect(existsSync(join(dir, 'api.db'))).toBe(false);
    expect(existsSync(join(dir, 'saas.db'))).toBe(false);
  });

  it('does not silently run an unmigrated PostgreSQL database', () => {
    const unmigrated = new PgDatabase({ pglite: true });
    try {
      expect(() => assertSaaSMigrationsApplied(unmigrated)).toThrowError(/db:migrate/);
    } finally {
      unmigrated.close();
    }
  });

  it('saas-api-created user/tenant are visible to the pipeline-orchestrator repos (and vice versa)', () => {
    // Repos exactly as each service constructs them in production.
    // saas-api side:
    const apiUserRepo = new UserRepository(sharedPg);
    const apiTenantRepo = new TenantRepository(sharedPg);
    const apiConversationRepo = new ConversationRepository(sharedPg);
    const apiMessageRepo = new MessageRepository(sharedPg);
    // pipeline-orchestrator side (the split-brain offender):
    const scanRepo = new WebsiteScanRepository(sharedPg);
    const pageRepo = new ScannedPageRepository(sharedPg);
    const kbRepo = new KnowledgeBaseRepository(sharedPg);
    const docRepo = new KbDocumentRepository(sharedPg);
    const chunkRepo = new KbChunkRepository(sharedPg);

    // 1. saas-api writes a user + tenant.
    const user = apiUserRepo.create({ email: 'shared@burflow.test', password: 'pw', name: 'Shared Owner' });
    const tenant = apiTenantRepo.create({ name: 'Shared Tenant', ownerId: user.id });

    // 2. pipeline-orchestrator reads the SAME rows (no separate saas.db).
    const seenUser = apiUserRepo.findByEmail('shared@burflow.test');
    expect(seenUser?.id).toBe(user.id);
    expect(apiTenantRepo.findByOwner(user.id).map((t) => t.id)).toContain(tenant.id);

    // 3. orchestrator writes website-scan/knowledge data for that tenant…
    const scan = scanRepo.create({ tenantId: tenant.id, rootUrl: 'https://burflow.test', crawlMode: 'discover', schedule: 'daily' });
    pageRepo.create({ scanId: scan.id, tenantId: tenant.id, url: 'https://burflow.test/landing', status: 'added', title: 'Landing' });
    const kb = kbRepo.create(tenant.id, 'Shared KB', 'shared');
    const doc = docRepo.create({ knowledgeBaseId: kb.id, tenantId: tenant.id, filename: 'guide.pdf', sourceType: 'pdf' });
    chunkRepo.insertMany(kb.id, tenant.id, doc.id, [{ content: 'chunk one' }, { content: 'chunk two' }]);

    // 4. …and saas-api sees all of it through the SAME primary database.
    expect(scanRepo.findById(scan.id)?.tenantId).toBe(tenant.id);
    expect(pageRepo.listByScan(scan.id).length).toBeGreaterThanOrEqual(1);
    expect(kbRepo.listByTenant(tenant.id).map((k) => k.id)).toContain(kb.id);
    expect(docRepo.listByKnowledgeBase(kb.id).map((d) => d.id)).toContain(doc.id);
    const chunks = sharedPg.prepare('SELECT id FROM kb_chunks WHERE document_id = ?').all(doc.id);
    expect(chunks.length).toBe(2);

    // 5. conversations/messages written via saas-api flow into the same store
    //    the orchestrator's session store coordinates with.
    const conv = apiConversationRepo.create(tenant.id, 'shared-session');
    apiMessageRepo.create({ conversationId: conv.id, tenantId: tenant.id, role: 'user', content: 'hello', sequenceNumber: 1 });
    const { messages: msgs } = apiMessageRepo.listByConversation(conv.id);
    expect(msgs.length).toBe(1);
    expect(msgs[0].content).toBe('hello');

    // 6. cleanup (tenant-scoped; user survives, mirrors Neon cascade semantics).
    apiTenantRepo.delete(tenant.id);
  });
});
