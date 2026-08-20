import {
  ConversationMemoryData,
  ConversationGoal,
  CustomerIntent,
  FunnelStageExtended,
  DiscernedTopic,
  TurnRecord,
  DecisionTraceRecord,
  createMemory,
  fromLegacyMemory,
  discernTopics,
  markTopicExplained,
  markTopicCompleted,
  markCTARejected,
  isTopicExplained,
  isCTARejected,
  isGoalAchieved,
  extractSalesSignals,
  pushDecisionTrace,
  recordTelemetryEvent,
} from './conversation-memory';
import { planConversation, ActionScore } from './conversation-planner';
import { validateResponse } from './conversation-validator';
import { processConversationIntelligence, IntelligenceInput } from './conversation-intelligence-service';
import {
  ConversationIntelligenceMemory,
  ConversationIntelligenceResult,
  SentimentSnapshot,
  AbandonmentRisk,
  RepetitionStatus,
  EscalationRecommendation,
  RoutingDecision,
  TrustSignal,
} from './conversation-intelligence-types';
import {
  OrchestratedTurnResult,
  CTASelectionResult,
  CTAType,
  ConversationUIState,
  PersonaType,
  SmartButton,
  FunnelStage,
  BuyerRole,
  BuyingIntentResult,
  ObjectionResult,
  ObjectionCategory,
  QualificationState,
  PersonaDetectionResult,
  ConversationStage,
  Temperature,
  NextBestAction,
  NextBestActionType,
  DebugPanel,
} from './types';
import { buttonTelemetry } from './button-telemetry';
import { KnowledgeBaseProvider } from './knowledge-base-provider';
import {
  normalizeMessageContent,
  PayloadValidationError,
  UpstreamLLMError,
} from './message-content';

function detectSentimentPolarity(message: string): number {
  const lower = message.toLowerCase();
  let polarity = 0;
  const positive = /great|awesome|amazing|perfect|excellent|love|wonderful|fantastic|good|nice|helpful|thank|thanks|works|solved|impressed/i;
  const negative = /bad|terrible|awful|horrible|hate|disappointed|frustrated|angry|wrong|error|issue|problem|broken|not.working|poor/i;
  if (positive.test(lower)) polarity += 0.15;
  if (negative.test(lower)) polarity -= 0.15;
  if (lower.includes('?')) polarity -= 0.05;
  return Math.max(-1, Math.min(1, polarity));
}

function buildMinimalCIResult(memory: ConversationMemoryData, message: string): ConversationIntelligenceResult {
  const polarity = detectSentimentPolarity(message);
  const sentiment: SentimentSnapshot = {
    polarity,
    frustration: 'low',
    urgency: 'low',
    trend: memory.turnCount > 0 ? 'stable' : 'stable',
  };
  const objection: ObjectionResult = { isObjection: false, category: 'none', groundedAnswer: '', sources: [] };
  return {
    responseText: '',
    leadScore: { overallScore: memory.leadScore || 0 },
    conversationScore: { overallScore: memory.conversationScore || 0 },
    sentiment,
    abandonmentRisk: { level: 'low', score: 10 } as AbandonmentRisk,
    repetition: { hasRepetition: false, count: 0, topics: [] } as RepetitionStatus,
    escalation: { shouldEscalate: false, urgency: 'low' } as EscalationRecommendation,
    routingDecision: { decision: 'assistant', confidence: 0.95, label: 'Handled by AI assistant' } as RoutingDecision,
    trustSignal: { shouldInject: false } as TrustSignal,
    buyingIntent: { hasBuyingIntent: memory.buyingIntentDetected, confidence: 0 } as BuyingIntentResult,
    objection,
    qualification: { ...memory.qualificationCollected },
    qualificationProgress: memory.qualificationCollected.completed ? 100 : 0,
    persona: { persona: memory.persona || 'unknown', confidence: 0, reasoning: '' } as PersonaDetectionResult,
    funnelStage: (memory.funnelStage === 'greeting' ? 'greeting' : memory.funnelStage === 'awareness' ? 'discovery' : memory.funnelStage === 'interest' ? 'interest' : memory.funnelStage === 'evaluation' || memory.funnelStage === 'consideration' ? 'evaluation' : memory.funnelStage === 'purchase_intent' ? 'purchase_intent' : memory.funnelStage === 'decision' ? 'purchase_intent' : 'discovery') as FunnelStage,
    cta: { primaryCTA: 'none' as CTAType, label: '', link: '' },
    quickReplies: [],
    uiState: { buttons: [], suggestedActions: [] },
    sources: [],
    isFallback: false,
    turnCount: memory.turnCount,
  };
}

function updateTrustFromSentiment(memory: ConversationMemoryData, polarity: number): void {
  if (polarity > 0.2) memory.trustLevel = 'high';
  else if (polarity > 0) memory.trustLevel = 'medium';
  else if (polarity < -0.3) memory.trustLevel = 'low';
  else if (memory.turnCount > 4 && memory.trustLevel === 'medium') memory.trustLevel = 'high';
  else if (memory.turnCount > 1 && memory.trustLevel === 'low') memory.trustLevel = 'medium';
}

function calculateCustomerTemperature(
  memory: ConversationMemoryData,
  plan: { goal: ConversationGoal; customerIntent: CustomerIntent; funnelStage: FunnelStageExtended },
  ciResult: ConversationIntelligenceResult,
): Temperature {
  let score = 0;
  if (memory.trustLevel === 'high') score += 2;
  else if (memory.trustLevel === 'medium') score += 1;
  if (memory.buyingIntentDetected) score += 2;
  if (memory.qualificationCollected.completed) score += 1;
  if (ciResult.objection.isObjection) score -= 1;
  if (ciResult.sentiment.polarity > 0.2) score += 1;
  if (ciResult.sentiment.polarity < -0.3) score -= 1;
  if (memory.isAbandoned || plan.customerIntent === 'leaving') return 'lost';
  if (plan.goal === 'handle_objection' && ciResult.objection.isObjection && memory.trustLevel === 'low') return 'cold';
  if (plan.goal === 'close_trial' || plan.goal === 'recommend_plan') {
    if (score >= 4) return 'ready_to_buy';
    if (score >= 2) return 'hot';
  }
  if (score >= 3) return 'hot';
  if (score >= 1) return 'warm';
  return 'cold';
}

function determineNextBestAction(
  plan: { goal: ConversationGoal; customerIntent: CustomerIntent; funnelStage: FunnelStageExtended },
  memory: ConversationMemoryData,
  ciResult: ConversationIntelligenceResult,
): NextBestAction {
  let confidence = 0.3;
  let expectedValue = 0.2;
  let risk: 'low' | 'medium' | 'high' = 'low';
  let reason = 'Based on the current goal, customer intent, and objections.';

  if (plan.goal === 'handle_objection') {
    reason = 'The customer has an objection and the goal is to resolve it before moving forward.';
    confidence = 0.8;
    expectedValue = 0.7;
    risk = ciResult.objection.isObjection ? 'medium' : 'low';
    return { action: 'handle_objection', confidence, expectedValue, risk, reason };
  }

  if (plan.goal === 'qualify') {
    reason = 'We need qualification details to recommend the right plan.';
    confidence = 0.75;
    expectedValue = 0.65;
    risk = 'low';
    return { action: 'ask_qualification', confidence, expectedValue, risk, reason };
  }

  if (plan.goal === 'answer_question' || plan.customerIntent === 'learning') {
    reason = 'The customer is seeking information, so education is the next best step.';
    confidence = 0.7;
    expectedValue = 0.45;
    risk = 'low';
    return { action: 'educate', confidence, expectedValue, risk, reason };
  }

  if (plan.goal === 'recommend_plan' || plan.goal === 'close_trial') {
    reason = 'The customer is evaluating or ready to buy, so offering a trial or demo is valuable.';
    confidence = 0.8;
    expectedValue = 0.8;
    risk = 'medium';
    return { action: 'offer_trial', confidence, expectedValue, risk, reason };
  }

  if (plan.goal === 'schedule_demo' || memory.persona === 'enterprise') {
    reason = 'Enterprise-oriented conversations often benefit from booking a demo.';
    confidence = 0.75;
    expectedValue = 0.75;
    risk = 'medium';
    return { action: 'book_demo', confidence, expectedValue, risk, reason };
  }

  if (plan.goal === 'finish_conversation' || memory.isLeaving) {
    reason = 'The customer appears ready to disengage, so it is safest to wait or end gracefully.';
    confidence = 0.65;
    expectedValue = 0.2;
    risk = 'low';
    return { action: 'wait', confidence, expectedValue, risk, reason };
  }

  if (ciResult.objection.isObjection) {
    reason = 'An objection is present and should be addressed to prevent losing the customer.';
    confidence = 0.7;
    expectedValue = 0.6;
    risk = 'medium';
    return { action: 'handle_objection', confidence, expectedValue, risk, reason };
  }

  reason = 'Continue advancing the conversation toward action by showing proof or next steps.';
  confidence = 0.6;
  expectedValue = 0.5;
  risk = 'low';
  return { action: 'show_proof', confidence, expectedValue, risk, reason };
}

function estimateConversionPrediction(
  memory: ConversationMemoryData,
  plan: { goal: ConversationGoal; customerIntent: CustomerIntent; funnelStage: FunnelStageExtended },
  ciResult: ConversationIntelligenceResult,
): Record<string, number> {
  const base = memory.trustLevel === 'high' ? 0.25 : memory.trustLevel === 'medium' ? 0.15 : 0.05;
  const intent = memory.buyingIntentDetected ? 0.25 : 0;
  const temp = memory.customerTemperature === 'ready_to_buy' ? 0.25 : memory.customerTemperature === 'hot' ? 0.18 : memory.customerTemperature === 'warm' ? 0.1 : 0;
  const qual = memory.qualificationCollected.completed ? 0.1 : 0;
  const objection = ciResult.objection.isObjection ? -0.08 : 0;
  const leaving = memory.isLeaving ? -0.1 : 0;
  const purchaseLikelihood = Math.min(0.95, Math.max(0, base + intent + temp + qual + objection + leaving));
  const demoLikelihood = Math.min(0.95, Math.max(0, base + 0.2 + (memory.currentStage === 'decision' ? 0.1 : 0) + qual - (ciResult.objection.isObjection ? 0.05 : 0)));
  const leaveLikelihood = Math.min(0.95, Math.max(0, 0.15 - intent + (memory.customerTemperature === 'cold' ? 0.15 : 0) + (ciResult.objection.isObjection ? 0.1 : 0)));
  return {
    likelihoodToBookDemo: Math.round(demoLikelihood * 100),
    likelihoodToPurchase: Math.round(purchaseLikelihood * 100),
    likelihoodToLeave: Math.round(leaveLikelihood * 100),
    likelihoodToStay: Math.max(0, 100 - Math.round(leaveLikelihood * 100)),
  };
}

function buildDebugPanel(
  memory: ConversationMemoryData,
  plan: { goal: ConversationGoal; customerIntent: CustomerIntent; funnelStage: FunnelStageExtended },
  ciResult: ConversationIntelligenceResult,
  quickReplies: SmartButton[],
  nextBestAction: NextBestAction,
  momentum: MomentumResult,
): DebugPanel {
  const topButtons = quickReplies.slice(0, 10).map(btn => ({ id: btn.id, label: btn.label, score: btn.score ?? 0, category: btn.category, reason: btn.reason }));
  const buttonScores = Object.fromEntries(quickReplies.map(btn => [btn.id, btn.score ?? 0]));
  const conversionPrediction = estimateConversionPrediction(memory, plan, ciResult);
  const qualificationPercent = memory.qualificationCollected.completed ? 100 : Math.min(90, memory.qualificationCollected.questionsAskedCount * 15);
  const expectedValue = nextBestAction.expectedValue;
  const decisionReason = `Selected ${nextBestAction.action} because ${nextBestAction.reason}`;

  return {
    conversationStage: memory.currentStage ?? 'discovery',
    customerTemperature: memory.customerTemperature ?? 'cold',
    buyingIntent: ciResult.buyingIntent,
    trustLevel: memory.trustLevel,
    momentum,
    qualificationPercent,
    objections: memory.objectionsHandled,
    nextBestAction,
    topButtons,
    buttonScores,
    expectedValue,
    decisionReason,
    conversionPrediction,
  };
}

function checkQualificationCompletion(memory: ConversationMemoryData): void {
  if (memory.qualificationCollected.completed) return;
  const required = [memory.companySize, memory.industry].filter(Boolean);
  const optional = [memory.useCase, memory.monthlyConversations, memory.currentHelpdesk, memory.budget].filter(Boolean);
  if (required.length >= 2 && optional.length >= 1) {
    memory.qualificationCollected.completed = true;
  }
}

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
  detectIndustry,
  adaptResponseToContext,
  contextualizeShortReply,
  handleMidConversationGreeting,
} from './conversation-personality';
import { processConversationDirector, ConversationStrategy } from './conversation-director';

export interface BrainInput {
  message: string;
  responseText: string;
  legacyMemory: ConversationIntelligenceMemory;
  rejectedCTAs?: string[];
  clickedButtonIds?: string[];
  ignoredButtonIds?: string[];
  tenantId?: string;
  knowledgeBaseProvider?: KnowledgeBaseProvider;
  /**
   * Tenant-level CTA/business profile (derived from the widget config's
   * business_profile JSON). Lets a tenant swap the SaaS "Book a demo / Free
   * trial" CTAs and button catalog for store- or clinic-appropriate ones.
   */
  businessProfile?: TenantCtaProfile;
}

/**
 * Optional per-tenant CTA configuration carried inside the widget config's
 * `business_profile` JSON. When present, the brain prefers these over the
 * built-in SaaS CTAs; when absent, the default SaaS behavior is unchanged.
 */
export interface TenantCtaProfile {
  /** Primary business goal, e.g. 'book_demo' | 'direct_checkout' | 'product_recommendation' | 'appointment_booking'. */
  primary_goal?: string;
  /** Funnel CTA override (label + link) used for buying-oriented turns. */
  cta?: { type?: string; label: string; link: string };
  /** Replacement button catalog for dynamic quick replies (store/clinic chips). */
  button_catalog?: Array<{
    id: string;
    label: string;
    payload: string;
    action?: 'send_text' | 'navigate' | 'open_modal';
    variant?: 'primary' | 'secondary' | 'outline';
    category?: string;
    defaultScore?: number;
    icon?: string;
    locale?: string;
    tags?: string[];
  }>;
}

export interface DecisionTrace {
  chosenButtons: Array<{ id: string; label: string; category?: string; score: number }>;
  buttonScores: Record<string, number>;
  buttonClicked?: string[];
  buttonCTR: Record<string, number>;
}

export interface BrainOutput {
  responseText: string;
  cta: CTASelectionResult;
  quickReplies: SmartButton[];
  uiState: ConversationUIState;
  memory: ConversationMemoryData;
  legacyMemory: ConversationIntelligenceMemory;
  plan: {
    customerIntent: CustomerIntent;
    funnelStage: FunnelStageExtended;
    conversationStage: ConversationStage;
    buyerRole: BuyerRole;
    goal: ConversationGoal;
    topicsToDiscuss: DiscernedTopic[];
    missingQualification: string[];
  };
  validation: { valid: boolean; issues: string[] };
  ciResult: ConversationIntelligenceResult;
  orchestratorResult: OrchestratedTurnResult;
  planRecommendation?: { plan: string; explanation: string };
  contextReference?: string | null;
  acknowledgment?: string | null;
  strategy?: ConversationStrategy;
  momentum?: MomentumResult;
  qualityMetrics?: QualityMetrics;
  decisionTrace?: DecisionTrace;
  debugPanel?: DebugPanel;
  extractedLead?: { email?: string; phone?: string; name?: string; company?: string };
}

export interface ExtractedLeadFields {
  email?: string;
  phone?: string;
  name?: string;
  company?: string;
}

const LEAD_EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

const LEAD_PHONE_REGEX = /(?<![\d+])(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?(?:\d{3}[\s.-]?\d{3}[\s.-]?\d{4}|\d{3}[\s.-]?\d{4})(?!\d)/;

const LEAD_NAME_PATTERNS: RegExp[] = [
  /\bmy name is\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/i,
  /\bI'?m\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=\s*(?:,|\.|!|\?|$|\s+(?:from|at|working|the|and|but)))/i,
  /\bI am\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=\s*(?:,|\.|!|\?|$|\s+(?:from|at|working|the|and|but)))/i,
  /\bcall me\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/i,
];

const LEAD_COMPANY_PATTERNS: RegExp[] = [
  /\bI work at\s+([A-Za-z0-9&'.-]+(?:\s+[A-Za-z0-9&'.-]+)*)/i,
  /\bI'?m from\s+([A-Za-z0-9&'.-]+(?:\s+[A-Za-z0-9&'.-]+)*)/i,
];

const LEAD_STOP_WORDS = new Set([
  'the', 'a', 'an', 'this', 'that', 'and', 'but', 'for', 'with', 'from', 'at',
  'my', 'your', 'our', 'their', 'not', 'can', 'will', 'would', 'please', 'about',
  'just', 'want', 'need', 'thanks', 'thank', 'hello', 'hi', 'hey', 'ok', 'okay',
  'sure', 'yes', 'no', 'i', 'we',
]);

function filterProperLeadWords(value: string): string | undefined {
  if (!value) return undefined;
  const words = value.trim().split(/\s+/).filter(w => w.length > 0);
  const kept = words.filter(w => /^[A-Z]/.test(w) && !/^[A-Z]{3,}$/.test(w) && !LEAD_STOP_WORDS.has(w.toLowerCase()));
  if (kept.length === 0) return undefined;
  return kept.join(' ');
}

function extractLeadDetails(message: string): ExtractedLeadFields {
  if (!message || typeof message !== 'string') return {};
  const details: ExtractedLeadFields = {};

  const emailMatch = message.match(LEAD_EMAIL_REGEX);
  if (emailMatch) details.email = emailMatch[0].toLowerCase();

  const phoneMatch = message.match(LEAD_PHONE_REGEX);
  if (phoneMatch) {
    const phone = phoneMatch[0].trim();
    if (phone.replace(/[^\d]/g, '').length >= 7) details.phone = phone;
  }

  for (const pattern of LEAD_NAME_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const name = filterProperLeadWords(match[1].trim().replace(/[.,!?;]+$/g, '').trim());
      if (name) {
        details.name = name;
        break;
      }
    }
  }

  for (const pattern of LEAD_COMPANY_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const company = filterProperLeadWords(match[1].trim().replace(/[.,!?;]+$/g, '').trim());
      if (company) {
        details.company = company;
        break;
      }
    }
  }

  return details;
}

