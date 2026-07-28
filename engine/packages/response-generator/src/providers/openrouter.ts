import { ModelAdapter } from '../provider';
import { GeneratorInput, ProviderConfig, GeneratorOutput, StreamChunk } from '../types';
import { buildPromptMessages } from '../prompt-builder';

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

export class OpenRouterAdapter implements ModelAdapter {
  constructor(private baseUrl = 'https://openrouter.ai/api/v1') {}

  async generate(input: GeneratorInput, config: ProviderConfig, signal?: AbortSignal): Promise<GeneratorOutput> {
    const messages = buildPromptMessages(input);
    const apiKey = config.apiKey || process.env.OPENROUTER_API_KEY || '';
    const start = performance.now();

    const body = { model: config.model, messages, temperature: config.temperature, max_tokens: config.maxTokens };
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': 'https://conversation-engine.local', 'X-Title': 'Conversation Engine' },
      body: JSON.stringify(body),
      signal,
    });
    const latencyMs = Math.round(performance.now() - start);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw Object.assign(new Error(`OpenRouter error: ${errorBody}`), { code: response.status === 429 ? 'ERR_LLM_OVERLOADED' : 'ERR_LLM_INFERENCE_FAILURE' });
    }

    const data = await response.json() as any;
    const choice = data.choices?.[0];
    if (!choice) throw Object.assign(new Error('No choices'), { code: 'ERR_LLM_INFERENCE_FAILURE' });

    const content = choice.message?.content || '';
    const output = parseOutput(content, '');

    output.usage = data.usage ? {
      promptTokens: data.usage.prompt_tokens || 0,
      completionTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0,
      provider: 'openrouter',
      model: config.model,
      latencyMs,
    } : { promptTokens: 0, completionTokens: 0, totalTokens: 0, provider: 'openrouter', model: config.model, latencyMs };

    return output;
  }

  async *generateStream(input: GeneratorInput, config: ProviderConfig, signal?: AbortSignal): AsyncIterable<StreamChunk> {
    const messages = buildPromptMessages(input);
    const apiKey = config.apiKey || process.env.OPENROUTER_API_KEY || '';

    const body = { model: config.model, messages, temperature: config.temperature, max_tokens: config.maxTokens, stream: true };
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) throw Object.assign(new Error(`Stream failed: ${response.status}`), { code: 'ERR_LLM_INFERENCE_FAILURE' });
    if (!response.body) throw Object.assign(new Error('No body'), { code: 'ERR_LLM_INFERENCE_FAILURE' });

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
          if (!trimmed.startsWith('data: ')) continue;
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
