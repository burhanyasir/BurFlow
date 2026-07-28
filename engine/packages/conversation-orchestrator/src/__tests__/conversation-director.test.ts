import { describe, it, expect } from 'vitest';
import { processConversationDirector, ConversationStrategy } from '../conversation-director';
import { createMemory, markTopicExplained, isTopicExplained, CustomerIntent, FunnelStageExtended, ConversationGoal, DiscernedTopic } from '../conversation-memory';
import { ConversationIntelligenceResult } from '../conversation-intelligence-types';
import { ConversationPlan } from '../conversation-planner';
import { FunnelStage } from '../types';
import { processConversationBrain } from '../conversation-brain';

function makeCIResult(overrides?: Partial<ConversationIntelligenceResult>): ConversationIntelligenceResult {
  return {
    responseText: '',
    leadScore: { overallScore: 50 },
    conversationScore: { overallScore: 50 },
    sentiment: { polarity: 0, frustration: 'low', urgency: 'low', trend: 'stable' },
    abandonmentRisk: { level: 'low', score: 0 },
    repetition: { hasRepetition: false, count: 0, topics: [] },
    escalation: { shouldEscalate: false, urgency: 'low' },
    routingDecision: { decision: 'assistant', confidence: 1, label: '' },
    trustSignal: { shouldInject: false },
    buyingIntent: { hasBuyingIntent: false, confidence: 0 },
    objection: { isObjection: false, category: 'none', groundedAnswer: '', sources: [] },
    qualification: { questionsAskedCount: 0, completed: false },
    qualificationProgress: 0,
    persona: { persona: 'unknown', confidence: 0, reasoning: '' },
    funnelStage: 'greeting' as FunnelStage,
    cta: { primaryCTA: 'none', label: '', link: '' },
    quickReplies: [],
    uiState: { buttons: [], suggestedActions: [] },
    sources: [],
    isFallback: false,
    turnCount: 0,
    ...overrides,
  };
}

function makePlan(overrides?: Partial<ConversationPlan>): ConversationPlan {
  const base: ConversationPlan = {
    customerIntent: 'learning' as CustomerIntent,
    funnelStage: 'interest' as FunnelStageExtended,
    goal: 'answer_question' as ConversationGoal,
    topicsToDiscuss: [] as DiscernedTopic[],
    missingQualification: [] as string[],
    constraints: {
      avoidTopics: [] as DiscernedTopic[],
      avoidCTAs: [] as string[],
      useTrustSignal: false,
      tone: 'casual' as 'casual' | 'professional' | 'empathic' | 'urgent',
    },
  };
  if (!overrides) return base;
  return {
    ...base,
    ...overrides,
    constraints: { ...base.constraints, ...(overrides.constraints || {}) },
  };
}

// ============================================================================
// AGENDA MANAGEMENT
// ============================================================================

describe('Agenda Management', () => {
  it('starts with empty agenda for new conversation', () => {
    const mem = createMemory();
    const strategy = processConversationDirector('Tell me about features', mem, makeCIResult(), makePlan({ goal: 'answer_question' }));
    expect(strategy.agenda).toBeDefined();
    expect(strategy.agenda.completedTopics).toEqual([]);
  });

  it('tracks explained topics in agenda lifecycle', () => {
    const mem = createMemory();
    markTopicExplained(mem, 'features');
    markTopicExplained(mem, 'pricing');
    const strategy = processConversationDirector('Tell me about security', mem, makeCIResult(), makePlan());
    const features = strategy.agenda.topicLifecycles.find(l => l.topic === 'features');
    const pricing = strategy.agenda.topicLifecycles.find(l => l.topic === 'pricing');
    expect(features?.status).toBe('explained');
    expect(pricing?.status).toBe('explained');
    expect(features?.explainedCount).toBe(1);
  });

  it('lists upcoming topics not yet discussed', () => {
    const mem = createMemory({ turnCount: 3 });
    markTopicExplained(mem, 'features');
    const strategy = processConversationDirector('Tell me more', mem, makeCIResult(), makePlan());
    expect(strategy.agenda.upcomingTopics).toContain('pricing');
    expect(strategy.agenda.upcomingTopics).not.toContain('features');
  });

  it('sets currentTopic from memory', () => {
    const mem = createMemory({ currentTopic: 'pricing', turnCount: 3 });
    const strategy = processConversationDirector('Tell me more about pricing', mem, makeCIResult(), makePlan());
    expect(strategy.agenda.currentTopic).toBe('pricing');
  });

  it('includes new topics from message as follow-up', () => {
    const mem = createMemory({ turnCount: 2 });
    const strategy = processConversationDirector('What about security?', mem, makeCIResult(), makePlan());
    expect(strategy.topicToAnswer).toBe('security');
  });
});