function mergeLeadFields(regex: ExtractedLeadFields, structured: ExtractedLeadFields | undefined | null): ExtractedLeadFields {
  const merged: ExtractedLeadFields = { ...regex };
  if (structured) {
    if (structured.email) merged.email = structured.email.toLowerCase();
    if (structured.phone) merged.phone = structured.phone;
    if (structured.name) merged.name = structured.name;
    if (structured.company) merged.company = structured.company;
  }
  return merged;
}

function parseStructuredLeadFields(parsed: any): ExtractedLeadFields | null {
  const raw = parsed && typeof parsed === 'object' ? parsed.extractedLead : null;
  if (!raw || typeof raw !== 'object') return null;
  const fields: ExtractedLeadFields = {};
  if (typeof raw.email === 'string' && raw.email.trim()) fields.email = raw.email.trim();
  if (typeof raw.phone === 'string' && raw.phone.trim()) fields.phone = raw.phone.trim();
  if (typeof raw.name === 'string' && raw.name.trim()) fields.name = raw.name.trim();
  if (typeof raw.company === 'string' && raw.company.trim()) fields.company = raw.company.trim();
  return Object.keys(fields).length > 0 ? fields : null;
}

/**
 * Parses the LLM's raw text output into a JSON object. Strips markdown code
 * fences and returns null on any malformed output so callers can fall back to
 * the heuristic engine instead of failing the turn.
 */
