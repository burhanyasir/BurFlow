import { PersonaType, FunnelStage, BuyingIntentResult, ObjectionResult, ObjectionCategory, QualificationState, CTASelectionResult, SmartButton, ConversationUIState, DocumentDomainRoute, PersonaDetectionResult } from './types';

export interface SentimentSnapshot {
  polarity: number;
  frustration: 'low' | 'medium' | 'high';
  urgency: 'low' | 'medium' | 'high';
  trend: 'improving' | 'declining' | 'stable';
}

export interface AbandonmentRisk {
  level: 'low' | 'medium' | 'high';
  score: number;
  details?: string;
}

export interface RepetitionStatus {
  hasRepetition: boolean;
  count: number;
  topics: string[];
}

export interface EscalationRecommendation {
  shouldEscalate: boolean;
  urgency: 'low' | 'medium' | 'high';
  reason?: string;
}

export interface RoutingDecision {
  decision: 'assistant' | 'sales' | 'support' | 'sdr' | 'escalate' | 'enterprise_sales';
  confidence: number;
  label: string;
}

export interface TrustSignal {
  shouldInject: boolean;
  signalType?: 'soc2' | 'testimonial' | 'trial' | 'customer_count' | 'security';
  reason?: string;
}

export interface LeadScoreResult {
  overallScore: number;
}

export interface ConversationScoreResult {
  overallScore: number;
}

export interface ConversationIntelligenceMemory {
  turns: Array<{
    message: string;
    response: string;
    polarity: number;
    frustration: number;
    urgency: number;
    timestamp: number;
  }>;
  persona: PersonaType;
  funnelStage: FunnelStage;
  buyingIntentDetected: boolean;
  buyingIntentPhrase?: string;
  buyingIntentTier?: string;
  objections: ObjectionCategory[];
  qualificationState: QualificationState;
  repeatedPhraseCount: number;
  topics: string[];
  industry?: string;
  companySize?: string;
  monthlyConversations?: string;
  /** @reserved — declared for future qualification extraction; not yet populated by any engine path */
  useCase?: string;
  /** @reserved — declared for future qualification extraction; not yet populated by any engine path */
  currentHelpdesk?: string;
  /** @reserved — declared for future qualification extraction; not yet populated by any engine path */
  budget?: string;
  /** @reserved — declared for future qualification extraction; not yet populated by any engine path */
  decisionTimeline?: string;
  currentStage?: string;
  customerTemperature?: 'cold' | 'warm' | 'hot' | 'ready_to_buy' | 'lost';
  trustLevel?: 'low' | 'medium' | 'high';
  goalsAchieved?: string[];
  buttonClicks?: string[];
  buttonAcceptances?: string[];
  buttonRejections?: string[];
  leadScore?: number;
  conversationScore?: number;
  knowledgeEvidenceConfidence?: number;
  lastGoal?: string;
  lastGoalStreak?: number;
}

export interface ConversationIntelligenceResult {
  responseText: string;
  leadScore: LeadScoreResult;
  conversationScore: ConversationScoreResult;
  sentiment: SentimentSnapshot;
  abandonmentRisk: AbandonmentRisk;
  repetition: RepetitionStatus;
  escalation: EscalationRecommendation;
  routingDecision: RoutingDecision;
  trustSignal: TrustSignal;
  buyingIntent: BuyingIntentResult;
  objection: ObjectionResult;
  qualification: QualificationState;
  qualificationProgress: number;
  persona: PersonaDetectionResult;
  funnelStage: FunnelStage;
  cta: CTASelectionResult;
  quickReplies: SmartButton[];
  uiState: ConversationUIState;
  sources: string[];
  isFallback: boolean;
  turnCount: number;
}
