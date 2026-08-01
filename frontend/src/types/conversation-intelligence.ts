export interface TurnBrief {
  role: string;
  content: string;
  message: string;
  response: string;
  polarity: number;
  frustration: number;
  urgency: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface SessionSummary {
  sessionId: string;
  tenantId: string;
  updatedAt: string;
  createdAt: string;
  stateMachine: string;
  sequenceCounter: number;
  turnCount: number;
  persona: string;
  funnelStage: string;
  buyingIntentDetected: boolean;
  hasIntel: boolean;
  status?: string;
  owner?: string | null;
  flagged?: boolean;
  archived?: boolean;
  tags?: string[];
  buyingIntentReason?: string | null;
}

export interface SessionDetail extends SessionSummary {
  turns: TurnBrief[];
  objections: string[];
  qualificationState: Record<string, unknown>;
  repeatedPhraseCount: number;
  topics: string[];
  buyingIntentPhrase?: string;
  buyingIntentTier?: string;
  state: string;
  notes?: Note[];
  timeline?: TimelineEvent[];
}

export interface Note {
  id: number;
  tenantId: string;
  sessionId: string;
  author: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: number;
  tenantId: string;
  sessionId: string;
  eventType: string;
  actor: string | null;
  details: string;
  createdAt: string;
}

export interface SessionsResponse {
  sessions: SessionSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface ObjectionStat {
  name: string;
  count: number;
  percentage: number;
}

export interface StageDist {
  stage: string;
  count: number;
  percentage: number;
}

export interface AnalyticsResponse {
  totalSessions: number;
  avgConversationScore: number;
  avgLeadScore: number;
  avgSentiment: number;
  avgBuyingIntentRate: number;
  topObjections: ObjectionStat[];
  topCtaClicks: { name: string; count: number; percentage: number }[];
  mostCommonFunnelEntry: string;
  mostCommonFunnelExit: string;
  qualificationCompletionRate: number;
  avgTurns: number;
  escalationRate: number;
  handoffRate: number;
  stageDistribution: StageDist[];
}

export interface DashboardMetrics {
  totalSessions: number;
  activeSessions: number;
  avgTurns: number;
  avgBuyingIntentRate: number;
  qualificationCompletionRate: number;
  topPersona: string;
  topPersonaPercent: number;
  topFunnelStage: string;
  topFunnelStagePercent: number;
  recentSessions: SessionSummary[];
}

export interface LeadSummary extends SessionSummary {
  leadScore: number;
  conversationScore: number;
}

export interface FollowUpSummary extends SessionSummary {
  followUpReason: string;
}

export type SentimentLabel = 'positive' | 'negative' | 'neutral';

export function classifySentiment(polarity: number): SentimentLabel {
  if (polarity > 0.2) return 'positive';
  if (polarity < -0.2) return 'negative';
  return 'neutral';
}
export const sentimentLabel = classifySentiment;

export function scoreToVariant(score: number): 'success' | 'warning' | 'danger' | 'default' {
  if (score >= 70) return 'success';
  if (score >= 40) return 'warning';
  if (score >= 20) return 'danger';
  return 'default';
}

// Adapter for components that use 'error' instead of 'danger'
export function scoreToMetricVariant(score: number): 'success' | 'warning' | 'error' | 'default' {
  if (score >= 70) return 'success';
  if (score >= 40) return 'warning';
  if (score >= 20) return 'error';
  return 'default';
}

export function riskToVariant(level: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (level) {
    case 'low': return 'success';
    case 'medium': return 'warning';
    case 'high': return 'danger';
    default: return 'neutral';
  }
}

export function personaLabel(p: string): string {
  const map: Record<string, string> = {
    developer: 'Developer',
    enterprise: 'Enterprise',
    small_business: 'Small Business',
    startup: 'Startup',
    agency: 'Agency',
    ecommerce: 'E-Commerce',
    support_manager: 'Support Manager',
    existing_customer: 'Existing Customer',
    unknown: 'Unknown',
  };
  return map[p] || p;
}

export function funnelLabel(s: string): string {
  const map: Record<string, string> = {
    greeting: 'Greeting',
    discovery: 'Discovery',
    interest: 'Interest',
    evaluation: 'Evaluation',
    objection: 'Objection',
    purchase_intent: 'Purchase Intent',
    customer: 'Customer',
    support: 'Support',
  };
  return map[s] || s;
}

export function statusLabel(s: string): string {
  const map: Record<string, string> = {
    new: 'New',
    working: 'Working',
    qualified: 'Qualified',
    won: 'Won',
    lost: 'Lost',
    archived: 'Archived',
  };
  return map[s] || s;
}

export function followUpReasonLabel(r: string): string {
  const map: Record<string, string> = {
    high_buying_intent: 'High Buying Intent',
    abandoned: 'Abandoned',
    purchase_intent: 'Purchase Intent',
    needs_followup: 'Needs Follow-up',
  };
  return map[r] || r;
}

export function statusVariant(s: string): 'success' | 'warning' | 'error' | 'neutral' | 'primary' | 'info' {
  switch (s) {
    case 'qualified': case 'won': return 'success';
    case 'working': return 'info';
    case 'lost': return 'error';
    case 'archived': return 'neutral';
    default: return 'warning';
  }
}

export function eventTypeLabel(t: string): string {
  const map: Record<string, string> = {
    status_change: 'Status Changed',
    assignment: 'Owner Assigned',
    flag: 'Flagged',
    archive: 'Archived',
    note: 'Note Added',
    tags: 'Tags Updated',
  };
  return map[t] || t;
}

const PREDEFINED_TAGS = [
  'Hot Lead',
  'Enterprise',
  'SMB',
  'Needs Follow-up',
  'Bug Report',
  'Pricing Question',
  'Security Question',
  'API Question',
] as const;

export type PredefinedTag = typeof PREDEFINED_TAGS[number];
export const PREDEFINED_TAG_SET = PREDEFINED_TAGS;
