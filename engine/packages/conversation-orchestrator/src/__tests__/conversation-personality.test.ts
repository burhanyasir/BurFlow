import { describe, it, expect } from 'vitest';
import {
  ConversationMemoryData,
  ConversationGoal,
  CustomerIntent,
  FunnelStageExtended,
  DiscernedTopic,
  createMemory,
  fromLegacyMemory,
  discernTopics,
  isTopicExplained,
  markTopicExplained,
  isCTARejected,
  isGoalAchieved,
} from '../conversation-memory';

import {
  getOpening,
  detectEmotionalCue,
  handleShortReply,
  isOffTopic,
  handleBetterEnding,
  getSmartFollowUp,
  buildContextSummary,
  recommendPlan,
  enforceContinuity,
  generateContextReference,
  OPENINGS_BY_GOAL,
  detectIndustry,
  adaptResponseToContext,
  contextualizeShortReply,
  handleMidConversationGreeting,
} from '../conversation-personality';

import { processConversationBrain, BrainInput, BrainOutput } from '../conversation-brain';

import { ConversationIntelligenceMemory } from '../conversation-intelligence-types';

import { PersonaType } from '../types';

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

function makeBrainMemory(turns: number = 1): { legacy: ConversationIntelligenceMemory; memory: ConversationMemoryData } {
  const legacy = makeLegacyMemory();
  for (let i = 0; i < turns; i++) {
    legacy.turns.push({
      message: `message ${i}`,
      response: `response ${i}`,
      polarity: 0,
      frustration: 0,
      urgency: 0,
      timestamp: Date.now() + i * 1000,
    });
    legacy.topics.push('features');
  }
  return { legacy, memory: fromLegacyMemory(legacy) };
}

describe('EmotionalCueDetection', () => {
  it('detects expensive concern', () => {
    const ack = detectEmotionalCue('This is too expensive');
    expect(ack).toBe('That is completely fair to ask about.');
  });

  it('detects frustration', () => {
    const ack = detectEmotionalCue('I hate this, terrible experience');
    expect(ack).toBe('I appreciate you being straight with me.');
  });

  it('detects confusion', () => {
    const ack = detectEmotionalCue('This is confusing');
    expect(ack).toBe('Let me rephrase that more clearly.');
  });

  it('detects hesitation', () => {
    const ack = detectEmotionalCue('I am worried about the cost');
    expect(ack).toContain('No pressure at all');
  });

  it('detects competitor mention', () => {
    const ack = detectEmotionalCue('We are using Zendesk instead');
    expect(ack).toBe('Good to know what you are comparing against.');
  });

  it('returns null for neutral message', () => {
    const ack = detectEmotionalCue('What features do you have?');
    expect(ack).toBeNull();
  });
});

describe('ShortReplyIntelligence', () => {
  it('handles "maybe"', () => {
    const reply = handleShortReply('maybe');
    expect(reply).toBe('No rush. Anything I can clarify to help you decide?');
  });

  it('handles "no"', () => {
    const reply = handleShortReply('no');
    expect(reply).toBe('Fair enough. What would work better for you?');
  });

  it('handles "thanks" via ending handler', () => {
    const ending = handleBetterEnding('thanks');
    expect(ending).toBeNull();
  });

  it('handles "bye" via ending handler', () => {
    const ending = handleBetterEnding('bye');
    expect(ending).toBeTruthy();
    expect(ending!.response).toContain('Take care');
  });

  it('returns null for normal question', () => {
    const reply = handleShortReply('What features do you offer?');
    expect(reply).toBeNull();
  });
});

describe('SmartFollowUps', () => {
  it('asks about monthly conversations when discussing pricing', () => {
    const mem = createMemory({ companySize: '50', currentHelpdesk: 'Zendesk' });
    mem.topicsExplained.push({ topic: 'pricing', explainedAtTurn: 1, count: 1, phase: 'mentioned' });
    const followUp = getSmartFollowUp('Tell me about pricing', mem, {} as any);
    expect(followUp).toContain('conversations');
  });

  it('asks about challenge for founder persona', () => {
    const mem = createMemory();
    mem.topicsExplained.push({ topic: 'features', explainedAtTurn: 1, count: 1, phase: 'mentioned' });
    const followUp = getSmartFollowUp('I am the founder', mem, {} as any);
    expect(followUp).toContain('challenge');
  });
});

