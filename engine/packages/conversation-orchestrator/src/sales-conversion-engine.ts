import { ConversationIntelligenceResult } from './conversation-intelligence-types';
import { buildSalesPlaybook, SalesPlaybookStrategy } from './sales-playbook-engine';
import {
  ConversationGoal,
  CustomerIntent,
  DiscernedTopic,
  FunnelStageExtended,
} from './conversation-planner';
import {
  CTASelectionResult,
  QualificationState,
  PersonaType,
} from './types';
import { ConversationMemoryData } from './conversation-memory';

export interface CRMIntegrationAction {
  action: 'create_lead' | 'update_lead' | 'log_interaction' | 'none';
  details: Record<string, unknown>;
}

export interface CalendarBookingSuggestion {
  message: string;
  recommendedSlots: string[];
  bookingCTA: CTASelectionResult;
}

export interface SalesAnalyticsSummary {
  qualificationProgress: number;
  conversionLikelihood: number;
  objectionRisk: number;
  leadScore: number;
  salesStage: string;
  bucket: 'cold' | 'warm' | 'hot';
}

export interface SalesConversionResult {
  playbook: SalesPlaybookStrategy;
  recommendedPlan: string;
  nextStep: 'ask_qualification' | 'recommend_trial' | 'schedule_demo' | 'contact_sales' | 'review_pricing' | 'continue_education' | 'follow_up' | 'none';
  recommendationReason: string;
  crmAction: CRMIntegrationAction;
  calendarBooking?: CalendarBookingSuggestion;
  analytics: SalesAnalyticsSummary;
}

export interface SalesConversionInput {
  message: string;
  memory: ConversationMemoryData;
  ciResult: ConversationIntelligenceResult;
  plan: {
    goal: ConversationGoal;
    customerIntent: CustomerIntent;
    funnelStage: FunnelStageExtended;
    missingQualification: string[];
    topicsToDiscuss?: DiscernedTopic[];
  };
}

function normalizeBudget(budget?: string): number | null {
  if (!budget) return null;
  const cleaned = budget.replace(/[^0-9\.]/g, '');
  const value = parseFloat(cleaned);
  if (Number.isNaN(value)) return null;
  return value;
}

function deriveBusinessIntelligence(memory: ConversationMemoryData): {
  industry?: string;
  businessType?: string;
  pricingModel?: string;
  trustSignals?: string[];
  products?: string[];
  services?: string[];
  contactDetails?: string[];
} {
  const trustSignals = [] as string[];
  if (memory.trustLevel === 'high') trustSignals.push('Strong trust signal');
  if (memory.persona === 'enterprise') trustSignals.push('Enterprise buyer');
  if (memory.companySize) trustSignals.push(`${memory.companySize} company`);
  if (memory.useCase) trustSignals.push(`Use case: ${memory.useCase}`);

  return {
    industry: memory.industry,
    businessType: 'saas',
    pricingModel: memory.budget,
    trustSignals,
    products: memory.recommendedPlan ? [memory.recommendedPlan] : [],
    services: memory.useCase ? [memory.useCase] : [],
    contactDetails: [],
  };
}

function deriveWebsiteScanner(message: string, memory: ConversationMemoryData): {
  pageType?: string;
  pageSummary?: string;
  extractedSignals?: string[];
} {
  const signals: string[] = [];
  const lower = message.toLowerCase();
  if (/(pricing|cost|plan|price)/.test(lower)) signals.push('pricing');
  if (/(demo|book|schedule|appointment|call)/.test(lower)) signals.push('booking');
  if (/(security|soc2|compliance)/.test(lower)) signals.push('security');
  if (/(integration|api|webhook)/.test(lower)) signals.push('integration');
  const pageType = memory.currentStage === 'pricing' ? 'pricing' : signals.includes('booking') ? 'contact' : 'product';

  return {
    pageType,
    pageSummary: message,
    extractedSignals: signals,
  };
}

