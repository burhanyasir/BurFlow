import { StageInput, StageResult, ErrorCodes, Message } from '@conversation-engine/core-types';
import { SessionStore } from '@conversation-engine/session-store';

export interface Stage4Deps {
  sessionStore: SessionStore;
}

export async function execute(input: StageInput, deps: Stage4Deps): Promise<StageResult> {
  const { context, signal } = input;

  if (signal.aborted) {
    return { success: false, errorCode: ErrorCodes.ERR_STAGE_TIMEOUT, error: { stage: 'stage-4-context', errorCode: ErrorCodes.ERR_STAGE_TIMEOUT, message: 'Stage 4 timed out', retryable: true } };
  }

  if (!context.tenantId) {
    return { success: false, errorCode: ErrorCodes.ERR_TENANT_NOT_FOUND, error: { stage: 'stage-4-context', errorCode: ErrorCodes.ERR_TENANT_NOT_FOUND, message: 'No tenantId', retryable: false } };
  }

  if (!context.sessionId) {
    return { success: false, errorCode: ErrorCodes.ERR_INTERNAL, error: { stage: 'stage-4-context', errorCode: ErrorCodes.ERR_INTERNAL, message: 'No sessionId provided', retryable: false } };
  }

  const session = await deps.sessionStore.loadSession(context.tenantId, context.sessionId);

  if (!session) {
    return { success: false, errorCode: ErrorCodes.ERR_SESSION_STORE_UNAVAILABLE, error: { stage: 'stage-4-context', errorCode: ErrorCodes.ERR_SESSION_STORE_UNAVAILABLE, message: 'Session not found', retryable: true } };
  }

  let rawData: any;
  try {
    rawData = JSON.parse(session.state);
  } catch {
    return { success: false, errorCode: ErrorCodes.ERR_INTERNAL, error: { stage: 'stage-4-context', errorCode: ErrorCodes.ERR_INTERNAL, message: 'Corrupted session state', retryable: false } };
  }

  context.sessionState = {
    sessionId: session.sessionId,
    version: session.version,
    stateMachine: session.stateMachine,
    data: JSON.parse(JSON.stringify(rawData)),
    sequenceCounter: session.sequenceCounter,
    configVersion: session.configVersion,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };

  // Load conversation history from session state if available
  context.conversationHistory = rawData.conversationHistory || [];

  return { success: true };
}
