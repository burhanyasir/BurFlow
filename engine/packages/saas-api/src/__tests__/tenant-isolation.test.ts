import { describe, it, expect, beforeAll } from 'vitest';
import Database from 'better-sqlite3';
import {
  createDatabase, UserRepository, TenantRepository,
  ConversationRepository, MessageRepository, UsageRepository,
  KbDocumentRepository, KbChunkRepository, KnowledgeBaseRepository,
} from '@conversation-engine/saas-core';
import { DbKnowledgeBaseProvider } from '../orchestrator';
import { TopicResponseTemplateRepository } from '@conversation-engine/saas-core';

/**
 * C9: Tenant isolation CI test — asserts zero cross-tenant data leakage.
 * Runs a two-tenant fixture and verifies:
 *   1. Knowledge chunks are scoped by tenant_id
 *   2. getBusinessKnowledge returns empty for tenant with no data
 *   3. getRelevantKnowledge returns empty for tenant with no data
 *   4. Usage records are scoped by tenant_id
 *   5. Messages are scoped by conversation (which is scoped by tenant)
 */
describe('Tenant isolation — cross-leak assertion', () => {
  let db: Database.Database;
  let userRepo: UserRepository;
  let tenantRepo: TenantRepository;
  let conversationRepo: ConversationRepository;
  let messageRepo: MessageRepository;
  let usageRepo: UsageRepository;
  let kbRepo: KnowledgeBaseRepository;
  let docRepo: KbDocumentRepository;
  let chunkRepo: KbChunkRepository;
  let topicRepo: TopicResponseTemplateRepository;

  let tenantA: string;
  let tenantB: string;
  let convA: string;
  let convB: string;

  beforeAll(() => {
    db = createDatabase(':memory:');
    userRepo = new UserRepository(db);
    tenantRepo = new TenantRepository(db);
    conversationRepo = new ConversationRepository(db);
    messageRepo = new MessageRepository(db);
    usageRepo = new UsageRepository(db);
    kbRepo = new KnowledgeBaseRepository(db);
    docRepo = new KbDocumentRepository(db);
    chunkRepo = new KbChunkRepository(db);
    topicRepo = new TopicResponseTemplateRepository(db);

    // Create two tenants
    const owner = userRepo.create({ email: 'isolation-test@unit.test', password: 'test123', name: 'Test Owner' });
    tenantA = tenantRepo.create({ name: 'Tenant A (secret data)', ownerId: owner.id }).id;
    tenantB = tenantRepo.create({ name: 'Tenant B (no data)', ownerId: owner.id }).id;

    // Create conversations
    convA = conversationRepo.create(tenantA, 'sess-a').id;
    convB = conversationRepo.create(tenantB, 'sess-b').id;

    // Add knowledge to Tenant A only
    const kb = kbRepo.create(tenantA, 'KB A');
    const doc = docRepo.create(tenantA, kb.id, 'https://tenant-a-secret.com', 'Tenant A Secret Page');
    chunkRepo.insertMany(kb.id, tenantA, doc.id, [
      { content: 'TENANT_A_SECRET: The pricing is $99/month for enterprise.', metadata: { title: 'Secret Pricing' } },
      { content: 'TENANT_A_SECRET: Our internal API key is sk-abc-123-secret.', metadata: { title: 'Internal API Key' } },
    ]);
  });

  it('Tenant B has zero chunks in the database', () => {
    const rows = db.prepare(
      'SELECT COUNT(*) as c FROM kb_chunks WHERE tenant_id = ?'
    ).get(tenantB) as any;
    expect(rows.c).toBe(0);
  });

  it('Tenant A has chunks, Tenant B does not', () => {
    const rowsA = db.prepare(
      'SELECT COUNT(*) as c FROM kb_chunks WHERE tenant_id = ?'
    ).get(tenantA) as any;
    const rowsB = db.prepare(
      'SELECT COUNT(*) as c FROM kb_chunks WHERE tenant_id = ?'
    ).get(tenantB) as any;
    expect(rowsA.c).toBeGreaterThan(0);
    expect(rowsB.c).toBe(0);
  });

  it('getBusinessKnowledge returns data for Tenant A, empty for Tenant B', () => {
    const provider = new DbKnowledgeBaseProvider(topicRepo, db, undefined);
    const knowledgeA = provider.getBusinessKnowledge(tenantA);
    const knowledgeB = provider.getBusinessKnowledge(tenantB);
    expect(knowledgeA).toContain('TENANT_A_SECRET');
    expect(knowledgeB).toBe('');
  });

  it('getRelevantKnowledge returns empty for Tenant B (no vector chunks)', async () => {
    const provider = new DbKnowledgeBaseProvider(topicRepo, db, undefined);
    // Tenant B has no chunks, so vector search returns empty
    const knowledgeB = await provider.getRelevantKnowledge('pricing', tenantB);
    expect(knowledgeB).toBe('');
  });

  it('Messages are scoped to their conversation (no cross-tenant message leak)', () => {
    messageRepo.create({
      conversationId: convA,
      tenantId: tenantA,
      role: 'user',
      content: 'TENANT_A_SECRET: What is the enterprise pricing?',
      sequenceNumber: 1,
    });
    messageRepo.create({
      conversationId: convB,
      tenantId: tenantB,
      role: 'user',
      content: 'Hello from Tenant B',
      sequenceNumber: 1,
    });

    // Messages for convA should not appear in convB's query
    const msgsA = db.prepare(
      'SELECT * FROM messages WHERE conversation_id = ?'
    ).all(convA) as any[];
    const msgsB = db.prepare(
      'SELECT * FROM messages WHERE conversation_id = ?'
    ).all(convB) as any[];

    expect(msgsA.length).toBe(1);
    expect(msgsB.length).toBe(1);
    expect(msgsA[0].content).toContain('TENANT_A_SECRET');
    expect(msgsB[0].content).not.toContain('TENANT_A_SECRET');
  });

  it('Usage records are scoped by tenant_id', () => {
    usageRepo.incrementMessages(tenantA, '2026-01', 5);
    usageRepo.incrementMessages(tenantB, '2026-01', 2);

    const usageA = usageRepo.getOrCreate(tenantA, '2026-01');
    const usageB = usageRepo.getOrCreate(tenantB, '2026-01');

    expect(usageA.messagesUsed).toBe(5);
    expect(usageB.messagesUsed).toBe(2);
  });

  it('Knowledge base queries with wrong tenant_id return empty', () => {
    // Query tenant A's data with tenant B's ID — should return nothing
    const rows = db.prepare(
      'SELECT * FROM kb_chunks WHERE tenant_id = ?'
    ).all(tenantB) as any[];
    expect(rows.length).toBe(0);
  });

  it('Topic responses are scoped by tenant_id', () => {
    topicRepo.create(tenantA, 'pricing', 'Tenant A pricing answer', '[]');
    const topicsA = topicRepo.findByTenant(tenantA);
    const topicsB = topicRepo.findByTenant(tenantB);
    expect(topicsA.length).toBeGreaterThan(0);
    expect(topicsB.length).toBe(0);
  });
});
