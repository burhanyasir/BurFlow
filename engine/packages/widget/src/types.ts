export interface WidgetConfig {
  apiUrl: string;
  tenantId?: string;
  apiKey?: string;
  widgetToken?: string;
  sessionId?: string;
  title?: string;
  subtitle?: string;
  primaryColor?: string;
  greeting?: string;
  position?: 'bottom-right' | 'bottom-left';
  companyName?: string;
  launcherText?: string;
  suggestedActions?: SmartButton[];
  businessProfile?: Record<string, unknown>;
  starterOptions?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  streaming?: boolean;
}

export interface SmartButton {
  id: string;
  label: string;
  action: 'send_text' | 'select_choice' | 'navigate' | 'open_modal';
  payload: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  category?: string;
  reason?: string;
}

export interface ActiveCard {
  type: 'pricing' | 'demo_booking' | 'lead_form' | 'code_snippet' | 'trust_summary' | string;
  data: Record<string, unknown>;
}

export interface ConversationUIState {
  buttons: SmartButton[];
  suggestedActions: SmartButton[];
  activeCard?: ActiveCard;
  promptQuestion?: string;
}

export interface StreamEvent {
  type: 'token' | 'done' | 'complete' | 'error' | 'ui_state';
  content?: string;
  finishReason?: string;
  turnId?: string;
  fullContent?: string;
  error?: string;
  uiState?: ConversationUIState;
  cta?: Record<string, unknown>;
  humanTakeover?: boolean;
}

export interface StreamClientOptions {
  apiUrl: string;
  tenantId?: string;
  apiKey?: string;
  widgetToken?: string;
  sessionId?: string;
  message?: string;
  onToken: (delta: string) => void;
  onDone: (finishReason: string) => void;
  onComplete: (fullContent: string, turnId: string) => void;
  onUiState?: (uiState: ConversationUIState | undefined, cta?: Record<string, unknown>) => void;
  onHumanTakeover?: () => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}
