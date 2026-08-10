import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/dashboard';
import type { NavItem } from '../../../components/dashboard';
import { useAuth } from '../../../lib/auth-context';
import { useAnalytics, useSessions } from '../../../hooks/useConversationIntelligence';
import { funnelLabel } from '../../../types/conversation-intelligence';
import { cn } from '../../../utils/cn';
import { PageHead, DashButton, Panel, StatCard, EmptyState } from '../../../components/dash/ui';
import { BarChart3, MessageSquare, CheckCircle2, Target, ArrowRight, AlertTriangle, RefreshCw } from 'lucide-react';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Conversations', href: '/dashboard/conversations' },
  { label: 'Analytics', href: '/dashboard/analytics', active: true },
  { label: 'Knowledge', href: '/dashboard/knowledge' },
  { label: 'Widget', href: '/dashboard/widget' },
  { label: 'Billing', href: '/dashboard/billing' },
  { label: 'Onboarding', href: '/dashboard/onboarding' },
];

export default function AnalyticsDashboard() {
  const navigate = useNavigate(); const { user, tenant, logout } = useAuth();
  const { data, loading, error, reload } = useAnalytics();
  const { data: sessionsData } = useSessions(200, 0);
  const workspaceName = tenant?.name || 'Conversation Engine';
  const DATE_RANGES = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'All time'];
  const [dateRange, setDateRange] = useState('Last 7 days');

  const sessions = sessionsData?.sessions || [];
  const intelSessions = sessions.filter(s => s.hasIntel);
  const avgConfidence = intelSessions.length > 0 ? Math.round(intelSessions.reduce((sum, s) => sum + ((s as any).confidence || 0), 0) / intelSessions.length) : 0;

  const dailyVolume = useMemo(() => {
    return [...Array(7)].map((_, i) => {
      const date = new Date(Date.now() - (6 - i) * 86400000);
      const count = sessions.filter(s => new Date(s.createdAt).toDateString() === date.toDateString()).length;
      return { date: date.toLocaleDateString('en', { weekday: 'short' }), value: count };
    });
  }, [sessions]);
  const maxVolume = Math.max(...dailyVolume.map(d => d.value), 1);

  const layoutProps = {
    sidebarItems: NAV_ITEMS,
    onNavigate: (item: NavItem) => item.href && navigate(item.href),
    workspaceName,
    userName: user?.name,
    userEmail: user?.email,
    onLogout: logout,
    onSettings: () => navigate('/dashboard/settings'),
  };

  if (loading) {
    return (
      <DashboardLayout {...layoutProps}>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-36 animate-pulse rounded-2xl border border-hairline bg-surface" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-3xl border border-hairline bg-surface" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout {...layoutProps}>
        <PageHead title="Analytics" sub="Intelligence metrics for your chatbot conversations." />
        <Panel className="text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          <div className="mt-5 flex justify-center">
            <DashButton variant="ghost" onClick={reload}>
              <RefreshCw className="size-4" /> Retry
            </DashButton>
          </div>
        </Panel>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout {...layoutProps}>
      <PageHead
        title="Analytics"
        sub="Intelligence metrics for your chatbot conversations."
        actions={
          <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-hairline bg-surface p-1">
            {DATE_RANGES.map(r => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs transition',
                  dateRange === r
                    ? 'inline-flex items-center gap-1 bg-ember-soft px-3 py-1 text-xs font-semibold'
                    : 'font-medium text-muted-foreground hover:text-foreground',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        }
      />

      {intelSessions.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="size-6" />}
          title="No analytics data yet"
          body="Analytics will appear once your chatbot has conversations with customers."
          actions={
            <>
              <DashButton onClick={() => navigate('/dashboard/widget')}>
                Install Widget
              </DashButton>
              <DashButton variant="ghost" onClick={reload}>
                <RefreshCw className="size-4" /> Refresh
              </DashButton>
            </>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Key metrics */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<MessageSquare className="size-4" />}
              label="Conversations"
              value={String(sessions.length)}
              hint={intelSessions.length > 0 ? `${intelSessions.length} with intelligence` : undefined}
            />
            <StatCard
              icon={<CheckCircle2 className="size-4" />}
              label="Avg Confidence"
              value={`${avgConfidence}%`}
              hint="Across sessions with intelligence"
            />
            <StatCard
              icon={<Target className="size-4" />}
              label="Qualification Rate"
              value={data?.qualificationCompletionRate != null ? `${data.qualificationCompletionRate}%` : '\u2014'}
              hint="Completed the qualification flow"
            />
            <StatCard
              icon={<ArrowRight className="size-4" />}
              label="Handoff Rate"
              value={data?.handoffRate != null ? `${data.handoffRate}%` : '\u2014'}
              hint="Transferred to human agents"
            />
          </div>

          {/* Daily trend */}
          <Panel>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Conversation Volume</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-ember-soft px-3 py-1 text-xs font-semibold">Last 7 days</span>
            </div>
            {sessions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No data available</p>
            ) : (
              <div className="mt-6">
                <div className="flex h-36 items-end gap-1.5">
                  {dailyVolume.map((d, i) => (
                    <div key={i} className="flex h-full flex-1 flex-col items-center gap-1.5">
                      <span className="text-[10px] tabular-nums text-muted-foreground">{d.value}</span>
                      <div className="flex w-full flex-1 items-end rounded-md">
                        <div
                          className="w-full rounded-md bg-gradient-to-t from-primary/25 to-primary/60"
                          style={{ height: `${Math.max((d.value / maxVolume) * 100, 2)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  {dailyVolume.map((d, i) => (
                    <span key={i} className="flex-1 text-center text-[10px] text-muted-foreground">{d.date}</span>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          {/* Funnel stages */}
          <Panel>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Funnel Stages</h2>
              {data?.stageDistribution && data.stageDistribution.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-ember-soft px-3 py-1 text-xs font-semibold">{data.stageDistribution.length} stages</span>
              )}
            </div>
            {data?.stageDistribution && data.stageDistribution.length > 0 ? (
              <div className="mt-5 space-y-3">
                {(() => {
                  const t = data.stageDistribution.reduce((s, d) => s + d.count, 0);
                  return data.stageDistribution.map(item => {
                    const pct = t > 0 ? Math.round((item.count / t) * 100) : 0;
                    return (
                      <div key={item.stage} className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-2/60 p-3">
                        <span className="w-28 shrink-0 text-sm font-medium">{funnelLabel(item.stage)}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary/25 to-primary/60 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{item.count} {'\u00b7'} {pct}%</span>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No stage distribution data available.</p>
            )}
          </Panel>

          {/* Top objections */}
          {data?.topObjections && data.topObjections.length > 0 && (
            <Panel>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight">Top Objections</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-ember-soft px-3 py-1 text-xs font-semibold">{data.topObjections.length} topics</span>
              </div>
              <div className="mt-5 space-y-3">
                {(() => {
                  const t = data.topObjections.reduce((s, o) => s + (o.count ?? 0), 0);
                  return data.topObjections.map((o, i) => {
                    const pct = t > 0 ? Math.round(((o.count ?? 0) / t) * 100) : 0;
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-2/60 p-3">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ember-soft text-xs font-semibold text-foreground">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-medium">{o.name}</p>
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{o.count ?? 0} sessions {'\u00b7'} {pct}%</span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary/25 to-primary/60 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </Panel>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
