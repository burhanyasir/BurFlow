export type PersonaType =
  | 'small_business'
  | 'startup'
  | 'enterprise'
  | 'agency'
  | 'ecommerce'
  | 'developer'
  | 'support_manager'
  | 'existing_customer'
  | 'unknown';

export type BuyerRole =
  | 'ceo'
  | 'manager'
  | 'developer'
  | 'sales'
  | 'support'
  | 'healthcare'
  | 'retail'
  | 'agency'
  | 'enterprise'
  | 'small_business'
  | 'unknown';

export type ConversationStage =
  | 'greeting'
  | 'discovery'
  | 'qualification'
  | 'education'
  | 'objection'
  | 'comparison'
  | 'pricing'
  | 'decision'
  | 'purchase'
  | 'post_purchase'
  | 'support'
  | 'escalation';

export type Temperature = 'cold' | 'warm' | 'hot' | 'ready_to_buy' | 'lost';

export type BusinessType =
  | 'saas'
  | 'shopify'
  | 'dental'
  | 'healthcare'
  | 'legal'
  | 'real_estate'
  | 'hotel'
  | 'restaurant'
  | 'agency'
  | 'education'
  | 'manufacturing'
  | 'consulting'
  | 'generic';

export type UniversalIntent =
  | 'buy'
  | 'research'
  | 'compare'
  | 'support'
  | 'billing'
  | 'refund'
  | 'warranty'
  | 'technical_issue'
  | 'appointment'
  | 'booking'
  | 'complaint'
  | 'partnership'
  | 'careers'
  | 'contact'
  | 'faq'
  | 'unknown';

export type ModuleName =
  | 'sales'
  | 'customer_support'
  | 'booking'
  | 'billing'
  | 'technical_support'
  | 'faq'
  | 'product_advisor'
  | 'complaint_resolution'
  | 'lead_qualification';

export interface BusinessProfile {
  businessType: BusinessType;
  industry: string;
  products: string[];
  services: string[];
  policies: string[];
  goals: string[];
  brandTone: string;
  supportedCTAs: string[];
  locale?: string;
}

export interface UniversalIntentResult {
  intent: UniversalIntent;
  confidence: number;
  reason: string;
}

export interface JourneyStageDefinition {
  id: string;
  name: string;
  description: string;
  keywords: string[];
}

export interface JourneyTemplate {
  id: string;
  businessType: BusinessType;
  industry: string;
  name: string;
  stages: JourneyStageDefinition[];
  ctas: string[];
  enabled: boolean;
}

export interface JourneyDetectionResult {
  stage: string;
  confidence: number;
  reason: string;
}

export interface ModuleRoutingDecision {
  module: ModuleName;
  confidence: number;
  reason: string;
  primary: boolean;
}

export interface PersonaDetectionResult {
  persona: PersonaType;
  confidence: number; // 0 to 1
  reasoning: string;
}

export type FunnelStage =
  | 'greeting'
  | 'discovery'
  | 'interest'
  | 'evaluation'
  | 'objection'
  | 'purchase_intent'
  | 'customer'
  | 'support';

export interface BuyingIntentResult {
  hasBuyingIntent: boolean;
  intentPhrase?: string;
  targetTier?: 'free' | 'starter' | 'professional' | 'enterprise';
  confidence: number;
}

export interface QualificationState {
  monthlyConversations?: string;
  qualifiedForTier?: 'free' | 'starter' | 'professional' | 'enterprise';
  questionsAskedCount: number;
  completed: boolean;
  // extractedFields holds rich qualification fields with confidence for BANT/MEDDICC/SPICED
  extractedFields?: Record<string, { value?: string; confidence: number }>; 
}

export interface ObjectionResult {
  isObjection: boolean;
  category: ObjectionCategory;
  groundedAnswer: string;
  sources: string[];
  // additional mapped resources for objection resolution
  proof?: string;
  documentation?: string;
  caseStudy?: string;
  faq?: string;
  comparison?: string;
  recommendedCTA?: CTAType;
}

export type ObjectionCategory =
  | 'price'
  | 'security'
  | 'setup'
  | 'competition'
  | 'roi'
  | 'implementation'
  | 'enterprise_procurement'
  | 'developer_concerns'
  | 'none';

export interface ObjectionResult {
  isObjection: boolean;
  category: ObjectionCategory;
  groundedAnswer: string;
  sources: string[];
}

export type CTAType =
  | 'start_free_trial'
  | 'book_demo'
  | 'contact_sales'
  | 'developer_docs'
  | 'pricing'
  | 'upload_documentation'
  | 'talk_enterprise_sales'
  | 'partner_program'
  | 'support'
  | 'none';

export interface CTASelectionResult {
  primaryCTA: CTAType;
  label: string;
  link: string;
  secondaryCTA?: CTAType;
  secondaryLabel?: string;
  secondaryLink?: string;
}

export type NextBestActionType =
  | 'educate'
  | 'ask_qualification'
  | 'handle_objection'
  | 'show_proof'
  | 'offer_trial'
  | 'book_demo'
  | 'offer_discount'
  | 'escalate_human'
  | 'wait';

export interface NextBestAction {
  action: NextBestActionType;
  confidence: number; // 0-1
  expectedValue: number; // normalized expected business value
  risk: 'low' | 'medium' | 'high';
  reason: string;
}

export interface DebugPanel {
  conversationStage: ConversationStage;
  customerTemperature: Temperature;
  buyingIntent: BuyingIntentResult;
  trustLevel: 'low' | 'medium' | 'high';
  momentum: { answered: boolean; referencedContext: boolean; advanced: boolean; naturalEnding: boolean; momentumScore: number; weakPoints: string[]; shouldRegenerate: boolean };
  qualificationPercent: number;
  objections: string[];
  nextBestAction: NextBestAction;
  topButtons: Array<{ id: string; label: string; score: number; category?: string; reason?: string }>;
  buttonScores: Record<string, number>;
  expectedValue: number;
  decisionReason: string;
  conversionPrediction: Record<string, number>;
}

export interface SmartButton {
  id: string;
  label: string;
  action: 'send_text' | 'select_choice' | 'navigate' | 'open_modal';
  payload: string;
  // Optional UI metadata
  icon?: string; // future icon name
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  // Internal ranking score (0-100). Higher = more likely to help conversion
  score?: number;
  // Category helps grouping and future analytics (e.g., 'pricing','security','trial')
  category?: string;
  // Locale for localization support (e.g., 'en-US'). Default handled at rendering time
  locale?: string;
  // Localized labels by locale (locale->label). If present, consumer should prefer locale label.
  localeLabels?: Record<string, string>;
  // Why this button was surfaced for the current context
  reason?: string;
}

export interface ConversationUIState {
  buttons: SmartButton[];
  suggestedActions: SmartButton[];
  activeCard?: {
    type: 'pricing' | 'demo_booking' | 'lead_form' | 'code_snippet' | 'trust_summary';
    data: Record<string, unknown>;
  };
  promptQuestion?: string;
}

export interface DocumentDomainRoute {
  targetDomain: 'security' | 'analytics' | 'developer_api' | 'customization' | 'pricing' | 'quick_start' | 'general';
  searchKeywords: string[];
  relevanceScore: number;
}

export interface OrchestratedTurnResult {
  responseText: string;
  persona: PersonaDetectionResult;
  funnelStage: FunnelStage;
  buyingIntent: BuyingIntentResult;
  qualification: QualificationState;
  objection: ObjectionResult;
  cta: CTASelectionResult;
  uiState: ConversationUIState;
  routing: DocumentDomainRoute;
  sources: string[];
  isFallback: boolean;
}
