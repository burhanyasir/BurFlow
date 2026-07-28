import { LLMProvider, LLMConfig, LLMResponse, ChatMessage } from './provider';

interface OpenAIRequestBody {
  model: string;
  messages: { role: string; content: string }[];
  temperature: number;
  max_tokens: number;
  stream?: boolean;
}

interface OpenAIResponseBody {
  choices: Array<{
    message: { content: string };
    finish_reason: 'stop' | 'length';
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 200;

export class OpenAIChatProvider implements LLMProvider {
  constructor(
    private apiKey: string,
    private baseUrl = 'https://api.openai.com/v1',
    private maxRetries = MAX_RETRIES,
  ) {}

  async generate(messages: ChatMessage[], config: LLMConfig, signal?: AbortSignal): Promise<LLMResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (signal?.aborted) {
        throw Object.assign(new Error('Request aborted'), { code: 'ERR_LLM_TIMEOUT' });
      }

      try {
        return await this.doGenerate(messages, config, signal);
      } catch (err: any) {
        lastError = err;
        if (err.code === 'ERR_LLM_OVERLOADED' && attempt < this.maxRetries) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          await sleep(delay, signal);
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  }

  private async doGenerate(messages: ChatMessage[], config: LLMConfig, signal?: AbortSignal): Promise<LLMResponse> {
    const body: OpenAIRequestBody = {
      model: config.model,
      messages: messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      if (response.status === 429) {
        throw Object.assign(new Error(`LLM rate limited: ${errorBody}`), { code: 'ERR_LLM_OVERLOADED' });
      }
      if (response.status >= 500) {
        throw Object.assign(new Error(`LLM server error (${response.status}): ${errorBody}`), { code: 'ERR_LLM_PROVIDER_UNAVAILABLE' });
      }
      throw Object.assign(new Error(`LLM request failed (${response.status}): ${errorBody}`), { code: 'ERR_LLM_INFERENCE_FAILURE' });
    }

    const data: OpenAIResponseBody = await response.json() as OpenAIResponseBody;
    const choice = data.choices?.[0];

    if (!choice) {
      throw Object.assign(new Error('LLM returned no choices'), { code: 'ERR_LLM_INFERENCE_FAILURE' });
    }

    return {
      content: choice.message.content || '',
      finishReason: choice.finish_reason === 'length' ? 'length' : 'stop',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(Object.assign(new Error('Request aborted'), { code: 'ERR_LLM_TIMEOUT' }));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(Object.assign(new Error('Request aborted'), { code: 'ERR_LLM_TIMEOUT' }));
    }, { once: true });
  });
}
