import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { join } from 'path';
import {
  createDatabase, UserRepository, TenantRepository, ApiKeyRepository,
  ConversationRepository, MessageRepository, UsageRepository,
  KnowledgeBaseRepository, KbDocumentRepository, OnboardingProgressRepository,
  WidgetConfigRepository, RefreshTokenRepository, AnalyticsRepository,
  generateId,
  SubscriptionRepository, InvoiceRepository, PaymentRepository,
  BillingEventRepository,
  UnansweredQuestionRepository, UnansweredQuestionClusterRepository,
  KnowledgeSuggestionRepository, CitationAnalyticsRepository,
  ConversationInsightsRepository,
  TeamMemberRepository, InvitationRepository, ActivityRepository,
  AuditLogRepository, EnhancedApiKeyRepository,
  WebhookRepository, WebhookDeliveryRepository,
  UptimeRepository, SecurityStatusRepository, IncidentRepository,
  ComplianceDocumentRepository, DpaRepository, SubprocessorRepository,
  TopicResponseTemplateRepository,
  HandoffRequestRepository,
  LeadRepository,
  LeadService,
  AnalyticsService,
  SessionHandoffService,
} from '@conversation-engine/saas-core';
import { createLogger, generateRequestId, runWithContext, RequestContext, createContextLogger, metrics } from '@conversation-engine/logger';
import { authMiddleware, publicChatAuth } from './middleware/auth';
import { createRateLimit } from './middleware/rate-limit';
import { requireTenant, enforceTenantAccess } from './middleware/tenant';
import { createAuthRoutes } from './routes/auth';
import { createPasswordResetRoutes } from './routes/auth-password-reset';
import { createVerifyRoutes } from './routes/auth-verify';
import { createTenantRoutes } from './routes/tenants';
import { createApiKeyRoutes } from './routes/api-keys';
import { createConversationRoutes } from './routes/conversations';
import { createUsageRoutes } from './routes/usage';
import { createKnowledgeBaseRoutes } from './routes/knowledge-base';
import { createKnowledgeRoutes } from './routes/knowledge';
import { createOnboardingRoutes } from './routes/onboarding';
import { createChatRoutes } from './routes/chat';
import { DbKnowledgeBaseProvider } from './orchestrator';
import { createWidgetRoutes } from './routes/widget';
import { createBillingRoutes } from './routes/billing';
import { createBillingWebhookRoutes } from './routes/billing-webhooks';
import { createAdminRoutes } from './routes/admin';
import { createActivationRoutes } from './routes/admin-activation';
import { createTeamRoutes } from './routes/team';
import { createAuditRoutes } from './routes/audit';
import { createWebhookRoutes } from './routes/webhooks';
import { createWhatsAppRoutes } from './routes/whatsapp';
import { WhatsAppClient } from '@conversation-engine/saas-core';
import { createTrustRoutes } from './routes/trust';
import { createLeadRoutes } from './routes/leads';
import { createHardeningRoutes } from './routes/hardening';
import { errorHandler } from './middleware/structured-error';
import { setEmailProvider } from './services/email';
import { SendGridEmailProvider } from './services/sendgrid-email';
import { setRawBodyBuffer } from './routes/billing-webhooks';
import { createAnalyticsRoutes } from './routes/analytics';
import { createHealthRoutes } from './routes/health';
import { createAgentChatRoutes } from './routes/agent-chat';

const logger = createLogger('saas-api');
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Refusing to start with a fallback secret.');
}

const NODE_ENV = process.env.NODE_ENV || 'development';

// ─── Required ENV Validation ────────────────────────────────────
const REQUIRED_ENV_VARS: { key: string; purpose: string }[] = [
  { key: 'JWT_SECRET', purpose: 'JWT token signing and verification' },
  { key: 'WIDGET_SECRET', purpose: 'Widget token signing (tokens are trivially forgeable without it)' },
];

