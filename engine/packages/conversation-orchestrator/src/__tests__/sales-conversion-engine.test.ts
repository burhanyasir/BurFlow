import { describe, it, expect } from 'vitest';
import { buildSalesConversionSignals } from '../sales-conversion-engine';
import { createMemory } from '../conversation-memory';
import { ConversationIntelligenceResult } from '../conversation-intelligence-types';

describe('sales conversion engine', () => {
  it('builds a hot conversion summary for buying intent and qualified memory', () => {
    const memory = createMemory({
      persona: 'enterprise',
      industry: 'SaaS',
      companySize: '200+',
      useCase: 'support automation',
      currentHelpdesk: 'Zendesk',
      budget: '$5000',
      turnCount: 5,
      funnelStage: 'evaluation',
      qualificationCollected: { questionsAskedCount: 3, completed: true },
      buyingIntentDetected: true,
      trustLevel: 'high',
      leadScore: 75,
      salesSignals: { objections: [], competitors: [], integrations: [], painPoints: [], trustIssues: [], ctaRejections: [], urgencySignals: [], authoritySignals: [], timelineSignals: [] },
      topicsExplained: [],
      questionsAnswered: [],
      ctasShown: [],
      buttonsShown: [],
      buttonClicks: [],
      planRecommendations: [],
      turns: [],
      goalsAchieved: [],
      trustHistory: [],
      momentumScore: 0,
      abandonmentRisk: 'low',
      memoryConfidence: 0.9,
      conversationScore: 80,
      isLeaving: false,
      isAbandoned: false,
      isCompleted: false,
      rejectedCTAs: [],
      usedOpenings: [],
      currentTopic: undefined,
      currentStage: 'education',
      buyerRole: 'enterprise',
      companyName: 'Acme Corp',
      securityRequirements: [],
      lastOffTopicRedirect: undefined,
      contextSummary: { lastUpdatedAtTurn: 0, buyingIntent: 'high', keyTopics: [], objections: [], missingQualification: [] },
      contextSummaryTurn: 0,
      buttonRejections: [],
      buttonAcceptances: [],
    });

    const plan = {
      goal: 'close_trial' as const,
      customerIntent: 'buying' as const,
      funnelStage: 'purchase_intent' as const,
      missingQualification: [],
    };
    const ciResult = {
      responseText: 'Great choice',
      leadScore: { overallScore: 75 },
      conversationScore: { overallScore: 80 },
      sentiment: { polarity: 0.5, frustration: 'low', urgency: 'medium', trend: 'improving' },
      abandonmentRisk: { level: 'low', score: 10 },
      repetition: { hasRepetition: false, count: 0, topics: [] },
      escalation: { shouldEscalate: false, urgency: 'low' },
      routingDecision: { decision: 'assistant', confidence: 0.9, label: 'Handled by AI assistant' },
      trustSignal: { shouldInject: false },
      buyingIntent: { hasBuyingIntent: true, confidence: 0.9 },
      objection: { isObjection: false, category: 'none', groundedAnswer: '', sources: [] },
      qualification: { questionsAskedCount: 3, completed: true },
      qualificationProgress: 100,
      persona: { persona: 'enterprise', confidence: 0.9, reasoning: 'detected' },
      funnelStage: 'purchase_intent',
      cta: { primaryCTA: 'start_free_trial', label: 'Start Free Trial', link: '/signup' },
      quickReplies: [],
      uiState: { buttons: [], suggestedActions: [] },
      sources: [],
      isFallback: false,
      turnCount: 6,
    } as ConversationIntelligenceResult;

    const result = buildSalesConversionSignals({ message: 'I want a demo', memory, ciResult, plan });

    expect(result.nextStep).toBe('recommend_trial');
    expect(result.crmAction.action).toBe('create_lead');
    expect(result.analytics.bucket).toBe('hot');
    expect(result.playbook.cta.label).toContain('Start Free Trial');
    expect(result.calendarBooking).toBeDefined();
    const bookingText = [result.calendarBooking?.message ?? '', result.calendarBooking?.bookingCTA.label ?? ''].join(' ').toLowerCase();
    expect(bookingText).toContain('demo');
  });
});
