import { RetrievalQuery, RetrievalResult, VectorSearchResult } from '../types';
import { Retriever, EmbeddingProvider, VectorStore, Reranker } from '../interfaces';

export class KnowledgeRetriever implements Retriever {
  private embedder: EmbeddingProvider;
  private vectorStore: VectorStore;
  private reranker?: Reranker;

  constructor(embedder: EmbeddingProvider, vectorStore: VectorStore, reranker?: Reranker) {
    this.embedder = embedder;
    this.vectorStore = vectorStore;
    this.reranker = reranker;
  }

  async retrieve(query: RetrievalQuery): Promise<RetrievalResult> {
    const startTime = performance.now();

    const queryEmbedding = await this.embedder.embedQuery(query.query);

    let results = await this.vectorStore.search(
      queryEmbedding,
      query.tenantId,
      query.useHybridSearch ? query.topK * 3 : query.topK,
      query.threshold,
      query.metadataFilters,
      query.useHybridSearch ? query.query : undefined,
    );

    const totalCandidates = results.length;

    if (query.useReranker && this.reranker && results.length > 0) {
      results = await this.reranker.rerank(query.query, results, query.topK);
    } else {
      results = results.slice(0, query.topK);
    }

    const retrievalTimeMs = performance.now() - startTime;

    return {
      chunks: results,
      query: query.query,
      retrievalTimeMs,
      totalCandidates,
      usedReranker: query.useReranker || false,
      usedHybridSearch: query.useHybridSearch || false,
    };
  }
}
