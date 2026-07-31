import { PersonaType, FunnelStage, ObjectionCategory, QualificationState, ConversationStage, BuyerRole, Temperature } from './types';
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

export interface CTARecord {
  cta: string;
  label: string;
  turnNumber: number;
  accepted: boolean;
  rejected: boolean;
}

export interface ButtonHistoryRecord {
  buttonId: string;
  label: string;
  category?: string;
  score: number;
  turnNumber: number;
  shownAt: number;
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

export interface ConversationMemoryData {
  persona: PersonaType;
  industry?: string;
  companySize?: string;
  /** @reserved — declared for future qualification extraction; not yet populated by any engine path */
  useCase?: string;
  monthlyConversations?: string;
  /** @reserved — declared for future qualification extraction; not yet populated by any engine path */
  currentHelpdesk?: string;
  /** @reserved — declared for future qualification extraction; not yet populated by any engine path */
  budget?: string;
  /** @reserved — declared for future qualification extraction; not yet populated by any engine path */
  decisionTimeline?: string;

  turnCount: number;
  funnelStage: FunnelStageExtended;

  topicsExplained: TopicRecord[];
  topicsAvoided: string[];
  questionsAnswered: string[];

  qualificationCollected: QualificationState;

  objectionsHandled: ObjectionCategory[];

  ctasShown: CTARecord[];
  buttonsShown: ButtonHistoryRecord[];
  buttonClicks: string[];

  buyingIntentDetected: boolean;
  buyingIntentPhrase?: string;
  buyingIntentTier?: string;
  recommendedPlan?: string;

  trustLevel: 'low' | 'medium' | 'high';
  sentiment: SentimentSnapshot;
  leadScore: number;
  conversationScore: number;
  abandonmentRisk: 'low' | 'medium' | 'high';

  lastCta?: string;
  lastResponseText?: string;
  lastGoal?: ConversationGoal;

  turns: TurnRecord[];

  goalsAchieved: ConversationGoal[];

  isLeaving: boolean;
  isAbandoned: boolean;
  isCompleted: boolean;

  rejectedCTAs: string[];

  usedOpenings: string[];
  currentTopic?: DiscernedTopic;
  currentStage?: ConversationStage;
  buyerRole?: BuyerRole;
  customerTemperature?: Temperature;
  lastOffTopicRedirect?: string;
  contextSummary: ContextSummaryData;
  contextSummaryTurn: number;
  buttonRejections: string[];
  buttonAcceptances: string[];
}

export function createMemory(data?: Partial<ConversationMemoryData>): ConversationMemoryData {
  return {
    persona: 'unknown',
    turnCount: 0,
    funnelStage: 'greeting',
    topicsExplained: [],
    topicsAvoided: [],
    questionsAnswered: [],
    qualificationCollected: { questionsAskedCount: 0, completed: false },
    objectionsHandled: [],
    ctasShown: [],
    buttonsShown: [],
    buttonClicks: [],
    buyingIntentDetected: false,
    trustLevel: 'medium',
    sentiment: { polarity: 0, frustration: 'low', urgency: 'low', trend: 'stable' },
    leadScore: 0,
    conversationScore: 0,
    abandonmentRisk: 'low',
    turns: [],
    goalsAchieved: [],
    isLeaving: false,
    isAbandoned: false,
    isCompleted: false,
    rejectedCTAs: [],
    usedOpenings: [],
    buttonRejections: [],
    buttonAcceptances: [],
    currentStage: 'greeting',
    buyerRole: 'unknown',
    customerTemperature: 'cold',
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
  mem.currentStage = (legacy as any).currentStage ?? 'greeting';
  mem.buyerRole = (legacy as any).buyerRole ?? 'unknown';
  mem.customerTemperature = (legacy as any).customerTemperature ?? 'cold';
  mem.buttonRejections = (legacy as any).buttonRejections ?? [];
  mem.buttonAcceptances = (legacy as any).buttonAcceptances ?? [];

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

export function discernTopics(message: string): DiscernedTopic[] {
  const lower = message.toLowerCase();
  const topics: DiscernedTopic[] = [];
  if (/(feature|capabilit|what do you do|what can|what does|product|platform|functionality)/i.test(lower)) topics.push('features');
  if (/(price|pricing|cost|plan|tier|how much|subscription|overage|expensive)/i.test(lower)) topics.push('pricing');
  if (/(integrat|zendesk|intercom|slack|widget|embed|connect|plugin|shopify|woocommerce|magento|bigcommerce|ecommerce)/i.test(lower)) topics.push('integrations');
  if (/(security|compliance|soc2|soc 2|gdpr|hipaa|encrypt|data.privacy|data.residency)/i.test(lower)) topics.push('security');
  if (/(api|sdk|developer|dev|code|webhook|rest|endpoint)/i.test(lower)) topics.push('api');
  if (/(demo|trial|free|try|get.started|sandbox)/i.test(lower)) topics.push('trial');
  if (/(compare|vs |versus|competitor|alternative|difference|better.than|vs)/i.test(lower)) topics.push('comparison');
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
