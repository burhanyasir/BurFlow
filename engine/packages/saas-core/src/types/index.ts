export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';
export type SubscriptionPlan = 'free' | 'starter' | 'professional' | 'enterprise' | 'pro' | 'advanced';

export type BillingEventType =
  | 'subscription.created' | 'subscription.updated' | 'subscription.canceled'
  | 'subscription.resumed' | 'transaction.completed' | 'transaction.refunded'
  | 'payment.failed' | 'customer.updated';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired' | 'paused';
export type IngestionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'published' | 'queued' | 'parsing' | 'embedding';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  avatarUrl?: string;
  emailVerified: boolean;
  verificationToken?: string;
  verificationTokenExpiry?: string;
  resetToken?: string;
  resetTokenExpiry?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhiteLabelBranding {
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  faviconUrl?: string;
  hideBranding?: boolean;
  customCss?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionPeriodEnd?: string;
  paddleCustomerId?: string;
  trialEndsAt?: string;
  settings: string;
  parentTenantId?: string;
  customDomain?: string;
  whiteLabelBranding?: WhiteLabelBranding;
  notificationEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettings {
  branding: {
    primaryColor: string;
    logoUrl?: string;
    companyName: string;
    welcomeMessage: string;
    offlineMessage: string;
  };
  safety: {
    contentFilterThreshold: 'strict' | 'moderate' | 'relaxed';
    crisisResponseEnabled: boolean;
    piiRedactionMode: 'allow' | 'notify' | 'mask' | 'block';
  };
  ai: {
    systemPrompt: string;
    model: string;
    temperature: number;
    maxTokens: number;
    fallbackResponse: string;
  };
  widget: {
    position: 'bottom-right' | 'bottom-left';
    theme: 'light' | 'dark' | 'auto';
    autoOpen: boolean;
    customCss?: string;
  };
}

export interface TenantApiKey {
  id: string;
  tenantId: string;
  label: string;
  keyPrefix: string;
  keyHash: string;
  salt: string;
  role: 'admin' | 'operator' | 'service' | 'end-user';
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  revokedAt?: string;
  createdBy?: string;
  permissions?: string[];
  totalRequests?: number;
  updatedAt?: string;
}

export type SessionState = 'ai_managed' | 'human_takeover' | 'closed';

export interface SessionNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  tenantId: string;
  sessionId: string;
  userId?: string;
  startedAt: string;
  endedAt?: string;
  messageCount: number;
  status: 'active' | 'ended' | 'escalated';
  sessionState: SessionState;
  assignedAgentId?: string;
  takeoverAt?: string;
  flagged?: boolean;
  archived?: boolean;
  tags?: string[];
  notes?: SessionNote[];
}

export interface Message {
  id: string;
  conversationId: string;
  tenantId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sequenceNumber: number;
  tokenCount?: number;
  latencyMs?: number;
  safetyFlags?: string[];
  /** 'agent' = sent by a human operator via the agent inbox; 'bot' = AI-generated. Undefined for user messages. */
  sender?: 'agent' | 'bot';
  createdAt: string;
}

export interface UsageRecord {
  id: string;
  tenantId: string;
  period: string;
  messagesUsed: number;
  messagesLimit: number;
  tokensUsed: number;
  tokensLimit: number;
  storageUsedMb: number;
  storageLimitMb: number;
  apiCallsUsed: number;
  apiCallsLimit: number;
  recordedAt: string;
}

export interface KnowledgeBase {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: IngestionStatus;
  documentCount: number;
  totalChunks: number;
  createdAt: string;
  updatedAt: string;
}