// In production, APP_URL and PIPELINE_URL are required
if (NODE_ENV === 'production') {
  REQUIRED_ENV_VARS.push(
    { key: 'APP_URL', purpose: 'Public URL for email links and webhook redirects (no localhost fallback in production)' },
    { key: 'PIPELINE_URL', purpose: 'Internal URL for pipeline-orchestrator sync (no localhost fallback in production)' },
    { key: 'PADDLE_API_KEY', purpose: 'Paddle payment processing' },
    { key: 'PADDLE_WEBHOOK_SECRET', purpose: 'Paddle webhook signature verification' },
    { key: 'OPENAI_API_KEY', purpose: 'OpenAI embeddings for knowledge pipeline (mock embeddings blocked in production)' },
    { key: 'INTERNAL_SYNC_KEY', purpose: 'Secure sync between API and pipeline services' },
    { key: 'SENDGRID_API_KEY', purpose: 'Sending auth emails (signup, password reset, verification)' },
    { key: 'PADDLE_PRICE_STARTER_MONTHLY', purpose: 'Paddle price ID for Starter plan monthly billing' },
    { key: 'PADDLE_PRICE_PROFESSIONAL_MONTHLY', purpose: 'Paddle price ID for Professional plan monthly billing' },
    { key: 'PADDLE_PRICE_ENTERPRISE_MONTHLY', purpose: 'Paddle price ID for Enterprise plan monthly billing' },
  );
}

const OPTIONAL_WARN_ENV_VARS: { key: string; purpose: string }[] = [];

for (const { key, purpose } of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    throw new Error(`${key} environment variable is required (${purpose}). Refusing to start.`);
  }
}

for (const { key, purpose } of OPTIONAL_WARN_ENV_VARS) {
  if (!process.env[key]) {
    logger.warn({ key, purpose }, `Missing optional environment variable ${key} — ${purpose}`);
  }
}

// ─── Email Provider ──────────────────────────────────────────────
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  setEmailProvider(new SendGridEmailProvider(SENDGRID_API_KEY));
  logger.info('SendGrid email provider configured');
} else if (NODE_ENV === 'production') {
  throw new Error('SENDGRID_API_KEY is required in production for sending auth emails (signup, password reset, verification).');
} else {
  logger.warn('SENDGRID_API_KEY not set — using ConsoleEmailProvider. Auth emails will be logged to console only.');
}

const rawCorsOrigin = process.env.CORS_ORIGIN || '';
const CORS_ORIGIN: string[] | false | true = rawCorsOrigin === '*'
  ? true
  : rawCorsOrigin
    ? rawCorsOrigin.split(',').map(s => s.trim()).filter(Boolean)
    : false;
if (CORS_ORIGIN && !Array.isArray(CORS_ORIGIN) && CORS_ORIGIN !== true) {
  throw new Error('CORS_ORIGIN must be a comma-separated list of origins, "*", or false');
} else if (!CORS_ORIGIN && process.env.NODE_ENV === 'production') {
  logger.warn('CORS_ORIGIN not set — API will reject all cross-origin requests. Set CORS_ORIGIN to a comma-separated list of allowed origins.');
}
const DB_PATH = process.env.DATABASE_PATH || process.env.DB_PATH || join(__dirname, '..', '..', '..', 'data', 'saas.db');
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
const MAX_BODY_SIZE = process.env.MAX_BODY_SIZE || '10mb';

if (isNaN(RATE_LIMIT_WINDOW_MS) || RATE_LIMIT_WINDOW_MS < 1000) {
  throw new Error('RATE_LIMIT_WINDOW_MS must be a positive integer >= 1000');
}
if (isNaN(RATE_LIMIT_MAX) || RATE_LIMIT_MAX < 1) {
  throw new Error('RATE_LIMIT_MAX must be a positive integer >= 1');
}
const PORT = parseInt(process.env.PORT || '3457', 10);
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT must be a valid port number (1-65535)');
}

import Database from 'better-sqlite3';
const db: Database.Database = createDatabase(DB_PATH);
const userRepo = new UserRepository(db);
const tenantRepo = new TenantRepository(db);
const apiKeyRepo = new ApiKeyRepository(db);
const conversationRepo = new ConversationRepository(db);
const messageRepo = new MessageRepository(db);
const usageRepo = new UsageRepository(db);
const kbRepo = new KnowledgeBaseRepository(db);
const docRepo = new KbDocumentRepository(db);
const onboardingRepo = new OnboardingProgressRepository(db);
const widgetConfigRepo = new WidgetConfigRepository(db);
const refreshTokenRepo = new RefreshTokenRepository(db);
const analyticsRepo = new AnalyticsRepository(db);
const subRepo = new SubscriptionRepository(db);
const invoiceRepo = new InvoiceRepository(db);
const paymentRepo = new PaymentRepository(db);
const eventRepo = new BillingEventRepository(db);
const unansweredRepo = new UnansweredQuestionRepository(db);
const clusterRepo = new UnansweredQuestionClusterRepository(db);
const suggestionRepo = new KnowledgeSuggestionRepository(db);
const citationRepo = new CitationAnalyticsRepository(db);
const insightsRepo = new ConversationInsightsRepository(db);