// ============================================================================
// TOPIC REPETITION PREVENTION
// ============================================================================

describe('Topic Repetition Prevention', () => {
  it('does not propose already-explained topic as followUpTopic', () => {
    const mem = createMemory({ turnCount: 5 });
    markTopicExplained(mem, 'features');
    const strategy = processConversationDirector('Tell me about pricing', mem, makeCIResult(), makePlan());
    expect(strategy.followUpTopic).not.toBe('features');
  });

  it('allows re-answering a topic if user explicitly asks again', () => {
    const mem = createMemory({ turnCount: 5 });
    markTopicExplained(mem, 'features');
    const strategy = processConversationDirector('Tell me more about features', mem, makeCIResult(), makePlan());
    expect(strategy.topicToAnswer).toBe('features');
  });

  it('moves topic to completed when user shifts to new topic', () => {
    const mem = createMemory({ currentTopic: 'features', turnCount: 5 });
    markTopicExplained(mem, 'features');
    const strategy = processConversationDirector('What about pricing?', mem, makeCIResult(), makePlan());
    expect(strategy.agenda.completedTopics).toContain('features');
  });
});

// ============================================================================
// PENDING QUESTION HANDLING
// ============================================================================

describe('Pending Question Handling', () => {
  it('detects unanswered questions from recent turns', () => {
    const mem = createMemory({ turnCount: 3 });
    mem.turns.push({
      turnNumber: 2,
      message: 'How does security work?',
      response: 'We have security features.',
      customerIntent: 'learning',
      goal: 'answer_question',
      funnelStage: 'interest',
      timestamp: Date.now(),
    });
    const strategy = processConversationDirector('ok', mem, makeCIResult(), makePlan());
    expect(strategy.pendingQuestions.length).toBeGreaterThanOrEqual(1);
    expect(strategy.pendingQuestions[0].answered).toBe(true);
  });

  it('does not push qualification when pending questions exist', () => {
    const mem = createMemory({ turnCount: 4 });
    mem.turns.push({
      turnNumber: 3,
      message: 'How does security work?',
      response: 'We have security features.',
      customerIntent: 'learning',
      goal: 'answer_question',
      funnelStage: 'interest',
      timestamp: Date.now(),
    });
    const strategy = processConversationDirector('ok', mem, makeCIResult(), makePlan({ missingQualification: ['company size'] }));
    expect(strategy.qualificationQuestion).toBeNull();
  });

  it('does not suggest follow-up topic when pending questions exist', () => {
    const mem = createMemory({ turnCount: 4 });
    mem.turns.push({
      turnNumber: 3,
      message: 'Tell me about the API?',
      response: 'Thanks for your question.',
      customerIntent: 'learning',
      goal: 'answer_question',
      funnelStage: 'interest',
      timestamp: Date.now(),
    });
    const strategy = processConversationDirector('ok', mem, makeCIResult(), makePlan());
    expect(strategy.followUpTopic).toBeNull();
  });
});

// ============================================================================
// AGENDA PROGRESSION
// ============================================================================

describe('Agenda Progression', () => {
  it('proposes next unhandled topic in order', () => {
    const mem = createMemory({ turnCount: 3 });
    markTopicExplained(mem, 'features');
    markTopicExplained(mem, 'pricing');
    const strategy = processConversationDirector('Tell me more', mem, makeCIResult(), makePlan());
    expect(strategy.followUpTopic).toBeTruthy();
    expect(strategy.agenda.upcomingTopics).not.toContain('features');
    expect(strategy.agenda.upcomingTopics).not.toContain('pricing');
  });

  it('resets currentTopic when user shifts topics', () => {
    const mem = createMemory({ currentTopic: 'pricing', turnCount: 5 });
    markTopicExplained(mem, 'pricing');
    const strategy = processConversationDirector('What about security?', mem, makeCIResult(), makePlan());
    expect(strategy.topicToAnswer).toBe('security');
  });

  it('tracks topic lifecycle through multiple turns', () => {
    const mem = createMemory({ turnCount: 5 });
    markTopicExplained(mem, 'features');
    markTopicExplained(mem, 'pricing');
    markTopicExplained(mem, 'security');
    markTopicExplained(mem, 'integrations');
    const strategy = processConversationDirector('Tell me about the API', mem, makeCIResult(), makePlan());
    expect(strategy.topicToAnswer).toBe('api');
  });
});

