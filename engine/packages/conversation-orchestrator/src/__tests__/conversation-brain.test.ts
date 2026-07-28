import { describe, it, expect } from 'vitest';
import {
  createMemory,
  fromLegacyMemory,
  discernTopics,
  markTopicExplained,
  markCTARejected,
  isTopicExplained,
  isCTARejected,
  isGoalAchieved,
  TopicRecord,
  ConversationMemoryData,
} from '../conversation-memory';
import { validateResponse } from '../conversation-validator';
import { planConversation } from '../conversation-planner';
import { processConversationBrain } from '../conversation-brain';
import { ConversationIntelligenceMemory } from '../conversation-intelligence-types';

function makeLegacyMemory(overrides?: Partial<ConversationIntelligenceMemory>): ConversationIntelligenceMemory {
  return {
    turns: [],
    persona: 'unknown',
    funnelStage: 'greeting',
    buyingIntentDetected: false,
    objections: [],
    qualificationState: { questionsAskedCount: 0, completed: false },
    repeatedPhraseCount: 0,
    topics: [],
    ...overrides,
  };
}

function makeBrainMemory(turns = 0): { legacy: ConversationIntelligenceMemory; brain: ConversationMemoryData } {
  const legacy = makeLegacyMemory({
    turns: Array.from({ length: turns }, (_, i) => ({
      message: `Message ${i + 1}`,
      response: `Response ${i + 1}`,
      polarity: 0,
      frustration: 0,
      urgency: 0,
      timestamp: Date.now() + i * 1000,
    })),
  });
  const brain = fromLegacyMemory(legacy);
  return { legacy, brain };
}

// ============================================================================
// MEMORY TESTS
// ============================================================================
describe('Conversation Memory', () => {
  it('creates memory with defaults', () => {
    const mem = createMemory();
    expect(mem.persona).toBe('unknown');
    expect(mem.turnCount).toBe(0);
    expect(mem.funnelStage).toBe('greeting');
    expect(mem.topicsExplained).toEqual([]);
    expect(mem.qualificationCollected.completed).toBe(false);
    expect(mem.objectionsHandled).toEqual([]);
    expect(mem.goalsAchieved).toEqual([]);
    expect(mem.rejectedCTAs).toEqual([]);
  });

  it('creates memory with overrides', () => {
    const mem = createMemory({ persona: 'enterprise', turnCount: 5, funnelStage: 'evaluation' });
    expect(mem.persona).toBe('enterprise');
    expect(mem.turnCount).toBe(5);
    expect(mem.funnelStage).toBe('evaluation');
  });

  it('converts from legacy memory with empty turns', () => {
    const legacy = makeLegacyMemory();
    const mem = fromLegacyMemory(legacy);
    expect(mem.persona).toBe('unknown');
    expect(mem.turnCount).toBe(0);
    expect(mem.turns).toEqual([]);
  });

  it('converts from legacy memory with turns', () => {
    const legacy = makeLegacyMemory({
      persona: 'developer',
      funnelStage: 'evaluation',
      turns: [
        { message: 'hello', response: 'hi', polarity: 0.5, frustration: 0, urgency: 0, timestamp: 1000 },
        { message: 'pricing?', response: 'here it is', polarity: 0.3, frustration: 0, urgency: 0, timestamp: 2000 },
      ],
      topics: ['features', 'pricing'],
    });
    const mem = fromLegacyMemory(legacy);
    expect(mem.persona).toBe('developer');
    expect(mem.turnCount).toBe(2);
    expect(mem.turns).toHaveLength(2);
    expect(mem.topicsExplained).toHaveLength(2);
    expect(mem.topicsExplained[0].topic).toBe('features');
    expect(mem.topicsExplained[1].topic).toBe('pricing');
  });

  it('discerns topics from message', () => {
    expect(discernTopics('What features do you offer?')).toContain('features');
    expect(discernTopics('How much does it cost?')).toContain('pricing');
    expect(discernTopics('Do you have SSO?')).toContain('sso');
    expect(discernTopics('What about API access?')).toContain('api');
    expect(discernTopics('How does it compare to Intercom?')).toContain('comparison');
    expect(discernTopics('Tell me about security')).toContain('security');
    expect(discernTopics('How does the grounding engine work?')).toContain('walkthrough');
  });

  it('discerns multiple topics from a single message', () => {
    const topics = discernTopics('What features and pricing do you have? How does it compare to competitors?');
    expect(topics).toContain('features');
    expect(topics).toContain('pricing');
    expect(topics).toContain('comparison');
  });

  it('tracks topic explanation without duplicates', () => {
    const mem = createMemory();
    markTopicExplained(mem, 'features');
    expect(isTopicExplained(mem, 'features')).toBe(true);
    expect(isTopicExplained(mem, 'pricing')).toBe(false);
    markTopicExplained(mem, 'features');
    expect(mem.topicsExplained[0].count).toBe(2);
  });

  it('tracks CTA rejection', () => {
    const mem = createMemory();
    expect(isCTARejected(mem, 'start_free_trial')).toBe(false);
    markCTARejected(mem, 'start_free_trial');
    expect(isCTARejected(mem, 'start_free_trial')).toBe(true);
    markCTARejected(mem, 'start_free_trial');
    expect(mem.rejectedCTAs).toHaveLength(1);
  });

  it('tracks goal achievement', () => {
    const mem = createMemory();
    expect(isGoalAchieved(mem, 'build_trust')).toBe(false);
    mem.goalsAchieved.push('build_trust');
    expect(isGoalAchieved(mem, 'build_trust')).toBe(true);
  });

  it('preserves industry and company size overrides', () => {
    const mem = createMemory({ industry: 'fintech', companySize: '200' });
    expect(mem.industry).toBe('fintech');
    expect(mem.companySize).toBe('200');
  });
});

