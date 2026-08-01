import { describe, it, expect } from 'vitest';
import { planConversation } from '../conversation-planner';
import { createMemory } from '../conversation-memory';

function makeCI(overrides: any = {}) {
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
    funnelStage: 'greeting',
    cta: { primaryCTA: 'none', label: '', link: '' },
    quickReplies: [],
    uiState: { buttons: [], suggestedActions: [] },
    sources: [],
    isFallback: false,
    turnCount: 0,
    ...overrides,
  };
}

describe('Planner action scoring', () => {
  it('returns actionScores and sorts by EV', () => {
    const mem = createMemory({ turnCount: 4 });
    const ci = makeCI({ buyingIntent: { hasBuyingIntent: true, confidence: 0.9 }, funnelStage: 'evaluation', turnCount: 4 });
    const plan = planConversation('We are ready to buy and want a demo', mem, ci as any);
    expect(plan.actionScores).toBeDefined();
    expect(plan.actionScores && plan.actionScores.length).toBeGreaterThan(0);
    const top = plan.actionScores![0];
    expect(top.ev).toBeGreaterThanOrEqual(plan.actionScores![plan.actionScores!.length - 1].ev);
  });

  it('prefers book_demo when buying intent is strong', () => {
    const mem = createMemory({ turnCount: 4, trustLevel: 'high' });
    const ci = makeCI({ buyingIntent: { hasBuyingIntent: true, confidence: 0.95 }, funnelStage: 'evaluation', turnCount: 4 });
    const plan = planConversation('We want to schedule a demo this week', mem, ci as any);
    const topAction = plan.actionScores && plan.actionScores[0] && plan.actionScores[0].action;
    expect(['book_demo', 'escalate_to_human', 'offer_trial']).toContain(topAction);
  });
});