// ============================================================================
// QUALIFICATION TIMING
// ============================================================================

describe('Qualification Timing', () => {
  it('does not ask qualification on first non-greeting turn', () => {
    const mem = createMemory({ turnCount: 1 });
    const strategy = processConversationDirector('Tell me about features', mem, makeCIResult(), makePlan({ missingQualification: ['company size'] }));
    expect(strategy.qualificationQuestion).toBeNull();
  });

  it('asks qualification after enough turns when field is missing', () => {
    const mem = createMemory({ turnCount: 4 });
    mem.turns.push(
      { turnNumber: 1, message: 'hi', response: 'hi', customerIntent: 'greeting', goal: 'build_trust', funnelStage: 'greeting', timestamp: Date.now() },
      { turnNumber: 2, message: 'Tell me about features', response: 'Here are features.', customerIntent: 'learning', goal: 'answer_question', funnelStage: 'interest', timestamp: Date.now() },
      { turnNumber: 3, message: 'What about pricing?', response: 'Pricing starts at $29.', customerIntent: 'learning', goal: 'answer_question', funnelStage: 'interest', timestamp: Date.now() },
    );
    const strategy = processConversationDirector('Tell me about pricing', mem, makeCIResult(), makePlan({ missingQualification: ['company size'] }));
    expect(strategy.qualificationQuestion).toBeTruthy();
  });

  it('does not ask qualification after it is completed', () => {
    const mem = createMemory({ turnCount: 3, qualificationCollected: { questionsAskedCount: 6, completed: true } });
    mem.qualificationCollected.completed = true;
    const strategy = processConversationDirector('Tell me about features', mem, makeCIResult(), makePlan({ missingQualification: [] }));
    expect(strategy.qualificationQuestion).toBeNull();
  });

  it('does not ask qualification twice in a row', () => {
    const mem = createMemory({ turnCount: 3, lastGoal: 'qualify' });
    mem.turns.push(
      { turnNumber: 1, message: 'hi', response: 'hi', customerIntent: 'greeting', goal: 'build_trust', funnelStage: 'greeting', timestamp: Date.now() },
      { turnNumber: 2, message: 'Tell me about features', response: 'Here are features.', customerIntent: 'learning', goal: 'qualify', funnelStage: 'interest', timestamp: Date.now() },
    );
    const strategy = processConversationDirector('ok', mem, makeCIResult(), makePlan({ missingQualification: ['company size'] }));
    expect(strategy.qualificationQuestion).toBeNull();
  });

  it('includes qualification question text in strategy', () => {
    const mem = createMemory({ turnCount: 4 });
    mem.turns.push(
      { turnNumber: 1, message: 'hi', response: 'hi', customerIntent: 'greeting', goal: 'build_trust', funnelStage: 'greeting', timestamp: Date.now() },
      { turnNumber: 2, message: 'Features?', response: 'Features.', customerIntent: 'learning', goal: 'answer_question', funnelStage: 'interest', timestamp: Date.now() },
      { turnNumber: 3, message: 'Pricing?', response: 'Pricing.', customerIntent: 'learning', goal: 'answer_question', funnelStage: 'interest', timestamp: Date.now() },
    );
    const strategy = processConversationDirector('Tell me more', mem, makeCIResult(), makePlan({ missingQualification: ['company size'] }));
    expect(strategy.qualificationQuestion).toBeTruthy();
    expect(strategy.qualificationQuestion).toContain('company');
  });
});

// ============================================================================
// CTA TIMING
// ============================================================================