// Enterprise repositories
const teamMemberRepo = new TeamMemberRepository(db);
const invitationRepo = new InvitationRepository(db);
const activityRepo = new ActivityRepository(db);
const auditLogRepo = new AuditLogRepository(db);
const enhancedApiKeyRepo = new EnhancedApiKeyRepository(db);
const webhookRepo = new WebhookRepository(db);
const webhookDeliveryRepo = new WebhookDeliveryRepository(db);
const uptimeRepo = new UptimeRepository(db);
const securityRepo = new SecurityStatusRepository(db);
const incidentRepo = new IncidentRepository(db);
const complianceRepo = new ComplianceDocumentRepository(db);
const dpaRepo = new DpaRepository(db);
const subprocessorRepo = new SubprocessorRepository(db);
const topicResponseRepo = new TopicResponseTemplateRepository(db);
const handoffRepo = new HandoffRequestRepository(db);
const leadRepo = new LeadRepository(db);

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({ origin: CORS_ORIGIN === false ? false : (CORS_ORIGIN || false), credentials: true }));
app.use(compression() as any);
// Raw body parser for webhook signature verification (must come before json parser)
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }), (req: any, _res: any, next: any) => {
  setRawBodyBuffer(req.body instanceof Buffer ? req.body : undefined);
  next();
});
app.use(express.json({ limit: MAX_BODY_SIZE }));

// ─── Global Rate Limiting ──────────────────────────────────────
const globalRateLimit = createRateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  keyFn: (req) => req.ip || 'unknown',
});
app.use(globalRateLimit);

// ─── Request ID + Context Middleware ──────────────────────────
app.use((req: Request, _res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || generateRequestId();
  const ctx: RequestContext = {
    requestId,
    ip: req.ip || req.socket?.remoteAddress || 'unknown',
  };
  runWithContext(ctx, () => {
    (req as any).requestId = requestId;
    metrics.increment('http.requests');
    next();
  });
});

// ─── Response Timing + Logging Middleware ──────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = performance.now();
  res.on('finish', () => {
    const durationMs = Math.round(performance.now() - start);
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level]({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
      requestId: (req as any).requestId,
    }, `${req.method} ${req.path} ${res.statusCode} ${durationMs}ms`);
    metrics.increment('http.responses');
    metrics.increment(`http.status.${res.statusCode}`);
    metrics.record('http.duration', durationMs);
    if (res.statusCode >= 500) metrics.increment('http.errors');
  });
  next();
});

// Stricter rate limiting for auth endpoints
app.use('/api/auth/login', createRateLimit({ windowMs: 900000, max: 20 }));
app.use('/api/auth/register', createRateLimit({ windowMs: 900000, max: 10 }));
app.use('/api/auth/signup', createRateLimit({ windowMs: 900000, max: 10 }));
app.use('/api/auth/forgot-password', createRateLimit({ windowMs: 900000, max: 5 }));

// Public routes
app.use('/api/auth', createAuthRoutes(userRepo, tenantRepo, refreshTokenRepo, JWT_SECRET));
app.use('/api/auth', createPasswordResetRoutes(userRepo));
app.use('/api/auth', createVerifyRoutes(userRepo, JWT_SECRET));

// Widget public routes
app.use('/api/widget', createWidgetRoutes(widgetConfigRepo, JWT_SECRET));

// Protected routes
const auth = authMiddleware(JWT_SECRET);
const tenantGuard = requireTenant(tenantRepo);

// Widget handoff route (uses widget token auth like /api/chat)
const widgetHandoffAuth = publicChatAuth(JWT_SECRET, apiKeyRepo, tenantRepo);
app.post('/api/widget/handoff', widgetHandoffAuth, (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Tenant context required' });
    const { sessionId, visitorEmail, message } = req.body;
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'sessionId is required' });
    }
    const conv = conversationRepo.findBySession(tenantId, sessionId);
    if (conv) {
      conversationRepo.updateStatus(conv.id, 'escalated');
    }
    const handoff = handoffRepo.create({
      tenantId,
      sessionId,
      visitorEmail: visitorEmail || undefined,
      conversationSummary: message || undefined,
    });
    res.json({ success: true, message: 'Your request has been received. Someone will reach out shortly.', handoffId: handoff.id });
  } catch (err: any) {
    createContextLogger(logger).error({ err }, 'Handoff request failed');
    res.status(500).json({ error: 'Failed to submit handoff request' });
  }
});

