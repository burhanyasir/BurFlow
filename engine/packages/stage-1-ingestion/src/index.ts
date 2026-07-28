import {
  StageInput, StageResult, ErrorCodes, TurnContext,
} from '@conversation-engine/core-types';
import { TripWireEngine } from '@conversation-engine/trip-wire';
import { InputGuardrailEngine } from '@conversation-engine/input-guardrail';
import { PiiDetector, PiiRedactionMode } from '@conversation-engine/pii-detector';

export interface Stage1Config {
  tenants: {
    [tenantId: string]: {
      rateLimits: { messagesPerMinute: number; messagesPerHour: number; concurrentSessions: number };
    };
  };
}

export interface Stage1Deps {
  tripWire?: TripWireEngine;
  inputGuardrail?: InputGuardrailEngine;
  piiDetector?: PiiDetector;
}

function ensureSafetyVerdict(context: TurnContext): void {
  if (!context.safetyVerdict) {
    context.safetyVerdict = {
      passed: false,
      categories: [],
      redactions: [],
      crisisDetected: false,
      guardrailFlags: [],
      piiRedacted: false,
    };
  }
}

export async function execute(input: StageInput, deps?: Stage1Deps): Promise<StageResult> {
  const { context, signal } = input;

  if (signal.aborted) {
    return { success: false, errorCode: ErrorCodes.ERR_STAGE_TIMEOUT, error: { stage: 'stage-1-ingestion', errorCode: ErrorCodes.ERR_STAGE_TIMEOUT, message: 'Stage 1 timed out', retryable: true } };
  }

  // Validate message exists (early exit)
  if (!context.message || context.message.trim().length === 0) {
    return { success: false, errorCode: ErrorCodes.ERR_INJECTION_DETECTED, error: { stage: 'stage-1-ingestion', errorCode: ErrorCodes.ERR_INJECTION_DETECTED, message: 'Message is empty', retryable: false } };
  }

  // Step 1a: Deterministic Trip-Wire (crisis detection)
  if (deps?.tripWire) {
    const tripResult = deps.tripWire.check(context.message);
    if (tripResult.matched) {
      ensureSafetyVerdict(context);
      context.safetyVerdict!.passed = false;
      context.safetyVerdict!.crisisDetected = true;
      context.safetyVerdict!.crisisCategory = tripResult.category;
      context.safetyVerdict!.tripWireTriggered = true;
      context.safetyVerdict!.escalation = { triggered: true, reason: tripResult.category };
      context.safetyVerdict!.guardrailFlags.push({ stage: 'trip-wire', guardrailType: 'crisis_detection', action: 'block' });
      // Short-circuit: skip 1b and 1c
      return { success: true };
    }
  }

  // Step 1b: Input Guardrail (ML classifier)
  if (deps?.inputGuardrail) {
    const guardrailResult = await deps.inputGuardrail.check(context.message, signal);

    ensureSafetyVerdict(context);
    context.safetyVerdict!.inputGuardrail = {
      passed: guardrailResult.passed,
      categories: guardrailResult.categories,
      fallbackUsed: guardrailResult.fallbackUsed,
    };

    if (guardrailResult.fallbackUsed) {
      context.degradedStages.push('input-guardrail');
    }

    if (!guardrailResult.passed) {
      // Flagged by guardrail — reject
      context.safetyVerdict!.passed = false;
      const categoryStr = guardrailResult.categories.join(', ');
      return {
        success: false,
        errorCode: ErrorCodes.ERR_INPUT_GUARDRAIL,
        error: {
          stage: 'input-guardrail',
          errorCode: ErrorCodes.ERR_INPUT_GUARDRAIL,
          message: `Your message was flagged as: ${categoryStr}. Please rephrase and try again.`,
          retryable: false,
        },
      };
    }
  }

  // Step 1c: PII Detection on Input
  if (deps?.piiDetector) {
    const mode: PiiRedactionMode = (context.tenantConfig?.safety?.piiRedactionMode as PiiRedactionMode) || 'mask';
    const piiResult = deps.piiDetector.check(context.message, mode);

    ensureSafetyVerdict(context);
    context.safetyVerdict!.piiRedaction = {
      inputPiiFound: piiResult.found,
      redactionMode: mode,
      redactedFields: piiResult.redactedFields,
      blocked: piiResult.blocked,
    };

    if (piiResult.blocked) {
      context.safetyVerdict!.piiRedacted = true;
      context.safetyVerdict!.piiCategory = piiResult.categories.join(', ');
      return {
        success: false,
        errorCode: ErrorCodes.ERR_PII_DETECTED,
        error: {
          stage: 'pii-detector',
          errorCode: ErrorCodes.ERR_PII_DETECTED,
          message: `Your message contains sensitive personal information (${piiResult.categories.join(', ')}). Please remove this information and try again.`,
          retryable: false,
        },
      };
    }

    if (piiResult.redactedMessage !== context.message) {
      context.message = piiResult.redactedMessage;
      context.safetyVerdict!.piiRedacted = true;
    }
  }

  return { success: true };
}

// Rate limit store moved to pipeline-orchestrator (runs after Stage 2 loads tenantConfig)
export function resetRateLimitStore(): void {
  // No-op — rate limit store now lives in pipeline-orchestrator
}
