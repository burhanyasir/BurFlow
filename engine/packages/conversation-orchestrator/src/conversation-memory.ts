import { PersonaType, FunnelStage, ObjectionCategory, QualificationState } from './types';
import { SentimentSnapshot, ConversationIntelligenceMemory } from './conversation-intelligence-types';

export type ConversationGoal =
  | 'build_trust'
  | 'answer_question'
  | 'handle_objection'
  | 'qualify'
  | 'advance_funnel'
  | 'recommend_plan'
  | 'close_trial'
  | 'schedule_demo'
  | 'recover_abandonment'
  | 'finish_conversation'
  | 'none';

export type CustomerIntent =
  | 'greeting'
  | 'learning'
  | 'comparing'
  | 'evaluating'
  | 'buying'
  | 'objection'
  | 'implementation'
  | 'leaving'
  | 'off_topic'
  | 'small_talk'
  | 'confirming'
  | 'rejecting'
  | 'unknown';

export type FunnelStageExtended =
  | 'greeting'
  | 'awareness'
  | 'interest'
  | 'consideration'
  | 'evaluation'
  | 'purchase_intent'
  | 'decision'
  | 'customer'
  | 'support';

export type DiscernedTopic =
  | 'features'
  | 'pricing'
  | 'security'
  | 'integrations'
  | 'api'
  | 'roi'
  | 'soc2'
  | 'sso'
  | 'walkthrough'
  | 'comparison'
  | 'demo'
  | 'trial'
  | 'onboarding'
  | 'developer';

export interface TopicRecord {
  topic: DiscernedTopic;
  explainedAtTurn: number;
  count: number;
  phase: TopicPhase;
}

export type TopicPhase = 'mentioned' | 'explaining' | 'completed' | 'referenced';

export interface SalesSignals {
  objections: string[];
  competitors: string[];
  budget?: string;
  deadline?: string;
  integrations: string[];
  painPoints: string[];
  trustIssues: string[];
  ctaRejections: string[];
  urgencySignals: string[];
  authoritySignals: string[];
  timelineSignals: string[];
}

export interface CTARecord {
  cta: string;
  label: string;
  turnNumber: number;
  accepted: boolean;
  rejected: boolean;
}

export interface TurnRecord {
  turnNumber: number;
  message: string;
  response: string;
  customerIntent: CustomerIntent;
  goal: ConversationGoal;
  funnelStage: FunnelStageExtended;
  timestamp: number;
}

export interface ContextSummaryData {
  lastUpdatedAtTurn: number;
  persona?: PersonaType;
  companySize?: string;
  industry?: string;
  needsSoc2?: boolean;
  interestInPricing?: boolean;
  currentHelpdesk?: string;
  buyingIntent: 'low' | 'medium' | 'high';
  keyTopics: string[];
  objections: ObjectionCategory[];
  missingQualification: string[];
}

export interface QualificationField {
  value?: string;
  confidence: number; // 0-1
  lastUpdatedTurn: number;
}

export interface TrustRecord {
  turn: number;
  trust: 'low' | 'medium' | 'high';
  reason?: string;
}

export interface ConversationMemoryData {
  persona: PersonaType;
  industry?: string;
  companySize?: string;
  /** captured qualification fields as a flexible map (BANT/MEDDICC/SPICED) */
  qualificationFields: Record<string, QualificationField>;
  useCase?: string;
  monthlyConversations?: string;
  currentHelpdesk?: string;
  budget?: string;
  decisionTimeline?: string;

  turnCount: number;
  funnelStage: FunnelStageExtended;

  topicsExplained: TopicRecord[];
  topicsAvoided: string[];
  questionsAnswered: string[];

  qualificationCollected: QualificationState;

  objectionsHandled: ObjectionCategory[];

  ctasShown: CTARecord[];

  buyingIntentDetected: boolean;
  buyingIntentPhrase?: string;
  buyingIntentTier?: string;
  recommendedPlan?: string;

  trustLevel: 'low' | 'medium' | 'high';
  trustHistory: TrustRecord[];
  sentiment: SentimentSnapshot;
  leadScore: number;
  conversationScore: number;
  abandonmentRisk: 'low' | 'medium' | 'high';

  memoryConfidence: number; // 0-1 overall confidence that memory is accurate
  momentumScore: number; // -1..1 momentum of conversation

  lastCta?: string;
  lastResponseText?: string;
  lastGoal?: ConversationGoal;

  salesSignals: SalesSignals;
  turns: TurnRecord[];

  goalsAchieved: ConversationGoal[];

  isLeaving: boolean;
  isAbandoned: boolean;
  isCompleted: boolean;

  rejectedCTAs: string[];

