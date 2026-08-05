export { createDatabase } from './db/database';
export {
  UserRepository, TenantRepository, ApiKeyRepository,
  ConversationRepository, MessageRepository, UsageRepository,
  KnowledgeBaseRepository, KbDocumentRepository, OnboardingProgressRepository,
  WidgetConfigRepository, RefreshTokenRepository, AnalyticsRepository,
  SubscriptionRepository, InvoiceRepository, PaymentRepository,
  BillingEventRepository,
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
} from './db/repositories';
export {
  hashPassword, comparePassword, generateToken, verifyToken,
  generateApiKey, verifyApiKey, generateId, slugify,
  generateVerificationToken, generateResetToken, isExpired,
  hashToken,
} from './auth';
export type { JwtPayload } from './auth';
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
} from './types';
export type { HandoffRequest } from './db/repositories';
export { PaddleClient, PADDLE_PLANS, getPlanLimits } from './paddle';
export type { PaddlePlanConfig, PlanLimits } from './paddle';
