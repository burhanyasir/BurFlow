/**
 * Repository behavior parity: SQLite vs PostgreSQL.
 *
 * Every scenario runs the SAME operation sequence against two databases with
 * the full SaaS schema:
 *   - SQLite: `createDatabase(':memory:')` (the local/test fallback)
 *   - PostgreSQL: PGlite (real Postgres semantics) behind the sync bridge
 *
 * The two backends generate different ids/timestamps, so scenarios return
 * derived, stable shapes (booleans, counts, normalized values) and the tests
 * assert deep equality. This covers every audited SQL compatibility area:
 *
 *   - `?` placeholders → `$n` (implicit in every query below, rewritten by
 *     the bridge before execution)
 *   - INSERT OR IGNORE → ON CONFLICT DO NOTHING  (onboarding `init`)
 *   - LOWER(x) LIKE LOWER(?) case-insensitive search (tenant slug/name,
 *     audit-log search, leads search)
 *   - `date()` → `substr(iso, 1, 10)` + JS-computed UTC params (first-success
 *     dashboard, unanswered-question period filters and trend)
 *   - json_extract → CAST(properties AS jsonb)->>'option' (starter options)
 *   - transactions (kb_chunks `insertMany`)
 *   - `.changes` / `rowCount` semantics
 *   - undefined-vs-null, empty results, pagination, JSON round-trips
 *   - FK enforcement and ON DELETE CASCADE
 *   - unique-constraint violations
 *
 * These are PostgreSQL-semantic tests (PGlite), NOT proof of Neon
 * compatibility — real Neon verification is a separate, later step.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { createDatabase } from '../db/database';
import { PgDatabase } from '../db/pg/pg-database';
import type { SqlDatabase } from '../db/types';
import { AnalyticsService } from '../services/analytics';
import {
  UserRepository, TenantRepository, ApiKeyRepository,
  ConversationRepository, MessageRepository,
  OnboardingProgressRepository, WidgetConfigRepository,
  AnalyticsRepository,
  UnansweredQuestionRepository,
  KnowledgeBaseRepository,
  KbDocumentRepository, KbChunkRepository,
  TeamMemberRepository, InvitationRepository, ActivityRepository,
  AuditLogRepository, WebhookRepository, HandoffRequestRepository,
  LeadRepository,
} from '../db/repositories';

const { migrate } = require('../../../../scripts/migrate-core.js');
const REAL_MIGRATION_DIR = path.join(__dirname, '..', '..', '..', '..', 'migrations');

let sqliteDb: SqlDatabase;
let pgDb: SqlDatabase;

/** migrate-core adapter over the sync bridge (placeholders are rewritten there). */
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

beforeAll(async () => {
  sqliteDb = createDatabase(':memory:');
  pgDb = new PgDatabase({ pglite: true });
  await migrate(makeBridgeAdapter(pgDb), REAL_MIGRATION_DIR);
});

afterAll(() => {
  sqliteDb.close();
  pgDb.close();
});

/** Runs a scenario against both backends and asserts deep-equal results. */
function parity<T>(scenario: (db: SqlDatabase) => T): T {
  const expected = scenario(sqliteDb);
  const actual = scenario(pgDb);
  expect(actual).toEqual(expected);
  return expected;
}

/** Runs an action expected to throw on BOTH backends (FK/unique violations). */
function parityThrow(scenario: (db: SqlDatabase) => void): void {
  const run = (db: SqlDatabase) => {
    try {
      scenario(db);
      return { threw: false };
    } catch {
      return { threw: true };
    }
  };
  expect(run(pgDb)).toEqual(run(sqliteDb));
}

// ─── fixtures (FKs are enforced on both backends) ───────────────
let userCounter = 0;
function makeUser(db: SqlDatabase, label: string): ReturnType<UserRepository['create']> {
  userCounter += 1;
  return new UserRepository(db).create({
    email: `${label}-${userCounter}@test.co`,
    password: 'pw',
    name: `Owner ${label}`,
  });
}

