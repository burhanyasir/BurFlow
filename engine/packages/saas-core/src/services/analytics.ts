import type { SqlDatabase } from '../db/types';

export interface AnalyticsTimeframe {
  startDate?: string;
  endDate?: string;
}

export interface SummaryMetrics {
  totalConversations: number;
  totalMessages: number;
  uniqueSessions: number;
  totalLeadsCaptured: number;
  qualifiedLeadsCount: number;
  conversionRatePercentage: number;
  averageLeadScore: number;
}

export interface TopicCount {
  topic: string;
  count: number;
  percentage: number;
}

export interface TopicBreakdown {
  total: number;
  topics: TopicCount[];
}

export interface StarterOptionStat {
  option: string;
  clicks: number;
  percentage: number;
}

export interface StarterOptionStats {
  totalClicks: number;
  options: StarterOptionStat[];
}

export const VISITOR_INTENT_CATEGORIES = ['pricing', 'features', 'support', 'booking', 'general'] as const;
export type VisitorIntentCategory = typeof VISITOR_INTENT_CATEGORIES[number];

const TOPIC_KEYWORDS: Record<Exclude<VisitorIntentCategory, 'general'>, string[]> = {
  pricing: ['price', 'pricing', 'cost', 'plan', 'billing', 'subscription', 'invoice', 'refund', 'fee', 'cheap', 'expensive', 'pay', 'trial', 'discount', 'quote'],
  features: ['feature', 'capabilities', 'what can', 'does it support', 'integration', 'api', 'sdk', 'functionality', 'roadmap', 'compare'],
  support: ['help', 'support', 'issue', 'error', 'problem', 'bug', 'broken', 'troubleshooting', 'not working', 'stuck', 'can\'t', 'cannot'],
  booking: ['book', 'booking', 'schedule', 'demo', 'consultation', 'appointment', 'meeting', 'call', 'sign up', 'talk to sales'],
};

const QUALIFIED_STATUSES = ['marketing_qualified', 'sales_qualified'];

export function normalizeStartDate(value?: string): string | undefined {
  if (!value) return undefined;
  return value.length === 10 ? `${value}T00:00:00.000Z` : value;
}

export function normalizeEndDate(value?: string): string | undefined {
  if (!value) return undefined;
  return value.length === 10 ? `${value}T23:59:59.999Z` : value;
}

export function classifyMessageIntent(message: string): VisitorIntentCategory {
  const lower = message.toLowerCase();
  let best: Exclude<VisitorIntentCategory, 'general'> | null = null;
  let bestScore = 0;
  for (const category of VISITOR_INTENT_CATEGORIES) {
    if (category === 'general') continue;
    const keywords = TOPIC_KEYWORDS[category];
    const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  }
  return best || 'general';
}

export class AnalyticsService {
  constructor(private db: SqlDatabase) {}

