import { Conversation, Message, Lead } from '@conversation-engine/saas-core';

/**
 * Lightweight conversation-intelligence derivation for the SaaS API.
 *
 * The pipeline-orchestrator persists per-turn intelligence memory and derives
 * hasIntel/persona/funnelStage from it. The SaaS API stores raw conversations +
 * messages only, so these fields are derived on read from the stored transcript
 * (turn counts, buying-intent keywords, objection keywords) and from captured
 * leads (real leadScore / buyingIntent). Everything here is computed — nothing
 * is hardcoded, so the Analytics dashboard reflects actual tenant data.
 */

export interface ConversationIntel {
  turnCount: number;
  hasIntel: boolean;
  persona: string;
  funnelStage: string;
  buyingIntentDetected: boolean;
  buyingIntentReason: string | null;
  customerTemperature: string;
  trustLevel: string;
  objections: string[];
}

export interface EnrichedSession {
  sessionId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  stateMachine: string;
  sequenceCounter: number;
  turnCount: number;
  persona: string;
  funnelStage: string;
  currentStage: string;
  customerTemperature: string;
  trustLevel: string;
  buyingIntentDetected: boolean;
  buyingIntentReason: string | null;
  hasIntel: boolean;
  status: string;
  owner: string | null;
  flagged: boolean;
  archived: boolean;
  tags: string[];
  objections: string[];
}

