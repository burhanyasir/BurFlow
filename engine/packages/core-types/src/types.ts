import { ErrorCode } from './errors';

export interface PipelineRequest {
  rawMessage: string;
  headers: Record<string, string>;
  ip: string;
  idempotencyKey?: string;
}

export interface PipelineResult {
  response: string;
  statusCode: number;
  turnId: string;
  latencyMs: number;
  degradedStages: string[];
  stageTimings?: Record<string, number>;
  error?: PipelineError;
}

export interface PipelineError {
  stage: string;
  errorCode: ErrorCode;
  message: string;
  retryable: boolean;
}

export interface StageInput {
  context: TurnContext;
  signal: AbortSignal;
}

export interface StageResult {
  success: boolean;
  error?: PipelineError;
  errorCode?: ErrorCode;
}

export type StageHandler = (input: StageInput) => Promise<StageResult>;

export interface TurnContext {
  // Stage 1: Ingestion
  message: string;
  authenticatedUserId?: string;
  tenantId?: string;
  role?: string;
  sessionId?: string;
  sequenceNumber?: number;
  idempotencyKey?: string;
  rateLimitResult?: RateLimitResult;

  // Stage 2: Tenant Context Load
  configVersion?: number;
  tenantConfig?: TenantConfig;

  // Stage 3: Intent Classification
  intent?: IntentClassification;

  // Stage 4: Context Assembly
  sessionState?: SessionState;
  conversationHistory?: Message[];
  isNewSession?: boolean;

  // Stage 5: Response Generation
  generatedResponse?: string;

  // Stage 6a: Safety & Quality (synchronous)
  safetyVerdict?: SafetyVerdict;

  // Stage 7: State Persistence
  sessionCommitSucceeded?: boolean;

  // Stage 8: Response Dispatch
  finalResponse?: string;
  statusCode?: number;

  // Cross-cutting
  pipelineStartTime: number;
  degradedStages: string[];
  latencyMs: number;
}

export interface RateLimitResult {
  exceeded: boolean;
  limitType?: 'session' | 'tenant' | 'global';
  limit?: number;
  windowSeconds?: number;
  retryAfterMs?: number;
}

export interface TenantConfig {
  tenantId: string;
  configVersion: number;
  llm: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  };
  safety: {
    contentFilterThreshold: 'strict' | 'moderate' | 'relaxed';
    piiRedactionEnabled: boolean;
    piiRedactionMode: PiiRedactionMode;
  };
  rateLimits: {
    messagesPerMinute: number;
    messagesPerHour: number;
    concurrentSessions: number;
  };
  session: {
    ttlMinutes: number;
    gracePeriodDays: number;
    legalHoldDays: number;
  };
  fallbackResponse: string;
  supportedLanguages: string[];
  featureFlags: {
    qualityScoringEnabled: boolean;
    analyticsEnabled: boolean;
  };
}

export interface IntentClassification {
  intent: string;
  confidence: number;
  tier: 'tier0' | 'tier1' | 'tier2' | 'tier3' | 'tier4';
}

export interface SessionState {
  sessionId: string;
  version: number;
  stateMachine: string;
  data: Record<string, unknown>;
  sequenceCounter: number;
  configVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sequenceNumber: number;
  timestamp: string;
}

export interface Redaction {
  field: string;
  category: string;
  placeholder?: string;
}

export interface SafetyVerdict {
  passed: boolean;
  categories: string[];
  redactions: Redaction[];
  crisisDetected: boolean;
  crisisCategory?: string;
  guardrailFlags: Array<{
    stage: string;
    guardrailType: string;
    action: 'block' | 'redact' | 'warn';
  }>;
  piiRedacted: boolean;
  piiCategory?: string;
  tripWireTriggered?: boolean;
  escalation?: {
    triggered: boolean;
    reason?: string;
    policyViolationCount?: number;
  };
  inputGuardrail?: {
    passed: boolean;
    categories: string[];
    fallbackUsed: boolean;
  };
  outputGuardrail?: {
    passed: boolean;
    categories: string[];
    fallbackUsed: boolean;
    originalResponse?: string;
  };
  groundingVerification?: {
    passed: boolean;
    failures: string[];
    fallbackUsed: boolean;
  };
  piiRedaction?: {
    inputPiiFound: boolean;
    outputPiiFound?: boolean;
    historyPiiMasked?: boolean;
    redactionMode: string;
    redactedFields: string[];
    blocked?: boolean;
  };
}

export type PiiRedactionMode = 'allow' | 'notify' | 'mask' | 'block';

export interface StoreHealth {
  status: 'healthy' | 'degraded' | 'unavailable';
  latencyMs: number;
  error?: string;
}

export interface Store {
  health(): Promise<StoreHealth>;
}
