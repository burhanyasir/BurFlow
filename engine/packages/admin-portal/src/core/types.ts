export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';
export type SubscriptionPlan = 'free' | 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired';
export type DocumentStatus = 'queued' | 'parsing' | 'normalizing' | 'chunking' | 'embedding' | 'indexed' | 'published' | 'failed';
export type ConversationStatus = 'active' | 'ended' | 'escalated';
export type MessageRole = 'user' | 'assistant' | 'system';
export type ApiKeyRole = 'admin' | 'operator' | 'service' | 'end-user';

export interface User {
  id: string; email: string; name: string; avatarUrl?: string;
  emailVerified: boolean; createdAt: string; updatedAt: string;
}

export interface Tenant {
  id: string; name: string; slug: string; ownerId: string;
  plan: SubscriptionPlan; subscriptionStatus: SubscriptionStatus;
  settings: TenantSettings; createdAt: string; updatedAt: string;
}

export interface TenantSettings {
  branding: { primaryColor: string; logoUrl?: string; companyName: string; welcomeMessage: string; offlineMessage: string; };
  safety: { contentFilterThreshold: 'strict' | 'moderate' | 'relaxed'; crisisResponseEnabled: boolean; piiRedactionMode: 'allow' | 'notify' | 'mask' | 'block'; };
  ai: { systemPrompt: string; model: string; temperature: number; maxTokens: number; fallbackResponse: string; };
  widget: { position: 'bottom-right' | 'bottom-left'; theme: 'light' | 'dark' | 'auto'; autoOpen: boolean; customCss?: string; };
}

export interface Conversation {
  id: string; tenantId: string; sessionId: string; userId?: string;
  startedAt: string; endedAt?: string; messageCount: number; status: ConversationStatus;
}

export interface Message {
  id: string; conversationId: string; tenantId: string;
  role: MessageRole; content: string; sequenceNumber: number;
  tokenCount?: number; latencyMs?: number; safetyFlags?: string[]; createdAt: string;
}

export interface UsageRecord {
  id: string; tenantId: string; period: string;
  messagesUsed: number; messagesLimit: number; tokensUsed: number; tokensLimit: number;
  storageUsedMb: number; storageLimitMb: number; apiCallsUsed: number; apiCallsLimit: number;
}

export interface KnowledgeSource {
  documentId: string; tenantId: string; sourceType: string; originalName: string;
  status: DocumentStatus; error?: string; queuedAt: string; updatedAt: string;
}

export interface KnowledgeVersion {
  knowledgeVersion: number; tenantId: string; publishedAt: string;
  chunkCount: number; embeddingModel: string;
}

export interface VectorStats {
  totalChunks: number; deletedChunks: number; activeChunks: number;
}

export interface KnowledgeStats {
  vectors: VectorStats;
  sources: { total: number; published: number; failed: number; processing: number; };
}

export interface ApiKey {
  id: string; label: string; keyPrefix: string; role: ApiKeyRole;
  lastUsedAt?: string; createdAt: string;
}

export interface SearchResult {
  chunkId: string; documentId: string; tenantId: string;
  score: number; content: string; metadata: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string; tenantId: string; userId: string; action: string;
  resource: string; resourceId: string; details: Record<string, unknown>;
  timestamp: string;
}

export interface PaginationParams { page?: number; limit?: number; pageSize?: number; }
export interface PaginatedResponse<T> { data: T[]; total: number; page: number; pageSize: number; totalPages: number; }
