import { StageInput, StageResult, ErrorCodes } from '@conversation-engine/core-types';

export async function execute(input: StageInput): Promise<StageResult> {
  const { context, signal } = input;

  if (signal.aborted) {
    return { success: false, errorCode: ErrorCodes.ERR_STAGE_TIMEOUT, error: { stage: 'stage-8-dispatch', errorCode: ErrorCodes.ERR_STAGE_TIMEOUT, message: 'Stage 8 timed out', retryable: true } };
  }

  context.finalResponse = context.generatedResponse || context.tenantConfig?.fallbackResponse || 'Request received';
  context.statusCode = 200;
  context.latencyMs = Date.now() - context.pipelineStartTime;

  return { success: true };
}
