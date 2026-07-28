import { Router, Request, Response } from 'express';
import { createLogger } from '@conversation-engine/logger';
import { KnowledgeAdminStore } from './knowledge-admin-store';
import { KnowledgePipeline } from '@conversation-engine/knowledge-pipeline';
import { SqliteVectorStore, SqliteKnowledgeStore } from '@conversation-engine/knowledge-pipeline';
import Database from 'better-sqlite3';

const logger = createLogger('knowledge-admin-api');

function getTenantId(req: Request): string {
  const id = req.headers['x-tenant-id'] as string | undefined;
  if (!id) throw new Error('x-tenant-id header is required');
  return id;
}

export function createKnowledgeAdminRouter(
  adminStore: KnowledgeAdminStore,
  pipeline: KnowledgePipeline,
  vectorDb: Database.Database,
): Router {
  const router = Router();

  // Require x-tenant-id on all knowledge admin routes
  router.use((req: Request, res: Response, next) => {
    if (!req.headers['x-tenant-id']) {
      return res.status(401).json({ error: 'x-tenant-id header is required' });
    }
    next();
  });
  const vectorStore = new SqliteVectorStore(vectorDb);
  const knowledgeStore = new SqliteKnowledgeStore(vectorDb);

  // ─── List documents ──────────────────────────────────────
  router.get('/admin/knowledge/documents', (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10), 1), 200);
      const offset = Math.max(parseInt(String(req.query.offset || '0'), 10), 0);
      const status = req.query.status as string | undefined;
      const result = adminStore.listDocuments(tenantId, status, limit, offset);
      res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'Failed to list knowledge documents');
      res.status(500).json({ error: 'Failed to list knowledge documents' });
    }
  });

  function paramId(req: Request): string {
    const id = req.params.documentId;
    return Array.isArray(id) ? id[0] : id;
  }

  // ─── Get document detail ─────────────────────────────────
  router.get('/admin/knowledge/documents/:documentId', (req: Request, res: Response) => {
    try {
      const doc = adminStore.getDocument(paramId(req));
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      res.json(doc);
    } catch (err: any) {
      logger.error({ err }, 'Failed to get document');
      res.status(500).json({ error: 'Failed to get document' });
    }
  });

  // ─── Upload document ─────────────────────────────────────
  router.post('/admin/knowledge/documents', expressJsonLimit(), async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { sourceType, originalName, content, title } = req.body;
      if (!sourceType || !originalName || !content) {
        return res.status(400).json({ error: 'sourceType, originalName, and content are required' });
      }

      const validTypes = ['text', 'markdown', 'html', 'faq', 'csv', 'pdf', 'docx', 'url'];
      if (!validTypes.includes(sourceType)) {
        return res.status(400).json({ error: `Invalid sourceType. Must be one of: ${validTypes.join(', ')}` });
      }

      const docId = await pipeline.enqueue(tenantId, sourceType, originalName, content, { title });
      adminStore.upsertDocument({
        documentId: docId,
        tenantId,
        originalName,
        sourceType,
        title: title || originalName,
        status: 'queued',
        contentHash: '',
      });

      res.status(201).json({ documentId: docId, status: 'queued' });
    } catch (err: any) {
      logger.error({ err }, 'Failed to upload document');
      res.status(500).json({ error: err.message || 'Failed to upload document' });
    }
  });

  // ─── Process document ────────────────────────────────────
  router.post('/admin/knowledge/documents/:documentId/process', async (req: Request, res: Response) => {
    try {
      const pid = paramId(req);
      const { content } = req.body;
      if (!content) return res.status(400).json({ error: 'content is required' });

      const result = await pipeline.processDocument(pid, content);
      adminStore.upsertDocument({
        documentId: pid,
        tenantId: getTenantId(req),
        originalName: '',
        sourceType: '',
        title: '',
        status: 'published',
        chunkCount: result.chunks.length,
      });

      res.json({ status: 'published', knowledgeVersion: result.knowledgeVersion, chunkCount: result.chunks.length });
    } catch (err: any) {
      logger.error({ err }, 'Failed to process document');
      adminStore.upsertDocument({
        documentId: paramId(req),
        tenantId: getTenantId(req),
        originalName: '',
        sourceType: '',
        title: '',
        status: 'failed',
        error: err.message,
      });
      res.status(500).json({ error: err.message || 'Failed to process document' });
    }
  });

  // ─── Delete document ─────────────────────────────────────
  router.delete('/admin/knowledge/documents/:documentId', async (req: Request, res: Response) => {
    try {
      const pid = paramId(req);
      await vectorStore.deleteByDocument(pid);
      adminStore.deleteDocument(pid);
      res.json({ status: 'deleted' });
    } catch (err: any) {
      logger.error({ err }, 'Failed to delete document');
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  // ─── Re-index document ───────────────────────────────────
  router.post('/admin/knowledge/documents/:documentId/reindex', async (req: Request, res: Response) => {
    try {
      const pid = paramId(req);
      const { content } = req.body;
      if (!content) return res.status(400).json({ error: 'content is required for re-index' });

      await vectorStore.deleteByDocument(pid);
      const result = await pipeline.processDocument(pid, content);
      adminStore.upsertDocument({
        documentId: pid,
        tenantId: getTenantId(req),
        originalName: '',
        sourceType: '',
        title: '',
        status: 'published',
        chunkCount: result.chunks.length,
      });
      res.json({ status: 'reindexed', knowledgeVersion: result.knowledgeVersion, chunkCount: result.chunks.length });
    } catch (err: any) {
      logger.error({ err }, 'Failed to re-index document');
      res.status(500).json({ error: err.message || 'Failed to re-index document' });
    }
  });

  // ─── View chunks for a document ──────────────────────────
  router.get('/admin/knowledge/documents/:documentId/chunks', async (req: Request, res: Response) => {
    try {
      const pid = paramId(req);
      const doc = adminStore.getDocument(pid);
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      const snapshot = await knowledgeStore.getLatestSnapshot(doc.tenantId);
      if (!snapshot) return res.json({ chunks: [] });

      const docChunks = snapshot.chunks.filter(c => c.documentId === pid);
      res.json({ chunks: docChunks, total: docChunks.length });
    } catch (err: any) {
      logger.error({ err }, 'Failed to get chunks');
      res.status(500).json({ error: 'Failed to get chunks' });
    }
  });

  // ─── Get embedding status ────────────────────────────────
  router.get('/admin/knowledge/embedding-status', async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const stats = await vectorStore.getStats(tenantId);
      const snapshot = await knowledgeStore.getLatestSnapshot(tenantId);
      res.json({
        ...stats,
        currentKnowledgeVersion: snapshot?.knowledgeVersion || 0,
        embeddingModel: snapshot?.embeddingModel || 'none',
        embeddingVersion: snapshot?.embeddingVersion || 'none',
        chunkingVersion: snapshot?.chunkingVersion || 'none',
        lastPublishedAt: snapshot?.publishedAt || null,
      });
    } catch (err: any) {
      logger.error({ err }, 'Failed to get embedding status');
      res.status(500).json({ error: 'Failed to get embedding status' });
    }
  });

  // ─── Monitoring stats ────────────────────────────────────
  router.get('/admin/knowledge/monitoring', (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const stats = adminStore.getMonitoringStats(tenantId);
      res.json(stats);
    } catch (err: any) {
      logger.error({ err }, 'Failed to get monitoring stats');
      res.status(500).json({ error: 'Failed to get monitoring stats' });
    }
  });

  // ─── Search / retrieve (for testing) ─────────────────────
  router.post('/admin/knowledge/search', async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { query, topK = 5, threshold = 0.0, useHybridSearch = true } = req.body;
      if (!query) return res.status(400).json({ error: 'query is required' });

      const { KnowledgeRetriever, OpenAIEmbeddingProvider } = await import('@conversation-engine/knowledge-pipeline');
      const embedder = process.env.OPENAI_API_KEY
        ? new OpenAIEmbeddingProvider(process.env.OPENAI_API_KEY, 'text-embedding-3-small')
        : (() => { throw new Error('OPENAI_API_KEY is required for knowledge search in production'); })();
      const retriever = new KnowledgeRetriever(embedder, vectorStore);

      const results = await retriever.retrieve({
        query,
        tenantId,
        topK,
        threshold,
        useHybridSearch,
      });

      res.json(results);
    } catch (err: any) {
      logger.error({ err }, 'Failed to search');
      res.status(500).json({ error: err.message || 'Failed to search' });
    }
  });

  return router;
}

function expressJsonLimit(): any {
  const express = require('express');
  return express.json({ limit: '50mb' });
}
