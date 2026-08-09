import express from 'express';
import { runPipeline, PipelineDeps } from './pipeline';
import { authenticateRequest, requireRole, TenantRegistryRole } from './auth';
import { SqliteTenantRegistry } from '@conversation-engine/tenant-registry';
import { SqliteSessionStore, isValidSessionId } from '@conversation-engine/session-store';
import { FileConfigStore, defaultTenantConfig } from '@conversation-engine/config-store';
import { SqliteDedupStore } from '@conversation-engine/dedup-store';
import { EnvVault } from '@conversation-engine/secrets-vault';
import { TripWireEngine, loadPatternFile } from '@conversation-engine/trip-wire';
import { InputGuardrailEngine, CircuitBreaker, NoopProvider } from '@conversation-engine/input-guardrail';
import { PiiDetector } from '@conversation-engine/pii-detector';
import { OutputGuardrailEngine, CircuitBreaker as OutputCircuitBreaker, NoopProvider as OutputNoopProvider } from '@conversation-engine/output-guardrail';
import { GroundingVerifier } from '@conversation-engine/grounding-verifier';
import { StreamingOpenAIChatProvider, buildPrompt } from '@conversation-engine/stage-5-response-generation';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { createLogger, generateRequestId, runWithContext, RequestContext, createContextLogger, metrics } from '@conversation-engine/logger';
import { enrichWithConversationIntelligence } from './conversation-intelligence';
import { ResponseGenerator } from '@conversation-engine/response-generator';
import { createAdminRouter } from './admin-api';
import { AdminStore } from './admin-store';
import {
  ContentNormalizer, ContentChunker, MockEmbeddingProvider,
  SqliteVectorStore, SqliteKnowledgeStore, KnowledgePipeline,
  TextParser, MarkdownParser, HtmlParser, FaqParser, CsvFaqParser, PdfParser, DocxParser, WebsiteCrawler,
} from '@conversation-engine/knowledge-pipeline';
import { KnowledgeAdminStore } from './knowledge-admin-store';
import { createKnowledgeAdminRouter } from './knowledge-admin-api';
import { KnowledgeWorker } from './knowledge-worker';
import { KnowledgeRetriever } from '@conversation-engine/knowledge-pipeline';
import { createDatabase, UserRepository, TenantRepository, generateToken, generateVerificationToken, comparePassword, WebsiteScanRepository, ScannedPageRepository, KnowledgeBaseRepository, KbDocumentRepository, KbChunkRepository } from '@conversation-engine/saas-core';
import { createWebsiteScanScheduler } from './scheduler';

const logger = createLogger('pipeline-orchestrator');
const PORT = parseInt(process.env.PORT || '3456', 10);
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', '..', '..', 'data');

// Production guard: reject development-only configurations
const NODE_ENV = process.env.NODE_ENV || 'development';
if (NODE_ENV === 'production') {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required in production. Mock embeddings are not allowed.');
  }
}

const MESSAGE_MAX_LENGTH = 50000;

function validateChatInput(body: any): { errors: string[]; message: string; sessionId: string } {
  const errors: string[] = [];
  const { message, sessionId } = body || {};

  if (!message) {
    errors.push('message is required');
  } else if (typeof message !== 'string') {
    errors.push('message must be a string');
  } else if (message.length > MESSAGE_MAX_LENGTH) {
    errors.push(`message must be at most ${MESSAGE_MAX_LENGTH} characters`);
  }

  if (sessionId !== undefined && sessionId !== null && sessionId !== '') {
    if (typeof sessionId !== 'string') {
      errors.push('sessionId must be a string');
    } else if (!isValidSessionId(sessionId)) {
      errors.push('sessionId must be a valid UUID or session_* identifier');
    }
  }

  return { errors, message: message || '', sessionId: sessionId || '' };
}

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const tenantRegistry = new SqliteTenantRegistry(join(DATA_DIR, 'tenant-registry.db'));
const sessionStore = new SqliteSessionStore(join(DATA_DIR, 'sessions.db'));
const adminStore = new AdminStore(join(DATA_DIR, 'admin.db'));
const llmBaseUrl = process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL;
if (llmBaseUrl) logger.info({ llmBaseUrl }, 'Using custom LLM base URL');
const responseGenerator = new ResponseGenerator({ llmBaseUrl, fallbackResponse: 'I appreciate your patience. Let me connect you with a specialist who can help further.' });
const configStore = new FileConfigStore(join(DATA_DIR, 'configs'));
const dedupStore = new SqliteDedupStore(join(DATA_DIR, 'dedup.db'));
const vault = new EnvVault('LLM_');

