export type SourceType = 'pdf' | 'docx' | 'text' | 'markdown' | 'html' | 'faq' | 'url';

export type DocumentStatus = 'queued' | 'parsing' | 'normalizing' | 'chunking' | 'embedding' | 'indexed' | 'published' | 'failed';

export interface ParsedDocument {
  documentId: string;
  tenantId: string;
  sourceType: SourceType;
  originalName: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  contentHash: string;
  headings: HeadingInfo[];
  lists: ListInfo[];
  tables: TableInfo[];
  createdAt: string;
  updatedAt: string;
}

export interface HeadingInfo {
  level: number;
  text: string;
  position: number;
}

export interface ListInfo {
  items: string[];
  ordered: boolean;
  position: number;
}

export interface TableInfo {
  headers: string[];
  rows: string[][];
  position: number;
}

export interface NormalizedDocument {
  documentId: string;
  tenantId: string;
  sourceType: SourceType;
  originalName: string;
  title: string;
  sections: NormalizedSection[];
  metadata: Record<string, unknown>;
  contentHash: string;
}

export interface NormalizedSection {
  sectionPath: string;
  heading: string;
  level: number;
  content: string;
  position: number;
}

export interface Chunk {
  chunkId: string;
  tenantId: string;
  documentId: string;
  documentVersion: number;
  parentChunkId: string | null;
  sectionPath: string;
  content: string;
  tokenCount: number;
  checksum: string;
  position: number;
  metadata: Record<string, unknown>;
}

export interface ChunkingConfig {
  chunkSize: number;
  overlap: number;
  chunkingVersion: string;
  headingAware: boolean;
  semantic: boolean;
  maxTokensPerChunk: number;
}

export interface EmbeddingChunk {
  chunk: Chunk;
  embedding: number[];
}

export interface EmbeddingConfig {
  embeddingVersion: string;
  model: string;
  batchSize: number;
  retryCount: number;
  retryDelayMs: number;
}

export interface VersionedKnowledgeSnapshot {
  knowledgeVersion: number;
  tenantId: string;
  embeddingVersion: string;
  embeddingModel: string;
  chunkingVersion: string;
  chunks: Chunk[];
  publishedAt: string;
}

export interface VectorRecord {
  chunkId: string;
  tenantId: string;
  documentId: string;
  knowledgeVersion: number;
  embeddingVersion: string;
  embeddingModel: string;
  chunkingVersion: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  deleted: boolean;
}

export interface VectorSearchResult {
  chunkId: string;
  documentId: string;
  tenantId: string;
  score: number;
  content: string;
  metadata: Record<string, unknown>;
}

export interface RetrievalQuery {
  query: string;
  tenantId: string;
  knowledgeVersion?: number;
  topK: number;
  threshold: number;
  metadataFilters?: Record<string, unknown>;
  useHybridSearch?: boolean;
  useReranker?: boolean;
}

export interface RetrievalResult {
  chunks: VectorSearchResult[];
  query: string;
  retrievalTimeMs: number;
  totalCandidates: number;
  usedReranker: boolean;
  usedHybridSearch: boolean;
}

export interface EvidenceCitation {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  sourceType: SourceType;
  sectionPath: string;
  snippet: string;
  score: number;
  confidence: number;
  sourceStrength?: number;
}

export interface ContextAssemblyResult {
  context: string;
  chunks: VectorSearchResult[];
  tokenCount: number;
  citations: EvidenceCitation[];
}

export interface Citation {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  sourceType: SourceType;
  sectionPath: string;
  snippet: string;
}

export interface EvaluationResult {
  recallAtK: number;
  precisionAtK: number;
  mrr: number;
  ndcgAtK: number;
  hitRate: number;
  retrievalLatencyMs: number;
  duplicateChunkRatio: number;
  emptyRetrievalRate: number;
}

export interface QueueItem {
  documentId: string;
  tenantId: string;
  sourceType: SourceType;
  originalName: string;
  status: DocumentStatus;
  error?: string;
  queuedAt: string;
  updatedAt: string;
}

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  chunkSize: 512,
  overlap: 64,
  chunkingVersion: '1.0.0',
  headingAware: true,
  semantic: false,
  maxTokensPerChunk: 2048,
};

export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  embeddingVersion: '1.0.0',
  model: 'text-embedding-3-small',
  batchSize: 20,
  retryCount: 3,
  retryDelayMs: 200,
};