function parseLLMResponse(rawText: string): any | null {
  if (!rawText || typeof rawText !== 'string') return null;
  try {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

const FOLLOW_UP_BY_GOAL: Record<ConversationGoal, string[]> = {
  build_trust: [
    "Would you like me to walk you through how it works?",
    "Curious what other teams in your industry are doing?",
    "I'd love to show you how we help teams like yours.",
  ],
  answer_question: [
    "Does that answer your question?",
    "Would you like more detail on any part?",
    "Happy to go deeper into any of those points.",
  ],
  handle_objection: [
    "Would a quick demo help put your mind at ease?",
    "Want me to walk you through how that works step by step?",
    "I can connect you with our team if you'd like to discuss further.",
  ],
  qualify: [
    "To make sure I recommend the right plan,",
    "To help narrow down the best option for you,",
  ],
  advance_funnel: [
    "Want to see how it compares with your current setup?",
    "Would it help to walk through the next steps?",
    "Ready to explore what this would look like for your team?",
  ],
  recommend_plan: [
    "Want to get started with that plan?",
    "Should we set up a trial so you can test it out?",
    "Would you like me to walk through what's included?",
  ],
  close_trial: [
    "Ready to start your free trial?",
    "Want to get signed up and explore on your own?",
  ],
  schedule_demo: [
    "When works best for a quick walkthrough?",
    "Want to book a demo to see it in action?",
  ],
  recover_abandonment: [
    "What would make this the right time to revisit?",
    "Can I share a quick overview that might change your mind?",
  ],
  finish_conversation: [
    "Come back anytime.",
    "I am here when you need me.",
  ],
  none: [],
};

interface QRDef {
  id: string; label: string; payload: string; variant: 'primary' | 'secondary' | 'outline'; action?: 'send_text' | 'navigate';
}

interface RelevantKnownFacts {
  industry: string | null;
  companySize: string | null;
  monthlyConversations: string | null;
  persona: PersonaType | null;
  currentGoal: ConversationGoal;
  objectionsHandled: ObjectionCategory[];
  previousRecommendations: Array<{ planName: string; reason?: string }>;
  topicsExplained: string[];
  buyingIntent: string | null;
  useCase?: string | null;
  helpdesk: string | null;
  securityNeeds: string[] | null;
  budget: string | null;
  userContext: string[];
}

function getContextPrefix(memory: ConversationMemoryData, relevantFacts: RelevantKnownFacts, previousResponses: string[] = []): string | null {
  const persona = memory.persona && memory.persona !== 'unknown' ? memory.persona.replace(/_/g, ' ') : null;
  let phrase: string | null = null;
  if (relevantFacts.industry) phrase = `For ${relevantFacts.industry} teams, this is especially relevant.`;
  else if (persona) phrase = `For ${persona} teams, this is especially relevant.`;
  else if (relevantFacts.useCase) phrase = `For ${relevantFacts.useCase} use cases, this is especially relevant.`;
  else if (relevantFacts.companySize) phrase = `For a ${relevantFacts.companySize}-person team, this is especially relevant.`;
  if (!phrase) return null;

  // Never repeat the same context boilerplate if it was already used in an
  // earlier turn of this conversation (detected via the telltale phrase).
  const lower = phrase.toLowerCase().trim();
  const alreadyUsed = previousResponses.some((r) => r.toLowerCase().includes(lower));
  return alreadyUsed ? null : phrase;
}

const QUICK_REPLIES_BY_GOAL: Record<ConversationGoal, QRDef[]> = {
  build_trust: [
    { id: 'qr_how_works', label: 'How It Works', payload: 'How does the grounding engine work?', variant: 'secondary' },
    { id: 'qr_customers', label: 'Customer Stories', payload: 'Tell me about your customers', variant: 'outline' },
    { id: 'qr_security', label: 'Security & Trust', payload: 'Tell me about security', variant: 'outline' },
  ],
  answer_question: [
    { id: 'qr_deeper', label: 'Tell Me More', payload: 'Can you elaborate on that?', variant: 'secondary' },
    { id: 'qr_related', label: 'Related Features', payload: 'What related features do you have?', variant: 'outline' },
  ],
  handle_objection: [
    { id: 'qr_demo', label: 'Book a Demo', payload: '/signup', variant: 'primary', action: 'navigate' },
    { id: 'qr_case_study', label: 'See Case Studies', payload: 'Show me customer success stories', variant: 'secondary' },
  ],
  qualify: [
    { id: 'qr_help_choose', label: 'Help Me Choose', payload: 'Help me find the right plan', variant: 'primary' },
    { id: 'qr_features', label: 'View Features', payload: 'What features do you offer?', variant: 'secondary' },
  ],
  advance_funnel: [
    { id: 'qr_pricing', label: 'See Pricing', payload: 'What are your pricing tiers?', variant: 'secondary' },
    { id: 'qr_demo', label: 'Watch Demo', payload: '/signup', variant: 'primary', action: 'navigate' },
  ],
  recommend_plan: [
    { id: 'qr_trial', label: 'Start Free Trial', payload: '/signup', variant: 'primary', action: 'navigate' },
    { id: 'qr_compare', label: 'Compare Plans', payload: 'Compare all plan features', variant: 'secondary' },
  ],
  close_trial: [
    { id: 'qr_signup', label: 'Start 14-Day Trial', payload: '/signup', variant: 'primary', action: 'navigate' },
    { id: 'qr_contact', label: 'Talk to Sales', payload: 'I want to talk to sales', variant: 'secondary' },
  ],
  schedule_demo: [
    { id: 'qr_book_demo', label: 'Book 15-Min Demo', payload: '/contact', variant: 'primary', action: 'navigate' },
    { id: 'qr_contact_sales', label: 'Contact Sales', payload: 'Connect me with sales', variant: 'secondary' },
  ],
  recover_abandonment: [
    { id: 'qr_special', label: 'See Current Offers', payload: 'Tell me about current promotions', variant: 'primary' },
    { id: 'qr_quick_demo', label: 'Quick Overview', payload: 'Give me a quick overview', variant: 'secondary' },
  ],
  finish_conversation: [],
  none: [],
};

const STAGE_BASED_CTA: Record<FunnelStageExtended, { primary: CTAType; label: string; link: string }> = {
  greeting: { primary: 'start_free_trial', label: 'Start Free Trial', link: '/signup' },
  awareness: { primary: 'pricing', label: 'See Pricing', link: '/pricing' },
  interest: { primary: 'start_free_trial', label: 'Start Free Trial', link: '/signup' },
  consideration: { primary: 'start_free_trial', label: 'Start 14-Day Trial', link: '/signup' },
  evaluation: { primary: 'start_free_trial', label: 'Start 14-Day Free Trial', link: '/signup' },
  purchase_intent: { primary: 'start_free_trial', label: 'Start Free Trial', link: '/signup' },
  decision: { primary: 'contact_sales', label: 'Contact Sales', link: '/contact' },
  customer: { primary: 'support', label: 'Get Support', link: '/support' },
  support: { primary: 'support', label: 'Contact Support', link: '/support' },
};

const PERSONA_SPECIFIC_CTA: Partial<Record<PersonaType, { primary: CTAType; label: string; link: string }>> = {
  enterprise: { primary: 'book_demo', label: 'Book Enterprise Demo', link: '/contact' },
  developer: { primary: 'developer_docs', label: 'View Developer Docs', link: '/docs' },
  agency: { primary: 'partner_program', label: 'Join Partner Program', link: '/contact' },
};

function inferPersonaFromMessage(message: string, memory: ConversationMemoryData): PersonaType {
  const lower = message.toLowerCase();
  if (/(shopify|woocommerce|magento|cart|checkout|ecommerce|store)/i.test(lower)) return 'ecommerce';
  if (/(zendesk|intercom|freshdesk|customer support|support manager|ticket deflection|help desk)/i.test(lower)) return 'support_manager';
  if (/(startup|founder|co-founder|saas|early stage|seed)/i.test(lower)) return 'startup';
  if (/(enterprise|procurement|sso|soc 2|tam|security questionnaire|vpc)/i.test(lower)) return 'enterprise';
  if (/(developer|api|sdk|webhook|code|integration)/i.test(lower)) return 'developer';
  if (memory.persona !== 'unknown') return memory.persona;
  return 'unknown';
}

function selectCTAByPlan(persona: PersonaType, plan: { goal: ConversationGoal; funnelStage: FunnelStageExtended; customerIntent: CustomerIntent }, memory: ConversationMemoryData, profile?: TenantCtaProfile): CTASelectionResult {
  // Tenant CTA override: e-commerce / clinic tenants replace the SaaS
  // "Start Free Trial" / "Book a Demo" funnel CTAs with their own conversion
  // action (e.g. shop the catalog, book an appointment).
  const profileCta = profile?.cta;
  const profileCtaResult = (): CTASelectionResult => ({
    primaryCTA: (profileCta!.type as CTAType) || 'contact_sales',
    label: profileCta!.label,
    link: profileCta!.link,
    secondaryCTA: undefined,
    secondaryLabel: undefined,
    secondaryLink: undefined,
  });

  if (memory.isLeaving || plan.goal === 'finish_conversation') {
    return {
      primaryCTA: 'contact_sales',
      label: 'Email Me Later',
      link: '/contact',
      secondaryCTA: 'none',
      secondaryLabel: undefined,
      secondaryLink: undefined,
    };
  }

  if (plan.goal === 'close_trial' || plan.goal === 'recommend_plan' || plan.customerIntent === 'buying') {
    if (profileCta) return profileCtaResult();
    if (persona === 'enterprise' && !isCTARejected(memory, 'book_demo')) {
      return {
        primaryCTA: 'book_demo',
        label: 'Book Enterprise Demo',
        link: '/contact',
        secondaryCTA: 'start_free_trial',
        secondaryLabel: 'Start Free Trial',
        secondaryLink: '/signup',
      };
    }
    return {
      primaryCTA: 'start_free_trial',
      label: 'Start 14-Day Free Trial',
      link: '/signup',
      secondaryCTA: 'book_demo',
      secondaryLabel: 'Book a Demo',
      secondaryLink: '/signup',
    };
  }

  if (plan.goal === 'handle_objection') {
    const hasProofGap = memory.trustLevel === 'low' || memory.salesSignals.trustIssues.length > 0 || memory.salesSignals.objections.length > 0;
    const hasBuyingSignal = memory.buyingIntentDetected || memory.qualificationCollected.completed || memory.salesSignals.timelineSignals.length > 0;
    const hasPriceObjection = memory.objectionsHandled.includes('price') || memory.salesSignals.objections.includes('price') || memory.salesSignals.budget === 'budget-sensitive';
    if (hasBuyingSignal && profileCta) return profileCtaResult();
    if (hasPriceObjection && !hasProofGap) {
      return {
        primaryCTA: 'start_free_trial',
        label: 'Start 14-Day Free Trial',
        link: '/signup',
        secondaryCTA: 'book_demo',
        secondaryLabel: 'Book a Demo',
        secondaryLink: '/signup',
      };
    }
    if (hasBuyingSignal) {
      return {
        primaryCTA: 'start_free_trial',
        label: 'Start 14-Day Free Trial',
        link: '/signup',
        secondaryCTA: 'book_demo',
        secondaryLabel: 'Book a Demo',
        secondaryLink: '/signup',
      };
    }
    if (hasProofGap || isCTARejected(memory, 'start_free_trial')) {
      return {
        primaryCTA: 'book_demo',
        label: 'Book a Demo',
        link: '/signup',
        secondaryCTA: 'contact_sales',
        secondaryLabel: 'Talk to Sales',
        secondaryLink: '/contact',
      };
    }
    return {
      primaryCTA: 'book_demo',
      label: 'See a Demo',
      link: '/signup',
      secondaryCTA: 'contact_sales',
      secondaryLabel: 'Talk to Sales',
      secondaryLink: '/contact',
    };
  }

  if (plan.goal === 'recover_abandonment') {
    if (profileCta) return profileCtaResult();
    return {
      primaryCTA: 'book_demo',
      label: 'Book a Quick Demo',
      link: '/signup',
      secondaryCTA: 'contact_sales',
      secondaryLabel: 'Special Offer',
      secondaryLink: '/contact',
    };
  }

  const ctaOptions: Array<{ primary: CTAType; label: string; link: string }> = [];

  if (profileCta) {
    return profileCtaResult();
  }

  const personaCta = PERSONA_SPECIFIC_CTA[persona];
  if (personaCta) ctaOptions.push(personaCta);

  const stageCta = STAGE_BASED_CTA[plan.funnelStage];
  if (stageCta) ctaOptions.push(stageCta);

  ctaOptions.push(
    { primary: 'start_free_trial', label: 'Start Free Trial', link: '/signup' },
    { primary: 'book_demo', label: 'Book a Demo', link: '/signup' },
    { primary: 'contact_sales', label: 'Talk to Sales', link: '/contact' },
  );

  for (const opt of ctaOptions) {
    if (!isCTARejected(memory, opt.primary)) {
      return {
        primaryCTA: opt.primary,
        label: opt.label,
        link: opt.link,
        secondaryCTA: plan.goal === 'qualify' ? undefined : 'book_demo',
        secondaryLabel: plan.goal === 'qualify' ? undefined : 'Book a Demo',
        secondaryLink: plan.goal === 'qualify' ? undefined : '/signup',
      };
    }
  }

  return {
    primaryCTA: 'contact_sales',
    label: 'Contact Sales',
    link: '/contact',
    secondaryCTA: undefined,
    secondaryLabel: undefined,
    secondaryLink: undefined,
  };
}

// Strategy-first response builder - replaces generic template enrichment
function buildStrategyResponse(
  strategy: ConversationStrategy,
  message: string,
  memory: ConversationMemoryData,
  plan: { goal: ConversationGoal; customerIntent: CustomerIntent; funnelStage: FunnelStageExtended; missingQualification: string[]; topicsToDiscuss?: DiscernedTopic[] },
  ciResult: ConversationIntelligenceResult,
  relevantFacts: RelevantKnownFacts,
  tenantId?: string,
  kbProvider?: KnowledgeBaseProvider,
  profile?: TenantCtaProfile,
  previousResponses: string[] = [],
): string {
  const parts: string[] = [];

  const topicForResponse = strategy.topicToAnswer ?? (plan.topicsToDiscuss?.[0] as DiscernedTopic | undefined) ?? memory.currentTopic ?? null;

  // 0. Personalized opening based on user context and buying intent
  if (relevantFacts.buyingIntent) {
    const intentOpeners = {
      'ready to buy': "Great to hear you're ready to move forward.",
      'comparing options': "I'm glad you're comparing options — let me help you decide.",
    } as Record<string, string>;
    const lowerIntent = relevantFacts.buyingIntent.toLowerCase();
    for (const [key, opener] of Object.entries(intentOpeners)) {
      if (lowerIntent.includes(key)) {
        parts.push(opener);
        break;
      }
    }
  }

  // 1. Topic-specific core content (use the strategy topic, or a planned next topic when relevant)
  if (topicForResponse) {
    const topicContent = buildTopicResponse(strategy.topicToAnswer ?? topicForResponse, memory, ciResult, tenantId, kbProvider, message);
    if (topicContent) parts.push(topicContent);
  }

  // 2. Goal-specific content based on strategy
  const goalContent = buildGoalContent(strategy, message, memory, plan, ciResult);
  if (goalContent) parts.push(goalContent);

  // 2b. Strategy-chosen action (planner-directed) — override or augment goal behavior
  if (strategy.chosenAction) {
    const act = strategy.chosenAction.action;
    if (act === 'ask_qualification') {
      const qLabel = strategy.qualificationQuestion || (plan.missingQualification && plan.missingQualification[0]) || '';
      if (qLabel) {
        const qText = getQualificationQuestion(qLabel);
        if (!parts.join(' ').includes(qText.slice(0, 30))) {
          parts.push(qText);
          memory.questionsAnswered.push(qLabel);
        }
      }
    }
    if (act === 'book_demo') {
      const booking = 'I can book a short 15-minute demo to walk through this — what day/time works for you?';
      if (!parts.join(' ').includes(booking)) parts.push(booking);
      // prefer demo CTA
      memory.lastCta = 'book_demo';
    }
    if (act === 'offer_trial') {
      const trial = 'You can try our 14-day free trial to evaluate it with your own data — would you like a link to get started?';
      if (!parts.join(' ').includes(trial)) parts.push(trial);
      memory.lastCta = 'start_free_trial';
    }
    if (act === 'show_proof' || act === 'handle_objection') {
      if (ciResult.objection && ciResult.objection.groundedAnswer) {
        const proof = ciResult.objection.groundedAnswer.split(/[.!?]/).map(s => s.trim()).filter(Boolean)[0];
        if (proof) parts.push(`To address that directly: ${proof}`);
      } else if (memory.trustLevel === 'low') {
        parts.push('I understand your concern — we use AES-256 encryption, SOC 2 Type II compliance, and role-based access controls.');
      }
    }
  }

  // 3. Qualification question (from strategy) with natural variation
  if (strategy.qualificationQuestion) {
    const q = getQualificationQuestion(strategy.qualificationQuestion);
    if (!parts.join(' ').includes(q.slice(0, 30))) {
      parts.push(q);
      memory.questionsAnswered.push(strategy.qualificationQuestion);
    }
  }

  // 4. Strategy-driven follow-up — distinguish between deepening and advancing
  if (!strategy.pendingQuestions.some(p => !p.answered) && strategy.followUpTopic) {
    const isDeepening = memory.currentTopic && strategy.followUpTopic === memory.currentTopic;
    let followUpQ: string;
    if (isDeepening) {
      const deepenVariants = [
        `Would you like to go deeper into ${strategy.followUpTopic}?`,
        `There is more to cover on ${strategy.followUpTopic} — shall I continue?`,
        `Want to dig deeper into ${strategy.followUpTopic}?`,
      ];
      followUpQ = deepenVariants[memory.turnCount % deepenVariants.length];
    } else {
      followUpQ = `Would you like to explore ${strategy.followUpTopic} next?`;
    }
    parts.push(followUpQ);
  }

  // 5. Smart follow-up (context-aware, only if not already covered)
  if (!strategy.pendingQuestions.some(p => !p.answered) && plan.goal !== 'finish_conversation') {
    const smartFU = getSmartFollowUp(message, memory, ciResult);
    if (smartFU && !parts.join(' ').includes(smartFU.slice(0, 20))) {
      parts.push(smartFU);
    }
  }

  // 6. CTA per strategy
  const ctaText = buildCTAText(strategy, plan, memory, ciResult, profile);
  if (ctaText) parts.push(ctaText);

  // 6b. Plan recommendation (for recommend_plan goal) — avoid repeating previous recommendations
  if (plan.goal === 'recommend_plan') {
    const recs = relevantFacts.previousRecommendations || [];
    if (recs.length === 0) {
      const recommended = recommendPlan(memory);
      parts.unshift(recommended.explanation);
    } else {
      const recNames = recs.map(r => r.planName);
      const recommended = recommendPlan(memory);
      if (!recNames.some(n => recommended.explanation.toLowerCase().includes(n.toLowerCase()))) {
        parts.unshift(recommended.explanation);
      }
    }
  }

  // 7. Context reference — weave known facts into the response (every 3 turns)
  if (memory.turnCount > 0 && memory.turnCount % 3 === 0 && parts.length > 0) {
    const joined = parts.join(' ');
    const known: string[] = [];
    if (relevantFacts.industry && !joined.toLowerCase().includes(relevantFacts.industry.toLowerCase())) {
      known.push(relevantFacts.industry);
    }
    if (relevantFacts.companySize && !joined.toLowerCase().includes('team') && !joined.toLowerCase().includes('people')) {
      known.push(`${relevantFacts.companySize}-person team`);
    }
    if (known.length > 0) {
      const prefix = `For your ${known.join(' ')} — `;
      parts[0] = prefix + parts[0];
    }
  }

  // 8. Opening (if not already present) — incorporate memory facts when available
  const opening = getOpening(strategy.primaryGoal, memory);
  let response = parts.join(' ').trim();
  if (response.length > 5) {
    const contextPrefix = getContextPrefix(memory, relevantFacts, previousResponses);
    if (contextPrefix && !response.toLowerCase().includes(contextPrefix.toLowerCase().trim())) {
      response = `${contextPrefix} ${response}`;
    }
  }
  if (opening && response.length > 5) {
    const lower = response.toLowerCase();
    const skipOpenings = /^(hi|hello|hey|thanks|thank you|welcome|take care)/i.test(response.trim());
    if (!skipOpenings) {
      if (relevantFacts.industry && !lower.includes(relevantFacts.industry.toLowerCase()) && memory.turnCount > 1 && memory.turnCount % 3 !== 0) {
        response = `${opening} Since you are in ${relevantFacts.industry}, ${response.slice(0, 1).toLowerCase() + response.slice(1)}`;
      } else {
        response = `${opening} ${response}`;
      }
    }
  }

  // Ensure proper punctuation
  const trimmed = response.trim();
  const lastChar = trimmed.slice(-1);
  if (!['.', '!', '?', ')'].includes(lastChar)) {
    response = trimmed + '.';
  }

  return response;
}

function computeRelevantKnownFacts(memory: ConversationMemoryData, strategy: ConversationStrategy, message: string): RelevantKnownFacts {
  const lower = message.toLowerCase();
  const facts: RelevantKnownFacts = {
    industry: memory.industry || null,
    companySize: memory.companySize || null,
    monthlyConversations: memory.monthlyConversations || null,
    persona: memory.persona || null,
    currentGoal: strategy.goal,
    objectionsHandled: memory.objectionsHandled || [],
    previousRecommendations: memory.planRecommendations || [],
    topicsExplained: memory.topicsExplained?.map(t => t.topic) || [],
    buyingIntent: memory.buyingIntentDetected ? memory.buyingIntentPhrase || null : null,
    useCase: memory.useCase || null,
    helpdesk: memory.currentHelpdesk || null,
    securityNeeds: memory.securityRequirements || null,
    budget: memory.budget || null,
    userContext: [],
  };
  if (memory.companySize) facts.userContext.push(`company size: ${memory.companySize}`);
  if (memory.industry) facts.userContext.push(`industry: ${memory.industry}`);
  if (memory.useCase) facts.userContext.push(`use case: ${memory.useCase}`);
  if (memory.currentHelpdesk) facts.userContext.push(`helpdesk: ${memory.currentHelpdesk}`);
  if (memory.budget) facts.userContext.push(`budget: ${memory.budget}`);
  if (memory.monthlyConversations) facts.userContext.push(`monthly volume: ${memory.monthlyConversations}`);
  if (memory.topicsExplained.length > 0) {
    facts.userContext.push(`already discussed: ${memory.topicsExplained.filter(t => t.phase === 'completed').map(t => t.topic).join(', ')}`);
  }
  return facts;
}

function monthlyVolume(memory: ConversationMemoryData): string | null {
  if (memory.monthlyConversations) return memory.monthlyConversations;
  if (memory.qualificationCollected.monthlyConversations) return memory.qualificationCollected.monthlyConversations;
  return null;
}

function buildGoalContent(
  strategy: ConversationStrategy,
  message: string,
  memory: ConversationMemoryData,
  plan: { goal: ConversationGoal; customerIntent: CustomerIntent; funnelStage: FunnelStageExtended; missingQualification: string[] },
  ciResult: ConversationIntelligenceResult,
): string {
  const parts: string[] = [];
  if (plan.goal === 'build_trust') {
    parts.push('We can help you evaluate this with confidence.');
  }

  if (plan.goal === 'qualify') {
    if (memory.lastGoal === 'qualify') {
      const transitions = ['Great, thanks. ', 'Perfect, that helps. ', 'Got it. ', 'Appreciate that. '];
      parts.push(transitions[memory.turnCount % transitions.length]);
    }
    parts.push('To recommend the right plan, I just need a bit more context about company size, industry, monthly volume, and your current setup.');
    if (memory.companyName) {
      if (memory.companySize) {
        parts.push(`${memory.companyName} is a ${memory.companySize} company.`);
      }
      if (memory.industry) {
        parts.push(`Operating in ${memory.industry}.`);
      }
    }
  }

  if (plan.goal === 'handle_objection') {
    if (ciResult.objection.groundedAnswer) {
      const proof = ciResult.objection.groundedAnswer
        .split(/[.!?]/)
        .map(s => s.trim())
        .filter(Boolean)[0] || ciResult.objection.groundedAnswer;
      parts.push(`I understand the concern. ${proof}`);
    } else {
      parts.push('I understand the concern and want to address it directly.');
    }
  }

  if (plan.goal === 'answer_question') {
    parts.push('Here is the most relevant detail for your situation.');
  }

  if (plan.goal === 'advance_funnel') {
    parts.push('We can take the next step from here.');
  }

  if (plan.goal === 'recommend_plan') {
    parts.push('I would recommend the plan that best fits your context.');
  }

  if (plan.goal === 'close_trial' || plan.goal === 'schedule_demo') {
    parts.push('You can get started right away.');
  }

  return parts.join(' ') || '';
}

// Qualification questions with natural variation — pick randomly to avoid sounding mechanical
const QUAL_QUESTION_VARIANTS: Record<string, string[]> = {
  'company size': [
    'What is your company size?',
  'What company size is your team?',
  'What is your company size and team size?',
  ],
  'industry': [
    'What industry are you in?',
    'Which industry does your company operate in?',
    'What sector do you work in?',
  ],
  'use case': [
    'What is your primary use case?',
    'What are you hoping to accomplish with AI-powered support?',
    'What specific problem are you looking to solve?',
  ],
  'monthly conversations': [
    'How many monthly conversations do you handle?',
    'What kind of conversation volume do you deal with each month?',
    'About how many support tickets come in per month?',
  ],
  'current helpdesk': [
    'What is your current helpdesk setup?',
    'Which support platform are you using today?',
    'What tools does your support team currently use?',
  ],
  'budget': [
    'What is your budget range?',
    'Do you have a budget range in mind?',
    'What are you looking to spend per month?',
  ],
  'decision timeline': [
    'What is your decision timeline?',
    'When are you looking to make a decision?',
    'How soon are you hoping to get started?',
  ],
};

function getQualificationQuestion(label: string): string {
  const variants = QUAL_QUESTION_VARIANTS[label];
  if (!variants) return label;
  return variants[Math.floor(Math.random() * variants.length)];
}

const TOPIC_RESPONSE_TEMPLATES: Record<DiscernedTopic, string[]> = {
  features: [
    'Here are the core product features: workflow automation, knowledge grounding, and analytics. The feature set is designed to help teams answer support questions faster without adding admin overhead.',
    'A key feature is the automation engine, which lets you build conditional workflows with if-then logic, SLA escalations, and skill-based assignments. It acts like a traffic controller for every ticket.',
    'The analytics feature gives you live dashboards for response times, resolution rates, and CSAT trends. The reporting view refreshes instantly with custom filters and date ranges.',
    'For power users, the API and webhooks are a major feature because they let you trigger workflows from external systems and sync data bidirectionally.',
    'Enterprise features include granular RBAC permissions, audit trails for every action, and a sandbox environment for testing workflows before production deployment.',
  ],
  pricing: [
    'Here is the pricing overview: three tiers — Starter at $49/month for up to 3 agents, Professional at $99/month for growing teams, and Enterprise with custom pricing for larger organizations.',
    'Our pricing model is simple: Starter covers core automation and standard integrations, Professional adds advanced analytics and custom roles, and Enterprise adds SSO, dedicated support, and custom contracts.',
    'Billing is per agent per month, annual or monthly. All integrations, API access, and standard features are included in every tier — no hidden add-ons.',
    'For high-volume teams, Enterprise includes volume discounts and a dedicated account manager. There is also an AI add-on at $20 per agent per month for AI-powered responses.',
    'You can try any plan free for 14 days, no credit card needed. Most teams are up and running within the first week.',
  ],
  security: [
    'AES-256 encryption at rest, TLS 1.3 in transit — all data encrypted by default with no configuration needed.',
    'Beyond encryption, we maintain SOC 2 Type II certification audited annually, covering security, availability, and confidentiality. Infrastructure runs on AWS with ISO 27001 certified data centers.',
    'Access controls include role-based permissions (admin, agent, read-only), SAML 2.0 / OIDC SSO, and SCIM provisioning for automated user management.',
    'Enterprise security includes dedicated VPC deployment, data residency across US, EU, and APAC regions, and a 99.99% uptime SLA.',
    'Quarterly penetration tests by independent firms, a responsible disclosure program, and a detailed security white paper available under NDA.',
  ],
  integrations: [
    'Native integrations with Slack, Microsoft Teams, Salesforce, HubSpot, Zendesk, Intercom, and Jira — conversations and data sync in real time.',
    'The integration ecosystem covers CRM sync (contacts, deals, history), ticketing (bi-directional updates), communication tools, and analytics platforms.',
    'Our marketplace has 50+ pre-built connectors, each supporting custom field mapping, data transformation, and scheduled or event-driven sync.',
    'For custom integrations, we offer webhooks (inbound and outbound), REST API, and GraphQL. Webhooks support retries, batching, and event filtering.',
    'Enterprise customers get a dedicated integration engineer for migration and setup, plus custom connector development if needed.',
  ],
  api: [
    'REST API gives full programmatic access to tickets, contacts, workflows, analytics, and settings. SDKs available for JavaScript, Python, Go, and Ruby.',
    'The API supports CRUD on all resources, batch processing for bulk imports, and real-time event streaming via Server-Sent Events.',
    'Authentication via API keys or OAuth 2.0. Rate limits: 1000 req/min on Professional, 5000 on Enterprise, with webhook delivery guarantees.',
    'GraphQL API lets you query exactly what you need in a single request — ideal for custom dashboards, reports, or embedding features in your product.',
    'Developer docs include interactive playgrounds, SDK examples in 4 languages, a changelog with migration guides, and a community forum.',
  ],
  roi: [
    'Customers typically see ticket volume drop by 40% and response times improve by 60% within the first quarter.',
    'Average ROI is 3x within 90 days. Support teams save about 12 hours per week on repetitive tickets alone.',
    'We have an ROI calculator that factors in your current volume, agent count, and handle time to project savings specific to your team.',
    'One case study: a 50-agent team cut costs by $180k annually after automating 35% of Tier-1 tickets.',
    'Beyond direct savings, customers report CSAT scores improving by about 22%, lower agent turnover, and faster onboarding for new hires.',
  ],
  soc2: [
    'SOC 2 Type II certified with annual audits covering security, availability, processing integrity, confidentiality, and privacy.',
    'The audit is performed by an independent CPA firm and validates controls around access management, data encryption, incident response, and vendor management.',
    'The full SOC 2 report includes the control description, testing results, and auditor opinion — available to enterprise customers under NDA.',
    'We also maintain ISO 27001 certification, HIPAA BAAs for healthcare, and GDPR Data Processing Agreements for EU operations.',
    'Our compliance team handles customer security reviews, vendor risk assessments, and provides completed SIG questionnaires on request.',
  ],
  sso: [
    'SAML 2.0 and OpenID Connect supported. Compatible with Okta, Azure AD, Google Workspace, OneLogin, and Ping Identity.',
    'Setup takes about 15 minutes — generate a metadata file from your IdP, upload it, map attributes. Supports IdP-initiated and SP-initiated SSO.',
    'SCIM provisioning included — user accounts created, updated, and deprovisioned automatically when changes happen in your directory.',
    'Advanced features: just-in-time provisioning, role mapping from directory groups, session timeout policies, and IP-based access restrictions.',
    'Multiple IdP configurations per account supported — useful for mergers, acquisitions, or teams using different identity providers.',
  ],
  walkthrough: [
    'This walkthrough shows how the platform works: a customer sends a message → it gets classified → routed to the right agent or AI → resolution is tracked. Every step is configurable.',
    'In this walkthrough of the platform, each message goes through intent classification, sentiment analysis, priority scoring, and skill-based routing before reaching an agent.',
    'The pipeline supports conditional branching — rules like "if urgent AND after hours → page on-call" or "if billing → route to billing team".',
    'For AI responses, the system retrieves relevant knowledge base articles, generates a suggested reply, and an agent reviews before sending — or auto-sends for low-risk queries.',
    'Every step logs latency, decisions, and outcomes. You can monitor throughput, spot bottlenecks, and tune rules in real time.',
  ],
  comparison: [
    'Compared with alternatives, our platform is faster to deploy and more grounded in your own documentation than generic AI tools.',
    'We are stronger on accuracy, setup speed, and support coverage than many generic AI tools, and the experience is easier to roll out across a team.',
    'When teams compare options, they usually notice that our setup is simpler, the answers are more accurate, and the support coverage is stronger from day one.',
  ],
  demo: [
    'We can schedule a personalized demo to show the product in your context.',
    'A demo is the fastest way to see the workflows, integrations, and reporting in action.',
  ],
  trial: [
    'A free trial gives you a safe way to test the experience without committing.',
    'The trial includes the core workflows and support needed to evaluate it properly before you make a decision.',
  ],
  onboarding: [
    'Onboarding is fast and guided — setup takes about 10 minutes with our onboarding flow.',
    'Our onboarding process includes documentation, templates, and support.',
  ],
  developer: [
    'Developers can use our API and SDK to build custom integrations and automations for their product or workflow.',
    'We also provide implementation examples, reference materials, and webhooks for teams that want to embed the experience in their own stack.',
  ],
};

// Helper: Build topic-specific response using memory + intelligence
function buildTopicResponse(topic: DiscernedTopic, memory: ConversationMemoryData, ci: ConversationIntelligenceResult, tenantId?: string, kbProvider?: KnowledgeBaseProvider, rawQuery?: string): string | null {
  const record = memory.topicsExplained.find(t => t.topic === topic);
  const isCompleted = record && record.phase === 'completed';

  // Try per-tenant knowledge base first
  if (kbProvider && tenantId) {
    const fallbackTemplates = TOPIC_RESPONSE_TEMPLATES[topic] || [];
    const depth = record ? Math.min(record.count, Math.max(fallbackTemplates.length - 1, 1)) : 0;
    const kbEntry = kbProvider.getTopicResponse(topic, tenantId, isCompleted ? 0 : depth);
    if (kbEntry) {
      return kbEntry.answer;
    }

    // If exact topic match failed, try fuzzy resolveTopic on the raw query
    if (kbProvider.resolveTopic && rawQuery) {
      const resolvedTopic = kbProvider.resolveTopic(rawQuery, tenantId);
      if (resolvedTopic && resolvedTopic !== topic) {
        const resolvedEntry = kbProvider.getTopicResponse(resolvedTopic, tenantId, isCompleted ? 0 : depth);
        if (resolvedEntry) {
          return resolvedEntry.answer;
        }
      }
    }
  }

  // Fall back to hardcoded TOPIC_RESPONSE_TEMPLATES
  const templates = TOPIC_RESPONSE_TEMPLATES[topic];
  if (!templates) {
    console.warn(`[buildTopicResponse] no response available for topic="${topic}"`);
    return null;
  }

  if (isCompleted) {
    return buildCompletedTopicResponse(topic, memory, ci, templates);
  }

  const depth = record ? Math.min(record.count, templates.length - 1) : 0;
  const template = templates[depth];

  let response = template;
  if (topic === 'pricing' && memory.companySize) {
    if (depth === 0) {
      response = response.replace('up to 3 agents', `up to 3 agents${memory.companySize ? ` (your team of ${memory.companySize} might want Professional)` : ''}`);
    }
  }
  if (topic === 'integrations' && memory.currentHelpdesk) {
    response += ` It connects directly to your ${memory.currentHelpdesk} workflow.`;
  }
  if (topic === 'security' && memory.persona === 'enterprise') {
    response += ' Enterprise-grade encryption and SOC 2 Type II are standard.';
  }
  if (topic === 'features' && memory.useCase) {
    response += ` This directly addresses your ${memory.useCase} use case.`;
  }

  return response;
}

function buildCompletedTopicResponse(topic: DiscernedTopic, memory: ConversationMemoryData, ci: ConversationIntelligenceResult, templates: string[]): string | null {
  const referenceTemplates = templates.slice(0, 1);
  const template = referenceTemplates[0];
  let response = template;
  if (topic === 'pricing' && memory.companySize) {
    response = template.includes('Professional')
      ? template.replace('Professional', `Professional for your ${memory.companySize}-person team`)
      : template;
  }
  if (topic === 'pricing' && memory.budget) {
    const budget = parseInt(memory.budget.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(budget) && budget < 100) {
      return 'Our Starter plan at $49/month covers basic support for small teams — it includes core ticketing, SLA tracking, and team collaboration.';
    }
  }
  if (topic === 'integrations' && memory.currentHelpdesk) {
    return `Your ${memory.currentHelpdesk} setup pairs well with our ${topic} — it connects directly to your workflow.`;
  }
  return response;
}

// Helper: Build CTA text per strategy
function buildCTAText(
  strategy: ConversationStrategy,
  plan: { customerIntent: CustomerIntent; goal: ConversationGoal; funnelStage: FunnelStageExtended },
  memory: ConversationMemoryData,
  ci: ConversationIntelligenceResult,
  profile?: TenantCtaProfile,
): string | null {
  if (strategy.cta === 'none') return null;

  const cta = selectCTAByPlan(ci.persona.persona, plan, memory, profile);
  if (cta.primaryCTA === 'none') return null;

  const ctaTexts: Record<string, string> = {
    start_free_trial: 'Would you like to get started?',
    book_demo: 'Would you like to get started with a guided walkthrough?',
    contact_sales: 'Our sales team is ready to help.',
    developer_docs: 'Check out our developer docs.',
    pricing: 'See our pricing page for details.',
    partner_program: 'Join our partner program.',
    support: 'Our support team is available 24/7.',
  };

  // Personalize CTA based on memory
  let text = ctaTexts[cta.primaryCTA] || '';
  if (!text && profile?.cta) {
    text = `Would you like to ${profile.cta.label.toLowerCase()}?`;
  }
  if (cta.primaryCTA === 'start_free_trial' && memory.companySize) {
    text = `Your ${memory.companySize}-person team can start a free trial today.`;
  }
  if (cta.primaryCTA === 'book_demo' && memory.currentHelpdesk) {
    text = `Want to see how it works with ${memory.currentHelpdesk}? Book a demo.`;
  }
  if (cta.primaryCTA === 'developer_docs' && memory.useCase) {
    text = `For your ${memory.useCase} use case, our docs have specific examples.`;
  }
  return text;
}

interface ButtonCandidate extends SmartButton {
  category: string;
  defaultScore: number;
  icon?: string;
  locale?: string;
  tags: string[];
}

const BUTTON_CATALOG: ButtonCandidate[] = [
  { id: 'btn_pricing', label: 'Tell me about pricing', payload: 'Tell me about pricing', action: 'send_text', variant: 'secondary', category: 'pricing', defaultScore: 45, icon: 'price-tag', locale: 'en-US', tags: ['pricing', 'cost', 'plans'] },
  { id: 'btn_book_demo', label: 'Book a demo', payload: '/signup', action: 'navigate', variant: 'primary', category: 'demo', defaultScore: 55, icon: 'calendar', locale: 'en-US', tags: ['demo', 'sales'] },
  { id: 'btn_features', label: 'Features', payload: 'What features do you offer?', action: 'send_text', variant: 'secondary', category: 'features', defaultScore: 40, icon: 'sparkles', locale: 'en-US', tags: ['features', 'capabilities'] },
  { id: 'btn_help_choose', label: 'Help me choose', payload: 'Help me choose the right plan', action: 'send_text', variant: 'primary', category: 'qualification', defaultScore: 45, icon: 'lightbulb', locale: 'en-US', tags: ['help', 'choose', 'plan'] },
  { id: 'btn_compare_plans', label: 'Compare plans', payload: 'Compare plans', action: 'send_text', variant: 'secondary', category: 'competitor', defaultScore: 35, icon: 'compare', locale: 'en-US', tags: ['compare', 'plans', 'pricing'] },
  { id: 'btn_free_trial', label: 'Free trial', payload: '/signup', action: 'navigate', variant: 'primary', category: 'trial', defaultScore: 50, icon: 'gift', locale: 'en-US', tags: ['trial', 'signup'] },
  { id: 'btn_talk_to_sales', label: 'Talk to sales', payload: '/contact', action: 'navigate', variant: 'outline', category: 'sales', defaultScore: 45, icon: 'phone', locale: 'en-US', tags: ['sales', 'contact'] },
  { id: 'btn_monthly_plans', label: 'Monthly plans', payload: 'Tell me about monthly pricing', action: 'send_text', variant: 'secondary', category: 'pricing', defaultScore: 40, icon: 'calendar-month', locale: 'en-US', tags: ['monthly', 'pricing'] },
  { id: 'btn_annual_discount', label: 'Annual discount', payload: 'Tell me about annual discounts', action: 'send_text', variant: 'secondary', category: 'pricing', defaultScore: 38, icon: 'discount', locale: 'en-US', tags: ['annual', 'pricing', 'discount'] },
  { id: 'btn_enterprise_pricing', label: 'Enterprise pricing', payload: 'What does enterprise pricing look like?', action: 'send_text', variant: 'secondary', category: 'pricing', defaultScore: 42, icon: 'shield-check', locale: 'en-US', tags: ['enterprise', 'pricing'] },
  { id: 'btn_roi_calculator', label: 'ROI calculator', payload: 'Show me the ROI calculator', action: 'send_text', variant: 'secondary', category: 'roi', defaultScore: 38, icon: 'trend-up', locale: 'en-US', tags: ['roi', 'savings'] },
  { id: 'btn_security_docs', label: 'Security documentation', payload: '/security', action: 'navigate', variant: 'secondary', category: 'security', defaultScore: 47, icon: 'shield', locale: 'en-US', tags: ['security', 'compliance'] },
  { id: 'btn_soc2_iso', label: 'SOC2 / ISO', payload: 'Tell me about SOC2 and ISO compliance', action: 'send_text', variant: 'secondary', category: 'security', defaultScore: 45, icon: 'certificate', locale: 'en-US', tags: ['soc2', 'iso', 'compliance'] },
  { id: 'btn_gdpr', label: 'GDPR', payload: 'Tell me about GDPR and data privacy', action: 'send_text', variant: 'secondary', category: 'security', defaultScore: 40, icon: 'globe', locale: 'en-US', tags: ['gdpr', 'privacy'] },
  { id: 'btn_data_privacy', label: 'Data privacy', payload: 'Tell me about data privacy', action: 'send_text', variant: 'secondary', category: 'security', defaultScore: 38, icon: 'lock', locale: 'en-US', tags: ['privacy', 'security'] },
  { id: 'btn_architecture', label: 'Architecture', payload: 'Show me the architecture overview', action: 'send_text', variant: 'secondary', category: 'architecture', defaultScore: 38, icon: 'server', locale: 'en-US', tags: ['architecture', 'technical'] },
  { id: 'btn_talk_security_expert', label: 'Talk to security expert', payload: '/contact', action: 'navigate', variant: 'outline', category: 'security', defaultScore: 42, icon: 'user-shield', locale: 'en-US', tags: ['security', 'expert'] },
  { id: 'btn_show_integrations', label: 'Show integrations', payload: 'Show me integrations', action: 'send_text', variant: 'secondary', category: 'integrations', defaultScore: 40, icon: 'puzzle-piece', locale: 'en-US', tags: ['integrations', 'connect'] },
  { id: 'btn_api_docs', label: 'API docs', payload: '/docs', action: 'navigate', variant: 'secondary', category: 'developer', defaultScore: 42, icon: 'code', locale: 'en-US', tags: ['api', 'developer'] },
  { id: 'btn_use_cases', label: 'Use cases', payload: 'What are the use cases?', action: 'send_text', variant: 'secondary', category: 'features', defaultScore: 37, icon: 'lightbulb', locale: 'en-US', tags: ['use cases', 'case studies'] },
  { id: 'btn_customer_stories', label: 'Customer stories', payload: 'Tell me about customer stories', action: 'send_text', variant: 'secondary', category: 'trust', defaultScore: 36, icon: 'users', locale: 'en-US', tags: ['customers', 'stories'] },
  { id: 'btn_compare_competitors', label: 'Compare competitors', payload: 'Compare to competitors', action: 'send_text', variant: 'secondary', category: 'competitor', defaultScore: 40, icon: 'balance-scale', locale: 'en-US', tags: ['compare', 'competition'] },
  { id: 'btn_live_demo', label: 'Live demo', payload: '/signup', action: 'navigate', variant: 'primary', category: 'demo', defaultScore: 45, icon: 'play', locale: 'en-US', tags: ['demo', 'live'] },
  { id: 'btn_under_10', label: 'We\'re under 10 people', payload: 'We are under 10 people', action: 'send_text', variant: 'secondary', category: 'qualification', defaultScore: 40, icon: 'users', locale: 'en-US', tags: ['size', 'company size'] },
  { id: 'btn_10_50', label: '10-50 employees', payload: 'We have 10-50 employees', action: 'send_text', variant: 'secondary', category: 'qualification', defaultScore: 40, icon: 'users', locale: 'en-US', tags: ['size', 'company size'] },
  { id: 'btn_50_200', label: '50-200 employees', payload: 'We have 50-200 employees', action: 'send_text', variant: 'secondary', category: 'qualification', defaultScore: 40, icon: 'users', locale: 'en-US', tags: ['size', 'company size'] },
  { id: 'btn_200_plus', label: '200+', payload: 'We have 200+ employees', action: 'send_text', variant: 'secondary', category: 'qualification', defaultScore: 40, icon: 'users', locale: 'en-US', tags: ['size', 'company size'] },
  { id: 'btn_not_sure', label: 'Not sure', payload: 'I am not sure yet', action: 'send_text', variant: 'secondary', category: 'qualification', defaultScore: 35, icon: 'question', locale: 'en-US', tags: ['uncertain', 'qualification'] },
  { id: 'btn_budget_low', label: '<$100', payload: 'Our budget is under $100', action: 'send_text', variant: 'secondary', category: 'budget', defaultScore: 38, icon: 'dollar-sign', locale: 'en-US', tags: ['budget'] },
  { id: 'btn_budget_mid', label: '$100-$500', payload: 'Our budget is $100-$500', action: 'send_text', variant: 'secondary', category: 'budget', defaultScore: 38, icon: 'dollar-sign', locale: 'en-US', tags: ['budget'] },
  { id: 'btn_budget_high', label: '$500-$2000', payload: 'Our budget is $500-$2000', action: 'send_text', variant: 'secondary', category: 'budget', defaultScore: 38, icon: 'dollar-sign', locale: 'en-US', tags: ['budget'] },
  { id: 'btn_budget_enterprise', label: 'Enterprise', payload: 'Our budget is enterprise-level', action: 'send_text', variant: 'secondary', category: 'budget', defaultScore: 38, icon: 'shield', locale: 'en-US', tags: ['budget', 'enterprise'] },
  { id: 'btn_timeline_immediately', label: 'Immediately', payload: 'We need it immediately', action: 'send_text', variant: 'secondary', category: 'timeline', defaultScore: 38, icon: 'clock', locale: 'en-US', tags: ['timeline'] },
  { id: 'btn_timeline_month', label: 'This month', payload: 'We are looking to decide this month', action: 'send_text', variant: 'secondary', category: 'timeline', defaultScore: 38, icon: 'calendar', locale: 'en-US', tags: ['timeline'] },
  { id: 'btn_timeline_quarter', label: 'This quarter', payload: 'We are deciding this quarter', action: 'send_text', variant: 'secondary', category: 'timeline', defaultScore: 38, icon: 'calendar', locale: 'en-US', tags: ['timeline'] },
  { id: 'btn_timeline_research', label: 'Just researching', payload: 'I am just researching', action: 'send_text', variant: 'secondary', category: 'timeline', defaultScore: 35, icon: 'search', locale: 'en-US', tags: ['timeline'] },
  { id: 'btn_compare_intercom', label: 'Compare with Intercom', payload: 'Compare with Intercom', action: 'send_text', variant: 'secondary', category: 'competitor', defaultScore: 42, icon: 'shield-check', locale: 'en-US', tags: ['intercom', 'competitor'] },
  { id: 'btn_compare_zendesk', label: 'Compare with Zendesk', payload: 'Compare with Zendesk', action: 'send_text', variant: 'secondary', category: 'competitor', defaultScore: 42, icon: 'shield-check', locale: 'en-US', tags: ['zendesk', 'competitor'] },
  { id: 'btn_why_choose_us', label: 'Why choose us', payload: 'Why should I choose your product?', action: 'send_text', variant: 'secondary', category: 'competitor', defaultScore: 40, icon: 'thumb-up', locale: 'en-US', tags: ['why choose us'] },
  { id: 'btn_migration_guide', label: 'Migration guide', payload: 'Show me a migration guide', action: 'send_text', variant: 'secondary', category: 'competitor', defaultScore: 40, icon: 'map', locale: 'en-US', tags: ['migration', 'competitor'] },
  { id: 'btn_email_me', label: 'Email me', payload: 'Email me the details', action: 'send_text', variant: 'outline', category: 'sales', defaultScore: 36, icon: 'mail', locale: 'en-US', tags: ['email'] },
  { id: 'btn_talk_later', label: 'Talk later', payload: 'I will talk later', action: 'send_text', variant: 'outline', category: 'sales', defaultScore: 32, icon: 'clock', locale: 'en-US', tags: ['later'] },
  { id: 'btn_setup_guide', label: 'Setup guide', payload: 'Show me a setup guide', action: 'send_text', variant: 'secondary', category: 'support', defaultScore: 42, icon: 'wrench', locale: 'en-US', tags: ['setup', 'support', 'installation'] },
  { id: 'btn_contact_support', label: 'Contact support', payload: '/support', action: 'navigate', variant: 'secondary', category: 'support', defaultScore: 40, icon: 'life-ring', locale: 'en-US', tags: ['support'] },
];

const MAX_QUICK_REPLIES = 4;
const MIN_QUICK_REPLIES = 3;

function extractMessageTags(message: string): Set<string> {
  const tags = new Set<string>();
  const lower = message.toLowerCase();

  if (/(pricing|price|cost|plan|annual|monthly|tier|expensive)/i.test(lower)) tags.add('pricing');
  if (/(security|compliance|gdpr|soc2|iso|privacy|architecture|data)/i.test(lower)) tags.add('security');
  if (/(compare|comparison|competitor|intercom|zendesk|why choose|migration)/i.test(lower)) tags.add('competitor');
  if (/(demo|walkthrough|live demo|see it in action|book a demo)/i.test(lower)) tags.add('demo');
  if (/(free trial|trial|signup|start free|14-day)/i.test(lower)) tags.add('trial');
  if (/(support|setup|installation|onboarding|help|customer service|technical support)/i.test(lower)) tags.add('support');
  if (/(integration|integrations|api|docs|use case|customer stories|case studies|shopify|woocommerce|magento|bigcommerce|ecommerce)/i.test(lower)) tags.add('features');
  if (/(roi|return on investment|savings|cost savings)/i.test(lower)) tags.add('roi');
  if (/(what plan|should i pick|best plan|right plan|choose a plan)/i.test(lower)) tags.add('qualification');
  if (/(company size|employees|people|team|under 10|10-50|50-200|200\+|just researching|this month|this quarter|immediately)/i.test(lower)) tags.add('qualification');
  if (/(budget|spend|price range|cost range|dollars)/i.test(lower)) tags.add('budget');
  if (/(immediately|this month|this quarter|just researching|researching)/i.test(lower)) tags.add('timeline');
  if (/(sales|talk to sales|contact sales|enterprise sales)/i.test(lower)) tags.add('sales');

  return tags;
}

function explainButtonSelection(
  button: ButtonCandidate,
  plan: { goal: ConversationGoal; funnelStage: FunnelStageExtended; customerIntent: CustomerIntent },
  memory: ConversationMemoryData,
  ciResult: ConversationIntelligenceResult,
  messageTags: Set<string>,
): string {
  const reasons: string[] = [];
  if (plan.goal === 'qualify' && button.category === 'qualification') reasons.push('helps qualify the opportunity');
  if (plan.goal === 'recommend_plan' && ['trial', 'demo', 'sales'].includes(button.category)) reasons.push('supports the next purchase step');
  if (plan.goal === 'handle_objection' && button.category === 'security' && ciResult.objection.category === 'security') reasons.push('addresses the customer security concern');
  if (plan.customerIntent === 'comparing' && button.category === 'competitor') reasons.push('matches the customer comparison intent');
  if (messageTags.has(button.category)) reasons.push('relevant to the current request');
  if (button.category === 'budget' && plan.goal === 'qualify') reasons.push('helps gather budget information');
  if (button.category === 'timeline' && plan.goal === 'qualify') reasons.push('supports decision timeline qualification');
  if (memory.buyerRole === 'developer' && button.category === 'developer') reasons.push('tailored for developer buyers');
  if (memory.buyerRole === 'enterprise' && button.category === 'security') reasons.push('fits enterprise security needs');
  if (memory.buttonAcceptances.includes(button.id)) reasons.push('customer has engaged with this button before');
  if (memory.buttonRejections.includes(button.id)) reasons.push('previously rejected by the customer');
  return reasons.length > 0 ? reasons.join('; ') : 'scored for relevance and conversion potential.';
}

function scoreButtonCandidate(
  button: ButtonCandidate,
  plan: { goal: ConversationGoal; funnelStage: FunnelStageExtended; customerIntent: CustomerIntent },
  memory: ConversationMemoryData,
  ciResult: ConversationIntelligenceResult,
  historicalCTR: Record<string, number>,
  messageTags: Set<string>,
): number {
  let score = button.defaultScore;
  const lowerLabel = button.label.toLowerCase();

  if (plan.goal === 'finish_conversation') score += button.category === 'sales' ? 10 : 0;
  if (plan.goal === 'qualify' && button.category === 'qualification') score += 30;
  if (plan.goal === 'qualify' && button.category === 'timeline') score += 15;
  if (plan.goal === 'qualify' && button.category === 'budget') score += 15;
  if (plan.goal === 'recommend_plan' && ['trial', 'demo', 'sales'].includes(button.category)) score += 20;
  if (plan.goal === 'close_trial' && button.category === 'trial') score += 25;
  if (plan.goal === 'schedule_demo' && button.category === 'demo') score += 30;
  if (plan.goal === 'handle_objection' && button.category === 'security' && ciResult.objection.category === 'security') score += 30;
  if (plan.goal === 'handle_objection' && ciResult.objection.category === 'price') {
    if (button.category === 'roi') score += 60;
    if (button.category === 'demo') score += 35;
    if (button.category === 'trust') score += 25;
    if (button.category === 'pricing') score -= 20;
  }
  if (plan.goal === 'handle_objection' && button.category === 'competitor' && ciResult.objection.category === 'competition') score += 30;
  if (plan.goal === 'advance_funnel' && button.category === 'pricing') score += 20;
  if (plan.goal === 'build_trust' && ['features', 'security', 'trust'].includes(button.category)) score += 20;

  if (plan.customerIntent === 'comparing' || lowerLabel.includes('compare')) score += 20;
  if (plan.customerIntent === 'buying' && ['trial', 'demo', 'sales'].includes(button.category)) score += 15;
  if (plan.customerIntent === 'learning' && ['features', 'pricing', 'security', 'integrations', 'developer'].includes(button.category)) score += 15;

  if (memory.persona === 'enterprise' && button.category === 'security') score += 15;
  if (memory.persona === 'developer' && button.category === 'developer') score += 20;
  if (memory.persona === 'support_manager' && ['support', 'integration', 'features'].includes(button.category)) score += 15;

  if (memory.currentTopic && button.category === memory.currentTopic) score += 10;
  if (memory.currentTopic && lowerLabel.includes(memory.currentTopic)) score += 10;

  if (memory.companySize && button.category === 'qualification' && /people|employees/.test(lowerLabel)) score += 5;
  if (memory.budget && button.category === 'budget') score += 5;

  const completedTopics = memory.topicsExplained.filter(t => t.phase === 'completed').map(t => t.topic);
  if (completedTopics.includes('pricing') && button.category === 'pricing') score -= 15;
  if (completedTopics.includes('security') && button.category === 'security') score -= 15;
  if (completedTopics.includes('features') && button.category === 'features') score -= 10;

  if (messageTags.has(button.category)) score += 25;
  if (button.tags?.some(tag => messageTags.has(tag))) score += 20;
  if (button.tags?.some(tag => lowerLabel.includes(tag))) score += 10;

  const recentSeen = memory.buttonsShown.some(b => b.buttonId === button.id || b.label.toLowerCase() === lowerLabel);
  if (recentSeen) score -= 1000;
  if (memory.buttonRejections.includes(button.id)) score -= 1000;
  if (memory.buttonRejections.some(rejected => lowerLabel.includes(rejected.toLowerCase()))) score -= 500;
  if (memory.buttonAcceptances.includes(button.id)) score += 20;
 
  const historical = historicalCTR[button.id] ?? 0;
  score += Math.min(15, historical * 20);
 
  return Math.max(0, score);
}

function isButtonRelevant(
  button: ButtonCandidate,
  plan: { goal: ConversationGoal; funnelStage: FunnelStageExtended; customerIntent: CustomerIntent },
  memory: ConversationMemoryData,
  ciResult: ConversationIntelligenceResult,
  messageTags: Set<string>,
): boolean {
  if (plan.goal === 'finish_conversation' && button.category === 'competitor') return false;
  if (button.category === 'qualification' && plan.goal !== 'qualify') return false;
  if (button.category === 'budget' && plan.goal !== 'qualify' && plan.customerIntent !== 'buying') return false;
  if (button.category === 'timeline' && plan.goal !== 'qualify') return false;
  if (button.category === 'developer' && plan.customerIntent !== 'learning' && memory.persona !== 'developer') return false;
  if (button.category === 'support' && !messageTags.has('support') && plan.goal !== 'handle_objection' && plan.goal !== 'finish_conversation') return false;
  if (button.category === 'competitor' && !messageTags.has('competitor') && plan.customerIntent !== 'comparing') return false;
  if (button.category === 'sales' && plan.goal === 'build_trust') return false;
  return true;
}

function normalizeButtons(buttons: SmartButton[]): SmartButton[] {
  const deduped: SmartButton[] = [];
  const seen = new Set<string>();
  for (const button of buttons) {
    const key = button.label.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(button);
    }
  }
  return deduped;
}

function recordShownButtons(memory: ConversationMemoryData, buttons: SmartButton[]): void {
  const shownAt = Date.now();
  for (const button of buttons) {
    memory.buttonsShown.push({
      buttonId: button.id,
      label: button.label,
      category: button.category,
      score: button.score ?? 0,
      turnNumber: memory.turnCount + 1,
      shownAt,
    });
  }
  if (memory.buttonsShown.length > 50) {
    memory.buttonsShown = memory.buttonsShown.slice(-50);
  }
}

function buildDynamicQuickReplies(
  message: string,
  plan: { goal: ConversationGoal; funnelStage: FunnelStageExtended; customerIntent: CustomerIntent },
  memory: ConversationMemoryData,
  ciResult: ConversationIntelligenceResult,
  profile?: TenantCtaProfile,
): SmartButton[] {
  if (plan.goal === 'finish_conversation') return [];

  // Tenant button catalog override: when the tenant configures its own
  // business_profile.button_catalog (e.g. store delivery/returns chips), use
  // it instead of the SaaS button catalog.
  const catalog: ButtonCandidate[] = profile?.button_catalog?.length
    ? (profile.button_catalog as ButtonCandidate[])
    : BUTTON_CATALOG;

  const historical = buttonTelemetry.snapshot().byButton;
  const recentLabels = new Set(memory.buttonsShown.filter(b => b.turnNumber >= memory.turnCount - 2).map(b => b.label.toLowerCase()));
  const messageTags = extractMessageTags(message);

  const candidates: Array<SmartButton> = catalog
    .filter(button => isButtonRelevant(button, plan, memory, ciResult, messageTags))
    .map(button => ({
      ...button,
      score: scoreButtonCandidate(
        button,
        plan,
        memory,
        ciResult,
        Object.fromEntries(Object.entries(historical).map(([k, v]) => [k, v.ctr])),
        messageTags,
      ),
      reason: explainButtonSelection(button, plan, memory, ciResult, messageTags),
    }))
    .filter(button => button.score > 0)
    .filter(button => !recentLabels.has(button.label.toLowerCase()));

  candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const topButtons = normalizeButtons(
    candidates.slice(0, MAX_QUICK_REPLIES).map(button => ({
      id: button.id,
      label: button.label,
      action: button.action,
      payload: button.payload,
      variant: button.variant,
      icon: button.icon,
      score: button.score,
      category: button.category,
      locale: button.locale,
    })),
  ).slice(0, MAX_QUICK_REPLIES);

  const replies = [...topButtons];

  if (replies.length < MIN_QUICK_REPLIES) {
    const fallback = catalog.filter(button => !recentLabels.has(button.label.toLowerCase()) && button.category !== 'qualification').slice(0, MIN_QUICK_REPLIES - replies.length);
    for (const fallbackButton of fallback) {
      replies.push({
        id: fallbackButton.id,
        label: fallbackButton.label,
        action: fallbackButton.action,
        payload: fallbackButton.payload,
        variant: fallbackButton.variant,
        icon: fallbackButton.icon,
        score: fallbackButton.defaultScore,
        category: fallbackButton.category,
        locale: fallbackButton.locale,
      });
    }
  }

  recordShownButtons(memory, replies);
  for (const button of replies) {
    buttonTelemetry.recordShown(button.id, button.label, button.category, undefined, memory.turnCount + 1);
  }

  return replies;
}

function updateMemoryFromBrain(
  memory: ConversationMemoryData,
  message: string,
  responseText: string,
  ciResult: ConversationIntelligenceResult,
  plan: { customerIntent: CustomerIntent; goal: ConversationGoal; funnelStage: FunnelStageExtended },
  options?: { plannerActionScores?: ActionScore[]; directorChosenAction?: string; brainExecutedAction?: string; ctaDecision?: { ctaId?: string; timing?: 'strong'|'soft'|'none' } }
): void {
  memory.turnCount++;
  memory.lastResponseText = responseText;
  memory.lastGoal = plan.goal;

  memory.salesSignals = extractSalesSignals(message, memory.salesSignals);
  const inferredPersona = inferPersonaFromMessage(message, memory);
  if (inferredPersona !== 'unknown' && (memory.persona === 'unknown' || inferredPersona !== memory.persona)) {
    memory.persona = inferredPersona;
  }

  const newTopics = discernTopics(message);
  for (const topic of newTopics) {
    if (!isTopicExplained(memory, topic)) {
      markTopicExplained(memory, topic);
    }
  }

  const topicsInResponse = discernTopics(responseText);
  for (const topic of topicsInResponse) {
    markTopicExplained(memory, topic);
  }

  // Auto-complete topics that have been fully explored (all 5 levels exhausted)
  for (const record of memory.topicsExplained) {
    if (record.count >= 5 && record.phase !== 'completed') {
      markTopicCompleted(memory, record.topic);
    }
  }

  if (ciResult.objection.isObjection && ciResult.objection.category !== 'none') {
    if (!memory.objectionsHandled.includes(ciResult.objection.category)) {
      memory.objectionsHandled.push(ciResult.objection.category);
    }
  }

  memory.funnelStage = plan.funnelStage;
  memory.buyingIntentDetected = memory.buyingIntentDetected || ciResult.buyingIntent.hasBuyingIntent;
  memory.buyingIntentPhrase = memory.buyingIntentPhrase || ciResult.buyingIntent.intentPhrase;
  memory.buyingIntentTier = memory.buyingIntentTier || ciResult.buyingIntent.targetTier;
  memory.persona = ciResult.persona?.persona ?? 'unknown';
  memory.sentiment = ciResult.sentiment;
  memory.leadScore = ciResult.leadScore?.overallScore ?? memory.leadScore;
  memory.conversationScore = ciResult.conversationScore?.overallScore ?? memory.conversationScore;
  memory.abandonmentRisk = ciResult.abandonmentRisk.level;
  if (ciResult.qualification) {
    memory.qualificationCollected.questionsAskedCount = ciResult.qualification.questionsAskedCount ?? memory.qualificationCollected.questionsAskedCount;
    if (ciResult.qualification.qualifiedForTier) memory.qualificationCollected.qualifiedForTier = ciResult.qualification.qualifiedForTier;
    if (ciResult.qualification.monthlyConversations) {
      memory.qualificationCollected.monthlyConversations = ciResult.qualification.monthlyConversations;
      memory.monthlyConversations = ciResult.qualification.monthlyConversations;
    }
    if (ciResult.qualification.completed) memory.qualificationCollected.completed = true;
  }

  if (ciResult.sentiment.polarity > 0.2) memory.trustLevel = 'high';
  else if (ciResult.sentiment.polarity > 0) {
    if (memory.trustLevel !== 'high') memory.trustLevel = 'medium';
  }
  else if (ciResult.sentiment.polarity < -0.3) memory.trustLevel = 'low';
  else if (memory.turnCount > 3 && memory.trustLevel === 'medium') memory.trustLevel = 'high';
  else if (memory.turnCount > 1 && memory.trustLevel === 'low') memory.trustLevel = 'medium';
  else if (memory.trustLevel === 'low' && memory.leadScore > 50) memory.trustLevel = 'medium';

  if (!memory.isLeaving && plan.customerIntent === 'leaving') {
    memory.isLeaving = true;
  }
  if (!memory.isAbandoned && (ciResult.abandonmentRisk.level === 'high' || plan.goal === 'recover_abandonment')) {
    memory.isAbandoned = true;
  }

  if (plan.goal === 'finish_conversation') {
    memory.isCompleted = true;
  }

  if (memory.lastGoal === plan.goal) {
    memory.lastGoalStreak = (memory.lastGoalStreak || 0) + 1;
  } else {
    memory.lastGoal = plan.goal;
    memory.lastGoalStreak = 1;
  }

  if (!isGoalAchieved(memory, plan.goal)) {
    memory.goalsAchieved.push(plan.goal);
  }

  memory.turns.push({
    turnNumber: memory.turnCount,
    message,
    response: responseText,
    customerIntent: plan.customerIntent,
    goal: plan.goal,
    funnelStage: plan.funnelStage,
    timestamp: Date.now(),
  });

  // Build aggregate qualification confidence (average of known fields)
  let qualConf = 0;
  const qfields = Object.values(memory.qualificationFields || {});
  if (qfields.length > 0) qualConf = qfields.reduce((s, f) => s + (f.confidence || 0), 0) / qfields.length;

  // Build decision trace record
  const trace: DecisionTraceRecord = {
    turnNumber: memory.turnCount,
    timestamp: Date.now(),
    memoryConfidence: memory.memoryConfidence ?? 0,
    trustLevel: memory.trustLevel,
    buyingIntentScore: ciResult.buyingIntent?.confidence ?? (ciResult.buyingIntent?.hasBuyingIntent ? 1 : 0),
    qualificationConfidence: qualConf,
    plannerActionScores: options?.plannerActionScores ? options.plannerActionScores.map(a => ({ action: a.action, ev: a.ev, trustGain: a.trustGain, qualGain: a.qualGain, abandonRisk: a.abandonRisk })) : undefined,
    directorChosenAction: options?.directorChosenAction,
    brainExecutedAction: options?.brainExecutedAction,
    memoryUpdates: [],
    trustChanges: [],
    ctaDecision: options?.ctaDecision,
    objectionResolution: ciResult.objection?.isObjection ? { category: ciResult.objection.category, resolved: false, evidenceUsed: ciResult.objection.sources || [] } : undefined,
  };

  // Push trace and telemetry
  try {
    pushDecisionTrace(memory, trace);
    if (ciResult.qualification && ciResult.qualification.completed) {
      recordTelemetryEvent(memory, 'qualification_completed', { turn: memory.turnCount });
    }
    if (options?.ctaDecision && options.ctaDecision.ctaId && options.ctaDecision.timing !== 'none') {
      recordTelemetryEvent(memory, 'cta_shown', { cta: options.ctaDecision.ctaId, timing: options.ctaDecision.timing, turn: memory.turnCount });
    }
  } catch (e) {
    // best-effort: do not break the conversation if telemetry fails
    // eslint-disable-next-line no-console
    console.warn('Failed to record decision trace or telemetry', e);
  }
}

function prepareLegacyMemory(memory: ConversationMemoryData): ConversationIntelligenceMemory {
  return {
    turns: memory.turns.map(t => ({
      message: t.message,
      response: t.response,
      polarity: 0,
      frustration: 0,
      urgency: 0,
      timestamp: t.timestamp,
    })),
    persona: memory.persona,
    funnelStage: memory.funnelStage as any,
    buyingIntentDetected: memory.buyingIntentDetected,
    buyingIntentPhrase: memory.buyingIntentPhrase,
    buyingIntentTier: memory.buyingIntentTier,
    objections: memory.objectionsHandled,
    qualificationState: memory.qualificationCollected,
    repeatedPhraseCount: 0,
    topics: memory.topicsExplained.flatMap(t => Array(t.count).fill(t.topic)),
    companySize: memory.companySize,
    industry: memory.industry,
    useCase: memory.useCase,
    monthlyConversations: memory.monthlyConversations,
    currentHelpdesk: memory.currentHelpdesk,
    budget: memory.budget,
    decisionTimeline: memory.decisionTimeline,
    lastGoal: memory.lastGoal,
    lastGoalStreak: memory.lastGoalStreak,
  };
}

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

// ── BurFlow Brain: multi-provider LLM resolution ─────────────────────────
// Preference order: Groq → xAI Grok → Anthropic → secondary accounts, then
// heuristic template fallback. Only the first two CONFIGURED providers are
// tried per turn, each bounded by an abortable timeout and a 7s global budget,
// so a transient outage cannot stall a chat turn for tens of seconds. If every
// provider fails or returns unparseable output, the brain degrades to the
// heuristic template engine instead of erroring to the visitor.

export type BrainProvider = 'GROQ' | 'GROK' | 'OPENROUTER' | 'ANTHROPIC' | 'HEURISTIC_FALLBACK';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
// llama-3.3-70b-versatile was retired from Groq; compound-mini is its
// successor (a fast routing model over the same family) and returns clean
// JSON in the message content — verified against the live API.
const GROQ_MODEL = process.env.GROQ_MODEL || 'groq/compound-mini';
const GROK_BASE_URL = 'https://api.x.ai/v1';
const GROK_MODEL = process.env.GROK_MODEL || 'grok-2-latest';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const ANTHROPIC_MODEL = 'claude-3-haiku-20240307';

/**
 * Resolves the active brain provider. `LLM_PROVIDER` explicitly pins one of
 * 'anthropic' | 'openrouter' | 'grok' (only honored when its API key is
 * configured). When unset — or when the pinned provider has no key — the
 * provider is auto-detected from whichever API keys are available:
 * Groq → Grok/xAI → OpenRouter → Anthropic.
 */
export function resolveBrainProvider(): BrainProvider {
  const explicit = (process.env.LLM_PROVIDER || '').trim().toLowerCase();
  if (explicit === 'anthropic' && process.env.ANTHROPIC_API_KEY) return 'ANTHROPIC';
  if (explicit === 'openrouter' && process.env.OPENROUTER_API_KEY) return 'OPENROUTER';
  if (explicit === 'grok' && (process.env.XAI_API_KEY || process.env.GROK_API_KEY)) return 'GROK';
  if (process.env.GROQ_API_KEY) return 'GROQ';
  if (process.env.XAI_API_KEY || process.env.GROK_API_KEY) return 'GROK';
  if (process.env.OPENROUTER_API_KEY) return 'OPENROUTER';
  if (process.env.ANTHROPIC_API_KEY) return 'ANTHROPIC';
  return 'HEURISTIC_FALLBACK';
}

// Logged once at module load (server boot) so operators can verify which
// provider serves conversations.
function logActiveProvider(): void {
  // eslint-disable-next-line no-console
  console.log(`[BurFlow Brain] Active Provider: ${resolveBrainProvider()}`);
}
logActiveProvider();

const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 8000 })
  : null;

