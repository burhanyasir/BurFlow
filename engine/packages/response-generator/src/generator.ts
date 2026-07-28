import { GeneratorInput, ProviderConfig, GeneratorOutput, CacheConfig, ModelAdapter } from './types';
import { detectProvider } from './provider';
import { OpenAIAdapter } from './providers/openai';
import { AnthropicAdapter } from './providers/anthropic';
import { OpenRouterAdapter } from './providers/openrouter';
import { LocalModelAdapter } from './providers/local';
import { ResponseCache } from './cache';
import { Telemetry, estimateCost } from './telemetry';

export interface GeneratorConfig {
  cache?: CacheConfig;
  fallbackResponse?: string;
  maxRetries?: number;
  llmBaseUrl?: string;
}

export class ResponseGenerator {
  private cache: ResponseCache;
  private telemetry: Telemetry;
  private fallbackResponse: string;
  private maxRetries: number;
  private config: GeneratorConfig;

  constructor(config: GeneratorConfig = {}) {
    this.config = config;
    this.cache = new ResponseCache(config.cache || { enabled: true, ttlMs: 60000, maxEntries: 500 });
    this.telemetry = new Telemetry();
    this.fallbackResponse = config.fallbackResponse || 'I apologize, but I\'m having trouble processing your request right now. Please try again in a moment.';
    this.maxRetries = config.maxRetries ?? 2;
  }

  private resolveAdapter(model: string): ModelAdapter {
    const provider = detectProvider(model);
    switch (provider) {
      case 'anthropic': return new AnthropicAdapter();
      case 'openrouter': return new OpenRouterAdapter();
      case 'local': return new LocalModelAdapter();
      default: return new OpenAIAdapter(this.llmBaseUrl);
    }
  }

  private get llmBaseUrl(): string | undefined {
    return this.config?.llmBaseUrl || process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL;
  }

  async generate(input: GeneratorInput, signal?: AbortSignal): Promise<GeneratorOutput> {
    const start = performance.now();
    const model = input.tenantConfig?.model || 'gpt-4o-mini';
    const provider = detectProvider(model);

    // Check cache
    const cached = this.cache.get(input);
    if (cached) {
      this.telemetry.record({
        provider, model, latencyMs: 0, promptTokens: 0, completionTokens: 0,
        totalTokens: 0, estimatedCost: 0, success: true, cached: true, retries: 0,
      });
      return cached;
    }

    // Resolve config
    const baseUrl = this.llmBaseUrl;
    const config: ProviderConfig = {
      model,
      temperature: input.tenantConfig?.temperature ?? 0.7,
      maxTokens: input.tenantConfig?.maxTokens ?? 1024,
      ...(baseUrl ? { baseUrl } : {}),
    };

    const adapter = this.resolveAdapter(model);
    let lastError: Error | null = null;
    let retries = 0;

    for (let attempt = 0; attempt <= this.maxRetries + 1; attempt++) {
      if (signal?.aborted) {
        return this.buildFallback(input, 'Request aborted');
      }

      try {
        const output = await adapter.generate(input, config, signal);
        const latencyMs = Math.round(performance.now() - start);

        const usage = output.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0, provider, model, latencyMs };
        const cost = estimateCost(provider, model, usage.promptTokens, usage.completionTokens);

        this.telemetry.record({
          provider, model, latencyMs,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          estimatedCost: cost, success: true, retries, cached: false,
        });

        this.cache.set(input, output);
        return output;
      } catch (err: any) {
        lastError = err;
        retries++;
        const isRetryable = err.code === 'ERR_LLM_OVERLOADED' || err.code === 'ERR_LLM_PROVIDER_UNAVAILABLE';
        if (isRetryable && attempt < this.maxRetries) {
          await sleep(500 * Math.pow(2, attempt));
          continue;
        }
        break;
      }
    }

    // All retries exhausted — fallback
    const latencyMs = Math.round(performance.now() - start);
    this.telemetry.record({
      provider, model, latencyMs, promptTokens: 0, completionTokens: 0,
      totalTokens: 0, estimatedCost: 0, success: false,
      error: lastError?.message || 'Unknown error', retries, cached: false,
    });

    return this.buildFallback(input, lastError?.message || 'LLM unavailable');
  }

  async *generateStream(input: GeneratorInput, signal?: AbortSignal): AsyncIterable<GeneratorOutput | StreamChunk> {
    const model = input.tenantConfig?.model || 'gpt-4o-mini';
    const adapter = this.resolveAdapter(model);
    const config: ProviderConfig = {
      model,
      temperature: input.tenantConfig?.temperature ?? 0.7,
      maxTokens: input.tenantConfig?.maxTokens ?? 1024,
    };

    try {
      const stream = adapter.generateStream(input, config, signal);
      let fullContent = '';

      for await (const chunk of stream) {
        fullContent += chunk.delta;
        yield chunk;
      }

      // After stream completes, yield the full output
      yield {
        type: 'complete' as const,
        response: fullContent,
        cta: { primaryCTA: 'none', label: '', link: '' },
        quickReplies: [],
        confidence: 0.8,
        safetyFlags: [],
        reasoning: { tone: 'neutral', salesPressure: 'low', knowledgeReferenced: [], ctaTiming: 'neutral', followUpSupported: true },
      } as unknown as StreamChunk;
    } catch {
      const fallback = this.buildFallback(input, 'Stream failed');
      yield { delta: fallback.response, finishReason: 'stop' };
    }
  }

  private buildFallback(input: GeneratorInput, reason: string): GeneratorOutput {
    return {
      response: this.fallbackResponse,
      updatedCta: input.currentCta.primaryCTA !== 'none' ? input.currentCta : { primaryCTA: 'none', label: '', link: '' },
      suggestedQuickReplies: input.quickReplies.slice(0, 3),
      confidence: 0.1,
      safetyFlags: ['fallback_triggered'],
      reasoning: {
        tone: 'neutral',
        salesPressure: 'low',
        knowledgeReferenced: [],
        ctaTiming: 'defer',
        followUpSupported: true,
      },
    };
  }

  getTelemetry(): Telemetry {
    return this.telemetry;
  }

  getCacheStats() {
    return this.cache.stats();
  }

  clearCache(): void {
    this.cache.clear();
  }
}

interface StreamChunk {
  delta: string;
  finishReason?: 'stop' | 'length';
  type?: 'complete';
  response?: string;
  cta?: any;
  quickReplies?: any[];
  confidence?: number;
  safetyFlags?: string[];
  reasoning?: any;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