// Get handoff info for a conversation (for owner panel)
app.get('/api/conversations/:id/handoff', auth, tenantGuard, (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const conv = conversationRepo.findById(req.params.id);
    if (!conv || conv.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const handoff = handoffRepo.findBySession(conv.sessionId);
    res.json({ handoff: handoff || null });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch handoff info' });
  }
});

// Conversation resolve route (for owner panel)
app.patch('/api/conversations/:id/resolve', auth, tenantGuard, (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const conv = conversationRepo.findById(req.params.id);
    if (!conv || conv.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    conversationRepo.updateStatus(conv.id, 'ended');
    const handoff = handoffRepo.findBySession(conv.sessionId);
    if (handoff && handoff.status === 'pending') {
      handoffRepo.resolve(handoff.id, req.user?.sub || 'owner');
    }
    res.json({ success: true });
  } catch (err: any) {
    createContextLogger(logger).error({ err }, 'Failed to resolve conversation');
    res.status(500).json({ error: 'Failed to resolve conversation' });
  }
});

app.use('/api/tenants', auth, tenantGuard, enforceTenantAccess(), createTenantRoutes(tenantRepo, userRepo));
app.use('/api/api-keys', auth, tenantGuard, createApiKeyRoutes(enhancedApiKeyRepo, tenantRepo, auditLogRepo));
app.use('/api/conversations', auth, tenantGuard, createConversationRoutes(conversationRepo, messageRepo));
app.use('/api/usage', auth, tenantGuard, createUsageRoutes(usageRepo));
app.use('/api/knowledge-bases', auth, tenantGuard, createKnowledgeBaseRoutes(kbRepo, docRepo));
const chatKbProvider = new DbKnowledgeBaseProvider(topicResponseRepo, db);
const leadService = new LeadService(leadRepo);
// Live Human Agent Takeover / Session Handoff
const sessionHandoff = new SessionHandoffService(conversationRepo);
app.use('/api/chat', publicChatAuth(JWT_SECRET, apiKeyRepo, tenantRepo), tenantGuard, createChatRoutes(conversationRepo, messageRepo, usageRepo, chatKbProvider, { leadService, webhookRepo, webhookDeliveryRepo, getNotificationConfig: (tenantId) => widgetConfigRepo.get(tenantId), analyticsRepo, getStarterOptions: (tenantId) => widgetConfigRepo.get(tenantId)?.starterOptions }, sessionHandoff));
app.use('/api/sessions', auth, tenantGuard, createAgentChatRoutes(conversationRepo, messageRepo, sessionHandoff, leadRepo, handoffRepo));
app.use('/api/billing', auth, tenantGuard, createBillingRoutes(subRepo, tenantRepo, invoiceRepo, paymentRepo, eventRepo, conversationRepo, usageRepo, docRepo));
app.use('/api/billing', createBillingWebhookRoutes(subRepo, tenantRepo, invoiceRepo, paymentRepo, eventRepo));
app.use('/api/admin', auth, tenantGuard, createAdminRoutes(userRepo, tenantRepo, conversationRepo, usageRepo, kbRepo, docRepo, apiKeyRepo, analyticsRepo, subRepo, messageRepo, leadRepo, handoffRepo));

// Customer Activation routes
app.use('/api/admin', auth, tenantGuard, createActivationRoutes(
  unansweredRepo, clusterRepo, suggestionRepo, citationRepo, insightsRepo,
  tenantRepo, usageRepo, subRepo, conversationRepo,
));

// Knowledge pipeline routes (protected)
const knowledgeDeps = {
  db,
  embeddingApiKey: process.env.OPENAI_API_KEY,
  embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSION || '128', 10),
};
app.use('/api/knowledge', auth, tenantGuard, createKnowledgeRoutes(knowledgeDeps));

// Onboarding routes
const onboardingDeps = { onboardingRepo, conversationRepo, messageRepo, usageRepo, docRepo };
app.use('/api/onboarding', auth, tenantGuard, createOnboardingRoutes(onboardingRepo, conversationRepo, messageRepo, usageRepo, docRepo, userRepo, JWT_SECRET));

// ─── Enterprise Routes ──────────────────────────────────────────