// Provider 2: Gemini Account 1
const geminiClient1 = process.env.GEMINI_API_KEY_1
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY_1)
  : null;

// Provider 3: Gemini Account 2  
const geminiClient2 = process.env.GEMINI_API_KEY_2
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY_2)
  : null;

// Provider 4: Groq (Llama) — OpenAI-compatible
const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 8000 }) // SDK default base URL is https://api.groq.com/openai/v1
  : null;

// Provider 5: xAI Grok — OpenAI-compatible (fetch, no SDK dependency)
const grokApiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY || null;

// Provider: OpenRouter — OpenAI-compatible (fetch, no SDK dependency).
// Endpoint https://openrouter.ai/api/v1/chat/completions; model configurable
// via OPENROUTER_MODEL (defaults to openai/gpt-4o-mini).
const openrouterApiKey = process.env.OPENROUTER_API_KEY || null;

// Provider 6: Groq Account 2
const groqClient2 = process.env.GROQ_API_KEY_2
  ? new Groq({ apiKey: process.env.GROQ_API_KEY_2, timeout: 8000 }) // SDK default base URL is https://api.groq.com/openai/v1
  : null;

// Provider 7: Groq Account 3
const groqClient3 = process.env.GROQ_API_KEY_3
  ? new Groq({ apiKey: process.env.GROQ_API_KEY_3, timeout: 8000 }) // SDK default base URL is https://api.groq.com/openai/v1
  : null;

