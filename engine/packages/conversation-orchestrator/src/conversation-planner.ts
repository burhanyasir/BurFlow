import {
  ConversationMemoryData,
  CustomerIntent,
  ConversationGoal,
  FunnelStageExtended,
  DiscernedTopic,
  discernTopics,
  isTopicExplained,
  isGoalAchieved,
  extractSalesSignals,
} from './conversation-memory';
import { ConversationStage, BuyerRole } from './types';
import { ConversationIntelligenceResult } from './conversation-intelligence-types';
import { FunnelStage } from './types';

export { CustomerIntent, ConversationGoal, DiscernedTopic, FunnelStageExtended };
import {
  GREETING_PATTERNS,
  FAREWELL_PATTERNS,
  SMALL_TALK_PATTERNS,
  GRATITUDE_PATTERNS,
  OBJECTION_PATTERNS,
} from './patterns';
import { detectIndustry } from './conversation-personality';

export interface ActionScore {
  action: string;
  ev: number; // expected value (conversion-weighted)
  trustGain: number; // expected trust delta
  qualGain: number; // expected qualification delta
  abandonRisk: number; // 0..1
}

export interface ConversationPlan {
  customerIntent: CustomerIntent;
  funnelStage: FunnelStageExtended;
  conversationStage: ConversationStage;
  buyerRole: BuyerRole;
  goal: ConversationGoal;
  topicsToDiscuss: DiscernedTopic[];
  missingQualification: string[];
  constraints: {
    avoidTopics: DiscernedTopic[];
    avoidCTAs: string[];
    useTrustSignal: boolean;
    tone: 'casual' | 'professional' | 'empathic' | 'urgent';
  };
  // optional probability-driven action scores to inform the Director/Brain
  actionScores?: ActionScore[];
}

