import { LLMProvider } from './provider';
import { NoopProvider } from './noop-provider';
import { OpenAIChatProvider } from './openai-provider';

export function createProvider(modelName?: string, apiKey?: string): LLMProvider {
  if (!apiKey) {
    return new NoopProvider();
  }

  const normalizedModel = (modelName || '').toLowerCase();

  if (normalizedModel.startsWith('gpt') || normalizedModel.startsWith('o3') || normalizedModel.startsWith('o4')) {
    return new OpenAIChatProvider(apiKey);
  }

  if (normalizedModel.includes('azure')) {
    return new OpenAIChatProvider(apiKey, process.env.AZURE_OPENAI_ENDPOINT || 'https://api.openai.com/v1');
  }

  return new OpenAIChatProvider(apiKey);
}