function makeTenant(db: SqlDatabase, name: string): ReturnType<TenantRepository['create']> {
  const user = makeUser(db, name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
  return new TenantRepository(db).create({ name, ownerId: user.id });
}

describe('repo parity — users, tenants, api keys', () => {
  it('UserRepository create/read/update/delete + changes', () => {
    const out = parity((db) => {
      const repo = new UserRepository(db);
      const u = repo.create({ email: 'alice@example.com', password: 's3cret!', name: 'Alice' });
      const found = repo.findByEmail('alice@example.com');
      const updated = repo.update(u.id, { name: 'Alicia', emailVerified: true });
      const missing = repo.findById('does-not-exist');
      const changes = db.prepare('DELETE FROM users WHERE id = ?').run(u.id).changes;
      return {
        foundSameId: found?.id === u.id,
        updatedName: updated?.name,
        verified: updated?.emailVerified,
        missing: missing === null,
        deleteChanges: changes,
      };
    });
    expect(out).toEqual({ foundSameId: true, updatedName: 'Alicia', verified: true, missing: true, deleteChanges: 1 });
  });

  it('TenantRepository case-insensitive slug/name search (LOWER LIKE)', () => {
    const out = parity((db) => {
      const repo = new TenantRepository(db);
      const t = makeTenant(db, 'Alpha Corp');
      const bySlugExact = repo.findBySlug(t.slug);
      // SQLite LIKE is ASCII case-insensitive by default; PostgreSQL is not —
      // LOWER() on both sides keeps the same semantics on each backend.
      const bySlugLikeUpper = repo.findBySlugLike('%' + t.slug.toUpperCase().slice(0, 6) + '%');
      const byNameLikeLower = repo.findByNameLike('%alpha%');
      const noMatch = repo.findBySlugLike('%zzz-no-match%');
      return {
        slugExact: bySlugExact?.id === t.id,
        slugLikeUpper: bySlugLikeUpper?.id === t.id,
        nameLikeLower: byNameLikeLower?.id === t.id,
        noMatch: noMatch === null,
      };
    });
    expect(out).toEqual({ slugExact: true, slugLikeUpper: true, nameLikeLower: true, noMatch: true });
  });

  it('TenantRepository settings JSON round-trip, pagination, delete changes', () => {
    const out = parity((db) => {
      const repo = new TenantRepository(db);
      const owner = makeUser(db, 'tenant-owner');
      const before = repo.list(1, 1000).total; // shared db accumulates rows across tests → compare relatively
      const t1 = repo.create({ name: 'Tenant One', ownerId: owner.id });
      repo.create({ name: 'Tenant Two', ownerId: owner.id });
      repo.create({ name: 'Tenant Three', ownerId: owner.id });
      const mid = repo.list(1, 1000).total;
      const updated = repo.update(t1.id, { settings: { language: 'es', theme: 'dark' } });
      const page1 = repo.list(1, 2);
      const owned = repo.findByOwner(owner.id);
      const firstDelete = repo.delete(t1.id);
      const secondDelete = repo.delete(t1.id);
      const after = repo.list(1, 1000).total;
      return {
        settings: updated?.settings,
        page1Count: page1.tenants.length,
        createdDelta: mid - before,
        ownedCount: owned.length,
        firstDelete,
        secondDelete,
        deletedDelta: after - mid,
      };
    });
    expect(out.settings).toEqual({ language: 'es', theme: 'dark' });
    expect(out.page1Count).toBe(2);
    expect(out.createdDelta).toBe(3);
    expect(out.ownedCount).toBe(3);
    expect(out.firstDelete).toBe(true);
    expect(out.secondDelete).toBe(false);
    expect(out.deletedDelta).toBe(-1);
  });

  it('ApiKeyRepository revoke changes: true then false', () => {
    const out = parity((db) => {
      const repo = new ApiKeyRepository(db);
      const t = makeTenant(db, 'Key Co');
      const { record } = repo.create(t.id, 'prod key', 'end-user');
      const first = repo.revoke(record.id, t.id);
      const second = repo.revoke(record.id, t.id);
      const listed = repo.findByTenant(t.id);
      return { first, second, listedCount: listed.length };
    });
    expect(out).toEqual({ first: true, second: false, listedCount: 0 });
  });

  it('TenantRepository ensureDemoTenant bootstraps idempotently', () => {
    const out = parity((db) => {
      const repo = new TenantRepository(db);
      const before = repo.findById('burflow-saas');
      repo.ensureDemoTenant('burflow-saas');
      const afterFirst = repo.findById('burflow-saas');
      // Rerun must be a clean no-op (ON CONFLICT DO NOTHING) on both backends.
      repo.ensureDemoTenant('burflow-saas');
      const afterSecond = repo.findById('burflow-saas');
      const bySlug = repo.findBySlug('burflow-saas');
      // The demo tenant must be usable by child tables — conversations FK.
      const convRepo = new ConversationRepository(db);
      const conv = convRepo.create('burflow-saas', 'demo-session');
      const found = convRepo.findBySession('burflow-saas', 'demo-session');
      return {
        existedBefore: before !== null,
        createdFirst: afterFirst?.id === 'burflow-saas',
        name: afterFirst?.name,
        slug: afterFirst?.slug,
        plan: afterFirst?.plan,
        stableAfterRerun: afterFirst?.id === afterSecond?.id && afterFirst?.name === afterSecond?.name,
        bySlugId: bySlug?.id,
        convPersisted: found?.id === conv.id,
      };
    });
    expect(out).toEqual({
      existedBefore: false, // no scenario creates the burflow-saas row beforehand
      createdFirst: true,
      name: 'BurFlow AI',
      slug: 'burflow-saas',
      plan: 'free',
      stableAfterRerun: true,
      bySlugId: 'burflow-saas',
      convPersisted: true,
    });
  });
});

describe('repo parity — conversations, messages, cascades', () => {
  it('ConversationRepository + MessageRepository reads, pagination, last-message subquery', () => {
    const out = parity((db) => {
      const convRepo = new ConversationRepository(db);
      const msgRepo = new MessageRepository(db);
      const t = makeTenant(db, 'Conv Co');
      const c = convRepo.create(t.id, 'session-abc');
      msgRepo.create({ conversationId: c.id, tenantId: t.id, role: 'user', content: 'hello', sequenceNumber: 1 });
      msgRepo.create({ conversationId: c.id, tenantId: t.id, role: 'assistant', content: 'hi there', sequenceNumber: 2, safetyFlags: ['grounded'] });
      msgRepo.create({ conversationId: c.id, tenantId: t.id, role: 'user', content: 'thanks', sequenceNumber: 3 });

      const page = msgRepo.listByConversation(c.id, 1, 2);
      const byTenant = msgRepo.listByTenant(t.id);
      const list = convRepo.listByTenant(t.id, 1, 10, 'active');
      const active = convRepo.listActiveByTenant(t.id);
      const months = convRepo.countByMonth(t.id);
      const ended = convRepo.endConversation(c.id);
      const afterEnd = convRepo.listByTenant(t.id, 1, 10, 'active');

      return {
        pageCount: page.messages.length,
        pageTotal: page.total,
        byTenantCount: byTenant.total,
        lastMessage: list.conversations[0]?.lastMessage,
        activeCount: active.length,
        monthsCounts: months.map((m) => m.count),
        endedStatus: ended?.status,
        afterEndCount: afterEnd.total,
      };
    });
    expect(out).toEqual({
      pageCount: 2,
      pageTotal: 3,
      byTenantCount: 3,
      lastMessage: 'thanks',
      activeCount: 1,
      monthsCounts: [1],
      endedStatus: 'ended',
      afterEndCount: 0,
    });
  });

  it('ON DELETE CASCADE: deleting a tenant removes conversations and messages', () => {
    const out = parity((db) => {
      const tenantRepo = new TenantRepository(db);
      const convRepo = new ConversationRepository(db);
      const msgRepo = new MessageRepository(db);
      const t = makeTenant(db, 'Cascade Co');
      const c = convRepo.create(t.id, 'session-cascade');
      msgRepo.create({ conversationId: c.id, tenantId: t.id, role: 'user', content: 'x', sequenceNumber: 1 });
      const deleted = tenantRepo.delete(t.id);
      const convGone = convRepo.findById(c.id) === null;
      const msgCount = db.prepare('SELECT COUNT(*) as c FROM messages WHERE conversation_id = ?').get(c.id)?.c;
      return { deleted, convGone, msgCount };
    });
    expect(out).toEqual({ deleted: true, convGone: true, msgCount: 0 });
  });

  it('MessageRepository FK violation throws on both backends', () => {
    parityThrow((db) => {
      new MessageRepository(db).create({
        conversationId: 'no-such-conversation',
        tenantId: 'tenant-1',
        role: 'user',
        content: 'x',
        sequenceNumber: 1,
      });
    });
  });
});

describe('repo parity — onboarding, widget config, analytics', () => {
  it('OnboardingProgressRepository init is idempotent (ON CONFLICT DO NOTHING)', () => {
    const out = parity((db) => {
      const repo = new OnboardingProgressRepository(db);
      const t = makeTenant(db, 'Onboarding Co');
      const first = repo.init(t.id);
      repo.init(t.id); // must NOT insert a second row
      const count = db.prepare('SELECT COUNT(*) as c FROM onboarding_progress WHERE tenant_id = ?').get(t.id)?.c;
      const stepped = repo.markStepComplete(t.id, 'create_knowledge_base');
      const skipped = repo.skipStep(t.id, 'invite_team');
      return {
        firstStatus: first.onboardingStatus,
        rowCount: count,
        completed: stepped?.completedSteps,
        pct: stepped?.completionPercentage,
        skipped: skipped?.skippedSteps,
      };
    });
    expect(out.rowCount).toBe(1);
    expect(out.completed).toEqual(['create_knowledge_base']);
  });

  it('OnboardingProgressRepository getFirstSuccessDashboard (substr date + counts)', () => {
    const out = parity((db) => {
      const onbRepo = new OnboardingProgressRepository(db);
      const convRepo = new ConversationRepository(db);
      const t = makeTenant(db, 'Dashboard Co');
      onbRepo.init(t.id);
      convRepo.create(t.id, 'session-dash'); // started today → conversationsToday = 1
      const dash = onbRepo.getFirstSuccessDashboard(t.id);
      return {
        conversationsToday: dash.conversationsToday,
        knowledgeUploaded: dash.knowledgeUploaded,
        status: dash.onboardingStatus,
      };
    });
    expect(out.conversationsToday).toBe(1);
    expect(out.knowledgeUploaded).toBe(false);
  });

  it('WidgetConfigRepository upsert create + update with JSON and booleans', () => {
    const out = parity((db) => {
      const repo = new WidgetConfigRepository(db);
      const t = makeTenant(db, 'Widget Co');
      const created = repo.upsert(t.id, {
        companyName: 'Widget Co',
        primaryColor: '#123456',
        autoOpen: true,
        allowedDomains: ['example.com'],
        starterOptions: [{ label: 'Pricing', prompt: 'Show pricing' }],
      });
      const updated = repo.upsert(t.id, { theme: 'dark', position: 'right', autoOpen: false });
      const reRead = repo.get(t.id);
      return {
        createdCompany: created.companyName,
        theme: reRead?.theme,
        position: reRead?.position,
        autoOpen: reRead?.autoOpen,
        allowedDomains: reRead?.allowedDomains,
        starterOptions: reRead?.starterOptions,
        sameId: reRead?.id === created.id,
      };
    });
    expect(out).toEqual({
      createdCompany: 'Widget Co',
      theme: 'dark',
      position: 'right',
      autoOpen: false,
      allowedDomains: ['example.com'],
      starterOptions: [{ label: 'Pricing', prompt: 'Show pricing' }],
      sameId: true,
    });
  });

  it('AnalyticsService getStarterOptionStats (json_extract → jsonb)', () => {
    const out = parity((db) => {
      const repo = new AnalyticsRepository(db);
      const t = makeTenant(db, 'Analytics Co');
      repo.record(t.id, 'starter_chip_click', { option: 'Show me pricing' });
      repo.record(t.id, 'starter_chip_click', { option: 'Show me pricing' });
      repo.record(t.id, 'starter_chip_click', { option: 'Book a demo' });
      const service = new AnalyticsService(db);
      const stats = service.getStarterOptionStats(t.id);
      const other = service.getStarterOptionStats('empty-tenant');
      return {
        totalClicks: stats.totalClicks,
        options: stats.options.map((o) => ({ option: o.option, clicks: o.clicks })),
        empty: other,
      };
    });
    expect(out.totalClicks).toBe(3);
    expect(out.options).toEqual([
      { option: 'Show me pricing', clicks: 2 },
      { option: 'Book a demo', clicks: 1 },
    ]);
    expect(out.empty).toEqual({ totalClicks: 0, options: [] });
  });
});

describe('repo parity — unanswered questions, knowledge', () => {
  it('UnansweredQuestionRepository period filters + stats trend (substr date)', () => {
    const out = parity((db) => {
      const repo = new UnansweredQuestionRepository(db);
      const convRepo = new ConversationRepository(db);
      const t = makeTenant(db, 'Gap Co');
      const c = convRepo.create(t.id, 'session-gap');
      repo.create({ tenantId: t.id, conversationId: c.id, question: 'How does pricing work?', confidence: 0.8 });
      repo.create({ tenantId: t.id, conversationId: c.id, question: 'Does it integrate with Slack?', confidence: 0.5 });
      const [first, second] = repo.listByTenant(t.id);
      repo.resolve(first.id);
      const today = repo.listByTenant(t.id, { period: 'today' });
      const resolved = repo.listByTenant(t.id, { resolved: true });
      const stats = repo.getStats(t.id, 'today');
      return {
        count: today.length,
        resolvedCount: resolved.length,
        resolvedFlag: resolved[0]?.escalationStatus === 'resolved',
        totalUnanswered: stats.totalUnanswered,
        resolutionRate: stats.resolutionRate,
        trendCounts: stats.trend.map((r) => r.count),
        secondId: first.id !== second.id,
      };
    });
    expect(out).toEqual({
      count: 2,
      resolvedCount: 1,
      resolvedFlag: true,
      totalUnanswered: 2,
      resolutionRate: 50,
      trendCounts: [2],
      secondId: true,
    });
  });

  it('KbChunkRepository insertMany transaction + delete changes', () => {
    const out = parity((db) => {
      const kbRepo = new KnowledgeBaseRepository(db);
      const docRepo = new KbDocumentRepository(db);
      const chunkRepo = new KbChunkRepository(db);
      const t = makeTenant(db, 'KB Co');
      const kb = kbRepo.create(t.id, 'Main KB', 'docs');
      const doc = docRepo.create({ knowledgeBaseId: kb.id, tenantId: t.id, filename: 'guide.md', sourceType: 'text' });
      const inserted = chunkRepo.insertMany(kb.id, t.id, doc.id, [
        { content: 'chunk one', metadata: { page: 1 } },
        { content: 'chunk two' },
        { content: 'chunk three', metadata: { page: 2 } },
      ]);
      const counted = chunkRepo.countByDocument(doc.id);
      const deleted = chunkRepo.deleteByDocument(doc.id);
      const after = chunkRepo.countByDocument(doc.id);
      docRepo.updateStatus(doc.id, 'completed');
      const completed = db.prepare("SELECT COUNT(*) as c FROM kb_documents WHERE tenant_id = ? AND status = 'completed'").get(t.id)?.c;
      const statuses = docRepo.countByStatus(t.id);
      return { inserted, counted, deleted, after, completed, total: statuses.total };
    });
    expect(out).toEqual({ inserted: 3, counted: 3, deleted: 3, after: 0, completed: 1, total: 1 });
  });
});

describe('repo parity — team, invitations, activity, audit, webhooks, handoff', () => {
  it('TeamMemberRepository roles, transfer, remove + unique constraint', () => {
    const out = parity((db) => {
      const repo = new TeamMemberRepository(db);
      const t = makeTenant(db, 'Team Co');
      const ownerUser = makeUser(db, 'team-owner');
      const memberUser = makeUser(db, 'team-member');
      const owner = repo.add(t.id, ownerUser.id, ownerUser.email, 'Owner', 'owner', ownerUser.id);
      const member = repo.add(t.id, memberUser.id, memberUser.email, 'Bob', 'support_agent', ownerUser.id);
      const updated = repo.updateRole(member.id, 'admin');
      const count = repo.countByTenant(t.id);
      const transferred = repo.transferOwnership(t.id, memberUser.id, memberUser.email, 'Bob');
      const removed = repo.remove(owner.id, t.id);
      const removedAgain = repo.remove(owner.id, t.id);
      const listed = repo.findByTenant(t.id);
      // unique (tenant_id, user_id): duplicate add must throw on both
      let dupThrew = false;
      try {
        repo.add(t.id, memberUser.id, memberUser.email, 'Bob', 'support_agent', ownerUser.id);
      } catch {
        dupThrew = true;
      }
      return {
        ownerRole: updated?.role,
        count,
        transferredRole: transferred?.role,
        removed,
        removedAgain,
        listedRoles: listed.map((m) => m.role).sort(),
        dupThrew,
      };
    });
    expect(out).toEqual({
      ownerRole: 'admin',
      count: 2,
      transferredRole: 'owner',
      removed: true,
      removedAgain: false,
      listedRoles: ['owner'],
      dupThrew: true,
    });
  });

  it('InvitationRepository accept/cancel/expire changes', () => {
    const out = parity((db) => {
      const repo = new InvitationRepository(db);
      const t = makeTenant(db, 'Inv Co');
      const owner = makeUser(db, 'inv-owner');
      const inv = repo.create(t.id, 'invite@co.com', 'support_agent', owner.id, 'Owner', 'tok-123', '2099-01-01T00:00:00.000Z');
      const byToken = repo.findByToken('tok-123');
      repo.accept(inv.id);
      const cancelAccepted = repo.cancel(inv.id, t.id);
      repo.create(t.id, 'old@co.com', 'support_agent', owner.id, 'Owner', 'tok-exp', '2020-01-01T00:00:00.000Z');
      const expiredCount = repo.expirePending();
      const listed = repo.listByTenant(t.id, 'expired');
      return {
        byToken: byToken?.id === inv.id,
        cancelAccepted,
        expiredCount,
        expiredListed: listed.map((i) => i.email),
      };
    });
    // cancel() overwrites status unconditionally (no status guard in the repo)
    expect(out).toEqual({ byToken: true, cancelAccepted: true, expiredCount: 1, expiredListed: ['old@co.com'] });
  });

  it('ActivityRepository + AuditLogRepository search (LOWER LIKE) and pagination', () => {
    const out = parity((db) => {
      const activity = new ActivityRepository(db);
      const audit = new AuditLogRepository(db);
      const t = makeTenant(db, 'Audit Co');
      const u1 = makeUser(db, 'audit-u1');
      const u2 = makeUser(db, 'audit-u2');
      activity.record(t.id, u1.id, 'Alice', 'created', 'api_key', 'k1', { env: 'prod' });
      activity.record(t.id, u2.id, 'Bob', 'deleted', 'webhook', 'w1');
      const actList = activity.listByTenant(t.id, 1, 1);
      audit.record(t.id, { userId: u1.id, userName: 'Alice', eventType: 'api_key.create', resourceType: 'API Key', details: 'Created a production API key' });
      audit.record(t.id, { userId: u2.id, userName: 'Bob', eventType: 'webhook.delete', resourceType: 'Webhook', details: 'Deleted webhook' });
      const search = audit.listByTenant(t.id, { search: 'API' }); // case-insensitive match on details
      const filtered = audit.listByTenant(t.id, { eventType: 'api_key.create' });
      // two records are written within the same millisecond, so ORDER BY
      // created_at is a tie — locate the record by action instead of index
      const createdEvent = activity.listByTenant(t.id).events.find((e) => e.action === 'created');
      return {
        actTotal: actList.total,
        actPageCount: actList.events.length,
        actMetadata: createdEvent?.metadata,
        searchTotal: search.total,
        searchType: search.entries[0]?.eventType,
        filteredTotal: filtered.total,
      };
    });
    expect(out).toEqual({
      actTotal: 2,
      actPageCount: 1,
      actMetadata: { env: 'prod' },
      searchTotal: 1,
      searchType: 'api_key.create',
      filteredTotal: 1,
    });
  });

  it('WebhookRepository update (JSON events) + delete changes', () => {
    const out = parity((db) => {
      const repo = new WebhookRepository(db);
      const t = makeTenant(db, 'Hook Co');
      const w = repo.create(t.id, 'https://example.com/hook', ['lead.created'], 'secret-1');
      const updated = repo.update(w.id, t.id, { events: ['lead.created', 'lead.updated'], isActive: false });
      const firstDelete = repo.delete(w.id, t.id);
      const secondDelete = repo.delete(w.id, t.id);
      return {
        events: updated?.events,
        isActive: updated?.isActive,
        firstDelete,
        secondDelete,
      };
    });
    expect(out).toEqual({ events: ['lead.created', 'lead.updated'], isActive: false, firstDelete: true, secondDelete: false });
  });

  it('HandoffRequestRepository create/find/resolve/list', () => {
    const out = parity((db) => {
      const repo = new HandoffRequestRepository(db);
      const t = makeTenant(db, 'Handoff Co');
      const h = repo.create({ tenantId: t.id, sessionId: 'session-h', visitorEmail: 'v@x.com', conversationSummary: 'wants pricing' });
      const bySession = repo.findBySession('session-h');
      const resolved = repo.resolve(h.id, 'agent-1');
      const pending = repo.listByTenant(t.id, 'pending');
      return {
        bySession: bySession?.id === h.id,
        resolvedStatus: resolved?.status,
        resolvedBy: resolved?.resolvedBy,
        pendingCount: pending.length,
      };
    });
    expect(out).toEqual({ bySession: true, resolvedStatus: 'resolved', resolvedBy: 'agent-1', pendingCount: 0 });
  });
});

describe('repo parity — leads', () => {
  it('LeadRepository upsert, case-insensitive search, qualification, delete', () => {
    const out = parity((db) => {
      const repo = new LeadRepository(db);
      const t = makeTenant(db, 'Lead Co');
      const first = repo.upsertBySession({
        tenantId: t.id,
        sessionId: 'session-1',
        email: 'acme@example.com',
        name: 'Acme Inc',
        company: 'Acme Inc',
        qualificationStatus: 'unqualified',
        leadScore: 20,
        buyingIntent: 'low',
        source: 'chat',
      });
      const second = repo.upsertBySession({
        tenantId: t.id,
        sessionId: 'session-1',
        email: 'acme@example.com',
        name: 'Acme Inc',
        company: 'Acme Inc',
        qualificationStatus: 'marketing_qualified',
        leadScore: 80,
        buyingIntent: 'high',
        source: 'chat',
        metadata: { plan: 'pro' },
      });
      const search = repo.searchLeads(t.id, { search: 'ACME', page: 1, limit: 10 });
      const byStatus = repo.searchLeads(t.id, { status: 'marketing_qualified' });
      const byEmail = repo.findByEmail(t.id, 'acme@example.com');
      const deleted = repo.delete(byEmail!.id, t.id);
      const after = repo.searchLeads(t.id);
      return {
        isNew: [first.isNew, second.isNew],
        qualificationChanged: [first.qualificationChanged, second.qualificationChanged],
        leadScore: second.lead.leadScore,
        metadata: second.lead.metadata,
        searchTotal: search.total,
        searchName: search.leads[0]?.name,
        statusTotal: byStatus.total,
        byEmailScore: byEmail?.leadScore,
        deleted,
        afterTotal: after.total,
      };
    });
    expect(out).toEqual({
      isNew: [true, false],
      qualificationChanged: [true, true],
      leadScore: 80,
      metadata: { plan: 'pro' },
      searchTotal: 1,
      searchName: 'Acme Inc',
      statusTotal: 1,
      byEmailScore: 80,
      deleted: true,
      afterTotal: 0,
    });
  });
});
