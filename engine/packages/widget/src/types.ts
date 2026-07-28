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
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  streaming?: boolean;
}

export interface StreamEvent {
  type: 'token' | 'done' | 'complete' | 'error';
  content?: string;
  finishReason?: string;
  turnId?: string;
  fullContent?: string;
  error?: string;
}

export interface StreamClientOptions {
  apiUrl: string;
  tenantId?: string;
  apiKey?: string;
  widgetToken?: string;
  sessionId?: string;
  onToken: (delta: string) => void;
  onDone: (finishReason: string) => void;
  onComplete: (fullContent: string, turnId: string) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}
