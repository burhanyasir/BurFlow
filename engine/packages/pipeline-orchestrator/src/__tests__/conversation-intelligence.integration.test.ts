import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { enrichWithConversationIntelligence } from '../conversation-intelligence';
import { SqliteSessionStore } from '@conversation-engine/session-store';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(__dirname, '__intel_test_data__');
const TMP_DB = join(TEST_DIR, 'intel.db');

describe('enrichWithConversationIntelligence', () => {
  let sessionStore: SqliteSessionStore;
  let sessionId: string;

  beforeAll(async () => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
    sessionStore = new SqliteSessionStore(TMP_DB);
    const session = await sessionStore.createSession('test-tenant', 1);
    sessionId = session.sessionId;
  });

  afterAll(() => {
    sessionStore.close();
    try { if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true }); } catch {}
  });

  it('enriches response with all conversation intelligence fields', async () => {
    const pipelineResponse = {
      response: 'Here are our pricing plans.',
      turnId: sessionId,
      latencyMs: 150,
    };

    const enriched = await enrichWithConversationIntelligence(
      pipelineResponse,
      'What are your pricing tiers?',
      'test-tenant',
      sessionStore,
      sessionId,
    );

    // Backward compatible
    expect(enriched.response).toBe('Here are our pricing plans.');
    expect(enriched.turnId).toBe(sessionId);
    expect(enriched.latencyMs).toBe(150);

    // New intelligence fields present
    expect(enriched.conversationIntelligence).toBeDefined();
    expect(enriched.conversationIntelligence!.leadScore).toBeGreaterThanOrEqual(0);
    expect(enriched.conversationIntelligence!.conversationScore).toBeGreaterThanOrEqual(0);
    expect(enriched.conversationIntelligence!.sentiment.polarity).toBeDefined();
    expect(enriched.conversationIntelligence!.sentiment.trend).toMatch(/^(improving|declining|stable)$/);
    expect(enriched.conversationIntelligence!.abandonmentRisk.level).toMatch(/^(low|medium|high)$/);
    expect(enriched.conversationIntelligence!.repetition.hasRepetition).toBe(false);
    expect(enriched.conversationIntelligence!.escalation.shouldEscalate).toBe(false);
    expect(enriched.conversationIntelligence!.routingDecision.decision).toBeDefined();
    expect(enriched.conversationIntelligence!.buyingIntent.hasBuyingIntent).toBe(true);
    expect(enriched.conversationIntelligence!.qualification.progress).toBeGreaterThanOrEqual(0);

    expect(enriched.cta.primaryCTA).toBeDefined();
    expect(enriched.cta.label).toBeDefined();
    expect(enriched.cta.link).toBeDefined();
    expect(enriched.quickReplies.length).toBeGreaterThan(0);
  });

  it('detects buying intent across multiple turns', async () => {
    const pipelineResponse = {
      response: 'Thank you for your interest!',
      turnId: sessionId,
      latencyMs: 100,
    };

    // First message: pricing inquiry
    const enriched1 = await enrichWithConversationIntelligence(
      pipelineResponse,
      'What are your pricing tiers?',
      'test-tenant',
      sessionStore,
      sessionId,
    );
    expect(enriched1.conversationIntelligence!.buyingIntent.hasBuyingIntent).toBe(true);

    // Second message: ready to buy
    const enriched2 = await enrichWithConversationIntelligence(
      { ...pipelineResponse, response: 'Let me help you sign up!' },
      'I am ready to buy the professional plan',
      'test-tenant',
      sessionStore,
      sessionId,
    );
    expect(enriched2.conversationIntelligence!.buyingIntent.hasBuyingIntent).toBe(true);
    expect(enriched2.conversationIntelligence!.buyingIntent.targetTier).toBe('professional');
    expect(enriched2.conversationIntelligence!.leadScore).toBeGreaterThan(50);
  });

  it('tracks sentiment trend across multiple turns', async () => {
    const s = await sessionStore.createSession('test-tenant', 1);
    const sid = s.sessionId;

    const pipelineResponse = {
      response: 'I understand.',
      turnId: sid,
      latencyMs: 50,
    };

    // First: negative
    await enrichWithConversationIntelligence(
      { ...pipelineResponse, response: 'Sorry to hear that.' },
      'This is terrible and not working at all',
      'test-tenant',
      sessionStore,
      sid,
    );

    // Second: negative again
    await enrichWithConversationIntelligence(
      { ...pipelineResponse, response: 'Let me help resolve this.' },
      'I am still frustrated, this is bad',
      'test-tenant',
      sessionStore,
      sid,
    );

    // Third: positive
    const enriched = await enrichWithConversationIntelligence(
      { ...pipelineResponse, response: 'Great, glad to help!' },
      'That works perfectly, thank you! Excellent support',
      'test-tenant',
      sessionStore,
      sid,
    );

    expect(enriched.conversationIntelligence!.sentiment.polarity).toBeGreaterThan(-0.2);
  });

  it('includes quick replies for each response', async () => {
    const pipelineResponse = {
      response: 'Here is the information you requested.',
      turnId: sessionId,
      latencyMs: 75,
    };

    const enriched = await enrichWithConversationIntelligence(
      pipelineResponse,
      'How does the grounding engine work?',
      'test-tenant',
      sessionStore,
      sessionId,
    );

    expect(enriched.quickReplies.length).toBeGreaterThanOrEqual(1);
    for (const qr of enriched.quickReplies) {
      expect(qr.id).toBeDefined();
      expect(qr.label).toBeDefined();
      expect(qr.action).toBeDefined();
      expect(qr.payload).toBeDefined();
    }
  });
});
