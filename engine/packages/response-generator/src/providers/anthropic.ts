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

export class AnthropicAdapter implements ModelAdapter {
  constructor(private baseUrl = 'https://api.anthropic.com/v1') {}

  async generate(input: GeneratorInput, config: ProviderConfig, signal?: AbortSignal): Promise<GeneratorOutput> {
    const messages = buildPromptMessages(input);
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
    const start = performance.now();

    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const chatMessages = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user' as const, content: m.content }));

    const body = { model: config.model, max_tokens: config.maxTokens, temperature: config.temperature, system: systemMsg, messages: chatMessages };
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body),
      signal,
    });
    const latencyMs = Math.round(performance.now() - start);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw Object.assign(new Error(`Anthropic API error: ${errorBody}`), { code: response.status === 429 ? 'ERR_LLM_OVERLOADED' : 'ERR_LLM_INFERENCE_FAILURE' });
    }

    const data = await response.json() as any;
    const content = data.content?.[0]?.text || '';
    const output = parseOutput(content, '');

    output.usage = data.usage ? {
      promptTokens: data.usage.input_tokens || 0,
      completionTokens: data.usage.output_tokens || 0,
      totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
      provider: 'anthropic',
      model: config.model,
      latencyMs,
    } : { promptTokens: 0, completionTokens: 0, totalTokens: 0, provider: 'anthropic', model: config.model, latencyMs };

    return output;
  }

  async *generateStream(input: GeneratorInput, config: ProviderConfig, signal?: AbortSignal): AsyncIterable<StreamChunk> {
    const messages = buildPromptMessages(input);
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const chatMessages = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user' as const, content: m.content }));

    const body = { model: config.model, max_tokens: config.maxTokens, temperature: config.temperature, system: systemMsg, messages: chatMessages, stream: true };
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
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
            if (parsed.type === 'content_block_delta') yield { delta: parsed.delta?.text || '' };
            if (parsed.type === 'message_stop') yield { delta: '', finishReason: 'stop' };
          } catch {}
        }
      }
    } finally { reader.releaseLock(); }
  }
}
