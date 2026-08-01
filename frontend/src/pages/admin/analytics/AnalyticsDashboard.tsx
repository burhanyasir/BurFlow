import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout, DashboardContent, DashboardSection, DashboardMetricGrid, DashboardChartCard, Badge } from '../../../components/dashboard';
import type { NavItem } from '../../../components/dashboard';
import { useAuth } from '../../../lib/auth-context';
import { useAnalytics, useSessions } from '../../../hooks/useConversationIntelligence';
import { funnelLabel, personaLabel } from '../../../types/conversation-intelligence';
import { cn } from '../../../utils/cn';
import { BarChart3, MessageSquare, ShoppingCart, ShieldCheck, Target, RefreshCw, CalendarDays, CheckCircle } from 'lucide-react';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Conversations', href: '/dashboard/conversations' },
  { label: 'Analytics', href: '/dashboard/analytics', active: true },
  { label: 'Knowledge', href: '/dashboard/knowledge' },
  { label: 'Widget', href: '/dashboard/widget' },
  { label: 'Billing', href: '/dashboard/billing' },
  { label: 'Onboarding', href: '/dashboard/onboarding' },
];

function leadScoreVariant(score: number | null | undefined): 'success' | 'warning' | 'error' | 'default' {
  if (score == null) return 'default'; if (score >= 7) return 'success'; if (score >= 4) return 'warning'; return 'error';
}