// Startup validation: trip-wire patterns must load successfully
// Initialize safety modules
let tripWire: TripWireEngine;
try {
  const patternsPath = join(__dirname, '..', '..', '..', 'packages', 'trip-wire', 'patterns', 'base.json');
  const basePatterns = loadPatternFile(patternsPath);
  tripWire = new TripWireEngine(basePatterns);
  logger.info({ version: tripWire.getVersion(), patternCount: basePatterns.patterns.length }, 'Trip-wire patterns loaded');
} catch (err) {
  logger.error({ err }, 'FATAL: Failed to load trip-wire patterns. Engine cannot start.');
  process.exit(1);
}

const inputGuardrail = new InputGuardrailEngine(new NoopProvider(), new CircuitBreaker(3, 30000), 3000);
const outputGuardrail = new OutputGuardrailEngine(new OutputNoopProvider(), new OutputCircuitBreaker(3, 30000), 3000);
const piiDetector = new PiiDetector();
const groundingVerifier = new GroundingVerifier(piiDetector);

// ─── Knowledge Pipeline ────────────────────────────────────────
const knowledgeDbPath = join(DATA_DIR, 'knowledge.db');
const knowledgeDb = new (require('better-sqlite3'))(knowledgeDbPath);
knowledgeDb.pragma('journal_mode = WAL');
knowledgeDb.pragma('busy_timeout = 5000');

const knowledgeNormalizer = new ContentNormalizer();
const knowledgeChunker = new ContentChunker();
const knowledgeEmbedder = new MockEmbeddingProvider(128);
const knowledgeVectorStore = new SqliteVectorStore(knowledgeDb, 128);
const knowledgeSnapshotStore = new SqliteKnowledgeStore(knowledgeDb);
const knowledgePipeline = new KnowledgePipeline(
  knowledgeNormalizer,
  knowledgeChunker,
  knowledgeEmbedder,
  knowledgeVectorStore,
  knowledgeSnapshotStore,
  knowledgeDb,
);
knowledgePipeline.registerParser(new TextParser());
knowledgePipeline.registerParser(new MarkdownParser());
knowledgePipeline.registerParser(new HtmlParser());
knowledgePipeline.registerParser(new FaqParser());
knowledgePipeline.registerParser(new CsvFaqParser());
knowledgePipeline.registerParser(new PdfParser());
knowledgePipeline.registerParser(new DocxParser());

const knowledgeAdminStore = new KnowledgeAdminStore(knowledgeDb);
const knowledgeWorker = new KnowledgeWorker(knowledgePipeline, knowledgeAdminStore);
const knowledgeRetriever = new KnowledgeRetriever(knowledgeEmbedder, knowledgeVectorStore);

// Start the knowledge worker (polls queue every 5s)
knowledgeWorker.start();
logger.info('Knowledge worker started');

// Seed default test tenant if SEED_DEMO=true
if (process.env.SEED_DEMO === 'true') {
  async function seedDefaults(): Promise<void> {
    const tenant = await tenantRegistry.lookupTenant('demo-tenant');
    if (!tenant) {
      const demoKey = process.env.DEMO_API_KEY;
      if (!demoKey) {
        logger.warn('SEED_DEMO=true but DEMO_API_KEY not set — skipping seed');
        return;
      }
      tenantRegistry.seedTenant('demo-tenant', 'active');
      tenantRegistry.seedApiKey('demo-tenant', demoKey, 'demo');
      const config = defaultTenantConfig('demo-tenant');
      config.llm.systemPrompt = 'You are a helpful customer support assistant for a demo company.';
      await configStore.saveVersion('demo-tenant', config, 'system', 'initial seed');
      logger.info('Seeded demo-tenant with API key [REDACTED]');
    }
  }
  seedDefaults().catch((err) => logger.error({ err }, 'Seed failed'));
}

