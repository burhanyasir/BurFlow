import { GeneratorInput, ProviderConfig, GeneratorOutput, StreamChunk } from './types';

export interface ModelAdapter {
  generate(input: GeneratorInput, config: ProviderConfig, signal?: AbortSignal): Promise<GeneratorOutput>;
  generateStream(input: GeneratorInput, config: ProviderConfig, signal?: AbortSignal): AsyncIterable<StreamChunk>;
}

const PROVIDER_COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.01, output: 0.03 },
  'gpt-4o-mini': { input: 0.0015, output: 0.006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  'gemini-1.5-pro': { input: 0.0035, output: 0.0105 },
  'gemini-1.5-flash': { input: 0.0005, output: 0.0015 },
};

export function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const lower = model.toLowerCase();
  for (const [key, rates] of Object.entries(PROVIDER_COST_PER_1K_TOKENS)) {
    if (lower.includes(key)) {
      return (promptTokens / 1000) * rates.input + (completionTokens / 1000) * rates.output;
    }
  }
  return 0;
}

export function detectProvider(model: string): string {
  const lower = model.toLowerCase();
  if (lower.includes('gpt') || lower.includes('o3') || lower.includes('o4')) return 'openai';
  if (lower.includes('claude')) return 'anthropic';
  if (lower.includes('gemini')) return 'google';
  if (lower.includes('llama') || lower.includes('mistral') || lower.includes('mixtral')) return 'openrouter';
  if (lower.includes('local') || lower.includes('ollama')) return 'local';
  return 'unknown';
}
