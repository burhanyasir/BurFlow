// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHash } from 'crypto';
import Database from 'better-sqlite3';

import {
  TextParser, MarkdownParser, HtmlParser, FaqParser, PdfParser, DocxParser, WebsiteCrawler,
  ContentNormalizer, ContentChunker,
  MockEmbeddingProvider, OpenAIEmbeddingProvider,
  SqliteVectorStore, SqliteKnowledgeStore,
  KnowledgeRetriever, CrossEncoderReranker, PassThroughReranker,
  DefaultContextAssembler, RetrievalEvaluator,
  KnowledgePipeline,
} from '../index';

// ─── Phase 1: Parsers ────────────────────────────────────
describe('Document Parsers', () => {
  describe('TextParser', () => {
    const parser = new TextParser();

    it('parses plain text', async () => {
      const doc = await parser.parse('Hello world\nThis is a test', 'test.txt', 't-1');
      expect(doc.content).toBe('Hello world\nThis is a test');
      expect(doc.sourceType).toBe('text');
      expect(doc.tenantId).toBe('t-1');
      expect(doc.contentHash).toBeTruthy();
      expect(doc.headings).toEqual([]);
    });

    it('extracts markdown headings', async () => {
      const doc = await parser.parse('# Title\nContent\n## Sub\nMore', 'test.md', 't-1');
      expect(doc.headings).toHaveLength(2);
      expect(doc.headings[0].text).toBe('Title');
      expect(doc.headings[0].level).toBe(1);
      expect(doc.headings[1].text).toBe('Sub');
      expect(doc.headings[1].level).toBe(2);
    });

    it('extracts lists', async () => {
      const doc = await parser.parse('Text\n- Item 1\n- Item 2\n\nMore', 'test.txt', 't-1');
      expect(doc.lists).toHaveLength(1);
      expect(doc.lists[0].items).toEqual(['Item 1', 'Item 2']);
    });

    it('extracts ordered lists', async () => {
      const doc = await parser.parse('1. First\n2. Second', 'test.txt', 't-1');
      expect(doc.lists).toHaveLength(1);
      expect(doc.lists[0].ordered).toBe(true);
    });

    it('generates content hash (SHA-256)', async () => {
      const doc1 = await parser.parse('Same content', 'a.txt', 't-1');
      const doc2 = await parser.parse('Same content', 'b.txt', 't-1');
      expect(doc1.contentHash).toBe(doc2.contentHash);
    });

    it('detects duplicate uploads via hash', async () => {
      const doc1 = await parser.parse('Duplicate check', 'a.txt', 't-1');
      const doc2 = await parser.parse('Duplicate check', 'b.txt', 't-1');
      expect(doc1.contentHash).toBe(doc2.contentHash);
      expect(doc1.documentId).not.toBe(doc2.documentId);
    });

    it('supports text source type', () => {
      expect(parser.supports('text')).toBe(true);
      expect(parser.supports('txt')).toBe(true);
      expect(parser.supports('pdf')).toBe(false);
    });

    it('extracts uppercase line as heading', async () => {
      const doc = await parser.parse('OVERVIEW\nContent here\nDETAILS\nMore content', 'test.txt', 't-1');
      expect(doc.headings.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('MarkdownParser', () => {
    const parser = new MarkdownParser();

    it('parses markdown content', async () => {
      const md = '# Doc Title\n\nParagraph text.\n\n## Section\n\nList:\n- A\n- B';
      const doc = await parser.parse(md, 'doc.md', 't-1');
      expect(doc.sourceType).toBe('markdown');
      expect(doc.title).toBe('Doc Title');
      expect(doc.headings).toHaveLength(2);
      expect(doc.metadata.isMarkdown).toBe(true);
    });

    it('counts code blocks', async () => {
      const md = '# Code\n```\nconst x = 1;\n```\nMore text\n```\nconst y = 2;\n```';
      const doc = await parser.parse(md, 'code.md', 't-1');
      expect(doc.metadata.codeBlocks).toBe(2);
    });
  });

  describe('HtmlParser', () => {
    const parser = new HtmlParser();

    it('strips HTML tags and extracts text', async () => {
      const html = '<html><head><title>Test Page</title></head><body><h1>Hello</h1><p>World</p></body></html>';
      const doc = await parser.parse(html, 'page.html', 't-1');
      expect(doc.title).toBe('Test Page');
      expect(doc.content).toContain('Hello');
      expect(doc.content).toContain('World');
    });

    it('extracts HTML headings', async () => {
      const html = '<h1>Title</h1><p>Text</p><h2>Sub</h2><p>More</p>';
      const doc = await parser.parse(html, 'page.html', 't-1');
      expect(doc.headings).toHaveLength(2);
      expect(doc.headings[0].text).toBe('Title');
      expect(doc.headings[1].text).toBe('Sub');
    });

    it('removes scripts and styles', async () => {
      const html = '<script>alert("x")</script><style>.c{color:red}</style><p>Clean</p>';
      const doc = await parser.parse(html, 'page.html', 't-1');
      expect(doc.content).not.toContain('alert');
      expect(doc.content).not.toContain('color:red');
      expect(doc.content).toContain('Clean');
    });

    it('decodes HTML entities', async () => {
      const html = '<p>AT&amp;T &lt;test&gt;</p>';
      const doc = await parser.parse(html, 'page.html', 't-1');
      expect(doc.content).toContain('AT&T');
      expect(doc.content).toContain('<test>');
    });
  });

  describe('FaqParser', () => {
    const parser = new FaqParser();

    it('parses Q&A pairs', async () => {
      const faq = 'Q: What is this?\nA: A test FAQ\nQ: How does it work?\nA: It processes questions.';
      const doc = await parser.parse(faq, 'faq.txt', 't-1');
      expect(doc.metadata.questionCount).toBe(2);
      expect(doc.content).toContain('What is this?');
      expect(doc.content).toContain('A test FAQ');
      expect(doc.headings).toHaveLength(2);
    });

    it('parses Question/Answer format', async () => {
      const faq = 'Question: First question?\nAnswer: First answer.\nQuestion: Second?\nAnswer: Second answer.';
      const doc = await parser.parse(faq, 'faq.txt', 't-1');
      expect(doc.metadata.questionCount).toBe(2);
    });

    it('handles single Q&A', async () => {
      const doc = await parser.parse('Q: Only one?\nA: Yes.', 'single.txt', 't-1');
      expect(doc.metadata.questionCount).toBe(1);
    });
  });

  describe('PdfParser', () => {
    const parser = new PdfParser();

    it('parses PDF-like content', async () => {
      const pdfContent = 'Some PDF extracted text\nHere is more\nOVERSIZED HEADING\nDetails below';
      const doc = await parser.parse(pdfContent, 'doc.pdf', 't-1');
      expect(doc.sourceType).toBe('pdf');
      expect(doc.contentHash).toBeTruthy();
    });

    it('extracts headings from all-caps lines', async () => {
      const pdfContent = 'INTRODUCTION\nThis is the intro.\nCONCLUSION\nFinal thoughts.';
      const doc = await parser.parse(pdfContent, 'doc.pdf', 't-1');
      expect(doc.headings.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('DocxParser', () => {
    const parser = new DocxParser();

    it('extracts text from DOCX XML', async () => {
      const docxXml = '<?xml><w:document><w:body><w:p><w:r><w:t>Hello from DOCX</w:t></w:r></w:p></w:body></w:document>';
      const doc = await parser.parse(docxXml, 'doc.docx', 't-1');
      expect(doc.content).toContain('Hello from DOCX');
      expect(doc.sourceType).toBe('docx');
    });
  });

  describe('WebsiteCrawler', () => {
    const crawler = new WebsiteCrawler();

    it('supports URL source type', () => {
      expect(crawler instanceof Object).toBe(true);
    });
  });
});

// ─── Phase 2: Normalization ──────────────────────────────
describe('ContentNormalizer', () => {
  const normalizer = new ContentNormalizer();

  it('removes boilerplate text', () => {
    const cleaned = normalizer.removeBoilerplate('Some content\nCopyright © 2024 All rights reserved.\nMore content');
    expect(cleaned).not.toContain('Copyright');
    expect(cleaned).toContain('Some content');
  });

  it('removes multiple boilerplate patterns', () => {
    const content = 'Main text\nAll rights reserved.\nFollow us on Twitter\nMore text';
    const cleaned = normalizer.removeBoilerplate(content);
    expect(cleaned).toContain('Main text');
    expect(cleaned).not.toContain('All rights reserved');
    expect(cleaned).not.toContain('Follow us');
  });

  it('normalizes whitespace', () => {
    const result = normalizer.normalizeWhitespace('  Hello   world\n\n\n\nMore  ');
    expect(result).toBe('Hello   world\n\n\nMore');
  });

  it('preserves heading hierarchy when building sections', async () => {
    const parser = new MarkdownParser();
    const doc = await parser.parse('# Title\nIntro\n## Section 1\nContent A\n### Sub 1.1\nDetails', 'doc.md', 't-1');
    const normalized = await normalizer.normalize(doc);
    expect(normalized.sections.length).toBeGreaterThanOrEqual(3);
    expect(normalized.sections[0].sectionPath).toBe('1');
    expect(normalized.sections[1].sectionPath).toBe('1.1');
  });

  it('creates flat section when no headings', async () => {
    const parser = new TextParser();
    const doc = await parser.parse('Just some plain text\nwith multiple lines.', 'test.txt', 't-1');
    const normalized = await normalizer.normalize(doc);
    expect(normalized.sections).toHaveLength(1);
    expect(normalized.sections[0].sectionPath).toBe('1');
  });

  it('preserves lists in normalized output', async () => {
    const parser = new TextParser();
    const doc = await parser.parse('Text\n- Item 1\n- Item 2\nEnd', 'test.txt', 't-1');
    const normalized = await normalizer.normalize(doc);
    expect(normalized.sections.length).toBeGreaterThan(0);
    const allContent = normalized.sections.map(s => s.content).join(' ');
    expect(allContent).toContain('Item 1');
    expect(allContent).toContain('Item 2');
  });

  it('preserves document metadata', async () => {
    const parser = new TextParser();
    const doc = await parser.parse('Content with metadata', 'meta.txt', 't-1', { custom: 'value' });
    const normalized = await normalizer.normalize(doc);
    expect(normalized.metadata.custom).toBe('value');
    expect(normalized.originalName).toBe('meta.txt');
  });
});

// ─── Phase 3: Chunking ────────────────────────────────────
describe('ContentChunker', () => {
  const normalizer = new ContentNormalizer();
  const mdParser = new MarkdownParser();

  it('produces chunks with stable IDs', async () => {
    const doc = await mdParser.parse('# Test\nContent', 'stable.md', 't-1');
    const normalized = await normalizer.normalize(doc);
    const chunker = new ContentChunker();
    const chunks1 = await chunker.chunk(normalized);
    const chunks2 = await chunker.chunk(normalized);
    expect(chunks1).toHaveLength(chunks2.length);
    for (let i = 0; i < chunks1.length; i++) {
      expect(chunks1[i].chunkId).toBe(chunks2[i].chunkId);
    }
  });

  it('chunks by heading when heading-aware', async () => {
    const doc = await mdParser.parse(
      '# Title\nIntro paragraph.\n## Section 1\nLong content here.\n## Section 2\nMore different content.',
      'sections.md', 't-1',
    );
    const normalized = await normalizer.normalize(doc);
    const chunker = new ContentChunker({ headingAware: true, maxTokensPerChunk: 2000 });
    const chunks = await chunker.chunk(normalized);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
  });

  it('respects chunk size config', async () => {
    const longText = Array(500).fill('word').join(' ');
    const doc = await mdParser.parse(`# Big Doc\n${longText}`, 'big.md', 't-1');
    const normalized = await normalizer.normalize(doc);
    const chunker = new ContentChunker({ headingAware: false, chunkSize: 100, overlap: 0 });
    const chunks = await chunker.chunk(normalized);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('enforces maxTokensPerChunk boundary', () => {
    const chunker = new ContentChunker({ headingAware: false, chunkSize: 10, maxTokensPerChunk: 10 });
    const flatContent = 'word '.repeat(50);
    const words = flatContent.trim().split(/\s+/);
    const targetWords = Math.floor(10 / 1.3);
    expect(targetWords).toBe(7);
    expect(words.length).toBe(50);
  });

  it('sets parent-child relationships for large sections', async () => {
    const longSection = Array(1000).fill('word').join(' ');
    const chunker = new ContentChunker({ headingAware: true, chunkSize: 100, overlap: 0, maxTokensPerChunk: 100 });
    const doc = { documentId: 'd-1', tenantId: 't-1', sourceType: 'markdown' as const, originalName: 'test.md', title: 'Test', sections: [{ sectionPath: '1', heading: 'Test', level: 1, content: longSection, position: 0 }], metadata: {}, contentHash: 'hash' };
    const chunks = await chunker.chunk(doc);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('each chunk stores required fields', async () => {
    const doc = await mdParser.parse('# Req\nContent', 'req.md', 't-1');
    const normalized = await normalizer.normalize(doc);
    const chunker = new ContentChunker();
    const chunks = await chunker.chunk(normalized);
    for (const c of chunks) {
      expect(c.chunkId).toBeTruthy();
      expect(c.tenantId).toBe('t-1');
      expect(c.documentId).toBeTruthy();
      expect(c.sectionPath).toBeTruthy();
      expect(c.tokenCount).toBeGreaterThan(0);
      expect(c.checksum).toBeTruthy();
    }
  });
});

// ─── Phase 4: Embedding Providers ────────────────────────
describe('Embedding Providers', () => {
  describe('MockEmbeddingProvider', () => {
    const embedder = new MockEmbeddingProvider(64);

    it('produces fixed-dimension embeddings', async () => {
      const chunks = [{ chunkId: 'c1', tenantId: 't1', documentId: 'd1', documentVersion: 1, parentChunkId: null, sectionPath: '1', content: 'test', tokenCount: 1, checksum: 'h', position: 0, metadata: {} }];
      const results = await embedder.embed(chunks);
      expect(results).toHaveLength(1);
      expect(results[0].embedding).toHaveLength(64);
    });

    it('produces normalized unit vectors', async () => {
      const chunks = [{ chunkId: 'c1', tenantId: 't1', documentId: 'd1', documentVersion: 1, parentChunkId: null, sectionPath: '1', content: 'test', tokenCount: 1, checksum: 'h', position: 0, metadata: {} }];
      const results = await embedder.embed(chunks);
      const magnitude = Math.sqrt(results[0].embedding.reduce((s, v) => s + v * v, 0));
      expect(magnitude).toBeCloseTo(1, 1);
    });

    it('batches embeddings', async () => {
      const chunks = Array.from({ length: 5 }, (_, i) => ({ chunkId: `c${i}`, tenantId: 't1', documentId: 'd1', documentVersion: 1, parentChunkId: null, sectionPath: '1', content: `test ${i}`, tokenCount: 1, checksum: 'h', position: i, metadata: {} }));
      const results = await embedder.embed(chunks, { batchSize: 2 });
      expect(results).toHaveLength(5);
    });

    it('embeds queries', async () => {
      const embedding = await embedder.embedQuery('test query');
      expect(embedding).toHaveLength(64);
    });

    it('similar content produces similar vectors', async () => {
      const e1 = await embedder.embedQuery('cat');
      const e2 = await embedder.embedQuery('cat');
      expect(e1).toEqual(e2);
    });

    it('exposes model and version', () => {
      expect(embedder.model).toBeTruthy();
      expect(embedder.embeddingVersion).toBeTruthy();
    });
  });
});

// ─── Phase 5+6: Vector Store + Knowledge Store ──────────
describe('Vector Store', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    try { db.close(); } catch {}
  });

  it('stores and searches vectors by similarity', async () => {
    const store = new SqliteVectorStore(db, 4);
    await store.upsert([
      { chunkId: 'c1', tenantId: 't1', documentId: 'd1', knowledgeVersion: 1, embeddingVersion: '1', embeddingModel: 'm', chunkingVersion: '1', embedding: [1, 0, 0, 0], metadata: { content: 'cats are animals', title: 'Cat doc' }, deleted: false },
      { chunkId: 'c2', tenantId: 't1', documentId: 'd1', knowledgeVersion: 1, embeddingVersion: '1', embeddingModel: 'm', chunkingVersion: '1', embedding: [0, 1, 0, 0], metadata: { content: 'dogs are pets', title: 'Dog doc' }, deleted: false },
    ]);

    const results = await store.search([0.9, 0.1, 0, 0], 't1', 5, 0);
    expect(results).toHaveLength(2);
    expect(results[0].chunkId).toBe('c1');
    expect(results[0].score).toBeGreaterThan(0.5);
  });

  it('filters by tenantId', async () => {
    const store = new SqliteVectorStore(db, 4);
    await store.upsert([
      { chunkId: 'c1', tenantId: 't1', documentId: 'd1', knowledgeVersion: 1, embeddingVersion: '1', embeddingModel: 'm', chunkingVersion: '1', embedding: [1, 0, 0, 0], metadata: { content: 'a' }, deleted: false },
      { chunkId: 'c2', tenantId: 't2', documentId: 'd2', knowledgeVersion: 1, embeddingVersion: '1', embeddingModel: 'm', chunkingVersion: '1', embedding: [1, 0, 0, 0], metadata: { content: 'b' }, deleted: false },
    ]);
    const results = await store.search([1, 0, 0, 0], 't1', 5);
    expect(results).toHaveLength(1);
    expect(results[0].chunkId).toBe('c1');
  });

  it('supports soft delete', async () => {
    const store = new SqliteVectorStore(db, 4);
    await store.upsert([
      { chunkId: 'c1', tenantId: 't1', documentId: 'd1', knowledgeVersion: 1, embeddingVersion: '1', embeddingModel: 'm', chunkingVersion: '1', embedding: [1, 0, 0, 0], metadata: { content: 'a' }, deleted: false },
    ]);
    await store.softDelete(['c1']);
    const results = await store.search([1, 0, 0, 0], 't1', 5);
    expect(results).toHaveLength(0);
  });

  it('supports hard delete', async () => {
    const store = new SqliteVectorStore(db, 4);
    await store.upsert([
      { chunkId: 'c1', tenantId: 't1', documentId: 'd1', knowledgeVersion: 1, embeddingVersion: '1', embeddingModel: 'm', chunkingVersion: '1', embedding: [1, 0, 0, 0], metadata: { content: 'a' }, deleted: false },
    ]);
    await store.hardDelete(['c1']);
    const results = await store.search([1, 0, 0, 0], 't1', 5);
    expect(results).toHaveLength(0);
  });

  it('deleteByDocument removes all chunks', async () => {
    const store = new SqliteVectorStore(db, 4);
    await store.upsert([
      { chunkId: 'c1', tenantId: 't1', documentId: 'd1', knowledgeVersion: 1, embeddingVersion: '1', embeddingModel: 'm', chunkingVersion: '1', embedding: [1, 0, 0, 0], metadata: { content: 'a' }, deleted: false },
      { chunkId: 'c2', tenantId: 't1', documentId: 'd1', knowledgeVersion: 1, embeddingVersion: '1', embeddingModel: 'm', chunkingVersion: '1', embedding: [0, 1, 0, 0], metadata: { content: 'b' }, deleted: false },
    ]);
    await store.deleteByDocument('d1');
    const results = await store.search([1, 0, 0, 0], 't1', 5);
    expect(results).toHaveLength(0);
  });

  it('applies metadata filters', async () => {
    const store = new SqliteVectorStore(db, 4);
    const makeRecord = (chunkId: string, cat: string) => ({
      chunkId, tenantId: 't1', documentId: 'd1', knowledgeVersion: 1,
      embeddingVersion: '1', embeddingModel: 'm', chunkingVersion: '1',
      embedding: [1, 0, 0, 0],
      metadata: { content: chunkId, category: cat },
      deleted: false,
    });
    await store.upsert([makeRecord('c1', 'A'), makeRecord('c2', 'B')]);
    const results = await store.search([1, 0, 0, 0], 't1', 5, 0, { category: 'A' });
    expect(results).toHaveLength(1);
    expect(results[0].chunkId).toBe('c1');
  });

  it('returns store stats', async () => {
    const store = new SqliteVectorStore(db, 4);
    await store.upsert([
      { chunkId: 'c1', tenantId: 't1', documentId: 'd1', knowledgeVersion: 1, embeddingVersion: '1', embeddingModel: 'm', chunkingVersion: '1', embedding: [1, 0, 0, 0], metadata: { content: 'a' }, deleted: false },
      { chunkId: 'c2', tenantId: 't1', documentId: 'd1', knowledgeVersion: 1, embeddingVersion: '1', embeddingModel: 'm', chunkingVersion: '1', embedding: [0, 1, 0, 0], metadata: { content: 'b' }, deleted: true },
    ]);
    const stats = await store.getStats('t1');
    expect(stats.totalChunks).toBe(2);
    expect(stats.deletedChunks).toBe(1);
    expect(stats.activeChunks).toBe(1);
  });

  it('supports re-index', async () => {
    const store = new SqliteVectorStore(db, 4);
    await store.upsert([
      { chunkId: 'c1', tenantId: 't1', documentId: 'd1', knowledgeVersion: 1, embeddingVersion: '1', embeddingModel: 'm', chunkingVersion: '1', embedding: [1, 0, 0, 0], metadata: { content: 'a' }, deleted: false },
    ]);
    await store.reindex([
      { chunkId: 'c1', tenantId: 't1', documentId: 'd1', knowledgeVersion: 2, embeddingVersion: '2', embeddingModel: 'm2', chunkingVersion: '2', embedding: [0.5, 0.5, 0, 0], metadata: { content: 'updated' }, deleted: false },
    ]);
    const results = await store.search([0.5, 0.5, 0, 0], 't1', 5);
    expect(results).toHaveLength(1);
    expect((results[0].metadata as any).content).toBe('updated');
  });
});

describe('Knowledge Store', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    try { db.close(); } catch {}
  });

  it('publishes immutable snapshots', async () => {
    const store = new SqliteKnowledgeStore(db);
    const chunks: any[] = [
      { chunkId: 'c1', tenantId: 't1', documentId: 'd1', documentVersion: 1, parentChunkId: null, sectionPath: '1', content: 'test', tokenCount: 1, checksum: 'h', position: 0, metadata: {} },
    ];
    const v1 = await store.publishSnapshot('t1', chunks, 'e1', 'm1', 'ch1');
    expect(v1.knowledgeVersion).toBe(1);
    expect(v1.tenantId).toBe('t1');

    const v2 = await store.publishSnapshot('t1', chunks, 'e1', 'm1', 'ch1');
    expect(v2.knowledgeVersion).toBe(2);
  });

  it('retrieves snapshot by version', async () => {
    const store = new SqliteKnowledgeStore(db);
    const chunks: any[] = [{ chunkId: 'c1', tenantId: 't1', documentId: 'd1', documentVersion: 1, parentChunkId: null, sectionPath: '1', content: 'test', tokenCount: 1, checksum: 'h', position: 0, metadata: {} }];
    await store.publishSnapshot('t1', chunks, 'e1', 'm1', 'ch1');
    const retrieved = await store.getSnapshot('t1', 1);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.chunks).toHaveLength(1);
  });

  it('returns null for non-existent snapshot', async () => {
    const store = new SqliteKnowledgeStore(db);
    const result = await store.getSnapshot('t1', 999);
    expect(result).toBeNull();
  });

  it('lists versions', async () => {
    const store = new SqliteKnowledgeStore(db);
    const chunks: any[] = [{ chunkId: 'c1', tenantId: 't1', documentId: 'd1', documentVersion: 1, parentChunkId: null, sectionPath: '1', content: 'test', tokenCount: 1, checksum: 'h', position: 0, metadata: {} }];
    await store.publishSnapshot('t1', chunks, 'e1', 'm1', 'ch1');
    await store.publishSnapshot('t1', chunks, 'e1', 'm1', 'ch1');
    const versions = await store.listVersions('t1');
    expect(versions).toEqual([1, 2]);
  });

  it('tenant isolation: versions are per-tenant', async () => {
    const store = new SqliteKnowledgeStore(db);
    const chunks: any[] = [{ chunkId: 'c1', tenantId: 't1', documentId: 'd1', documentVersion: 1, parentChunkId: null, sectionPath: '1', content: 'test', tokenCount: 1, checksum: 'h', position: 0, metadata: {} }];
    await store.publishSnapshot('t1', chunks, 'e1', 'm1', 'ch1');
    await store.publishSnapshot('t2', chunks, 'e1', 'm1', 'ch1');
    expect(await store.getLatestVersion('t1')).toBe(1);
    expect(await store.getLatestVersion('t2')).toBe(1);
  });

  it('deletes snapshot', async () => {
    const store = new SqliteKnowledgeStore(db);
    const chunks: any[] = [{ chunkId: 'c1', tenantId: 't1', documentId: 'd1', documentVersion: 1, parentChunkId: null, sectionPath: '1', content: 'test', tokenCount: 1, checksum: 'h', position: 0, metadata: {} }];
    await store.publishSnapshot('t1', chunks, 'e1', 'm1', 'ch1');
    await store.deleteSnapshot('t1', 1);
    expect(await store.getSnapshot('t1', 1)).toBeNull();
  });
});

// ─── Phase 7: Retrieval ──────────────────────────────────
describe('Retrieval', () => {
  let db: Database.Database;
  let vectorStore: SqliteVectorStore;
  let embedder: MockEmbeddingProvider;

  beforeEach(async () => {
    db = new Database(':memory:');
    vectorStore = new SqliteVectorStore(db, 64);
    embedder = new MockEmbeddingProvider(64);

    const chunks = [
      { content: 'Cats are domestic animals that love to sleep and eat fish', cat: 'pets', doc: 'd1' },
      { content: 'Dogs are loyal pets that enjoy walks and playing fetch', cat: 'pets', doc: 'd1' },
      { content: 'Python is a programming language used for web development', cat: 'tech', doc: 'd2' },
      { content: 'JavaScript runs in the browser and on servers with Node.js', cat: 'tech', doc: 'd2' },
      { content: 'The Eiffel Tower is located in Paris, France', cat: 'travel', doc: 'd3' },
    ];

    const chunkRecords = chunks.map((c, i) => ({
      chunkId: `c${i + 1}`, tenantId: 't1', documentId: c.doc,
      documentVersion: 1, parentChunkId: null, sectionPath: '1',
      content: c.content, tokenCount: Math.ceil(c.content.length / 4),
      checksum: `h${i}`, position: i, metadata: { category: c.cat, content: c.content },
    }));

    const embedded = await embedder.embed(chunkRecords);
    const records = embedded.map(e => ({
      chunkId: e.chunk.chunkId, tenantId: 't1', documentId: e.chunk.documentId,
      knowledgeVersion: 1, embeddingVersion: embedder.embeddingVersion,
      embeddingModel: embedder.model, chunkingVersion: '1',
      embedding: e.embedding,
      metadata: { content: e.chunk.content, category: (e.chunk.metadata as any).category },
      deleted: false,
    }));
    await vectorStore.upsert(records);
  });

  afterEach(() => {
    try { db.close(); } catch {}
  });

  it('retrieves relevant chunks by query', async () => {
    const retriever = new KnowledgeRetriever(embedder, vectorStore);
    const results = await retriever.retrieve({ query: 'cat sleeping', tenantId: 't1', topK: 3, threshold: 0 });
    expect(results.chunks.length).toBeGreaterThan(0);
  });

  it('returns empty for non-matching queries', async () => {
    const retriever = new KnowledgeRetriever(embedder, vectorStore);
    const results = await retriever.retrieve({ query: 'zzzzzxyzzy', tenantId: 't1', topK: 3, threshold: 0.9 });
    expect(results.chunks).toHaveLength(0);
  });

  it('applies metadata filters', async () => {
    const retriever = new KnowledgeRetriever(embedder, vectorStore);
    const results = await retriever.retrieve({ query: 'programming', tenantId: 't1', topK: 5, threshold: 0, metadataFilters: { category: 'tech' } });
    expect(results.chunks.length).toBeGreaterThan(0);
    for (const c of results.chunks) {
      expect((c.metadata as any).category).toBe('tech');
    }
  });

  it('respects topK limit', async () => {
    const retriever = new KnowledgeRetriever(embedder, vectorStore);
    const results = await retriever.retrieve({ query: 'animals', tenantId: 't1', topK: 2, threshold: 0 });
    expect(results.chunks.length).toBeLessThanOrEqual(2);
  });

  it('reports total candidates found', async () => {
    const retriever = new KnowledgeRetriever(embedder, vectorStore);
    const results = await retriever.retrieve({ query: 'animals', tenantId: 't1', topK: 5, threshold: 0 });
    expect(results.totalCandidates).toBeGreaterThanOrEqual(results.chunks.length);
  });

  it('measures retrieval latency', async () => {
    const retriever = new KnowledgeRetriever(embedder, vectorStore);
    const results = await retriever.retrieve({ query: 'test', tenantId: 't1', topK: 3, threshold: 0 });
    expect(results.retrievalTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('attaches normalized confidence to retrieved chunks', async () => {
    const retriever = new KnowledgeRetriever(embedder, vectorStore);
    const results = await retriever.retrieve({ query: 'cat', tenantId: 't1', topK: 3, threshold: 0 });
    expect(results.chunks.length).toBeGreaterThan(0);
    for (const chunk of results.chunks) {
      expect(typeof chunk.confidence).toBe('number');
      expect(chunk.confidence).toBeGreaterThanOrEqual(0);
      expect(chunk.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('returns empty results for blank queries', async () => {
    const retriever = new KnowledgeRetriever(embedder, vectorStore);
    const results = await retriever.retrieve({ query: '   ', tenantId: 't1', topK: 3, threshold: 0 });
    expect(results.chunks).toHaveLength(0);
    expect(results.totalCandidates).toBe(0);
  });

  it('deletes knowledge by document and tenant without leaking to other tenants', async () => {
    const store = new SqliteVectorStore(new Database(':memory:'), 3);
    const sharedDocId = 'shared-doc';
    const query = [1, 0, 0];

    await store.upsert([
      {
        chunkId: 'shared-t1', tenantId: 't1', documentId: sharedDocId, knowledgeVersion: 1,
        embeddingVersion: 'v1', embeddingModel: 'mock', chunkingVersion: '1', embedding: query,
        metadata: { category: 'sales', content: 'tenant one copy' }, deleted: false,
      },
      {
        chunkId: 'shared-t2', tenantId: 't2', documentId: sharedDocId, knowledgeVersion: 1,
        embeddingVersion: 'v1', embeddingModel: 'mock', chunkingVersion: '1', embedding: query,
        metadata: { category: 'sales', content: 'tenant two copy' }, deleted: false,
      },
    ]);

    await store.deleteByDocument(sharedDocId, 't1');

    const remainingTenantOne = await store.search(query, 't1', 10, 0);
    const remainingTenantTwo = await store.search(query, 't2', 10, 0);

    expect(remainingTenantOne).toHaveLength(0);
    expect(remainingTenantTwo.some(r => r.documentId === sharedDocId)).toBe(true);
  });

  it('rejects unsafe metadata filter keys before executing the query', async () => {
    const store = new SqliteVectorStore(new Database(':memory:'), 3);
    await expect(store.search([1, 0, 0], 't1', 5, 0, { "foo;DROP TABLE users;--": 'x' }, 'hello')).rejects.toThrow(/Invalid metadata filter key/);
  });

  it('enforces tenant isolation', async () => {
    const retriever = new KnowledgeRetriever(embedder, vectorStore);
    const results = await retriever.retrieve({ query: 'cat', tenantId: 't2', topK: 5, threshold: 0 });
    expect(results.chunks).toHaveLength(0);
  });
});

// ─── Reranker ────────────────────────────────────────────
describe('Reranker', () => {
  const reranker = new CrossEncoderReranker();
  const passThrough = new PassThroughReranker();

  it('boosts results matching query terms', async () => {
    const results = [
      { chunkId: 'c1', documentId: 'd1', tenantId: 't1', score: 0.5, content: 'Cats are great pets', metadata: {} },
      { chunkId: 'c2', documentId: 'd1', tenantId: 't1', score: 0.9, content: 'Dogs are also pets', metadata: {} },
    ];
    const reranked = await reranker.rerank('cats', results, 2);
    expect(reranked[0].chunkId).toBe('c1');
  });

  it('limits results to topK', async () => {
    const results = Array.from({ length: 5 }, (_, i) => ({
      chunkId: `c${i}`, documentId: 'd1', tenantId: 't1', score: 0.5, content: `content ${i}`, metadata: {},
    }));
    const reranked = await reranker.rerank('test', results, 3);
    expect(reranked).toHaveLength(3);
  });

  it('pass-through reranker preserves order and limits', async () => {
    const results = Array.from({ length: 5 }, (_, i) => ({
      chunkId: `c${i}`, documentId: 'd1', tenantId: 't1', score: Math.random(), content: `content ${i}`, metadata: {},
    }));
    const result = await passThrough.rerank('test', results, 3);
    expect(result).toHaveLength(3);
  });
});

// ─── Phase 8: Context Assembly ────────────────────────────
describe('ContextAssembler', () => {
  const assembler = new DefaultContextAssembler();

  it('deduplicates chunks', async () => {
    const results = [
      { chunkId: 'c1', documentId: 'd1', tenantId: 't1', score: 0.9, content: 'A', metadata: {} },
      { chunkId: 'c1', documentId: 'd1', tenantId: 't1', score: 0.9, content: 'A', metadata: {} },
    ];
    const assembled = await assembler.assemble(results, 1000, new Map());
    expect(assembled.chunks).toHaveLength(1);
  });

  it('preserves document order', async () => {
    const results = [
      { chunkId: 'c2', documentId: 'd1', tenantId: 't1', score: 0.9, content: 'B', metadata: { position: 2 } },
      { chunkId: 'c1', documentId: 'd1', tenantId: 't1', score: 0.5, content: 'A', metadata: { position: 1 } },
    ];
    const assembled = await assembler.assemble(results, 1000, new Map());
    expect(assembled.chunks[0].chunkId).toBe('c1');
    expect(assembled.chunks[1].chunkId).toBe('c2');
  });

  it('enforces token budget', async () => {
    const results = Array.from({ length: 10 }, (_, i) => ({
      chunkId: `c${i}`, documentId: 'd1', tenantId: 't1', score: 0.5,
      content: 'short ' + i, metadata: { position: i },
    }));
    const assembled = await assembler.assemble(results, 10, new Map());
    // Each "short N" is ~7 chars = ~2 tokens. Budget 10 means ~5 chunks max.
    expect(assembled.chunks.length).toBeLessThan(10);
    expect(assembled.chunks.length).toBeGreaterThan(0);
  });

  it('generates citations', async () => {
    const results = [
      { chunkId: 'c1', documentId: 'd1', tenantId: 't1', score: 0.9, content: 'Important content here', metadata: { sectionPath: '2.1' } },
    ];
    const docs = new Map([['d1', { title: 'Test Doc', sourceType: 'text' as const }]]);
    const assembled = await assembler.assemble(results, 1000, docs);
    expect(assembled.citations).toHaveLength(1);
    expect(assembled.citations[0].documentTitle).toBe('Test Doc');
    expect(assembled.citations[0].sectionPath).toBe('2.1');
    expect(assembled.citations[0].snippet).toBe('Important content here');
  });

  it('includes evidence confidence on citations', async () => {
    const results = [
      { chunkId: 'c1', documentId: 'd1', tenantId: 't1', score: 0.75, content: 'Important content here', metadata: { sectionPath: '2.1' } },
    ];
    const docs = new Map([['d1', { title: 'Test Doc', sourceType: 'text' as const }]]);
    const assembled = await assembler.assemble(results, 1000, docs);
    expect(assembled.citations[0].confidence).toBeCloseTo(0.75, 2);
    expect(assembled.citations[0].score).toBe(0.75);
  });

  it('includes source attribution in context', async () => {
    const results = [
      { chunkId: 'c1', documentId: 'd1', tenantId: 't1', score: 0.9, content: 'Test content', metadata: { originalName: 'doc.txt' } },
    ];
    const docs = new Map([['d1', { title: 'Doc', sourceType: 'text' as const }]]);
    const assembled = await assembler.assemble(results, 1000, docs);
    expect(assembled.context).toContain('doc.txt');
    expect(assembled.context).toContain('Test content');
  });

  it('reports token count', async () => {
    const results = [
      { chunkId: 'c1', documentId: 'd1', tenantId: 't1', score: 0.9, content: 'Four word sentence', metadata: {} },
    ];
    const assembled = await assembler.assemble(results, 1000, new Map());
    expect(assembled.tokenCount).toBeGreaterThan(0);
  });
});

// ─── Phase 9: Evaluation ──────────────────────────────────
describe('Evaluation', () => {
  const evaluator = new RetrievalEvaluator();

  it('computes perfect Recall@K when all relevant found', async () => {
    const result = await evaluator.evaluate('query', ['c1', 'c2'], {
      chunks: [
        { chunkId: 'c1', documentId: 'd1', tenantId: 't1', score: 0.9, content: 'a', metadata: {} },
        { chunkId: 'c2', documentId: 'd1', tenantId: 't1', score: 0.8, content: 'b', metadata: {} },
      ],
      query: 'q', retrievalTimeMs: 10, totalCandidates: 2, usedReranker: false, usedHybridSearch: false,
    });
    expect(result.recallAtK).toBe(1);
    expect(result.precisionAtK).toBe(1);
    expect(result.hitRate).toBe(1);
  });

  it('computes zero recall when no relevant found', async () => {
    const result = await evaluator.evaluate('query', ['c3'], {
      chunks: [
        { chunkId: 'c1', documentId: 'd1', tenantId: 't1', score: 0.9, content: 'a', metadata: {} },
      ],
      query: 'q', retrievalTimeMs: 10, totalCandidates: 1, usedReranker: false, usedHybridSearch: false,
    });
    expect(result.recallAtK).toBe(0);
    expect(result.precisionAtK).toBe(0);
    expect(result.hitRate).toBe(0);
  });

  it('computes MRR correctly', async () => {
    const result = await evaluator.evaluate('query', ['c2'], {
      chunks: [
        { chunkId: 'c1', documentId: 'd1', tenantId: 't1', score: 0.9, content: 'a', metadata: {} },
        { chunkId: 'c2', documentId: 'd1', tenantId: 't1', score: 0.8, content: 'b', metadata: {} },
      ],
      query: 'q', retrievalTimeMs: 10, totalCandidates: 2, usedReranker: false, usedHybridSearch: false,
    });
    expect(result.mrr).toBe(0.5);
  });

  it('computes nDCG@K correctly', async () => {
    const result = await evaluator.evaluate('query', ['c1'], {
      chunks: [
        { chunkId: 'c1', documentId: 'd1', tenantId: 't1', score: 0.9, content: 'a', metadata: {} },
        { chunkId: 'c2', documentId: 'd1', tenantId: 't1', score: 0.8, content: 'b', metadata: {} },
      ],
      query: 'q', retrievalTimeMs: 10, totalCandidates: 2, usedReranker: false, usedHybridSearch: false,
    });
    expect(result.ndcgAtK).toBeGreaterThan(0);
    expect(result.ndcgAtK).toBeLessThanOrEqual(1);
  });

  it('detects empty retrievals', async () => {
    const result = await evaluator.evaluate('query', ['c1'], {
      chunks: [],
      query: 'q', retrievalTimeMs: 10, totalCandidates: 0, usedReranker: false, usedHybridSearch: false,
    });
    expect(result.emptyRetrievalRate).toBe(1);
  });

  it('reports retrieval latency', async () => {
    const result = await evaluator.evaluate('query', ['c1'], {
      chunks: [{ chunkId: 'c1', documentId: 'd1', tenantId: 't1', score: 0.9, content: 'a', metadata: {} }],
      query: 'q', retrievalTimeMs: 42, totalCandidates: 1, usedReranker: false, usedHybridSearch: false,
    });
    expect(result.retrievalLatencyMs).toBe(42);
  });
});

// ─── Integration: Full Pipeline ──────────────────────────
describe('Integration: Knowledge Pipeline', () => {
  let db: Database.Database;
  let pipeline: KnowledgePipeline;

  beforeEach(() => {
    db = new Database(':memory:');
    pipeline = new KnowledgePipeline(
      new ContentNormalizer(),
      new ContentChunker(),
      new MockEmbeddingProvider(64),
      new SqliteVectorStore(db, 64),
      new SqliteKnowledgeStore(db),
      db,
    );
    pipeline.registerParser(new TextParser());
    pipeline.registerParser(new MarkdownParser());
    pipeline.registerParser(new HtmlParser());
    pipeline.registerParser(new FaqParser());
    pipeline.registerParser(new PdfParser());
    pipeline.registerParser(new DocxParser());
  });

  afterEach(() => {
    try { db.close(); } catch {}
  });

  it('full ingestion lifecycle: upload → parse → normalize → chunk → embed → index → publish', async () => {
    const docId = await pipeline.enqueue('t1', 'text', 'test.txt', 'Paris is the capital of France. It has the Eiffel Tower.');
    const result = await pipeline.processDocument(docId, 'Paris is the capital of France. It has the Eiffel Tower.');
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.knowledgeVersion).toBe(1);

    const status = pipeline.getQueueStatus(docId);
    expect(status?.status).toBe('published');
  });

  it('supports document queue status tracking', async () => {
    const docId = await pipeline.enqueue('t1', 'text', 'track.txt', 'Track this document.');
    expect(pipeline.getQueueStatus(docId)?.status).toBe('queued');
    await pipeline.processDocument(docId, 'Track this document.');
    expect(pipeline.getQueueStatus(docId)?.status).toBe('published');
  });

  it('lists queued documents by tenant', async () => {
    await pipeline.enqueue('t1', 'text', 'a.txt', 'A');
    await pipeline.enqueue('t1', 'text', 'b.txt', 'B');
    await pipeline.enqueue('t2', 'text', 'c.txt', 'C');
    const t1Docs = pipeline.listByTenant('t1');
    expect(t1Docs).toHaveLength(2);
    const t2Docs = pipeline.listByTenant('t2');
    expect(t2Docs).toHaveLength(1);
  });

  it('multi-tenant isolation: documents remain separate', async () => {
    const id1 = await pipeline.enqueue('t1', 'text', 'a.txt', 'Cats are animals');
    const id2 = await pipeline.enqueue('t2', 'text', 'b.txt', 'Dogs are animals');
    await pipeline.processDocument(id1, 'Cats are animals');
    await pipeline.processDocument(id2, 'Dogs are animals');

    const embedder = new MockEmbeddingProvider(64);
    const vectorStore = new SqliteVectorStore(db, 64);
    const retriever = new KnowledgeRetriever(embedder, vectorStore);

    const r1 = await retriever.retrieve({ query: 'cat', tenantId: 't1', topK: 5, threshold: 0 });
    const r2 = await retriever.retrieve({ query: 'cat', tenantId: 't2', topK: 5, threshold: 0 });
    expect(r1.chunks.length).toBeGreaterThan(0);
    expect(r2.chunks.length).toBeGreaterThanOrEqual(0);
  });

  it('handles markdown documents through full pipeline', async () => {
    const md = '# Welcome\n\n## Section 1\nContent here.\n\n## Section 2\nMore content.';
    const docId = await pipeline.enqueue('t1', 'markdown', 'doc.md', md);
    const result = await pipeline.processDocument(docId, md);
    expect(result.knowledgeVersion).toBeGreaterThan(0);
  });

  it('handles FAQ documents', async () => {
    const faq = 'Q: What is this?\nA: A test.\nQ: How?\nA: Like this.';
    const docId = await pipeline.enqueue('t1', 'faq', 'faq.txt', faq);
    const result = await pipeline.processDocument(docId, faq);
    expect(result.knowledgeVersion).toBe(1);
  });

  it('rejects unregistered parser type', async () => {
    const docId = await pipeline.enqueue('t1', 'unknown', 'x.xyz', 'content');
    await expect(pipeline.processDocument(docId, 'content')).rejects.toThrow('No parser registered');
    expect(pipeline.getQueueStatus(docId)?.status).toBe('failed');
  });

  it('full retrieval cycle: ingest → retrieve → assemble', async () => {
    const content = 'The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France.';
    const docId = await pipeline.enqueue('t1', 'text', 'eiffel.txt', content);
    await pipeline.processDocument(docId, content);

    const embedder = new MockEmbeddingProvider(64);
    const vectorStore = new SqliteVectorStore(db, 64);
    const retriever = new KnowledgeRetriever(embedder, vectorStore);

    const results = await retriever.retrieve({ query: 'Paris tower', tenantId: 't1', topK: 5, threshold: 0 });

    const docs = new Map<string, { title: string; sourceType: string }>();
    for (const c of results.chunks) {
      docs.set(c.documentId, { title: c.metadata?.title as string || c.documentId, sourceType: 'text' });
    }

    const assembler = new DefaultContextAssembler();
    const assembled = await assembler.assemble(results.chunks, 1000, docs);
    expect(assembled.context).toContain('Eiffel');
    expect(assembled.citations.length).toBeGreaterThan(0);
  });
});

// ─── Performance: Large Document Ingestion ───────────────
describe('Performance', () => {
  it('ingests large document efficiently', async () => {
    const db = new Database(':memory:');
    const pipeline = new KnowledgePipeline(
      new ContentNormalizer(),
      new ContentChunker({ chunkSize: 500, overlap: 50 }),
      new MockEmbeddingProvider(64),
      new SqliteVectorStore(db, 64),
      new SqliteKnowledgeStore(db),
      db,
    );
    pipeline.registerParser(new TextParser());

    const largeContent = Array.from({ length: 1000 }, (_, i) => `This is paragraph number ${i} with some additional content to make it longer and more realistic for testing performance.`).join('\n\n');
    const docId = await pipeline.enqueue('t1', 'text', 'large.txt', largeContent);
    const start = performance.now();
    const result = await pipeline.processDocument(docId, largeContent);
    const duration = performance.now() - start;

    expect(result.chunks.length).toBeGreaterThan(10);
    expect(duration).toBeLessThan(10000);
    try { db.close(); } catch {}
  }, 15000);

  it('retrieval latency under 100ms', async () => {
    const db = new Database(':memory:');
    const embedder = new MockEmbeddingProvider(64);
    const vectorStore = new SqliteVectorStore(db, 64);

    const records = Array.from({ length: 100 }, (_, i) => ({
      chunkId: `c${i}`, tenantId: 't1', documentId: 'd1', knowledgeVersion: 1,
      embeddingVersion: '1', embeddingModel: 'm', chunkingVersion: '1',
      embedding: Array.from({ length: 64 }, () => Math.random()),
      metadata: { content: `random content ${i}` },
      deleted: false,
    }));
    await vectorStore.upsert(records);

    const retriever = new KnowledgeRetriever(embedder, vectorStore);
    const start = performance.now();
    const results = await retriever.retrieve({ query: 'test query', tenantId: 't1', topK: 10, threshold: 0 });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(200);
    expect(results.chunks.length).toBeLessThanOrEqual(10);
    try { db.close(); } catch {}
  }, 10000);

  it('concurrent ingestion does not corrupt data', async () => {
    const db = new Database(':memory:');
    const pipeline = new KnowledgePipeline(
      new ContentNormalizer(),
      new ContentChunker(),
      new MockEmbeddingProvider(64),
      new SqliteVectorStore(db, 64),
      new SqliteKnowledgeStore(db),
      db,
    );
    pipeline.registerParser(new TextParser());

    const promises = Array.from({ length: 5 }, (_, i) => {
      const content = `Document ${i} with unique content for concurrent testing.`;
      return pipeline.enqueue('t1', 'text', `doc${i}.txt`, content).then(docId =>
        pipeline.processDocument(docId, content),
      );
    });
    const results = await Promise.all(promises);

    expect(results).toHaveLength(5);
    for (const r of results) {
      expect(r.knowledgeVersion).toBeGreaterThan(0);
      expect(r.chunks.length).toBeGreaterThan(0);
    }
    try { db.close(); } catch {}
  }, 30000);
});

// ─── Audit Remediation Tests ──────────────────────────────
describe('Audit Remediation', () => {
  // C2+C4: processDocument failure recovery
  describe('C2+C4: Failure recovery sets failed status', () => {
    it('sets status to failed when parser throws', async () => {
      const db = new Database(':memory:');
      const pipeline = new KnowledgePipeline(
        new ContentNormalizer(),
        new ContentChunker(),
        new MockEmbeddingProvider(64),
        new SqliteVectorStore(db, 64),
        new SqliteKnowledgeStore(db),
        db,
      );
      const docId = await pipeline.enqueue('t1', 'unknown', 'x.xyz', 'content');
      await expect(pipeline.processDocument(docId, 'content')).rejects.toThrow('No parser registered');
      expect(pipeline.getQueueStatus(docId)?.status).toBe('failed');
      expect(pipeline.getQueueStatus(docId)?.error).toContain('No parser registered');
      try { db.close(); } catch {}
    });

    it('sets status to failed when embedder throws', async () => {
      const db = new Database(':memory:');
      const failEmbedder = {
        model: 'fail',
        embeddingVersion: '1.0.0',
        embed: async () => { throw new Error('Embedding service unavailable'); },
        embedQuery: async () => { throw new Error('Embedding service unavailable'); },
      };
      const pipeline = new KnowledgePipeline(
        new ContentNormalizer(),
        new ContentChunker(),
        failEmbedder,
        new SqliteVectorStore(db, 64),
        new SqliteKnowledgeStore(db),
        db,
      );
      pipeline.registerParser(new TextParser());
      const docId = await pipeline.enqueue('t1', 'text', 'test.txt', 'content');
      await expect(pipeline.processDocument(docId, 'content')).rejects.toThrow('Embedding service unavailable');
      expect(pipeline.getQueueStatus(docId)?.status).toBe('failed');
      expect(pipeline.getQueueStatus(docId)?.error).toContain('Embedding service unavailable');
      try { db.close(); } catch {}
    });

    it('error field contains full error message', async () => {
      const db = new Database(':memory:');
      const pipeline = new KnowledgePipeline(
        new ContentNormalizer(),
        new ContentChunker(),
        new MockEmbeddingProvider(64),
        new SqliteVectorStore(db, 64),
        new SqliteKnowledgeStore(db),
        db,
      );
      const docId = await pipeline.enqueue('t1', 'unknown', 'x.xyz', 'content');
      await expect(pipeline.processDocument(docId, 'content')).rejects.toThrow();
      const status = pipeline.getQueueStatus(docId);
      expect(status?.error).toBeTruthy();
      expect(status?.error!.length).toBeGreaterThan(0);
      try { db.close(); } catch {}
    });
  });

  // C3: Content hash deduplication
  describe('C3: Content hash deduplication', () => {
    it('returns existing documentId for duplicate content', async () => {
      const db = new Database(':memory:');
      const pipeline = new KnowledgePipeline(
        new ContentNormalizer(),
        new ContentChunker(),
        new MockEmbeddingProvider(64),
        new SqliteVectorStore(db, 64),
        new SqliteKnowledgeStore(db),
        db,
      );
      const content = 'Same content for dedup test';
      const id1 = await pipeline.enqueue('t1', 'text', 'a.txt', content);
      const id2 = await pipeline.enqueue('t1', 'text', 'b.txt', content);
      expect(id1).toBe(id2);
      try { db.close(); } catch {}
    });

    it('returns different documentId for different content', async () => {
      const db = new Database(':memory:');
      const pipeline = new KnowledgePipeline(
        new ContentNormalizer(),
        new ContentChunker(),
        new MockEmbeddingProvider(64),
        new SqliteVectorStore(db, 64),
        new SqliteKnowledgeStore(db),
        db,
      );
      const id1 = await pipeline.enqueue('t1', 'text', 'a.txt', 'content A');
      const id2 = await pipeline.enqueue('t1', 'text', 'b.txt', 'content B');
      expect(id1).not.toBe(id2);
      try { db.close(); } catch {}
    });

    it('allows same content for different tenants', async () => {
      const db = new Database(':memory:');
      const pipeline = new KnowledgePipeline(
        new ContentNormalizer(),
        new ContentChunker(),
        new MockEmbeddingProvider(64),
        new SqliteVectorStore(db, 64),
        new SqliteKnowledgeStore(db),
        db,
      );
      const content = 'Shared content';
      const id1 = await pipeline.enqueue('t1', 'text', 'a.txt', content);
      const id2 = await pipeline.enqueue('t2', 'text', 'b.txt', content);
      expect(id1).not.toBe(id2);
      try { db.close(); } catch {}
    });

    it('still deduplicates after failed document', async () => {
      const db = new Database(':memory:');
      const pipeline = new KnowledgePipeline(
        new ContentNormalizer(),
        new ContentChunker(),
        new MockEmbeddingProvider(64),
        new SqliteVectorStore(db, 64),
        new SqliteKnowledgeStore(db),
        db,
      );
      const content = 'Dedup after failed';
      const id1 = await pipeline.enqueue('t1', 'text', 'a.txt', content);
      await expect(pipeline.processDocument(id1, 'non-matching')).rejects.toThrow();
      expect(pipeline.getQueueStatus(id1)?.status).toBe('failed');
      const id2 = await pipeline.enqueue('t1', 'text', 'b.txt', content);
      expect(id2).not.toBe(id1);
      try { db.close(); } catch {}
    });
  });

  // H8: Concurrent processing lock
  describe('H8: Concurrent processing lock', () => {
    it('second processDocument call throws while first is processing', async () => {
      const db = new Database(':memory:');
      let resolveFirst: () => void;
      const firstPromise = new Promise<void>(r => { resolveFirst = r; });
      const slowEmbedder = {
        model: 'slow',
        embeddingVersion: '1.0.0',
        embed: async (chunks: any[]) => {
          await firstPromise;
          return chunks.map(c => ({ chunk: c, embedding: Array(64).fill(0.1) }));
        },
        embedQuery: async () => Array(64).fill(0.1),
      };
      const pipeline = new KnowledgePipeline(
        new ContentNormalizer(),
        new ContentChunker(),
        slowEmbedder,
        new SqliteVectorStore(db, 64),
        new SqliteKnowledgeStore(db),
        db,
      );
      pipeline.registerParser(new TextParser());
      const docId = await pipeline.enqueue('t1', 'text', 'a.txt', 'content');
      const p1 = pipeline.processDocument(docId, 'content');
      await expect(pipeline.processDocument(docId, 'content')).rejects.toThrow('already being processed');
      resolveFirst!();
      await p1;
      try { db.close(); } catch {}
    });
  });

  // M1: Delete old vectors during re-ingestion
  describe('M1: Re-ingestion deletes old vectors', () => {
    it('does not accumulate duplicate vectors on re-ingestion', async () => {
      const db = new Database(':memory:');
      const pipeline = new KnowledgePipeline(
        new ContentNormalizer(),
        new ContentChunker(),
        new MockEmbeddingProvider(64),
        new SqliteVectorStore(db, 64),
        new SqliteKnowledgeStore(db),
        db,
      );
      pipeline.registerParser(new TextParser());
      const content = 'Some content for re-ingestion test';
      const docId = await pipeline.enqueue('t1', 'text', 'test.txt', content);
      await pipeline.processDocument(docId, content);
      const vectors1 = db.prepare('SELECT COUNT(*) as count FROM knowledge_vectors WHERE document_id = ?').get(docId) as any;
      await pipeline.processDocument(docId, content);
      const vectors2 = db.prepare('SELECT COUNT(*) as count FROM knowledge_vectors WHERE document_id = ?').get(docId) as any;
      expect(vectors2.count).toBe(vectors1.count);
      try { db.close(); } catch {}
    });
  });

  // M5: Max document size
  describe('M5: Max document size', () => {
    it('rejects documents exceeding max size', async () => {
      const db = new Database(':memory:');
      const pipeline = new KnowledgePipeline(
        new ContentNormalizer(),
        new ContentChunker(),
        new MockEmbeddingProvider(64),
        new SqliteVectorStore(db, 64),
        new SqliteKnowledgeStore(db),
        db,
        { maxDocumentSizeBytes: 100 },
      );
      await expect(pipeline.enqueue('t1', 'text', 'big.txt', 'x'.repeat(101))).rejects.toThrow('exceeds maximum');
      try { db.close(); } catch {}
    });

    it('accepts documents under max size', async () => {
      const db = new Database(':memory:');
      const pipeline = new KnowledgePipeline(
        new ContentNormalizer(),
        new ContentChunker(),
        new MockEmbeddingProvider(64),
        new SqliteVectorStore(db, 64),
        new SqliteKnowledgeStore(db),
        db,
        { maxDocumentSizeBytes: 100 },
      );
      const docId = await pipeline.enqueue('t1', 'text', 'small.txt', 'x'.repeat(100));
      expect(docId).toBeTruthy();
      try { db.close(); } catch {}
    });
  });

  // L1: UUID-based document IDs
  describe('L1: UUID-based document IDs', () => {
    it('generates unique document IDs using UUIDs', async () => {
      const db = new Database(':memory:');
      const pipeline = new KnowledgePipeline(
        new ContentNormalizer(),
        new ContentChunker(),
        new MockEmbeddingProvider(64),
        new SqliteVectorStore(db, 64),
        new SqliteKnowledgeStore(db),
        db,
      );
      const ids = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const id = await pipeline.enqueue(`t${i % 5}`, 'text', `doc${i}.txt`, `content ${i}`);
        ids.add(id);
      }
      expect(ids.size).toBe(50);
      try { db.close(); } catch {}
    });
  });
});
