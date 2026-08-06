import { createMemory, ConversationMemoryData } from './conversation-memory';
import { ConversationIntelligenceResult } from './conversation-intelligence-types';
import { ConversationGoal, FunnelStageExtended } from './conversation-planner';

type AnyCaseDef = any;

function normalizeMissingQualification(caseDef: AnyCaseDef): string[] {
  return caseDef.plan?.missingQualification ?? caseDef.missingQualification ?? [];
}

function computeLeadScore(caseDef: AnyCaseDef) {
  const stage = (caseDef.plan?.funnelStage ?? caseDef.funnelStage) || 'awareness';
  const base = stage === 'awareness' ? 30 : stage === 'consideration' ? 55 : 80;
  const budgetValue = Number((caseDef.budget || '').toString().replace(/[^0-9]/g, '')) || 0;
  const budgetBonus = budgetValue >= 900 ? 10 : 0;
  const objectionPenalty = (caseDef.objectionCategory && caseDef.objectionCategory !== 'none') ? 10 : 0;
  return Math.min(95, Math.max(20, base + budgetBonus - objectionPenalty));
}

export function buildCanonicalBenchmarkInputs(caseDef: AnyCaseDef) {
  const missingQualification = normalizeMissingQualification(caseDef);
  const plan = caseDef.plan ?? {
    goal: (caseDef.visitorIntent === 'pricing' ? 'recommend_plan' : 'advance_funnel') as ConversationGoal,
    customerIntent: caseDef.visitorIntent === 'buying' ? 'buying' : caseDef.visitorIntent === 'support' ? 'support' : 'evaluating',
    funnelStage: (caseDef.plan?.funnelStage ?? caseDef.funnelStage) as FunnelStageExtended,
    missingQualification,
  };

  const memory = createMemory();
  const trustSignals = caseDef.trustSignals ?? [];
  const trustLevel = trustSignals.length >= 2 ? 'high' : trustSignals.length === 1 ? 'medium' : 'low';
  const leadScore = caseDef.leadScore ?? computeLeadScore(caseDef);
  const buyingIntentDetected = (caseDef.visitorIntent === 'buying') || (caseDef.plan?.customerIntent === 'buying');

  Object.assign(memory as ConversationMemoryData, {
    persona: caseDef.persona ?? caseDef.persona ?? 'unknown',
    industry: caseDef.industry,
    companySize: caseDef.companySize,
    budget: caseDef.budget,
    trustLevel,
    leadScore,
    buyingIntentDetected,
    qualificationCollected: {
      questionsAskedCount: missingQualification.length ? 1 : 0,
      completed: missingQualification.length === 0,
    },
    turnCount: caseDef.turnCount ?? 3,
    funnelStage: plan.funnelStage ?? 'awareness',
    currentStage: (plan.funnelStage === 'pricing') ? 'pricing' : 'education',
    contextSummary: {
      lastUpdatedAtTurn: caseDef.contextSummary?.lastUpdatedAtTurn ?? (caseDef.turnCount ?? 3),
      buyingIntent: buyingIntentDetected ? 'high' : 'medium',
      keyTopics: caseDef.products ?? [],
      objections: caseDef.objectionCategory && caseDef.objectionCategory !== 'none' ? [caseDef.objectionCategory] : [],
      missingQualification,
    },
    contextSummaryTurn: caseDef.contextSummaryTurn ?? (caseDef.turnCount ?? 3),
    salesSignals: {
      objections: caseDef.objectionCategory && caseDef.objectionCategory !== 'none' ? [caseDef.objectionCategory] : [],
      competitors: caseDef.products?.some((p: string) => /compare|competitor|alternative/.test(p.toLowerCase())) ? ['competitor'] : [],
      integrations: /integration|api|webhook|connect/i.test(caseDef.message ?? '') ? ['integration'] : [],
      painPoints: caseDef.objectionCategory === 'none' ? [] : [caseDef.objectionCategory],
      trustIssues: trustSignals,
      ctaRejections: caseDef.ctaRejections ?? [],
      urgencySignals: /urgent|ready|ASAP|today|soon/.test((caseDef.message ?? '').toLowerCase()) ? ['timeline pressure'] : [],
      authoritySignals: /enterprise|procurement|leadership|director|manager/i.test((caseDef.message ?? '')) ? ['decision-maker'] : [],
      timelineSignals: [],
      budget: caseDef.budget,
      deadline: undefined,
    },
  });

  const ciResult: ConversationIntelligenceResult = {
    responseText: '',
    leadScore: { overallScore: leadScore },
    conversationScore: { overallScore: 60 },
    sentiment: { polarity: 0.2, frustration: 'low', urgency: 'medium', trend: 'stable' },
    abandonmentRisk: { level: 'low', score: 15 },
    repetition: { hasRepetition: false, count: 0, topics: [] },
    escalation: { shouldEscalate: false, urgency: 'low' },
    routingDecision: { decision: 'assistant', confidence: 0.8, label: 'Handled by AI assistant' },
    trustSignal: { shouldInject: trustLevel === 'high', signalType: undefined, reason: undefined },
    buyingIntent: { hasBuyingIntent: buyingIntentDetected, confidence: buyingIntentDetected ? 0.9 : 0.5 },
    objection: caseDef.ciOverrides?.objection ?? { isObjection: !!(caseDef.objectionCategory && caseDef.objectionCategory !== 'none'), category: caseDef.objectionCategory ?? 'none', groundedAnswer: '', sources: [] },
    qualification: { questionsAskedCount: missingQualification.length ? 1 : 0, completed: missingQualification.length === 0 },
    qualificationProgress: missingQualification.length === 0 ? 100 : 0,
    persona: { persona: memory.persona ?? 'unknown', confidence: 0.5, reasoning: 'fixture' },
    funnelStage: plan.funnelStage ?? 'awareness',
    cta: { primaryCTA: 'none', label: 'None', link: '' },
    quickReplies: [],
    uiState: { buttons: [], suggestedActions: [] },
    sources: [],
    isFallback: false,
    turnCount: memory.turnCount ?? 1,
    ...caseDef.ciOverrides,
  } as ConversationIntelligenceResult;

  return { memory, ciResult, plan };
}

export default buildCanonicalBenchmarkInputs;
