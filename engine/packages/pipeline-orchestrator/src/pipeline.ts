import { TurnContext, PipelineRequest, PipelineResult, PipelineError, ErrorCodes, RateLimitResult } from '@conversation-engine/core-types';
import * as stage1 from '@conversation-engine/stage-1-ingestion';
import * as stage2 from '@conversation-engine/stage-2-tenant-context';
import * as stage4 from '@conversation-engine/stage-4-context';
import * as stage5 from '@conversation-engine/stage-5-response-generation';
import * as stage6a from '@conversation-engine/stage-6a-safety';
import * as stage7 from '@conversation-engine/stage-7-persistence';
import * as stage8 from '@conversation-engine/stage-8-dispatch';
import { TenantRegistry } from '@conversation-engine/tenant-registry';
import { SessionStore } from '@conversation-engine/session-store';
import { ConfigStore } from '@conversation-engine/config-store';
import { DedupStore } from '@conversation-engine/dedup-store';
import { SecretsVault } from '@conversation-engine/secrets-vault';
import { TripWireEngine, CRISIS_RESPONSE } from '@conversation-engine/trip-wire';
import { InputGuardrailEngine } from '@conversation-engine/input-guardrail';
import { PiiDetector } from '@conversation-engine/pii-detector';
import { OutputGuardrailEngine } from '@conversation-engine/output-guardrail';
import { GroundingVerifier } from '@conversation-engine/grounding-verifier';
import { ResponseGenerator } from '@conversation-engine/response-generator';
import { runLLMResponseGeneration } from './response-generator-integration';
import { enrichContextWithKnowledge } from './knowledge-integration';
import { KnowledgeRetriever } from '@conversation-engine/knowledge-pipeline';
import { authenticateRequest } from './auth';
import { createLogger, metrics } from '@conversation-engine/logger';

interface RateLimitState {
  minuteCount: number;
  hourCount: number;
  minuteWindow: number;
  hourWindow: number;
  concurrentCount: number;
}

const rateLimitStore = new Map<string, RateLimitState>();
const DEDUP_TTL_SECONDS = 300; // 5 minutes

function getRateLimitState(tenantId: string): RateLimitState {
  if (!rateLimitStore.has(tenantId)) {
    rateLimitStore.set(tenantId, {
      minuteCount: 0, hourCount: 0, minuteWindow: Date.now(), hourWindow: Date.now(), concurrentCount: 0,
    });
  }
  return rateLimitStore.get(tenantId)!;
}

function checkRateLimit(tenantId: string, limits: { messagesPerMinute: number; messagesPerHour: number; concurrentSessions: number }): RateLimitResult {
  const state = getRateLimitState(tenantId);
  const now = Date.now();

  if (now - state.minuteWindow > 60000) {
    state.minuteCount = 0;
    state.minuteWindow = now;
  }
  if (now - state.hourWindow > 3600000) {
    state.hourCount = 0;
    state.hourWindow = now;
  }

  if (state.minuteCount >= limits.messagesPerMinute) {
    return { exceeded: true, limitType: 'session', limit: limits.messagesPerMinute, windowSeconds: 60, retryAfterMs: 60000 - (now - state.minuteWindow) };
  }
  if (state.hourCount >= limits.messagesPerHour) {
    return { exceeded: true, limitType: 'tenant', limit: limits.messagesPerHour, windowSeconds: 3600, retryAfterMs: 3600000 - (now - state.hourWindow) };
  }

  state.minuteCount++;
  state.hourCount++;
  return { exceeded: false };
}

export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

const logger = createLogger('pipeline-orchestrator');

export interface PipelineDeps {
  tenantRegistry: TenantRegistry;
  sessionStore: SessionStore;
  configStore: ConfigStore;
  dedupStore: DedupStore;
  vault?: SecretsVault;
  llmApiKey?: string;
  authDisabled?: boolean;
  authenticatedTenantId?: string; // Used with authDisabled; skips authenticateRequest
  tripWire?: TripWireEngine;
  inputGuardrail?: InputGuardrailEngine;
  piiDetector?: PiiDetector;
  outputGuardrail?: OutputGuardrailEngine;
  groundingVerifier?: GroundingVerifier;
  responseGenerator?: ResponseGenerator;
  knowledgeRetriever?: KnowledgeRetriever;
}

interface StageDef {
  name: string;
  timeoutMs: number;
  execute: (input: { context: TurnContext; signal: AbortSignal }) => Promise<{ success: boolean; errorCode?: string; error?: PipelineError }>;
}

