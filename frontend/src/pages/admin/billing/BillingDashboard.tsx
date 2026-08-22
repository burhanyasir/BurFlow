import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/dashboard';
import type { NavItem } from '../../../components/dashboard';
import { PageHead, DashButton, Panel, StatCard, EmptyState } from '../../../components/dash/ui';
import { useAuth } from '../../../lib/auth-context';
import { apiClient } from '../../../lib/api-client';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../utils/cn';
import { Check, CreditCard, FileText, MessageSquare, RefreshCw, Zap, AlertTriangle, Clock } from 'lucide-react';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Conversations', href: '/dashboard/conversations' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Knowledge', href: '/dashboard/knowledge' },
  { label: 'Widget', href: '/dashboard/widget' },
  { label: 'Billing', href: '/dashboard/billing', active: true },
  { label: 'Onboarding', href: '/dashboard/onboarding' },
];

interface PlanLimits {
  conversations: number; documents: number; knowledgeBases: number; teamMembers: number;
  apiCalls: number; storageMb: number; widgets: number; analytics: boolean;
  customBranding: boolean; prioritySupport: boolean;
}

interface Plan {
  id: string; name: string; price: number; priceYearly: number; currency: string;
  interval: string; trialDays?: number;
  features: string[]; limits: PlanLimits;
}
interface CurrentSubscription { planId: string; planName: string; status: string; currentPeriodStart: string; currentPeriodEnd: string; trialEnd: string | null; cancelledAt: string | null; onTrial: boolean; daysLeftInTrial: number | null; conversationsLimit: number; conversationsUsed: number; documentsLimit: number; documentsUsed: number; teamMembers: number; features: string[]; }
interface UsageRecord { date: string; conversations: number; messages: number; documentsUploaded: number; }
interface PendingRequest { id: string; plan: string; billingPeriod: string; status: string; createdAt: string; }

type BillingPeriod = 'month' | 'year';

const DEFAULT_PLANS: Plan[] = [
  { id: 'free', name: 'Free', price: 0, priceYearly: 0, currency: 'usd', interval: 'mo', features: ['100 conversations per month'], limits: { conversations: 100, documents: 3, knowledgeBases: 1, teamMembers: 1, apiCalls: 0, storageMb: 100, widgets: 1, analytics: true, customBranding: false, prioritySupport: false } },
  { id: 'starter', name: 'Starter', price: 49, priceYearly: 470, currency: 'usd', interval: 'mo', trialDays: 7, features: ['1,000 conversations per month', '50 documents', '5 knowledge bases', '5 team members', 'Email support'], limits: { conversations: 1000, documents: 50, knowledgeBases: 5, teamMembers: 5, apiCalls: 5000, storageMb: 500, widgets: 3, analytics: true, customBranding: false, prioritySupport: false } },
  { id: 'pro', name: 'Pro', price: 99, priceYearly: 950, currency: 'usd', interval: 'mo', trialDays: 7, features: ['5,000 conversations per month', '200 documents', '20 knowledge bases', '20 team members', 'Advanced analytics', 'Custom branding', 'Priority support'], limits: { conversations: 5000, documents: 200, knowledgeBases: 20, teamMembers: 20, apiCalls: 25000, storageMb: 2000, widgets: 10, analytics: true, customBranding: true, prioritySupport: true } },
  { id: 'advanced', name: 'Advanced', price: 120, priceYearly: 1200, currency: 'usd', interval: 'mo', trialDays: 7, features: ['50,000 conversations per month', '1,000 documents', '50 knowledge bases', '50 team members', 'White-label branding', 'Dedicated support', 'SSO & SLA'], limits: { conversations: 50000, documents: 1000, knowledgeBases: 50, teamMembers: 50, apiCalls: 250000, storageMb: 10000, widgets: 50, analytics: true, customBranding: true, prioritySupport: true } },
];

function usagePercent(used: number, limit: number) {
  return Math.round((used / Math.max(limit, 1)) * 100);
}