describe('TopicContinuity', () => {
  it('does not add bridge when no topic change', () => {
    const mem = createMemory({ currentTopic: 'pricing' });
    const result = enforceContinuity('Our pricing starts at $29.', mem, ['pricing']);
    expect(result).toBe('Our pricing starts at $29.');
  });

  it('adds bridge when topic changes without user intent', () => {
    const mem = createMemory({ currentTopic: 'pricing', turnCount: 3 });
    mem.turns.push({ turnNumber: 1, message: 'Tell me about pricing', response: 'Here is pricing', customerIntent: 'learning', goal: 'answer_question', funnelStage: 'awareness', timestamp: 1000 });
    mem.turns.push({ turnNumber: 2, message: 'ok', response: 'sure', customerIntent: 'confirming', goal: 'none', funnelStage: 'awareness', timestamp: 2000 });
    const result = enforceContinuity('We integrate with Zendesk.', mem, ['integrations']);
    expect(result).toContain('integrations');
    expect(result).toContain('before we get to');
  });
});

describe('Personality Consistency', () => {
  it('responses are confident but not overly enthusiastic', () => {
    const { legacy } = makeBrainMemory(2);
    const result = processConversationBrain({
      message: 'Is this product good?',
      responseText: 'It is trusted by many teams.',
      legacyMemory: legacy,
    });
    const overEnthusiastic = ['AMAZING', 'INCREDIBLE', 'BEST EVER', 'PERFECT'];
    for (const word of overEnthusiastic) {
      expect(result.responseText.toUpperCase()).not.toContain(word);
    }
  });

  it('handles gratitude naturally', () => {
    const { legacy } = makeBrainMemory(3);
    const result = processConversationBrain({
      message: 'Thanks for your help',
      responseText: 'Happy to help.',
      legacyMemory: legacy,
    });
    expect(result.responseText).toBeTruthy();
    const robotic = ["I'd be happy to help", 'Great question', 'Let me break that down'];
    for (const phrase of robotic) {
      expect(result.responseText).not.toContain(phrase);
    }
  });

  it('does not restart selling after ending', () => {
    const { legacy } = makeBrainMemory(3);
    const result = processConversationBrain({
      message: 'bye',
      responseText: 'Goodbye',
      legacyMemory: legacy,
    });
    expect(result.responseText).toBeTruthy();
  });
});

describe('Natural Acknowledgments', () => {
  it('acknowledges greeting appropriately', () => {
    const legacy = makeLegacyMemory();
    const result = processConversationBrain({
      message: 'hello',
      responseText: 'Hi there!',
      legacyMemory: legacy,
    });
    expect(result.responseText).toBeTruthy();
  });

  it('acknowledges farewell naturally', () => {
    const { legacy } = makeBrainMemory(3);
    const result = processConversationBrain({
      message: 'goodbye',
      responseText: 'Goodbye!',
      legacyMemory: legacy,
    });
    expect(result.responseText).toBeTruthy();
  });
});

describe('P3 - Contextual Short Replies', () => {
  it('contextualizes "ok" after pricing discussion', () => {
    const mem = createMemory({ currentTopic: 'pricing', lastGoal: 'answer_question', turnCount: 3 });
    const reply = contextualizeShortReply('ok', mem);
    expect(reply).toContain('plan');
  });

  it('contextualizes "really" after pricing topic', () => {
    const mem = createMemory({ currentTopic: 'pricing', turnCount: 2 });
    const reply = contextualizeShortReply('really', mem);
    expect(reply).toContain('plans');
  });

  it('returns null for first-turn short reply', () => {
    const mem = createMemory({ turnCount: 0 });
    const reply = contextualizeShortReply('ok', mem);
    expect(reply).toBeNull();
  });
});

describe('P3 - Mid-Conversation Greeting', () => {
  it('returns context-aware greeting after pricing discussion', () => {
    const mem = createMemory({ currentTopic: 'pricing', turnCount: 5, lastGoal: 'answer_question' });
    const greeting = handleMidConversationGreeting(mem);
    expect(greeting).toContain('pricing');
  });

  it('returns null for first-turn greeting', () => {
    const mem = createMemory({ turnCount: 0 });
    expect(handleMidConversationGreeting(mem)).toBeNull();
  });
});

describe('P3 - End-to-End Context Preservation', () => {
  it('preserves companySize from legacy across brain calls', () => {
    const legacy = makeLegacyMemory({ companySize: '50', industry: 'tech' });
    const r1 = processConversationBrain({ message: 'Tell me about pricing', responseText: 'Here.', legacyMemory: legacy });
    expect(r1.memory.companySize).toBe('50');
    expect(r1.memory.industry).toBe('tech');
    const r2 = processConversationBrain({ message: 'Tell me more', responseText: 'More.', legacyMemory: r1.legacyMemory });
    expect(r2.memory.companySize).toBe('50');
    expect(r2.memory.industry).toBe('tech');
  });
});
