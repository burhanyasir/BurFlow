import { Chunk, EmbeddingChunk, EmbeddingConfig, DEFAULT_EMBEDDING_CONFIG } from '../types';
import { EmbeddingProvider } from '../interfaces';

export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly model = 'mock-embedding-model';
  readonly embeddingVersion = '1.0.0';
  private embeddingDimension = 128;

  constructor(dimension?: number) {
    if (dimension) this.embeddingDimension = dimension;
  }

  async embed(chunks: Chunk[], config?: Partial<EmbeddingConfig>): Promise<EmbeddingChunk[]> {
    const effectiveConfig = { ...DEFAULT_EMBEDDING_CONFIG, ...config };
    const results: EmbeddingChunk[] = [];

    for (let i = 0; i < chunks.length; i += effectiveConfig.batchSize) {
      const batch = chunks.slice(i, i + effectiveConfig.batchSize);
      for (const chunk of batch) {
        results.push({ chunk, embedding: this.generateMockEmbedding(chunk.content) });
      }
    }

    return results;
  }

  async embedQuery(query: string, _config?: Partial<EmbeddingConfig>): Promise<number[]> {
    return this.generateMockEmbedding(query);
  }

  private generateMockEmbedding(text: string): number[] {
    const seed = this.hashCode(text);
    const embedding: number[] = [];
    for (let i = 0; i < this.embeddingDimension; i++) {
      embedding.push(Math.sin(seed * (i + 1)) * 0.5 + 0.5);
    }
    const magnitude = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    return embedding.map(v => v / magnitude);
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash;
  }
}