export async function runPipeline(req: PipelineRequest, deps: PipelineDeps): Promise<PipelineResult> {
  const startTime = Date.now();

  const context: TurnContext = {
    message: req.rawMessage,
    tenantId: req.headers['x-tenant-id'],
    sessionId: req.headers['x-session-id'] || req.idempotencyKey,
    idempotencyKey: req.idempotencyKey,
    pipelineStartTime: startTime,
    degradedStages: [],
    latencyMs: 0,
  };

  // Parse optional sequence number from header
  const seqHeader = req.headers['x-sequence-number'];
  if (seqHeader) {
    context.sequenceNumber = parseInt(seqHeader, 10);
    if (isNaN(context.sequenceNumber)) {
      context.sequenceNumber = undefined;
    }
  }

  // Authenticate request before Stage 1 (unless auth is disabled for dev)
  if (!deps.authDisabled) {
    const authResult = await authenticateRequest(req.headers, context, { tenantRegistry: deps.tenantRegistry, vault: deps.vault });
    if (authResult.success) {
      context.authenticatedUserId = context.tenantId;
      if (authResult.role) context.role = authResult.role;
    } else {
      return {
        response: authResult.message,
        statusCode: mapErrorToStatusCode(authResult.errorCode),
        turnId: '',
        latencyMs: Date.now() - startTime,
        degradedStages: [],
        error: { stage: 'auth', errorCode: authResult.errorCode as any, message: authResult.message, retryable: false },
      };
    }
  } else if (deps.authenticatedTenantId) {
    // Use pre-authenticated tenant (server already resolved API key)
    context.tenantId = deps.authenticatedTenantId;
    context.authenticatedUserId = deps.authenticatedTenantId;
  }

  // Sequence number validation
  if (context.tenantId && context.sessionId && context.sequenceNumber !== undefined) {
    const existingSession = await deps.sessionStore.loadSession(context.tenantId, context.sessionId);
    if (existingSession) {
      const expectedSeq = existingSession.sequenceCounter + 1;
      if (context.sequenceNumber !== expectedSeq) {
        return {
          response: `Out of sequence. Expected ${expectedSeq}, got ${context.sequenceNumber}.`,
          statusCode: 400,
          turnId: '',
          latencyMs: Date.now() - startTime,
          degradedStages: [],
          error: { stage: 'stage-1-ingestion', errorCode: ErrorCodes.ERR_OUT_OF_SEQUENCE, message: `Expected sequence ${expectedSeq}, got ${context.sequenceNumber}`, retryable: false },
        };
      }
    }
  }

  // Dedup check (auth → seq → dedup → rate-limit → safety)
  if (context.tenantId && context.idempotencyKey) {
    const dedupResult = await deps.dedupStore.checkAndSet(context.tenantId, context.idempotencyKey, DEDUP_TTL_SECONDS);
    if (dedupResult.isDuplicate) {
      if (dedupResult.existing?.responseBody) {
        return {
          response: dedupResult.existing.responseBody,
          statusCode: 200,
          turnId: context.sessionId || '',
          latencyMs: Date.now() - startTime,
          degradedStages: [...context.degradedStages],
          stageTimings: {},
        };
      }
      return {
        response: 'Duplicate message (already being processed)',
        statusCode: 200,
        turnId: context.sessionId || '',
        latencyMs: Date.now() - startTime,
        degradedStages: [...context.degradedStages],
        stageTimings: {},
        error: { stage: 'stage-1-ingestion', errorCode: ErrorCodes.ERR_DEDUP_DETECTED, message: 'Duplicate message detected', retryable: true },
      };
    }
  }

  const stages: StageDef[] = [
    { name: 'stage-1-ingestion', timeoutMs: 1000, execute: (i) => stage1.execute(i, { tripWire: deps.tripWire, inputGuardrail: deps.inputGuardrail, piiDetector: deps.piiDetector }) },
    {
      name: 'stage-2-tenant-context',
      timeoutMs: 2000,
      execute: (i) => stage2.execute(i, { tenantRegistry: deps.tenantRegistry, configStore: deps.configStore }),
    },
    {
      name: 'stage-4-context',
      timeoutMs: 1000,
      execute: (i) => stage4.execute(i, { sessionStore: deps.sessionStore }),
    },
    {
      name: 'stage-4b-knowledge-retrieval',
      timeoutMs: 3000,
      execute: async (i) => {
        if (deps.knowledgeRetriever && i.context.tenantId && i.context.message) {
          await enrichContextWithKnowledge(i.context, deps.knowledgeRetriever, i.context.tenantId);
        }
        return { success: true };
      },
    },
    {
      name: 'stage-5-response-generation',
      timeoutMs: 10000,
      execute: (i) => stage5.execute(i, { apiKey: deps.llmApiKey }),
    },
    {
      name: 'stage-5b-llm-enhancement',
      timeoutMs: 15000,
      execute: async (i) => {
        if (!deps.responseGenerator) return { success: true };
        const { used } = await runLLMResponseGeneration(i.context, deps.responseGenerator, i.signal);
        if (!used && !i.context.generatedResponse) {
          i.context.generatedResponse = i.context.tenantConfig?.fallbackResponse || 'Service unavailable';
        }
        return { success: true };
      },
    },
    {
      name: 'stage-6a-safety',
      timeoutMs: 3000,
      execute: (i) => stage6a.execute(i, { outputGuardrail: deps.outputGuardrail, groundingVerifier: deps.groundingVerifier, piiDetector: deps.piiDetector }),
    },
    {
      name: 'stage-7-persistence',
      timeoutMs: 2000,
      execute: (i) => stage7.execute(i, { sessionStore: deps.sessionStore }),
    },
    { name: 'stage-8-dispatch', timeoutMs: 500, execute: (i) => stage8.execute(i) },
  ];

  let crisisBypass = false;
  const stageTimings: Record<string, number> = {};

  for (const stage of stages) {
    // Crisis bypass: skip Stages 2–6, execute only Persistence and Dispatch
    if (crisisBypass && stage.name !== 'stage-7-persistence' && stage.name !== 'stage-8-dispatch') {
      continue;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), stage.timeoutMs);
    const stageStart = performance.now();

    try {
      const result = await stage.execute({ context, signal: controller.signal });
      const stageDuration = Math.round(performance.now() - stageStart);
      stageTimings[stage.name] = stageDuration;
      metrics.record(`pipeline.${stage.name}.duration`, stageDuration);

      if (!result.success) {
        clearTimeout(timeout);
        metrics.increment(`pipeline.${stage.name}.errors`);
        logger.warn({ stage: stage.name, durationMs: stageDuration, errorCode: result.errorCode }, `Stage ${stage.name} failed`);
        return {
          response: result.error?.message || 'Pipeline error',
          statusCode: mapErrorToStatusCode(result.errorCode as any),
          turnId: '',
          latencyMs: Date.now() - startTime,
          degradedStages: [...context.degradedStages, stage.name],
          stageTimings,
          error: result.error || { stage: stage.name, errorCode: (result.errorCode || ErrorCodes.ERR_INTERNAL) as any, message: 'Unknown error', retryable: false },
        };
      }

      // Rate-limit check after Stage 2 loads tenantConfig
      if (stage.name === 'stage-2-tenant-context' && context.tenantConfig?.rateLimits && context.tenantId) {
        const rateResult = checkRateLimit(context.tenantId, context.tenantConfig.rateLimits);
        context.rateLimitResult = rateResult;
        if (rateResult.exceeded) {
          clearTimeout(timeout);
          metrics.increment('pipeline.rate-limit.exceeded');
          logger.warn({ tenantId: context.tenantId }, 'Rate limit exceeded');
          return {
            response: 'Rate limit exceeded. Please try again later.',
            statusCode: 429,
            turnId: '',
            latencyMs: Date.now() - startTime,
            degradedStages: [...context.degradedStages, 'stage-1-ingestion'],
            stageTimings,
            error: { stage: 'stage-1-ingestion', errorCode: ErrorCodes.ERR_RATE_LIMIT_EXCEEDED, message: 'Rate limit exceeded', retryable: true },
          };
        }
      }

      // After Stage 1, check if trip-wire triggered a crisis
      if (stage.name === 'stage-1-ingestion' && context.safetyVerdict?.crisisDetected) {
        context.generatedResponse = CRISIS_RESPONSE;
        context.statusCode = 200;
        crisisBypass = true;
        // Provide minimal session state so Stage 7 can persist the escalation
        if (!context.sessionState) {
          context.sessionState = {
            sessionId: context.sessionId || '',
            version: 1,
            stateMachine: 'escalated',
            data: { crisisCategory: context.safetyVerdict.crisisCategory, tripWireTriggered: true },
            sequenceCounter: 0,
            configVersion: context.configVersion || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
      }
    } catch (err: any) {
      clearTimeout(timeout);
      const stageDuration = Math.round(performance.now() - stageStart);
      stageTimings[stage.name] = stageDuration;
      metrics.increment(`pipeline.${stage.name}.errors`);
      logger.error({ stage: stage.name, durationMs: stageDuration, err }, `Stage ${stage.name} exception`);
      return {
        response: 'Internal error',
        statusCode: 500,
        turnId: '',
        latencyMs: Date.now() - startTime,
        degradedStages: [...context.degradedStages, stage.name],
        stageTimings,
        error: { stage: stage.name, errorCode: ErrorCodes.ERR_INTERNAL, message: err.message || 'Internal error', retryable: false },
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  metrics.increment('pipeline.completed');
  metrics.record('pipeline.total.duration', Date.now() - startTime);
  logger.info({ totalMs: Date.now() - startTime, stageTimings, degradedStages: context.degradedStages }, 'Pipeline completed');

  return {
    response: context.finalResponse || '',
    statusCode: context.statusCode || 200,
    turnId: context.sessionId || '',
    latencyMs: Date.now() - startTime,
    degradedStages: context.degradedStages,
    stageTimings,
  };
}

export function mapErrorToStatusCode(errorCode?: string): number {
  switch (errorCode) {
    // 200 — success / idempotent
    case ErrorCodes.ERR_DEDUP_DETECTED:
    case ErrorCodes.ERR_CRISIS_DETECTED:
      return 200;
    // 400 — client error
    case ErrorCodes.ERR_OUT_OF_SEQUENCE:
    case ErrorCodes.ERR_INPUT_GUARDRAIL:
    case ErrorCodes.ERR_PII_DETECTED:
    case ErrorCodes.ERR_INJECTION_DETECTED:
    case ErrorCodes.ERR_CONTEXT_TOO_LARGE:
    case ErrorCodes.ERR_SAFETY_GATE:
    case ErrorCodes.ERR_OUTPUT_GUARDRAIL:
    case ErrorCodes.ERR_GROUNDING_FAILED:
    case ErrorCodes.ERR_RESPONSE_TOO_LARGE:
      return 400;
    // 401 — authentication required
    case ErrorCodes.ERR_CREDENTIALS_NOT_FOUND:
      return 401;
    // 403 — forbidden
    case ErrorCodes.ERR_FORBIDDEN:
    case ErrorCodes.ERR_AUTH_INVALID_KEY:
    case ErrorCodes.ERR_AUTH_TENANT_DEACTIVATED:
    case ErrorCodes.ERR_TENANT_NOT_FOUND:
      return 403;
    // 404 — not found
    case ErrorCodes.ERR_CONFIG_VERSION_NOT_FOUND:
      return 404;
    // 409 — conflict
    case ErrorCodes.ERR_SESSION_VERSION_CONFLICT:
      return 409;
    // 429 — rate limited
    case ErrorCodes.ERR_RATE_LIMIT_EXCEEDED:
      return 429;
    // 502 — upstream failure
    case ErrorCodes.ERR_LLM_INFERENCE_FAILURE:
      return 502;
    // 503 — temporarily unavailable
    case ErrorCodes.ERR_TENANT_REGISTRY_UNAVAILABLE:
    case ErrorCodes.ERR_CONFIG_STORE_UNREACHABLE:
    case ErrorCodes.ERR_SESSION_STORE_UNAVAILABLE:
    case ErrorCodes.ERR_LLM_OVERLOADED:
    case ErrorCodes.ERR_LLM_PROVIDER_UNAVAILABLE:
    case ErrorCodes.ERR_ADAPTER_UNAVAILABLE:
    case ErrorCodes.ERR_SECRETS_VAULT_UNREACHABLE:
    case ErrorCodes.ERR_SECRET_MISSING:
    case ErrorCodes.ERR_AUTH_PROVIDER_UNREACHABLE:
      return 503;
    // 504 — timeout
    case ErrorCodes.ERR_LLM_TIMEOUT:
    case ErrorCodes.ERR_ADAPTER_TIMEOUT:
    case ErrorCodes.ERR_STAGE_TIMEOUT:
      return 504;
    // 500 — internal
    case ErrorCodes.ERR_CONFIG_CORRUPT:
    case ErrorCodes.ERR_CERT_INVALID:
    case ErrorCodes.ERR_INTERNAL:
    default:
      return 500;
  }
}
