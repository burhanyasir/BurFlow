export type PersonaType =
  | 'shopify_merchant' | 'saas_founder' | 'enterprise_it_manager'
  | 'healthcare_clinic' | 'law_firm' | 'restaurant_owner'
  | 'marketing_agency' | 'ecommerce_store' | 'internal_kb_buyer' | 'api_developer';

export type ScenarioType =
  | 'curious' | 'skeptical' | 'price_sensitive' | 'technical' | 'ready_for_trial';

export type FunnelStage =
  | 'greeting' | 'awareness' | 'interest' | 'consideration'
  | 'evaluation' | 'purchase_intent' | 'decision' | 'customer' | 'support';

export type ConversationGoal =
  | 'build_trust' | 'answer_question' | 'handle_objection' | 'qualify'
  | 'advance_funnel' | 'recommend_plan' | 'close_trial' | 'schedule_demo'
  | 'recover_abandonment' | 'finish_conversation' | 'none';

export interface TurnEvaluation {
  turnNumber: number;
  userMessage: string;
  assistantResponse: string;
  observedCustomerIntent: string;
  expectedGoal: ConversationGoal;
  actualGoal: ConversationGoal | null;
  goalMatch: boolean;
  topicsDiscussed: string[];
  naturalness: 1 | 2 | 3 | 4 | 5;
  feltGeneric: boolean;
  repeatedPhrases: string[];
  unnecessaryQualification: boolean;
  ctaPresent: boolean;
  ctaAppropriate: boolean;
  ctaTiming: 'too_early' | 'appropriate' | 'too_late' | 'none';
  memoryReferenced: boolean;
  memoryShouldHaveBeenReferenced: boolean;
  topicContinuityGood: boolean;
  advancedFunnel: boolean;
  handledObjection: boolean;
  betterFollowUpAvailable: boolean;
  betterFollowUpText: string | null;
  notes: string;
}

export interface QualificationEvent {
  turnNumber: number;
  question: string;
  natural: boolean;
  acknowledged: boolean;
  userAnswer: string | null;
}

export interface FunnelProgression {
  turnNumber: number;
  from: FunnelStage;
  to: FunnelStage;
  natural: boolean;
}

export interface TopicEvent {
  turnNumber: number;
  topic: string;
  action: 'introduced' | 'explained' | 'deepened' | 'completed' | 'repeated';
}

export interface MemoryRefEvent {
  turnNumber: number;
  memoryField: string;
  natural: boolean;
  accurate: boolean;
}

export interface CTAEvent {
  turnNumber: number;
  ctaType: string;
  label: string;
  appropriate: boolean;
  userResponded: boolean;
}

export interface DeadEnd {
  turnNumber: number;
  responseText: string;
  reason: string;
}

export interface LoopEvent {
  startTurn: number;
  endTurn: number;
  pattern: string;
  count: number;
}

export interface ConversationRecord {
  evaluator: string;
  date: string;
  persona: PersonaType;
  scenario: ScenarioType;
  userGoal: string;
  turnCount: number;
  turns: TurnEvaluation[];
  qualificationTimeline: QualificationEvent[];
  funnelProgression: FunnelProgression[];
  topicsDiscussed: TopicEvent[];
  memoryReferences: MemoryRefEvent[];
  ctaHistory: CTAEvent[];
  deadEnds: DeadEnd[];
  loops: LoopEvent[];
  finalRecommendation: string | null;
  reviewerNotes: string[];
  overallImpression: string;
}

export interface EvaluationMetrics {
  naturalness: number;
  repetitionScore: number;
  topicProgression: number;
  memoryUtilization: number;
  qualificationQuality: number;
  salesMomentum: number;
  trustBuilding: number;
  objectionHandling: number;
  ctaTiming: number;
  conversationCompletion: number;
  deadEndCount: number;
  loopCount: number;
}

export interface EvaluationReport {
  persona: PersonaType;
  scenario: ScenarioType;
  userGoal: string;
  turnCount: number;
  overallScore: number;
  metrics: EvaluationMetrics;
  strengths: string[];
  weaknesses: string[];
  suggestedImprovements: string[];
  genericResponses: Array<{ turn: number; text: string }>;
  unnecessaryQualifications: Array<{ turn: number; question: string }>;
  repeatedPhrases: Array<{ phrase: string; count: number; turns: number[] }>;
  missedOpportunities: Array<{ turn: number; suggestion: string; context: string }>;
  ctaIssues: Array<{ turn: number; cta: string; issue: string }>;
  qualificationIssues: Array<{ turn: number; issue: string }>;
  funnelStallPoints: number[];
  momentumBreaks: number[];
}

export interface AggregatedSummary {
  totalConversations: number;
  averageScore: number;
  personaScores: Record<string, { avg: number; count: number }>;
  metricAverages: EvaluationMetrics;
  topWeaknesses: string[];
  topImprovements: string[];
  frequencyMap: Record<string, number>;
}

export interface PersonaScenario {
  label: string;
  userGoal: string;
  description: string;
  initialTopics: string[];
  expectedTopics: string[];
  minimumQualFields: string[];
  redFlags: string[];
  successCriteria: string[];
}

export interface PersonaTemplate {
  name: string;
  label: string;
  description: string;
  scenarios: Record<ScenarioType, PersonaScenario>;
}
