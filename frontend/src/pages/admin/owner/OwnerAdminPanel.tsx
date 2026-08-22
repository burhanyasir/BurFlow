import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/dashboard';
import type { NavItem } from '../../../components/dashboard';
import { PageHead, DashButton, Panel, StatCard, EmptyState } from '../../../components/dash/ui';
import { Badge } from '../../../components/dashboard/Badge';
import { useAuth } from '../../../lib/auth-context';
import { apiClient } from '../../../lib/api-client';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../utils/cn';
import {
  Building2,
  Users,
  CreditCard,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Trash2,
  PenLine,
  Calendar,
  MessageSquare,
  FileText,
  Key,
  Shield,
  Zap,
  Pause,
  Play,
  RotateCcw,
  TrendingUp,
  Crown,
  Hash,
  ArrowRight,
  X,
  Timer,
  BarChart3,
} from 'lucide-react';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Conversations', href: '/dashboard/conversations' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Knowledge', href: '/dashboard/knowledge' },
  { label: 'Widget', href: '/dashboard/widget' },
  { label: 'Billing', href: '/dashboard/billing' },
  { label: 'Onboarding', href: '/dashboard/onboarding' },
  { label: 'Owner Admin', href: '/dashboard/admin', active: true },
];

type PlanId = 'free' | 'starter' | 'pro' | 'advanced';
type SubStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired' | 'paused';

const PLAN_OPTIONS: { id: PlanId; label: string }[] = [
  { id: 'free', label: 'Free' },
  { id: 'starter', label: 'Starter' },
  { id: 'pro', label: 'Pro' },
  { id: 'advanced', label: 'Advanced' },
];

const STATUS_OPTIONS: { id: SubStatus; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'trialing', label: 'Trialing' },
  { id: 'past_due', label: 'Past Due' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'expired', label: 'Expired' },
  { id: 'paused', label: 'Paused' },
];

interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  ownerName: string;
  plan: string;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  conversationsCount: number;
  teamMembersCount: number;
  knowledgeBasesCount: number;
  createdAt: string;
}

interface PlatformStats {
  totalTenants: number;
  mrr: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  totalConversations: number;
  totalTeamMembers: number;
}

interface PlanLimits {
  conversations: number;
  documents: number;
  knowledgeBases: number;
  teamMembers: number;
  apiCalls: number;
  storageMb: number;
  widgets: number;
  analytics: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
}

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  owner: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
  };
  subscription: {
    planId: string;
    planName: string;
    status: string;
    paddleSubscriptionId?: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    trialEnd: string | null;
    cancelledAt: string | null;
    onTrial: boolean;
    daysLeftInTrial: number | null;
    conversationsLimit: number;
    conversationsUsed: number;
    documentsLimit: number;
    documentsUsed: number;
    features: string[];
    planLimits: PlanLimits;
  } | null;
  stats: {
    totalConversations: number;
    activeConversations: number;
    leads: number;
    documents: number;
    teamMembers: number;
    apiKeys: number;
  };
  teamMembers: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
  }[];
  usageHistory: {
    date: string;
    conversations: number;
    messages: number;
  }[];
}

function usagePercent(used: number, limit: number) {
  return Math.round((used / Math.max(limit, 1)) * 100);
}

function planBadgeVariant(plan: string): 'neutral' | 'info' | 'premium' | 'warning' {
  switch (plan) {
    case 'starter': return 'info';
    case 'pro': return 'premium';
    case 'advanced': return 'warning';
    default: return 'neutral';
  }
}