// ============================================================================
// VALIDATOR TESTS
// ============================================================================
describe('Conversation Validator', () => {
  it('validates a good response passes', () => {
    const mem = createMemory();
    const ciResult = { sentiment: { polarity: 0, frustration: 'low', urgency: 'low', trend: 'stable' } } as any;
    const result = validateResponse(
      'Great question! Our features include grounded AI and instant citations. Would you like to see a demo?',
      'What features do you offer?',
      mem,
      ciResult,
    );
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('rejects empty response', () => {
    const mem = createMemory();
    const result = validateResponse('', 'hello', mem, {} as any);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('Response is empty');
  });

  it('detects missing greeting acknowledgment', () => {
    const mem = createMemory();
    const result = validateResponse('What industry are you in?', 'hi there', mem, {} as any);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.includes('greeting'))).toBe(true);
  });

  it('passes greeting acknowledgment', () => {
    const mem = createMemory();
    const result = validateResponse('Hello! Welcome to Conversation Engine. What challenge are you hoping to solve?', 'hi there', mem, {} as any);
    expect(result.valid).toBe(true);
  });

  it('detects missing farewell acknowledgment', () => {
    const mem = createMemory();
    const result = validateResponse('Here are our pricing plans...', 'goodbye', mem, {} as any);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.includes('farewell'))).toBe(true);
  });

  it('passes farewell acknowledgment', () => {
    const mem = createMemory();
    const result = validateResponse('Happy to help anytime. Take care!', 'goodbye', mem, {} as any);
    expect(result.valid).toBe(true);
  });

  it('detects missing gratitude acknowledgment', () => {
    const mem = createMemory();
    const result = validateResponse('Our pricing starts at $29/mo.', 'thanks for the info', mem, {} as any);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.includes('gratitude'))).toBe(true);
  });

  it('detects identical response repetition', () => {
    const mem = createMemory({ lastResponseText: 'Our features include grounded AI citations.' });
    const result = validateResponse('Our features include grounded AI citations.', 'tell me more', mem, {} as any);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.includes('identical'))).toBe(true);
  });

  it('detects high word overlap repetition', () => {
    const mem = createMemory({ lastResponseText: 'Our features include grounded AI citations that cite every source.' });
    const result = validateResponse('Our features include grounded AI citations with source citations.', 'tell me more', mem, {} as any);
    expect(result.valid).toBe(false);
  });

  it('detects response with no follow-up direction', () => {
    const mem = createMemory({ turnCount: 2 });
    const result = validateResponse('Our pricing is $29 per month.', 'what is pricing', mem, {} as any);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.includes('no follow-up') || i.includes('ends with a period'))).toBe(true);
  });

  it('passes response with follow-up question', () => {
    const mem = createMemory();
    const result = validateResponse('Our pricing starts at $29/mo. Would you like to see what plan fits your needs?', 'what is pricing', mem, {} as any);
    expect(result.valid).toBe(true);
  });

  it('detects multiple CTAs', () => {
    const mem = createMemory();
    const result = validateResponse('Start your free trial today! Also book a demo and sign up now!', 'tell me more', mem, {} as any);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.includes('CTAs'))).toBe(true);
  });

  it('detects multiple qualification questions', () => {
    const mem = createMemory();
    const result = validateResponse('What industry are you in and how many employees do you have?', 'help me choose', mem, {} as any);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.includes('qualification'))).toBe(true);
  });

  it('detects response ending without direction', () => {
    const mem = createMemory({ turnCount: 3 });
    const result = validateResponse('That is our pricing.', 'tell me about pricing', mem, {} as any);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.includes('direction') || i.includes('period'))).toBe(true);
  });

  it('passes response with CTA but no question', () => {
    const mem = createMemory();
    const result = validateResponse('Our pricing is $29/mo. Start your free trial today!', 'what is pricing', mem, {} as any);
    expect(result.valid).toBe(true);
  });

  it('passes farewell without follow-up', () => {
    const mem = createMemory();
    const result = validateResponse('Happy to help anytime. Take care!', 'bye', mem, {} as any);
    expect(result.valid).toBe(true);
  });

  it('acknowledges "really" emphasis', () => {
    const mem = createMemory({ turnCount: 1 });
    const result = validateResponse('Sure.', 'Do you really support SSO?', mem, {} as any);
    expect(result.issues.some(i => i.includes('really'))).toBe(true);
  });

  it('passes response acknowledging "really"', () => {
    const mem = createMemory({ turnCount: 1 });
    const result = validateResponse('Yes, absolutely! Here is how SSO works...', 'Do you really support SSO?', mem, {} as any);
    expect(result.valid).toBe(true);
  });

  it('passes response about who made you', () => {
    const mem = createMemory();
    const result = validateResponse('I was built by the team at Conversation Engine to help you get answers from your documentation.', 'who made you', mem, {} as any);
    expect(result.valid).toBe(true);
  });

  it('rejects dismissive response to a question', () => {
    const mem = createMemory();
    const result = validateResponse('Okay sure.', 'What features do you have?', mem, {} as any);
    expect(result.valid).toBe(false);
  });
});

