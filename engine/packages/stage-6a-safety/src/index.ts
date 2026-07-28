import { StageInput, StageResult, ErrorCodes, PiiRedactionMode } from '@conversation-engine/core-types';
import { Stage6aDeps } from './types';

export { Stage6aDeps } from './types';

function mergePiiRedaction(existing: any, updates: any): any {
  return { ...(existing || { inputPiiFound: false, outputPiiFound: false, historyPiiMasked: false, redactionMode: 'mask', redactedFields: [] }), ...updates };
}

export async function execute(input: StageInput, deps?: Stage6aDeps): Promise<StageResult> {
  const { context, signal } = input;

  if (signal.aborted) {
    return {
      success: false,
      errorCode: ErrorCodes.ERR_STAGE_TIMEOUT,
      error: { stage: 'stage-6a-safety', errorCode: ErrorCodes.ERR_STAGE_TIMEOUT, message: 'Stage 6a timed out', retryable: true },
    };
  }

  // Nothing to check if no response was generated
  if (!context.generatedResponse) {
    return { success: true };
  }

  const fallback = context.tenantConfig?.fallbackResponse || 'I apologize, but I am unable to process this request at this time.';
  const threshold = context.tenantConfig?.safety?.contentFilterThreshold || 'moderate';
  const piiMode: PiiRedactionMode = (context.tenantConfig?.safety?.piiRedactionMode as PiiRedactionMode) || 'mask';

  // Initialize safety verdict fields used by Stage 6a
  if (!context.safetyVerdict) {
    context.safetyVerdict = { passed: true, categories: [], redactions: [], crisisDetected: false, guardrailFlags: [], piiRedacted: false };
  }
  const sv = context.safetyVerdict;
  sv.piiRedaction = mergePiiRedaction(sv.piiRedaction, {});
  if (!sv.escalation) {
    sv.escalation = { triggered: false };
  }

  let currentResponse = context.generatedResponse;

  // Step 1: Grounding Verification (isolated error handling)
  if (deps?.groundingVerifier) {
    try {
      const groundingResult = deps.groundingVerifier.verify(currentResponse, context.tenantConfig, signal);
      sv.groundingVerification = groundingResult;
      if (!groundingResult.passed) {
        currentResponse = fallback;
        context.generatedResponse = fallback;
        context.degradedStages.push('grounding-verifier');
        sv.passed = false;
      }
    } catch (err: any) {
      context.degradedStages.push('grounding-verifier');
    }
  }

  // Step 2: Output Guardrail (ML classifier) (isolated error handling)
  if (deps?.outputGuardrail) {
    try {
      const guardrailResult = await deps.outputGuardrail.check(currentResponse, threshold, signal);
      sv.outputGuardrail = {
        passed: guardrailResult.passed,
        categories: guardrailResult.categories,
        fallbackUsed: guardrailResult.fallbackUsed,
        originalResponse: currentResponse,
      };
      if (guardrailResult.fallbackUsed) {
        context.degradedStages.push('output-guardrail');
      }
      if (!guardrailResult.passed) {
        currentResponse = fallback;
        context.generatedResponse = fallback;
        context.degradedStages.push('output-guardrail');
        sv.passed = false;
      }
    } catch (err: any) {
      context.degradedStages.push('output-guardrail');
    }
  }

  // Step 3: Output PII Detection (isolated error handling)
  if (deps?.piiDetector && context.tenantConfig?.safety?.piiRedactionEnabled !== false) {
    try {
      const piiResult = deps.piiDetector.check(currentResponse, piiMode);
      sv.piiRedaction = mergePiiRedaction(sv.piiRedaction, {
        outputPiiFound: piiResult.found,
        redactionMode: piiMode,
      });
      if (piiResult.found) {
        sv.piiRedacted = true;
      }
      if (piiResult.blocked) {
        currentResponse = fallback;
        context.generatedResponse = fallback;
        context.degradedStages.push('pii-detector-output');
        sv.passed = false;
      } else if (piiResult.redactedMessage !== currentResponse) {
        context.generatedResponse = piiResult.redactedMessage;
      }
    } catch (err: any) {
      context.degradedStages.push('pii-detector-output');
    }
  }

  // Escalation Decision: repeated policy violations (3+ in session)
  // Seed prior count from session state data (read-only) into safetyVerdict for this turn
  if (!sv.escalation?.policyViolationCount && context.sessionState?.data?.policyViolationCount) {
    sv.escalation!.policyViolationCount = context.sessionState.data.policyViolationCount as number;
  }

  if (sv.outputGuardrail?.categories.includes('policy_violation')) {
    const priorCount = (sv.escalation?.policyViolationCount as number) || 0;
    const violationCount = priorCount + 1;

    sv.escalation = {
      ...sv.escalation,
      policyViolationCount: violationCount,
    };

    if (violationCount >= 3) {
      sv.escalation.triggered = true;
      sv.escalation.reason = 'repeated_policy_violations';
    }
  }

  return { success: true };
}