export default function BillingDashboard() {
  const navigate = useNavigate(); const { user, tenant, logout } = useAuth(); const { addToast } = useToast();
  const workspaceName = tenant?.name || 'Conversation Engine';
  const [currentSub, setCurrentSub] = useState<CurrentSubscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('month');
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null);
  const [requestingPlan, setRequestingPlan] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null); try {
      const [currentRes, plansRes, usageRes, pendingRes] = await Promise.allSettled([
        apiClient.get<CurrentSubscription>('/billing/current'),
        apiClient.get<{ plans: Plan[] }>('/billing/plans'),
        apiClient.get<{ usage: UsageRecord[] }>('/billing/usage'),
        apiClient.get<{ request: PendingRequest | null }>('/billing/requests/pending'),
      ]);
      if (currentRes.status === 'fulfilled') setCurrentSub(currentRes.value);
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.plans || []);
      if (usageRes.status === 'fulfilled') setUsage(usageRes.value.usage || []);
      if (pendingRes.status === 'fulfilled') setPendingRequest(pendingRes.value.request);
    } catch (err: any) { setError(err.message || 'Failed to load billing data'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRequestPlan = async (plan: Plan) => {
    if (plan.price === 0) { addToast('You are already on the free plan.', 'info'); return; }
    setRequestingPlan(plan.id);
    try {
      await apiClient.post('/billing/requests/request', { plan: plan.id, billingPeriod });
      addToast(`Request submitted for the ${plan.name} plan — the owner will review it shortly.`, 'success');
      await loadData();
    } catch (err: any) {
      addToast(err.message || 'Failed to submit plan request', 'error');
    } finally { setRequestingPlan(null); }
  };

  const statusLabel = (sub: CurrentSubscription): string => {
    if (sub.onTrial) return `${sub.daysLeftInTrial ?? 0} days left in trial`;
    if (sub.status === 'cancelled') return 'Cancelled';
    if (sub.status === 'past_due') return 'Past due';
    return 'Active';
  };

  const displayPlans = plans.length > 0 ? plans : DEFAULT_PLANS;

  const planPriceLabel = (plan: Plan): string => {
    if (plan.price === 0) return '$0';
    const amount = billingPeriod === 'year' ? plan.priceYearly : plan.price;
    return `$${amount}`;
  };

  if (loading) {
    return (
      <DashboardLayout sidebarItems={NAV_ITEMS} onNavigate={(item) => item.href && navigate(item.href)} workspaceName={workspaceName} userName={user?.name} userEmail={user?.email} onLogout={logout} onSettings={() => navigate('/dashboard/settings')}>
        <div className="animate-pulse space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map(i => <div key={i} className="h-36 rounded-2xl border border-hairline bg-surface" />)}
          </div>
          <div className="h-48 rounded-3xl border border-hairline bg-surface" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-64 rounded-3xl border border-hairline bg-surface" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !currentSub) {
    return (
      <DashboardLayout sidebarItems={NAV_ITEMS} onNavigate={(item) => item.href && navigate(item.href)} workspaceName={workspaceName} userName={user?.name} userEmail={user?.email} onLogout={logout} onSettings={() => navigate('/dashboard/settings')}>
        <EmptyState
          icon={<AlertTriangle className="size-6" />}
          title="Couldn't load billing"
          body={error}
          actions={<DashButton onClick={loadData}><RefreshCw className="size-4" /> Retry</DashButton>}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarItems={NAV_ITEMS} onNavigate={(item) => item.href && navigate(item.href)} workspaceName={workspaceName} userName={user?.name} userEmail={user?.email} onLogout={logout} onSettings={() => navigate('/dashboard/settings')}>
      <div className="space-y-6">
        <PageHead
          title="Billing"
          sub={`Manage your subscription and billing for ${workspaceName}`}
          actions={
            <>
              <DashButton variant="ghost" onClick={loadData}><RefreshCw className="size-4" /> Refresh</DashButton>
            </>
          }
        />

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-error-500/20 bg-error-300/25 px-4 py-3">
            <AlertTriangle className="size-5 shrink-0 text-error-500" />
            <p className="flex-1 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="text-xs font-medium text-muted-foreground hover:text-foreground">Dismiss</button>
          </div>
        )}

        {pendingRequest && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-300/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="size-5 shrink-0 text-amber-500" />
              <div className="text-sm">
                <span className="font-semibold">Pending plan request</span> — your request for the <span className="font-semibold">{pendingRequest.plan}</span> plan ({pendingRequest.billingPeriod}) is being reviewed.
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <h4 className="text-sm font-bold">Payment Instructions</h4>
              <p className="text-xs text-muted-foreground">Send payment to the following account to activate your plan:</p>
              <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <CreditCard className="size-5 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">JazzCash / EasyPaisa Account</p>
                  <p className="text-lg font-bold font-mono tracking-wider text-foreground">PK58SADA0000003007645484</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                After sending payment, you can optionally upload a screenshot or message us at{' '}
                <a href="mailto:burflow2026@gmail.com" className="text-primary hover:underline">burflow2026@gmail.com</a>
              </p>
            </div>
            <button onClick={() => setPendingRequest(null)} className="mt-3 text-xs font-medium text-muted-foreground hover:text-foreground">Dismiss</button>
          </div>
        )}

        {!currentSub ? (
          <EmptyState
            icon={<CreditCard className="size-6" />}
            title="No active subscription"
            body="Subscribe to a plan to continue using the service."
            actions={<DashButton onClick={() => navigate('/dashboard/onboarding')}>View plans</DashButton>}
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard icon={<CreditCard className="size-4" />} label="Current plan" value={currentSub.planName} hint={statusLabel(currentSub)} />
              <StatCard icon={<MessageSquare className="size-4" />} label="Conversations this month" value={currentSub.conversationsUsed.toLocaleString()} hint={`${currentSub.conversationsLimit.toLocaleString()} included in your plan`} />
              <StatCard icon={<FileText className="size-4" />} label="Documents used" value={`${currentSub.documentsUsed.toLocaleString()} / ${currentSub.documentsLimit.toLocaleString()}`} hint="Across all knowledge bases" />
            </div>

            <Panel>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold tracking-tight">Usage this month</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-ember-soft px-3 py-1 text-xs font-semibold"><Zap className="size-3.5 text-primary" /> {currentSub.planName} plan</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-ember-soft px-3 py-1 text-xs font-semibold">{statusLabel(currentSub)}</span>
                </div>
              </div>
              <p className="mt-6 text-xs uppercase tracking-wider text-muted-foreground">Conversations</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(usagePercent(currentSub.conversationsUsed, currentSub.conversationsLimit), 100)}%` }} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{currentSub.conversationsUsed.toLocaleString()} / {currentSub.conversationsLimit.toLocaleString()} conversations this month</p>
            </Panel>

            <Panel>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">Plans</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Select a plan — request is reviewed by the owner. Questions?{' '}
                    <a href="mailto:burflow2026@gmail.com" className="text-primary hover:underline">burflow2026@gmail.com</a>
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-full border border-hairline bg-surface-2 p-1">
                  <button
                    type="button"
                    onClick={() => setBillingPeriod('month')}
                    className={cn('rounded-full px-4 py-1.5 text-sm font-semibold transition', billingPeriod === 'month' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-foreground')}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingPeriod('year')}
                    className={cn('rounded-full px-4 py-1.5 text-sm font-semibold transition', billingPeriod === 'year' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-foreground')}
                  >
                    Yearly <span className="text-emerald-500">−17%</span>
                  </button>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {displayPlans.map(plan => {
                  const isCurrent = plan.id === currentSub.planId;
                  const isRequested = pendingRequest?.plan === plan.id && pendingRequest?.billingPeriod === billingPeriod;
                  return (
                    <div key={plan.id} className={cn('flex flex-col rounded-3xl border p-6 transition', isCurrent ? 'border-primary shadow-glow' : 'border-hairline')}>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-base font-bold">{plan.name}</h3>
                        {isCurrent ? (
                          <span className="inline-flex items-center rounded-full bg-ember-soft px-2.5 py-0.5 text-[11px] font-semibold">Current</span>
                        ) : isRequested ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600"><Clock className="size-3" /> Pending</span>
                        ) : plan.trialDays && plan.price > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600"><Check className="size-3" /> {plan.trialDays}-day trial</span>
                        ) : null}
                      </div>
                      <p className="mt-4 font-display text-3xl font-bold tracking-tight">
                        {planPriceLabel(plan)}
                        <span className="text-sm font-normal text-muted-foreground">/{billingPeriod === 'year' ? 'yr' : 'mo'}</span>
                      </p>
                      <ul className="mt-5 flex-1 space-y-2.5 text-sm text-muted-foreground">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" /> {f}</li>
                        ))}
                      </ul>
                      <div className="mt-6">
                        {isCurrent ? (
                          <DashButton variant="primary" className="pointer-events-none w-full opacity-60">Current plan</DashButton>
                        ) : isRequested ? (
                          <DashButton variant="ghost" className="pointer-events-none w-full opacity-60">Request pending</DashButton>
                        ) : plan.price === 0 ? (
                          <DashButton variant="ghost" className="w-full" disabled>Free plan</DashButton>
                        ) : (
                          <DashButton
                            variant="primary"
                            className="w-full"
                            onClick={() => handleRequestPlan(plan)}
                            disabled={requestingPlan === plan.id}
                          >
                            {requestingPlan === plan.id ? 'Sending request…' : 'Request Plan'}
                          </DashButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            {usage.length > 0 && (
              <Panel>
                <h2 className="text-lg font-bold tracking-tight">Usage history</h2>
                <div className="mt-4 overflow-x-auto rounded-2xl border border-hairline">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-hairline">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conversations</th>
                        <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Messages</th>
                        <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Uploads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.slice(0, 12).map((r, i) => (
                        <tr key={`${r.date}-${i}`} className="border-b border-hairline last:border-0">
                          <td className="px-4 py-3">{new Date(r.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{r.conversations}</td>
                          <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">{r.messages}</td>
                          <td className="hidden px-4 py-3 text-right tabular-nums md:table-cell">{r.documentsUploaded}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
