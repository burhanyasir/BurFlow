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
    const sanitizedQuery = query.query.trim();

    if (!sanitizedQuery) {
      return {
        chunks: [],
        query: query.query,
        retrievalTimeMs: performance.now() - startTime,
        totalCandidates: 0,
        usedReranker: query.useReranker || false,
        usedHybridSearch: query.useHybridSearch || false,
      };
    }

    const queryEmbedding = await this.embedder.embedQuery(sanitizedQuery);

    let results = await this.vectorStore.search(
      queryEmbedding,
      query.tenantId,
      query.useHybridSearch ? query.topK * 3 : query.topK,
      query.threshold,
      query.metadataFilters,
      query.useHybridSearch ? sanitizedQuery : undefined,
    );

    const totalCandidates = results.length;

    if (query.useReranker && this.reranker && results.length > 0) {
      results = await this.reranker.rerank(sanitizedQuery, results, query.topK);
    } else {
      results = results.slice(0, query.topK);
    }

    const enhancedResults = results.map(r => ({
      ...r,
      confidence: Math.min(1, Math.max(0, r.score)),
    }));

    const retrievalTimeMs = performance.now() - startTime;

    return {
      chunks: enhancedResults,
      query: query.query,
      retrievalTimeMs,
      totalCandidates,
      usedReranker: query.useReranker || false,
      usedHybridSearch: query.useHybridSearch || false,
    };
  }
}
