import { detectBuyingSignal, OBJECTION_PATTERNS as CANONICAL_OBJECTION_PATTERNS } from '@conversation-engine/conversation-orchestrator';
import { OrchestratorState, Strategy, STRATEGY_PRIORITY, PolicyPriority } from './types';

const QUESTION_PATTERNS = [
  /^what|^how|^why|^when|^where|^who|^which|^can|^could|^would|^will|^do|^does|^did|^is|^are|^has|^have/,
  /\?$/,
  /\b(tell me|explain|describe|show|how does|what is|what are|how can)\b/i,
];

const TRUST_QUESTION_PATTERNS = [
  /\b(secure|security|safe|protect|privacy|data)\b/i,
  /\b(soc2?|soc|hipaa|gdpr|pci|iso)\b/i,
  /\b(encrypt|tls|aes|certif|audit|complian)\b/i,
  /\b(can i|can we) trust/i,
  /\b(how do you|how does) (protect|secure|handle) (my |our |)data/i,
  /\b(where is|where are) (my|our) (data|information) stored/i,
];

const ACTION_PATTERNS = [
  /\b(reset|change|update) (password|email|setting)\b/i,
  /\b(find|track|search) (order|shipment|invoice|product)\b/i,
  /\b(create|open|submit) (ticket|request|case|issue)\b/i,
  /\b(cancel|pause|hold) (subscription|account|plan)\b/i,
];

function isQuestion(message: string): boolean {
  return QUESTION_PATTERNS.some(p => p.test(message.trim()));
}

function detectTrustQuestion(message: string): boolean {
  return TRUST_QUESTION_PATTERNS.some(p => p.test(message));
}

function detectObjection(message: string): boolean {
  return CANONICAL_OBJECTION_PATTERNS.test(message.trim().toLowerCase());
}

function detectActionRequest(message: string): boolean {
  return ACTION_PATTERNS.some(p => p.test(message));
}

function userHasUnansweredQuestion(state: OrchestratorState): boolean {
  return !!state.lastUnansweredQuestion;
}

function userReceivedValue(state: OrchestratorState): boolean {
  if (state.ledger.questionsAnswered.length > 0) return true;
  if (state.ledger.topicsCovered.length > 0) return true;
  if (state.turnCount >= 3) return true;
  return false;
}

function canQualify(state: OrchestratorState, buyingSignalDetected: boolean): boolean {
  const p = state.policy.qualification;
  if (!p.enabled) return false;
  if (!userReceivedValue(state)) return false;
  if (p.requiresBuyingSignal && !buyingSignalDetected) return false;
  if (userHasUnansweredQuestion(state)) return false;
  if (state.trustScore < p.trustThreshold) return false;
  if (state.qualificationAttempts >= p.maxQuestions) return false;
  if (state.turnsSinceLastQualification < p.turnsBetweenQuestions) return false;
  return true;
}

function canShowCTA(state: OrchestratorState, buyingSignalDetected: boolean): boolean {
  const p = state.policy.cta;
  if (!p.enabled) return false;
  if (p.requiresValueFirst && !userReceivedValue(state)) return false;
  if (state.trustScore < p.minimumTrust) return false;
  if (buyingSignalDetected && state.trustScore >= 50) return true;
  if (state.turnCount < 3) return false;
  if (userHasUnansweredQuestion(state)) return false;
  return true;
}

export interface PolicyDecision {
  strategy: Strategy;
  priority: PolicyPriority;
  buyingSignalDetected: boolean;
  canQualify: boolean;
  canShowCTA: boolean;
  detectedTopics: string[];
  detectedUseCase: string | null;
  detectedIndustry: string | null;
}

