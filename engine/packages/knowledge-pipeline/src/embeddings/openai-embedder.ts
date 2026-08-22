import { Chunk, EmbeddingChunk, EmbeddingConfig, DEFAULT_EMBEDDING_CONFIG } from '../types';
import { EmbeddingProvider } from '../interfaces';

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly model: string;
  readonly embeddingVersion = '1.0.0';
  private apiKey: string;
  private apiUrl: string;
  private fetchTimeoutMs: number;

  constructor(apiKey: string, model = 'text-embedding-3-small', fetchTimeoutMs = 30000, apiUrl?: string) {
    this.apiKey = apiKey;
    this.model = model;
    this.apiUrl = apiUrl || 'https://api.openai.com/v1/embeddings';
    this.fetchTimeoutMs = fetchTimeoutMs;
  }

  async embed(chunks: Chunk[], config?: Partial<EmbeddingConfig>): Promise<EmbeddingChunk[]> {
    const effectiveConfig = { ...DEFAULT_EMBEDDING_CONFIG, ...config };
    const results: EmbeddingChunk[] = [];

    for (let i = 0; i < chunks.length; i += effectiveConfig.batchSize) {
      const batch = chunks.slice(i, i + effectiveConfig.batchSize);
      const texts = batch.map(c => c.content.slice(0, 8191));
      const embeddings = await this.embedTextsWithRetry(texts, effectiveConfig);
      for (let j = 0; j < batch.length; j++) {
        results.push({ chunk: batch[j], embedding: embeddings[j] || [] });
      }
    }

    return results;
  }

  async embedQuery(query: string, config?: Partial<EmbeddingConfig>): Promise<number[]> {
    const effectiveConfig = { ...DEFAULT_EMBEDDING_CONFIG, ...config };
    const embeddings = await this.embedTextsWithRetry([query.slice(0, 8191)], effectiveConfig);
    return embeddings[0] || [];
  }

  private async embedTextsWithRetry(texts: string[], config: EmbeddingConfig): Promise<number[][]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.retryCount; attempt++) {
      try {
        return await this.embedTexts(texts);
      } catch (err: any) {
        lastError = err;
        if (attempt < config.retryCount && this.isRetryable(err)) {
          const retryAfter = this.getRetryAfter(err);
          const delay = retryAfter ?? config.retryDelayMs * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, delay));
        } else if (!this.isRetryable(err)) {
          throw err;
        }
      }
    }

    throw lastError || new Error('Embedding failed');
  }

  private isRetryable(err: any): boolean {
    const status = err?.status || err?.response?.status;
    if (!status) return true;
    return status === 429 || status >= 500;
  }

  private getRetryAfter(err: any): number | null {
    const header = err?.headers?.['retry-after'] || err?.response?.headers?.get?.('retry-after');
    if (header) {
      const seconds = parseInt(header, 10);
      if (!isNaN(seconds)) return seconds * 1000;
    }
    return null;
  }

  private async embedTexts(texts: string[]): Promise<number[][]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.fetchTimeoutMs);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: texts, model: this.model }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error: any = new Error(`OpenAI embedding error: ${response.status} ${response.statusText}`);
        error.status = response.status;
        error.headers = Object.fromEntries(response.headers.entries());
        throw error;
      }

      const data = await response.json() as any;
      return data.data
        .sort((a: any, b: any) => a.index - b.index)
        .map((d: any) => d.embedding);
    } finally {
      clearTimeout(timeout);
    }
  }
}