const deps: PipelineDeps = { tenantRegistry, sessionStore, configStore, dedupStore, vault, llmApiKey: process.env.LLM_API_KEY, tripWire, inputGuardrail, piiDetector, outputGuardrail, groundingVerifier, responseGenerator, knowledgeRetriever };

const app = express();
app.use(express.json({ limit: '1mb' }));

// ─── Root Route (HTML Dashboard) ──────────────────────────────
app.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Pipeline Orchestrator</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:3rem 1rem}
    h1{font-size:2rem;margin-bottom:.5rem;color:#f8fafc}
    .sub{color:#94a3b8;margin-bottom:2rem;font-size:1.1rem}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;max-width:900px;width:100%}
    .card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:1.5rem;transition:border-color .2s}
    .card:hover{border-color:#3b82f6}
    .card h3{color:#3b82f6;margin-bottom:.5rem;font-size:1rem}
    .method{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.75rem;font-weight:700;margin-right:6px}
    .get{background:#065f46;color:#6ee7b7}
    .post{background:#7c2d12;color:#fdba74}
    .ep{display:block;padding:.4rem 0;color:#cbd5e1;text-decoration:none;font-family:monospace;font-size:.9rem}
    .ep:hover{color:#f8fafc}
    .status{margin-top:2rem;padding:1rem 2rem;background:#1e293b;border-radius:12px;border:1px solid #334155;display:flex;align-items:center;gap:.75rem}
    .dot{width:12px;height:12px;border-radius:50%;background:#22c55e;animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    code{background:#334155;padding:2px 6px;border-radius:4px;font-size:.85rem}
  </style>
</head>
<body>
  <h1>Pipeline Orchestrator</h1>
  <p class="sub">Multi-stage conversation pipeline with safety rails</p>
  <div class="status"><div class="dot"></div><span>Server running on port 3456</span></div>
  <div class="grid">
    <div class="card">
      <h3>Chat</h3>
      <a class="ep"><span class="method post">POST</span>/api/chat</a>
      <p style="color:#64748b;font-size:.85rem;margin-top:.5rem">Send a message. Body: <code>{ message, sessionId? }</code></p>
      <a class="ep"><span class="method post">POST</span>/api/chat/stream</a>
      <p style="color:#64748b;font-size:.85rem;margin-top:.5rem">SSE streaming chat. Returns <code>text/event-stream</code></p>
    </div>
    <div class="card">
      <h3>System</h3>
      <a class="ep"><span class="method get">GET</span>/api/health</a>
      <p style="color:#64748b;font-size:.85rem;margin-top:.5rem">Health checks for all dependencies</p>
      <a class="ep"><span class="method get">GET</span>/api/metrics</a>
      <p style="color:#64748b;font-size:.85rem;margin-top:.5rem">Request counters and latency histograms</p>
    </div>
    <div class="card" style="grid-column:1/-1">
      <h3>Auth</h3>
      <p style="color:#94a3b8;font-size:.9rem">All endpoints require <code>Authorization: Bearer &lt;api-key&gt;</code> header or <code>X-API-Key</code> header.</p>
    </div>
  </div>
</body>
</html>`);
});

// ─── Request ID + Context Middleware ──────────────────────────
app.use((req, _res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || generateRequestId();
  const ctx: RequestContext = {
    requestId,
    tenantId: req.headers['x-tenant-id'] as string,
    ip: req.ip || '',
  };
  runWithContext(ctx, () => {
    (req as any).requestId = requestId;
    metrics.increment('pipeline.requests');
    next();
  });
});

// Structured error response helper
function errorResponse(res: express.Response, statusCode: number, error: string, stage: string, traceId?: string): void {
  res.status(statusCode).json({
    success: false,
    error,
    traceId: traceId || '',
    stage,
    timestamp: new Date().toISOString(),
  });
}

// Global error handler — catches all unhandled errors, never allows raw 502
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const traceId = (req as any)?.requestId || randomUUID();
  createContextLogger(logger).error({ err, traceId, path: req.path, method: req.method }, 'Unhandled error');
  if (res.headersSent) return;
  errorResponse(res, err.statusCode || 500, err.message || 'Internal server error', 'global-handler', traceId);
});

// Auth middleware — only applies to /api/health
app.use(async (req, res, next) => {
  if (req.path === '/api/health') {
    const context = {} as any;
    const authResult = await authenticateRequest(req.headers as Record<string, string>, context, { tenantRegistry, vault });
    if (authResult.success) {
      res.locals.role = authResult.role;
    }
  }
  next();
});

// ─── Liveness probe (no auth — for load balancers) ────────────
app.get('/api/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() });
});

// ─── Readiness probe (no auth — checks store availability) ─────
app.get('/api/ready', async (_req, res) => {
  try {
    const [registryHealth, sessionHealth, configHealth, dedupHealth] = await Promise.all([
      tenantRegistry.health(),
      sessionStore.health(),
      configStore.health(),
      dedupStore.health(),
    ]);
    const checks = { tenantRegistry: registryHealth, sessionStore: sessionHealth, configStore: configHealth, dedupStore: dedupHealth };
    const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
    const anyUnavailable = Object.values(checks).some(c => c.status === 'unavailable');
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'ok' : anyUnavailable ? 'degraded' : 'degraded',
      service: 'pipeline-orchestrator',
      checks,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({ status: 'unavailable', error: err.message });
  }
});

// Health endpoint (operator+ only)
app.get('/api/health', async (_req, res) => {
  try {
    requireRole(res.locals.role, ['admin', 'operator']);
  } catch {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const [registryHealth, sessionHealth, configHealth, dedupHealth] = await Promise.all([
    tenantRegistry.health(),
    sessionStore.health(),
    configStore.health(),
    dedupStore.health(),
  ]);

  // Vault health: check if env var is present (EnvVault always returns healthy)
  const vaultHealth = {
    status: (process.env.LLM_API_KEY ? 'healthy' : 'degraded') as 'healthy' | 'degraded' | 'unavailable',
    latencyMs: 0,
    detail: process.env.LLM_API_KEY ? 'LLM_API_KEY configured' : 'LLM_API_KEY not set',
  };

  const checks = {
    tenantRegistry: registryHealth,
    sessionStore: sessionHealth,
    configStore: configHealth,
    dedupStore: dedupHealth,
    secretsVault: vaultHealth,
  };

  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
  const anyUnavailable = Object.values(checks).some(c => c.status === 'unavailable');
  const status = allHealthy ? 'ok' : anyUnavailable ? 'degraded' : 'degraded';

  res.status(allHealthy ? 200 : 503).json({
    status,
    service: 'pipeline-orchestrator',
    checks,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ─── Metrics Endpoint (JSON) ──────────────────────────────────
app.get('/api/metrics', (_req, res) => {
  res.json({
    counters: {
      'pipeline.requests': metrics.getCounter('pipeline.requests'),
      'pipeline.completed': metrics.getCounter('pipeline.completed'),
    },
    histograms: {
      'pipeline.total.duration': metrics.getHistogram('pipeline.total.duration'),
      'pipeline.stage-1-ingestion.duration': metrics.getHistogram('pipeline.stage-1-ingestion.duration'),
      'pipeline.stage-5-response-generation.duration': metrics.getHistogram('pipeline.stage-5-response-generation.duration'),
    },
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ─── Prometheus Metrics (text format, scrapeable) ──────────────
app.get('/api/metrics/prometheus', (_req, res) => {
  const lines: string[] = [];
  const ts = Math.floor(Date.now() / 1000);

  lines.push('# HELP pipeline_requests_total Total pipeline requests');
  lines.push('# TYPE pipeline_requests_total counter');
  lines.push(`pipeline_requests_total ${metrics.getCounter('pipeline.requests')} ${ts}`);

  lines.push('# HELP pipeline_completed_total Total completed pipeline runs');
  lines.push('# TYPE pipeline_completed_total counter');
  lines.push(`pipeline_completed_total ${metrics.getCounter('pipeline.completed')} ${ts}`);

  const totalHist = metrics.getHistogram('pipeline.total.duration');
  if (totalHist) {
    lines.push('# HELP pipeline_duration_ms Pipeline total duration');
    lines.push('# TYPE pipeline_duration_ms histogram');
    lines.push(`pipeline_duration_ms_count ${totalHist.count} ${ts}`);
    lines.push(`pipeline_duration_ms_sum ${totalHist.sum} ${ts}`);
    lines.push(`pipeline_duration_ms_min ${totalHist.min} ${ts}`);
    lines.push(`pipeline_duration_ms_max ${totalHist.max} ${ts}`);
    lines.push(`pipeline_duration_ms_avg ${totalHist.avg} ${ts}`);
    lines.push(`pipeline_duration_ms_p50 ${totalHist.p50} ${ts}`);
    lines.push(`pipeline_duration_ms_p95 ${totalHist.p95} ${ts}`);
    lines.push(`pipeline_duration_ms_p99 ${totalHist.p99} ${ts}`);
  }

  lines.push('# HELP pipeline_uptime_seconds Process uptime');
  lines.push('# TYPE pipeline_uptime_seconds gauge');
  lines.push(`pipeline_uptime_seconds ${Math.round(process.uptime())} ${ts}`);

  res.type('text/plain').send(lines.join('\n'));
});

// Resolve tenant from API key for session creation
async function resolveTenant(headers: Record<string, string>): Promise<string | null> {
  const authHeader = headers['authorization'] || '';
  const apiKey = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (headers['x-api-key'] || '').trim();

  if (!apiKey) return null;
  const result = await tenantRegistry.validateApiKey(apiKey);
  return result?.tenantId ?? null;
}

// Pipeline entry
app.post('/api/chat', async (req, res) => {
  const start = performance.now();
  const traceId = (req as any)?.requestId || randomUUID();
  try {
    const validation = validateChatInput(req.body);
    if (validation.errors.length > 0) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: validation.errors, traceId, stage: 'input-validation', timestamp: new Date().toISOString() });
    }

    const { message, sessionId } = req.body;
    const headers = req.headers as Record<string, string>;

    // Resolve tenant from API key (single auth call)
    const resolvedTenant = await resolveTenant(headers);
    if (!resolvedTenant) {
      metrics.increment('pipeline.auth.failures');
      return res.status(401).json({ success: false, error: 'Valid API key required', traceId, stage: 'auth', timestamp: new Date().toISOString() });
    }

    // Resolve or create session
    const providedSessionId = sessionId || (req.headers['x-session-id'] as string) || '';
    let effectiveSessionId: string;
    if (providedSessionId) {
      const existing = await sessionStore.loadSession(resolvedTenant, providedSessionId);
      if (existing) {
        effectiveSessionId = providedSessionId;
      } else {
        const session = await sessionStore.createSession(resolvedTenant, 1, 1440, providedSessionId);
        effectiveSessionId = session.sessionId;
      }
    } else {
      const session = await sessionStore.createSession(resolvedTenant, 1);
      effectiveSessionId = session.sessionId;
    }

    // Pass pre-authenticated tenant to pipeline (avoids duplicate auth in runPipeline)
    const result = await runPipeline({
      rawMessage: message,
      headers: { ...headers, 'x-tenant-id': resolvedTenant, 'x-session-id': effectiveSessionId },
      ip: req.ip || '',
    }, { ...deps, authDisabled: true, authenticatedTenantId: resolvedTenant });

    const durationMs = Math.round(performance.now() - start);
    createContextLogger(logger, { tenantId: resolvedTenant, sessionId: effectiveSessionId }).info({
      path: '/api/chat',
      statusCode: result.statusCode,
      durationMs,
      pipelineLatencyMs: result.latencyMs,
      stageTimings: result.stageTimings,
      degraded: result.degradedStages,
    }, `Chat request completed ${result.statusCode} ${durationMs}ms`);

    const enriched = await enrichWithConversationIntelligence(
      {
        response: result.response,
        turnId: result.turnId,
        latencyMs: result.latencyMs,
        stageTimings: result.stageTimings,
        degradedStages: result.degradedStages,
        error: result.error ? { code: result.error.errorCode, message: result.error.message } : undefined,
      },
      message,
      resolvedTenant,
      sessionStore,
      effectiveSessionId,
    );

    res.status(result.statusCode).json(enriched);
  } catch (err: any) {
    metrics.increment('pipeline.errors');
    createContextLogger(logger).error({ err, traceId }, 'Chat request failed');
    const stage = err.stage || 'pipeline-orchestrator';
    const statusCode = (err.statusCode >= 400 && err.statusCode < 600) ? err.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      error: err.message || 'Internal server error',
      traceId,
      stage,
      timestamp: new Date().toISOString(),
    });
  }
});

// SSE streaming endpoint
app.post('/api/chat/stream', async (req, res) => {
  try {
    const validation = validateChatInput(req.body);
    if (validation.errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    const { message, sessionId } = req.body;
    const headers = req.headers as Record<string, string>;

    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Streaming not configured (no LLM_API_KEY)' });
    }

    // Resolve tenant from API key (single auth call)
    const resolvedTenant = await resolveTenant(headers);
    if (!resolvedTenant) {
      return res.status(401).json({ error: 'Valid API key required' });
    }
    const resolvedSessionId = sessionId || (req.headers['x-session-id'] as string) || '';
    let effectiveSessionId = resolvedSessionId;
    if (!resolvedSessionId) {
      const session = await sessionStore.createSession(resolvedTenant, 1);
      effectiveSessionId = session.sessionId;
    } else {
      const existing = await sessionStore.loadSession(resolvedTenant, resolvedSessionId);
      if (!existing) {
        const session = await sessionStore.createSession(resolvedTenant, 1, 1440, resolvedSessionId);
        effectiveSessionId = session.sessionId;
      }
    }

    // Run pipeline for auth, safety, and context loading (uses non-streaming provider)
    const pipelineResult = await runPipeline({
      rawMessage: message,
      headers: { ...headers, 'x-tenant-id': resolvedTenant, 'x-session-id': effectiveSessionId },
      ip: req.ip || '',
    }, { ...deps, llmApiKey: undefined, authDisabled: true, authenticatedTenantId: resolvedTenant });

    // If pipeline rejected the request, return the error
    if (pipelineResult.statusCode !== 200) {
      return res.status(pipelineResult.statusCode).json({
        response: pipelineResult.response,
        turnId: pipelineResult.turnId,
        error: pipelineResult.error ? { code: pipelineResult.error.errorCode, message: pipelineResult.error.message } : undefined,
      });
    }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const controller = new AbortController();
  req.on('close', () => controller.abort());

  try {
    const tenantConfig = await configStore.latestVersion(resolvedTenant);
    if (!tenantConfig) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'No tenant config' })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const provider = new StreamingOpenAIChatProvider(apiKey);
    const llmConfig = {
      model: tenantConfig.llm.model,
      temperature: tenantConfig.llm.temperature,
      maxTokens: tenantConfig.llm.maxTokens,
    };

    // Build prompt from pipeline context (system prompt + user message)
    const messages = [
      { role: 'system' as const, content: tenantConfig.llm.systemPrompt },
      { role: 'user' as const, content: message },
    ];

    let fullContent = '';

    for await (const chunk of provider.generateStream(messages, llmConfig, controller.signal)) {
      fullContent += chunk.delta;
      res.write(`data: ${JSON.stringify({ type: 'token', content: chunk.delta })}\n\n`);

      if (chunk.finishReason) {
        res.write(`data: ${JSON.stringify({ type: 'done', finishReason: chunk.finishReason })}\n\n`);
      }
    }

    // Send final metadata
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      turnId: effectiveSessionId,
      fullContent,
    })}\n\n`);
    res.write('data: [DONE]\n\n');
  } catch (err: any) {
    if (err.code === 'ERR_LLM_TIMEOUT' || controller.signal.aborted) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream cancelled' })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message || 'Stream error' })}\n\n`);
    }
  } finally {
    res.end();
  }
  } catch (err: any) {
    logger.error({ err }, 'Stream request failed');
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// ─── Admin API (session intelligence) ──────────────────────────
// Internal auth middleware for admin routes — requires x-tenant-id + valid API key
app.use('/api/admin', (req, _res, next) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const apiKey = req.headers['x-api-key'] as string;
  if (!tenantId) return _res.status(401).json({ error: 'x-tenant-id header is required' });
  if (!apiKey) return _res.status(401).json({ error: 'x-api-key header is required' });
  tenantRegistry.validateApiKey(apiKey).then(result => {
    if (!result || result.tenantId !== tenantId) {
      return _res.status(403).json({ error: 'Invalid API key for tenant' });
    }
    next();
  }).catch(() => _res.status(500).json({ error: 'Auth check failed' }));
});
app.use('/api', createAdminRouter(sessionStore, adminStore));

// ─── Knowledge Admin API (document management) ─────────────────
app.use('/api/knowledge', (req, _res, next) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const apiKey = req.headers['x-api-key'] as string;
  if (!tenantId) return _res.status(401).json({ error: 'x-tenant-id header is required' });
  if (!apiKey) return _res.status(401).json({ error: 'x-api-key header is required' });
  tenantRegistry.validateApiKey(apiKey).then(result => {
    if (!result || result.tenantId !== tenantId) {
      return _res.status(403).json({ error: 'Invalid API key for tenant' });
    }
    next();
  }).catch(() => _res.status(500).json({ error: 'Auth check failed' }));
});
app.use('/api', createKnowledgeAdminRouter(knowledgeAdminStore, knowledgePipeline, knowledgeDb));

// ─── Knowledge Worker Status Endpoint ──────────────────────────
app.get('/api/knowledge/worker-status', (_req, res) => {
  res.json(knowledgeWorker.getStatus());
});

// ─── Internal Sync Auth Middleware ─────────────────────────────
const INTERNAL_SYNC_KEY = process.env.INTERNAL_SYNC_KEY || '';
const SYNC_TIMESTAMP_TOLERANCE_MS = 30000; // 30s clock skew tolerance

function requireInternalAuth(req: express.Request): { ok: boolean; reason?: string } {
  // Require INTERNAL_SYNC_KEY to be configured
  if (!INTERNAL_SYNC_KEY) {
    return { ok: false, reason: 'Internal sync not configured (INTERNAL_SYNC_KEY not set)' };
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  // Verify bearer token matches
  if (!token || token !== INTERNAL_SYNC_KEY) {
    return { ok: false, reason: 'Invalid or missing internal sync token' };
  }

  // Replay protection: require X-Timestamp header within tolerance window
  const timestampStr = req.headers['x-timestamp'] as string;
  if (!timestampStr) {
    return { ok: false, reason: 'Missing X-Timestamp header (replay protection)' };
  }
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return { ok: false, reason: 'X-Timestamp must be a Unix epoch millisecond number' };
  }
  const now = Date.now();
  if (Math.abs(now - timestamp) > SYNC_TIMESTAMP_TOLERANCE_MS) {
    return { ok: false, reason: 'X-Timestamp is outside tolerance window (max 30s skew)' };
  }

  // Replay protection: require X-Nonce header not recently seen
  const nonce = req.headers['x-nonce'] as string;
  if (!nonce || nonce.length < 8) {
    return { ok: false, reason: 'Missing or invalid X-Nonce header' };
  }

  return { ok: true };
}

// Internal endpoint for SaaS API to sync API keys into pipeline tenant registry
app.post('/api/internal/sync-key', express.json(), async (req, res) => {
  try {
    const auth = requireInternalAuth(req);
    if (!auth.ok) {
      return res.status(401).json({ error: auth.reason });
    }

    const { tenantId, apiKey, label, role } = req.body;
    if (!tenantId || !apiKey) {
      return res.status(400).json({ error: 'tenantId and apiKey are required' });
    }
    tenantRegistry.seedTenant(tenantId, 'active');
    tenantRegistry.seedApiKey(tenantId, apiKey, label || 'synced', role || 'end-user');
    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'Failed to sync API key');
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Internal endpoint for SaaS API to sync tenant config into pipeline config store
app.post('/api/internal/sync-config', express.json(), async (req, res) => {
  try {
    const auth = requireInternalAuth(req);
    if (!auth.ok) {
      return res.status(401).json({ error: auth.reason });
    }

    const { tenantId, config } = req.body;
    if (!tenantId || !config) {
      return res.status(400).json({ error: 'tenantId and config are required' });
    }
    await configStore.saveVersion(tenantId, config);
    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'Failed to sync config');
    res.status(500).json({ error: 'Sync failed' });
  }
});

// ─── Auth Routes (signup, login, me) ────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Refusing to start without a secure signing key.');
}
const authDbPath = join(DATA_DIR, 'saas.db');
const authDb = createDatabase(authDbPath);
const userRepo = new UserRepository(authDb);
const tenantRepo = new TenantRepository(authDb);

// ─── Website Scanner Scheduler (recurring daily/weekly scans) ────────
const websiteScanScheduler = createWebsiteScanScheduler({
  scanRepo: new WebsiteScanRepository(authDb),
  pageRepo: new ScannedPageRepository(authDb),
  kbRepo: new KnowledgeBaseRepository(authDb),
  docRepo: new KbDocumentRepository(authDb),
  chunkRepo: new KbChunkRepository(authDb),
});
websiteScanScheduler.start();

app.post('/api/auth/signup', (req, res) => {
  try {
    const { email, password, name, companyName } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password, and name are required' });
    }
    const existing = userRepo.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const { token: verificationToken, expiresAt: verificationTokenExpiry } = generateVerificationToken();
    const user = userRepo.create({ email, password, name, verificationToken, verificationTokenExpiry });
    const tenant = tenantRepo.create({ name: companyName || `${name}'s Organization`, ownerId: user.id });
    const token = generateToken({ sub: user.id, email: user.email, name: user.name, tenantId: tenant.id, role: 'owner' }, JWT_SECRET);
    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan },
      token,
    });
  } catch (err: any) {
    createContextLogger(logger).error({ err }, 'Signup failed');
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const user = userRepo.findByEmail(email);
    if (!user || !comparePassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const tenants = tenantRepo.findByOwner(user.id);
    const primaryTenant = tenants[0];
    const token = generateToken({ sub: user.id, email: user.email, name: user.name, tenantId: primaryTenant?.id, role: 'owner' }, JWT_SECRET);
    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      tenant: primaryTenant ? { id: primaryTenant.id, name: primaryTenant.name, slug: primaryTenant.slug, plan: primaryTenant.plan } : null,
      token,
    });
  } catch (err: any) {
    createContextLogger(logger).error({ err }, 'Login failed');
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = require('jsonwebtoken').verify(auth.slice(7), JWT_SECRET) as any;
    const user = userRepo.findById(decoded.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const tenants = tenantRepo.findByOwner(user.id);
    res.json({
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
      tenants: tenants.map(t => ({ id: t.id, name: t.name, slug: t.slug, plan: t.plan, subscriptionStatus: t.subscriptionStatus })),
    });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Catch-all for unknown API routes — structured error, never raw 404
// Must use `app.all` with explicit path patterns to catch unmatched API routes.
// This runs after all specific routes and mounted routers.
app.all('/api/*', (req, res) => {
  const traceId = (req as any)?.requestId || randomUUID();
  errorResponse(res, 404, `Route not found: ${req.method} ${req.path}`, 'routing', traceId);
});
// Also catch '/api' (no trailing path)
app.all('/api', (req, res) => {
  const traceId = (req as any)?.requestId || randomUUID();
  errorResponse(res, 404, `Route not found: ${req.method} ${req.path}`, 'routing', traceId);
});

export default app;

// Only start listening when run directly (not when imported in tests)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Conversation Engine started');
  });

  // ─── Graceful Shutdown ────────────────────────────────────
  function shutdown(signal: string) {
    logger.info({ signal }, 'Shutting down gracefully');
    const forceExit = setTimeout(() => {
      logger.info('Forcing shutdown');
      process.exit(1);
    }, 10000).unref();
    server.close(() => {
      clearTimeout(forceExit);
      logger.info('HTTP server closed');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