// Provider 8: Groq Account 4
const groqClient4 = process.env.GROQ_API_KEY_4
  ? new Groq({ apiKey: process.env.GROQ_API_KEY_4, timeout: 8000 }) // SDK default base URL is https://api.groq.com/openai/v1
  : null;

// Provider 9: Groq Account 5
const groqClient5 = process.env.GROQ_API_KEY_5
  ? new Groq({ apiKey: process.env.GROQ_API_KEY_5, timeout: 8000 }) // SDK default base URL is https://api.groq.com/openai/v1
  : null;

async function callAnthropic(systemPrompt: string, messages: Anthropic.MessageParam[], signal: AbortSignal): Promise<string> {
  if (!anthropicClient) throw new Error('Anthropic not configured');
  const response = await anthropicClient.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 300,
    system: systemPrompt,
    messages,
  }, { signal });
  return response.content
    .filter((c): c is Anthropic.TextBlock => c.type === 'text')
    .map(c => c.text).join('').trim();
}

async function callGemini(client: GoogleGenerativeAI, systemPrompt: string, messages: Anthropic.MessageParam[], signal: AbortSignal): Promise<string> {
  const model = client.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
  });
  
  // Build Gemini chat history (all turns except the last user message)
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content as string }],
  }));
  
  const chat = model.startChat({ history });
  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessage(lastMessage.content as string, { signal });
  return result.response.text().trim();
}

