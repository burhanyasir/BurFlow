import { StageInput, StageResult, ErrorCodes } from '@conversation-engine/core-types';
import { SessionStore } from '@conversation-engine/session-store';

export interface Stage7Deps {
  sessionStore: SessionStore;
}

export async function execute(input: StageInput, deps: Stage7Deps): Promise<StageResult> {
  const { context, signal } = input;

  if (signal.aborted) {
    return { success: false, errorCode: ErrorCodes.ERR_STAGE_TIMEOUT, error: { stage: 'stage-7-persistence', errorCode: ErrorCodes.ERR_STAGE_TIMEOUT, message: 'Stage 7 timed out', retryable: true } };
  }

  if (!context.tenantId || !context.sessionId || !context.sessionState) {
    return { success: false, errorCode: ErrorCodes.ERR_INTERNAL, error: { stage: 'stage-7-persistence', errorCode: ErrorCodes.ERR_INTERNAL, message: 'Missing session data', retryable: false } };
  }

  // Apply accumulated TurnContext changes to session state before commit
  const sessionData = { ...context.sessionState.data };
  if (context.safetyVerdict?.escalation?.policyViolationCount !== undefined) {
    sessionData.policyViolationCount = context.safetyVerdict.escalation.policyViolationCount;
  }

  const result = await deps.sessionStore.commitSession(
    context.tenantId,
    context.sessionId,
    context.sessionState.version,
    { state: JSON.stringify(sessionData), stateMachine: context.sessionState.stateMachine, configVersion: context.configVersion }
  );

  if (!result.success) {
    return { success: false, errorCode: ErrorCodes.ERR_SESSION_VERSION_CONFLICT, error: { stage: 'stage-7-persistence', errorCode: ErrorCodes.ERR_SESSION_VERSION_CONFLICT, message: 'CAS version conflict', retryable: true } };
  }

  context.sessionCommitSucceeded = true;
  context.sessionState.version = result.newVersion!;
  if (result.sequenceCounter !== undefined) {
    context.sessionState.sequenceCounter = result.sequenceCounter;
  }

  return { success: true };
}