export function processPolicyEngine(
  message: string,
  state: OrchestratorState,
  rapportResult: { handled: boolean; strategy: Strategy },
): PolicyDecision {
  if (rapportResult.handled) {
    return {
      strategy: rapportResult.strategy,
      priority: 1,
      buyingSignalDetected: false,
      canQualify: false,
      canShowCTA: false,
      detectedTopics: [],
      detectedUseCase: null,
      detectedIndustry: null,
    };
  }

  const buyingSignalDetected = detectBuyingSignal(message);
  if (buyingSignalDetected) {
    state.buyingIntentScore = Math.min(100, state.buyingIntentScore + 25);
  }

  const isTrust = detectTrustQuestion(message);
  const isObj = detectObjection(message);
  const isAct = detectActionRequest(message);
  const isQ = isQuestion(message) || isTrust || isObj;
  const hasUnanswered = userHasUnansweredQuestion(state);

  let strategy: Strategy;
  let priority: PolicyPriority;

  // Priority 1 — answer the literal question
  if (isTrust) {
    strategy = 'trust_building';
    priority = 1;
  } else if (isObj) {
    strategy = 'objection_handling';
    priority = 1;
  } else if (isAct) {
    strategy = 'action_execution';
    priority = 1;
  } else if (isQ) {
    strategy = 'answer';
    priority = 1;
  } else if (hasUnanswered) {
    strategy = 'answer';
    priority = 1;
  }
  // Priority 2 — educate
  else if (state.ledger.topicsCovered.length > 0 && state.turnCount >= 2) {
    strategy = 'educate';
    priority = STRATEGY_PRIORITY.educate;
  }
  // Priority 2 — clarify ambiguous
  else if (message.trim().length < 5 && state.turnCount > 0) {
    strategy = 'clarify';
    priority = STRATEGY_PRIORITY.clarify;
  }
  // Priority 2.5 — booking (when buying signal detected, skip trust-building)
  else if (buyingSignalDetected && state.buyingIntentScore >= 25) {
    strategy = 'booking';
    priority = STRATEGY_PRIORITY.booking;
  }
  // Priority 3 — trust building
  else if (state.trustScore < 30 && state.turnCount > 1) {
    strategy = 'trust_building';
    priority = STRATEGY_PRIORITY.trust_building;
  }
  // Priority 4 — qualify
  else if (canQualify(state, buyingSignalDetected)) {
    strategy = 'qualify';
    priority = STRATEGY_PRIORITY.qualify;
  }
  // Priority 6 — CTA
  else if (canShowCTA(state, buyingSignalDetected)) {
    strategy = 'cta';
    priority = STRATEGY_PRIORITY.cta;
  }
  // Fallback to educate
  else {
    strategy = 'educate';
    priority = STRATEGY_PRIORITY.educate;
  }

  const qualOk = canQualify(state, buyingSignalDetected);
  const ctaOk = canShowCTA(state, buyingSignalDetected);

  const detectedTopics = detectTopics(message);
  const useCase = detectUseCase(message);
  const industry = detectIndustry(message);

  return { strategy, priority, buyingSignalDetected, canQualify: qualOk, canShowCTA: ctaOk, detectedTopics, detectedUseCase: useCase, detectedIndustry: industry };
}

function detectTopics(message: string): string[] {
  const lower = message.toLowerCase();
  const topics: string[] = [];
  if (lower.includes('ticket') || lower.includes('support') || lower.includes('customer service')) topics.push('features');
  if (lower.includes('reduce') || lower.includes('improve') || lower.includes('roi') || lower.includes('save')) topics.push('roi');
  if (lower.includes('price') || lower.includes('cost') || lower.includes('plan') || lower.includes('budget')) topics.push('pricing');
  if (lower.includes('secure') || lower.includes('security') || lower.includes('soc') || lower.includes('compliance') || lower.includes('trust') || lower.includes('hipaa')) topics.push('security');
  if (lower.includes('integrat') || lower.includes('connect') || lower.includes('api') || lower.includes('slack')) topics.push('integrations');
  if (lower.includes('automate') || lower.includes('workflow') || lower.includes('efficiency')) topics.push('features');
  if (lower.includes('walk') || lower.includes('show') || lower.includes('how it works')) topics.push('walkthrough');
  if (topics.length === 0 && detectBuyingSignal(message)) topics.push('features', 'pricing');
  if (topics.length === 0) topics.push('features');
  return topics;
}

function detectUseCase(message: string): string | null {
  const lower = message.toLowerCase();
  if (lower.includes('reduce') && (lower.includes('ticket') || lower.includes('support'))) return 'reduce support tickets';
  if (lower.includes('customer') && (lower.includes('service') || lower.includes('support'))) return 'improve customer service';
  if (lower.includes('response') && (lower.includes('time') || lower.includes('fast') || lower.includes('speed'))) return 'faster response times';
  if (lower.includes('automate') || lower.includes('workflow')) return 'workflow automation';
  if (lower.includes('team') && lower.includes('collaborat')) return 'team collaboration';
  if (lower.includes('analytics') || lower.includes('report') || lower.includes('insight')) return 'analytics and reporting';
  if (lower.includes('chat') || lower.includes('live chat') || lower.includes('messaging')) return 'live chat and messaging';
  if (lower.includes('integrat') || lower.includes('connect')) return 'integration with existing tools';
  if (lower.includes('onboard') || lower.includes('train') || lower.includes('ramp')) return 'onboarding and training';
  return null;
}

function detectIndustry(message: string): string | null {
  const lower = message.toLowerCase();
  if (/\b(ecommerce|shopify|retail|store|product)\b/i.test(lower)) return 'ecommerce';
  if (/\b(saas|software|app|platform|technology|tech)\b/i.test(lower)) return 'technology';
  if (/\b(healthcare|clinic|hospital|medical|health)\b/i.test(lower)) return 'healthcare';
  if (/\b(legal|law|firm|attorney)\b/i.test(lower)) return 'legal';
  if (/\b(restaurant|hospitality|hotel|food)\b/i.test(lower)) return 'hospitality';
  if (/\b(education|school|university|college)\b/i.test(lower)) return 'education';
  if (/\b(finance|banking|insurance|financial)\b/i.test(lower)) return 'finance';
  if (/\b(manufactur|logistics|supply chain)\b/i.test(lower)) return 'manufacturing';
  return null;
}
