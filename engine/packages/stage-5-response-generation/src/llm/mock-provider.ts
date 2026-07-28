import { LLMProvider, LLMConfig, LLMResponse, ChatMessage } from './provider';

export class MockProvider implements LLMProvider {
  private responses: LLMResponse[] = [];
  private callCount = 0;
  private shouldThrow: Error | null = null;
  private delayMs = 0;

  setResponse(response: LLMResponse): void {
    this.responses = [response];
    this.callCount = 0;
  }

  setResponses(responses: LLMResponse[]): void {
    this.responses = responses;
    this.callCount = 0;
  }

  setThrow(error: Error): void {
    this.shouldThrow = error;
    this.callCount = 0;
  }

  setDelay(ms: number): void {
    this.delayMs = ms;
  }

  getCallCount(): number {
    return this.callCount;
  }

  getLastMessages(): ChatMessage[] | null {
    return this.lastMessages;
  }

  private lastMessages: ChatMessage[] | null = null;

  async generate(messages: ChatMessage[], _config: LLMConfig, signal?: AbortSignal): Promise<LLMResponse> {
    this.callCount++;
    this.lastMessages = messages;

    if (this.shouldThrow) {
      throw this.shouldThrow;
    }

    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    if (signal?.aborted) {
      throw Object.assign(new Error('Aborted'), { code: 'ERR_LLM_TIMEOUT' });
    }

    const idx = Math.min(this.callCount - 1, this.responses.length - 1);
    return this.responses[idx];
  }
}
