import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import { createDatabase } from '../db/database';
import { LeadRepository } from '../db/repositories';
import { LeadService } from '../services/lead-service';
import {
  extractContactDetails,
  determineQualificationStatus,
  mapScoreToBuyingIntent,
  hasContactInfo,
  buildLeadData,
} from '../services/lead-extraction';

describe('extractContactDetails', () => {
  it('extracts email from message', () => {
    const result = extractContactDetails('My email is Jane.Doe@Example.com, please reach out');
    expect(result.email).toBe('jane.doe@example.com');
  });

  it('extracts phone number from message', () => {
    const result = extractContactDetails('Call me at 555-123-4567 anytime');
    expect(result.phone).toBe('555-123-4567');
  });

  it('extracts phone with country code', () => {
    const result = extractContactDetails('My number is +1 (415) 555-0132');
    expect(result.phone).toBe('+1 (415) 555-0132');
  });

  it('extracts name from "my name is"', () => {
    const result = extractContactDetails('Hi there, my name is Sarah Johnson and I have a question');
    expect(result.name).toBe('Sarah Johnson');
  });

  it('extracts name from "I am"', () => {
    const result = extractContactDetails("I'm Tom from the marketing team");
    expect(result.name).toBe('Tom');
  });

  it('extracts company from "I work at"', () => {
    const result = extractContactDetails('I work at Acme Corporation and we need a solution');
    expect(result.company).toBe('Acme Corporation');
  });

  it('extracts nothing from a plain question', () => {
    const result = extractContactDetails('What is your pricing for the pro plan?');
    expect(result).toEqual({});
  });

  it('extracts multiple fields from one message', () => {
    const result = extractContactDetails('My name is Priya Patel, email priya@corp.io, I work at Nexus Labs');
    expect(result.email).toBe('priya@corp.io');
    expect(result.name).toBe('Priya Patel');
    expect(result.company).toBe('Nexus Labs');
  });

  it('does not invent name from random capitalized words', () => {
    const result = extractContactDetails('The product seems great and the features are exactly what we need');
    expect(result.name).toBeUndefined();
    expect(result.company).toBeUndefined();
  });

  it('ignores empty or invalid input', () => {
    expect(extractContactDetails('')).toEqual({});
    expect(extractContactDetails(null as any)).toEqual({});
  });
});

describe('determineQualificationStatus', () => {
  it('maps high score to sales_qualified', () => {
    expect(determineQualificationStatus(85, 'low')).toBe('sales_qualified');
    expect(determineQualificationStatus(70, 'medium')).toBe('sales_qualified');
  });

  it('maps high buying intent to sales_qualified even with low score', () => {
    expect(determineQualificationStatus(20, 'high')).toBe('sales_qualified');
  });

  it('maps medium score to marketing_qualified', () => {
    expect(determineQualificationStatus(45, 'low')).toBe('marketing_qualified');
    expect(determineQualificationStatus(30, 'low')).toBe('marketing_qualified');
  });

  it('maps medium intent to marketing_qualified', () => {
    expect(determineQualificationStatus(10, 'medium')).toBe('marketing_qualified');
  });

  it('maps low score and intent to unqualified', () => {
    expect(determineQualificationStatus(10, 'low')).toBe('unqualified');
    expect(determineQualificationStatus(0, 'low')).toBe('unqualified');
  });

  it('handles boolean buying intent', () => {
    expect(determineQualificationStatus(20, true)).toBe('sales_qualified');
    expect(determineQualificationStatus(20, false)).toBe('unqualified');
  });
});

describe('mapScoreToBuyingIntent', () => {
  it('maps score ranges', () => {
    expect(mapScoreToBuyingIntent(75)).toBe('high');
    expect(mapScoreToBuyingIntent(60)).toBe('high');
    expect(mapScoreToBuyingIntent(45)).toBe('medium');
    expect(mapScoreToBuyingIntent(30)).toBe('medium');
    expect(mapScoreToBuyingIntent(15)).toBe('low');
  });
});