  getSummaryMetrics(tenantId: string, timeframe: AnalyticsTimeframe = {}): SummaryMetrics {
    const start = normalizeStartDate(timeframe.startDate);
    const end = normalizeEndDate(timeframe.endDate);
    const convWhere = ['tenant_id = ?'];
    const msgWhere = ['tenant_id = ?'];
    const leadWhere = ['tenant_id = ?'];
    const params: { conv: any[]; msg: any[]; lead: any[] } = { conv: [tenantId], msg: [tenantId], lead: [tenantId] };
    if (start) { convWhere.push('started_at >= ?'); params.conv.push(start); msgWhere.push('created_at >= ?'); params.msg.push(start); leadWhere.push('created_at >= ?'); params.lead.push(start); }
    if (end) { convWhere.push('started_at <= ?'); params.conv.push(end); msgWhere.push('created_at <= ?'); params.msg.push(end); leadWhere.push('created_at <= ?'); params.lead.push(end); }

    const totalConversations = (this.db.prepare(`SELECT COUNT(*) as c FROM conversations WHERE ${convWhere.join(' AND ')}`).get(...params.conv) as any).c;
    const totalMessages = (this.db.prepare(`SELECT COUNT(*) as c FROM messages WHERE ${msgWhere.join(' AND ')}`).get(...params.msg) as any).c;
    const uniqueSessions = (this.db.prepare(`SELECT COUNT(DISTINCT session_id) as c FROM conversations WHERE ${convWhere.join(' AND ')}`).get(...params.conv) as any).c;

    const leadWhereSql = leadWhere.join(' AND ');
    const totalLeadsCaptured = (this.db.prepare(`SELECT COUNT(*) as c FROM leads WHERE ${leadWhereSql}`).get(...params.lead) as any).c;
    const qualifiedLeadsCount = (this.db.prepare(
      `SELECT COUNT(*) as c FROM leads WHERE ${leadWhereSql} AND qualification_status IN (${QUALIFIED_STATUSES.map(() => '?').join(', ')})`,
    ).get(...params.lead, ...QUALIFIED_STATUSES) as any).c;
    const avgRow = this.db.prepare(`SELECT AVG(lead_score) as avg FROM leads WHERE ${leadWhereSql}`).get(...params.lead) as any;

    const averageLeadScore = totalLeadsCaptured > 0 ? Math.round((avgRow.avg || 0) * 10) / 10 : 0;
    const conversionRatePercentage = totalLeadsCaptured > 0
      ? Math.round((qualifiedLeadsCount / totalLeadsCaptured) * 1000) / 10
      : 0;

    return {
      totalConversations,
      totalMessages,
      uniqueSessions,
      totalLeadsCaptured,
      qualifiedLeadsCount,
      conversionRatePercentage,
      averageLeadScore,
    };
  }

  getTopicBreakdown(tenantId: string, timeframe: AnalyticsTimeframe = {}): TopicBreakdown {
    const start = normalizeStartDate(timeframe.startDate);
    const end = normalizeEndDate(timeframe.endDate);
    const where = ['tenant_id = ?', "role = 'user'"];
    const params: any[] = [tenantId];
    if (start) { where.push('created_at >= ?'); params.push(start); }
    if (end) { where.push('created_at <= ?'); params.push(end); }

    const rows = this.db.prepare(`SELECT content FROM messages WHERE ${where.join(' AND ')}`).all(...params) as any[];
    const counts = new Map<VisitorIntentCategory, number>();
    for (const row of rows) {
      const intent = classifyMessageIntent(row.content);
      counts.set(intent, (counts.get(intent) || 0) + 1);
    }
    const total = rows.length;
    const topics: TopicCount[] = Array.from(counts.entries())
      .map(([topic, count]) => ({
        topic,
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count || VISITOR_INTENT_CATEGORIES.indexOf(a.topic as VisitorIntentCategory) - VISITOR_INTENT_CATEGORIES.indexOf(b.topic as VisitorIntentCategory))
      .slice(0, 10);
    return { total, topics };
  }

  getStarterOptionStats(tenantId: string): StarterOptionStats {
    // `properties` is JSON-as-TEXT on both backends; PostgreSQL needs an
    // explicit cast to jsonb before `->>` (SQLite uses json_extract).
    const optionExpr = this.db.dialect === 'postgres'
      ? "CAST(properties AS jsonb)->>'option'"
      : "json_extract(properties, '$.option')";
    const rows = this.db.prepare(`
      SELECT ${optionExpr} as option, COUNT(*) as clicks
      FROM analytics_events
      WHERE tenant_id = ? AND event = 'starter_chip_click'
      GROUP BY option
      ORDER BY clicks DESC, option ASC
    `).all(tenantId) as any[];
    const totalClicks = rows.reduce((acc, r) => acc + r.clicks, 0);
    return {
      totalClicks,
      options: rows.map(r => ({
        option: r.option || '(unknown)',
        clicks: r.clicks,
        percentage: totalClicks > 0 ? Math.round((r.clicks / totalClicks) * 1000) / 10 : 0,
      })),
    };
  }
}