  usedOpenings: string[];
  currentTopic?: DiscernedTopic;
  lastOffTopicRedirect?: string;
  contextSummary: ContextSummaryData;
  contextSummaryTurn: number;
}

export function createMemory(data?: Partial<ConversationMemoryData>): ConversationMemoryData {
  return {
    persona: 'unknown',
    turnCount: 0,
    funnelStage: 'greeting',
    topicsExplained: [],
    topicsAvoided: [],
    questionsAnswered: [],
    qualificationFields: {},
    qualificationCollected: { questionsAskedCount: 0, completed: false },
    objectionsHandled: [],
    ctasShown: [],
    buyingIntentDetected: false,
    trustLevel: 'medium',
    trustHistory: [],
    sentiment: { polarity: 0, frustration: 'low', urgency: 'low', trend: 'stable' },
    leadScore: 0,
    conversationScore: 0,
    abandonmentRisk: 'low',
    memoryConfidence: 0.8,
    momentumScore: 0,
    salesSignals: {
      objections: [],
      competitors: [],
      integrations: [],
      painPoints: [],
      trustIssues: [],
      ctaRejections: [],
      urgencySignals: [],
      authoritySignals: [],
      timelineSignals: [],
      budget: undefined,
      deadline: undefined,
    },
    turns: [],
    goalsAchieved: [],
    isLeaving: false,
    isAbandoned: false,
    isCompleted: false,
    rejectedCTAs: [],
    usedOpenings: [],
    contextSummary: {
      lastUpdatedAtTurn: 0,
      buyingIntent: 'low',
      keyTopics: [],
      objections: [],
      missingQualification: [],
    },
    contextSummaryTurn: 0,
    ...data,
  };
}

export function fromLegacyMemory(legacy: ConversationIntelligenceMemory): ConversationMemoryData {
  const mem = createMemory();
  mem.persona = legacy.persona;
  mem.turnCount = legacy.turns.length;
  mem.buyingIntentDetected = legacy.buyingIntentDetected;
  mem.buyingIntentPhrase = legacy.buyingIntentPhrase;
  mem.buyingIntentTier = legacy.buyingIntentTier;
  mem.objectionsHandled = [...legacy.objections];
  mem.qualificationCollected = { ...legacy.qualificationState };
  mem.companySize = legacy.companySize;
  mem.industry = legacy.industry;
  mem.useCase = legacy.useCase;
  mem.monthlyConversations = legacy.monthlyConversations;
  mem.currentHelpdesk = legacy.currentHelpdesk;
  mem.budget = legacy.budget;
  mem.decisionTimeline = legacy.decisionTimeline;

  const stageMap: Record<FunnelStage, FunnelStageExtended> = {
    greeting: 'greeting',
    discovery: 'awareness',
    interest: 'interest',
    evaluation: 'evaluation',
    objection: 'evaluation',
    purchase_intent: 'purchase_intent',
    customer: 'customer',
    support: 'support',
  };
  mem.funnelStage = stageMap[legacy.funnelStage] || 'awareness';

  for (const t of legacy.turns) {
    mem.turns.push({
      turnNumber: mem.turns.length + 1,
      message: t.message,
      response: t.response,
      customerIntent: 'unknown',
      goal: 'none',
      funnelStage: mem.funnelStage,
      timestamp: t.timestamp,
    });
  }

  for (const topic of legacy.topics) {
    const existing = mem.topicsExplained.find(e => e.topic === topic);
    if (existing) {
      existing.count++;
    } else {
      mem.topicsExplained.push({ topic: topic as DiscernedTopic, explainedAtTurn: mem.turnCount, count: 1, phase: 'explaining' });
    }
  }

  if (legacy.topics.length > 0) {
    mem.currentTopic = legacy.topics[legacy.topics.length - 1] as DiscernedTopic;
  }

  return mem;
}

function addUnique(items: string[], value?: string): string[] {
  if (!value) return items;
  const cleaned = value.trim();
  if (!cleaned) return items;
  if (!items.includes(cleaned)) items.push(cleaned);
  return items;
}