function mapMessagesForOpenAI(messages: Anthropic.MessageParam[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages.map(m => ({
    role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
    content: typeof m.content === 'string' ? m.content : m.content.map(b => 'text' in b ? b.text : '').join(''),
  }));
}

async function callGroq(client: Groq, systemPrompt: string, messages: Anthropic.MessageParam[], signal: AbortSignal): Promise<string> {
  if (!client) throw new Error('Groq not configured');
  const response = await client.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: 300,
    messages: [
      { role: 'system' as const, content: systemPrompt },
      ...mapMessagesForOpenAI(messages),
    ],
  }, { signal });
  return response.choices[0]?.message?.content?.trim() || '';
}

async function callGrok(apiKey: string, systemPrompt: string, messages: Anthropic.MessageParam[], signal: AbortSignal): Promise<string> {
  if (!apiKey) throw new Error('xAI Grok not configured');
  const response = await fetch(`${GROK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      max_tokens: 300,
      messages: [
        { role: 'system' as const, content: systemPrompt },
        ...mapMessagesForOpenAI(messages),
      ],
    }),
    signal,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`xAI Grok request failed (status=${response.status}): ${body.slice(0, 300)}`);
  }
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function callOpenRouter(apiKey: string, systemPrompt: string, messages: Anthropic.MessageParam[], signal: AbortSignal): Promise<string> {
  if (!apiKey) throw new Error('OpenRouter not configured');
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      // OpenRouter attribution headers (recommended by OpenRouter for
      // traffic stats; APP_URL falls back to a generic referer).
      'HTTP-Referer': process.env.APP_URL || 'https://burflow.ai',
      'X-Title': 'BurFlow',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: 300,
      messages: [
        { role: 'system' as const, content: systemPrompt },
        ...mapMessagesForOpenAI(messages),
      ],
    }),
    signal,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenRouter request failed (status=${response.status}): ${body.slice(0, 300)}`);
  }
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || '';
}

const LLM_PROVIDER_TIMEOUT_MS = 8000;
const LLM_GLOBAL_BUDGET_MS = 12000;

/**
 * Runs a provider call with an AbortSignal-backed timeout. Aborting the signal
 * cancels the underlying HTTP request (SDK/fetch) so a timed-out call stops
 * consuming connections and LLM tokens instead of lingering in the background.
 */
function withAbortTimeout<T>(call: (signal: AbortSignal) => Promise<T>, ms: number, label: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return new Promise<T>((resolve, reject) => {
    call(controller.signal).then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => {
        clearTimeout(timer);
        if (controller.signal.aborted) reject(new Error(`${label} timed out after ${ms}ms`));
        else reject(err);
      },
    );
  });
}

function pinnedProviders(systemPrompt: string, messages: Anthropic.MessageParam[]): Array<{ name: string; configured: boolean; call: (signal: AbortSignal) => Promise<string> }> {
  const explicit = (process.env.LLM_PROVIDER || '').trim().toLowerCase();
  if (explicit === 'anthropic') {
    return [{ name: 'Anthropic', configured: !!anthropicClient, call: (signal: AbortSignal) => callAnthropic(systemPrompt, messages, signal) }];
  }
  if (explicit === 'openrouter') {
    return [{ name: 'OpenRouter', configured: !!openrouterApiKey, call: (signal: AbortSignal) => callOpenRouter(openrouterApiKey!, systemPrompt, messages, signal) }];
  }
  if (explicit === 'grok') {
    return [{ name: 'Grok', configured: !!grokApiKey, call: (signal: AbortSignal) => callGrok(grokApiKey!, systemPrompt, messages, signal) }];
  }
  return [];
}