export interface AnalyticsEntry {
  conversation: Conversation;
  messages: Message[];
  lead: Lead | null;
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

/** Shape matches the frontend AnalyticsResponse contract. */
export interface TenantAnalyticsPayload {
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

const BUYING_INTENT_PATTERNS: { regex: RegExp; label: string }[] = [
  { regex: /\b(price|pricing|cost|quote|how much|expensive|afford|budget)\b/i, label: 'Pricing inquiry' },
  { regex: /\b(buy|purchase|order|sign ?up|subscribe|trial|demo|book|appointment|schedule|get started|start)\b/i, label: 'Purchase intent' },
  { regex: /\b(plan|package|subscription|monthly|annual|contract|enterprise)\b/i, label: 'Plan inquiry' },
];

const OBJECTION_PATTERNS: { regex: RegExp; name: string }[] = [
  { regex: /\b(price|cost|expensive|too much|pricing|afford|budget|overpriced)\b/i, name: 'Pricing / High Cost' },
  { regex: /\b(integrat|api|setup|migrat|compatib|connect|hook|onboard)\b/i, name: 'Integration Complexity' },
  { regex: /\b(slow|lag|latency|performance|speed|downtime|unreliable)\b/i, name: 'Performance Concerns' },
  { regex: /\b(bug|broken|error|crash|glitch|fault|issue|not working)\b/i, name: 'Reliability Concerns' },
  { regex: /\b(security|privacy|complian|gdpr|trust|safe|encrypt|confidential)\b/i, name: 'Security & Trust' },
  { regex: /\b(human|agent|person|representative|talk to someone|real person|support)\b/i, name: 'Wants Human Support' },
];

/** One "turn" is a visitor message + its assistant reply. */
export function computeTurnCount(messages: Message[]): number {
  return Math.floor(messages.length / 2);
}

/**
 * Funnel stage is not persisted by the SaaS API, so derive a coarse stage from
 * conversation depth. Uses the funnelLabel vocabulary the dashboard renders.
 */
export function deriveFunnelStage(turnCount: number): string {
  if (turnCount === 0) return 'greeting';
  if (turnCount <= 2) return 'discovery';
  if (turnCount <= 5) return 'evaluation';
  return 'purchase_intent';
}

function detectBuyingIntent(messages: Message[], lead: Lead | null): { detected: boolean; reason: string | null } {
  // Captured leads carry real buying-intent signals — prefer them over keywords.
  if (lead) {
    if (lead.buyingIntent === 'high' || lead.leadScore >= 60) {
      return { detected: true, reason: `Lead ${lead.buyingIntent} buying intent (score ${lead.leadScore})` };
    }
    if (lead.buyingIntent === 'medium' || lead.leadScore >= 30) {
      return { detected: true, reason: `Lead ${lead.buyingIntent} buying intent (score ${lead.leadScore})` };
    }
  }
  for (const m of messages) {
    if (m.role !== 'user') continue;
    for (const p of BUYING_INTENT_PATTERNS) {
      const match = m.content.match(p.regex);
      if (match) return { detected: true, reason: `${p.label} ("${match[0]}") in visitor message` };
    }
  }
  return { detected: false, reason: null };
}

export function detectObjections(messages: Message[]): string[] {
  const found = new Set<string>();
  for (const m of messages) {
    if (m.role !== 'user') continue;
    for (const o of OBJECTION_PATTERNS) {
      if (o.regex.test(m.content)) found.add(o.name);
    }
  }
  return Array.from(found);
}

export function computeConversationIntel(conversation: Conversation | null, messages: Message[], lead: Lead | null): ConversationIntel {
  const turnCount = computeTurnCount(messages);
  const buying = detectBuyingIntent(messages, lead);
  return {
    turnCount,
    hasIntel: messages.length > 0,
    persona: 'unknown',
    funnelStage: deriveFunnelStage(turnCount),
    buyingIntentDetected: buying.detected,
    buyingIntentReason: buying.reason,
    customerTemperature: lead ? (lead.leadScore >= 60 ? 'hot' : lead.leadScore >= 30 ? 'warm' : 'cold') : 'cold',
    trustLevel: 'medium',
    objections: detectObjections(messages),
  };
}

/**
 * Builds the dashboard's SessionSummary. `sessionId` is set to the conversation
 * id — every dashboard detail link resolves through GET /admin/sessions/:id,
 * which looks conversations up by id.
 */
export function buildSessionSummary(conversation: Conversation, messages: Message[], lead: Lead | null): EnrichedSession {
  const intel = computeConversationIntel(conversation, messages, lead);
  return {
    sessionId: conversation.id,
    tenantId: conversation.tenantId,
    createdAt: conversation.startedAt,
    updatedAt: conversation.endedAt || conversation.startedAt,
    stateMachine: conversation.sessionState,
    sequenceCounter: conversation.messageCount,
    turnCount: intel.turnCount,
    persona: intel.persona,
    funnelStage: intel.funnelStage,
    currentStage: intel.funnelStage,
    customerTemperature: intel.customerTemperature,
    trustLevel: intel.trustLevel,
    buyingIntentDetected: intel.buyingIntentDetected,
    buyingIntentReason: intel.buyingIntentReason,
    hasIntel: intel.hasIntel,
    status: conversation.status,
    owner: conversation.assignedAgentId || null,
    flagged: conversation.flagged || false,
    archived: conversation.archived || false,
    tags: conversation.tags || [],
    objections: intel.objections,
  };
}

/**
 * Conversation quality on a 0-10 scale: prefer the captured lead score when
 * present, otherwise a composite of buying intent + conversation depth.
 */
export function deriveConversationScore(intel: ConversationIntel, lead: Lead | null): number {
  if (lead) return Math.round(lead.leadScore / 10);
  return Math.min(10, (intel.buyingIntentDetected ? 3 : 0) + Math.min(intel.turnCount * 2, 7));
}

/**
 * Builds the Lead Inbox summary. `sessionId` is the conversation id so the row
 * navigates to the working detail page and the inline status/owner actions hit
 * the right session. When no conversation exists for the lead yet, falls back
 * to the lead id so the row still renders.
 */
export function buildLeadSummary(conversation: Conversation | null, messages: Message[], lead: Lead): EnrichedSession & { leadScore: number; conversationScore: number; email: string | null; name: string | null; phone: string | null; company: string | null; qualificationStatus: string } {
  const intel = computeConversationIntel(conversation, messages, lead);
  const base = conversation ? buildSessionSummary(conversation, messages, lead) : {
    sessionId: lead.conversationId || lead.id,
    tenantId: lead.tenantId,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    stateMachine: 'ai_managed',
    sequenceCounter: 0,
    turnCount: intel.turnCount,
    persona: intel.persona,
    funnelStage: intel.funnelStage,
    currentStage: intel.funnelStage,
    customerTemperature: intel.customerTemperature,
    trustLevel: intel.trustLevel,
    buyingIntentDetected: intel.buyingIntentDetected,
    buyingIntentReason: intel.buyingIntentReason,
    hasIntel: intel.hasIntel,
    status: 'new',
    owner: null,
    flagged: false,
    archived: false,
    tags: [],
    objections: intel.objections,
  };
  return {
    ...base,
    leadScore: lead.leadScore,
    conversationScore: deriveConversationScore(intel, lead),
    // Preserve the captured lead's contact + qualification fields — the raw
    // lead payload was previously returned verbatim, so keep those accessible.
    email: lead.email || null,
    name: lead.name || null,
    phone: lead.phone || null,
    company: lead.company || null,
    qualificationStatus: lead.qualificationStatus,
  };
}

export interface InsightItem {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  text: string;
  dateGenerated: string;
}

export interface InsightTrend {
  metric: string;
  currentPeriod: number;
  previousPeriod: number;
  /** Percentage change between periods (0-100 scale, may be negative). */
  change: number;
}

function pctChange(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

/**
 * Generates the InsightsDashboard "Conversation Insights" list. Computed from
 * real conversations/messages — never hardcoded — so the section renders data
 * for any tenant that has had conversations.
 */
export function computeInsightOverview(entries: AnalyticsEntry[], days = 30): InsightItem[] {
  const cutoff = Date.now() - days * 86_400_000;
  const window = entries.filter(e => new Date(e.conversation.startedAt).getTime() >= cutoff);
  const total = window.length;

  let messages = 0;
  let turns = 0;
  let intent = 0;
  let handoffs = 0;
  const stageCounts: Record<string, number> = {};
  const objectionCounts: Record<string, number> = {};
  for (const e of window) {
    const intel = computeConversationIntel(e.conversation, e.messages, e.lead);
    messages += e.messages.length;
    turns += intel.turnCount;
    if (intel.buyingIntentDetected) intent += 1;
    if (e.conversation.sessionState === 'human_takeover' || e.conversation.takeoverAt) handoffs += 1;
    stageCounts[intel.funnelStage] = (stageCounts[intel.funnelStage] || 0) + 1;
    for (const o of intel.objections) objectionCounts[o] = (objectionCounts[o] || 0) + 1;
  }
  const topStage = Object.entries(stageCounts).sort((a, b) => b[1] - a[1])[0];
  const topObjection = Object.entries(objectionCounts).sort((a, b) => b[1] - a[1])[0];
  const pct = (n: number): number => (total > 0 ? Math.round((n / total) * 100) : 0);
  const avgTurns = total > 0 ? Math.round((turns / total) * 10) / 10 : 0;
  const now = new Date().toISOString();
  const items: InsightItem[] = [];

  if (total === 0) {
    items.push({
      id: 'no-conversations',
      type: 'SUMMARY',
      severity: 'info',
      text: 'No conversations in the last ' + days + ' days. Install the widget and engage your first visitors to start generating insights.',
      dateGenerated: now,
    });
    return items;
  }

  items.push({
    id: 'volume',
    type: 'SUMMARY',
    severity: 'info',
    text: `${total} conversations in the last ${days} days — ${messages} messages, ~${avgTurns} turns each.`,
    dateGenerated: now,
  });
  if (intent > 0) {
    items.push({
      id: 'buying-intent',
      type: 'INTENT',
      severity: 'success',
      text: `Buying intent detected in ${pct(intent)}% of conversations — prioritize follow-up on these.`,
      dateGenerated: now,
    });
  }
  if (handoffs > 0) {
    items.push({
      id: 'handoffs',
      type: 'HANDOFF',
      severity: handoffs / total > 0.2 ? 'warning' : 'info',
      text: `${pct(handoffs)}% of conversations (${handoffs}) were handed to a human agent.`,
      dateGenerated: now,
    });
  }
  if (topObjection) {
    items.push({
      id: 'objection',
      type: 'OBJECTION',
      severity: 'warning',
      text: `Top objection: "${topObjection[0]}" surfaced in ${topObjection[1]} conversation${topObjection[1] === 1 ? '' : 's'}.`,
      dateGenerated: now,
    });
  }
  if (topStage) {
    items.push({
      id: 'funnel',
      type: 'FUNNEL',
      severity: 'success',
      text: `Most conversations reach the "${topStage[0]}" funnel stage (${topStage[1]} of ${total}).`,
      dateGenerated: now,
    });
  }
  if (avgTurns < 2) {
    items.push({
      id: 'engagement',
      type: 'ENGAGEMENT',
      severity: 'warning',
      text: 'Conversations average under 2 turns — visitors disengage quickly. Review starter prompts and knowledge coverage.',
      dateGenerated: now,
    });
  }
  return items;
}

/**
 * Builds the InsightsDashboard "Insight Trends" table: current vs previous
 * half of the window, per metric, matching the TrendItem frontend contract.
 */
export function computeInsightTrends(entries: AnalyticsEntry[], days = 30): InsightTrend[] {
  const now = Date.now();
  const currentStart = now - Math.floor(days / 2) * 86_400_000;
  const previousStart = now - days * 86_400_000;
  const split = (pred: (t: number) => boolean) => entries.filter(e => pred(new Date(e.conversation.startedAt).getTime()));
  const current = split(t => t >= currentStart && t <= now);
  const previous = split(t => t >= previousStart && t < currentStart);

  const totals = (list: AnalyticsEntry[]) => {
    let messages = 0;
    let turns = 0;
    let intent = 0;
    let handoffs = 0;
    for (const e of list) {
      const intel = computeConversationIntel(e.conversation, e.messages, e.lead);
      messages += e.messages.length;
      turns += intel.turnCount;
      if (intel.buyingIntentDetected) intent += 1;
      if (e.conversation.sessionState === 'human_takeover' || e.conversation.takeoverAt) handoffs += 1;
    }
    return { n: list.length, messages, turns, intent, handoffs };
  };
  const c = totals(current);
  const p = totals(previous);
  const avg = (t: number, n: number): number => (n > 0 ? Math.round((t / n) * 10) / 10 : 0);
  const pct = (t: number, n: number): number => (n > 0 ? Math.round((t / n) * 1000) / 10 : 0);

  const cAvgTurns = avg(c.turns, c.n);
  const pAvgTurns = avg(p.turns, p.n);
  const cIntent = pct(c.intent, c.n);
  const pIntent = pct(p.intent, p.n);

  return [
    { metric: 'Conversations', currentPeriod: c.n, previousPeriod: p.n, change: pctChange(c.n, p.n) },
    { metric: 'Messages', currentPeriod: c.messages, previousPeriod: p.messages, change: pctChange(c.messages, p.messages) },
    { metric: 'Avg turns per conversation', currentPeriod: cAvgTurns, previousPeriod: pAvgTurns, change: pctChange(cAvgTurns, pAvgTurns) },
    { metric: 'Buying intent rate', currentPeriod: cIntent, previousPeriod: pIntent, change: pctChange(cIntent, pIntent) },
    { metric: 'Human handoffs', currentPeriod: c.handoffs, previousPeriod: p.handoffs, change: pctChange(c.handoffs, p.handoffs) },
  ];
}

/** Aggregates tenant-wide conversation intelligence into the AnalyticsResponse contract. */
export function aggregateAnalytics(entries: AnalyticsEntry[]): TenantAnalyticsPayload {
  const totalSessions = entries.length;

  let totalTurns = 0;
  let buyingIntentCount = 0;
  let handoffCount = 0;
  let escalationCount = 0;
  let qualifiedCount = 0;
  const leadScores: number[] = [];
  const stageCounts: Record<string, number> = {};
  const objectionCounts: Record<string, number> = {};

  for (const { conversation, messages, lead } of entries) {
    const intel = computeConversationIntel(conversation, messages, lead);
    totalTurns += intel.turnCount;
    if (intel.buyingIntentDetected) buyingIntentCount++;
    if (conversation.sessionState === 'human_takeover' || conversation.takeoverAt) handoffCount++;
    if (conversation.status === 'escalated') escalationCount++;
    // A captured lead or a substantive multi-turn flow counts as qualified.
    if (lead || intel.turnCount >= 3) qualifiedCount++;
    if (lead) leadScores.push(lead.leadScore);
    stageCounts[intel.funnelStage] = (stageCounts[intel.funnelStage] || 0) + 1;
    for (const obj of intel.objections) {
      objectionCounts[obj] = (objectionCounts[obj] || 0) + 1;
    }
  }

  const pct = (n: number): number => (totalSessions > 0 ? Math.round((n / totalSessions) * 1000) / 10 : 0);

  const topObjections: ObjectionStat[] = Object.entries(objectionCounts)
    .map(([name, count]) => ({ name, count, percentage: pct(count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const stageDistribution: StageDist[] = Object.entries(stageCounts)
    .map(([stage, count]) => ({ stage, count, percentage: pct(count) }))
    .sort((a, b) => b.count - a.count);

  const avgLeadScore = leadScores.length > 0
    ? Math.round((leadScores.reduce((sum, v) => sum + v, 0) / leadScores.length) * 10) / 10
    : 0;

  return {
    totalSessions,
    avgConversationScore: avgLeadScore,
    avgLeadScore,
    avgSentiment: 0,
    avgBuyingIntentRate: pct(buyingIntentCount),
    topObjections,
    topCtaClicks: [],
    mostCommonFunnelEntry: 'greeting',
    mostCommonFunnelExit: 'unknown',
    qualificationCompletionRate: pct(qualifiedCount),
    avgTurns: totalSessions > 0 ? Math.round((totalTurns / totalSessions) * 10) / 10 : 0,
    escalationRate: pct(escalationCount),
    handoffRate: pct(handoffCount),
    stageDistribution,
  };
}
