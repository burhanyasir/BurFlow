import { StreamingLLMProvider, LLMConfig, LLMResponse, ChatMessage, StreamChunk } from './provider';

interface OpenAIStreamChunk {
  choices: Array<{
    delta: { content?: string };
    finish_reason: 'stop' | 'length' | null;
  }>;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 200;

export class StreamingOpenAIChatProvider implements StreamingLLMProvider {
  constructor(
    private apiKey: string,
    private baseUrl = 'https://api.openai.com/v1',
    private maxRetries = MAX_RETRIES,
  ) {}

  async generate(messages: ChatMessage[], config: LLMConfig, signal?: AbortSignal): Promise<LLMResponse> {
    let content = '';
    let finishReason: 'stop' | 'length' = 'stop';

    for await (const chunk of this.generateStream(messages, config, signal)) {
      content += chunk.delta;
      if (chunk.finishReason) {
        finishReason = chunk.finishReason;
      }
    }

    return { content, finishReason };
  }

  async *generateStream(messages: ChatMessage[], config: LLMConfig, signal?: AbortSignal): AsyncIterable<StreamChunk> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (signal?.aborted) {
        throw Object.assign(new Error('Request aborted'), { code: 'ERR_LLM_TIMEOUT' });
      }

      try {
        yield* this.doStream(messages, config, signal);
        return;
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

  private async *doStream(messages: ChatMessage[], config: LLMConfig, signal?: AbortSignal): AsyncIterable<StreamChunk> {
    const body = {
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: true,
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

    const reader = response.body?.getReader();
    if (!reader) {
      throw Object.assign(new Error('Response body not readable'), { code: 'ERR_LLM_INFERENCE_FAILURE' });
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed: OpenAIStreamChunk = JSON.parse(data);
            const choice = parsed.choices?.[0];
            if (!choice) continue;

            const delta = choice.delta?.content || '';
            const finishReason = choice.finish_reason || undefined;

            yield { delta, finishReason };
          } catch {
            // Skip malformed SSE chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
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
