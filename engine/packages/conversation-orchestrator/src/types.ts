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

export interface SmartButton {
  id: string;
  label: string;
  action: 'send_text' | 'select_choice' | 'navigate' | 'open_modal';
  payload: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
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