function deriveKnowledgeEngine(memory: ConversationMemoryData): { facts?: string[] } {
  const facts: string[] = [];
  if (memory.industry) facts.push(`Industry: ${memory.industry}`);
  if (memory.companySize) facts.push(`Company size: ${memory.companySize}`);
  if (memory.useCase) facts.push(`Use case: ${memory.useCase}`);
  if (memory.currentHelpdesk) facts.push(`Current helpdesk: ${memory.currentHelpdesk}`);
  if (memory.budget) facts.push(`Budget: ${memory.budget}`);
  return { facts };
}

function detectVisitorIntent(message: string): { primaryIntent: string; confidence: number; supportingEvidence: string[]; recommendedNextAction: string } {
  const lower = message.toLowerCase();
  const evidence: string[] = [];
  let intent = 'General Information';
  let confidence = 0.45;

  if (/(buy|purchase|sign up|start trial|get started|free trial)/.test(lower)) {
    intent = 'Buying';
    confidence = 0.9;
    evidence.push('Explicit buying language');
  } else if (/(\bhow much (is|does|would|will)\b|\bwhat(?:'s| is) the (price|cost)\b|\b(?:get|send|give) me a quote\b|\bwhat do you charge\b|\bstarting at\b|\bcan i (see|get) (pricing|a quote)\b)/.test(lower)) {
    intent = 'Pricing';
    confidence = 0.85;
    evidence.push('Explicit pricing inquiry');
  } else if (/(compare|vs|competitor|alternative)/.test(lower)) {
    intent = 'Comparison';
    confidence = 0.8;
    evidence.push('Comparison language');
  } else if (/(demo|book|schedule|appointment|call)/.test(lower)) {
    intent = 'Booking';
    confidence = 0.85;
    evidence.push('Booking request');
  } else if (/(support|help|issue|problem|ticket)/.test(lower)) {
    intent = 'Support';
    confidence = 0.75;
    evidence.push('Support ask');
  } else if (/(security|compliance|privacy|soc2|gdpr)/.test(lower)) {
    intent = 'Product Research';
    confidence = 0.7;
    evidence.push('Security concerns');
  }

  const recommendedNextAction = intent === 'Buying' ? 'Start trial' : intent === 'Pricing' ? 'Compare plans' : intent === 'Booking' ? 'Book a demo' : 'Learn more';

  return { primaryIntent: intent, confidence, supportingEvidence: evidence, recommendedNextAction };
}

function chooseRecommendedPlan(memory: ConversationMemoryData, planGoal: ConversationGoal): string {
  const budgetValue = normalizeBudget(memory.budget);
  if (memory.persona === 'enterprise' || planGoal === 'schedule_demo') return 'Enterprise';
  if (budgetValue !== null && budgetValue >= 4200) return 'Enterprise';
  if (memory.companySize && /1200\+/.test(memory.companySize)) return 'Enterprise';
  if (budgetValue !== null && budgetValue >= 900) return 'Professional';
  return 'Starter';
}

function chooseNextStep(playbook: SalesPlaybookStrategy): SalesConversionResult['nextStep'] {
  return playbook.nextStep;
}

function buildCRMAction(memory: ConversationMemoryData, planGoal: ConversationGoal): CRMIntegrationAction {
  if (memory.buyingIntentDetected || planGoal === 'recommend_plan' || planGoal === 'close_trial' || planGoal === 'schedule_demo') {
    return {
      action: 'create_lead',
      details: {
        industry: memory.industry,
        companySize: memory.companySize,
        persona: memory.persona,
        stage: planGoal,
        trustLevel: memory.trustLevel,
        conviction: memory.buyingIntentDetected ? 'high' : 'medium',
      },
    };
  }

  if (memory.qualificationCollected.questionsAskedCount > 0) {
    return {
      action: 'update_lead',
      details: {
        qualificationProgress: memory.qualificationCollected.questionsAskedCount,
        missingQualification: memory.qualificationCollected.completed ? [] : [],
      },
    };
  }

  return { action: 'none', details: {} };
}

function buildCalendarBookingSuggestion(
  planGoal: ConversationGoal,
  memory: ConversationMemoryData,
  playbook: SalesPlaybookStrategy,
  message: string,
): CalendarBookingSuggestion | undefined {
  const wantsBooking = /(demo|walkthrough|schedule|appointment|call)/i.test(message);
  if (planGoal !== 'schedule_demo' && playbook.cta.primaryCTA !== 'book_demo' && !wantsBooking) return undefined;

  const slots = ['Tomorrow 10:00 AM', 'Tomorrow 2:00 PM', 'Thursday 11:00 AM'];
  const prompt = memory.persona === 'enterprise'
    ? 'I can book an enterprise walkthrough tailored to your team — what time works best?'
    : 'I can schedule a quick demo to show this in action. Which slot works for you?';

  return {
    message: prompt,
    recommendedSlots: slots,
    bookingCTA: {
      primaryCTA: 'book_demo',
      label: memory.persona === 'enterprise' ? 'Book Enterprise Demo' : 'Book a Demo',
      link: '/contact',
      secondaryCTA: 'none',
      secondaryLabel: undefined,
      secondaryLink: undefined,
    },
  };
}

function buildAnalyticsSummary(
  memory: ConversationMemoryData,
  ciResult: ConversationIntelligenceResult,
  plan: SalesConversionInput['plan'],
): SalesAnalyticsSummary {
  const qualificationProgress = memory.qualificationCollected.completed ? 100 : Math.min(90, memory.qualificationCollected.questionsAskedCount * 25);
  const leadScore = memory.leadScore || 0;
  const objectionRisk = ciResult.objection.isObjection ? 75 : 20;
  const conversionLikelihood = Math.round(
    Math.max(0, Math.min(100,
      leadScore * 0.4 + (memory.trustLevel === 'high' ? 20 : memory.trustLevel === 'medium' ? 10 : 0) + qualificationProgress * 0.2 - objectionRisk * 0.25 + (plan.goal === 'close_trial' ? 15 : 0)
    )),
  );
  let bucket: 'cold' | 'warm' | 'hot';
  if (plan.funnelStage === 'decision' || memory.buyingIntentDetected || /1200\+/.test(memory.companySize)) {
    bucket = 'hot';
  } else if (plan.funnelStage === 'consideration' || memory.trustLevel === 'high') {
    bucket = 'warm';
  } else {
    bucket = 'cold';
  }

  return {
    qualificationProgress,
    conversionLikelihood,
    objectionRisk,
    leadScore,
    salesStage: plan.goal,
    bucket,
  };
}

export function buildSalesConversionSignals(input: SalesConversionInput): SalesConversionResult {
  const { message, memory, ciResult, plan } = input;
  const visitorIntent = detectVisitorIntent(message);
  const businessIntelligence = deriveBusinessIntelligence(memory);
  const websiteScanner = deriveWebsiteScanner(message, memory);
  const knowledgeEngine = deriveKnowledgeEngine(memory);

  const playbook = buildSalesPlaybook({
    visitorIntent,
    businessIntelligence,
    websiteScanner,
    knowledgeEngine,
    conversationStage: plan.funnelStage,
    planGoal: plan.goal,
  });

  const recommendedPlan = chooseRecommendedPlan(memory, plan.goal);
  const nextStep = chooseNextStep(playbook);
  const crmAction = buildCRMAction(memory, plan.goal);
  const calendarBooking = buildCalendarBookingSuggestion(plan.goal, memory, playbook, message);
  const analytics = buildAnalyticsSummary(memory, ciResult, plan);
  const recommendationReason = `The playbook recommends ${playbook.recommendationStrategy} based on current intent, stage, and qualification signals.`;

  return {
    playbook,
    recommendedPlan,
    nextStep,
    recommendationReason,
    crmAction,
    calendarBooking,
    analytics,
  };
}