function statusBadgeVariant(status: string): 'success' | 'info' | 'error' | 'warning' | 'neutral' {
  switch (status) {
    case 'active': return 'success';
    case 'trialing': return 'info';
    case 'past_due': return 'warning';
    case 'cancelled': return 'error';
    case 'expired': return 'error';
    case 'paused': return 'neutral';
    default: return 'neutral';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OwnerAdminPanel() {
  const navigate = useNavigate();
  const { user, tenant, logout } = useAuth();
  const { addToast } = useToast();
  const workspaceName = tenant?.name || 'Owner Admin';

  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantDetail, setTenantDetail] = useState<TenantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState<Record<string, string>>({});
  const [renameValue, setRenameValue] = useState<Record<string, string>>({});
  const [showRename, setShowRename] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showPlanDropdown, setShowPlanDropdown] = useState<string | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tenantsRes, statsRes] = await Promise.allSettled([
        apiClient.get<{ tenants: TenantSummary[]; total: number }>('/owner/tenants'),
        apiClient.get<PlatformStats>('/owner/stats'),
      ]);
      if (tenantsRes.status === 'fulfilled') setTenants(tenantsRes.value.tenants || []);
      if (statsRes.status === 'fulfilled') setPlatformStats(statsRes.value);
    } catch (err: any) {
      setError(err.message || 'Failed to load owner data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadDetail = useCallback(async (tenantId: string) => {
    setDetailLoading(true);
    try {
      const detail = await apiClient.get<TenantDetail>(`/owner/tenants/${tenantId}`);
      setTenantDetail(detail);
      setSelectedTenantId(tenantId);
    } catch (err: any) {
      addToast(err.message || 'Failed to load tenant detail', 'error');
    } finally {
      setDetailLoading(false);
    }
  }, [addToast]);

  const closeDetail = () => {
    setSelectedTenantId(null);
    setTenantDetail(null);
  };

  const runAction = async (
    tenantId: string,
    actionKey: string,
    apiCall: () => Promise<void>,
    successMsg: string,
  ) => {
    setActionLoading(actionKey);
    try {
      await apiCall();
      addToast(successMsg, 'success');
      await loadData();
      if (selectedTenantId === tenantId) await loadDetail(tenantId);
    } catch (err: any) {
      addToast(err.message || 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePlanChange = (tenantId: string, plan: PlanId) => {
    setShowPlanDropdown(null);
    runAction(tenantId, `plan-${tenantId}`, () =>
      apiClient.post(`/owner/tenants/${tenantId}/plan`, { plan }),
      `Plan changed to ${plan}`,
    );
  };

  const handleStatusChange = (tenantId: string, status: SubStatus) => {
    setShowStatusDropdown(null);
    runAction(tenantId, `status-${tenantId}`, () =>
      apiClient.post(`/owner/tenants/${tenantId}/status`, { status }),
      `Status changed to ${status}`,
    );
  };

  const handleExtend = (tenantId: string) => {
    const days = parseInt(extendDays[tenantId], 10);
    if (isNaN(days) || days <= 0) {
      addToast('Please enter a valid number of days', 'error');
      return;
    }
    runAction(tenantId, `extend-${tenantId}`, () =>
      apiClient.post(`/owner/tenants/${tenantId}/extend`, { days }),
      `Extended by ${days} days`,
    );
    setExtendDays(prev => ({ ...prev, [tenantId]: '' }));
  };

  const handleCancel = (tenantId: string) => {
    setConfirmCancel(null);
    runAction(tenantId, `cancel-${tenantId}`, () =>
      apiClient.post(`/owner/tenants/${tenantId}/cancel`),
      'Subscription cancelled',
    );
  };

  const handleReactivate = (tenantId: string) => {
    runAction(tenantId, `reactivate-${tenantId}`, () =>
      apiClient.post(`/owner/tenants/${tenantId}/reactivate`),
      'Subscription reactivated',
    );
  };

  const handleRename = (tenantId: string) => {
    const name = renameValue[tenantId]?.trim();
    if (!name) {
      addToast('Please enter a name', 'error');
      return;
    }
    setShowRename(null);
    runAction(tenantId, `rename-${tenantId}`, () =>
      apiClient.post(`/owner/tenants/${tenantId}/rename`, { name }),
      'Tenant renamed',
    );
  };

  const handleDelete = (tenantId: string) => {
    setShowDeleteConfirm(null);
    runAction(tenantId, `delete-${tenantId}`, () =>
      apiClient.delete(`/owner/tenants/${tenantId}`),
      'Tenant deleted',
    );
  };

  const filteredTenants = tenants.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.ownerEmail.toLowerCase().includes(q) ||
      t.ownerName.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q)
    );
  });

  const isBusy = (key: string) => actionLoading === key;


  if (user?.role !== 'owner') {
    return (
      <DashboardLayout
        sidebarItems={NAV_ITEMS}
        onNavigate={(item) => item.href && navigate(item.href)}
        workspaceName={workspaceName}
        userName={user?.name}
        userEmail={user?.email}
        onLogout={logout}
        onSettings={() => navigate('/dashboard/settings')}
      >
        <EmptyState
          icon={<Shield className="size-6" />}
          title="Access denied"
          body="Only the owner can access this panel."
          actions={<DashButton onClick={() => navigate('/dashboard')}>Back to dashboard</DashButton>}
        />
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout
        sidebarItems={NAV_ITEMS}
        onNavigate={(item) => item.href && navigate(item.href)}
        workspaceName={workspaceName}
        userName={user?.name}
        userEmail={user?.email}
        onLogout={logout}
        onSettings={() => navigate('/dashboard/settings')}
      >
        <div className="animate-pulse space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-36 rounded-2xl border border-hairline bg-surface" />
            ))}
          </div>
          <div className="h-12 rounded-xl border border-hairline bg-surface" />
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 rounded-2xl border border-hairline bg-surface" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && tenants.length === 0) {
    return (
      <DashboardLayout
        sidebarItems={NAV_ITEMS}
        onNavigate={(item) => item.href && navigate(item.href)}
        workspaceName={workspaceName}
        userName={user?.name}
        userEmail={user?.email}
        onLogout={logout}
        onSettings={() => navigate('/dashboard/settings')}
      >
        <EmptyState
          icon={<AlertTriangle className="size-6" />}
          title="Couldn't load owner data"
          body={error}
          actions={<DashButton onClick={loadData}><RefreshCw className="size-4" /> Retry</DashButton>}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebarItems={NAV_ITEMS}
      onNavigate={(item) => item.href && navigate(item.href)}
      workspaceName={workspaceName}
      userName={user?.name}
      userEmail={user?.email}
      onLogout={logout}
      onSettings={() => navigate('/dashboard/settings')}
    >
      <div className="space-y-6">
        <PageHead
          title="Owner Admin"
          sub="Manage all tenants, subscriptions, and platform settings"
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

        {platformStats && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<Building2 className="size-4" />}
              label="Total Tenants"
              value={platformStats.totalTenants.toLocaleString()}
              hint="All registered workspaces"
            />
            <StatCard
              icon={<CreditCard className="size-4" />}
              label="MRR"
              value={formatCurrency(platformStats.mrr)}
              hint="Monthly recurring revenue"
            />
            <StatCard
              icon={<CheckCircle className="size-4" />}
              label="Active Subscriptions"
              value={platformStats.activeSubscriptions.toLocaleString()}
              hint="Paying customers"
            />
            <StatCard
              icon={<Timer className="size-4" />}
              label="Trial Subscriptions"
              value={platformStats.trialSubscriptions.toLocaleString()}
              hint="Currently in trial period"
            />
          </div>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenants by name, email, or ID..."
            className="h-12 w-full rounded-2xl border border-hairline bg-surface pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {filteredTenants.length === 0 ? (
          <EmptyState
            icon={<Building2 className="size-6" />}
            title="No tenants found"
            body={search ? 'Try a different search term.' : 'No tenants have registered yet.'}
          />
        ) : (
          <div className="space-y-3">
            {filteredTenants.map((t) => {
              const isExpanded = selectedTenantId === t.id;
              return (
                <div key={t.id} className="space-y-3">
                  <div
                    className={cn(
                      'rounded-2xl border bg-surface p-5 shadow-soft transition',
                      isExpanded ? 'border-primary' : 'border-hairline hover:border-foreground/20',
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => isExpanded ? closeDetail() : loadDetail(t.id)}
                            className="text-left font-display text-base font-bold tracking-tight hover:text-primary transition-colors"
                          >
                            {t.name}
                          </button>
                          <Badge variant={planBadgeVariant(t.plan)} size="sm">{t.plan}</Badge>
                          <Badge variant={statusBadgeVariant(t.subscriptionStatus)} size="sm" dot>{t.subscriptionStatus}</Badge>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Mail className="size-3" /> {t.ownerEmail}</span>
                          <span className="flex items-center gap-1"><Hash className="size-3" /> {t.id.slice(0, 8)}</span>
                          {t.currentPeriodEnd && (
                            <span className="flex items-center gap-1"><Calendar className="size-3" /> Ends {formatDate(t.currentPeriodEnd)}</span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><MessageSquare className="size-3" /> {t.conversationsCount.toLocaleString()} convos</span>
                          <span className="flex items-center gap-1"><Users className="size-3" /> {t.teamMembersCount} members</span>
                          <span className="flex items-center gap-1"><FileText className="size-3" /> {t.knowledgeBasesCount} KBs</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <DashButton
                            variant="ghost"
                            onClick={() => { setShowPlanDropdown(showPlanDropdown === t.id ? null : t.id); setShowStatusDropdown(null); }}
                            disabled={isBusy(`plan-${t.id}`)}
                            className="text-xs"
                          >
                            <Zap className="size-3" /> Plan <ChevronDown className="size-3" />
                          </DashButton>
                          {showPlanDropdown === t.id && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-hairline bg-surface shadow-lift">
                              {PLAN_OPTIONS.map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => handlePlanChange(t.id, p.id)}
                                  className={cn(
                                    'flex w-full items-center gap-2 px-3 py-2 text-sm transition hover:bg-surface-2',
                                    t.plan === p.id && 'font-semibold text-primary',
                                  )}
                                >
                                  {t.plan === p.id && <CheckCircle className="size-3" />}
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="relative">
                          <DashButton
                            variant="ghost"
                            onClick={() => { setShowStatusDropdown(showStatusDropdown === t.id ? null : t.id); setShowPlanDropdown(null); }}
                            disabled={isBusy(`status-${t.id}`)}
                            className="text-xs"
                          >
                            Status <ChevronDown className="size-3" />
                          </DashButton>
                          {showStatusDropdown === t.id && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-hairline bg-surface shadow-lift">
                              {STATUS_OPTIONS.map(s => (
                                <button
                                  key={s.id}
                                  onClick={() => handleStatusChange(t.id, s.id)}
                                  className={cn(
                                    'flex w-full items-center gap-2 px-3 py-2 text-sm transition hover:bg-surface-2',
                                    t.subscriptionStatus === s.id && 'font-semibold text-primary',
                                  )}
                                >
                                  {t.subscriptionStatus === s.id && <CheckCircle className="size-3" />}
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <DashButton
                          variant="ghost"
                          onClick={() => isExpanded ? closeDetail() : loadDetail(t.id)}
                          disabled={detailLoading && selectedTenantId !== t.id}
                          className="text-xs"
                        >
                          {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                          {detailLoading && selectedTenantId === t.id ? 'Loading...' : 'Details'}
                        </DashButton>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={extendDays[t.id] || ''}
                          onChange={(e) => setExtendDays(prev => ({ ...prev, [t.id]: e.target.value }))}
                          placeholder="Days"
                          className="h-8 w-20 rounded-lg border border-hairline bg-surface-2 px-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          min="1"
                        />
                        <DashButton variant="ghost" onClick={() => handleExtend(t.id)} disabled={isBusy(`extend-${t.id}`)} className="h-8 text-xs">
                          <Timer className="size-3" /> Extend
                        </DashButton>
                      </div>

                      {showRename === t.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={renameValue[t.id] || ''}
                            onChange={(e) => setRenameValue(prev => ({ ...prev, [t.id]: e.target.value }))}
                            placeholder="New name"
                            className="h-8 w-36 rounded-lg border border-hairline bg-surface-2 px-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(t.id); if (e.key === 'Escape') setShowRename(null); }}
                          />
                          <DashButton variant="ghost" onClick={() => handleRename(t.id)} disabled={isBusy(`rename-${t.id}`)} className="h-8 text-xs">Save</DashButton>
                          <DashButton variant="ghost" onClick={() => setShowRename(null)} className="h-8 text-xs"><X className="size-3" /></DashButton>
                        </div>
                      ) : (
                        <DashButton
                          variant="ghost"
                          onClick={() => { setShowRename(t.id); setRenameValue(prev => ({ ...prev, [t.id]: t.name })); }}
                          className="h-8 text-xs"
                        >
                          <PenLine className="size-3" /> Rename
                        </DashButton>
                      )}

                      {t.subscriptionStatus === 'cancelled' || t.subscriptionStatus === 'expired' ? (
                        <DashButton
                          variant="ghost"
                          onClick={() => handleReactivate(t.id)}
                          disabled={isBusy(`reactivate-${t.id}`)}
                          className="h-8 text-xs"
                        >
                          <RotateCcw className="size-3" /> Reactivate
                        </DashButton>
                      ) : confirmCancel === t.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-error-500">Confirm?</span>
                          <DashButton variant="ghost" onClick={() => handleCancel(t.id)} disabled={isBusy(`cancel-${t.id}`)} className="h-8 text-xs border border-error-500/30 text-error-500">
                            Yes, cancel
                          </DashButton>
                          <DashButton variant="ghost" onClick={() => setConfirmCancel(null)} className="h-8 text-xs">
                            <X className="size-3" />
                          </DashButton>
                        </div>
                      ) : (
                        <DashButton
                          variant="ghost"
                          onClick={() => setConfirmCancel(t.id)}
                          className="h-8 text-xs"
                        >
                          <Pause className="size-3" /> Cancel
                        </DashButton>
                      )}

                      {showDeleteConfirm === t.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-error-500">Delete forever?</span>
                          <DashButton variant="ghost" onClick={() => handleDelete(t.id)} disabled={isBusy(`delete-${t.id}`)} className="h-8 text-xs border border-error-500/30 text-error-500">
                            <Trash2 className="size-3" /> Delete
                          </DashButton>
                          <DashButton variant="ghost" onClick={() => setShowDeleteConfirm(null)} className="h-8 text-xs">
                            <X className="size-3" />
                          </DashButton>
                        </div>
                      ) : (
                        <DashButton
                          variant="ghost"
                          onClick={() => setShowDeleteConfirm(t.id)}
                          className="h-8 text-xs text-error-500 hover:text-error-500"
                        >
                          <Trash2 className="size-3" /> Delete
                        </DashButton>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <TenantDetailPanel detail={tenantDetail} loading={detailLoading} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}



function TenantDetailPanel({ detail, loading }: { detail: TenantDetail | null; loading: boolean }) {
  if (loading && !detail) {
    return (
      <Panel className="animate-pulse">
        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-20 rounded-xl bg-surface-2" />
          ))}
        </div>
      </Panel>
    );
  }

  if (!detail) return null;

  const sub = detail.subscription;
  const limits = sub?.planLimits;
  const stats = detail.stats;

  return (
    <Panel className="border-primary/30">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-lg font-bold tracking-tight">{detail.name}</h3>
        <span className="text-xs text-muted-foreground">ID: {detail.id}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-2xl border border-hairline bg-surface-2 p-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Shield className="size-4 text-primary" /> Owner Info
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{detail.owner.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{detail.owner.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Verified</span>
                {detail.owner.emailVerified ? (
                  <span className="flex items-center gap-1 text-success-500"><CheckCircle className="size-3" /> Yes</span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground"><XCircle className="size-3" /> No</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{formatDate(detail.createdAt)}</span>
              </div>
            </div>
          </div>

          {sub && (
            <div className="rounded-2xl border border-hairline bg-surface-2 p-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="size-4 text-primary" /> Subscription
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <Badge variant={planBadgeVariant(sub.planId)}>{sub.planName}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={statusBadgeVariant(sub.status)} dot>{sub.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period Start</span>
                  <span className="font-medium">{formatDate(sub.currentPeriodStart)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period End</span>
                  <span className="font-medium">{formatDate(sub.currentPeriodEnd)}</span>
                </div>
                {sub.onTrial && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trial End</span>
                    <span className="font-medium">{formatDate(sub.trialEnd)}</span>
                  </div>
                )}
                {sub.cancelledAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cancelled At</span>
                    <span className="font-medium text-error-500">{formatDate(sub.cancelledAt)}</span>
                  </div>
                )}
                {sub.paddleSubscriptionId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paddle Sub ID</span>
                    <span className="font-mono text-xs">{sub.paddleSubscriptionId}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {limits && (
            <div className="rounded-2xl border border-hairline bg-surface-2 p-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Zap className="size-4 text-primary" /> Plan Limits
              </h4>
              <div className="space-y-3">
                {[
                  { label: 'Conversations', used: sub!.conversationsUsed, limit: limits.conversations },
                  { label: 'Documents', used: sub!.documentsUsed, limit: limits.documents },
                  { label: 'Knowledge Bases', used: 0, limit: limits.knowledgeBases },
                  { label: 'Team Members', used: detail.teamMembers.length, limit: limits.teamMembers },
                ].map(({ label, used, limit }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="tabular-nums">{used.toLocaleString()} / {limit.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          usagePercent(used, limit) > 90 ? 'bg-error-500' : usagePercent(used, limit) > 70 ? 'bg-warning-500' : 'bg-primary',
                        )}
                        style={{ width: `${Math.min(usagePercent(used, limit), 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-muted-foreground">
                  <span>API Calls: {limits.apiCalls.toLocaleString()}/mo</span>
                  <span>Storage: {limits.storageMb.toLocaleString()} MB</span>
                  <span>Widgets: {limits.widgets}</span>
                  <span>Custom Branding: {limits.customBranding ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-hairline bg-surface-2 p-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" /> Stats
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <MessageSquare className="size-4" />, label: 'Total Convos', value: stats.totalConversations },
                { icon: <MessageSquare className="size-4" />, label: 'Active Convos', value: stats.activeConversations },
                { icon: <Users className="size-4" />, label: 'Leads', value: stats.leads },
                { icon: <FileText className="size-4" />, label: 'Documents', value: stats.documents },
                { icon: <Users className="size-4" />, label: 'Team Members', value: stats.teamMembers },
                { icon: <Key className="size-4" />, label: 'API Keys', value: stats.apiKeys },
              ].map(({ icon, label, value }) => (
                <div key={label} className="rounded-xl border border-hairline bg-surface p-3 text-center">
                  <span className="flex justify-center text-muted-foreground mb-1">{icon}</span>
                  <p className="font-display text-lg font-bold tabular-nums">{value.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {detail.usageHistory.length > 0 && (
            <div className="rounded-2xl border border-hairline bg-surface-2 p-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" /> Usage History
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-hairline">
                      <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                      <th className="px-2 py-1.5 text-right font-semibold uppercase tracking-wider text-muted-foreground">Convos</th>
                      <th className="px-2 py-1.5 text-right font-semibold uppercase tracking-wider text-muted-foreground">Messages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.usageHistory.slice(0, 10).map((r, i) => (
                      <tr key={`${r.date}-${i}`} className="border-b border-hairline last:border-0">
                        <td className="px-2 py-1.5">{formatDate(r.date)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{r.conversations.toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{r.messages.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {detail.teamMembers.length > 0 && (
            <div className="rounded-2xl border border-hairline bg-surface-2 p-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Users className="size-4 text-primary" /> Team Members
              </h4>
              <div className="space-y-2">
                {detail.teamMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between rounded-xl border border-hairline bg-surface p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ember-soft text-primary text-xs font-bold">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                      </div>
                    </div>
                    <Badge variant={m.role === 'owner' ? 'premium' : m.role === 'admin' ? 'info' : 'neutral'} size="sm">
                      {m.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
