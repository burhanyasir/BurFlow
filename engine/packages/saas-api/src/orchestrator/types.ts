export type ConversationStage =
  | 'greeting'
  | 'rapport'
  | 'discovery'
  | 'education'
  | 'evaluation'
  | 'qualification'
  | 'buying_discussion'
  | 'objection_handling'
  | 'closing'
  | 'booking'
  | 'action_execution'
  | 'human_handoff'
  | 'finished';

export type ConversationMood =
  | 'positive'
  | 'neutral'
  | 'confused'
  | 'frustrated'
  | 'skeptical'
  | 'angry'
  | 'hesitant'
  | 'humorous'
  | 'appreciative';

export type Strategy =
  | 'greeting'
  | 'repair_confusion'
  | 'answer'
  | 'educate'
  | 'clarify'
  | 'retrieve_knowledge'
  | 'qualify'
  | 'trust_building'
  | 'objection_handling'
  | 'buying_discussion'
  | 'booking'
  | 'action_execution'
  | 'cta'
  | 'human_handoff'
  | 'close_conversation';

export type PolicyPriority = 1 | 2 | 3 | 4 | 5 | 6;

export const STRATEGY_PRIORITY: Record<Strategy, PolicyPriority> = {
  greeting: 1,
  repair_confusion: 1,
  answer: 1,
  educate: 2,
  clarify: 2,
  retrieve_knowledge: 1,
  trust_building: 3,
  qualify: 4,
  objection_handling: 2,
  buying_discussion: 3,
  booking: 5,
  action_execution: 5,
  cta: 6,
  human_handoff: 6,
  close_conversation: 6,
};

export interface TrustSignals {
  securityQuestionAnswered: boolean;
  industryExpertiseShown: boolean;
  socialProofShown: boolean;
  objectionHandled: boolean;
  valueDemonstrated: boolean;
}

export interface ConversationLedger {
  topicsCovered: string[];
  topicsPending: string[];
  questionsAnswered: string[];
  questionsSkipped: string[];
  trustSignalsShown: string[];
  proofShown: string[];
  featuresExplained: string[];
  pricingDiscussed: boolean;
  integrationsDiscussed: boolean;
  securityDiscussed: boolean;
  objectionsEncountered: string[];
  ctasShown: string[];
}

export interface TenantPolicy {
  qualification: {
    enabled: boolean;
    trustThreshold: number;
    maxQuestions: number;
    requiresBuyingSignal: boolean;
    turnsBetweenQuestions: number;
  };
  cta: {
    enabled: boolean;
    minimumTrust: number;
    requiresValueFirst: boolean;
  };
  smallTalk: {
    enabled: boolean;
  };
  trustBuilding: {
    enabled: boolean;
    requireCtaFree: boolean;
  };
}

export const DEFAULT_TENANT_POLICY: TenantPolicy = {
  qualification: {
    enabled: true,
    trustThreshold: 40,
    maxQuestions: 1,
    requiresBuyingSignal: true,
    turnsBetweenQuestions: 4,
  },
  cta: {
    enabled: true,
    minimumTrust: 60,
    requiresValueFirst: true,
  },
  smallTalk: {
    enabled: true,
  },
  trustBuilding: {
    enabled: true,
    requireCtaFree: true,
  },
};

export interface KnownFacts {
  userName?: string;
  userEmail?: string;
  userRole?: string;
  companyName?: string;
  companySize?: string;
  industry?: string;
  useCase?: string;
  budget?: string;
  decisionTimeline?: string;
  currentHelpdesk?: string;
  monthlyConversations?: string;
  integrations: string[];
  objections: string[];
  buyingIntentPhrase?: string;
  buyingIntentTier?: 'low' | 'medium' | 'high';
}

export interface ConversationQualityMetrics {
  answerFirstCompliance: number;
  questionRepetitionRate: number;
  qualificationTiming: number;
  internalLeakageCount: number;
  memoryConsistency: number;
  topicCoherence: number;
  trustBuildingCompliance: number;
  ctaTiming: number;
  conversationCompletion: number;
  userInterruptionRate: number;
  conversationLength: number;
  fallbackFrequency: number;
}

export interface OrchestratorState {
  sessionId: string;
  tenantId: string;
  stage: ConversationStage;
  strategy: Strategy;
  mood: ConversationMood;
  trustScore: number;
  buyingIntentScore: number;
  lastUserMessage: string;
  lastBotMessage: string;
  lastUnansweredQuestion: string;
  turnCount: number;
  policy: TenantPolicy;
  knownFacts: KnownFacts;
  ledger: ConversationLedger;
  metrics: ConversationQualityMetrics;
  pendingQualificationQuestions: string[];
  askedQualificationQuestions: string[];
  pendingFollowUpTopics: string[];
  previousCta: string | null;
  qualificationAttempts: number;
  turnsSinceLastQualification: number;
  repeatedQuestionCount: number;
  conversationSummary: string;
  lastStrategy: Strategy | null;
}
