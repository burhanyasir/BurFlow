import { StageInput, StageResult, ErrorCodes } from '@conversation-engine/core-types';
import { LLMConfig, LLMProvider, LLMResponse, ChatMessage } from './llm/provider';
import { buildPrompt } from './llm/prompt-builder';
import { createProvider } from './llm/resolver';

export type { LLMProvider, LLMConfig, LLMResponse, StreamingLLMProvider, StreamChunk } from './llm/provider';
export { buildPrompt, estimateTokens } from './llm/prompt-builder';
export { createProvider } from './llm/resolver';
export { OpenAIChatProvider } from './llm/openai-provider';
export { StreamingOpenAIChatProvider } from './llm/streaming-openai-provider';
export { NoopProvider } from './llm/noop-provider';
export { MockProvider } from './llm/mock-provider';

export interface Stage5Deps {
  apiKey?: string;
  provider?: LLMProvider;
}

export async function execute(input: StageInput, deps?: Stage5Deps): Promise<StageResult> {
  const { context, signal } = input;

  if (signal.aborted) {
    return {
      success: false,
      errorCode: ErrorCodes.ERR_STAGE_TIMEOUT,
      error: { stage: 'stage-5-response-generation', errorCode: ErrorCodes.ERR_STAGE_TIMEOUT, message: 'Stage 5 timed out', retryable: true },
    };
  }

  if (!context.tenantConfig) {
    context.generatedResponse = 'Service configuration unavailable';
    return { success: true };
  }

  const llmConfig: LLMConfig = {
    model: context.tenantConfig.llm.model,
    temperature: context.tenantConfig.llm.temperature,
    maxTokens: context.tenantConfig.llm.maxTokens,
  };

  const provider = deps?.provider || createProvider(llmConfig.model, deps?.apiKey || process.env.LLM_API_KEY);
  let messages: ChatMessage[];
  try {
    messages = buildPrompt(context);
  } catch (err: any) {
    context.generatedResponse = context.tenantConfig.fallbackResponse || 'Request too large for model context window';
    context.degradedStages.push('stage-5-response-generation');
    return {
      success: true,
      errorCode: ErrorCodes.ERR_CONTEXT_TOO_LARGE,
      error: { stage: 'stage-5-response-generation', errorCode: ErrorCodes.ERR_CONTEXT_TOO_LARGE, message: err.message || 'Context too large', retryable: false },
    };
  }

  try {
    const response: LLMResponse = await provider.generate(messages, llmConfig, signal);

    if (response.finishReason === 'length') {
      context.generatedResponse = response.content;
      if (!context.degradedStages.includes('stage-5-response-generation')) {
        context.degradedStages.push('stage-5-response-generation');
      }
      return { success: true };
    }

    context.generatedResponse = response.content;
    return { success: true };
  } catch (err: any) {
    const errorCode = err.code || ErrorCodes.ERR_LLM_INFERENCE_FAILURE;
    context.generatedResponse = context.tenantConfig.fallbackResponse;
    if (!context.degradedStages.includes('stage-5-response-generation')) {
      context.degradedStages.push('stage-5-response-generation');
    }
    return {
      success: true,
      errorCode: errorCode,
      error: { stage: 'stage-5-response-generation', errorCode, message: err.message, retryable: errorCode === ErrorCodes.ERR_LLM_TIMEOUT },
    };
  }
}
