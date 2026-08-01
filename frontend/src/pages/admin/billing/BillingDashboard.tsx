import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout, DashboardContent, DashboardSection, DashboardMetricGrid, DashboardChartCard, DashboardTable, DashboardLoadingState, DashboardErrorState, Badge } from '../../../components/dashboard';
import type { NavItem, Column } from '../../../components/dashboard';
import { useAuth } from '../../../lib/auth-context';
import { apiClient } from '../../../lib/api-client';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../utils/cn';
import { CreditCard, Zap, FileText, Check, RefreshCw, AlertCircle, ExternalLink, CalendarDays } from 'lucide-react';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Conversations', href: '/dashboard/conversations' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Knowledge', href: '/dashboard/knowledge' },
  { label: 'Widget', href: '/dashboard/widget' },
  { label: 'Billing', href: '/dashboard/billing', active: true },
  { label: 'Onboarding', href: '/dashboard/onboarding' },
];

interface Plan { id: string; name: string; price: number; currency: string; interval: string; paddlePriceId: string; features: string[]; limits: { conversations: number; documents: number; knowledgeBases: number; teamMembers: number; apiCalls: number; storageMb: number; widgets: number; analytics: boolean; customBranding: boolean; prioritySupport: boolean }; }
interface CurrentSubscription { planId: string; planName: string; status: string; paddleSubscriptionId?: string; currentPeriodStart: string; currentPeriodEnd: string; trialEnd: string | null; cancelledAt: string | null; onTrial: boolean; daysLeftInTrial: number | null; conversationsLimit: number; conversationsUsed: number; documentsLimit: number; documentsUsed: number; teamMembers: number; features: string[]; }
interface UsageRecord { date: string; conversations: number; messages: number; documentsUploaded: number; }

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct = Math.round((used / Math.max(limit, 1)) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className={cn('font-medium tabular-nums', pct > 80 ? 'text-destructive' : pct > 50 ? 'text-warning' : 'text-foreground/80')}>{used.toLocaleString()} / {limit.toLocaleString()}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className={cn('h-full rounded-full transition-all duration-500', pct > 80 ? 'bg-destructive' : pct > 50 ? 'bg-warning' : 'bg-wine')} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
    </div>
  );
}

