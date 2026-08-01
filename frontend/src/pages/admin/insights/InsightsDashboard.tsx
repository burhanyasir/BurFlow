import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Progress } from '../../../components/ui/Progress';
import { AppLayout } from '../../../layouts/AppLayout';
import { useToast } from '../../../components/ui/Toast';
import { fetchWithAuth } from '../../../lib/api-client';
import type { SidebarItem } from '../../../layouts/Sidebar';

const NAV_ITEMS: SidebarItem[] = [
  { label: 'Dashboard', href: '/dashboard', active: false },
  { label: 'Conversations', href: '/dashboard/conversations' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Insights', href: '/dashboard/insights', active: true },
  { label: 'Knowledge', href: '/dashboard/knowledge' },
  { label: 'Widget', href: '/dashboard/widget' },
  { label: 'Billing', href: '/dashboard/billing' },
  { label: 'Onboarding', href: '/dashboard/onboarding' },
];

interface UsageCurrent {
  currentMonthConversations: number;
  monthlyQuota: number;
  usagePercent: number;
  periodStart: string;
  periodEnd: string;
}

interface UsageHistoryItem {
  month: string;
  conversations: number;
  quota: number;
  percent: number;
}

interface InsightItem {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  text: string;
  dateGenerated: string;
}

interface TrendItem {
  metric: string;
  currentPeriod: number;
  previousPeriod: number;
  change: number;
}

function StatCard({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: 'up' | 'down' | 'neutral' }) {
  return (
    <Card variant="elevated" padding="md">
      <CardContent>
        <p className="text-xs text-[var(--color-neutral-500)] mb-1">{label}</p>
        <p className="text-2xl font-bold text-[var(--color-neutral-900)]">{value}</p>
        {sub && (
          <p className="text-xs text-[var(--color-neutral-400)] mt-1">
            {trend === 'up' && <span className="text-[var(--color-success-600)] mr-1">↑</span>}
            {trend === 'down' && <span className="text-[var(--color-error-600)] mr-1">↓</span>}
            {sub}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function getUsageVariant(pct: number): 'default' | 'warning' | 'danger' {
  if (pct >= 90) return 'danger';
  if (pct >= 80) return 'warning';
  return 'default';
}

function getUsageLabel(pct: number): string {
  if (pct >= 100) return 'Exceeded';
  if (pct >= 90) return 'Critical';
  if (pct >= 80) return 'High';
  return 'Normal';
}

function getUsageBadgeVariant(pct: number): 'success' | 'warning' | 'error' {
  if (pct >= 90) return 'error';
  if (pct >= 80) return 'warning';
  return 'success';
}

function getSeverityBadgeVariant(severity: string): 'info' | 'warning' | 'error' | 'success' {
  switch (severity) {
    case 'critical': return 'error';
    case 'warning': return 'warning';
    case 'success': return 'success';
    default: return 'info';
  }
}

function ChangeDisplay({ value }: { value: number }) {
  const isUp = value > 0;
  const isDown = value < 0;
  const isNeutral = value === 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-medium ${
      isUp ? 'text-[var(--color-success-600)]' :
      isDown ? 'text-[var(--color-error-600)]' :
      'text-[var(--color-neutral-500)]'
    }`}>
      {isUp && '↑'} {isDown && '↓'} {isNeutral && '→'} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default function InsightsDashboard() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [usage, setUsage] = useState<UsageCurrent | null>(null);
  const [history, setHistory] = useState<UsageHistoryItem[]>([]);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usageRes, historyRes, insightsRes, trendsRes] = await Promise.allSettled([
        fetchWithAuth('/api/admin/usage/current'),
        fetchWithAuth('/api/admin/usage/history'),
        fetchWithAuth('/api/admin/insights/overview'),
        fetchWithAuth('/api/admin/insights/trend'),
      ]);
      if (usageRes.status === 'fulfilled' && usageRes.value.ok) setUsage(await usageRes.value.json());
      else addToast('Failed to load usage data', 'error');
      if (historyRes.status === 'fulfilled' && historyRes.value.ok) setHistory(await historyRes.value.json());
      else addToast('Failed to load usage history', 'error');
      if (insightsRes.status === 'fulfilled' && insightsRes.value.ok) {
        const data = await insightsRes.value.json();
        setInsights((Array.isArray(data) ? data : data.insights || []).sort(
          (a: InsightItem, b: InsightItem) => new Date(b.dateGenerated).getTime() - new Date(a.dateGenerated).getTime()
        ));
      } else addToast('Failed to load insights', 'error');
      if (trendsRes.status === 'fulfilled' && trendsRes.value.ok) setTrends(await trendsRes.value.json());
      else addToast('Failed to load trend data', 'error');
    } catch {
      addToast('Insights dashboard data load failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleNavigate = (item: SidebarItem) => {
    if (item.href) navigate(item.href);
  };

  const usagePct = usage?.usagePercent ?? 0;
  const usageVariant = getUsageVariant(usagePct);
  const usageLabel = getUsageLabel(usagePct);
  const usageBadgeVariant = getUsageBadgeVariant(usagePct);

  return (
    <AppLayout sidebarItems={NAV_ITEMS} onNavigate={handleNavigate} workspaceName="Conversation Engine">
      <div className="space-y-6">
        {/* Page Header */}
        <Card variant="elevated" padding="lg">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">Insights & Usage</h1>
                <p className="text-sm text-[var(--color-neutral-500)] mt-0.5">Monitor conversation intelligence and API usage across your account.</p>
              </div>
              <Button size="sm" variant="secondary" onClick={loadData}>Refresh</Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} padding="md"><div className="h-24 bg-[var(--color-neutral-50)] animate-pulse rounded" /></Card>
            ))}
          </div>
        ) : (
          <>
            {/* Section 1: Usage Meter */}
            <Card variant="elevated" padding="md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Usage Meter</CardTitle>
                  {usage && (
                    <Badge variant={usageBadgeVariant} size="sm" dot>
                      {usageLabel}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <StatCard label="Current Month Conversations" value={usage?.currentMonthConversations?.toLocaleString() ?? '—'} sub={usage ? `${new Date(usage.periodStart).toLocaleDateString()} - ${new Date(usage.periodEnd).toLocaleDateString()}` : undefined} />
                  <StatCard label="Monthly Quota" value={usage?.monthlyQuota?.toLocaleString() ?? '—'} />
                  <StatCard label="Usage" value={`${usagePct.toFixed(1)}%`} trend={usagePct >= 80 ? 'up' : 'neutral'} sub={usagePct >= 100 ? `${Math.round(usagePct - 100)}% over limit` : `${Math.round(100 - usagePct)}% remaining`} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[var(--color-neutral-500)]">Monthly usage progress</span>
                    <span className="text-xs font-medium text-[var(--color-neutral-600)]">{usagePct.toFixed(1)}%</span>
                  </div>
                  <Progress value={usagePct} variant={usageVariant} size="lg" />
                  {usagePct >= 80 && (
                    <div className={`mt-2 p-2 rounded text-xs ${
                      usagePct >= 100 ? 'bg-[var(--color-error-50)] text-[var(--color-error-700)]' :
                      usagePct >= 90 ? 'bg-[var(--color-error-50)] text-[var(--color-error-700)]' :
                      'bg-[var(--color-warning-50)] text-[var(--color-warning-700)]'
                    }`}>
                      {usagePct >= 100
                        ? 'You have exceeded your monthly conversation quota. Additional conversations may be billed or limited.'
                        : usagePct >= 90
                        ? 'You are at 90% of your monthly quota. Consider upgrading your plan to avoid overage charges.'
                        : 'You have used 80% of your monthly quota. Monitor your usage to avoid hitting the limit.'}
                      {' '}<button onClick={() => navigate('/dashboard/billing')} className="underline font-medium">View billing</button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Usage History */}
            <Card variant="elevated" padding="md">
              <CardHeader>
                <CardTitle>Usage History</CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="py-6 text-center text-sm text-[var(--color-neutral-400)]">
                    <p>No usage history available</p>
                    <p className="text-xs mt-1">Historical data will appear as your account processes conversations over time.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-neutral-200)]">
                          <th className="text-left py-2 px-3 text-xs font-medium text-[var(--color-neutral-500)] uppercase tracking-wider">Month</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-[var(--color-neutral-500)] uppercase tracking-wider">Conversations</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-[var(--color-neutral-500)] uppercase tracking-wider">% of Quota</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-[var(--color-neutral-500)] uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((item, i) => {
                          const pct = item.percent ?? (item.quota > 0 ? (item.conversations / item.quota) * 100 : 0);
                          const statusVariant = pct >= 90 ? 'error' : pct >= 80 ? 'warning' : 'success';
                          const statusLabel = pct >= 100 ? 'Over' : pct >= 80 ? 'Near' : 'Under';
                          return (
                            <tr key={item.month || i} className="border-b border-[var(--color-neutral-100)] hover:bg-[var(--color-neutral-50)]">
                              <td className="py-2.5 px-3 font-medium text-[var(--color-neutral-900)]">{item.month}</td>
                              <td className="py-2.5 px-3 text-right text-[var(--color-neutral-700)]">{item.conversations.toLocaleString()}</td>
                              <td className="py-2.5 px-3 text-right text-[var(--color-neutral-700)]">{pct.toFixed(1)}%</td>
                              <td className="py-2.5 px-3 text-right">
                                <Badge variant={statusVariant} size="sm">{statusLabel}</Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 3: Conversation Insights */}
            <Card variant="elevated" padding="md">
              <CardHeader>
                <CardTitle>Conversation Insights</CardTitle>
              </CardHeader>
              <CardContent>
                {insights.length === 0 ? (
                  <div className="py-6 text-center text-sm text-[var(--color-neutral-400)]">
                    <p>No insights generated yet</p>
                    <p className="text-xs mt-1">Insights will be auto-generated as conversations are analyzed by the intelligence engine.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insights.map((insight) => (
                      <div key={insight.id} className="p-3 rounded-lg border border-[var(--color-neutral-200)] hover:bg-[var(--color-neutral-50)] transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-medium text-[var(--color-neutral-500)] uppercase tracking-wider shrink-0">{insight.type}</span>
                            <Badge variant={getSeverityBadgeVariant(insight.severity)} size="sm">{insight.severity}</Badge>
                          </div>
                          <span className="text-xs text-[var(--color-neutral-400)] shrink-0 whitespace-nowrap">{new Date(insight.dateGenerated).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-[var(--color-neutral-800)]">{insight.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 4: Insight Trends */}
            <Card variant="elevated" padding="md">
              <CardHeader>
                <CardTitle>Insight Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {trends.length === 0 ? (
                  <div className="py-6 text-center text-sm text-[var(--color-neutral-400)]">
                    <p>No trend data available</p>
                    <p className="text-xs mt-1">Trend comparisons will populate once multiple periods of data have been collected.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-neutral-200)]">
                          <th className="text-left py-2 px-3 text-xs font-medium text-[var(--color-neutral-500)] uppercase tracking-wider">Metric</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-[var(--color-neutral-500)] uppercase tracking-wider">Current Period</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-[var(--color-neutral-500)] uppercase tracking-wider">Previous Period</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-[var(--color-neutral-500)] uppercase tracking-wider">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trends.map((item, i) => (
                          <tr key={item.metric || i} className="border-b border-[var(--color-neutral-100)] hover:bg-[var(--color-neutral-50)]">
                            <td className="py-2.5 px-3 font-medium text-[var(--color-neutral-900)]">{item.metric}</td>
                            <td className="py-2.5 px-3 text-right text-[var(--color-neutral-700)]">{item.currentPeriod.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right text-[var(--color-neutral-700)]">{item.previousPeriod.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right"><ChangeDisplay value={item.change} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
