import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import {
  KnowledgePipeline, ContentNormalizer, ContentChunker,
  MockEmbeddingProvider, OpenAIEmbeddingProvider,
  SqliteVectorStore, SqliteKnowledgeStore,
  KnowledgeRetriever, DefaultContextAssembler,
  TextParser, MarkdownParser, HtmlParser, FaqParser, PdfParser, DocxParser, WebsiteCrawler,
} from '@conversation-engine/knowledge-pipeline';
import { SourceType } from '@conversation-engine/knowledge-pipeline';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { validateId, validationError, validateRequiredString, LABEL_MAX } from '../middleware/validate';

const logger = createLogger('saas-api:knowledge');

export interface KnowledgeRouteDeps {
  db: Database.Database;
  embeddingApiKey?: string;
  embeddingDimension?: number;
}

const VALID_SOURCE_TYPES = new Set<string>(['pdf', 'docx', 'text', 'markdown', 'html', 'faq', 'url']);
const MAX_INLINE_CONTENT_BYTES = 5 * 1024 * 1024;
const MAX_FILENAME_LENGTH = 255;
const MAX_TOP_K = 50;
const MAX_TOKEN_BUDGET = 32000;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const PROCESS_TIMEOUT_MS = 30000;
const MAX_CRAWL_DEPTH = 10;
const MAX_CRAWL_PAGES = 500;

let singletonVectorStore: SqliteVectorStore | null = null;
let singletonKnowledgeStore: SqliteKnowledgeStore | null = null;

function getVectorStore(deps: KnowledgeRouteDeps): SqliteVectorStore {
  if (!singletonVectorStore) singletonVectorStore = new SqliteVectorStore(deps.db, deps.embeddingDimension || 128);
  return singletonVectorStore;
}

function getKnowledgeStore(deps: KnowledgeRouteDeps): SqliteKnowledgeStore {
  if (!singletonKnowledgeStore) singletonKnowledgeStore = new SqliteKnowledgeStore(deps.db);
  return singletonKnowledgeStore;
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[.\s]+/, '')
    .slice(0, MAX_FILENAME_LENGTH)
    .trim() || 'unnamed';
}

function isValidPrivateUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname;
    if (/^127\./.test(hostname)) return false;
    if (/^10\./.test(hostname)) return false;
    if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) return false;
    if (/^192\.168\./.test(hostname)) return false;
    if (/^169\.254\./.test(hostname)) return false;
    if (/^localhost$/i.test(hostname)) return false;
    if (hostname === '[::1]') return false;
    if (/^fc00:/i.test(hostname)) return false;
    if (/^fd[0-9a-f]{2}:/i.test(hostname)) return false;
    if (/^fe80:/i.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function clampInt(value: unknown, min: number, max: number, defaultValue: number): number {
  const n = parseInt(String(value), 10);
  if (isNaN(n)) return defaultValue;
  return Math.max(min, Math.min(max, n));
}

function createPipeline(deps: KnowledgeRouteDeps): KnowledgePipeline {
  const dimension = deps.embeddingDimension || 128;
  const embedder = deps.embeddingApiKey
    ? new OpenAIEmbeddingProvider(deps.embeddingApiKey, 'text-embedding-3-small')
    : new MockEmbeddingProvider(dimension);

  const vectorStore = getVectorStore(deps);
  const knowledgeStore = getKnowledgeStore(deps);
  const pipeline = new KnowledgePipeline(
    new ContentNormalizer(),
    new ContentChunker(),
    embedder,
    vectorStore,
    knowledgeStore,
    deps.db,
  );

  pipeline.registerParser(new TextParser());
  pipeline.registerParser(new MarkdownParser());
  pipeline.registerParser(new HtmlParser());
  pipeline.registerParser(new FaqParser());
  pipeline.registerParser(new PdfParser());
  pipeline.registerParser(new DocxParser());

  return pipeline;
}

function createRetriever(deps: KnowledgeRouteDeps) {
  const dimension = deps.embeddingDimension || 128;
  const embedder = deps.embeddingApiKey
    ? new OpenAIEmbeddingProvider(deps.embeddingApiKey, 'text-embedding-3-small')
    : new MockEmbeddingProvider(dimension);
  const vectorStore = getVectorStore(deps);
  return new KnowledgeRetriever(embedder, vectorStore);
}

export function createKnowledgeRoutes(deps: KnowledgeRouteDeps): Router {
  const router = Router();
  const pipeline = createPipeline(deps);
  const retriever = createRetriever(deps);
  const assembler = new DefaultContextAssembler();

  // ─── Knowledge Management APIs ───────────────────────────

  // POST /upload — Upload a document for ingestion
  router.post('/upload', async (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    const { filename, sourceType, content } = req.body;
    if (!filename || !sourceType || content === undefined || content === null) {
      return res.status(400).json({ error: 'filename, sourceType, and content are required' });
    }
    if (typeof filename !== 'string') {
      return res.status(400).json({ error: 'filename must be a string' });
    }
    if (typeof sourceType !== 'string') {
      return res.status(400).json({ error: 'sourceType must be a string' });
    }
    if (!VALID_SOURCE_TYPES.has(sourceType)) {
      return res.status(400).json({ error: `Invalid sourceType. Must be one of: ${[...VALID_SOURCE_TYPES].join(', ')}` });
    }
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'content must be a string' });
    }
    const contentBytes = Buffer.byteLength(content, 'utf-8');
    if (contentBytes > MAX_INLINE_CONTENT_BYTES) {
      return res.status(413).json({ error: `Content size ${contentBytes} bytes exceeds maximum ${MAX_INLINE_CONTENT_BYTES} bytes` });
    }

    const safeFilename = sanitizeFilename(filename);

    try {
      const docId = await pipeline.enqueue(req.user.tenantId, sourceType, safeFilename, content);
      const status = pipeline.getQueueStatus(docId);
      res.status(202).json({
        documentId: docId,
        status: status?.status || 'queued',
        queuedAt: status?.queuedAt,
      });
    } catch (err: any) {
      if (err.message?.includes('exceeds maximum')) {
        return res.status(413).json({ error: err.message });
      }
      res.status(500).json({ error: 'Failed to enqueue document' });
    }
  });

  // POST /upload/faq — Upload FAQ document
  router.post('/upload/faq', async (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    const { filename, content } = req.body;
    if (content === undefined || content === null) {
      return res.status(400).json({ error: 'content is required' });
    }
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'content must be a string' });
    }
    const contentBytes = Buffer.byteLength(content, 'utf-8');
    if (contentBytes > MAX_INLINE_CONTENT_BYTES) {
      return res.status(413).json({ error: `Content size ${contentBytes} bytes exceeds maximum ${MAX_INLINE_CONTENT_BYTES} bytes` });
    }

    const safeFilename = sanitizeFilename(filename || 'faq.txt');

    try {
      const docId = await pipeline.enqueue(req.user.tenantId, 'faq', safeFilename, content);
      const status = pipeline.getQueueStatus(docId);
      res.status(202).json({
        documentId: docId,
        status: status?.status || 'queued',
        queuedAt: status?.queuedAt,
      });
    } catch (err: any) {
      if (err.message?.includes('exceeds maximum')) {
        return res.status(413).json({ error: err.message });
      }
      res.status(500).json({ error: 'Failed to enqueue FAQ' });
    }
  });

  // POST /crawl — Crawl a website URL
  router.post('/crawl', async (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    const { url, maxDepth, maxPages } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required and must be a string' });
    }
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    if (!isValidPrivateUrl(url)) {
      return res.status(400).json({ error: 'URL must not point to a private or internal network address' });
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({ error: 'URL must use http or https protocol' });
    }

    const crawlDepth = clampInt(maxDepth, 0, MAX_CRAWL_DEPTH, 2);
    const crawlPages = clampInt(maxPages, 1, MAX_CRAWL_PAGES, 10);

    try {
      const crawler = new WebsiteCrawler();
      const docs = await crawler.crawl(url, req.user.tenantId, {
        respectRobotsTxt: true,
        maxDepth: crawlDepth,
        maxPages: crawlPages,
        useSitemap: true,
      });

      if (!docs || docs.length === 0) {
        return res.status(200).json({
          documentId: null,
          status: 'no_content',
          pagesCrawled: 0,
          warning: 'No readable content was found on this page. The onboarding will continue with a basic setup.',
        });
      }

      const docIds: string[] = [];
      for (const doc of docs) {
        const docId = await pipeline.enqueue(req.user.tenantId, 'url', doc.title || url, url, { crawlDepth, crawlPages });
        await pipeline.processParsedDocument(docId, doc);
        docIds.push(docId);
      }

      const status = pipeline.getQueueStatus(docIds[0]);
      res.status(202).json({
        documentId: docIds[0],
        status: status?.status || 'published',
        queuedAt: status?.queuedAt,
        crawlOptions: { maxDepth: crawlDepth, maxPages: crawlPages },
        pagesCrawled: docs.length,
        warning: null,
      });
    } catch (err: any) {
      createContextLogger(logger).warn({ err, tenantId: req.user?.tenantId, url }, 'Knowledge crawl failed during onboarding flow; continuing with basic widget setup');
      if (err.message?.includes('exceeds maximum')) {
        return res.status(413).json({ error: err.message, warning: 'Knowledge crawl failed; onboarding will continue with a basic setup.' });
      }
      res.status(500).json({ error: err.message || 'Failed to crawl website', warning: 'Knowledge crawl failed; onboarding will continue with a basic setup.' });
    }
  });

  // GET /sources — List knowledge sources for tenant
  router.get('/sources', (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    const status = req.query.status as string | undefined;
    const validStatuses = ['queued', 'parsing', 'normalizing', 'chunking', 'embedding', 'indexed', 'published', 'failed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status filter. Must be one of: ${validStatuses.join(', ')}` });
    }

    const page = clampInt(req.query.page, 1, 10000, 1);
    const pageSize = clampInt(req.query.pageSize || req.query.limit, 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE);

    const allSources = pipeline.listByTenant(req.user.tenantId, status as any);
    const total = allSources.length;
    const startIdx = (page - 1) * pageSize;
    const sources = allSources.slice(startIdx, startIdx + pageSize);

    res.json({
      sources,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  });

  // GET /sources/:id — Get ingestion status of a source
  router.get('/sources/:id', (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    const idErr = validateId(req.params.id, 'id');
    if (idErr) return validationError(res, [idErr]);

    const status = pipeline.getQueueStatus(req.params.id);
    if (!status || status.tenantId !== req.user.tenantId) {
      return res.status(404).json({ error: 'Source not found' });
    }
    res.json({ source: status });
  });

  // DELETE /sources/:id — Soft delete (set status to failed, mark as deleted)
  router.delete('/sources/:id', (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    const idErr = validateId(req.params.id, 'id');
    if (idErr) return validationError(res, [idErr]);

    const status = pipeline.getQueueStatus(req.params.id);
    if (!status || status.tenantId !== req.user.tenantId) {
      return res.status(404).json({ error: 'Source not found' });
    }

    const vectorStore = getVectorStore(deps);
    vectorStore.deleteByDocument(req.params.id, req.user.tenantId).then(() => {
      res.json({ message: 'Source deleted', documentId: req.params.id });
    }).catch(() => {
      res.status(500).json({ error: 'Failed to delete source' });
    });
  });

  // POST /sources/:id/reindex — Reindex a source
  router.post('/sources/:id/reindex', async (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    const idErr = validateId(req.params.id, 'id');
    if (idErr) return validationError(res, [idErr]);

    const status = pipeline.getQueueStatus(req.params.id);
    if (!status || status.tenantId !== req.user.tenantId) {
      return res.status(404).json({ error: 'Source not found' });
    }

    try {
      const docId = await pipeline.enqueue(req.user.tenantId, status.sourceType, status.originalName, `reindex:${req.params.id}`);
      const newStatus = pipeline.getQueueStatus(docId);
      res.status(202).json({
        documentId: docId,
        status: newStatus?.status || 'queued',
        queuedAt: newStatus?.queuedAt,
        reindexing: true,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to reindex source' });
    }
  });

  // POST /publish — Publish latest snapshot
  router.post('/publish', async (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    try {
      const knowledgeStore = getKnowledgeStore(deps);

      const sources = pipeline.listByTenant(req.user.tenantId);
      const published = sources.filter(s => s.status === 'published');
      if (published.length === 0) {
        return res.status(400).json({ error: 'No published sources to publish' });
      }

      const latestVersion = await knowledgeStore.getLatestVersion(req.user.tenantId);
      if (latestVersion === 0) {
        return res.status(400).json({ error: 'No knowledge snapshots available' });
      }

      const snapshot = await knowledgeStore.getLatestSnapshot(req.user.tenantId);
      res.json({
        published: true,
        knowledgeVersion: snapshot?.knowledgeVersion || latestVersion,
        publishedAt: snapshot?.publishedAt,
        chunkCount: snapshot?.chunks?.length || 0,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to publish' });
    }
  });

  // POST /process/:id — Process a queued document synchronously (for testing/small docs)
  router.post('/process/:id', async (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    const idErr = validateId(req.params.id, 'id');
    if (idErr) return validationError(res, [idErr]);

    const status = pipeline.getQueueStatus(req.params.id);
    if (!status || status.tenantId !== req.user.tenantId) {
      return res.status(404).json({ error: 'Source not found' });
    }
    if (status.status !== 'queued' && status.status !== 'failed') {
      return res.status(409).json({ error: `Document is in '${status.status}' state and cannot be processed` });
    }

    const content = req.body.content || '';
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'content must be a string' });
    }

    try {
      const result = await Promise.race([
        pipeline.processDocument(req.params.id, content),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Processing timeout')), PROCESS_TIMEOUT_MS)
        ),
      ]);
      res.json({
        documentId: req.params.id,
        status: 'published',
        chunksCreated: result.chunks.length,
        knowledgeVersion: result.knowledgeVersion,
      });
    } catch (err: any) {
      const updatedStatus = pipeline.getQueueStatus(req.params.id);
      if (err.message === 'Processing timeout') {
        return res.status(504).json({
          error: 'Processing timed out',
          status: updatedStatus?.status || 'processing',
        });
      }
      res.status(500).json({
        error: err.message || 'Processing failed',
        status: updatedStatus?.status || 'failed',
      });
    }
  });

  // ─── Retrieval APIs ──────────────────────────────────────

  // POST /search — Search knowledge
  router.post('/search', async (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    const { query, topK, threshold } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query is required and must be a string' });
    }
    if (query.length > 10000) {
      return res.status(400).json({ error: 'query exceeds maximum length of 10000 characters' });
    }

    const safeTopK = clampInt(topK, 1, MAX_TOP_K, 5);
    const safeThreshold = typeof threshold === 'number' ? Math.max(0, Math.min(1, threshold)) : 0;

    try {
      const results = await retriever.retrieve({
        query,
        tenantId: req.user.tenantId,
        topK: safeTopK,
        threshold: safeThreshold,
      });
      res.json({
        query: results.query,
        results: results.chunks,
        totalResults: results.chunks.length,
        retrievalTimeMs: results.retrievalTimeMs,
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Knowledge search failed');
      res.json({
        query,
        results: [],
        totalResults: 0,
        retrievalTimeMs: 0,
        error: 'Search failed — knowledge base may be empty',
      });
    }
  });

  // POST /context — Retrieve assembled context
  router.post('/context', async (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    const { query, tokenBudget } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query is required and must be a string' });
    }
    if (query.length > 10000) {
      return res.status(400).json({ error: 'query exceeds maximum length of 10000 characters' });
    }

    const safeBudget = clampInt(tokenBudget, 100, MAX_TOKEN_BUDGET, 4000);

    try {
      const results = await retriever.retrieve({
        query,
        tenantId: req.user.tenantId,
        topK: 10,
        threshold: 0,
      });

      const documents = new Map<string, { title: string; sourceType: string }>();
      for (const chunk of results.chunks) {
        const meta = chunk.metadata || {};
        documents.set(chunk.documentId, {
          title: (meta.title as string) || chunk.documentId,
          sourceType: (meta.sourceType as string) || 'text',
        });
      }

      const assembled = await assembler.assemble(
        results.chunks,
        safeBudget,
        documents,
      );

      res.json({
        query,
        context: assembled.context,
        tokenCount: assembled.tokenCount,
        citations: assembled.citations,
        chunkCount: assembled.chunks.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Context assembly failed' });
    }
  });

  // POST /debug — Debug retrieval (admin only)
  router.post('/debug', async (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });
    if (req.user?.role !== 'owner' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { query, topK, threshold } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query is required and must be a string' });
    }

    const safeTopK = clampInt(topK, 1, MAX_TOP_K, 20);
    const safeThreshold = typeof threshold === 'number' ? Math.max(0, Math.min(1, threshold)) : 0;

    try {
      const vectorStore = getVectorStore(deps);
      const stats = await vectorStore.getStats(req.user.tenantId);

      const results = await retriever.retrieve({
        query,
        tenantId: req.user.tenantId,
        topK: safeTopK,
        threshold: safeThreshold,
      });

      const knowledgeStore = getKnowledgeStore(deps);
      const latestVersion = await knowledgeStore.getLatestVersion(req.user.tenantId);
      const versions = await knowledgeStore.listVersions(req.user.tenantId);

      res.json({
        query,
        results: results.chunks,
        totalResults: results.chunks.length,
        retrievalTimeMs: results.retrievalTimeMs,
        vectorStats: stats,
        latestKnowledgeVersion: latestVersion,
        allVersions: versions,
        usedReranker: results.usedReranker,
        usedHybridSearch: results.usedHybridSearch,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Debug retrieval failed' });
    }
  });

  // ─── Stats / Versions ────────────────────────────────────

  // GET /versions — List published knowledge versions
  router.get('/versions', async (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    try {
      const knowledgeStore = getKnowledgeStore(deps);
      const versions = await knowledgeStore.listVersions(req.user.tenantId);
      const latest = await knowledgeStore.getLatestVersion(req.user.tenantId);
      res.json({ versions, latestVersion: latest });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to list versions' });
    }
  });

  // GET /versions/:version — Get specific version details
  router.get('/versions/:version', async (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    const version = parseInt(req.params.version, 10);
    if (isNaN(version) || version < 1) {
      return res.status(400).json({ error: 'Invalid version number' });
    }

    try {
      const knowledgeStore = getKnowledgeStore(deps);
      const snapshot = await knowledgeStore.getSnapshot(req.user.tenantId, version);
      if (!snapshot) {
        return res.status(404).json({ error: 'Version not found' });
      }
      res.json({
        knowledgeVersion: snapshot.knowledgeVersion,
        tenantId: snapshot.tenantId,
        publishedAt: snapshot.publishedAt,
        chunkCount: snapshot.chunks.length,
        embeddingModel: snapshot.embeddingModel,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to get version' });
    }
  });

  // GET /stats — Get vector store statistics
  router.get('/stats', async (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    try {
      const vectorStore = getVectorStore(deps);
      const stats = await vectorStore.getStats(req.user.tenantId);
      const sources = pipeline.listByTenant(req.user.tenantId);
      res.json({
        vectors: stats,
        sources: {
          total: sources.length,
          published: sources.filter(s => s.status === 'published').length,
          failed: sources.filter(s => s.status === 'failed').length,
          processing: sources.filter(s => ['queued', 'parsing', 'normalizing', 'chunking', 'embedding', 'indexed'].includes(s.status)).length,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  return router;
}