describe('hasContactInfo', () => {
  it('returns true when any contact field present', () => {
    expect(hasContactInfo({ email: 'a@b.com' })).toBe(true);
    expect(hasContactInfo({ phone: '555-123-4567' })).toBe(true);
    expect(hasContactInfo({ name: 'John' })).toBe(true);
    expect(hasContactInfo({ company: 'Acme' })).toBe(true);
  });

  it('returns false for empty details', () => {
    expect(hasContactInfo({})).toBe(false);
    expect(hasContactInfo(null)).toBe(false);
    expect(hasContactInfo(undefined)).toBe(false);
  });
});

describe('buildLeadData', () => {
  it('builds lead data with qualification status', () => {
    const result = buildLeadData({
      tenantId: 't1',
      sessionId: 's1',
      conversationId: 'c1',
      extracted: { email: 'a@b.com', name: 'John' },
      leadScore: 80,
      buyingIntent: 'high',
    });
    expect(result.lead.email).toBe('a@b.com');
    expect(result.lead.name).toBe('John');
    expect(result.lead.qualificationStatus).toBe('sales_qualified');
    expect(result.lead.buyingIntent).toBe('high');
    expect(result.lead.tenantId).toBe('t1');
  });
});

describe('LeadRepository', () => {
  const TEST_DB = join(__dirname, '__lead_repo_test__.db');
  let db: Database.Database;
  let repo: LeadRepository;

  function seedTenant(tenantId: string): void {
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO users (id, email, password_hash, name, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)"
    ).run(`u-${tenantId}`, `${tenantId}@test.com`, 'hash', 'Test User', now, now);
    db.prepare(
      "INSERT INTO tenants (id, name, slug, owner_id, plan, subscription_status, settings, created_at, updated_at) VALUES (?, ?, ?, ?, 'free', 'active', '{}', ?, ?)"
    ).run(tenantId, `Tenant ${tenantId}`, `slug-${tenantId}`, `u-${tenantId}`, now, now);
  }

  beforeAll(() => {
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
    db = createDatabase(TEST_DB);
    repo = new LeadRepository(db);
    seedTenant('tenant-a');
    seedTenant('tenant-b');
    seedTenant('tenant-c');
    seedTenant('tenant-z');
  });

  afterAll(() => {
    try { db.close(); } catch {}
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
  });

  it('creates and finds a lead by id', () => {
    const lead = repo.create({
      tenantId: 'tenant-a', sessionId: 'session-1', email: 'buyer@test.com',
      qualificationStatus: 'sales_qualified', leadScore: 85, buyingIntent: 'high', source: 'chat',
    });
    expect(lead.id).toBeTruthy();
    expect(lead.email).toBe('buyer@test.com');
    expect(lead.qualificationStatus).toBe('sales_qualified');

    const found = repo.findById(lead.id);
    expect(found).toBeTruthy();
    expect(found!.tenantId).toBe('tenant-a');
  });

  it('finds lead by session', () => {
    const lead = repo.findBySession('tenant-a', 'session-1');
    expect(lead).toBeTruthy();
    expect(lead!.email).toBe('buyer@test.com');
  });

  it('returns null for unknown session', () => {
    expect(repo.findBySession('tenant-a', 'nope')).toBeNull();
  });

  it('lists leads by tenant with pagination', () => {
    for (let i = 0; i < 5; i++) {
      repo.create({
        tenantId: 'tenant-b', sessionId: `s-${i}`, email: `u${i}@test.com`,
        qualificationStatus: 'unqualified', leadScore: 10, buyingIntent: 'low', source: 'chat',
      });
    }
    const page1 = repo.findByTenant('tenant-b', 1, 3);
    expect(page1.leads.length).toBe(3);
    expect(page1.total).toBe(5);
    const page2 = repo.findByTenant('tenant-b', 2, 3);
    expect(page2.leads.length).toBe(2);
  });

  it('upserts by session: creates on first call, merges on second', () => {
    const first = repo.upsertBySession({
      tenantId: 'tenant-c', sessionId: 'session-x', email: 'first@test.com',
      qualificationStatus: 'marketing_qualified', leadScore: 40, buyingIntent: 'medium', source: 'chat',
    });
    expect(first.isNew).toBe(true);

    const second = repo.upsertBySession({
      tenantId: 'tenant-c', sessionId: 'session-x', phone: '555-000-1111', name: 'Alex',
      qualificationStatus: 'sales_qualified', leadScore: 80, buyingIntent: 'high', source: 'chat',
    });
    expect(second.isNew).toBe(false);
    expect(second.lead.email).toBe('first@test.com');
    expect(second.lead.phone).toBe('555-000-1111');
    expect(second.lead.name).toBe('Alex');
    expect(second.lead.qualificationStatus).toBe('sales_qualified');
    expect(second.lead.leadScore).toBe(80);
  });

  it('enforces tenant isolation', () => {
    const lead = repo.findBySession('tenant-z', 'session-1');
    expect(lead).toBeNull();
  });
});

