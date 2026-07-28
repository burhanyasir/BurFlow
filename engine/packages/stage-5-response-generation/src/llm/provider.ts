export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface LLMResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  generate(messages: ChatMessage[], config: LLMConfig, signal?: AbortSignal): Promise<LLMResponse>;
}

export interface StreamChunk {
  delta: string;
  finishReason?: 'stop' | 'length';
}

export interface StreamingLLMProvider extends LLMProvider {
  generateStream(messages: ChatMessage[], config: LLMConfig, signal?: AbortSignal): AsyncIterable<StreamChunk>;
}