async function callLLMWithFallback(systemPrompt: string, messages: Anthropic.MessageParam[]): Promise<string> {
  // BurFlow Brain provider chain: an explicit LLM_PROVIDER pin is tried first,
  // then the auto-detected chain (Groq → xAI Grok → OpenRouter → Anthropic →
  // secondary accounts), deduped and capped at the first two CONFIGURED
  // providers with a hard global budget so a single transient outage cannot
  // stall a chat turn for tens of seconds.
  const chain = [
    ...pinnedProviders(systemPrompt, messages),
    { name: 'Groq', configured: !!groqClient, call: (signal: AbortSignal) => callGroq(groqClient!, systemPrompt, messages, signal) },
    { name: 'Grok', configured: !!grokApiKey, call: (signal: AbortSignal) => callGrok(grokApiKey!, systemPrompt, messages, signal) },
    { name: 'OpenRouter', configured: !!openrouterApiKey, call: (signal: AbortSignal) => callOpenRouter(openrouterApiKey!, systemPrompt, messages, signal) },
    { name: 'Anthropic', configured: !!anthropicClient, call: (signal: AbortSignal) => callAnthropic(systemPrompt, messages, signal) },
    { name: 'Groq-2', configured: !!groqClient2, call: (signal: AbortSignal) => callGroq(groqClient2!, systemPrompt, messages, signal) },
    { name: 'Groq-3', configured: !!groqClient3, call: (signal: AbortSignal) => callGroq(groqClient3!, systemPrompt, messages, signal) },
    { name: 'Groq-4', configured: !!groqClient4, call: (signal: AbortSignal) => callGroq(groqClient4!, systemPrompt, messages, signal) },
    { name: 'Groq-5', configured: !!groqClient5, call: (signal: AbortSignal) => callGroq(groqClient5!, systemPrompt, messages, signal) },
    { name: 'Gemini-1', configured: !!geminiClient1, call: (signal: AbortSignal) => callGemini(geminiClient1!, systemPrompt, messages, signal) },
    { name: 'Gemini-2', configured: !!geminiClient2, call: (signal: AbortSignal) => callGemini(geminiClient2!, systemPrompt, messages, signal) },
  ];
  const seen = new Set<string>();
  const providers = chain
    .filter(p => {
      if (!p.configured || seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    })
    .slice(0, 2);

  const deadline = Date.now() + LLM_GLOBAL_BUDGET_MS;
  const failures: string[] = [];
  for (const provider of providers) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const budget = Math.min(LLM_PROVIDER_TIMEOUT_MS, remaining);
    try {
      const result = await withAbortTimeout(provider.call, budget, provider.name);
      console.log(`[brain] LLM response from ${provider.name}`);
      return result;
    } catch (error: unknown) {
      const status = (error as { status?: number })?.status;
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${provider.name} (status=${status || 'no status'}): ${message}`);
      console.error(`[brain] ${provider.name} FAILED (status=${status || 'no status'}): ${message}`);
    }
  }
  
  throw new Error(`All LLM providers failed.\n${failures.join('\n')}`);
}

async function processConversationBrainInner(input: BrainInput): Promise<BrainOutput> {
  const { message, responseText, legacyMemory, tenantId, knowledgeBaseProvider: kbProvider, businessProfile } = input;

  const memory = fromLegacyMemory(legacyMemory);

  // Responses from earlier turns, used to suppress repetitive heuristic
  // boilerplate (e.g. "For X teams, this is especially relevant.").
  const previousResponses: string[] = (legacyMemory.turns || [])
    .map((t) => t.response)
    .filter((r): r is string => typeof r === 'string' && r.length > 0);

  if (input.rejectedCTAs) {
    for (const cta of input.rejectedCTAs) {
      if (!memory.rejectedCTAs.includes(cta)) {
        memory.rejectedCTAs.push(cta);
      }
    }
  }

  if (input.clickedButtonIds) {
    for (const buttonId of input.clickedButtonIds) {
      memory.buttonClicks.push(buttonId);
      if (!memory.buttonAcceptances.includes(buttonId)) memory.buttonAcceptances.push(buttonId);
      buttonTelemetry.recordClicked(buttonId, buttonId, undefined, undefined, memory.turnCount + 1);
    }
  }
  if (input.ignoredButtonIds) {
    for (const buttonId of input.ignoredButtonIds) {
      if (!memory.buttonRejections.includes(buttonId)) memory.buttonRejections.push(buttonId);
      buttonTelemetry.recordIgnored(buttonId, buttonId, undefined, undefined, memory.turnCount + 1);
    }
  }

  const shortReply = handleShortReply(message);

  // "tell me more" advances to the next depth level of the current topic
  if (!shortReply && /^tell me more/i.test(message.trim()) && memory.currentTopic) {
    markTopicExplained(memory, memory.currentTopic);
    const ciResult = buildMinimalCIResult(memory, message);
    const deepResponse = buildTopicResponse(memory.currentTopic, memory, ciResult, tenantId, kbProvider, message);
    if (deepResponse) {
      const newTopics = discernTopics(message);
      updateTrustFromSentiment(memory, ciResult.sentiment.polarity);
      memory.turnCount++;
      memory.turns.push({ turnNumber: memory.turnCount, message, response: deepResponse, customerIntent: 'learning', goal: 'none', funnelStage: memory.funnelStage, timestamp: Date.now() });
      memory.lastResponseText = deepResponse;
      memory.conversationScore = Math.min(100, (memory.conversationScore || 0) + 2);
      const updatedLegacy: ConversationIntelligenceMemory = {
        ...legacyMemory,
        turns: [...legacyMemory.turns, { message, response: deepResponse, polarity: 0, frustration: 0.1, urgency: 0.1, timestamp: Date.now() }],
        topics: memory.topicsExplained.map(t => t.topic),
        qualificationState: { ...memory.qualificationCollected },
        objections: memory.objectionsHandled,
        persona: ciResult.persona?.persona ?? 'unknown',
        lastGoal: memory.lastGoal,
        lastGoalStreak: memory.lastGoalStreak,
      };
      return {
        responseText: deepResponse,
        cta: { primaryCTA: 'none' as CTAType, label: '', link: '' },
        quickReplies: [],
        uiState: { buttons: [], suggestedActions: [] },
        memory,
        legacyMemory: updatedLegacy,
        plan: { customerIntent: 'learning', funnelStage: memory.funnelStage, conversationStage: memory.currentStage || 'greeting', buyerRole: memory.buyerRole || 'unknown', goal: 'none', topicsToDiscuss: [], missingQualification: [] },
        validation: { valid: true, issues: [] },
        ciResult,
        orchestratorResult: ciResult as any,
        extractedLead: extractLeadDetails(message),
      };
    }
  }

  // Vague replies (EMOTIONAL_DIRECT_ACK with empty response) deepen current topic
  if (shortReply === '' && memory.currentTopic && memory.turnCount > 0) {
    const contextualResponse = contextualizeShortReply(message, memory);
    if (contextualResponse) {
      const sAck = detectEmotionalCue(message);
      const ciResult = buildMinimalCIResult(memory, message);
      const isConfirming = /^(ok|okay|sure|yes|yeah|yep)$/i.test(message.trim());
      const sIntent: CustomerIntent = isConfirming ? 'confirming' : 'small_talk';
      const newTopics = discernTopics(message);
      for (const t of newTopics) markTopicExplained(memory, t);
      const finalResponse = `${sAck ? sAck + ' ' : ''}${contextualResponse}`;
      const sCta = { primaryCTA: 'none' as CTAType, label: '', link: '', secondaryCTA: undefined, secondaryLabel: undefined, secondaryLink: undefined };
      const sValidation = { valid: true, issues: [] as string[] };
      updateTrustFromSentiment(memory, ciResult.sentiment.polarity);
      memory.turnCount++;
      memory.turns.push({ turnNumber: memory.turnCount, message, response: finalResponse, customerIntent: sIntent, goal: 'none', funnelStage: memory.funnelStage, timestamp: Date.now() });
      memory.lastResponseText = finalResponse;
      memory.conversationScore = Math.min(100, (memory.conversationScore || 0) + 2);
      if (memory.turnCount % 8 === 0) memory.contextSummary = buildContextSummary(memory, ciResult);
      const updatedLegacy: ConversationIntelligenceMemory = {
        ...legacyMemory,
        turns: [...legacyMemory.turns, { message, response: finalResponse, polarity: ciResult.sentiment.polarity, frustration: 0.1, urgency: 0.1, timestamp: Date.now() }],
        topics: memory.topicsExplained.map(t => t.topic),
        qualificationState: { ...memory.qualificationCollected },
        objections: memory.objectionsHandled,
        persona: ciResult.persona?.persona ?? 'unknown',
        lastGoal: memory.lastGoal,
        lastGoalStreak: memory.lastGoalStreak,
buyingIntentDetected: memory.buyingIntentDetected,
      };
      return {
        responseText: finalResponse, cta: sCta, quickReplies: [], uiState: { buttons: [], suggestedActions: [] },
        memory, legacyMemory: updatedLegacy, plan: { customerIntent: sIntent, funnelStage: memory.funnelStage, conversationStage: memory.currentStage || 'greeting', buyerRole: memory.buyerRole || 'unknown', goal: 'none', topicsToDiscuss: [], missingQualification: [] },
        validation: sValidation, ciResult, orchestratorResult: ciResult as any, acknowledgment: sAck,
        extractedLead: extractLeadDetails(message),
      };
    }
  }

  if (shortReply) {
    const isConfirming = /^(ok|okay|sure|yes|yeah|yep)$/i.test(message.trim()) && memory.turnCount > 0;
    const sIntent: CustomerIntent = isConfirming ? 'confirming' : 'small_talk';
    const sAck = detectEmotionalCue(message);

    const newTopics = discernTopics(message);
    for (const t of newTopics) markTopicExplained(memory, t);
    const ciResult = buildMinimalCIResult(memory, message);

    let finalResponse: string;
    const wantsDeepDive = /^really\??$/i.test(message.trim());
    if (wantsDeepDive && memory.currentTopic) {
      markTopicExplained(memory, memory.currentTopic);
      const deepResponse = buildTopicResponse(memory.currentTopic, memory, ciResult, tenantId, kbProvider, message);
      finalResponse = deepResponse || shortReply;
    } else {
      const contextualResponse = contextualizeShortReply(message, memory);
      finalResponse = `${sAck ? sAck + ' ' : ''}${contextualResponse || shortReply}`;
    }

    const sCta = {
      primaryCTA: 'none' as CTAType,
      label: '',
      link: '',
      secondaryCTA: undefined,
      secondaryLabel: undefined,
      secondaryLink: undefined,
    };
    const sValidation = { valid: true, issues: [] as string[] };
    updateTrustFromSentiment(memory, ciResult.sentiment.polarity);
    memory.turnCount++;
    memory.turns.push({ turnNumber: memory.turnCount, message, response: finalResponse, customerIntent: sIntent, goal: 'none', funnelStage: memory.funnelStage, timestamp: Date.now() });
    memory.lastResponseText = finalResponse;
    memory.conversationScore = Math.min(100, (memory.conversationScore || 0) + 2);
    if (memory.turnCount % 8 === 0) memory.contextSummary = buildContextSummary(memory, ciResult);
    const updatedLegacy: ConversationIntelligenceMemory = {
      ...legacyMemory,
      turns: [...legacyMemory.turns, { message, response: finalResponse, polarity: ciResult.sentiment.polarity, frustration: 0.1, urgency: 0.1, timestamp: Date.now() }],
      topics: memory.topicsExplained.map(t => t.topic),
      qualificationState: { ...memory.qualificationCollected },
      objections: memory.objectionsHandled,
      persona: ciResult.persona?.persona ?? 'unknown',
        lastGoal: memory.lastGoal,
        lastGoalStreak: memory.lastGoalStreak,
buyingIntentDetected: memory.buyingIntentDetected,
    };
    return {
      responseText: finalResponse, cta: sCta, quickReplies: [], uiState: { buttons: [], suggestedActions: [] },
      memory, legacyMemory: updatedLegacy, plan: { customerIntent: sIntent, funnelStage: memory.funnelStage, conversationStage: memory.currentStage || 'greeting', buyerRole: memory.buyerRole || 'unknown', goal: 'none', topicsToDiscuss: [], missingQualification: [] },
      validation: sValidation, ciResult, orchestratorResult: ciResult as any, acknowledgment: sAck,
      extractedLead: extractLeadDetails(message),
    };
  }

  const greeting = /^(hi|hello|hey|howdy|greetings|good morning|good afternoon|good evening|heya|sup)$/i.test(message.trim());
  if (greeting && memory.turnCount > 0) {
    const greetingResponse = handleMidConversationGreeting(memory);
    if (greetingResponse) {
      const gCta = {
        primaryCTA: 'none' as CTAType,
        label: '',
        link: '',
        secondaryCTA: undefined,
        secondaryLabel: undefined,
        secondaryLink: undefined,
      };
      const ciResult = buildMinimalCIResult(memory, message);
      updateTrustFromSentiment(memory, ciResult.sentiment.polarity);
      memory.turnCount++;
      memory.conversationScore = Math.min(100, (memory.conversationScore || 0) + 1);
      memory.turns.push({ turnNumber: memory.turnCount, message, response: greetingResponse, customerIntent: 'small_talk', goal: 'none', funnelStage: memory.funnelStage, timestamp: Date.now() });
      memory.lastResponseText = greetingResponse;
      const updatedLegacy: ConversationIntelligenceMemory = {
        ...legacyMemory,
        turns: [...legacyMemory.turns, { message, response: greetingResponse, polarity: ciResult.sentiment.polarity, frustration: 0.1, urgency: 0.1, timestamp: Date.now() }],
        qualificationState: { ...memory.qualificationCollected },
        objections: memory.objectionsHandled,
        lastGoal: memory.lastGoal,
        lastGoalStreak: memory.lastGoalStreak,
      };
      return {
        responseText: greetingResponse, cta: gCta, quickReplies: [], uiState: { buttons: [], suggestedActions: [] },
        memory, legacyMemory: updatedLegacy, plan: { customerIntent: 'small_talk', funnelStage: memory.funnelStage, conversationStage: memory.currentStage || 'greeting', buyerRole: memory.buyerRole || 'unknown', goal: 'none', topicsToDiscuss: [], missingQualification: [] },
        validation: { valid: true, issues: [] }, ciResult, orchestratorResult: ciResult as any,
        extractedLead: extractLeadDetails(message),
      };
    }
  }

  const ending = handleBetterEnding(message);
  if (ending) {
    const eCta: CTASelectionResult = ending.finalCTA
      ? { primaryCTA: ending.finalCTA as CTAType, label: ending.finalCTA === 'start_free_trial' ? 'Start Free Trial' : 'Contact Sales', link: ending.finalCTA === 'start_free_trial' ? '/signup' : '/contact', secondaryCTA: undefined, secondaryLabel: undefined, secondaryLink: undefined }
      : { primaryCTA: 'contact_sales' as CTAType, label: 'Email Me Later', link: '/contact', secondaryCTA: 'none' as CTAType, secondaryLabel: undefined, secondaryLink: undefined };
    const ciResult = buildMinimalCIResult(memory, message);
    updateTrustFromSentiment(memory, ciResult.sentiment.polarity);
    const order = ['greeting', 'awareness', 'interest', 'consideration', 'evaluation', 'purchase_intent', 'decision', 'customer', 'support'] as const;
    const currentIdx = order.indexOf(memory.funnelStage as any);
    if (currentIdx < order.indexOf('evaluation')) memory.funnelStage = 'evaluation';
    memory.turnCount++;
    memory.isLeaving = true;
    memory.isCompleted = true;
    memory.turns.push({ turnNumber: memory.turnCount, message, response: ending.response, customerIntent: 'leaving', goal: 'finish_conversation', funnelStage: memory.funnelStage, timestamp: Date.now() });
    memory.lastResponseText = ending.response;
    memory.conversationScore = Math.min(100, (memory.conversationScore || 0) + 3);
    const updatedLegacy: ConversationIntelligenceMemory = {
      ...legacyMemory,
      turns: [...legacyMemory.turns, { message, response: ending.response, polarity: ciResult.sentiment.polarity, frustration: 0.1, urgency: 0.1, timestamp: Date.now() }],
      qualificationState: { ...memory.qualificationCollected },
      objections: memory.objectionsHandled,
      persona: ciResult.persona?.persona ?? 'unknown',
        lastGoal: memory.lastGoal,
        lastGoalStreak: memory.lastGoalStreak,
};
    return {
      responseText: ending.response, cta: eCta, quickReplies: [], uiState: { buttons: [], suggestedActions: [] },
      memory, legacyMemory: updatedLegacy, plan: { customerIntent: 'leaving', funnelStage: memory.funnelStage, conversationStage: memory.currentStage || 'greeting', buyerRole: memory.buyerRole || 'unknown', goal: 'finish_conversation', topicsToDiscuss: [], missingQualification: [] },
      validation: { valid: true, issues: [] }, ciResult, orchestratorResult: ciResult as any,
    };
  }

  const offTopicRedirect = isOffTopic(message);
  if (offTopicRedirect && memory.turnCount > 0 && !/(expensive|too much|security|privacy|competitor|don't need)/i.test(message)) {
    const oCta: CTASelectionResult = { primaryCTA: 'none' as CTAType, label: '', link: '', secondaryCTA: undefined, secondaryLabel: undefined, secondaryLink: undefined };
    const ciResult = buildMinimalCIResult(memory, message);
    updateTrustFromSentiment(memory, ciResult.sentiment.polarity);
    memory.turnCount++;
    memory.lastOffTopicRedirect = offTopicRedirect;
    const newTopics = discernTopics(message);
    for (const t of newTopics) markTopicExplained(memory, t);
    memory.turns.push({ turnNumber: memory.turnCount, message, response: offTopicRedirect, customerIntent: 'off_topic', goal: 'none', funnelStage: memory.funnelStage, timestamp: Date.now() });
    memory.lastResponseText = offTopicRedirect;
    memory.conversationScore = Math.min(100, (memory.conversationScore || 0) + 1);
    const updatedLegacy: ConversationIntelligenceMemory = {
      ...legacyMemory,
      turns: [...legacyMemory.turns, { message, response: offTopicRedirect, polarity: ciResult.sentiment.polarity, frustration: 0.1, urgency: 0.1, timestamp: Date.now() }],
      topics: memory.topicsExplained.map(t => t.topic),
      qualificationState: { ...memory.qualificationCollected },
      objections: memory.objectionsHandled,
      lastGoal: memory.lastGoal,
      lastGoalStreak: memory.lastGoalStreak,
    };
    return {
      responseText: offTopicRedirect, cta: oCta, quickReplies: [], uiState: { buttons: [], suggestedActions: [] },
      memory, legacyMemory: updatedLegacy, plan: { customerIntent: 'off_topic', funnelStage: memory.funnelStage, conversationStage: memory.currentStage || 'greeting', buyerRole: memory.buyerRole || 'unknown', goal: 'none', topicsToDiscuss: [], missingQualification: [] },
      validation: { valid: true, issues: [] }, ciResult, orchestratorResult: ciResult as any,
    };
  }

  const legacyForCI = prepareLegacyMemory(memory);

  const { result: ciResult } = processConversationIntelligence({
    message,
    responseText,
    memory: legacyForCI,
  });

  const detectedIndustry = detectIndustry(message, memory);
  if (detectedIndustry.industry && !memory.industry) {
    memory.industry = detectedIndustry.industry;
  }

  const inferredPersona = inferPersonaFromMessage(message, memory);
  if (inferredPersona !== 'unknown' && (memory.persona === 'unknown' || inferredPersona !== memory.persona)) {
    memory.persona = inferredPersona;
    ciResult.persona = { persona: inferredPersona, confidence: 0.9, reasoning: 'Inferred from message patterns' };
  }

  const plan = planConversation(message, memory, ciResult);
  memory.currentStage = plan.conversationStage;
  memory.buyerRole = plan.buyerRole;
  memory.customerTemperature = calculateCustomerTemperature(memory, plan, ciResult);

  const strategy = processConversationDirector(message, memory, ciResult, plan, kbProvider, tenantId);

  const relevantFacts = computeRelevantKnownFacts(memory, strategy, message);
  const newTopics = discernTopics(message);

  // Strategy-first response building — LLM-powered
  let enrichedResponse: string;
  let structuredLeadFields: ExtractedLeadFields | null = null;
  let llmCtaHint: CTAType | null = null;
  let llmFunnelHint: string | null = null;
  const llmSuggestedTopics: string[] = [];
  // True when this turn's reply came from the heuristic template engine instead of
  // the LLM (upstream failure, unparseable output, or no LLM key configured). This
  // is the signal downstream consumers use to record knowledge-base gaps.
  let usedFallback = false;
  if (anthropicClient || openrouterApiKey || geminiClient1 || geminiClient2 || groqClient || groqClient2 || groqClient3 || groqClient4 || groqClient5 || grokApiKey) {
    try {
      const tenantIdForLLM = tenantId || 'default';
      const availableTopics = kbProvider?.getAvailableTopics(tenantIdForLLM) || [];
      const knowledgeSections = availableTopics.map(topic => {
        const entry = kbProvider?.getTopicResponse(topic, tenantIdForLLM, 0);
        return entry ? `### ${topic}\n${entry.answer}` : null;
      }).filter(Boolean).join('\n\n');

      const crawledKnowledge = kbProvider?.getBusinessKnowledge?.(tenantIdForLLM) || '';

      let businessContext = '';
      if (crawledKnowledge) {
        businessContext = `WEBSITE CONTENT (use this to answer questions about this specific business — it is the primary source of truth):\n${crawledKnowledge}`;
      } else if (knowledgeSections) {
        businessContext = knowledgeSections;
      } else {
        businessContext = 'No specific business knowledge available. Be helpful and ask clarifying questions.';
      }

      const turns = legacyMemory.turns || [];
      const recentTurns = turns.slice(-8);
      const messages: Anthropic.MessageParam[] = [];
      for (const turn of recentTurns) {
        if (turn.message) {
          try {
            messages.push({ role: 'user', content: normalizeMessageContent(turn.message) });
          } catch { messages.push({ role: 'user', content: '' }); }
        }
        if (turn.response) {
          try {
            messages.push({ role: 'assistant', content: normalizeMessageContent(turn.response) });
          } catch { messages.push({ role: 'assistant', content: '' }); }
        }
      }
      messages.push({ role: 'user', content: normalizeMessageContent(message) });

      const systemPrompt = `You are a helpful assistant for a real business. Answer visitor questions using ONLY the business knowledge below.
Be concise (under 100 words), conversational, and genuinely helpful.
Never invent pricing, features, or policies not listed below.
If you don't know something, say so honestly and offer to connect them with someone who can help.

CRITICAL RULES:
1. Answer the question directly first. No filler openers like "For teams, this is especially relevant."
2. Do not repeat filler phrases like "For small business teams..." and do not repeat questions that were already asked in previous turns of this conversation — vary your wording and only ask something new.
3. Be concise, direct, and natural. Do not repeat greeting phrases, boilerplate intro lines, or questions that were already asked in previous turns.
4. Use the specific business information below — don't give generic answers.
5. If the visitor asks about pricing, services, or products, reference the actual business details provided.
6. When responding to pricing or plan inquiries, answer with exact tier details ($49/mo Starter, $99/mo Professional, Custom Enterprise) and do not pivot to explaining unrelated feature workflows unless explicitly asked.
7. Only suggest booking a demo or contacting sales if the visitor explicitly asks for it.
8. Be warm and helpful, not pushy.

LEAD CAPTURE:
If the visitor shares contact details or company info in this message (email, phone, their name, or company), also include an "extractedLead" object with the fields email, phone, name, company (leave null when not provided). Never invent contact details.

BUSINESS KNOWLEDGE:
${businessContext}

Respond with ONLY a JSON object — no markdown, no explanation, using exactly this shape:
{
  "responseText": "your response to the visitor",
  "strategy": "one or two words describing your conversational strategy, e.g. educate, qualify, handle_objection, advance_funnel, recommend_plan, close_trial, schedule_demo, build_trust",
  "suggestedTopics": ["1-3 follow-up topics the visitor might care about next"],
  "ctaType": "one of: none, book_demo, start_free_trial, contact_sales, pricing, support",
  "funnelStage": "one of: greeting, awareness, interest, consideration, evaluation, purchase_intent, decision, customer, support"
}`;

      const text = await callLLMWithFallback(systemPrompt, messages);
      const parsed = parseLLMResponse(text);
      if (parsed) {
        enrichedResponse = parsed.responseText || "I need a moment — could you tell me a bit more about what you're looking for?";
        structuredLeadFields = parseStructuredLeadFields(parsed);

        // Apply structured hints from the LLM (validated against known enums)
        if (typeof parsed.funnelStage === 'string') llmFunnelHint = parsed.funnelStage;
        if (typeof parsed.ctaType === 'string') {
          const ctaValue = parsed.ctaType as CTAType;
          if (['start_free_trial', 'book_demo', 'contact_sales', 'developer_docs', 'pricing', 'upload_documentation', 'talk_enterprise_sales', 'partner_program', 'support', 'none'].includes(ctaValue)) {
            llmCtaHint = ctaValue;
          }
        }
        if (Array.isArray(parsed.suggestedTopics)) {
          for (const topic of parsed.suggestedTopics.slice(0, 5)) {
            if (typeof topic === 'string' && topic.trim() && !llmSuggestedTopics.includes(topic.trim())) {
              llmSuggestedTopics.push(topic.trim());
            }
          }
        }
      } else {
        // LLM responded with unparseable output — degrade gracefully to the
        // heuristic template engine instead of failing the visitor's turn.
        usedFallback = true;
        enrichedResponse = buildStrategyResponse(strategy, message, memory, plan, ciResult, relevantFacts, tenantId, kbProvider, businessProfile, previousResponses);
      }
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string; provider?: string };
      const status = err.status;
      const messageStr = error instanceof Error ? error.message : String(error);
      console.error(`[brain] LLM call failed (status=${status || 'no status'}): ${messageStr}`);

      // Invalid payload (bad message content) must surface as a 400 to the caller.
      if (error instanceof PayloadValidationError) throw error;

      // Upstream exhaustion must not fail the visitor's turn — degrade
      // gracefully to the heuristic template engine.
      usedFallback = true;
      enrichedResponse = buildStrategyResponse(strategy, message, memory, plan, ciResult, relevantFacts, tenantId, kbProvider, businessProfile, previousResponses);
    }
  } else {
    // No LLM provider configured — the heuristic engine answers this turn.
    usedFallback = true;
    enrichedResponse = buildStrategyResponse(strategy, message, memory, plan, ciResult, relevantFacts, tenantId, kbProvider, businessProfile, previousResponses);
  }

  // Surface the degradation signal to the CI result so callers can detect
  // knowledge gaps at chat time.
  if (usedFallback) ciResult.isFallback = true;

  enrichedResponse = enforceContinuity(enrichedResponse, memory, newTopics);

  enrichedResponse = adaptResponseToContext(enrichedResponse, memory);

  // buildStrategyResponse already handles openings, acknowledgments, and goal content.
  // Do NOT prepend duplicate openings here — it creates redundant prefixes
  // like "Good to know. Helpful context. What is your company size?"
  // Instead keep detection for output metadata only.
  const acknowledgment = detectEmotionalCue(message);

  // Phase E: Momentum validation
  const momentum = validateMomentum(enrichedResponse, memory, plan, strategy, relevantFacts);
  if (momentum.shouldRegenerate && momentum.weakPoints.includes('no_advance')) {
    const followUp = strategy.followUpTopic ? `Would you like to explore ${strategy.followUpTopic} next?` : '';
    if (followUp && !enrichedResponse.includes(followUp.slice(0, 20))) {
      enrichedResponse = `${enrichedResponse} ${followUp}`;
    }
  }

  // Phase F: Dead-end prevention
  enrichedResponse = preventDeadEnd(enrichedResponse, memory);

  let cta: CTASelectionResult;
  if (strategy.cta === 'none') {
    cta = { primaryCTA: 'none' as CTAType, label: '', link: '', secondaryCTA: undefined, secondaryLabel: undefined, secondaryLink: undefined };
  } else {
    cta = selectCTAByPlan(ciResult.persona?.persona ?? 'unknown', plan, memory, businessProfile);
    if (strategy.cta === 'soft' && cta.primaryCTA !== 'none') {
      cta = { ...cta, secondaryCTA: undefined, secondaryLabel: undefined, secondaryLink: undefined };
    }
  }

  // LLM-structured CTA hint overrides the deterministic pick when valid
  if (llmCtaHint && llmCtaHint !== 'none' && strategy.cta !== 'none') {
    // Tenant CTA profile wins over the SaaS label/link map.
    if (businessProfile?.cta) {
      cta = {
        primaryCTA: (businessProfile.cta.type as CTAType) || llmCtaHint,
        label: businessProfile.cta.label,
        link: businessProfile.cta.link,
        secondaryCTA: undefined,
        secondaryLabel: undefined,
        secondaryLink: undefined,
      };
    } else {
      const llmCtaLabels: Record<CTAType, { label: string; link: string }> = {
      start_free_trial: { label: 'Start Free Trial', link: '/signup' },
      book_demo: { label: 'Book a Demo', link: '/signup' },
      contact_sales: { label: 'Talk to Sales', link: '/contact' },
      pricing: { label: 'See Pricing', link: '/pricing' },
      support: { label: 'Contact Support', link: '/support' },
      developer_docs: { label: 'View Developer Docs', link: '/docs' },
      upload_documentation: { label: 'Upload Documentation', link: '/docs' },
      talk_enterprise_sales: { label: 'Talk to Enterprise Sales', link: '/contact' },
      partner_program: { label: 'Join Partner Program', link: '/contact' },
      none: { label: '', link: '' },
    };
      const chosen = llmCtaLabels[llmCtaHint];
      if (chosen) {
        cta = { primaryCTA: llmCtaHint, label: chosen.label, link: chosen.link, secondaryCTA: undefined, secondaryLabel: undefined, secondaryLink: undefined };
      }
    }
  }

  const nextBestAction = determineNextBestAction(plan, memory, ciResult);
  const quickReplies = buildDynamicQuickReplies(message, plan, memory, ciResult, businessProfile);

  // recommendPlan kept for output metadata only — buildStrategyResponse already handles plan recommendations
  const recommended = recommendPlan(memory);
  const contextRef = generateContextReference(memory);

  if (memory.turnCount > 0 && memory.turnCount % 8 === 0) {
    memory.contextSummary = buildContextSummary(memory, ciResult);
  }

  if (contextRef && !enrichedResponse.startsWith(contextRef)) {
    enrichedResponse = `${contextRef} ${enrichedResponse}`;
  }

  const uiState: ConversationUIState = {
    buttons: [],
    suggestedActions: quickReplies.map(qr => ({
      id: qr.id,
      label: qr.label,
      action: qr.action,
      payload: qr.payload,
      variant: qr.variant,
    })),
    // Tenant CTA profiles replace the SaaS conversion UI (free-trial lead
    // forms, SaaS pricing cards) with the tenant's own quick replies + CTA.
    activeCard: businessProfile ? undefined : ciResult.uiState?.activeCard,
  };

  if (strategy.topicToAnswer) {
    memory.currentTopic = strategy.topicToAnswer;
  } else if (newTopics.length > 0) {
    memory.currentTopic = newTopics[newTopics.length - 1];
  }

  // LLM-structured funnel-stage hint (validated) — keeps memory + output plan in sync
  const VALID_FUNNEL_STAGES: FunnelStageExtended[] = [
    'greeting', 'awareness', 'interest', 'consideration', 'evaluation',
    'purchase_intent', 'decision', 'customer', 'support',
  ];
  if (llmFunnelHint && (VALID_FUNNEL_STAGES as string[]).includes(llmFunnelHint)) {
    memory.funnelStage = llmFunnelHint as FunnelStageExtended;
    plan.funnelStage = llmFunnelHint as FunnelStageExtended;
  }

  // LLM-suggested follow-up topics (mapped onto known topics, deduped, capped)
  if (llmSuggestedTopics.length > 0) {
    const topicKeywordMap: Array<[RegExp, DiscernedTopic]> = [
      [/pricing|price|cost|plan/i, 'pricing'],
      [/secur|soc|compliance/i, 'security'],
      [/feature|capabilit/i, 'features'],
      [/trial/i, 'trial'],
      [/demo/i, 'demo'],
      [/integrat/i, 'integrations'],
      [/api|sdk|develop/i, 'api'],
      [/onboard/i, 'onboarding'],
      [/compar|alternativ/i, 'comparison'],
      [/roi|return on/i, 'roi'],
      [/sso|single sign/i, 'sso'],
      [/walkthrough|how it works/i, 'walkthrough'],
    ];
    for (const topic of llmSuggestedTopics) {
      const matched = topicKeywordMap.find(([re]) => re.test(topic))?.[1];
      if (matched && !plan.topicsToDiscuss.some(t => t === matched) && plan.topicsToDiscuss.length < 5) {
        plan.topicsToDiscuss.push(matched);
      }
    }
  }

  updateMemoryFromBrain(memory, message, enrichedResponse, ciResult, plan, { plannerActionScores: (plan as any).actionScores || [], directorChosenAction: strategy.chosenAction?.action, brainExecutedAction: strategy.chosenAction?.action, ctaDecision: { ctaId: cta.primaryCTA, timing: strategy.cta } });
  checkQualificationCompletion(memory);

  const updatedLegacy: ConversationIntelligenceMemory = {
    ...legacyMemory,
    turns: [
      ...legacyMemory.turns,
      {
        message,
        response: enrichedResponse,
        polarity: ciResult.sentiment.polarity,
        frustration: ciResult.sentiment.frustration === 'high' ? 0.8 : ciResult.sentiment.frustration === 'medium' ? 0.4 : 0.1,
        urgency: ciResult.sentiment.urgency === 'high' ? 0.8 : ciResult.sentiment.urgency === 'medium' ? 0.4 : 0.1,
        timestamp: Date.now(),
      },
    ],
    persona: ciResult.persona?.persona ?? 'unknown',
        lastGoal: memory.lastGoal,
        lastGoalStreak: memory.lastGoalStreak,
funnelStage: ciResult.funnelStage,
    buyingIntentDetected: memory.buyingIntentDetected,
    buyingIntentPhrase: memory.buyingIntentPhrase,
    buyingIntentTier: memory.buyingIntentTier,
    objections: ciResult.objection.isObjection && !legacyMemory.objections.includes(ciResult.objection.category)
      ? [...legacyMemory.objections, ciResult.objection.category]
      : legacyMemory.objections,
    qualificationState: ciResult.qualification,
    repeatedPhraseCount: legacyMemory.repeatedPhraseCount + (ciResult.repetition?.count || 0),
    topics: memory.topicsExplained.map(t => t.topic),
    companySize: memory.companySize || legacyMemory.companySize,
    industry: memory.industry || legacyMemory.industry,
    useCase: memory.useCase || legacyMemory.useCase,
    monthlyConversations: memory.monthlyConversations || legacyMemory.monthlyConversations,
    currentHelpdesk: memory.currentHelpdesk || legacyMemory.currentHelpdesk,
    budget: memory.budget || legacyMemory.budget,
    decisionTimeline: memory.decisionTimeline || legacyMemory.decisionTimeline,
  };

  const validation = validateResponse(responseText, message, memory, ciResult);

  if (process.env.DEBUG_CONVERSATION) {
    const missingQ = plan.missingQualification.join(', ') || 'none';
    const answeredQ = memory.questionsAnswered.join(', ') || 'none';
    const topicsDiscussed = memory.topicsExplained.map(t => `${t.topic}(${t.phase})`).join(', ') || 'none';
    console.log(`[CONV_DEBUG turn=${memory.turnCount}]
  Goal: ${plan.goal}
  Topic: ${memory.currentTopic || 'none'}
  Funnel: ${memory.funnelStage}
  Intent: ${plan.customerIntent}
  PendingQ: ${missingQ}
  AnsweredQ: ${answeredQ}
  QualCompleted: ${memory.qualificationCollected.completed}
  Topics: ${topicsDiscussed}
  Strategy: ${strategy.primaryGoal} | ${strategy.cta}
  LeadScore: ${memory.leadScore} | ConvScore: ${memory.conversationScore}
  NextAction: ${plan.goal} ${strategy.cta === 'none' ? '(no CTA)' : `(${strategy.cta} CTA)`}
  Reason: intent=${plan.customerIntent} stage=${memory.funnelStage} qual=${memory.qualificationCollected.completed}
  LLMHints: funnel=${llmFunnelHint || '—'} cta=${llmCtaHint || '—'} topics=${llmSuggestedTopics.join(', ') || '—'}`);
  }

  const telemetrySnapshot = buttonTelemetry.snapshot();
  const decisionTrace: DecisionTrace = {
    chosenButtons: quickReplies.map(btn => ({ id: btn.id, label: btn.label, category: btn.category, score: btn.score ?? 0 })),
    buttonScores: Object.fromEntries(quickReplies.map(btn => [btn.id, btn.score ?? 0])),
    buttonClicked: input.clickedButtonIds,
    buttonCTR: Object.fromEntries(Object.entries(telemetrySnapshot.byButton).map(([buttonId, record]) => [buttonId, record.ctr])),
  };

  return {
    responseText: enrichedResponse,
    cta,
    quickReplies,
    uiState,
    memory,
    legacyMemory: updatedLegacy,
    plan: {
      customerIntent: plan.customerIntent,
      funnelStage: plan.funnelStage,
      conversationStage: plan.conversationStage,
      buyerRole: plan.buyerRole,
      goal: plan.goal,
      topicsToDiscuss: plan.topicsToDiscuss,
      missingQualification: plan.missingQualification,
    },
    validation,
    ciResult,
    orchestratorResult: ciResult as any,
    planRecommendation: recommended,
    contextReference: contextRef,
    acknowledgment,
    strategy,
    momentum,
    qualityMetrics: computeQualityMetrics(memory),
    decisionTrace,
    debugPanel: buildDebugPanel(memory, plan, ciResult, quickReplies, nextBestAction, momentum),
    extractedLead: mergeLeadFields(extractLeadDetails(message), structuredLeadFields),
  };
}