describe('LeadService', () => {
  const TEST_DB = join(__dirname, '__lead_service_test__.db');
  let db: Database.Database;
  let repo: LeadRepository;

  beforeAll(() => {
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
    db = createDatabase(TEST_DB);
    repo = new LeadRepository(db);
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO users (id, email, password_hash, name, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)"
    ).run('u-t-svc', 'svc@test.com', 'hash', 'Svc User', now, now);
    db.prepare(
      "INSERT INTO tenants (id, name, slug, owner_id, plan, subscription_status, settings, created_at, updated_at) VALUES (?, ?, ?, ?, 'free', 'active', '{}', ?, ?)"
    ).run('t-svc', 'Svc Tenant', 'slug-svc', 'u-t-svc', now, now);
  });

  afterAll(() => {
    try { db.close(); } catch {}
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
  });

  it('returns null when no contact info and low intent', () => {
    const service = new LeadService(repo);
    const result = service.upsertLead({
      tenantId: 't-svc', sessionId: 's-svc-1', leadScore: 10, source: 'chat',
    });
    expect(result).toBeNull();
  });

  it('captures high intent lead without contact details', () => {
    const service = new LeadService(repo);
    const result = service.upsertLead({
      tenantId: 't-svc', sessionId: 's-svc-2', leadScore: 75, source: 'chat',
    });
    expect(result).not.toBeNull();
    expect(result!.lead.qualificationStatus).toBe('sales_qualified');
    expect(result!.isNew).toBe(true);
  });

  it('invokes onLeadCaptured and onLeadQualified hooks', () => {
    const captured: string[] = [];
    const qualified: string[] = [];
    const service = new LeadService(repo, {
      onLeadCaptured: (lead) => captured.push(lead.id),
      onLeadQualified: (lead) => qualified.push(lead.id),
    });
    const result = service.upsertLead({
      tenantId: 't-svc', sessionId: 's-svc-3', email: 'hot@test.com',
      leadScore: 90, buyingIntent: 'high', source: 'chat',
    });
    expect(result!.isNew).toBe(true);
    expect(captured).toEqual([result!.lead.id]);
    expect(qualified).toEqual([result!.lead.id]);
  });

  it('does not re-fire qualified hook on unchanged status', () => {
    let qualifiedCount = 0;
    const service = new LeadService(repo, {
      onLeadQualified: () => qualifiedCount++,
    });
    service.upsertLead({
      tenantId: 't-svc', sessionId: 's-svc-3', email: 'hot@test.com',
      leadScore: 92, buyingIntent: 'high', source: 'chat',
    });
    expect(qualifiedCount).toBe(0);
  });

  it('merges extracted contact details via captureFromMessage', () => {
    const service = new LeadService(repo);
    const result = service.captureFromMessage({
      tenantId: 't-svc', sessionId: 's-svc-4',
      extracted: { email: 'jane@corp.io', name: 'Jane', company: 'Corp Inc' },
      leadScore: 50, source: 'chat',
    });
    expect(result).not.toBeNull();
    expect(result!.lead.email).toBe('jane@corp.io');
    expect(result!.lead.company).toBe('Corp Inc');
    expect(result!.lead.qualificationStatus).toBe('marketing_qualified');
  });
});