export function extractSalesSignals(message: string, existing?: Partial<SalesSignals>): SalesSignals {
  const lower = message.toLowerCase();
  const signals = {
    objections: [...(existing?.objections || [])],
    competitors: [...(existing?.competitors || [])],
    integrations: [...(existing?.integrations || [])],
    painPoints: [...(existing?.painPoints || [])],
    trustIssues: [...(existing?.trustIssues || [])],
    ctaRejections: [...(existing?.ctaRejections || [])],
    urgencySignals: [...(existing?.urgencySignals || [])],
    authoritySignals: [...(existing?.authoritySignals || [])],
    timelineSignals: [...(existing?.timelineSignals || [])],
    budget: existing?.budget,
    deadline: existing?.deadline,
  } as SalesSignals;

  if (/expensive|too costly|budget|price|cost|cheap|affordable/i.test(lower)) {
    addUnique(signals.objections, 'price');
    if (!signals.budget) signals.budget = 'budget-sensitive';
  }
  if (/security|privacy|compliance|soc 2|soc2|hipaa|gdpr|safe|trust|hallucination|data leak/i.test(lower)) {
    addUnique(signals.objections, 'security');
    addUnique(signals.trustIssues, 'security and trust');
  }
  if (/setup|deploy|install|complex|coding|developer|engineer|hard to/i.test(lower)) {
    addUnique(signals.objections, 'setup');
    addUnique(signals.painPoints, 'implementation effort');
  }
  if (/intercom|zendesk|gorgias|chatgpt|salesforce|hubspot|clio|mycase|competitor|alternative|vs /i.test(lower)) {
    addUnique(signals.competitors, 'competing solution');
    addUnique(signals.painPoints, 'comparison shopping');
  }
  if (/shopify|slack|salesforce|hubspot|zendesk|intercom|clio|mycase|jira|okta|azure/i.test(lower)) {
    addUnique(signals.integrations, 'existing workflow');
  }
  if (/before|by q|by next|deadline|asap|urgent|this week|this month|tomorrow|quarter end|end of month/i.test(lower)) {
    addUnique(signals.urgencySignals, 'timeline pressure');
    if (!signals.deadline) signals.deadline = 'timeline-sensitive';
  }
  if (/founder|ceo|cto|director|manager|ops|it manager|team lead|owner/i.test(lower)) {
    addUnique(signals.authoritySignals, 'decision-maker');
  }
  if (/need|want|looking for|trying to|hoping to/i.test(lower)) {
    addUnique(signals.painPoints, 'business need');
  }
  if (/trial|demo|book|sign up|buy|start/i.test(lower)) {
    addUnique(signals.timelineSignals, 'decision step');
  }

  return signals;
}

export function upsertQualificationField(memory: ConversationMemoryData, key: string, value?: string, confidence: number = 0.5, turn?: number): void {
  if (!memory.qualificationFields) memory.qualificationFields = {};
  const existing = memory.qualificationFields[key];
  const t = turn ?? memory.turnCount;
  if (!existing) {
    memory.qualificationFields[key] = { value, confidence: Math.max(0, Math.min(1, confidence)), lastUpdatedTurn: t };
  } else {
    // merge confidence conservatively
    const mergedConfidence = Math.max(existing.confidence, Math.min(1, confidence));
    memory.qualificationFields[key] = { value: value ?? existing.value, confidence: mergedConfidence, lastUpdatedTurn: t };
  }
}

export function getQualificationConfidence(memory: ConversationMemoryData, key: string): number {
  if (!memory.qualificationFields || !memory.qualificationFields[key]) return 0;
  return memory.qualificationFields[key].confidence;
}

export function recordObjectionMemory(memory: ConversationMemoryData, category: string, text?: string): void {
  if (!memory.salesSignals) memory.salesSignals = extractSalesSignals('');
  addUnique(memory.salesSignals.objections, category);
  if (text) addUnique(memory.salesSignals.painPoints, text);
}

export function recordAuthoritySignal(memory: ConversationMemoryData, who: string): void {
  if (!memory.salesSignals) memory.salesSignals = extractSalesSignals('');
  addUnique(memory.salesSignals.authoritySignals, who);
}

export function markQuestionAnswered(memory: ConversationMemoryData, question: string): void {
  if (!question) return;
  if (!memory.questionsAnswered) memory.questionsAnswered = [];
  addUnique(memory.questionsAnswered, question);
}

export function shouldAskQualificationMemory(memory: ConversationMemoryData, key: string, minConfidence = 0.6): boolean {
  // Never ask if already answered or confidence is sufficient
  if (memory.questionsAnswered && memory.questionsAnswered.includes(key)) return false;
  const conf = getQualificationConfidence(memory, key);
  if (conf >= minConfidence) return false;
  // require at least two non-greeting turns before asking for qualification
  if (memory.turnCount < 2) return false;
  // suppress if there are pending unanswered questions
  if (memory.turns && memory.turns.slice(-2).some(t => /\?$/.test(t.message.trim()))) return false;
  return true;
}

export function updateTrust(memory: ConversationMemoryData, trust: 'low'|'medium'|'high', reason?: string): void {
  if (!memory.trustHistory) memory.trustHistory = [];
  memory.trustHistory.push({ turn: memory.turnCount, trust, reason });
  memory.trustLevel = trust;
}