export interface KbDocument {
  id: string;
  knowledgeBaseId: string;
  tenantId: string;
  filename: string;
  sourceType: 'pdf' | 'docx' | 'url' | 'faq' | 'text';
  sourceUrl?: string;
  status: IngestionStatus;
  chunkCount: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KbChunk {
  id: string;
  documentId: string;
  knowledgeBaseId: string;
  tenantId: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type ScanStatus = 'queued' | 'crawling' | 'completed' | 'failed' | 'cancelled';
export type ScanSchedule = 'manual' | 'daily' | 'weekly';
export type ScanCrawlMode = 'discover' | 'update';
export type ScannedPageStatus = 'unchanged' | 'added' | 'updated' | 'deleted';

export interface WebsiteScan {
  id: string;
  tenantId: string;
  rootUrl: string;
  status: ScanStatus;
  crawlMode: ScanCrawlMode;
  schedule: ScanSchedule;
  maxDepth: number;
  pageLimit: number;
  pagesDiscovered: number;
  pagesScanned: number;
  pagesIndexed: number;
  pagesUnchanged: number;
  pagesAdded: number;
  pagesUpdated: number;
  pagesDeleted: number;
  brandTone?: string;
  primaryCtas: string[];
  confidenceScore?: number;
  nextScanAt?: string;
  lastError?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScannedPage {
  id: string;
  scanId: string;
  tenantId: string;
  url: string;
  title?: string;
  contentHash?: string;
  content?: string;
  status: ScannedPageStatus;
  crawledAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandIntelligence {
  brandTone: string;
  primaryCtas: string[];
  confidenceScore: number;
}

export interface WidgetConfig {
  id: string;
  tenantId: string;
  theme: 'light' | 'dark' | 'auto';
  position: 'right' | 'left' | 'bottom-right' | 'bottom-left';
  primaryColor: string;
  logoUrl?: string;
  avatarUrl?: string;
  companyName: string;
  greeting: string;
  launcherText: string;
  allowedDomains: string[];
  autoOpen: boolean;
  autoOpenDelay: number;
  businessProfile?: Record<string, unknown>;
  starterOptions?: string[];
  /** Tenant-defined quick-action buttons shown by default in the widget action panel. */
  suggestedActions?: Array<{ id: string; label: string; action: string; payload: string; variant?: string; category?: string }>;
  customCss?: string;
  notificationEmail?: string;
  slackWebhookUrl?: string;
  customWebhookUrl?: string;
  /** Comma-separated alert recipients (in addition to notificationEmail). */
  alertEmails?: string;
  notifyThreshold?: 'all' | 'sales_qualified_only';
  createdAt: string;
  updatedAt: string;
}

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  revokedAt?: string;
}

export interface AnalyticsEvent {
  id: string;
  tenantId: string;
  event: string;
  properties: Record<string, unknown>;
  occurredAt: string;
}

export interface Subscription {
  id: string;
  tenantId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  paddleCustomerId?: string;
  paddleSubscriptionId?: string;
  paddlePriceId?: string;
  paddleProductId?: string;
  stripePriceId?: string;
  scheduledChangeAction?: string;
  scheduledChangeAt?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart?: string;
  trialEnd?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaddleCustomer {
  customerId: string;
  tenantId: string;
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  paddleInvoiceId: string;
  subscriptionId: string;
  status: string;
  amount: number;
  currency: string;
  paidAt?: string;
  dueAt?: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  paddlePaymentId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  paidAt?: string;
  createdAt: string;
}

export interface BillingEvent {
  id: string;
  tenantId?: string;
  paddleEventId: string;
  eventType: string;
  status: string;
  payload: string;
  processedAt: string;
  createdAt: string;
}

export type OnboardingStep = 'welcome' | 'workspace' | 'company_info' | 'knowledge' | 'customize' | 'widget_install' | 'verify' | 'first_conversation';

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export interface OnboardingProgress {
  tenantId: string;
  completedSteps: string[];
  skippedSteps: string[];
  currentStep: string | null;
  completionPercentage: number;
  onboardingStatus: OnboardingStatus;
  businessType?: string;
  primaryWebsite?: string;
  businessProfile?: Record<string, unknown>;
  demoDataLoaded: boolean;
  widgetInstalled: boolean;
  firstSuccessfulConversation?: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface UnansweredQuestion {
  id: string;
  tenantId: string;
  conversationId: string;
  question: string;
  confidence: number;
  retrievalStatus: 'unanswered' | 'partial' | 'retrieved';
  escalationStatus: 'none' | 'pending' | 'escalated' | 'resolved';
  resolvedAt?: string;
  clusterId?: string;
  createdAt: string;
}

export interface UnansweredQuestionCluster {
  id: string;
  tenantId: string;
  topic: string;
  questionPattern: string;
  occurrenceCount: number;
  avgConfidence: number;
  resolutionCount: number;
  lastOccurrenceAt: string;
  createdAt: string;
}

export interface KnowledgeSuggestion {
  id: string;
  tenantId: string;
  clusterId?: string;
  suggestionType: 'add_document' | 'update_faq' | 'improve_answer' | 'new_topic';
  title: string;
  description?: string;
  impactScore: number;
  status: 'active' | 'applied' | 'dismissed';
  occurrenceCount: number;
  createdAt: string;
}

export interface CitationAnalytics {
  id: string;
  tenantId: string;
  documentId: string;
  totalCitations: number;
  uniqueConversations: number;
  avgConfidence: number;
  lastCitedAt?: string;
  createdAt: string;
}

export interface ConversationInsights {
  id: string;
  tenantId: string;
  date: string;
  totalConversations: number;
  totalMessages: number;
  aiResponses: number;
  humanEscalations: number;
  containmentRate: number;
  avgConfidence: number;
  avgConversationLength: number;
  avgSentiment: number;
  topIntents: string[];
  createdAt: string;
}

export interface UnansweredQuestionStats {
  totalUnanswered: number;
  mostRequestedTopic: string | null;
  resolutionRate: number;
  avgConfidence: number;
  topMissingDocuments: string[];
  trend: { date: string; count: number }[];
}

export interface UsageAlert {
  type: 'warning' | 'critical' | 'exceeded';
  metric: string;
  used: number;
  limit: number;
  percentage: number;
}

// ─── Team Management ──────────────────────────────────────────
export type TeamRole = 'owner' | 'admin' | 'support_agent' | 'viewer';

export interface TeamMember {
  id: string;
  tenantId: string;
  userId: string;
  email: string;
  name: string;
  role: TeamRole;
  invitedBy: string;
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  tenantId: string;
  email: string;
  role: TeamRole;
  token: string;
  invitedBy: string;
  invitedByName: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEvent {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ─── Audit Log ────────────────────────────────────────────────
export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId?: string;
  userName?: string;
  eventType: string;
  resourceType: string;
  resourceId?: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// ─── Enhanced API Key (Phase 3) ───────────────────────────────
export interface ApiKeyPermission {
  resource: string;
  actions: ('read' | 'write' | 'delete' | 'admin')[];
}

export interface EnhancedApiKey {
  id: string;
  tenantId: string;
  label: string;
  keyPrefix: string;
  keyHash: string;
  salt: string;
  role: 'admin' | 'operator' | 'service' | 'end-user';
  permissions: ApiKeyPermission[];
  createdBy: string;
  lastUsedAt?: string;
  expiresAt?: string;
  totalRequests: number;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
}

export interface ApiKeyUsageStats {
  totalKeys: number;
  activeKeys: number;
  revokedKeys: number;
  totalRequests: number;
  averageRequestsPerKey: number;
  lastUsedDistribution: { last24h: number; last7d: number; last30d: number; never: number };
  keysByRole: Record<string, number>;
}

// ─── Webhooks ─────────────────────────────────────────────────
export type WebhookEvent = 'conversation.created' | 'conversation.completed' | 'escalation.created' | 'unanswered.created' | 'feedback.received' | 'lead.captured' | 'lead.qualified';

export interface Webhook {
  id: string;
  tenantId: string;
  url: string;
  events: WebhookEvent[];
  signingSecret: string;
  isActive: boolean;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  tenantId: string;
  eventType: WebhookEvent;
  payload: string;
  status: 'pending' | 'delivering' | 'delivered' | 'failed';
  responseCode?: number;
  responseBody?: string;
  attempt: number;
  maxAttempts: number;
  nextRetryAt?: string;
  createdAt: string;
  completedAt?: string;
}

// ─── Leads ───────────────────────────────────────────────────
export type LeadSource = 'chat' | 'form' | 'api' | 'whatsapp';

export type QualificationStatus = 'unqualified' | 'marketing_qualified' | 'sales_qualified' | 'disqualified';

export type BuyingIntentLevel = 'low' | 'medium' | 'high';

export interface Lead {
  id: string;
  tenantId: string;
  sessionId: string;
  conversationId?: string;
  email?: string;
  phone?: string;
  name?: string;
  company?: string;
  qualificationStatus: QualificationStatus;
  leadScore: number;
  buyingIntent: BuyingIntentLevel;
  source: LeadSource;
  metadata?: Record<string, unknown>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Trust Center ─────────────────────────────────────────────
export interface UptimeHistory {
  id: string;
  tenantId: string;
  date: string;
  uptimePercentage: number;
  downtimeSeconds: number;
  createdAt: string;
}

export type SecurityStatusType = 'secure' | 'ats_risk' | 'needs_attention' | 'critical';

export interface SecurityStatus {
  id: string;
  tenantId: string;
  status: SecurityStatusType;
  lastScanAt: string;
  findings: string;
  createdAt: string;
  updatedAt: string;
}

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

export interface Incident {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceDocument {
  id: string;
  tenantId: string;
  documentType: string;
  title: string;
  fileUrl: string;
  version: string;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface DpaDocument {
  id: string;
  tenantId: string;
  version: string;
  signedAt?: string;
  expiresAt?: string;
  fileUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subprocessor {
  id: string;
  tenantId: string;
  name: string;
  purpose: string;
  location: string;
  dataProcessed: string;
  status: 'active' | 'retired';
  createdAt: string;
  updatedAt: string;
}

export interface TopicResponseTemplate {
  id: string;
  tenantId: string;
  topic: string;
  depth: number;
  answer: string;
  sources: string;
  createdAt: string;
  updatedAt: string;
}
