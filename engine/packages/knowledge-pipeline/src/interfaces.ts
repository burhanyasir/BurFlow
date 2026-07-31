import {
  ParsedDocument, NormalizedDocument, NormalizedSection, Chunk, ChunkingConfig,
  EmbeddingConfig, VectorRecord, VectorSearchResult, RetrievalQuery, RetrievalResult,
  ContextAssemblyResult, Citation, EvaluationResult, VersionedKnowledgeSnapshot,
  EmbeddingChunk,
} from './types';

export interface DocumentParser {
  parse(content: Buffer | string, originalName: string, tenantId: string, metadata?: Record<string, unknown>): Promise<ParsedDocument>;
  supports(sourceType: string): boolean;
}

export interface Normalizer {
  normalize(doc: ParsedDocument): Promise<NormalizedDocument>;
}

export interface Chunker {
  chunk(doc: NormalizedDocument, config?: Partial<ChunkingConfig>): Promise<Chunk[]>;
}

export interface EmbeddingProvider {
  embed(chunks: Chunk[], config?: Partial<EmbeddingConfig>): Promise<EmbeddingChunk[]>;
  embedQuery(query: string, config?: Partial<EmbeddingConfig>): Promise<number[]>;
  readonly model: string;
  readonly embeddingVersion: string;
}

export interface VectorStore {
  upsert(records: VectorRecord[]): Promise<void>;
  search(query: number[], tenantId: string, topK: number, threshold?: number, filters?: Record<string, unknown>, queryText?: string): Promise<VectorSearchResult[]>;
  softDelete(chunkIds: string[]): Promise<void>;
  hardDelete(chunkIds: string[]): Promise<void>;
  deleteByDocument(documentId: string, tenantId?: string): Promise<void>;
  deleteByTenant(tenantId: string): Promise<void>;
  getStats(tenantId: string): Promise<{ totalChunks: number; deletedChunks: number; activeChunks: number }>;
  reindex(records: VectorRecord[]): Promise<void>;
}

export interface KnowledgeStore {
  publishSnapshot(tenantId: string, chunks: Chunk[], embeddingVersion: string, embeddingModel: string, chunkingVersion: string): Promise<VersionedKnowledgeSnapshot>;
  getSnapshot(tenantId: string, knowledgeVersion: number): Promise<VersionedKnowledgeSnapshot | null>;
  getLatestVersion(tenantId: string): Promise<number>;
  getLatestSnapshot(tenantId: string): Promise<VersionedKnowledgeSnapshot | null>;
  listVersions(tenantId: string): Promise<number[]>;
  deleteSnapshot(tenantId: string, knowledgeVersion: number): Promise<void>;
}

export interface Retriever {
  retrieve(query: RetrievalQuery): Promise<RetrievalResult>;
}

export interface Reranker {
  rerank(query: string, results: VectorSearchResult[], topK: number): Promise<VectorSearchResult[]>;
}

export interface ContextAssembler {
  assemble(results: VectorSearchResult[], tokenBudget: number, documents: Map<string, { title: string; sourceType: string }>): Promise<ContextAssemblyResult>;
}

export interface Evaluator {
  evaluate(query: string, relevantChunkIds: string[], results: RetrievalResult): Promise<EvaluationResult>;
}

export interface KnowledgePublisher {
  publish(tenantId: string, chunks: Chunk[], embeddingVersion: string, embeddingModel: string, chunkingVersion: string): Promise<VersionedKnowledgeSnapshot>;
  getPublished(tenantId: string, knowledgeVersion?: number): Promise<VersionedKnowledgeSnapshot | null>;
  listPublished(tenantId: string): Promise<number[]>;
}

export interface WebCrawler {
  crawl(url: string, tenantId: string, options?: { respectRobotsTxt?: boolean; maxDepth?: number; maxPages?: number }): Promise<ParsedDocument[]>;
}