// Team Management
app.use('/api/team', auth, tenantGuard, createTeamRoutes(teamMemberRepo, invitationRepo, activityRepo, tenantRepo, userRepo));

// Audit Log
app.use('/api/audit', auth, tenantGuard, createAuditRoutes(auditLogRepo));

// ─── Omnichannel: WhatsApp Business API ──────────────────────────
// Mounted BEFORE the protected /api/webhooks routes below — Meta's
// webhook verification + event delivery must NOT pass auth middleware.
const whatsappTenantId = process.env.WHATSAPP_TENANT_ID
  || tenantRepo.findBySlug('demo-tenant')?.id
  || 'demo-tenant';
app.use('/api/webhooks/whatsapp', createWhatsAppRoutes({
  conversationRepo,
  messageRepo,
  usageRepo,
  kbProvider: chatKbProvider,
  leadOptions: { leadService, webhookRepo, webhookDeliveryRepo, getNotificationConfig: (tenantId) => widgetConfigRepo.get(tenantId) },
  whatsappClient: process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TOKEN
    ? new WhatsAppClient({ phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID, token: process.env.WHATSAPP_TOKEN })
    : new WhatsAppClient(),
  tenantId: whatsappTenantId,
}));

// Webhooks
app.use('/api/webhooks', auth, tenantGuard, createWebhookRoutes(webhookRepo, webhookDeliveryRepo, auditLogRepo));

// Leads
app.use('/api/leads', auth, tenantGuard, createLeadRoutes(leadRepo, webhookRepo, webhookDeliveryRepo));

// Analytics
const analyticsService = new AnalyticsService(db);
app.use('/api/analytics', auth, tenantGuard, createAnalyticsRoutes(analyticsService));

// Trust Center
app.use('/api/trust', auth, tenantGuard, createTrustRoutes(uptimeRepo, securityRepo, incidentRepo, complianceRepo, dpaRepo, subprocessorRepo));

// Production Hardening (health, debug)
app.use('/api', createHardeningRoutes(() => [
  { name: 'database', check: () => {
    const start = performance.now();
    try { db.prepare('SELECT 1').get(); return { status: 'healthy', latencyMs: Math.round(performance.now() - start) }; }
    catch (err: any) { return { status: 'unavailable', latencyMs: Math.round(performance.now() - start), error: err.message }; }
  }},
  { name: 'metrics', check: () => {
    const start = performance.now();
    try { void metrics.getCounter('http.requests'); return { status: 'healthy', latencyMs: Math.round(performance.now() - start) }; }
    catch (err: any) { return { status: 'unavailable', latencyMs: Math.round(performance.now() - start), error: err.message }; }
  }},
]));

// ─── Liveness & Readiness Probes (Docker/Kubernetes) ───────────
// Standardized endpoints: /health (liveness), /ready (readiness w/ DB check),
// /live (k8s alias), /health/detailed (full dependency report).
// Mounted at both / and /api so legacy probes keep working.
app.use(createHealthRoutes(db));
app.use('/api', createHealthRoutes(db));

// ─── Global Error Handler ─────────────────────────────────────
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  metrics.increment('http.errors');
  errorHandler(err, req, res, next);
});

// ─── Unhandled Rejection & Uncaught Exception ────────────────────
process.on('unhandledRejection', (reason: any) => {
  logger.error({ err: reason }, 'Unhandled promise rejection — shutting down');
  shutdown('UNHANDLED_REJECTION');
});
process.on('uncaughtException', (err: Error) => {
  logger.error({ err }, 'Uncaught exception — shutting down');
  shutdown('UNCAUGHT_EXCEPTION');
});

// ─── Graceful Shutdown ────────────────────────────────────────
let server: ReturnType<typeof app.listen> | null = null;
function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down gracefully');
  const forceExit = setTimeout(() => {
    logger.info('Forcing shutdown');
    process.exit(signal === 'SIGINT' ? 0 : 1);
  }, 10000).unref();
  if (server) {
    server.close(() => {
      db.close();
      logger.info('Database connections closed');
      clearTimeout(forceExit);
      process.exit(signal === 'SIGINT' ? 0 : 1);
    });
  } else {
    db.close();
    logger.info('Database connections closed');
    process.exit(signal === 'SIGINT' ? 0 : 1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app, db, logger };

if (require.main === module) {
  server = app.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'SaaS API started');
    setInterval(() => refreshTokenRepo.cleanExpired(), 3600000).unref();
  });
}
