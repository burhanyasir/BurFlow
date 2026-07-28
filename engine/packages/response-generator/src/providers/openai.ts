import { ModelAdapter } from '../provider';
import { GeneratorInput, ProviderConfig, GeneratorOutput, StreamChunk } from '../types';
import { buildPromptMessages } from '../prompt-builder';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 200;

function parseOutput(content: string, fallbackResponse: string): GeneratorOutput {
  const fallback: GeneratorOutput = {
    response: content || fallbackResponse,
    updatedCta: { primaryCTA: 'none', label: '', link: '' },
    suggestedQuickReplies: [],
    confidence: 0.5,
    safetyFlags: [],
    reasoning: { tone: 'neutral', salesPressure: 'low', knowledgeReferenced: [], ctaTiming: 'neutral', followUpSupported: true },
  };
  try {
    const parsed = JSON.parse(content);
    if (!parsed.response) return fallback;
    return {
      response: parsed.response,
      updatedCta: parsed.cta || { primaryCTA: 'none', label: '', link: '' },
      suggestedQuickReplies: parsed.quickReplies || [],
      confidence: parsed.confidence ?? 0.8,
      safetyFlags: parsed.safetyFlags || [],
      reasoning: {
        tone: parsed.reasoning?.tone || 'neutral',
        salesPressure: parsed.reasoning?.salesPressure || 'low',
        objectionHandled: parsed.reasoning?.objectionHandled,
        knowledgeReferenced: parsed.reasoning?.knowledgeReferenced || [],
        ctaTiming: parsed.reasoning?.ctaTiming || 'neutral',
        followUpSupported: parsed.reasoning?.followUpSupported ?? true,
      },
    };
  } catch {}
  return fallback;
}

export class OpenAIAdapter implements ModelAdapter {
  constructor(private baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1') {}

  async generate(input: GeneratorInput, config: ProviderConfig, signal?: AbortSignal): Promise<GeneratorOutput> {
    const messages = buildPromptMessages(input);
    const apiKey = config.apiKey || process.env.LLM_API_KEY || '';
    const baseUrl = config.baseUrl || this.baseUrl;
    let lastError: Error | null = null;
    let retries = 0;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (signal?.aborted) throw Object.assign(new Error('Request aborted'), { code: 'ERR_LLM_TIMEOUT' });
      try {
        const start = performance.now();
        const body = { model: config.model, messages, temperature: config.temperature, max_tokens: config.maxTokens };
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify(body),
          signal,
        });
        const latencyMs = Math.round(performance.now() - start);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          if (response.status === 429) { lastError = Object.assign(new Error(`Rate limited: ${errorBody}`), { code: 'ERR_LLM_OVERLOADED' }); retries++; continue; }
          if (response.status >= 500) { lastError = Object.assign(new Error(`Server error: ${errorBody}`), { code: 'ERR_LLM_PROVIDER_UNAVAILABLE' }); retries++; continue; }
          throw Object.assign(new Error(`Request failed: ${errorBody}`), { code: 'ERR_LLM_INFERENCE_FAILURE' });
        }

        const data = await response.json() as any;
        const choice = data.choices?.[0];
        if (!choice) throw Object.assign(new Error('No choices in response'), { code: 'ERR_LLM_INFERENCE_FAILURE' });

        const content = choice.message?.content || '';
        const output = parseOutput(content, input.currentCta.primaryCTA || '');

        output.usage = data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
          provider: 'openai',
          model: config.model,
          latencyMs,
        } : { promptTokens: 0, completionTokens: 0, totalTokens: 0, provider: 'openai', model: config.model, latencyMs };

        return output;
      } catch (err: any) {
        if (err.code === 'ERR_LLM_OVERLOADED' && attempt < MAX_RETRIES) {
          await sleep(BASE_DELAY_MS * Math.pow(2, attempt), signal);
          retries++;
          continue;
        }
        throw err;
      }
    }
    throw lastError || new Error('Max retries exceeded');
  }

  async *generateStream(input: GeneratorInput, config: ProviderConfig, signal?: AbortSignal): AsyncIterable<StreamChunk> {
    const messages = buildPromptMessages(input);
    const apiKey = config.apiKey || process.env.LLM_API_KEY || '';

    const body = { model: config.model, messages, temperature: config.temperature, max_tokens: config.maxTokens, stream: true };
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) throw Object.assign(new Error(`Stream request failed: ${response.status}`), { code: 'ERR_LLM_INFERENCE_FAILURE' });
    if (!response.body) throw Object.assign(new Error('No response body'), { code: 'ERR_LLM_INFERENCE_FAILURE' });

    const reader = response.body.getReader();
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
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            const finishReason = parsed.choices?.[0]?.finish_reason;
            if (delta || finishReason) yield { delta, finishReason: finishReason === 'stop' ? 'stop' : finishReason === 'length' ? 'length' : undefined };
          } catch {}
        }
      }
    } finally { reader.releaseLock(); }
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(Object.assign(new Error('Aborted'), { code: 'ERR_LLM_TIMEOUT' })); return; }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(Object.assign(new Error('Aborted'), { code: 'ERR_LLM_TIMEOUT' })); }, { once: true });
  });
}
