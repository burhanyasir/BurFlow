import { ModelAdapter } from '../provider';
import { GeneratorInput, ProviderConfig, GeneratorOutput, StreamChunk } from '../types';
import { buildPromptMessages } from '../prompt-builder';

function parseOutput(content: string): GeneratorOutput {
  const fallback: GeneratorOutput = {
    response: content || '',
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
      confidence: parsed.confidence ?? 0.7,
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

export class LocalModelAdapter implements ModelAdapter {
  constructor(private baseUrl = process.env.LOCAL_LLM_URL || 'http://localhost:11434') {}

  async generate(input: GeneratorInput, config: ProviderConfig, signal?: AbortSignal): Promise<GeneratorOutput> {
    const messages = buildPromptMessages(input);
    const start = performance.now();

    const body = { model: config.model, messages, temperature: config.temperature, max_tokens: config.maxTokens, stream: false };
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    const latencyMs = Math.round(performance.now() - start);

    if (!response.ok) {
      throw Object.assign(new Error(`Local model error: ${response.status}`), { code: 'ERR_LLM_INFERENCE_FAILURE' });
    }

    const data = await response.json() as any;
    const content = data.message?.content || data.response || '';
    const output = parseOutput(content);

    output.usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, provider: 'local', model: config.model, latencyMs };
    return output;
  }

  async *generateStream(input: GeneratorInput, config: ProviderConfig, signal?: AbortSignal): AsyncIterable<StreamChunk> {
    const messages = buildPromptMessages(input);

    const body = { model: config.model, messages, temperature: config.temperature, max_tokens: config.maxTokens, stream: true };
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            const delta = parsed.message?.content || parsed.response || '';
            const doneFlag = parsed.done;
            if (delta) yield { delta };
            if (doneFlag) yield { delta: '', finishReason: 'stop' };
          } catch {}
        }
      }
    } finally { reader.releaseLock(); }
  }
}