function KpiCard({ icon, label, value, variant, trend }: { icon: React.ReactNode; label: string; value: string | number; variant?: 'success' | 'warning' | 'error' | 'default'; trend?: { value: number; direction: 'up' | 'down' | 'neutral' } }) {
  const v = variant || 'default';
  const vc = v === 'success' ? 'bg-success/[0.1] text-success' : v === 'warning' ? 'bg-warning/[0.1] text-warning' : v === 'error' ? 'bg-destructive/[0.1] text-destructive' : 'bg-wine/[0.1] text-wine';
  const tc = trend?.direction === 'up' ? 'text-success' : trend?.direction === 'down' ? 'text-destructive' : 'text-muted-foreground';
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', vc)}>{icon}</div>
        {trend && <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', tc)}>{trend.direction === 'up' ? '\u2191' : '\u2193'} {trend.value}%</span>}
      </div>
      <p className="mt-3 text-2xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

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

  const personaCounts = useMemo(() => {
    const c: Record<string, number> = {};
    intelSessions.forEach(s => { c[s.persona] = (c[s.persona] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [intelSessions]);
  const personaTotal = personaCounts.reduce((s, [, c]) => s + c, 0);

  const dailyVolume = useMemo(() => {
    return [...Array(7)].map((_, i) => {
      const date = new Date(Date.now() - (6 - i) * 86400000);
      const count = sessions.filter(s => new Date(s.createdAt).toDateString() === date.toDateString()).length;
      return { date: date.toLocaleDateString('en', { weekday: 'short' }), value: count };
    });
  }, [sessions]);
  const maxVolume = Math.max(...dailyVolume.map(d => d.value), 1);

  if (loading) {
    return <DashboardLayout sidebarItems={NAV_ITEMS} onNavigate={(item) => item.href && navigate(item.href)} workspaceName={workspaceName} userName={user?.name} userEmail={user?.email} onLogout={logout} onSettings={() => navigate('/dashboard/settings')}><DashboardContent loading /></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout sidebarItems={NAV_ITEMS} onNavigate={(item) => item.href && navigate(item.href)} workspaceName={workspaceName} userName={user?.name} userEmail={user?.email} onLogout={logout} onSettings={() => navigate('/dashboard/settings')}><DashboardContent><div className="flex flex-col items-center justify-center py-24"><p className="text-sm text-muted-foreground">{error}</p></div></DashboardContent></DashboardLayout>;
  }

  return (
    <DashboardLayout sidebarItems={NAV_ITEMS} onNavigate={(item) => item.href && navigate(item.href)} workspaceName={workspaceName} userName={user?.name} userEmail={user?.email} onLogout={logout} onSettings={() => navigate('/dashboard/settings')}>
      <DashboardContent>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-[15px] font-medium text-foreground">Analytics Dashboard</h1>
              <p className="text-sm text-muted-foreground">Is my AI assistant providing value?</p>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-hairline bg-white/[0.03] p-1">
              {DATE_RANGES.map(r => (
                <button key={r} onClick={() => setDateRange(r)} className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition', dateRange === r ? 'wine-gradient text-white' : 'text-muted-foreground hover:text-foreground')}>{r}</button>
              ))}
            </div>
          </div>

          {/* Empty */}
          {intelSessions.length === 0 ? (
            <DashboardSection>
              <div className="glass rounded-2xl p-6 text-center py-16">
                <BarChart3 className="mx-auto mb-4 h-12 w-12 text-wine" />
                <h2 className="mb-1 text-base font-medium text-foreground">No analytics data yet</h2>
                <p className="mb-6 max-w-sm mx-auto text-sm text-muted-foreground">Analytics will appear once your chatbot has conversations with customers.</p>
                <button onClick={() => navigate('/dashboard/widget')} className="btn-wine rounded-xl px-4 py-2 text-sm">Install Widget</button>
              </div>
            </DashboardSection>
          ) : (
            <>
              {/* KPI Cards */}
              <DashboardMetricGrid columns={4}>
                <KpiCard icon={<Target className="h-4 w-4" />} label="Avg Lead Score" value={data?.avgLeadScore != null ? `${data.avgLeadScore}/10` : '\u2014'} variant={leadScoreVariant(data?.avgLeadScore)} />
                <KpiCard icon={<MessageSquare className="h-4 w-4" />} label="Avg Conversation Score" value={data?.avgConversationScore != null ? `${data.avgConversationScore}/10` : '\u2014'} />
                <KpiCard icon={<ShoppingCart className="h-4 w-4" />} label="Buying Intent Rate" value={data?.avgBuyingIntentRate != null ? `${data.avgBuyingIntentRate}%` : '\u2014'} variant={data?.avgBuyingIntentRate != null && data.avgBuyingIntentRate > 50 ? 'success' : 'warning'} />
                <KpiCard icon={<ShieldCheck className="h-4 w-4" />} label="Avg Confidence" value={`${avgConfidence}%`} variant={avgConfidence >= 70 ? 'success' : avgConfidence >= 40 ? 'warning' : 'error'} />
              </DashboardMetricGrid>

              <DashboardMetricGrid columns={4}>
                <KpiCard icon={<CheckCircle className="h-4 w-4" />} label="Qualification Rate" value={data?.qualificationCompletionRate != null ? `${data.qualificationCompletionRate}%` : '\u2014'} />
                <KpiCard icon={<RefreshCw className="h-4 w-4" />} label="Avg Turns / Session" value={data?.avgTurns ?? '\u2014'} />
                <KpiCard icon={<BarChart3 className="h-4 w-4" />} label="Sessions Analyzed" value={intelSessions.length} trend={sessions.length > 0 ? { value: Math.round((intelSessions.length / sessions.length) * 100), direction: 'neutral' } : undefined} />
                <KpiCard icon={<CalendarDays className="h-4 w-4" />} label="Sessions Today" value={sessions.filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString()).length} variant="success" />
              </DashboardMetricGrid>

              {/* Charts row */}
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {/* Persona Breakdown */}
                <DashboardChartCard title="Persona Breakdown">
                  {personaCounts.length === 0 ? <p className="text-sm text-muted-foreground py-2">No persona data available.</p> : (
                    <div className="space-y-3">
                      {personaCounts.map(([persona, count]) => (
                        <div key={persona} className="flex items-center gap-3">
                          <Badge variant="info" size="sm" className="w-28 shrink-0">{personaLabel(persona)}</Badge>
                          <div className="flex-1 h-5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-wine/60 to-wine transition-all duration-500" style={{ width: `${(count / personaTotal) * 100}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">{Math.round((count / personaTotal) * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </DashboardChartCard>

                {/* Stage Distribution */}
                <DashboardChartCard title="Stage Distribution">
                  {data?.stageDistribution && data.stageDistribution.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-hairline">
                            <th className="text-left py-2 font-medium text-muted-foreground text-xs">Stage</th>
                            <th className="text-right py-2 font-medium text-muted-foreground text-xs">Count</th>
                            <th className="text-right py-2 font-medium text-muted-foreground text-xs">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const t = data.stageDistribution.reduce((s, d) => s + d.count, 0);
                            return data.stageDistribution.map(item => (
                              <tr key={item.stage} className="border-b border-hairline">
                                <td className="py-2.5 text-sm text-foreground">{funnelLabel(item.stage)}</td>
                                <td className="py-2.5 text-right text-sm text-foreground/80 tabular-nums">{item.count}</td>
                                <td className="py-2.5 text-right text-sm text-muted-foreground tabular-nums">{t > 0 ? Math.round((item.count / t) * 100) : 0}%</td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  ) : <p className="text-sm text-muted-foreground py-4 text-center">No stage distribution data available.</p>}
                </DashboardChartCard>
              </div>

              {/* Daily Volume */}
              <DashboardChartCard title="Daily Conversation Volume" subtitle="Last 7 Days">
                {sessions.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No data available</p> : (
                  <div className="flex items-end gap-2 h-32">
                    {dailyVolume.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-xs text-muted-foreground tabular-nums">{d.value}</span>
                        <div className="w-full rounded-t-md transition-all duration-300" style={{ height: `${(d.value / maxVolume) * 100}%`, minHeight: d.value > 0 ? '4px' : '2px', background: 'linear-gradient(180deg, var(--wine), oklch(0.42 0.15 15 / 0.5))' }} />
                        <span className="text-xs text-muted-foreground/60">{d.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </DashboardChartCard>

              {/* Top Objections */}
              {data?.topObjections && data.topObjections.length > 0 && (
                <DashboardChartCard title="Top Objections">
                  <div className="space-y-2">
                    {data.topObjections.map((o, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-hairline bg-white/[0.02] p-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs text-muted-foreground font-medium w-5">{i + 1}.</span>
                          <span className="text-sm text-foreground/90">{o.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">{o.count ?? 0} sessions</span>
                      </div>
                    ))}
                  </div>
                </DashboardChartCard>
              )}
            </>
          )}
        </div>
      </DashboardContent>
    </DashboardLayout>
  );
}
