import { NormalizedDocument, NormalizedSection, Chunk, ChunkingConfig, DEFAULT_CHUNKING_CONFIG } from '../types';
import { Chunker } from '../interfaces';
import { createHash } from 'crypto';

export class ContentChunker implements Chunker {
  private config: ChunkingConfig;

  constructor(config?: Partial<ChunkingConfig>) {
    this.config = { ...DEFAULT_CHUNKING_CONFIG, ...config };
  }

  async chunk(doc: NormalizedDocument, config?: Partial<ChunkingConfig>): Promise<Chunk[]> {
    const effectiveConfig = { ...this.config, ...config };
    const chunks: Chunk[] = [];

    if (effectiveConfig.headingAware) {
      for (const section of doc.sections) {
        const sectionChunks = this.chunkSection(section, doc, effectiveConfig);
        chunks.push(...sectionChunks);
      }
    } else {
      const flatContent = doc.sections.map(s => s.content).join('\n\n');
      chunks.push(...this.chunkText(flatContent, doc, '', 1, effectiveConfig));
    }

    return chunks;
  }

  private chunkSection(section: NormalizedSection, doc: NormalizedDocument, config: ChunkingConfig): Chunk[] {
    if (this.estimateTokens(section.content) <= config.maxTokensPerChunk) {
      return [this.makeChunk(section.content, doc, section.sectionPath, section.position, null, config)];
    }

    return this.chunkText(section.content, doc, section.sectionPath, section.position, config);
  }

  private chunkText(text: string, doc: NormalizedDocument, sectionPath: string, basePosition: number, config: ChunkingConfig): Chunk[] {
    const chunks: Chunk[] = [];
    const words = text.split(/\s+/);
    const targetWords = Math.floor(config.chunkSize / 1.3);
    const overlapWords = Math.floor(config.overlap / 1.3);
    let start = 0;

    while (start < words.length) {
      const end = Math.min(start + targetWords, words.length);
      const content = words.slice(start, end).join(' ');

      if (content.trim()) {
        chunks.push(this.makeChunk(content, doc, sectionPath, basePosition + chunks.length, null, config));
      }

      start += targetWords - overlapWords;
      if (start >= words.length) break;
      if (start + targetWords > words.length) start = Math.max(start, words.length - targetWords);
    }

    return chunks;
  }

  private makeChunk(content: string, doc: NormalizedDocument, sectionPath: string, position: number, parentChunkId: string | null, config: ChunkingConfig): Chunk {
    const tokenCount = this.estimateTokens(content);
    const chunkId = this.generateChunkId(doc.documentId, sectionPath, position);
    const checksum = createHash('sha256').update(content).digest('hex');

    return {
      chunkId,
      tenantId: doc.tenantId,
      documentId: doc.documentId,
      documentVersion: 1,
      parentChunkId,
      sectionPath,
      content,
      tokenCount,
      checksum,
      position,
      metadata: {
        sourceType: doc.sourceType,
        originalName: doc.originalName,
        title: doc.title,
        chunkingVersion: config.chunkingVersion,
      },
    };
  }

  generateChunkId(documentId: string, sectionPath: string, position: number): string {
    const raw = `${documentId}::${sectionPath}::${position}`;
    return createHash('sha256').update(raw).digest('hex').slice(0, 16);
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
