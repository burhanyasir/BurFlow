// ─── Generator input — all conversation intelligence ──────────────
export interface GeneratorInput {
  message: string;
  conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  persona: string;
  intent: string;
  buyingIntent: {
    detected: boolean;
    phrase?: string;
    tier?: string;
    confidence: number;
  };
  leadScore: number;
  conversationScore: number;
  qualificationState: {
    completed: boolean;
    progress: number;
    answeredQuestions: string[];
  };
  sentiment: {
    polarity: number;
    frustration: string;
    urgency: string;
    trend: string;
  };
  trustSignals: string[];
  recoveryState: {
    needsRecovery: boolean;
    recoverySuggestion?: string;
  };
  abandonmentRisk: {
    level: string;
    score: number;
    details?: string;
  };
  contextStack: Record<string, unknown>;
  knowledgeResults: Array<{ title: string; content: string; source?: string }>;
  currentCta: {
    primaryCTA: string;
    label: string;
    link: string;
  };
  quickReplies: Array<{ id: string; label: string; action: string; payload: string }>;
  funnelStage: string;
  objections: string[];
  topics: string[];
  systemPrompt?: string;
  tenantConfig?: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

// ─── Generator output ────────────────────────────────────────────
export interface GeneratorOutput {
  response: string;
  updatedCta: {
    primaryCTA: string;
    label: string;
    link: string;
  };
  suggestedQuickReplies: Array<{ id: string; label: string; action: string; payload: string; variant?: string }>;
  confidence: number;
  safetyFlags: string[];
  reasoning: {
    tone: string;
    salesPressure: 'none' | 'low' | 'medium' | 'high';
    objectionHandled?: string;
    knowledgeReferenced: string[];
    ctaTiming: string;
    followUpSupported: boolean;
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    provider: string;
    model: string;
    latencyMs: number;
  };
}

// ─── Provider config ─────────────────────────────────────────────
export interface ProviderConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey?: string;
  baseUrl?: string;
}

export interface ModelAdapter {
  generate(input: GeneratorInput, config: ProviderConfig, signal?: AbortSignal): Promise<GeneratorOutput>;
  generateStream(input: GeneratorInput, config: ProviderConfig, signal?: AbortSignal): AsyncIterable<StreamChunk>;
}

export interface StreamChunk {
  delta: string;
  finishReason?: 'stop' | 'length';
}

// ─── Cache ───────────────────────────────────────────────────────
export interface CacheConfig {
  enabled: boolean;
  ttlMs: number;
  maxEntries: number;
}

// ─── Telemetry ───────────────────────────────────────────────────
export interface TelemetryEvent {
  provider: string;
  model: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  success: boolean;
  error?: string;
  retries: number;
  cached: boolean;
}

export interface TelemetryCollector {
  record(event: TelemetryEvent): void;
  snapshot(): TelemetrySnapshot;
}

export interface TelemetrySnapshot {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgLatencyMs: number;
  errorRate: number;
  cacheHitRate: number;
  providerBreakdown: Record<string, number>;
}
