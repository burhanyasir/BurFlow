import { LLMProvider, LLMConfig, LLMResponse, ChatMessage } from './provider';

export class NoopProvider implements LLMProvider {
  async generate(_messages: ChatMessage[], _config: LLMConfig, _signal?: AbortSignal): Promise<LLMResponse> {
    return { content: '[Noop response]', finishReason: 'stop' };
  }
}