describe('CTA Timing', () => {
  it('returns none for qualification goal', () => {
    const strategy = processConversationDirector('Tell me about features', createMemory({ turnCount: 2 }), makeCIResult(), makePlan({ goal: 'qualify', funnelStage: 'interest' }));
    expect(strategy.cta).toBe('none');
  });

  it('returns none for finish_conversation goal', () => {
    const strategy = processConversationDirector('Bye', createMemory({ turnCount: 5 }), makeCIResult(), makePlan({ goal: 'finish_conversation', funnelStage: 'decision' }));
    expect(strategy.cta).toBe('none');
  });

  it('returns strong for close_trial goal', () => {
    const strategy = processConversationDirector('I want to try it', createMemory({ turnCount: 5 }), makeCIResult(), makePlan({ goal: 'close_trial', funnelStage: 'purchase_intent' }));
    expect(strategy.cta).toBe('strong');
  });

  it('returns strong for schedule_demo goal', () => {
    const strategy = processConversationDirector('I want a demo', createMemory({ turnCount: 5 }), makeCIResult(), makePlan({ goal: 'schedule_demo', funnelStage: 'purchase_intent' }));
    expect(strategy.cta).toBe('strong');
  });

  it('returns soft for interest stage', () => {
    const strategy = processConversationDirector('Tell me about features', createMemory({ turnCount: 2 }), makeCIResult(), makePlan({ funnelStage: 'interest' }));
    expect(strategy.cta).toBe('soft');
  });

  it('returns strong for purchase_intent stage', () => {
    const strategy = processConversationDirector('I am ready to buy', createMemory({ turnCount: 5 }), makeCIResult(), makePlan({ funnelStage: 'purchase_intent' }));
    expect(strategy.cta).toBe('strong');
  });

  it('returns none for low-information early conversation', () => {
    const strategy = processConversationDirector('Hi', createMemory({ turnCount: 1 }), makeCIResult(), makePlan({ funnelStage: 'greeting' }));
    expect(strategy.cta).toBe('none');
  });
});

// ============================================================================
// LOOP PREVENTION
// ============================================================================

describe('Loop Prevention', () => {
  it('detects when same goal repeats 4+ times', () => {
    const mem = createMemory({ turnCount: 6 });
    for (let i = 0; i < 5; i++) {
      mem.turns.push({
        turnNumber: i + 1,
        message: `message ${i}`,
        response: `response ${i}`,
        customerIntent: 'learning',
        goal: 'answer_question',
        funnelStage: 'interest',
        timestamp: Date.now(),
      });
    }
    const strategy = processConversationDirector('Tell me about features', mem, makeCIResult(), makePlan({ goal: 'answer_question', funnelStage: 'interest' }));
    expect(strategy.primaryGoal).not.toBe('answer_question');
    expect(strategy.reasoning.some(r => r.includes('Loop'))).toBe(true);
  });

  it('does not flag loop with diverse goals', () => {
    const mem = createMemory({ turnCount: 6 });
    const goals: ConversationGoal[] = ['build_trust', 'answer_question', 'qualify', 'advance_funnel', 'handle_objection'];
    for (let i = 0; i < 5; i++) {
      mem.turns.push({
        turnNumber: i + 1,
        message: `message ${i}`,
        response: `response ${i}`,
        customerIntent: 'learning',
        goal: goals[i % goals.length],
        funnelStage: 'interest',
        timestamp: Date.now(),
      });
    }
    const strategy = processConversationDirector('Tell me about features', mem, makeCIResult(), makePlan({ goal: 'answer_question', funnelStage: 'interest' }));
    expect(strategy.reasoning.some(r => r.includes('Loop'))).toBe(false);
  });

  it('does not flag loop with fewer than 3 turns', () => {
    const mem = createMemory({ turnCount: 2 });
    const strategy = processConversationDirector('Tell me about features', mem, makeCIResult(), makePlan({ goal: 'answer_question' }));
    expect(strategy.reasoning.some(r => r.includes('Loop'))).toBe(false);
  });
});

// ============================================================================
// REASONING
// ============================================================================

describe('Reasoning', () => {
  it('includes strategy reasoning entries', () => {
    const mem = createMemory({ turnCount: 3 });
    const strategy = processConversationDirector('Tell me about pricing', mem, makeCIResult(), makePlan({ goal: 'answer_question' }));
    expect(strategy.reasoning.length).toBeGreaterThanOrEqual(1);
    expect(strategy.reasoning[0]).toContain('Goal');
  });

  it('explains qualification decision', () => {
    const mem = createMemory({ turnCount: 4 });
    mem.turns.push(
      { turnNumber: 1, message: 'hi', response: 'hi', customerIntent: 'greeting', goal: 'build_trust', funnelStage: 'greeting', timestamp: Date.now() },
      { turnNumber: 2, message: 'Features?', response: 'Features.', customerIntent: 'learning', goal: 'answer_question', funnelStage: 'interest', timestamp: Date.now() },
      { turnNumber: 3, message: 'Pricing?', response: 'Pricing.', customerIntent: 'learning', goal: 'answer_question', funnelStage: 'interest', timestamp: Date.now() },
    );
    const strategy = processConversationDirector('Tell me more', mem, makeCIResult(), makePlan({ missingQualification: ['company size'] }));
    expect(strategy.reasoning.some(r => r.includes('Qualification'))).toBe(true);
  });
});