export function discernTopics(message: string): DiscernedTopic[] {
  const lower = message.toLowerCase();
  const topics: DiscernedTopic[] = [];
  const featureSignal = /\b(feature|features|capabilit|functionality|what can you do|what does it do|what do you offer|product capabilities|product features)\b/i;
  const productContext = /\b(product|platform|tool|solution)\b/i;
  if (featureSignal.test(lower) || (productContext.test(lower) && /\b(offer|capabilit|feature|functionality|what can|what does|what do you offer)\b/i.test(lower))) topics.push('features');
  if (/(price|pricing|cost|plan|tier|how much|subscription|overage)/i.test(lower)) topics.push('pricing');
  if (/(integrat|zendesk|intercom|slack|shopify|woocommerce|magento|shop|cart|widget|embed|connect|plugin|connect)/i.test(lower)) topics.push('integrations');
  if (/(security|compliance|soc2|soc 2|gdpr|hipaa|encrypt|data.privacy|data.residency)/i.test(lower)) topics.push('security');
  if (/(api|sdk|developer|dev|code|webhook|rest|endpoint|docs?)/i.test(lower)) topics.push('api');
  if (/(demo|trial|free|\btry\b|sandbox)/i.test(lower)) topics.push('trial');
  if (/(compare|comparison|vs |versus|competitor|alternative|difference|better than|better|stronger|faster|easier|more accurate|more grounded|setup speed|outperform|generic ai|generic tools)/i.test(lower)) topics.push('comparison');
  if (/(walkthrough|how.*work|pipeline|architecture|technical.*overview|under the hood)/i.test(lower)) topics.push('walkthrough');
  if (/(roi|revenue|save money|payback|cost.saving|deflection.*rate)/i.test(lower)) topics.push('roi');
  if (/(soc|soc2|soc 2|audit)/i.test(lower)) topics.push('soc2');
  if (/(sso|saml|okta|active directory|azure ad)/i.test(lower)) topics.push('sso');
  if (/(setup|onboard|deploy|install|getting started|10 minute)/i.test(lower)) topics.push('onboarding');
  if (/(developer|dev|engineering|code|build)/i.test(lower)) topics.push('developer');
  return topics;
}

export function isTopicExplained(memory: ConversationMemoryData, topic: DiscernedTopic): boolean {
  return memory.topicsExplained.some(t => t.topic === topic);
}

export function markTopicExplained(memory: ConversationMemoryData, topic: DiscernedTopic): void {
  const existing = memory.topicsExplained.find(t => t.topic === topic);
  if (existing) {
    existing.count++;
    if (existing.phase === 'mentioned') existing.phase = 'explaining';
  } else {
    memory.topicsExplained.push({ topic, explainedAtTurn: memory.turnCount, count: 1, phase: 'explaining' });
  }
}

export function markTopicCompleted(memory: ConversationMemoryData, topic: DiscernedTopic): void {
  const existing = memory.topicsExplained.find(t => t.topic === topic);
  if (existing) {
    existing.phase = 'completed';
  } else {
    memory.topicsExplained.push({ topic, explainedAtTurn: memory.turnCount, count: 1, phase: 'completed' });
  }
}

export function markTopicReferenced(memory: ConversationMemoryData, topic: DiscernedTopic): void {
  const existing = memory.topicsExplained.find(t => t.topic === topic);
  if (existing && existing.phase === 'completed') {
    existing.count++;
  }
}

export function isTopicCompleted(memory: ConversationMemoryData, topic: DiscernedTopic): boolean {
  return memory.topicsExplained.some(t => t.topic === topic && t.phase === 'completed');
}

export function getCompletedTopics(memory: ConversationMemoryData): DiscernedTopic[] {
  return memory.topicsExplained.filter(t => t.phase === 'completed').map(t => t.topic);
}

export function getExplainingTopics(memory: ConversationMemoryData): DiscernedTopic[] {
  return memory.topicsExplained.filter(t => t.phase === 'explaining').map(t => t.topic);
}

export function isCTARejected(memory: ConversationMemoryData, cta: string): boolean {
  return memory.rejectedCTAs.includes(cta);
}

export function markCTARejected(memory: ConversationMemoryData, cta: string): void {
  if (!memory.rejectedCTAs.includes(cta)) {
    memory.rejectedCTAs.push(cta);
  }
}

export function markCTAAccepted(memory: ConversationMemoryData, cta: string): void {
  const record = memory.ctasShown.find(c => c.cta === cta);
  if (record) {
    record.accepted = true;
  } else {
    memory.ctasShown.push({ cta, label: cta, turnNumber: memory.turnCount, accepted: true, rejected: false });
  }
}

export function isGoalAchieved(memory: ConversationMemoryData, goal: ConversationGoal): boolean {
  return memory.goalsAchieved.includes(goal);
}
