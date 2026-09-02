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
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    const targetTokens = config.chunkSize;
    const overlapTokens = config.overlap;

    let currentChunkContent = '';
    let currentTokens = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const pTokens = this.estimateTokens(p);

      // If a single paragraph is too huge, split it by sentences
      if (pTokens > targetTokens) {
        if (currentChunkContent) {
          chunks.push(this.makeChunk(currentChunkContent.trim(), doc, sectionPath, basePosition + chunks.length, null, config));
          currentChunkContent = '';
          currentTokens = 0;
        }

        const sentences = p.split(/(?<=[.?!])\s+/);
        for (const sentence of sentences) {
          const sTokens = this.estimateTokens(sentence);
          if (currentTokens + sTokens > targetTokens && currentTokens > 0) {
            chunks.push(this.makeChunk(currentChunkContent.trim(), doc, sectionPath, basePosition + chunks.length, null, config));
            // Keep overlap
            const words = currentChunkContent.split(/\s+/);
            currentChunkContent = words.slice(-Math.floor(overlapTokens / 1.3)).join(' ') + ' ' + sentence;
            currentTokens = this.estimateTokens(currentChunkContent);
          } else {
            currentChunkContent = currentChunkContent ? currentChunkContent + ' ' + sentence : sentence;
            currentTokens += sTokens;
          }
        }
      } else {
        if (currentTokens + pTokens > targetTokens && currentTokens > 0) {
          chunks.push(this.makeChunk(currentChunkContent.trim(), doc, sectionPath, basePosition + chunks.length, null, config));
          // Overlap: keep the last paragraph if small, else just overlap tokens
          currentChunkContent = pTokens < overlapTokens ? paragraphs[i-1] + '\n\n' + p : p;
          currentTokens = this.estimateTokens(currentChunkContent);
        } else {
          currentChunkContent = currentChunkContent ? currentChunkContent + '\n\n' + p : p;
          currentTokens += pTokens;
        }
      }
    }

    if (currentChunkContent.trim()) {
      chunks.push(this.makeChunk(currentChunkContent.trim(), doc, sectionPath, basePosition + chunks.length, null, config));
    }

    return chunks;
  }

  private makeChunk(content: string, doc: NormalizedDocument, sectionPath: string, position: number, parentChunkId: string | null, config: ChunkingConfig): Chunk {
    const tokenCount = this.estimateTokens(content);
    const chunkId = this.generateChunkId(doc.documentId, sectionPath, position);
    const checksum = createHash('sha256').update(content).digest('hex');

    // Classification / quality scoring for RAG
    const lowerContent = content.toLowerCase();
    const sourceUrl = (doc.metadata?.sourceUrl as string || '').toLowerCase();
    let qualityScore = 1.0;
    
    if (lowerContent.includes('price') || lowerContent.includes('cost') || lowerContent.includes('plan') || sourceUrl.includes('pricing')) {
      qualityScore += 0.5;
    }
    if (lowerContent.includes('faq') || lowerContent.includes('frequently asked') || sourceUrl.includes('faq') || /\?\s*[a-z]/i.test(content)) {
      qualityScore += 0.4;
    }
    if (lowerContent.includes('contact') || lowerContent.includes('email') || lowerContent.includes('phone') || sourceUrl.includes('contact')) {
      qualityScore += 0.3;
    }
    if (doc.title?.toLowerCase().includes('home') && position === 1) {
      qualityScore += 0.6; // High priority to homepage hero/intro
    }

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
        qualityScore,
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