export default function BillingDashboard() {
  const navigate = useNavigate(); const { user, tenant, logout } = useAuth(); const { addToast } = useToast();
  const workspaceName = tenant?.name || 'Conversation Engine';
  const [currentSub, setCurrentSub] = useState<CurrentSubscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [changePlanLoading, setChangePlanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null); try {
      const [currentRes, plansRes, usageRes] = await Promise.allSettled([
        apiClient.get<CurrentSubscription>('/billing/current'),
        apiClient.get<{ plans: Plan[] }>('/billing/plans'),
        apiClient.get<{ usage: UsageRecord[] }>('/billing/usage'),
      ]);
      if (currentRes.status === 'fulfilled') setCurrentSub(currentRes.value);
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.plans || []);
      if (usageRes.status === 'fulfilled') setUsage(usageRes.value.usage || []);
    } catch (err: any) { setError(err.message || 'Failed to load billing data'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleChangePlan = async (planId: string) => {
    setChangePlanLoading(true); try { await apiClient.post('/billing/change-plan', { plan: planId }); await loadData(); }
    catch (err: any) { setError(err.message || 'Failed to change plan'); } finally { setChangePlanLoading(false); }
  };

  const handleManageBilling = async () => {
    try { const res = await apiClient.post<{ url: string }>('/billing/manage'); if (res.url) window.open(res.url, '_blank'); else addToast('No billing portal URL returned', 'warning'); }
    catch { addToast('Failed to open billing portal', 'error'); }
  };

  const statusBadge = (sub: CurrentSubscription): { variant: 'success' | 'warning' | 'error' | 'info'; label: string } => {
    if (sub.onTrial) return { variant: 'warning', label: `${sub.daysLeftInTrial ?? 0} days left in trial` };
    if (sub.status === 'cancelled') return { variant: 'warning', label: 'Cancelled' };
    if (sub.status === 'past_due') return { variant: 'error', label: 'Past Due' };
    return { variant: 'success', label: 'Active' };
  };

  const usageColumns: Column<UsageRecord>[] = useMemo(() => [
    { key: 'date', header: 'Date', cell: (r) => <span className="text-sm">{new Date(r.date).toLocaleDateString()}</span> },
    { key: 'conversations', header: 'Conversations', cell: (r) => <span className="text-sm tabular-nums">{r.conversations}</span>, className: 'text-right' },
    { key: 'messages', header: 'Messages', cell: (r) => <span className="text-sm tabular-nums">{r.messages}</span>, className: 'hidden sm:table-cell text-right' },
    { key: 'uploads', header: 'Uploads', cell: (r) => <span className="text-sm tabular-nums">{r.documentsUploaded}</span>, className: 'hidden md:table-cell text-right' },
  ], []);

  const planBadge = (currentPlanId: string, id: string) => currentPlanId === id ? { variant: 'success' as const, label: 'Current' as const } : null;

  if (loading) {
    return <DashboardLayout sidebarItems={NAV_ITEMS} onNavigate={(item) => item.href && navigate(item.href)} workspaceName={workspaceName} userName={user?.name} userEmail={user?.email} onLogout={logout} onSettings={() => navigate('/dashboard/settings')}><DashboardContent loading /></DashboardLayout>;
  }

  if (error && !currentSub) {
    return <DashboardLayout sidebarItems={NAV_ITEMS} onNavigate={(item) => item.href && navigate(item.href)} workspaceName={workspaceName} userName={user?.name} userEmail={user?.email} onLogout={logout} onSettings={() => navigate('/dashboard/settings')}><DashboardContent><DashboardErrorState message={error} onRetry={loadData} /></DashboardContent></DashboardLayout>;
  }

  return (
    <DashboardLayout sidebarItems={NAV_ITEMS} onNavigate={(item) => item.href && navigate(item.href)} workspaceName={workspaceName} userName={user?.name} userEmail={user?.email} onLogout={logout} onSettings={() => navigate('/dashboard/settings')}>
      <DashboardContent>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-[15px] font-medium text-foreground">Billing</h1>
              <p className="text-sm text-muted-foreground">Manage your subscription and billing details</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadData} className="rounded-xl border border-hairline px-3 py-1.5 text-xs text-foreground transition hover:bg-white/[0.04] inline-flex items-center gap-1.5"><RefreshCw className="h-3 w-3" /> Refresh</button>
              {currentSub && <button onClick={handleManageBilling} className="btn-wine rounded-xl px-3 py-1.5 text-xs inline-flex items-center gap-1.5"><ExternalLink className="h-3 w-3" /> Manage Billing</button>}
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/[0.04] px-4 py-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
              <p className="flex-1 text-sm text-foreground/80">{error}</p>
              <button onClick={() => setError(null)} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
            </div>
          )}

          {/* No subscription */}
          {!currentSub ? (
            <DashboardSection>
              <div className="glass rounded-2xl p-6 text-center py-16">
                <CreditCard className="mx-auto mb-4 h-12 w-12 text-wine" />
                <h2 className="mb-1 text-base font-medium text-foreground">No active subscription</h2>
                <p className="mb-6 max-w-sm mx-auto text-sm text-muted-foreground">Subscribe to a plan to continue using the service.</p>
                <button onClick={() => navigate('/dashboard/onboarding')} className="btn-wine rounded-xl px-4 py-2 text-sm">View Plans</button>
              </div>
            </DashboardSection>
          ) : (
            <>
              {/* Current plan + usage cards */}
              <DashboardMetricGrid columns={3}>
                <div className="glass rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-4 w-4 text-wine" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Plan</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{currentSub.planName}</p>
                  <div className="mt-2">
                    {(() => { const sb = statusBadge(currentSub); return <Badge variant={sb.variant} size="sm">{sb.label}</Badge>; })()}
                  </div>
                </div>
                <div className="glass rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-wine" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conversation Usage</span>
                  </div>
                  <UsageBar used={currentSub.conversationsUsed} limit={currentSub.conversationsLimit} label="Conversations" />
                </div>
                <div className="glass rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-wine" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Documents Used</span>
                  </div>
                  <UsageBar used={currentSub.documentsUsed} limit={currentSub.documentsLimit} label="Documents" />
                </div>
              </DashboardMetricGrid>

              {/* Plans grid */}
              <DashboardChartCard title="Available Plans">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map(plan => {
                    const isCurrent = plan.id === currentSub.planId;
                    return (
                      <div key={plan.id} className={cn('relative rounded-2xl border p-5 transition', isCurrent ? 'border-wine/40 bg-wine/[0.04] ring-1 ring-wine/20' : 'border-hairline bg-white/[0.02]')}>
                        {isCurrent && <Badge variant="success" size="sm" className="absolute top-3 right-3">Current</Badge>}
                        <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                        <p className="text-2xl font-bold text-wine mt-2">${plan.price}<span className="text-sm font-normal text-muted-foreground">/{plan.interval}</span></p>
                        <ul className="mt-4 space-y-2 text-sm">
                          {plan.features.map((f, i) => (
                            <li key={i} className="flex items-center gap-2 text-foreground/80">
                              <Check className="h-4 w-4 text-success shrink-0" /> {f}
                            </li>
                          ))}
                        </ul>
                        {!isCurrent && currentSub.status !== 'cancelled' && currentSub.status !== 'expired' && (
                          <button onClick={async () => {
                            if (plan.price === 0) await handleChangePlan(plan.id);
                            else { try { const res = await apiClient.post<{ url: string }>('/billing/checkout', { plan: plan.id }); if (res.url) window.open(res.url, '_blank'); else await handleChangePlan(plan.id); } catch { await handleChangePlan(plan.id); } }
                          }} disabled={changePlanLoading} className="mt-4 w-full rounded-xl border border-hairline px-3 py-2 text-xs text-foreground transition hover:bg-white/[0.04]">
                            {changePlanLoading ? 'Loading\u2026' : plan.price > 0 && currentSub.planId === 'free' ? 'Upgrade' : `Switch to ${plan.name}`}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </DashboardChartCard>

              {/* Usage History */}
              {usage.length > 0 && (
                <DashboardChartCard title="Usage History">
                  <DashboardTable columns={usageColumns} data={usage.slice(0, 12)} rowKey={(r, i) => `${r.date}-${i}`} />
                </DashboardChartCard>
              )}
            </>
          )}
        </div>
      </DashboardContent>
    </DashboardLayout>
  );
}