const LEARNING_PATTERNS = /\b(what (is|are|does|do|can|features)|how (does|do|can|is)|tell me about|explain|i.d like to know|curious about|can you.*tell)\b/i;
const COMPARING_PATTERNS = /\b(compare|vs |versus|alternative|competitor|difference|better than|cheaper|differentiate|why choose|how.*different|what sets)\b/i;
const EVALUATING_PATTERNS = /\b(pric(?:e|ing|es)|cost|plan|tier|how much|subscription|feature|capabilit|demo|trial|free)\b/i;
const BUYING_PATTERNS = /\b(buy|purchase|sign up|subscribe|get started|start\s+(a\s+|the\s+|my\s+|your\s+|our\s+|free\s+)?trial|free\s+trial|ready to buy|sign me up|book demo|buy now|take my money|let'?s do( it)?$|how do i start|where do i begin|want\s+.*trial)\b/i;
const IMPLEMENTATION_PATTERNS = /\b(setup|install|deploy|migrate|integration|how long|time to|onboard|configure|connect)\b/i;
const LEAVING_PATTERNS = /\b(think about it|maybe later|not now|not interested|leave|stop|unsubscribe|call me later|get back to me|still thinking|will let you know|i.m done|i.m leaving|talk later|catch you later)\b/i;
const CONFIRMING_PATTERNS = /\b(yes|yeah|sure|ok|okay|correct|right|exactly|that.s right|i agree|makes sense|got it|i see)\b/i;
const REJECTING_PATTERNS = /\b(no|nah|nope|not really|not what|don.t think|won.t work|doesn.t fit|not for me|no thanks)\b/i;
const ROLE_PATTERNS: Record<BuyerRole, RegExp> = {
  ceo: /\b(ceo|chief executive|founder|co-founder|owner|president)\b/i,
  manager: /\b(manager|director|head of|lead|team lead|supervisor)\b/i,
  developer: /\b(developer|engineer|programmer|software engineer|dev)\b/i,
  sales: /\b(sales|account executive|ae|business development|bdm|sales rep)\b/i,
  support: /\b(support|customer success|cs|help desk|service)\b/i,
  healthcare: /\b(healthcare|medical|clinic|hospital|health care)\b/i,
  retail: /\b(retail|ecommerce|e-commerce|store|shop)\b/i,
  agency: /\b(agency|consulting|consultant|creative firm|marketing firm)\b/i,
  enterprise: /\b(enterprise|corporate|global|large company|forty|hundreds|thousands)\b/i,
  small_business: /\b(small business|startup|small company|mom and pop|micro business)\b/i,
  unknown: /^(?!.*$).*$/i,
};
const REALLY_PATTERNS = /\breally\b/i;
const WHO_MADE_PATTERNS = /(who (made|created|built) you|who are you|where.*from)/i;

const BUYING_SIGNAL_REGEX = /\b(buy|purchase|sign up|subscribe|get started|start\s+(a\s+|the\s+|my\s+|your\s+|our\s+|free\s+)?trial|free\s+trial|try it|ready to buy|sign me up|book demo|buy now|take my money|let'?s do( it)?$|how do i start|where do i begin|want\s+.*trial)\b/i;
const PRICING_SIGNAL_REGEX = /\b(pric(?:e|ing|es)|cost|how much|what (do|does) (you|it) (cost|charge))\b/i;
const DEMO_SIGNAL_REGEX = /\b(book|schedule|set up) (a |the |)(demo|calls?|meeting|appointment)\b/i;
const BARE_BOOKING_INTENT_REGEX = /\b(i('d| would)? like to|want to|let'?s|can we|shall we|could we) (book|schedule|set up|arrange|plan|organize)\b/i;
const GROWTH_SIGNAL_REGEX = /\b(enterprise|upgrade|scale|grow)\b/i;
const COMMITMENT_SIGNAL_REGEX = /\b(moving forward|ready to|let'?s go)\b/i;
const PROCUREMENT_SIGNAL_REGEX = /\b(proposal|quote|contract|agreement|order)\b/i;
const COMPARISON_SIGNAL_REGEX = /\b(compare|competitor|alternative|versus|vs)\b/i;
const VALUE_SIGNAL_REGEX = /\b(reduce (ticket|support|cost)|improve (response|satisfaction|csat))\b/i;

const SIGNAL_REGEXES = [
  BUYING_SIGNAL_REGEX, PRICING_SIGNAL_REGEX, DEMO_SIGNAL_REGEX, BARE_BOOKING_INTENT_REGEX,
  GROWTH_SIGNAL_REGEX, COMMITMENT_SIGNAL_REGEX, PROCUREMENT_SIGNAL_REGEX,
  COMPARISON_SIGNAL_REGEX, VALUE_SIGNAL_REGEX,
];
const NEGATION_WORDS = /\b(?:not|no|never)\b|n't\b/i;
const NEGATION_OVERRIDE = /\b(?:why\s+(?:not|n't)|what.*n't|how about|how does)\b/i;
const NEGATION_IDIOMS = /\bno (problem|rush|worries|doubt|worry|need to|stress|big deal)\b/i;

function isNegatedBefore(text: string, signalStart: number): boolean {
  if (signalStart <= 0) return false;
  const before = text.slice(Math.max(0, signalStart - 40), signalStart);
  if (NEGATION_OVERRIDE.test(before)) return false;
  if (NEGATION_IDIOMS.test(before)) return false;
  return NEGATION_WORDS.test(before);
}

function detectBuyingIntent(text: string): boolean {
  const re = new RegExp(BUYING_PATTERNS.source, 'gi');
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (!isNegatedBefore(text, match.index)) return true;
  }
  return false;
}

export function detectBuyingSignal(message: string): boolean {
  const lower = message.toLowerCase().trim();
  if (!lower) return false;
  for (const regex of SIGNAL_REGEXES) {
    const re = new RegExp(regex.source, 'gi');
    let match: RegExpExecArray | null;
    while ((match = re.exec(lower)) !== null) {
      if (!isNegatedBefore(lower, match.index)) return true;
    }
  }
  return false;
}

const QUALIFICATION_QUESTIONS: Array<{ key: keyof ConversationMemoryData; question: string; priority: number }> = [
  { key: 'companySize', question: 'company size', priority: 1 },
  { key: 'industry', question: 'industry', priority: 2 },
  { key: 'useCase', question: 'use case', priority: 3 },
  { key: 'monthlyConversations', question: 'monthly conversations', priority: 4 },
  { key: 'currentHelpdesk', question: 'current helpdesk', priority: 5 },
  { key: 'budget', question: 'budget', priority: 6 },
  { key: 'decisionTimeline', question: 'decision timeline', priority: 7 },
];

const QUALIFICATION_MARKERS: Record<string, (mem: ConversationMemoryData) => boolean> = {
  'company size': (mem) => !!mem.companySize,
  'industry': (mem) => !!mem.industry,
  'use case': (mem) => !!mem.useCase,
  'monthly conversations': (mem) => !!mem.monthlyConversations || !!mem.qualificationCollected.monthlyConversations,
  'current helpdesk': (mem) => !!mem.currentHelpdesk,
  'budget': (mem) => !!mem.budget,
  'decision timeline': (mem) => !!mem.decisionTimeline,
};

function detectBuyerRole(message: string, memory: ConversationMemoryData): BuyerRole {
  const lower = message.toLowerCase();
  for (const role of Object.keys(ROLE_PATTERNS) as BuyerRole[]) {
    if (role === 'unknown') continue;
    if (ROLE_PATTERNS[role].test(lower) || memory.buyerRole === role) {
      return role;
    }
  }
  return memory.buyerRole || 'unknown';
}

function detectConversationStage(message: string, memory: ConversationMemoryData, ciResult: ConversationIntelligenceResult): ConversationStage {
  const lower = message.toLowerCase().trim();
  if (FAREWELL_PATTERNS.test(lower)) return 'decision';
  if (ciResult.escalation?.shouldEscalate || /\b(manager|human agent|agent|supervisor|hand over|escalate)\b/i.test(lower)) return 'escalation';
  if (ciResult.objection.isObjection || OBJECTION_PATTERNS.test(lower)) return 'objection';
  if (COMPARING_PATTERNS.test(lower)) return 'comparison';
  if (BUYING_PATTERNS.test(lower)) return 'pricing';
  if (EVALUATING_PATTERNS.test(lower)) return 'pricing';
  if (IMPLEMENTATION_PATTERNS.test(lower)) return 'support';
  if (LEARNING_PATTERNS.test(lower)) return 'education';
  if (GREETING_PATTERNS.test(lower) || memory.turnCount === 0) return 'greeting';
  if (SMALL_TALK_PATTERNS.test(lower)) return 'discovery';
  if (memory.funnelStage === 'customer' || memory.isCustomer) return 'post_purchase';
  if (memory.isLeaving || LEAVING_PATTERNS.test(lower)) return 'decision';
  return memory.currentStage || 'discovery';
}

function detectCustomerIntent(message: string, memory: ConversationMemoryData, ciResult: ConversationIntelligenceResult): CustomerIntent {
  const lower = message.toLowerCase().trim();
  const trimmedMsg = message.trim();

  if (!lower) return 'unknown';
  if (WHO_MADE_PATTERNS.test(lower)) return 'learning';
  if (FAREWELL_PATTERNS.test(lower)) return 'leaving';
  if (LEAVING_PATTERNS.test(lower)) return 'leaving';
  if (SMALL_TALK_PATTERNS.test(lower) && trimmedMsg.length < 40) return 'small_talk';
  if (GREETING_PATTERNS.test(lower)) return 'greeting';
  if (GRATITUDE_PATTERNS.test(lower)) return 'confirming';
  if (COMPARING_PATTERNS.test(lower)) return 'comparing';
  if (detectBuyingIntent(lower)) return 'buying';
  if (ciResult.objection.isObjection || OBJECTION_PATTERNS.test(lower)) return 'objection';
  if (REALLY_PATTERNS.test(lower) && memory.turnCount > 0) return 'objection';
  if (IMPLEMENTATION_PATTERNS.test(lower) && memory.turnCount > 1) return 'implementation';
  if (EVALUATING_PATTERNS.test(lower)) return 'evaluating';
  if (LEARNING_PATTERNS.test(lower) && memory.turnCount <= 2) return 'learning';
  if (CONFIRMING_PATTERNS.test(lower) && memory.turnCount > 0) return 'confirming';
  if (REJECTING_PATTERNS.test(lower) && memory.turnCount > 0) return 'rejecting';
  if (EVALUATING_PATTERNS.test(lower)) return 'evaluating';
  if (/\bwhy\b/i.test(lower) && memory.turnCount > 1) return 'comparing';
  if (LEARNING_PATTERNS.test(lower)) return 'learning';

  return 'unknown';
}

function mapFunnelStage(ciStage: FunnelStage, stage: FunnelStageExtended): FunnelStageExtended {
  const mapping: Record<FunnelStage, FunnelStageExtended> = {
    greeting: 'greeting',
    discovery: 'awareness',
    interest: 'interest',
    evaluation: 'evaluation',
    objection: 'evaluation',
    purchase_intent: 'purchase_intent',
    customer: 'customer',
    support: 'support',
  };
  const mapped = mapping[ciStage];
  if (!mapped) return stage;

  const order: FunnelStageExtended[] = ['greeting', 'awareness', 'interest', 'consideration', 'evaluation', 'purchase_intent', 'decision', 'customer', 'support'];
  const mappedIdx = order.indexOf(mapped);
  const currentIdx = order.indexOf(stage);
  if (mappedIdx > currentIdx) return mapped;
  return stage;
}

function detectFunnelStageExtended(
  message: string,
  memory: ConversationMemoryData,
  ciResult: ConversationIntelligenceResult,
): FunnelStageExtended {
  const lower = message.toLowerCase().trim();

  if (FAREWELL_PATTERNS.test(lower)) return 'decision';
  if (GREETING_PATTERNS.test(lower)) return 'greeting';
  if (memory.turnCount === 0) return 'greeting';

  const ciStage = ciResult.funnelStage || 'discovery';
  const mapped = mapFunnelStage(ciStage, memory.funnelStage);

  const order: FunnelStageExtended[] = ['greeting', 'awareness', 'interest', 'consideration', 'evaluation', 'purchase_intent', 'decision', 'customer', 'support'];
  const currentIdx = order.indexOf(mapped);
  if (currentIdx < order.indexOf('evaluation')) {
    if (COMPARING_PATTERNS.test(lower) || EVALUATING_PATTERNS.test(lower) || BUYING_PATTERNS.test(lower)) {
      if (memory.turnCount >= 3) return 'evaluation';
      return 'consideration';
    }
  }
  if (memory.turnCount >= 5 && currentIdx < order.indexOf('evaluation')) return 'evaluation';

  return mapped;
}

function hasEnoughContextForRecommendation(memory: ConversationMemoryData): boolean {
  const hasSize = !!memory.companySize;
  const hasIndustry = !!memory.industry;
  const hasVolume = !!memory.monthlyConversations || !!memory.qualificationCollected.monthlyConversations;
  const hasHelpdesk = !!memory.currentHelpdesk;
  const hasUseCase = !!memory.useCase;
  // Need at least 3 data points before recommending a specific plan
  return hasSize && hasIndustry && (hasVolume || hasHelpdesk || hasUseCase);
}

function findMissingQualification(memory: ConversationMemoryData): string[] {
  if (memory.qualificationCollected.completed) return [];
  const missing: string[] = [];
  const askedCount = memory.qualificationCollected.questionsAskedCount;

  for (const q of QUALIFICATION_QUESTIONS) {
    const checker = QUALIFICATION_MARKERS[q.question];
    if (checker && !checker(memory)) {
      missing.push(q.question);
    }
  }

  if (missing.length === 0) return [];

  const maxToAsk = Math.max(0, 1 - Math.floor(askedCount / 3));
  return missing.slice(0, Math.max(1, maxToAsk));
}

function countRecentGoal(memory: ConversationMemoryData, goal: ConversationGoal, window: number = 5): number {
  return memory.turns.slice(-window).filter(t => t.goal === goal).length;
}

function isRepeatedGoal(memory: ConversationMemoryData, goal: ConversationGoal, threshold: number): boolean {
  return memory.lastGoal === goal && (memory.lastGoalStreak ?? 0) >= threshold;
}

function chooseGoal(
  customerIntent: CustomerIntent,
  funnelStage: FunnelStageExtended,
  memory: ConversationMemoryData,
  ciResult: ConversationIntelligenceResult,
): ConversationGoal {
  if (memory.isLeaving || customerIntent === 'leaving') return 'finish_conversation';
  if (memory.isAbandoned) return 'recover_abandonment';

  if (customerIntent === 'buying') {
    if (memory.qualificationCollected.completed || memory.turnCount >= 5) {
      return 'close_trial';
    }
    return 'recommend_plan';
  }

  const hasSalesObjection = ciResult.objection.isObjection || memory.salesSignals.objections.length > 0 || memory.salesSignals.trustIssues.length > 0;
  if (hasSalesObjection) {
    if (isGoalAchieved(memory, 'handle_objection')) {
      return memory.trustLevel === 'low' ? 'build_trust' : 'advance_funnel';
    }
    return 'handle_objection';
  }

  if (customerIntent === 'small_talk' || customerIntent === 'greeting') {
    if (memory.turnCount === 0) return 'build_trust';
    if (isGoalAchieved(memory, 'build_trust')) return 'advance_funnel';
    return 'build_trust';
  }

  if (customerIntent === 'learning') {
    if (memory.turnCount <= 2) return 'answer_question';
    if (isGoalAchieved(memory, 'answer_question') && memory.qualificationCollected.completed) return 'advance_funnel';
    if (isGoalAchieved(memory, 'answer_question')) {
      if (isRepeatedGoal(memory, 'qualify', 2)) {
        return 'advance_funnel';
      }
      return 'qualify';
    }
    return 'answer_question';
  }

  if (customerIntent === 'comparing' || customerIntent === 'evaluating') {
    if (funnelStage === 'evaluation' || funnelStage === 'purchase_intent') {
      const qualCompleted = memory.qualificationCollected.completed;
      if (qualCompleted && hasEnoughContextForRecommendation(memory)) {
        return 'recommend_plan';
      }
      if (qualCompleted) return 'advance_funnel';
      if (isRepeatedGoal(memory, 'qualify', 2)) {
        return 'advance_funnel';
      }
      return 'qualify';
    }
  }

  if (customerIntent === 'implementation') {
    return isGoalAchieved(memory, 'answer_question') ? 'advance_funnel' : 'answer_question';
  }

  if (customerIntent === 'confirming') {
    if (memory.turnCount >= 3 && funnelStage === 'evaluation') {
      if (isRepeatedGoal(memory, 'qualify', 2)) return 'close_trial';
      return memory.qualificationCollected.completed || memory.salesSignals.timelineSignals.length > 0 ? 'close_trial' : 'qualify';
    }
    return 'advance_funnel';
  }

  if (customerIntent === 'rejecting') {
    return 'handle_objection';
  }

  if (funnelStage === 'decision') return 'finish_conversation';
  if (funnelStage === 'purchase_intent') {
    if (memory.qualificationCollected.completed) return 'close_trial';
    if (isRepeatedGoal(memory, 'qualify', 2)) return 'advance_funnel';
    return 'qualify';
  }

  if (memory.turnCount >= 3 && !memory.qualificationCollected.completed) {
    if (isRepeatedGoal(memory, 'qualify', 2)) {
      return 'advance_funnel';
    }
    return 'qualify';
  }

  if (memory.turnCount >= 5) {
    return 'advance_funnel';
  }

  return 'answer_question';
}

function determineTone(customerIntent: CustomerIntent, sentiment: ConversationIntelligenceResult['sentiment']): 'casual' | 'professional' | 'empathic' | 'urgent' {
  if (sentiment.frustration === 'high' || sentiment.polarity < -0.3) return 'empathic';
  if (sentiment.urgency === 'high') return 'urgent';
  if (customerIntent === 'comparing' || customerIntent === 'evaluating') return 'professional';
  return 'casual';
}

function findTopMissingUnasked(memory: ConversationMemoryData): DiscernedTopic[] {
  const allTopics: DiscernedTopic[] = ['features', 'pricing', 'security', 'integrations', 'api', 'roi', 'demo', 'trial', 'comparison'];
  return allTopics.filter(t => !isTopicExplained(memory, t));
}

function inferQualificationSignals(message: string, memory: ConversationMemoryData): void {
  const lower = message.toLowerCase();
  const detectedIndustry = detectIndustry(message, memory);
  if (detectedIndustry.industry && !memory.industry) {
    memory.industry = detectedIndustry.industry;
  }

  if (!memory.companySize) {
    const teamMatch = lower.match(/(?:team|company|staff|employees?|agents?|reps?)\s+(?:of\s+)?(\d+)/i);
    if (teamMatch) memory.companySize = teamMatch[1];
    else if (/enterprise|large organization|mid-market|small business|startup/i.test(lower)) {
      memory.companySize = /enterprise|large organization/i.test(lower) ? '500+' : '10-50';
    }
  }

  if (!memory.useCase) {
    if (/support|deflect|tickets|customer support|help desk|agent/i.test(lower)) memory.useCase = 'customer support';
    else if (/order|product|returns|shipping|store|shopify|ecommerce/i.test(lower)) memory.useCase = 'ecommerce support';
    else if (/appointment|patient|clinic|healthcare|medical/i.test(lower)) memory.useCase = 'patient support';
    else if (/intake|client|case|legal|law/i.test(lower)) memory.useCase = 'client intake';
  }

  if (!memory.currentHelpdesk) {
    const helpdeskPatterns = [
      { pattern: /zendesk/i, value: 'Zendesk' },
      { pattern: /intercom/i, value: 'Intercom' },
      { pattern: /hubspot/i, value: 'HubSpot' },
      { pattern: /salesforce/i, value: 'Salesforce' },
      { pattern: /slack/i, value: 'Slack' },
      { pattern: /shopify/i, value: 'Shopify' },
      { pattern: /jira/i, value: 'Jira' },
      { pattern: /okta|azure ad|sso/i, value: 'SSO / IAM' },
    ];
    for (const entry of helpdeskPatterns) {
      if (entry.pattern.test(lower)) {
        memory.currentHelpdesk = entry.value;
        break;
      }
    }
  }

  if (!memory.monthlyConversations) {
    const volumeMatch = lower.match(/(\d+)\s*(k|thousand| thousand|million|m)\s*(conversations|tickets|requests|questions)/i)
      || lower.match(/(\d+)\s*(conversations|tickets|requests|questions)\s*(per|a)?\s*(month|monthly)/i)
      || lower.match(/(under|around|about)\s*(\d+)/i);
    if (volumeMatch) {
      const value = volumeMatch[1] || volumeMatch[2] || '';
      memory.monthlyConversations = value ? value.toString() : undefined;
    }
  }

  if (!memory.budget) {
    if (/free trial|under \$|budget|cheap|affordable|costly|expensive|price/i.test(lower)) {
      memory.budget = /expensive|costly|too high|budget/i.test(lower) ? 'budget-sensitive' : 'considering budget';
    }
  }

  if (!memory.decisionTimeline) {
    if (/asap|urgent|today|this week|this month|tomorrow|quarter end|deadline|by next/i.test(lower)) {
      memory.decisionTimeline = 'near-term';
    } else if (/next quarter|later|eventually|soon/i.test(lower)) {
      memory.decisionTimeline = 'medium-term';
    }
  }
}

function computeActionEV(action: string, memory: ConversationMemoryData, ciResult: ConversationIntelligenceResult): ActionScore {
  // Base heuristics mapped to business-value oriented scores.
  // Values are scaled 0..1 internally then scaled for EV.
  const buyIntent = (ciResult.buyingIntent?.confidence ?? 0) || (memory.buyingIntentDetected ? 0.6 : 0);
  const trust = memory.trustLevel === 'high' ? 1 : memory.trustLevel === 'medium' ? 0.6 : 0.2;
  const momentum = memory.momentumScore ?? 0; // -1..1
  const momentumFactor = 1 + Math.max(-0.5, Math.min(0.5, momentum));

  // heuristics for expected conversion uplift and risks
  let convProb = 0.01;
  let trustGain = 0;
  let qualGain = 0;
  let abandonRisk = 0.02;

  switch (action) {
    case 'ask_qualification':
      convProb = 0.02 * (1 + buyIntent);
      trustGain = -0.01; // slight friction
      qualGain = 0.25;
      abandonRisk = 0.05;
      break;
    case 'educate':
      convProb = 0.03 * (0.5 + buyIntent);
      trustGain = 0.05;
      qualGain = 0.05;
      abandonRisk = 0.01;
      break;
    case 'handle_objection':
      convProb = 0.04 * (0.5 + buyIntent);
      trustGain = 0.08;
      qualGain = 0.02;
      abandonRisk = 0.02;
      break;
    case 'show_proof':
      convProb = 0.06 * (0.5 + buyIntent);
      trustGain = 0.12;
      qualGain = 0.02;
      abandonRisk = 0.01;
      break;
    case 'book_demo':
      convProb = 0.2 * (0.5 + buyIntent) * trust;
      trustGain = 0.02;
      qualGain = 0.4;
      abandonRisk = 0.08 * (1 - trust);
      break;
    case 'offer_trial':
      convProb = 0.12 * (0.5 + buyIntent) * (trust >= 0.6 ? 1 : 0.6);
      trustGain = 0.01;
      qualGain = 0.25;
      abandonRisk = 0.06;
      break;
    case 'wait':
      convProb = 0.005 * (0.2 + buyIntent);
      trustGain = 0.01;
      qualGain = 0;
      abandonRisk = 0.0;
      break;
    case 'escalate_to_human':
      convProb = 0.15 * (0.3 + buyIntent);
      trustGain = 0.1;
      qualGain = 0.3;
      abandonRisk = 0.12;
      break;
    default:
      convProb = 0.01;
  }

  const ev = convProb * 100 * momentumFactor; // scale into human-friendly 0..100-ish
  return { action, ev, trustGain, qualGain, abandonRisk };
}

export function planConversation(
  message: string,
  memory: ConversationMemoryData,
  ciResult: ConversationIntelligenceResult,
): ConversationPlan {
  inferQualificationSignals(message, memory);

  const salesSignals = extractSalesSignals(message, memory.salesSignals);
  memory.salesSignals = salesSignals;
  if (salesSignals.objections.length > 0 || salesSignals.trustIssues.length > 0 || salesSignals.urgencySignals.length > 0) {
    memory.buyingIntentDetected = true;
    memory.buyingIntentPhrase = memory.buyingIntentPhrase || 'evaluation signals detected';
  }

  const customerIntent = detectCustomerIntent(message, memory, ciResult);
  const funnelStage = detectFunnelStageExtended(message, memory, ciResult);
  const conversationStage = detectConversationStage(message, memory, ciResult);
  const buyerRole = detectBuyerRole(message, memory);
  const goal = chooseGoal(customerIntent, funnelStage, memory, ciResult);
  const missingQualification = findMissingQualification(memory);
  const newTopics = discernTopics(message);
  const explainedTopics = memory.topicsExplained.map(t => t.topic);

  const topicsToDiscuss = newTopics.filter(t => !explainedTopics.includes(t));
  if (topicsToDiscuss.length === 0 && goal === 'advance_funnel') {
    const unasked = findTopMissingUnasked(memory);
    if (unasked.length > 0) topicsToDiscuss.push(unasked[0]);
  }

  const avoidTopics = memory.topicsAvoided.filter(t => explainedTopics.includes(t as DiscernedTopic)) as DiscernedTopic[];

  const avoidCTAs: string[] = [...memory.rejectedCTAs];
  if (funnelStage === 'decision' || goal === 'finish_conversation') {
    avoidCTAs.push('start_free_trial', 'book_demo');
  }

  const useTrustSignal =
    (ciResult.trustSignal?.shouldInject ?? false) ||
    memory.trustLevel === 'low' ||
    (customerIntent === 'objection' && funnelStage === 'evaluation');

  const tone = determineTone(customerIntent, ciResult.sentiment);

  // Compute action scores for candidate actions using expected value
  const candidateActions = ['ask_qualification', 'educate', 'handle_objection', 'show_proof', 'book_demo', 'offer_trial', 'wait', 'escalate_to_human'];
  const actionScores = candidateActions.map(a => computeActionEV(a, memory, ciResult)).sort((x, y) => y.ev - x.ev);

  return {
    customerIntent,
    funnelStage,
    conversationStage,
    buyerRole,
    goal,
    topicsToDiscuss,
    missingQualification,
    actionScores,
    constraints: {
      avoidTopics,
      avoidCTAs,
      useTrustSignal,
      tone,
    },
  };
}