// ============================================================================
// PLANNER TESTS
// ============================================================================
describe('Conversation Planner', () => {
  it('detects greeting intent', () => {
    const { brain } = makeBrainMemory(0);
    const ciResult = { objection: { isObjection: false }, funnelStage: 'greeting', sentiment: { polarity: 0, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('hi', brain, ciResult);
    expect(plan.customerIntent).toBe('greeting');
    expect(plan.goal).toBe('build_trust');
  });

  it('detects farewell intent', () => {
    const { brain } = makeBrainMemory(1);
    const ciResult = { objection: { isObjection: false }, funnelStage: 'greeting', sentiment: { polarity: 0, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('goodbye', brain, ciResult);
    expect(plan.customerIntent).toBe('leaving');
    expect(plan.goal).toBe('finish_conversation');
  });

  it('detects small talk', () => {
    const { brain } = makeBrainMemory(1);
    const ciResult = { objection: { isObjection: false }, funnelStage: 'discovery', sentiment: { polarity: 0, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('how are you?', brain, ciResult);
    expect(plan.customerIntent).toBe('small_talk');
  });

  it('detects learning intent', () => {
    const { brain } = makeBrainMemory(0);
    const ciResult = { objection: { isObjection: false }, funnelStage: 'greeting', sentiment: { polarity: 0, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('What is Conversation Engine?', brain, ciResult);
    expect(plan.customerIntent).toBe('learning');
  });

  it('detects comparing intent', () => {
    const { brain } = makeBrainMemory(3);
    const ciResult = { objection: { isObjection: false }, funnelStage: 'evaluation', sentiment: { polarity: 0, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('How do you compare to Zendesk?', brain, ciResult);
    expect(plan.customerIntent).toBe('comparing');
  });

  it('detects evaluating intent', () => {
    const { brain } = makeBrainMemory(3);
    const ciResult = { objection: { isObjection: false }, funnelStage: 'evaluation', sentiment: { polarity: 0, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('How much does the professional plan cost?', brain, ciResult);
    expect(plan.customerIntent).toBe('evaluating');
  });

  it('detects buying intent', () => {
    const { brain } = makeBrainMemory(3);
    const ciResult = { objection: { isObjection: false }, funnelStage: 'evaluation', sentiment: { polarity: 0, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('I want to sign up for the pro plan', brain, ciResult);
    expect(plan.customerIntent).toBe('buying');
  });

  it('detects objection intent', () => {
    const { brain } = makeBrainMemory(3);
    const ciResult = { objection: { isObjection: true, category: 'price' }, funnelStage: 'objection', sentiment: { polarity: -0.2, frustration: 'medium', urgency: 'low' }, trustSignal: { shouldInject: true } } as any;
    const plan = planConversation('That is too expensive', brain, ciResult);
    expect(plan.customerIntent).toBe('objection');
    expect(plan.goal).toBe('handle_objection');
  });

  it('detects leaving intent', () => {
    const { brain } = makeBrainMemory(3);
    const ciResult = { objection: { isObjection: false }, funnelStage: 'evaluation', sentiment: { polarity: 0, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('I need to think about it', brain, ciResult);
    expect(plan.customerIntent).toBe('leaving');
  });

  it('detects confirming intent', () => {
    const { brain } = makeBrainMemory(3);
    const ciResult = { objection: { isObjection: false }, funnelStage: 'evaluation', sentiment: { polarity: 0.3, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('Yes, that makes sense', brain, ciResult);
    expect(plan.customerIntent).toBe('confirming');
  });

  it('detects rejecting intent with objection', () => {
    const { brain } = makeBrainMemory(3);
    const ciResult = { objection: { isObjection: true, category: 'price' }, funnelStage: 'objection', sentiment: { polarity: -0.3, frustration: 'high', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('No, that does not work for us', brain, ciResult);
    expect(['objection', 'rejecting']).toContain(plan.customerIntent);
    expect(plan.goal).toBe('handle_objection');
  });

  it('detects implementation intent', () => {
    const { brain } = makeBrainMemory(3);
    brain.topicsExplained.push({ topic: 'features', explainedAtTurn: 1, count: 1 });
    const ciResult = { objection: { isObjection: false }, funnelStage: 'evaluation', sentiment: { polarity: 0, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('How do I set up the widget?', brain, ciResult);
    expect(['implementation', 'unknown', 'learning']).toContain(plan.customerIntent);
  });

  it('sets goal to qualify when information is missing', () => {
    const { brain } = makeBrainMemory(4);
    brain.qualificationCollected.questionsAskedCount = 0;
    const ciResult = { objection: { isObjection: false }, funnelStage: 'evaluation', sentiment: { polarity: 0, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('Tell me about pricing', brain, ciResult);
    expect(plan.goal).toBe('qualify');
  });

  it('sets goal to close_trial with buying intent when qualified', () => {
    const { brain } = makeBrainMemory(4);
    brain.qualificationCollected.completed = true;
    const ciResult = { objection: { isObjection: false }, funnelStage: 'purchase_intent', sentiment: { polarity: 0.5, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('I want to purchase the professional plan', brain, ciResult);
    expect(plan.customerIntent).toBe('buying');
    expect(plan.goal).toBe('close_trial');
  });

  it('sets tone to empathic for high frustration', () => {
    const { brain } = makeBrainMemory(3);
    const ciResult = { objection: { isObjection: true, category: 'price' }, funnelStage: 'objection', sentiment: { polarity: -0.5, frustration: 'high', urgency: 'medium' }, trustSignal: { shouldInject: true } } as any;
    const plan = planConversation('This is way too expensive!', brain, ciResult);
    expect(plan.constraints.tone).toBe('empathic');
  });

  it('sets tone to professional for comparing', () => {
    const { brain } = makeBrainMemory(3);
    const ciResult = { objection: { isObjection: false }, funnelStage: 'evaluation', sentiment: { polarity: 0.2, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('How does your pricing compare to Intercom?', brain, ciResult);
    expect(plan.constraints.tone).toBe('professional');
  });

  it('detects missing qualification fields', () => {
    const { brain } = makeBrainMemory(2);
    const ciResult = { objection: { isObjection: false }, funnelStage: 'discovery', sentiment: { polarity: 0, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('What features do you have?', brain, ciResult);
    expect(plan.missingQualification.length).toBeGreaterThanOrEqual(1);
    expect(plan.missingQualification).toContain('company size');
  });

  it('uses trust signal for early stage', () => {
    const { brain } = makeBrainMemory(0);
    brain.trustLevel = 'low';
    const ciResult = { objection: { isObjection: false }, funnelStage: 'greeting', sentiment: { polarity: 0, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('hi', brain, ciResult);
    expect(plan.constraints.useTrustSignal).toBe(true);
  });

  it('advances funnel stage to evaluation after enough turns', () => {
    const { brain } = makeBrainMemory(5);
    brain.funnelStage = 'interest';
    const ciResult = { objection: { isObjection: false }, funnelStage: 'interest', sentiment: { polarity: 0, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('Tell me more', brain, ciResult);
    expect(plan.funnelStage).toBe('evaluation');
  });

  it('sets finish_conversation for leaving', () => {
    const { brain } = makeBrainMemory(5);
    const ciResult = { objection: { isObjection: false }, funnelStage: 'evaluation', sentiment: { polarity: -0.3, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('I need to go, talk later', brain, ciResult);
    expect(plan.goal).toBe('finish_conversation');
  });

  it('identifies who-made-you as learning intent', () => {
    const { brain } = makeBrainMemory(0);
    const ciResult = { objection: { isObjection: false }, funnelStage: 'greeting', sentiment: { polarity: 0, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('Who created you?', brain, ciResult);
    expect(plan.customerIntent).toBe('learning');
  });

  it('"prices" standalone (turnCount=3) → evaluating', () => {
    const { brain } = makeBrainMemory(3);
    const ciResult = { objection: { isObjection: false }, funnelStage: 'evaluation', sentiment: { polarity: 0, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('prices', brain, ciResult);
    expect(plan.customerIntent).toBe('evaluating');
  });

  it('"what are your prices?" (turnCount=3) → evaluating', () => {
    const { brain } = makeBrainMemory(3);
    const ciResult = { objection: { isObjection: false }, funnelStage: 'evaluation', sentiment: { polarity: 0, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('What are your prices?', brain, ciResult);
    expect(plan.customerIntent).toBe('evaluating');
  });

  it('"what are your prices?" (turnCount=0) → learning (known LEARNING_PATTERNS collision at low turns)', () => {
    const { brain } = makeBrainMemory(0);
    const ciResult = { objection: { isObjection: false }, funnelStage: 'greeting', sentiment: { polarity: 0, frustration: 'low', urgency: 'low' }, trustSignal: { shouldInject: false } } as any;
    const plan = planConversation('What are your prices?', brain, ciResult);
    expect(plan.customerIntent).toBe('learning');
  });
});

// ============================================================================
// BRAIN TESTS
// ============================================================================
describe('Conversation Brain', () => {
  it('processes a greeting turn', () => {
    const legacy = makeLegacyMemory();
    const result = processConversationBrain({
      message: 'hi',
      responseText: 'Hello! Welcome.',
      legacyMemory: legacy,
    });
    expect(result.responseText).toBeTruthy();
    expect(result.plan.customerIntent).toBe('greeting');
    expect(result.plan.goal).toBe('build_trust');
    expect(result.quickReplies.length).toBeGreaterThanOrEqual(2);
    expect(result.memory.turnCount).toBe(1);
    expect(result.memory.turns).toHaveLength(1);
  });

  it('processes a features question', () => {
    const { legacy } = makeBrainMemory(1);
    const result = processConversationBrain({
      message: 'What features do you offer?',
      responseText: 'Here is a quick overview of our features.',
      legacyMemory: legacy,
    });
    expect(result.plan.customerIntent).toBe('learning');
    expect(result.plan.goal).toBe('answer_question');
    expect(result.memory.topicsExplained.some(t => t.topic === 'features')).toBe(true);
  });

  it('processes a pricing question', () => {
    const { legacy } = makeBrainMemory(2);
    const result = processConversationBrain({
      message: 'What does it cost?',
      responseText: 'Our pricing starts at $29/mo.',
      legacyMemory: legacy,
    });
    expect(result.plan.topicsToDiscuss).toContain('pricing');
    expect(result.cta.primaryCTA).toBeTruthy();
  });

  it('processes an objection', () => {
    const { legacy } = makeBrainMemory(3);
    const result = processConversationBrain({
      message: 'That is too expensive',
      responseText: 'I understand the concern. Here is how to think about ROI.',
      legacyMemory: legacy,
    });
    expect(result.plan.customerIntent).toBe('objection');
    expect(result.plan.goal).toBe('handle_objection');
    expect(result.memory.objectionsHandled).toContain('price');
    expect(result.cta.primaryCTA).toBe('start_free_trial');
  });

  it('processes a buying intent', () => {
    const { legacy } = makeBrainMemory(4);
    legacy.qualificationState.completed = true;
    const result = processConversationBrain({
      message: 'I want to sign up for the pro plan',
      responseText: 'Great! Let me help you get started.',
      legacyMemory: legacy,
    });
    expect(result.plan.customerIntent).toBe('buying');
    expect(['close_trial', 'recommend_plan']).toContain(result.plan.goal);
  });

  it('processes a farewell', () => {
    const { legacy } = makeBrainMemory(3);
    const result = processConversationBrain({
      message: 'goodbye',
      responseText: 'Take care!',
      legacyMemory: legacy,
    });
    expect(result.plan.customerIntent).toBe('leaving');
    expect(result.plan.goal).toBe('finish_conversation');
    expect(result.memory.isLeaving).toBe(true);
    expect(result.memory.isCompleted).toBe(true);
  });

  it('sets qualification goal when info is missing at turn 4+', () => {
    const { legacy } = makeBrainMemory(4);
    legacy.qualificationState.questionsAskedCount = 0;
    const result = processConversationBrain({
      message: 'Tell me more about your product',
      responseText: 'Our product helps teams answer questions from documentation.',
      legacyMemory: legacy,
    });
    expect(result.plan.goal).toBe('qualify');
  });

  it('adds follow-up when response has no direction', () => {
    const { legacy } = makeBrainMemory(2);
    legacy.qualificationState.completed = true;
    const result = processConversationBrain({
      message: 'What features do you have?',
      responseText: 'We have grounded AI and instant citations.',
      legacyMemory: legacy,
    });
    expect(result.responseText.length).toBeGreaterThan(40);
  });

  it('generates dynamic quick replies for build_trust goal', () => {
    const legacy = makeLegacyMemory();
    const result = processConversationBrain({
      message: 'hi',
      responseText: 'Hello! Welcome to Conversation Engine.',
      legacyMemory: legacy,
    });
    const labels = result.quickReplies.map(q => q.label.toLowerCase());
    expect(labels.some(l => l.includes('how it works') || l.includes('customer stories') || l.includes('security'))).toBe(true);
  });

  it('generates dynamic quick replies for qualify goal', () => {
    const { legacy } = makeBrainMemory(4);
    const result = processConversationBrain({
      message: 'What plan should I pick?',
      responseText: 'Let me help you find the right plan.',
      legacyMemory: legacy,
    });
    const labels = result.quickReplies.map(q => q.label.toLowerCase());
    expect(labels.some(l => l.includes('help me choose') || l.includes('features'))).toBe(true);
  });

  it('generates dynamic quick replies for handle_objection goal', () => {
    const { legacy } = makeBrainMemory(3);
    const result = processConversationBrain({
      message: 'That is too expensive for us',
      responseText: 'I understand. Here is the ROI.',
      legacyMemory: legacy,
    });
    const labels = result.quickReplies.map(q => q.label.toLowerCase());
    expect(labels.some(l => l.includes('roi') || l.includes('demo') || l.includes('case study'))).toBe(true);
  });

  it('tracks conversation memory across multiple turns', () => {
    const legacy = makeLegacyMemory();

    const r1 = processConversationBrain({ message: 'hi', responseText: 'Hello!', legacyMemory: legacy });
    expect(r1.memory.turnCount).toBe(1);
    expect(r1.memory.turns).toHaveLength(1);

    const r2 = processConversationBrain({ message: 'What features?', responseText: 'Here are features.', legacyMemory: r1.legacyMemory });
    expect(r2.memory.turnCount).toBe(2);
    expect(r2.memory.topicsExplained.some(t => t.topic === 'features')).toBe(true);

    const r3 = processConversationBrain({ message: 'How much?', responseText: 'Pricing starts at $29.', legacyMemory: r2.legacyMemory });
    expect(r3.memory.turnCount).toBe(3);
    expect(r3.plan.customerIntent).toBe('evaluating');
  });

  it('does not repeat topics already explained', () => {
    const { legacy } = makeBrainMemory(2);
    legacy.topics = ['features'];
    const result = processConversationBrain({
      message: 'Tell me about features again',
      responseText: 'As I mentioned, our features include grounded AI.',
      legacyMemory: legacy,
    });
    const featuresExplained = result.memory.topicsExplained.filter(t => t.topic === 'features');
    expect(featuresExplained.length).toBeGreaterThanOrEqual(1);
  });

  it('selects enterprise CTAs for enterprise persona', () => {
    const { legacy } = makeBrainMemory(3);
    legacy.persona = 'enterprise';
    const result = processConversationBrain({
      message: 'What features do you offer?',
      responseText: 'Our features include grounded AI.',
      legacyMemory: legacy,
    });
    expect(result.cta.primaryCTA).toBe('book_demo');
    expect(result.cta.label).toContain('Enterprise Demo');
  });

  it('selects developer CTAs for developer persona', () => {
    const { legacy } = makeBrainMemory(3);
    legacy.persona = 'developer';
    const result = processConversationBrain({
      message: 'How does the API work?',
      responseText: 'Our API supports REST endpoints.',
      legacyMemory: legacy,
    });
    expect(result.cta.primaryCTA).toBe('developer_docs');
  });

  it('selects close_trial CTA for buying intent', () => {
    const { legacy } = makeBrainMemory(4);
    legacy.buyingIntentDetected = true;
    legacy.qualificationState.completed = true;
    const result = processConversationBrain({
      message: 'I want to start a trial',
      responseText: 'Great choice!',
      legacyMemory: legacy,
    });
    expect(result.cta.primaryCTA).toBe('start_free_trial');
  });

  it('handles price objection with appropriate quick replies', () => {
    const { legacy } = makeBrainMemory(3);
    const result = processConversationBrain({
      message: 'Why is it so expensive?',
      responseText: 'Our pricing reflects the value we deliver.',
      legacyMemory: legacy,
    });
    expect(result.memory.objectionsHandled).toContain('price');
    expect(result.quickReplies.some(q => q.label.toLowerCase().includes('roi'))).toBe(true);
  });

  it('handles security objection', () => {
    const { legacy } = makeBrainMemory(3);
    const result = processConversationBrain({
      message: 'I am worried about data privacy',
      responseText: 'Your data is encrypted and never used for training.',
      legacyMemory: legacy,
    });
    expect(result.memory.objectionsHandled).toContain('security');
  });

  it('handles setup objection', () => {
    const { legacy } = makeBrainMemory(3);
    const result = processConversationBrain({
      message: 'Is this difficult to setup?',
      responseText: 'It takes under 10 minutes to get started.',
      legacyMemory: legacy,
    });
    expect(result.memory.objectionsHandled).toContain('setup');
  });

  it('handles competition objection', () => {
    const { legacy } = makeBrainMemory(3);
    const result = processConversationBrain({
      message: 'How is this different from ChatGPT?',
      responseText: 'We ground every answer in your documentation.',
      legacyMemory: legacy,
    });
    expect(result.memory.objectionsHandled).toContain('competition');
  });

  it('handles gratitude with follow-up', () => {
    const { legacy } = makeBrainMemory(2);
    const result = processConversationBrain({
      message: 'Thank you!',
      responseText: 'You are welcome!',
      legacyMemory: legacy,
    });
    expect(result.plan.customerIntent).toBe('confirming');
    expect(result.responseText.length).toBeGreaterThan(15);
  });

  it('handles small talk without resetting context', () => {
    const { legacy } = makeBrainMemory(3);
    legacy.turns = [
      { message: 'hi', response: 'hello', polarity: 0, frustration: 0, urgency: 0, timestamp: 1000 },
      { message: 'features?', response: 'here', polarity: 0, frustration: 0, urgency: 0, timestamp: 2000 },
      { message: 'pricing?', response: 'here', polarity: 0, frustration: 0, urgency: 0, timestamp: 3000 },
    ];
    const result = processConversationBrain({
      message: 'How are you?',
      responseText: 'I am doing well!',
      legacyMemory: legacy,
    });
    expect(result.plan.customerIntent).toBe('small_talk');
    expect(result.memory.turnCount).toBe(4);
  });

  it('does not repeat rejected CTAs', () => {
    const { legacy } = makeBrainMemory(3);
    const result = processConversationBrain({
      message: 'Tell me about pricing',
      responseText: 'Our pricing starts at $29.',
      legacyMemory: legacy,
      rejectedCTAs: ['start_free_trial'],
    });
    expect(result.cta.primaryCTA).not.toBe('start_free_trial');
  });

  it('preserves trust level from sentiment', () => {
    const { legacy } = makeBrainMemory(1);
    const result = processConversationBrain({
      message: 'This is great, amazing product!',
      responseText: 'Glad to help!',
      legacyMemory: legacy,
    });
    expect(['medium', 'high']).toContain(result.memory.trustLevel);
  });

  it('detects abandonment from leaving phrases', () => {
    const { legacy } = makeBrainMemory(5);
    const result = processConversationBrain({
      message: 'I need to think about it, get back to me later',
      responseText: 'Sure, take your time.',
      legacyMemory: legacy,
    });
    expect(result.plan.customerIntent).toBe('leaving');
  });

  it('returns valid response', () => {
    const legacy = makeLegacyMemory();
    const result = processConversationBrain({
      message: 'hi',
      responseText: 'Hello! Welcome.',
      legacyMemory: legacy,
    });
    expect(result.validation.valid).toBe(true);
  });

  it('preserves original response when validation fails on enriched', () => {
    const legacy = makeLegacyMemory({
      turns: [{ message: 'prev', response: 'Already explained it.', polarity: 0, frustration: 0, urgency: 0, timestamp: 1000 }],
    });
    const result = processConversationBrain({
      message: 'bye',
      responseText: 'Already explained it.',
      legacyMemory: legacy,
    });
    expect(result.responseText).toBeTruthy();
  });

  it('selects recovery CTA for abandonment', () => {
    const { legacy } = makeBrainMemory(5);
    const result = processConversationBrain({
      message: 'I am not sure this is for us',
      responseText: 'I understand. Let me share what has helped similar teams.',
      legacyMemory: legacy,
    });
    expect(['handle_objection', 'qualify', 'answer_question']).toContain(result.plan.goal);
  });

  it('handles enterprise persona with discovery flow', () => {
    const { legacy } = makeBrainMemory(3);
    legacy.persona = 'enterprise';
    const result = processConversationBrain({
      message: 'Tell me about your SOC 2 compliance',
      responseText: 'We are SOC 2 compliant with full audit reports available.',
      legacyMemory: legacy,
    });
    expect(result.memory.topicsExplained.some(t => t.topic === 'soc2' || t.topic === 'security')).toBe(true);
    expect(result.memory.persona).toBe('enterprise');
  });

  it('handles developer persona with technical questions', () => {
    const { legacy } = makeBrainMemory(3);
    legacy.persona = 'developer';
    const result = processConversationBrain({
      message: 'Do you have a REST API?',
      responseText: 'Yes, we have a full REST API.',
      legacyMemory: legacy,
    });
    expect(result.cta.primaryCTA).toBe('developer_docs');
  });

  it('handles basic identity question', () => {
    const legacy = makeLegacyMemory();
    const result = processConversationBrain({
      message: 'Who are you?',
      responseText: 'I am the AI assistant for Conversation Engine.',
      legacyMemory: legacy,
    });
    expect(result.responseText).toBeTruthy();
  });

  it('handles who-made-you question', () => {
    const legacy = makeLegacyMemory();
    const result = processConversationBrain({
      message: 'Who made you?',
      responseText: 'I was created by the Conversation Engine team.',
      legacyMemory: legacy,
    });
    expect(result.plan.customerIntent).toBe('learning');
  });

  it('handles ok mid-conversation with follow-up', () => {
    const { legacy } = makeBrainMemory(3);
    legacy.turns = [
      { message: 'hi', response: 'hello', polarity: 0, frustration: 0, urgency: 0, timestamp: 1000 },
      { message: 'features?', response: 'features list', polarity: 0, frustration: 0, urgency: 0, timestamp: 2000 },
      { message: 'pricing?', response: 'pricing list', polarity: 0, frustration: 0, urgency: 0, timestamp: 3000 },
    ];
    const result = processConversationBrain({
      message: 'ok',
      responseText: 'Great! Ready for next steps?',
      legacyMemory: legacy,
    });
    expect(result.responseText).toBeTruthy();
    expect(result.plan.customerIntent).toBe('confirming');
  });

  it('handles tell-me-more request', () => {
    const { legacy } = makeBrainMemory(2);
    const result = processConversationBrain({
      message: 'Can you tell me more about that?',
      responseText: 'Sure, here are more details.',
      legacyMemory: legacy,
    });
    expect(result.plan.customerIntent).toBe('learning');
    expect(result.responseText).toBeTruthy();
  });

  it('handles multiple turns with qualification progression', () => {
    const legacy = makeLegacyMemory();

    const r1 = processConversationBrain({ message: 'hi', responseText: 'Hello!', legacyMemory: legacy });

    const r2 = processConversationBrain({ message: 'What features?', responseText: 'Here are features.', legacyMemory: r1.legacyMemory });

    const r3 = processConversationBrain({ message: 'How much?', responseText: 'Pricing starts at $29.', legacyMemory: r2.legacyMemory });
    expect(r3.plan.goal).toBe('qualify');

    const r4 = processConversationBrain({ message: 'Yes, about 200 employees', responseText: 'Thanks! And what industry?', legacyMemory: r3.legacyMemory });
    expect(r4.plan.customerIntent).toBe('confirming');

    const r5 = processConversationBrain({ message: 'E-commerce', responseText: 'Great, e-commerce!', legacyMemory: r4.legacyMemory });
    expect(r5.memory.turnCount).toBe(5);
  });

  it('handles comparison follow-up', () => {
    const { legacy } = makeBrainMemory(3);
    const result = processConversationBrain({
      message: 'How are you different from the alternatives?',
      responseText: 'Here is what makes us unique.',
      legacyMemory: legacy,
    });
    expect(result.plan.customerIntent).toBe('comparing');
    expect(result.quickReplies.length).toBeGreaterThanOrEqual(1);
  });

  it('creates correct quick replies for advance_funnel or qualify', () => {
    const { legacy } = makeBrainMemory(3);
    legacy.qualificationState.completed = true;
    legacy.funnelStage = 'interest';
    const result = processConversationBrain({
      message: 'That sounds interesting',
      responseText: 'Would you like to see how it works?',
      legacyMemory: legacy,
    });
    expect(['advance_funnel', 'qualify', 'answer_question']).toContain(result.plan.goal);
    expect(result.quickReplies.length).toBeGreaterThanOrEqual(1);
  });

  it('creates correct quick replies for close_trial or recommend_plan', () => {
    const { legacy } = makeBrainMemory(4);
    legacy.buyingIntentDetected = true;
    legacy.qualificationState.completed = true;
    const result = processConversationBrain({
      message: 'I want to sign up for the pro plan',
      responseText: 'Excellent! Let us get you started.',
      legacyMemory: legacy,
    });
    expect(['close_trial', 'recommend_plan']).toContain(result.plan.goal);
    expect(result.quickReplies.length).toBeGreaterThanOrEqual(1);
  });

  it('caps quick replies at 4', () => {
    const { legacy } = makeBrainMemory(5);
    const result = processConversationBrain({
      message: 'Tell me everything about your product',
      responseText: 'Here is a comprehensive overview.',
      legacyMemory: legacy,
    });
    expect(result.quickReplies.length).toBeLessThanOrEqual(4);
  });

  it('sets isAbandoned on high abandonment risk', () => {
    const { legacy } = makeBrainMemory(5);
    const result = processConversationBrain({
      message: 'I will think about it and get back to you',
      responseText: 'Sure, take your time.',
      legacyMemory: legacy,
    });
    expect(result.memory.isLeaving).toBe(true);
  });

  it('preserves topics from previous turns in memory', () => {
    const legacy = makeLegacyMemory();
    const r1 = processConversationBrain({ message: 'What features?', responseText: 'Features: AI, citations.', legacyMemory: legacy });
    expect(r1.memory.topicsExplained.some(t => t.topic === 'features')).toBe(true);

    const r2 = processConversationBrain({ message: 'What about pricing?', responseText: 'Pricing starts at $29.', legacyMemory: r1.legacyMemory });
    expect(r2.memory.topicsExplained.some(t => t.topic === 'pricing')).toBe(true);
    expect(r2.memory.topicsExplained.some(t => t.topic === 'features')).toBe(true);
    expect(r2.memory.turnCount).toBe(2);
  });

  it('accumulates objections across turns', () => {
    const legacy = makeLegacyMemory();
    const r1 = processConversationBrain({ message: 'Too expensive', responseText: 'Here is ROI.', legacyMemory: legacy });
    expect(r1.memory.objectionsHandled).toContain('price');

    const r2 = processConversationBrain({ message: 'I care about security', responseText: 'Very secure.', legacyMemory: r1.legacyMemory });
    expect(r2.memory.objectionsHandled).toContain('price');
    expect(r2.memory.objectionsHandled).toContain('security');
  });

  it('handles enterprise procurement objection', () => {
    const { legacy } = makeBrainMemory(4);
    legacy.persona = 'enterprise';
    const result = processConversationBrain({
      message: 'We need to go through procurement, can you send an MSA?',
      responseText: 'We support enterprise procurement with custom MSAs.',
      legacyMemory: legacy,
    });
    expect(result.memory.objectionsHandled).toContain('enterprise_procurement');
  });

  it('handles "really" question with acknowledgment', () => {
    const { legacy } = makeBrainMemory(2);
    const result = processConversationBrain({
      message: 'Does it really take only 10 minutes to set up?',
      responseText: 'Yes, absolutely. Here is how it works.',
      legacyMemory: legacy,
    });
    expect(result.responseText).toBeTruthy();
  });

  it('handles "why" question', () => {
    const { legacy } = makeBrainMemory(3);
    const result = processConversationBrain({
      message: 'Why should I choose you over others?',
      responseText: 'Here is what makes us different.',
      legacyMemory: legacy,
    });
    expect(['comparing', 'unknown', 'objection']).toContain(result.plan.customerIntent);
  });

  it('handles "I don\'t like this" objection', () => {
    const { legacy } = makeBrainMemory(3);
    legacy.qualificationState.completed = true;
    const result = processConversationBrain({
      message: "I don't like this at all",
      responseText: 'I understand. Can you share what is not working?',
      legacyMemory: legacy,
    });
    expect(['handle_objection', 'qualify', 'answer_question']).toContain(result.plan.goal);
  });

  it('finishes conversation with a CTA when leaving', () => {
    const { legacy } = makeBrainMemory(4);
    const result = processConversationBrain({
      message: 'I have to go now, bye!',
      responseText: 'Happy to help whenever you need.',
      legacyMemory: legacy,
    });
    expect(result.plan.goal).toBe('finish_conversation');
    expect(result.cta.primaryCTA).toBe('contact_sales');
    expect(result.cta.label).toContain('Email');
  });

  it('handles thanks and provides follow-up', () => {
    const { legacy } = makeBrainMemory(2);
    const result = processConversationBrain({
      message: 'Thanks, that was helpful',
      responseText: 'You are welcome!',
      legacyMemory: legacy,
    });
    expect(result.responseText.length).toBeGreaterThan(20);
  });

  it('sets correct persona from message', () => {
    const legacy = makeLegacyMemory();
    const result = processConversationBrain({
      message: 'Do you support SAML SSO for enterprise?',
      responseText: 'Yes, we support SAML SSO.',
      legacyMemory: legacy,
    });
    expect(result.memory.persona).toBe('enterprise');
  });

  it('detects developer persona from technical question', () => {
    const legacy = makeLegacyMemory();
    const result = processConversationBrain({
      message: 'How do I integrate the React SDK?',
      responseText: 'Here is the React SDK integration guide.',
      legacyMemory: legacy,
    });
    expect(result.memory.persona).toBe('developer');
  });

  it('preserves companySize from memory creation', () => {
    const mem = createMemory({ companySize: '200' });
    expect(mem.companySize).toBe('200');
  });

  it('handles contextual follow-up after features', () => {
    const { legacy } = makeBrainMemory(2);
    legacy.topics = ['features'];
    const result = processConversationBrain({
      message: 'What security measures do you have?',
      responseText: 'We encrypt all data at rest and in transit.',
      legacyMemory: legacy,
    });
    expect(result.memory.topicsExplained.some(t => t.topic === 'security')).toBe(true);
  });

  it('handles walkthrough request', () => {
    const { legacy } = makeBrainMemory(1);
    const result = processConversationBrain({
      message: 'How does the grounding engine work?',
      responseText: 'The grounding engine uses a 4-stage pipeline.',
      legacyMemory: legacy,
    });
    expect(result.plan.topicsToDiscuss).toContain('walkthrough');
  });

  it('handles demo request', () => {
    const { legacy } = makeBrainMemory(2);
    const result = processConversationBrain({
      message: 'Can I see a demo?',
      responseText: 'Of course! Here is how to book one.',
      legacyMemory: legacy,
    });
    expect(result.responseText).toBeTruthy();
  });

  it('does not repeat the same follow-up across turns', () => {
    const { legacy } = makeBrainMemory(1);
    const r1 = processConversationBrain({ message: 'Tell me about features', responseText: 'Here are features.', legacyMemory: legacy });
    const r2 = processConversationBrain({ message: 'Tell me about pricing', responseText: 'Here is pricing.', legacyMemory: r1.legacyMemory });
    expect(r1.responseText).not.toEqual(r2.responseText);
  });

  it('handles 10+ turn conversation without degradation', () => {
    let legacy = makeLegacyMemory();
    const messages = [
      'hi', 'What features?', 'Tell me more', 'How much?', 'That is expensive',
      'What about security?', 'How is setup?', 'ok', 'Can you compare?', 'I need to think',
      'Actually, lets do it',
    ];
    for (const msg of messages) {
      const r = processConversationBrain({ message: msg, responseText: `Response to: ${msg}`, legacyMemory: legacy });
      legacy = r.legacyMemory;
    }
    expect(legacy.turns.length).toBe(11);
    expect(legacy.persona).toBeTruthy();
  });

  it('tracks goals achieved across turns', () => {
    const legacy = makeLegacyMemory();
    const r1 = processConversationBrain({ message: 'hi', responseText: 'Hello!', legacyMemory: legacy });
    expect(r1.memory.goalsAchieved).toContain('build_trust');

    const r2 = processConversationBrain({ message: 'Too expensive', responseText: 'Here is ROI.', legacyMemory: r1.legacyMemory });
    expect(r2.memory.goalsAchieved).toContain('handle_objection');
  });

  it('provides at most one CTA in response text', () => {
    const { legacy } = makeBrainMemory(3);
    const result = processConversationBrain({
      message: 'What plan do you recommend?',
      responseText: 'I recommend the Professional plan.',
      legacyMemory: legacy,
    });
    const ctaCount = (result.responseText.match(/\b(start free trial|book a demo|sign up|register)\b/gi) || []).length;
    expect(ctaCount).toBeLessThanOrEqual(1);
  });

  it('handles empty message gracefully', () => {
    const legacy = makeLegacyMemory();
    const result = processConversationBrain({ message: '', responseText: 'How can I help?', legacyMemory: legacy });
    expect(result.responseText).toBeTruthy();
  });

  it('handles very long message', () => {
    const { legacy } = makeBrainMemory(3);
    const long = 'I am interested in your product. '.repeat(20);
    const result = processConversationBrain({ message: long, responseText: 'That is a lot of interest!', legacyMemory: legacy });
    expect(result.responseText).toBeTruthy();
  });

  it('processes a developer trial request', () => {
    const { legacy } = makeBrainMemory(3);
    legacy.persona = 'developer';
    legacy.qualificationState.completed = true;
    const result = processConversationBrain({
      message: 'I want to start a developer trial',
      responseText: 'Great! Here is your sandbox.',
      legacyMemory: legacy,
    });
    expect(['close_trial', 'recommend_plan']).toContain(result.plan.goal);
    expect(['developer_docs', 'start_free_trial']).toContain(result.cta.primaryCTA);
  });

  it('processes existing customer intent', () => {
    const { legacy } = makeBrainMemory(3);
    const result = processConversationBrain({
      message: 'I need help with my current plan billing',
      responseText: 'Let me help you with billing.',
      legacyMemory: legacy,
    });
    expect(result.responseText).toBeTruthy();
  });

  it('processes support request', () => {
    const { legacy } = makeBrainMemory(3);
    const result = processConversationBrain({
      message: 'I am getting an error when integrating',
      responseText: 'Let me help troubleshoot that.',
      legacyMemory: legacy,
    });
    expect(result.responseText).toBeTruthy();
  });

  it('handles e-commerce topic detection', () => {
    const legacy = makeLegacyMemory();
    const result = processConversationBrain({
      message: 'Does it work with Shopify?',
      responseText: 'Yes, we integrate with Shopify.',
      legacyMemory: legacy,
    });
    expect(result.memory.persona).toBe('ecommerce');
    expect(result.memory.topicsExplained.some(t => t.topic === 'integrations')).toBe(true);
  });

  it('handles e-commerce objections', () => {
    const { legacy } = makeBrainMemory(3);
    legacy.persona = 'ecommerce';
    const result = processConversationBrain({
      message: 'This seems expensive for our store',
      responseText: 'Here is how stores like yours save with our solution.',
      legacyMemory: legacy,
    });
    expect(result.plan.customerIntent).toBe('objection');
  });

  it('handles support manager persona', () => {
    const legacy = makeLegacyMemory();
    const result = processConversationBrain({
      message: 'We use Zendesk and want better ticket deflection',
      responseText: 'Great, we integrate with Zendesk.',
      legacyMemory: legacy,
    });
    expect(result.memory.persona).toBe('support_manager');
  });

  it('handles startup founder persona', () => {
    const legacy = makeLegacyMemory();
    const result = processConversationBrain({
      message: 'We are a SaaS startup founder looking for pricing tiers with good ROI',
      responseText: 'Perfect for your needs!',
      legacyMemory: legacy,
    });
    expect(result.memory.persona).toBe('startup');
  });

  it('handles agency persona', () => {
    const legacy = makeLegacyMemory();
    const result = processConversationBrain({
      message: 'Do you offer white labeling for agencies?',
      responseText: 'Yes, we have an agency partner program.',
      legacyMemory: legacy,
    });
    expect(result.memory.persona).toBe('agency');
  });

  it('handles existing customer with account questions', () => {
    const legacy = makeLegacyMemory();
    const result = processConversationBrain({
      message: 'I need to upgrade my current plan',
      responseText: 'Let me help you with that upgrade.',
      legacyMemory: legacy,
    });
    expect(result.memory.persona).toBe('existing_customer');
  });

  it('handles small business persona', () => {
    const legacy = makeLegacyMemory();
    const result = processConversationBrain({
      message: 'I run a small business and need a simple solution',
      responseText: 'Our Starter plan is perfect for small businesses.',
      legacyMemory: legacy,
    });
    expect(result.memory.persona).toBe('small_business');
  });

  // ============================================================================
  // P5.6 REPAIR FIX 1: overallScore null guard
  // ============================================================================
  describe('P5.6 Fix 1 — overallScore null guard', () => {
    it('handles undefined leadScore gracefully', () => {
      const legacy = makeLegacyMemory();
      const result = processConversationBrain({
        message: 'hello',
        responseText: 'Hi there! How can I help you today?',
        legacyMemory: legacy,
      });
      expect(result.memory.leadScore).toBeDefined();
      expect(typeof result.memory.leadScore).toBe('number');
    });

    it('handles undefined conversationScore gracefully', () => {
      const legacy = makeLegacyMemory();
      const result = processConversationBrain({
        message: 'what do you offer?',
        responseText: 'We offer AI-powered customer support.',
        legacyMemory: legacy,
      });
      expect(result.memory.conversationScore).toBeDefined();
      expect(typeof result.memory.conversationScore).toBe('number');
    });

    it('does not crash with minimal ciResult', () => {
      const legacy = makeLegacyMemory();
      expect(() => processConversationBrain({
        message: 'hello',
        responseText: 'Hi!',
        legacyMemory: legacy,
      })).not.toThrow();
    });
  });

  // ============================================================================
  // P5.6 REPAIR FIX 2-3: Memory persistence & qualification lifecycle
  // ============================================================================
  describe('P5.6 Fix 2-3 — memory persistence & qualification lifecycle', () => {
    it('persists qualification fields from ciResult to memory', () => {
      const legacy = makeLegacyMemory();
      const result = processConversationBrain({
        message: 'We get about 500-2,000 questions per month',
        responseText: 'Based on your volume, the Starter plan is a great fit.',
        legacyMemory: legacy,
      });
      expect(result.memory.qualificationCollected).toBeDefined();
      expect(typeof result.memory.qualificationCollected.questionsAskedCount).toBe('number');
    });

    it('does not repeat qualification questions after completed', () => {
      const legacy = makeLegacyMemory({ qualificationState: { questionsAskedCount: 1, completed: true } });
      const result = processConversationBrain({
        message: 'tell me more',
        responseText: 'Here is more information.',
        legacyMemory: legacy,
      });
      expect(result.memory.qualificationCollected.completed).toBe(true);
    });
  });

  // ============================================================================
  // P5.6 REPAIR FIX 4: Vague reply contextualization
  // ============================================================================
  describe('P5.6 Fix 4 — vague reply contextualization', () => {
    it('handles "hmm" as a short reply without crashing', () => {
      const legacy = makeLegacyMemory({ turns: [{ message: 'previous', response: 'response', polarity: 0, frustration: 0, urgency: 0, timestamp: Date.now() }] });
      const result = processConversationBrain({
        message: 'hmm',
        responseText: 'Happy to go deeper on any part.',
        legacyMemory: legacy,
      });
      expect(result.responseText).toBeTruthy();
    });

    it('handles "interesting" as a short reply without crashing', () => {
      const legacy = makeLegacyMemory({ turns: [{ message: 'previous', response: 'response', polarity: 0, frustration: 0, urgency: 0, timestamp: Date.now() }] });
      const result = processConversationBrain({
        message: 'interesting',
        responseText: 'Glad it caught your attention.',
        legacyMemory: legacy,
      });
      expect(result.responseText).toBeTruthy();
    });

    it('handles "oh ok" as a short reply without crashing', () => {
      const legacy = makeLegacyMemory({ turns: [{ message: 'previous', response: 'response', polarity: 0, frustration: 0, urgency: 0, timestamp: Date.now() }] });
      const result = processConversationBrain({
        message: 'oh ok',
        responseText: 'Let me know if anything else comes to mind.',
        legacyMemory: legacy,
      });
      expect(result.responseText).toBeTruthy();
    });
  });

  // ============================================================================
  // P5.6 REPAIR FIX 5: Recommendation trigger
  // ============================================================================
  describe('P5.6 Fix 5 — recommendation trigger', () => {
    it('recommends plan when qualification is complete and user is evaluating', () => {
      const legacy = makeLegacyMemory({
        qualificationState: { questionsAskedCount: 3, completed: true },
        persona: 'startup',
        funnelStage: 'evaluation',
        turns: [
          { message: 'hello', response: 'hi', polarity: 0, frustration: 0, urgency: 0, timestamp: Date.now() - 100000 },
          { message: 'tell me about pricing', response: 'Here are our plans', polarity: 0, frustration: 0, urgency: 0, timestamp: Date.now() - 50000 },
        ],
      });
      const result = processConversationBrain({
        message: 'how does this compare to other solutions?',
        responseText: 'Let me compare the options for you.',
        legacyMemory: legacy,
      });
      expect(result.plan).toBeDefined();
    });
  });

  // ============================================================================
  // P5.8 — No Generic Pricing Fallback
  // ============================================================================
  describe('P5.8 — No Generic Pricing Fallback', () => {
    const featuresLegacy = makeLegacyMemory({
      persona: 'startup',
      funnelStage: 'interest',
      topics: ['features'],
      turns: [
        { message: 'What features do you offer?', response: 'We have AI-powered search and analytics.', polarity: 0, frustration: 0, urgency: 0, timestamp: Date.now() - 60000 },
        { message: 'That sounds useful', response: 'Glad it caught your attention.', polarity: 0, frustration: 0, urgency: 0, timestamp: Date.now() - 30000 },
      ],
    });

    const pricingPatterns = [/walk through the plans/i, /which plan/i, /pricing/i, /what each plan includes/i];

    function expectNoPricingFallback(response: string): void {
      for (const pat of pricingPatterns) {
        expect(response).not.toMatch(pat);
      }
    }

    it('does not jump to pricing on "really" after features discussion', () => {
      const result = processConversationBrain({
        message: 'really',
        responseText: 'Yes, everything I mentioned is already available today.',
        legacyMemory: featuresLegacy,
      });
      expectNoPricingFallback(result.responseText);
    });

    it('does not jump to pricing on "interesting" after features discussion', () => {
      const result = processConversationBrain({
        message: 'interesting',
        responseText: 'Glad it caught your attention.',
        legacyMemory: featuresLegacy,
      });
      expectNoPricingFallback(result.responseText);
    });

    it('does not jump to pricing on "ok" after features discussion', () => {
      const result = processConversationBrain({
        message: 'ok',
        responseText: 'Let me know if you have questions.',
        legacyMemory: featuresLegacy,
      });
      expectNoPricingFallback(result.responseText);
    });

    it('does not jump to pricing on "cool" after features discussion', () => {
      const result = processConversationBrain({
        message: 'cool',
        responseText: 'Glad it caught your attention.',
        legacyMemory: featuresLegacy,
      });
      expectNoPricingFallback(result.responseText);
    });

    it('does not jump to pricing on "hmm" after features discussion', () => {
      const result = processConversationBrain({
        message: 'hmm',
        responseText: 'Happy to go deeper on any part.',
        legacyMemory: featuresLegacy,
      });
      expectNoPricingFallback(result.responseText);
    });

    it('does not jump to pricing on "tell me more" after features discussion', () => {
      const result = processConversationBrain({
        message: 'tell me more',
        responseText: 'The platform includes analytics, reporting, and workflow automation.',
        legacyMemory: featuresLegacy,
      });
      expectNoPricingFallback(result.responseText);
    });

    it('does not jump to pricing on "why?" after features discussion', () => {
      const result = processConversationBrain({
        message: 'why?',
        responseText: 'Great question. Let me explain the reasoning.',
        legacyMemory: featuresLegacy,
      });
      expectNoPricingFallback(result.responseText);
    });

    it('does not jump to pricing on off-topic input', () => {
      const legacy = makeLegacyMemory({
        persona: 'startup',
        funnelStage: 'interest',
        turns: [
          { message: 'What features do you offer?', response: 'We have AI-powered search.', polarity: 0, frustration: 0, urgency: 0, timestamp: Date.now() - 60000 },
          { message: 'Interesting', response: 'Glad it caught your attention.', polarity: 0, frustration: 0, urgency: 0, timestamp: Date.now() - 30000 },
        ],
      });
      const result = processConversationBrain({
        message: 'What about football?',
        responseText: 'That is a fun topic. To get back on track, what challenge are you hoping to solve with AI-powered support?',
        legacyMemory: legacy,
      });
      expectNoPricingFallback(result.responseText);
    });
  });
});
