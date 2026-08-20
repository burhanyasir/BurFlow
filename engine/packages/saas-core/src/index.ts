export { createDatabase } from './db/database';
export { SqliteDatabase } from './db/sqlite';
export type { SqlDatabase, SqlStatement, SqlRunResult, DatabaseDialect } from './db/types';
export { isPostgresDatabase } from './db/types';
export { rewritePlaceholders } from './db/pg/placeholder';
export type { RewrittenSql } from './db/pg/placeholder';
export { PgDatabase } from './db/pg/pg-database';
export type { PgDatabaseOptions } from './db/pg/pg-database';
export { createPrimaryDatabase, assertSaaSMigrationsApplied } from './db/select';
export type { CreatePrimaryDatabaseOptions } from './db/select';
export { serializeError, deserializeError, coerceRows } from './db/pg/protocol';
export type { WorkerOp, WorkerReply, QueryReply } from './db/pg/protocol';
export {
  UserRepository, TenantRepository, ApiKeyRepository,
  ConversationRepository, MessageRepository, UsageRepository,
  KnowledgeBaseRepository, KbDocumentRepository, OnboardingProgressRepository,
  WidgetConfigRepository, RefreshTokenRepository, AnalyticsRepository,
  SubscriptionRepository, InvoiceRepository, PaymentRepository,
  BillingEventRepository, PaddleCustomerRepository,
  UnansweredQuestionRepository, UnansweredQuestionClusterRepository,
  KnowledgeSuggestionRepository, CitationAnalyticsRepository,
  ConversationInsightsRepository,
  // Enterprise
  TeamMemberRepository, InvitationRepository, ActivityRepository,
  AuditLogRepository, EnhancedApiKeyRepository,
  WebhookRepository, WebhookDeliveryRepository,
  UptimeRepository, SecurityStatusRepository, IncidentRepository,
  ComplianceDocumentRepository, DpaRepository, SubprocessorRepository,
  TopicResponseTemplateRepository,
  HandoffRequestRepository,
  LeadRepository,
  WebsiteScanRepository, ScannedPageRepository, KbChunkRepository,
} from './db/repositories';
export {
  hashPassword, comparePassword, generateToken, verifyToken,
  generateApiKey, verifyApiKey, generateId, slugify,
  generateVerificationToken, generateResetToken, isExpired,
  hashToken,
} from './auth';
export { LeadService } from './services/lead-service';
export type { LeadServiceHooks, LeadUpsertResult, UpsertLeadInput } from './services/lead-service';
export { WhatsAppClient, WhatsAppNotConfiguredError } from './services/whatsapp-client';
export type { WhatsAppClientConfig, WhatsAppSendResult } from './services/whatsapp-client';
export { SessionHandoffService, TAKEOVER_ACKNOWLEDGEMENT } from './services/session-handoff';
export { AnalyticsService } from './services/analytics';
export {
  WebsiteScannerService, computeNextScanAt, hashContent, cleanHtml,
  chunkText, extractLinks, isSameOrigin, validateRootUrl, extractTitle,
} from './services/website-scanner';
export type {
  CrawlPage, ScannerOptions, ScanStartOptions, ScannerDeps,
} from './services/website-scanner';
export { BrandExtractor } from './services/brand-extractor';
export type { BrandExtractorOptions } from './services/brand-extractor';
export type {
  AnalyticsTimeframe, SummaryMetrics, TopicBreakdown, TopicCount,
  StarterOptionStats, StarterOptionStat, VisitorIntentCategory,
} from './services/analytics';
export { classifyMessageIntent, VISITOR_INTENT_CATEGORIES } from './services/analytics';
export {
  extractContactDetails,
  determineQualificationStatus,
  mapScoreToBuyingIntent,
  buildLeadData,
  hasContactInfo,
} from './services/lead-extraction';
export type { ContactDetails, BuildLeadDataInput, BuiltLeadData } from './services/lead-extraction';
export type { JwtPayload } from './auth';
export {
  MailerService,
  createNodemailerSmtpTransport,
  createResendTransport,
  createConsoleMailTransport,
  renderLeadAlertEmail,
  renderWelcomeEmail,
  renderPasswordResetEmail,
} from './services/mailer';
export type {
  MailMessage,
  MailTransport,
  SmtpConfig,
  ResendConfig,
  LeadAlertData,
  MailerOptions,
  NodemailerLike,
} from './services/mailer';
export type {
  User, Tenant, TenantApiKey, Conversation, Message,
  UsageRecord, TenantSettings, KnowledgeBase, KbDocument, KbChunk,
  UserRole, SubscriptionPlan, SubscriptionStatus, IngestionStatus,
  OnboardingProgress, OnboardingStep, OnboardingStatus,
  WidgetConfig, RefreshToken, AnalyticsEvent, Subscription,
  Invoice, Payment, BillingEvent, BillingEventType,
  UnansweredQuestion, UnansweredQuestionCluster,
  KnowledgeSuggestion, CitationAnalytics,
  ConversationInsights, UnansweredQuestionStats, UsageAlert,
  // Enterprise
  TeamMember, TeamRole, Invitation, ActivityEvent,
  AuditLogEntry, EnhancedApiKey, ApiKeyPermission, ApiKeyUsageStats,
  Webhook, WebhookEvent, WebhookDelivery,
  UptimeHistory, SecurityStatus, SecurityStatusType,
  Incident, IncidentSeverity, IncidentStatus,
  ComplianceDocument, DpaDocument, Subprocessor,
  TopicResponseTemplate,
  Lead, LeadSource, QualificationStatus, BuyingIntentLevel,
  SessionState, SessionNote,
  ScanStatus, ScanSchedule, ScanCrawlMode, ScannedPageStatus,
  WebsiteScan, ScannedPage, PaddleCustomer,
  WhiteLabelBranding,
} from './types';
export type { BrandIntelligence } from './types';
export type { HandoffRequest } from './db/repositories';
export { PaddleClient, PADDLE_PLANS, getPlanLimits } from './paddle';
export type { PaddlePlanConfig, PlanLimits } from './paddle';
export {
  PADDLE_TIERS, PADDLE_TIERS_BY_ID, PADDLE_TRIAL_DAYS,
  getTierById, getTierPriceId, findPlanByPaddlePriceId,
} from './config/paddle-plans';
export type {
  PaddleTierConfig, PaddlePriceConfig, PaddleCountryPriceOverride,
} from './config/paddle-plans';
// Plan/quota catalog only. StripeClient and the Stripe checkout types are
// quarantined �?" Paddle is the sole billing provider and no production code
// may reach Stripe anymore.
export { getPlanConfig, isUnlimited, UNLIMITED_THRESHOLD } from './stripe';
export type { PlanConfig, StripePlanConfig } from './stripe';
export { deriveWidgetDefaults } from './widget-defaults/derive';
export type { WidgetDerivedDefaults, DerivedStarterButton, DerivedBusinessType } from './widget-defaults/derive';