// ============================================================================
// MULTI-TOPIC CONVERSATIONS
// ============================================================================

describe('Multi-Topic Conversations', () => {
  it('detects multiple topics from user message', () => {
    const mem = createMemory({ turnCount: 3 });
    const strategy = processConversationDirector('Tell me about features and pricing', mem, makeCIResult(), makePlan());
    expect(strategy.topicToAnswer).toBeTruthy();
  });

  it('detects topic from user message', () => {
    const mem = createMemory({ turnCount: 3 });
    const strategy = processConversationDirector('What about security?', mem, makeCIResult(), makePlan());
    expect(strategy.topicToAnswer).toBe('security');
  });
});

// ============================================================================
// RETURNING USERS
// ============================================================================

describe('Returning Users', () => {
  it('preserves agenda for returning user', () => {
    const mem = createMemory({ turnCount: 5 });
    markTopicExplained(mem, 'features');
    markTopicExplained(mem, 'pricing');
    mem.currentTopic = 'pricing';
    const strategy = processConversationDirector('Hi, I am back', mem, makeCIResult(), makePlan());
    expect(strategy.agenda.currentTopic).toBe('pricing');
    expect(strategy.agenda.completedTopics).not.toContain('pricing');
  });

  it('handles user jumping between topics without losing agenda', () => {
    const mem = createMemory({ currentTopic: 'features', turnCount: 8 });
    markTopicExplained(mem, 'features');
    markTopicExplained(mem, 'pricing');
    const strategy = processConversationDirector('Actually, tell me about your security', mem, makeCIResult(), makePlan());
    expect(strategy.topicToAnswer).toBe('security');
  });
});

// ============================================================================
// RESPONSE LENGTH
// ============================================================================

describe('Response Length', () => {
  it('returns short for build_trust goal', () => {
    const strategy = processConversationDirector('Hi', createMemory({ turnCount: 1 }), makeCIResult(), makePlan({ goal: 'build_trust' }));
    expect(strategy.responseLength).toBe('short');
  });

  it('returns short for qualify goal', () => {
    const strategy = processConversationDirector('Tell me about features', createMemory({ turnCount: 2 }), makeCIResult(), makePlan({ goal: 'qualify' }));
    expect(strategy.responseLength).toBe('short');
  });

  it('returns detailed for comparing intent', () => {
    const strategy = processConversationDirector('How do you compare to Zendesk?', createMemory({ turnCount: 5 }), makeCIResult(), makePlan({ customerIntent: 'comparing', goal: 'answer_question' }));
    expect(strategy.responseLength).toBe('detailed');
  });
});

// ============================================================================
// PROFILE CONFIDENCE
// ============================================================================

describe('Profile Confidence', () => {
  it('tracks industry confidence', () => {
    const mem = createMemory({ industry: 'tech', turnCount: 5 });
    mem.turns.push(
      { turnNumber: 1, message: 'We are a tech company', response: 'Great', customerIntent: 'learning', goal: 'build_trust', funnelStage: 'interest', timestamp: Date.now() },
      { turnNumber: 2, message: 'Our tech stack needs AI', response: 'We can help', customerIntent: 'learning', goal: 'answer_question', funnelStage: 'interest', timestamp: Date.now() },
      { turnNumber: 3, message: 'More tech questions', response: 'Sure', customerIntent: 'learning', goal: 'answer_question', funnelStage: 'interest', timestamp: Date.now() },
    );
    const strategy = processConversationDirector('Tell me about pricing', mem, makeCIResult(), makePlan());
    expect(strategy.profileConfidence.industry.value).toBe('tech');
  });

  it('tracks persona confidence', () => {
    const mem = createMemory({ persona: 'enterprise', turnCount: 3 });
    const strategy = processConversationDirector('Tell me about features', mem, makeCIResult(), makePlan());
    expect(strategy.profileConfidence.persona.value).toBe('enterprise');
  });

  it('shows low confidence for unset fields', () => {
    const mem = createMemory({ turnCount: 1 });
    const strategy = processConversationDirector('Hi', mem, makeCIResult(), makePlan());
    expect(strategy.profileConfidence.companySize.value).toBeNull();
    expect(strategy.profileConfidence.companySize.confidence).toBe('low');
  });
});

