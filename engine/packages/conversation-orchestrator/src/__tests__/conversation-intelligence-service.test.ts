import { describe, it, expect } from 'vitest';
import { processConversationIntelligence, ConversationIntelligenceMemory, PersonaType } from '..';

function makeMemory(overrides?: Partial<ConversationIntelligenceMemory>): ConversationIntelligenceMemory {
  return {
    turns: [],
    persona: 'unknown' as PersonaType,
    funnelStage: 'greeting',
    buyingIntentDetected: false,
    objections: [],
    qualificationState: { questionsAskedCount: 0, completed: false },
    repeatedPhraseCount: 0,
    topics: [],
    ...overrides,
  };
}

describe('processConversationIntelligence', () => {
  it('returns lead score for a first message', () => {
    const memory = makeMemory();
    const { result, memory: updated } = processConversationIntelligence({
      message: 'Hello, I need help with pricing',
      responseText: 'Here is our pricing info.',
      memory,
    });
    expect(result.leadScore.overallScore).toBeGreaterThan(0);
    expect(result.leadScore.overallScore).toBeLessThanOrEqual(100);
    expect(result.conversationScore.overallScore).toBeGreaterThan(0);
    expect(result.turnCount).toBe(1);
    expect(updated.turns.length).toBe(1);
  });

  it('detects buying intent from a purchase message', () => {
    const memory = makeMemory();
    const { result } = processConversationIntelligence({
      message: 'I am ready to buy the professional plan',
      responseText: 'Great choice!',
      memory,
    });
    expect(result.buyingIntent.hasBuyingIntent).toBe(true);
    expect(result.buyingIntent.targetTier).toBe('professional');
    expect(result.leadScore.overallScore).toBeGreaterThanOrEqual(50);
  });

  it('detects sentiment polarity from positive message', () => {
    const memory = makeMemory();
    const { result } = processConversationIntelligence({
      message: 'That is great, awesome, excellent work! Thank you so much, this is perfect and very helpful.',
      responseText: 'Glad to help!',
      memory,
    });
    expect(result.sentiment.polarity).toBeGreaterThan(0);
    expect(result.sentiment.trend).toBe('stable');
  });

  it('detects negative sentiment and frustration', () => {
    const memory = makeMemory();
    const { result } = processConversationIntelligence({
      message: 'This is terrible and useless! The worst service, never works. I am very frustrated and angry.',
      responseText: 'I apologize for the issue.',
      memory,
    });
    expect(result.sentiment.polarity).toBeLessThan(0);
    expect(result.sentiment.frustration).toBe('high');
  });

  it('detects abandonment risk from hesitation phrases', () => {
    const memory = makeMemory();
    const { result } = processConversationIntelligence({
      message: "I'll think about it and get back to you",
      responseText: 'Sure, take your time!',
      memory,
    });
    expect(result.abandonmentRisk.level).toBe('high');
    expect(result.abandonmentRisk.score).toBeGreaterThanOrEqual(80);
  });

  it('detects repetition across multiple turns', () => {
    const memory = makeMemory({
      turns: [
        { message: 'How much does the professional plan cost per month?', response: 'It costs $99/mo.', polarity: 0, frustration: 0, urgency: 0, timestamp: Date.now() - 60000 },
        { message: 'Can you tell me the professional plan monthly pricing?', response: 'It is $99/mo.', polarity: 0, frustration: 0, urgency: 0, timestamp: Date.now() - 30000 },
      ],
      repeatedPhraseCount: 1,
    });

    const { result } = processConversationIntelligence({
      message: 'What are the pricing details for the professional plan each month?',
      responseText: 'The professional plan is $99 per month.',
      memory,
    });
    expect(result.repetition.hasRepetition).toBe(true);
    expect(result.repetition.count).toBeGreaterThanOrEqual(2);
  });

  it('recommends escalation for high frustration', () => {
    const memory = makeMemory({
      turns: [
        { message: 'This is terrible useless never works', response: 'Sorry', polarity: -0.5, frustration: 0.7, urgency: 0.3, timestamp: Date.now() - 60000 },
        { message: 'Not working waste of time so frustrating', response: 'Let me help', polarity: -0.6, frustration: 0.8, urgency: 0.5, timestamp: Date.now() - 30000 },
      ],
    });

    const { result } = processConversationIntelligence({
      message: 'This is terrible and not working! Useless never works waste of time.',
      responseText: 'I understand your frustration.',
      memory,
    });
    expect(result.escalation.shouldEscalate).toBe(true);
    expect(result.escalation.urgency).toBe('high');
  });

  it('computes routing decision for high buying intent', () => {
    const memory = makeMemory({
      buyingIntentDetected: true,
      funnelStage: 'purchase_intent',
    });

    const { result } = processConversationIntelligence({
      message: 'I want to buy the enterprise plan',
      responseText: 'Let me connect you with sales.',
      memory,
    });
    expect(result.routingDecision.decision).toMatch(/^(sales|enterprise_sales)$/);
    expect(result.routingDecision.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('returns quick replies based on funnel stage', () => {
    const memory = makeMemory({ funnelStage: 'evaluation' });

    const { result } = processConversationIntelligence({
      message: 'Compare your plans',
      responseText: 'Here are our plans.',
      memory,
    });
    expect(result.quickReplies.length).toBeGreaterThan(0);
    expect(result.quickReplies.some(qr => qr.payload.includes('signup') || qr.payload.includes('pricing'))).toBe(true);
  });

  it('generates trust signal for enterprise persona', () => {
    const memory = makeMemory({ persona: 'enterprise' });

    const { result } = processConversationIntelligence({
      message: 'Do you support SSO and SOC 2 compliance?',
      responseText: 'Yes, we support SAML SSO and are SOC 2 compliant.',
      memory,
    });
    expect(result.trustSignal.shouldInject).toBe(true);
  });

  it('tracks qualification progress', () => {
    const memory = makeMemory({
      qualificationState: { questionsAskedCount: 1, completed: false },
    });

    const { result } = processConversationIntelligence({
      message: 'We handle about 500-2,000 tickets a month',
      responseText: 'Based on that, our Starter plan is recommended.',
      memory,
    });
    expect(result.qualificationProgress).toBeGreaterThanOrEqual(33);
  });

  it('handles multiple sessions independently', () => {
    const session1 = makeMemory();
    const session2 = makeMemory();

    const { memory: updated1 } = processConversationIntelligence({
      message: 'Hi, I want pricing',
      responseText: 'Here is pricing.',
      memory: session1,
    });
    const { memory: updated2 } = processConversationIntelligence({
      message: 'I am having a technical issue',
      responseText: 'Let me help you.',
      memory: session2,
    });

    expect(updated1.turns.length).toBe(1);
    expect(updated2.turns.length).toBe(1);
  });

  it('returns response text matching input', () => {
    const memory = makeMemory();
    const { result } = processConversationIntelligence({
      message: 'What are your pricing tiers?',
      responseText: 'We offer Free, Starter, Professional, and Enterprise tiers.',
      memory,
    });
    expect(result.responseText).toBe('We offer Free, Starter, Professional, and Enterprise tiers.');
  });

  it('returns persona and funnel stage from analysis', () => {
    const memory = makeMemory();
    const { result } = processConversationIntelligence({
      message: 'I need your API documentation for React integration',
      responseText: 'Here are the API docs.',
      memory,
    });
    expect(result.persona.persona).toBe('developer');
    expect(result.funnelStage).toBe('interest');
  });
});