// Must exceed the slowest provider timeout (8s) so a real LLM response that
// arrives late is kept, not discarded for a canned fallback. Provider timeouts
// were raised to 8s; this global ceiling is 12s so the provider gets its full
// budget and only a genuinely hung pipeline falls back.
const BRAIN_HARD_CEILING_MS = 12000;

function buildTimeoutFallback(input: BrainInput): BrainOutput {
  const memory = fromLegacyMemory(input.legacyMemory);
  const ciResult = buildMinimalCIResult(memory, input.message);
  ciResult.isFallback = true;
  memory.turnCount++;
  const updatedLegacy: ConversationIntelligenceMemory = {
    ...input.legacyMemory,
    turns: [...input.legacyMemory.turns, { message: input.message, response: '', polarity: 0, frustration: 0.1, urgency: 0.1, timestamp: Date.now() }],
    topics: memory.topicsExplained.map(t => t.topic),
    qualificationState: { ...memory.qualificationCollected },
    objections: memory.objectionsHandled,
    persona: ciResult.persona?.persona ?? 'unknown',
    lastGoal: memory.lastGoal,
    lastGoalStreak: memory.lastGoalStreak,
  };
  return {
    responseText: 'Thanks for your patience — let me look that up for you. Could you repeat your question while I pull the details?',
    cta: { primaryCTA: 'none' as CTAType, label: '', link: '' },
    quickReplies: [],
    uiState: { buttons: [], suggestedActions: [] },
    memory,
    legacyMemory: updatedLegacy,
    plan: {
      customerIntent: 'information' as CustomerIntent,
      funnelStage: memory.funnelStage,
      conversationStage: memory.currentStage || 'greeting',
      buyerRole: memory.buyerRole || 'unknown',
      goal: 'answer_question' as ConversationGoal,
      topicsToDiscuss: [],
      missingQualification: [],
    },
    validation: { valid: true, issues: [] },
    ciResult,
    orchestratorResult: ciResult as any,
    extractedLead: extractLeadDetails(input.message),
  };
}

export async function processConversationBrain(input: BrainInput): Promise<BrainOutput> {
  let timer: NodeJS.Timeout | undefined;
  const ceiling = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`processConversationBrain exceeded ${BRAIN_HARD_CEILING_MS}ms ceiling`));
    }, BRAIN_HARD_CEILING_MS);
  });

  try {
    return await Promise.race([processConversationBrainInner(input), ceiling]);
  } catch (error: unknown) {
    // Typed client-side payload errors (400) and upstream LLM failures (502) must
    // propagate to the HTTP layer instead of being masked as a 200 fallback.
    if (error instanceof PayloadValidationError || error instanceof UpstreamLLMError) throw error;

    // Anything else (e.g. the 5s ceiling timeout) gets a graceful fallback so the
    // visitor still receives a response and the process never terminates.
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error && error.stack ? `\n${error.stack}` : '';
    console.warn(`[brain] ${message} — returning graceful fallback response${stack}`);
    return buildTimeoutFallback(input);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ============================================================
// Phase E: Conversation Momentum Validator
// ============================================================

export interface MomentumResult {
  answered: boolean;
  referencedContext: boolean;
  advanced: boolean;
  naturalEnding: boolean;
  momentumScore: number;
  weakPoints: string[];
  shouldRegenerate: boolean;
}

function validateMomentum(
  response: string,
  memory: ConversationMemoryData,
  plan: { goal: ConversationGoal; customerIntent: CustomerIntent; funnelStage: FunnelStageExtended },
  strategy: ConversationStrategy,
  relevantFacts: RelevantKnownFacts,
): MomentumResult {
  const weakPoints: string[] = [];

  // Check 1: Answered - response is substantive and not just a question
  const trimmed = response.trim();
  const answered = trimmed.length > 30 && !trimmed.endsWith('?');
  if (!answered) weakPoints.push('unanswered');

  // Check 2: Referenced context - references memory facts or past topics
  const lower = trimmed.toLowerCase();
  const userCtxMatch = relevantFacts.userContext.some(ctx => {
    const key = ctx.split(':')[0].trim().toLowerCase();
    return key && lower.includes(key);
  });
  const topicRefMatch = memory.topicsExplained.some(t => typeof t.topic === 'string' && lower.includes(t.topic.toLowerCase()));
  const referencedContext = userCtxMatch || topicRefMatch || relevantFacts.buyingIntent !== null;
  if (!referencedContext) weakPoints.push('no_context_ref');

  // Check 3: Advanced - CTA or follow-up moves conversation forward
  const advanced = strategy.cta !== 'none' || strategy.followUpTopic !== null || plan.goal === 'finish_conversation';
  if (!advanced) weakPoints.push('no_advance');

  // Check 4: Natural ending - appropriate ending for the goal
  const naturalEnding = plan.goal === 'finish_conversation' || (strategy.cta !== 'none' && !trimmed.endsWith('?'));
  if (!naturalEnding) weakPoints.push('weak_ending');

  const score = [answered, referencedContext, advanced, naturalEnding].filter(Boolean).length / 4;

  return {
    answered,
    referencedContext,
    advanced,
    naturalEnding,
    momentumScore: score,
    weakPoints,
    shouldRegenerate: score < 0.5,
  };
}

// ============================================================
// Phase F: Dead-End Prevention
// ============================================================

const DEAD_END_PATTERNS: RegExp[] = [
  /what else can i help you with\?/i,
  /let me know if you have questions/i,
  /anything else\?/i,
  /is there anything else/i,
  /anything i can help with\?/i,
  /other questions\?/i,
  /further questions/i,
];

const DEAD_END_FIXES: Record<string, string[]> = {
  shopify: [
    'Since you mentioned your Shopify store, the next useful thing is seeing how the widget answers shipping and return questions automatically.',
    'Your Shopify setup pairs well with automated shipping labels and return routing — want to see how that works?',
  ],
  developer: [
    'Earlier you asked about APIs. I can also show how the SDK integrates in under 10 minutes.',
    'For developers, the quickest next step is trying the interactive sandbox with your own API key.',
  ],
  enterprise: [
    'Since security matters for your team, would you like a quick overview of SSO and audit logging?',
    'Enterprise teams typically want to see SOC 2 compliance and SSO setup — shall I walk through that?',
  ],
  default: [
    'The next useful step is seeing how this works for your specific setup — want me to show a quick example?',
    'Would you like me to demonstrate how this fits into your current workflow?',
  ],
};

function detectDeadEnd(response: string, memory: ConversationMemoryData): string | null {
  const lower = response.trim().toLowerCase();
  for (const pattern of DEAD_END_PATTERNS) {
    if (pattern.test(lower)) {
      // Find the best fix based on context
      const fixes: string[] = [];
      const lowerMemory = response.toLowerCase();

      if (memory.companySize && /shopify|store|e.commerce/i.test(memory.industry || '')) {
        fixes.push(...DEAD_END_FIXES.shopify);
      }
      if (memory.useCase && /developer|api|sdk|integration/i.test(memory.useCase)) {
        fixes.push(...DEAD_END_FIXES.developer);
      }
      if (memory.persona === 'enterprise') {
        fixes.push(...DEAD_END_FIXES.enterprise);
      }

      fixes.push(...DEAD_END_FIXES.default);
      return fixes[0] || null;
    }
  }
  return null;
}

function preventDeadEnd(response: string, memory: ConversationMemoryData): string {
  const deadEnd = detectDeadEnd(response, memory);
  if (deadEnd && response.length > 20) {
    // Remove the dead-end CTA from the end and append the fix
    const withoutDeadEnd = response.replace(/\s*(what else can i help you with\?|let me know if you have questions|anything else\?|is there anything else|anything i can help with\?|other questions\?|further questions)\s*$/i, '').trim();
    if (withoutDeadEnd.length > 10) {
      return `${withoutDeadEnd} ${deadEnd}`;
    }
    return deadEnd;
  }
  return response;
}

// ============================================================
// Phase G: Conversation Quality Metrics
// ============================================================

export interface QualityMetrics {
  memoryReferenceRate: number;
  topicCompletionRate: number;
  topicRestartRate: number;
  momentumScore: number;
  deadEndRate: number;
  recommendationReuseRate: number;
  genericTemplateRate: number;
}

function computeQualityMetrics(memory: ConversationMemoryData): QualityMetrics {
  const turns = memory.turns;
  if (turns.length === 0) {
    return { memoryReferenceRate: 0, topicCompletionRate: 0, topicRestartRate: 0, momentumScore: 0, deadEndRate: 0, recommendationReuseRate: 0, genericTemplateRate: 0 };
  }

  // MemoryReferenceRate: how often remembered facts are naturally referenced
  let memoryRefs = 0;
  for (const turn of turns) {
    const lower = turn.response.toLowerCase();
    if (memory.companySize && lower.includes(memory.companySize.toLowerCase().split(' ')[0])) memoryRefs++;
    if (memory.industry && lower.includes(memory.industry.toLowerCase())) memoryRefs++;
    if (memory.useCase && lower.includes(memory.useCase.toLowerCase())) memoryRefs++;
  }
  const memoryReferenceRate = turns.length > 0 ? memoryRefs / turns.length : 0;

  // TopicCompletionRate: percentage of topics reaching mentioned→explaining→completed
  const allTopics = memory.topicsExplained;
  const completedTopics = allTopics.filter(t => t.phase === 'completed');
  const topicCompletionRate = allTopics.length > 0 ? completedTopics.length / allTopics.length : 0;

  // TopicRestartRate: completed topics appearing again without user request
  let restarts = 0;
  for (let i = 1; i < allTopics.length; i++) {
    const prev = allTopics[i - 1];
    const curr = allTopics[i];
    if (prev.phase === 'completed' && curr.topic === prev.topic && curr.phase !== 'completed') {
      restarts++;
    }
  }
  const topicRestartRate = completedTopics.length > 0 ? restarts / completedTopics.length : 0;

  // MomentumScore: % of responses with momentumScore >= 0.75
  let goodMomentum = 0;
  for (const turn of turns) {
    if (turn.response.length > 30 && !turn.response.trim().endsWith('?')) {
      goodMomentum++;
    }
  }
  const momentumScore = turns.length > 0 ? goodMomentum / turns.length : 0;

  // DeadEndRate: responses ending without logical next step
  let deadEnds = 0;
  for (const turn of turns) {
    const lower = turn.response.toLowerCase();
    if (/what else can i help|let me know if|anything else|is there anything else/.test(lower)) {
      deadEnds++;
    }
  }
  const deadEndRate = turns.length > 0 ? deadEnds / turns.length : 0;

  // RecommendationReuseRate: identical recommendations repeating
  const recTexts = (memory.planRecommendations || []).map(r => r.planName);
  const recCounts = new Map<string, number>();
  for (const r of recTexts) {
    recCounts.set(r, (recCounts.get(r) || 0) + 1);
  }
  const reusedRecs = Array.from(recCounts.values()).filter(c => c > 1).length;
  const recommendationReuseRate = recTexts.length > 0 ? reusedRecs / recTexts.length : 0;

  // GenericTemplateRate: fallback/template responses (short, generic)
  let generic = 0;
  for (const turn of turns) {
    if (turn.response.length < 40 || turn.response.includes('That\'s a great question')) {
      generic++;
    }
  }
  const genericTemplateRate = turns.length > 0 ? generic / turns.length : 0;

  return {
    memoryReferenceRate: Math.round(memoryReferenceRate * 100) / 100,
    topicCompletionRate: Math.round(topicCompletionRate * 100) / 100,
    topicRestartRate: Math.round(topicRestartRate * 100) / 100,
    momentumScore: Math.round(momentumScore * 100) / 100,
    deadEndRate: Math.round(deadEndRate * 100) / 100,
    recommendationReuseRate: Math.round(recommendationReuseRate * 100) / 100,
    genericTemplateRate: Math.round(genericTemplateRate * 100) / 100,
  };
}