// ============================================================================
// DETERMINISTIC OUTPUT
// ============================================================================

describe('Deterministic Output', () => {
  it('produces same strategy for same inputs', () => {
    const mem = createMemory({ turnCount: 3, industry: 'tech', persona: 'startup' });
    markTopicExplained(mem, 'features');
    const ci = makeCIResult();
    const plan = makePlan({ goal: 'answer_question', missingQualification: ['company size'] });
    const r1 = processConversationDirector('Tell me about pricing', mem, ci, plan);
    const r2 = processConversationDirector('Tell me about pricing', mem, ci, plan);
    expect(r1.primaryGoal).toBe(r2.primaryGoal);
    expect(r1.cta).toBe(r2.cta);
    expect(r1.responseLength).toBe(r2.responseLength);
    expect(r1.tone).toBe(r2.tone);
    expect(r1.qualificationQuestion).toBe(r2.qualificationQuestion);
  });

  it('produces same topicToAnswer for same topic mentions', () => {
    const mem = createMemory({ turnCount: 3 });
    const r1 = processConversationDirector('Tell me about security', mem, makeCIResult(), makePlan());
    const r2 = processConversationDirector('Tell me about security', mem, makeCIResult(), makePlan());
    expect(r1.topicToAnswer).toBe(r2.topicToAnswer);
    expect(r1.topicToAnswer).toBe('security');
  });

  it('produces same agenda for same memory state', () => {
    const mem1 = createMemory({ turnCount: 5 });
    markTopicExplained(mem1, 'features');
    markTopicExplained(mem1, 'pricing');
    const mem2 = createMemory({ turnCount: 5 });
    markTopicExplained(mem2, 'features');
    markTopicExplained(mem2, 'pricing');
    const s1 = processConversationDirector('Tell me about security', mem1, makeCIResult(), makePlan());
    const s2 = processConversationDirector('Tell me about security', mem2, makeCIResult(), makePlan());
    expect(s1.agenda.completedTopics).toEqual(s2.agenda.completedTopics);
    expect(s1.agenda.upcomingTopics).toEqual(s2.agenda.upcomingTopics);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  it('handles empty message without topics', () => {
    const mem = createMemory({ turnCount: 3 });
    const strategy = processConversationDirector('ok', mem, makeCIResult(), makePlan());
    expect(strategy.topicToAnswer).toBeDefined();
    expect(strategy.primaryGoal).toBeDefined();
  });

  it('handles very long conversation without losing agenda', () => {
    const mem = createMemory({ turnCount: 30 });
    const explainedTopics: DiscernedTopic[] = ['features', 'pricing', 'security', 'integrations', 'api', 'roi', 'soc2'];
    for (const t of explainedTopics) markTopicExplained(mem, t);
    const strategy = processConversationDirector('Tell me about the API', mem, makeCIResult(), makePlan());
    expect(strategy.agenda.completedTopics.length).toBeGreaterThanOrEqual(6);
    expect(strategy.agenda.upcomingTopics.length).toBeGreaterThanOrEqual(1);
  });

  it('handles user asking about already explained topic', () => {
    const mem = createMemory({ currentTopic: 'pricing', turnCount: 5 });
    markTopicExplained(mem, 'pricing');
    const strategy = processConversationDirector('Tell me about pricing again', mem, makeCIResult(), makePlan({ goal: 'answer_question' }));
    expect(strategy.topicToAnswer).toBe('pricing');
    expect(strategy.primaryGoal).toBe('answer_question');
  });
});

// ============================================================================
// BRAIN INTEGRATION
// ============================================================================

describe('Brain Integration', () => {
  it('returns strategy field in brain output', () => {
    const result = processConversationBrain({
      message: 'Tell me about features',
      responseText: 'We have AI-powered features.',
      legacyMemory: {
        turns: [],
        persona: 'unknown',
        funnelStage: 'greeting',
        buyingIntentDetected: false,
        objections: [],
        qualificationState: { questionsAskedCount: 0, completed: false },
        repeatedPhraseCount: 0,
        topics: [],
      },
    });
    expect(result.strategy).toBeDefined();
    expect(result.strategy?.primaryGoal).toBeDefined();
    expect(result.strategy?.agenda).toBeDefined();
    expect(result.strategy?.reasoning.length).toBeGreaterThanOrEqual(1);
  });
});
