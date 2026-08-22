import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '../../../utils/cn';
import {
  Crown,
  Building2,
  Users,
  CreditCard,
  Search,
  ChevronDown,
  ChevronUp,
  Mail,
  CheckCircle,
  XCircle,
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
  RotateCcw,
  TrendingUp,
  Hash,
  X,
  Timer,
  LogOut,
  Eye,
  Loader2,
} from 'lucide-react';

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

interface OwnerUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

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
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    subscriptionStatus: string;
    subscriptionPeriodEnd: string | null;
    customDomain?: string;
    notificationEmail?: string;
    createdAt: string;
    updatedAt?: string;
  };
  owner: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
  } | null;
  subscription: {
    plan: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    trialStart: string | null;
    trialEnd: string | null;
    cancelledAt: string | null;
  } | null;
  planLimits: {
    conversations: number;
    documents: number;
    knowledgeBases: number;
    teamMembers: number;
  };
  usage: {
    currentMonth: number;
    history: { date: string; conversations: number; messages: number }[];
  };
  stats: {
    totalConversations: number;
    activeConversations: number;
    totalLeads: number;
    totalKnowledgeBases: number;
    totalDocuments: number;
    documentsByStatus: Record<string, number>;
    teamMembers: number;
    apiKeys: number;
  };
  teamMembers: {
    id: string;
    userId?: string;
    email: string;
    name: string;
    role: string;
    joinedAt?: string;
  }[];
}

function ownerFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('owner_token');
  return fetch(`/api/owner${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || body.message || `Request failed (${res.status})`);
    }
    return res.json();
  });
}

function usagePercent(used: number, limit: number) {
  return Math.round((used / Math.max(limit, 1)) * 100);
}

function planBadgeClasses(plan: string): string {
  switch (plan) {
    case 'starter': return 'bg-info-300/20 text-info-300 border-info-300/30';
    case 'pro': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    case 'advanced': return 'bg-warning-300/20 text-warning-300 border-warning-300/30';
    default: return 'bg-white/10 text-muted-foreground border-white/10';
  }
}

function statusBadgeClasses(status: string): string {
  switch (status) {
    case 'active': return 'bg-success/20 text-success-300 border-success/30';
    case 'trialing': return 'bg-info-300/20 text-info-300 border-info-300/30';
    case 'past_due': return 'bg-warning-300/20 text-warning-300 border-warning-300/30';
    case 'cancelled': return 'bg-error-300/20 text-error-300 border-error-300/30';
    case 'expired': return 'bg-error-300/20 text-error-300 border-error-300/30';
    case 'paused': return 'bg-white/10 text-muted-foreground border-white/10';
    default: return 'bg-white/10 text-muted-foreground border-white/10';
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

function useToast() {
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);
  const nextId = useRef(0);

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

function ToastContainer({ toasts, onRemove }: { toasts: { id: number; message: string; type: string }[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lift backdrop-blur-sm transition-all',
            t.type === 'success' ? 'border-success/30 bg-success/10 text-success-300' : 'border-error-300/30 bg-error-300/10 text-error-300',
          )}
        >
          {t.type === 'success' ? <CheckCircle className="size-4 shrink-0" /> : <AlertTriangle className="size-4 shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="shrink-0 text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-hairline bg-surface p-5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <div>
        <p className="font-display text-xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ─── Login View ───────────────────────────────────────────────────────
function LoginView({ onLogin }: { onLogin: (user: OwnerUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/owner/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Login failed');
      localStorage.setItem('owner_token', data.token);
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border border-warning-300/30 bg-warning-300/10">
            <Crown className="size-8 text-warning-300" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Owner Login</h1>
          <p className="mt-2 text-sm text-muted-foreground">Platform administration access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-error-300/30 bg-error-300/10 px-4 py-3 text-sm text-error-300">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-muted-foreground">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@example.com"
              autoFocus
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-warning-300/50 focus:outline-none focus:ring-1 focus:ring-warning-300/50"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-muted-foreground">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-warning-300/50 focus:outline-none focus:ring-1 focus:ring-warning-300/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <XCircle className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-warning-300/20 border border-warning-300/30 text-warning-300 font-semibold text-sm transition hover:bg-warning-300/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <Crown className="size-4" />
                Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Admin Panel View ─────────────────────────────────────────────────
function AdminPanelView({ user, onLogout }: { user: OwnerUser; onLogout: () => void }) {
  const { toasts, addToast, removeToast } = useToast();
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

  const [showAddTenant, setShowAddTenant] = useState(false);
  const [addTenantName, setAddTenantName] = useState('');
  const [addTenantEmail, setAddTenantEmail] = useState('');
  const [addTenantPassword, setAddTenantPassword] = useState('');
  const [addTenantPlan, setAddTenantPlan] = useState<PlanId>('free');
  const [addTenantLoading, setAddTenantLoading] = useState(false);

  const [subRequests, setSubRequests] = useState<any[]>([]);
  const [allSubRequests, setAllSubRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestAction, setRequestAction] = useState<string | null>(null);
  const [requestTab, setRequestTab] = useState<'pending' | 'all'>('pending');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tenantsRes, statsRes] = await Promise.allSettled([
        ownerFetch<{ tenants: TenantSummary[]; total: number }>('/tenants'),
        ownerFetch<PlatformStats>('/stats'),
      ]);
      if (tenantsRes.status === 'fulfilled') setTenants(tenantsRes.value.tenants || []);
      if (statsRes.status === 'fulfilled') setPlatformStats(statsRes.value);
    } catch (err: any) {
      setError(err.message || 'Failed to load owner data');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRequests = useCallback(async (status?: string) => {
    setRequestsLoading(true);
    try {
      if (requestTab === 'all') {
        const res = await ownerFetch<{ requests: any[] }>('/requests/all');
        setAllSubRequests(res.requests || []);
      } else {
        const res = await ownerFetch<{ requests: any[] }>(`/requests/list?status=${status || 'pending'}`);
        setSubRequests(res.requests || []);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to load requests', 'error');
    } finally {
      setRequestsLoading(false);
    }
  }, [requestTab, addToast]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadRequests(); }, [loadRequests]);

  const loadDetail = useCallback(async (tenantId: string) => {
    setDetailLoading(true);
    try {
      const detail = await ownerFetch<TenantDetail>(`/tenants/${tenantId}`);
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
      ownerFetch(`/tenants/${tenantId}/plan`, { method: 'POST', body: JSON.stringify({ plan }) }),
      `Plan changed to ${plan}`,
    );
  };

  const handleStatusChange = (tenantId: string, status: SubStatus) => {
    setShowStatusDropdown(null);
    runAction(tenantId, `status-${tenantId}`, () =>
      ownerFetch(`/tenants/${tenantId}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
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
      ownerFetch(`/tenants/${tenantId}/extend`, { method: 'POST', body: JSON.stringify({ days }) }),
      `Extended by ${days} days`,
    );
    setExtendDays((prev) => ({ ...prev, [tenantId]: '' }));
  };

  const handleCancel = (tenantId: string) => {
    setConfirmCancel(null);
    runAction(tenantId, `cancel-${tenantId}`, () =>
      ownerFetch(`/tenants/${tenantId}/cancel`, { method: 'POST' }),
      'Subscription cancelled',
    );
  };

  const handleReactivate = (tenantId: string) => {
    runAction(tenantId, `reactivate-${tenantId}`, () =>
      ownerFetch(`/tenants/${tenantId}/reactivate`, { method: 'POST' }),
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
      ownerFetch(`/tenants/${tenantId}/rename`, { method: 'POST', body: JSON.stringify({ name }) }),
      'Tenant renamed',
    );
  };

  const handleDelete = (tenantId: string) => {
    setShowDeleteConfirm(null);
    runAction(tenantId, `delete-${tenantId}`, () =>
      ownerFetch(`/tenants/${tenantId}`, { method: 'DELETE' }),
      'Tenant deleted',
    );
  };

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTenantName.trim() || !addTenantEmail.trim() || !addTenantPassword.trim()) {
      addToast('Please fill in all fields', 'error');
      return;
    }
    setAddTenantLoading(true);
    try {
      await ownerFetch('/tenants', {
        method: 'POST',
        body: JSON.stringify({
          name: addTenantName.trim(),
          email: addTenantEmail.trim(),
          password: addTenantPassword,
          plan: addTenantPlan,
        }),
      });
      addToast('Tenant created successfully', 'success');
      setShowAddTenant(false);
      setAddTenantName('');
      setAddTenantEmail('');
      setAddTenantPassword('');
      setAddTenantPlan('free');
      await loadData();
    } catch (err: any) {
      addToast(err.message || 'Failed to create tenant', 'error');
    } finally {
      setAddTenantLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setRequestAction(requestId);
    try {
      await ownerFetch(`/requests/${requestId}/approve`, { method: 'POST' });
      addToast('Plan activated!', 'success');
      await loadRequests();
      await loadData();
    } catch (err: any) {
      addToast(err.message || 'Failed to approve', 'error');
    } finally {
      setRequestAction(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setRequestAction(requestId);
    try {
      await ownerFetch(`/requests/${requestId}/reject`, { method: 'POST', body: JSON.stringify({ reason: 'Rejected by owner' }) });
      addToast('Request rejected', 'success');
      await loadRequests();
    } catch (err: any) {
      addToast(err.message || 'Failed to reject', 'error');
    } finally {
      setRequestAction(null);
    }
  };

  const filteredTenants = tenants.filter((t) => {
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

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-foreground">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-warning-300/30 bg-warning-300/10">
              <Crown className="size-5 text-warning-300" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight">Owner Control Panel</h1>
              <p className="text-xs text-muted-foreground">Welcome back, {user.name}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {/* Loading */}
        {loading && (
          <div className="animate-pulse space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-2xl border border-white/5 bg-white/5" />
              ))}
            </div>
            <div className="h-12 rounded-xl border border-white/5 bg-white/5" />
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 rounded-2xl border border-white/5 bg-white/5" />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && tenants.length === 0 && !loading && (
          <div className="flex items-center gap-3 rounded-2xl border border-error-300/20 bg-error-300/10 px-5 py-4">
            <AlertTriangle className="size-5 shrink-0 text-error-300" />
            <p className="flex-1 text-sm">{error}</p>
            <button onClick={loadData} className="text-xs font-medium text-muted-foreground hover:text-foreground">
              Retry
            </button>
          </div>
        )}
        {/* Platform Stats */}
        {platformStats && !loading && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile icon={<Building2 className="size-4" />} label="Total Tenants" value={platformStats.totalTenants.toLocaleString()} />
            <StatTile icon={<CreditCard className="size-4" />} label="MRR" value={formatCurrency(platformStats.mrr)} />
            <StatTile icon={<CheckCircle className="size-4" />} label="Active Subs" value={platformStats.activeSubscriptions.toLocaleString()} />
            <StatTile icon={<Timer className="size-4" />} label="Trial Subs" value={platformStats.trialSubscriptions.toLocaleString()} />
          </div>
        )}

        {/* Subscription Requests */}
        {!loading && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-warning-300/10">
                  <CreditCard className="size-4 text-warning-300" />
                </div>
                <h2 className="font-display text-sm font-bold tracking-tight">Plan Requests</h2>
                {subRequests.length > 0 && requestTab === 'pending' && (
                  <span className="rounded-full bg-warning-300/20 px-2 py-0.5 text-xs font-bold text-warning-300">{subRequests.length}</span>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setRequestTab('pending'); }} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${requestTab === 'pending' ? 'bg-warning-300/20 text-warning-300' : 'text-muted-foreground hover:text-foreground'}`}>Pending</button>
                <button onClick={() => { setRequestTab('all'); }} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${requestTab === 'all' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>All</button>
              </div>
            </div>
            {requestsLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
            ) : (requestTab === 'pending' ? subRequests : allSubRequests).length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No {requestTab === 'pending' ? 'pending ' : ''}requests yet.</p>
            ) : (
              <div className="space-y-3">
                {(requestTab === 'pending' ? subRequests : allSubRequests).map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{req.user_email}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${req.status === 'pending' ? 'bg-warning-300/20 text-warning-300' : req.status === 'approved' ? 'bg-success-300/20 text-success-300' : 'bg-error-300/20 text-error-300'}`}>{req.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Requesting <strong className="text-foreground">{req.requested_plan}</strong> plan {req.user_name ? `· ${req.user_name}` : ''} {req.billing_period ? `· ${req.billing_period}` : ''}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{req.created_at ? new Date(req.created_at).toLocaleString() : ''}</p>
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <button disabled={requestAction === req.id} onClick={() => handleApproveRequest(req.id)} className="rounded-lg bg-success-300/20 px-3 py-1.5 text-xs font-medium text-success-300 hover:bg-success-300/30 transition disabled:opacity-50">{requestAction === req.id ? <Loader2 className="size-3 animate-spin inline" /> : 'Approve'}</button>
                        <button disabled={requestAction === req.id} onClick={() => handleRejectRequest(req.id)} className="rounded-lg bg-error-300/20 px-3 py-1.5 text-xs font-medium text-error-300 hover:bg-error-300/30 transition disabled:opacity-50">Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search + Add Tenant */}
        {!loading && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tenants by name, email, or ID..."
                className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowAddTenant(!showAddTenant)}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-5 text-sm font-semibold text-primary transition hover:bg-primary/20"
            >
              <Building2 className="size-4" />
              Add Tenant
            </button>
          </div>
        )}
        {/* Add Tenant Form */}
        {showAddTenant && (
          <form onSubmit={handleAddTenant} className="rounded-2xl border border-primary/30 bg-surface p-6">
            <h3 className="mb-4 font-display text-lg font-bold tracking-tight">Create New Tenant</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tenant Name</label>
                <input
                  type="text"
                  value={addTenantName}
                  onChange={(e) => setAddTenantName(e.target.value)}
                  placeholder="Acme Corp"
                  className="h-10 w-full rounded-xl border border-hairline bg-surface-2 px-3 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Owner Email</label>
                <input
                  type="email"
                  value={addTenantEmail}
                  onChange={(e) => setAddTenantEmail(e.target.value)}
                  placeholder="admin@acme.com"
                  className="h-10 w-full rounded-xl border border-hairline bg-surface-2 px-3 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                <input
                  type="password"
                  value={addTenantPassword}
                  onChange={(e) => setAddTenantPassword(e.target.value)}
                  placeholder="Strong password"
                  className="h-10 w-full rounded-xl border border-hairline bg-surface-2 px-3 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Plan</label>
                <select
                  value={addTenantPlan}
                  onChange={(e) => setAddTenantPlan(e.target.value as PlanId)}
                  className="h-10 w-full rounded-xl border border-hairline bg-surface-2 px-3 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {PLAN_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="submit"
                disabled={addTenantLoading}
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                {addTenantLoading ? "Creating..." : "Create Tenant"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddTenant(false)}
                className="h-10 rounded-xl border border-white/10 px-5 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {/* Tenant List */}
        {!loading && filteredTenants.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] py-16">
            <Building2 className="mb-3 size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">{search ? "No tenants match your search." : "No tenants found."}</p>
          </div>
        )}

        {!loading && filteredTenants.length > 0 && (
          <div className="space-y-3">
            {filteredTenants.map((t) => {
              const isExpanded = selectedTenantId === t.id;
              return (
                <div key={t.id} className="space-y-3">
                  <div
                    className={cn(
                      "rounded-2xl border bg-surface p-5 transition",
                      isExpanded ? "border-primary" : "border-hairline hover:border-foreground/20",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => (isExpanded ? closeDetail() : loadDetail(t.id))}
                            className="text-left font-display text-base font-bold tracking-tight transition-colors hover:text-primary"
                          >
                            {t.name}
                          </button>
                          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", planBadgeClasses(t.plan))}>
                            {t.plan}
                          </span>
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", statusBadgeClasses(t.subscriptionStatus))}>
                            <span className="size-1 rounded-full bg-current" />
                            {t.subscriptionStatus}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Mail className="size-3" /> {t.ownerEmail}</span>
                          <span className="flex items-center gap-1"><Hash className="size-3" /> {t.slug}</span>
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
                          <button
                            onClick={() => { setShowPlanDropdown(showPlanDropdown === t.id ? null : t.id); setShowStatusDropdown(null); }}
                            disabled={isBusy("plan-" + t.id)}
                            className="flex h-8 items-center gap-1 rounded-lg border border-hairline bg-surface-2 px-2.5 text-xs transition hover:bg-white/10 disabled:opacity-50"
                          >
                            <Zap className="size-3" /> Plan <ChevronDown className="size-3" />
                          </button>
                          {showPlanDropdown === t.id && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-hairline bg-surface shadow-lift">
                              {PLAN_OPTIONS.map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => handlePlanChange(t.id, p.id)}
                                  className={cn(
                                    "flex w-full items-center gap-2 px-3 py-2 text-sm transition hover:bg-surface-2",
                                    t.plan === p.id && "font-semibold text-primary",
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
                          <button
                            onClick={() => { setShowStatusDropdown(showStatusDropdown === t.id ? null : t.id); setShowPlanDropdown(null); }}
                            disabled={isBusy("status-" + t.id)}
                            className="flex h-8 items-center gap-1 rounded-lg border border-hairline bg-surface-2 px-2.5 text-xs transition hover:bg-white/10 disabled:opacity-50"
                          >
                            Status <ChevronDown className="size-3" />
                          </button>
                          {showStatusDropdown === t.id && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-hairline bg-surface shadow-lift">
                              {STATUS_OPTIONS.map((s) => (
                                <button
                                  key={s.id}
                                  onClick={() => handleStatusChange(t.id, s.id)}
                                  className={cn(
                                    "flex w-full items-center gap-2 px-3 py-2 text-sm transition hover:bg-surface-2",
                                    t.subscriptionStatus === s.id && "font-semibold text-primary",
                                  )}
                                >
                                  {t.subscriptionStatus === s.id && <CheckCircle className="size-3" />}
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => (isExpanded ? closeDetail() : loadDetail(t.id))}
                          disabled={detailLoading && selectedTenantId !== t.id}
                          className="flex h-8 items-center gap-1 rounded-lg border border-hairline bg-surface-2 px-2.5 text-xs transition hover:bg-white/10 disabled:opacity-50"
                        >
                          {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                          {detailLoading && selectedTenantId === t.id ? "Loading..." : "Details"}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={extendDays[t.id] || ""}
                          onChange={(e) => setExtendDays((prev) => ({ ...prev, [t.id]: e.target.value }))}
                          placeholder="Days"
                          className="h-8 w-20 rounded-lg border border-hairline bg-surface-2 px-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          min="1"
                        />
                        <button
                          onClick={() => handleExtend(t.id)}
                          disabled={isBusy("extend-" + t.id)}
                          className="flex h-8 items-center gap-1 rounded-lg border border-hairline bg-surface-2 px-2.5 text-xs transition hover:bg-white/10 disabled:opacity-50"
                        >
                          <Timer className="size-3" /> Extend
                        </button>
                      </div>

                      {showRename === t.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={renameValue[t.id] || ""}
                            onChange={(e) => setRenameValue((prev) => ({ ...prev, [t.id]: e.target.value }))}
                            placeholder="New name"
                            className="h-8 w-36 rounded-lg border border-hairline bg-surface-2 px-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === "Enter") handleRename(t.id); if (e.key === "Escape") setShowRename(null); }}
                          />
                          <button
                            onClick={() => handleRename(t.id)}
                            disabled={isBusy("rename-" + t.id)}
                            className="flex h-8 items-center rounded-lg border border-hairline bg-surface-2 px-2.5 text-xs transition hover:bg-white/10 disabled:opacity-50"
                          >Save</button>
                          <button
                            onClick={() => setShowRename(null)}
                            className="flex h-8 items-center rounded-lg border border-hairline bg-surface-2 px-2.5 text-xs transition hover:bg-white/10"
                          ><X className="size-3" /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setShowRename(t.id); setRenameValue((prev) => ({ ...prev, [t.id]: t.name })); }}
                          className="flex h-8 items-center gap-1 rounded-lg border border-hairline bg-surface-2 px-2.5 text-xs transition hover:bg-white/10"
                        >
                          <PenLine className="size-3" /> Rename
                        </button>
                      )}

                      {t.subscriptionStatus === "cancelled" || t.subscriptionStatus === "expired" ? (
                        <button
                          onClick={() => handleReactivate(t.id)}
                          disabled={isBusy("reactivate-" + t.id)}
                          className="flex h-8 items-center gap-1 rounded-lg border border-hairline bg-surface-2 px-2.5 text-xs transition hover:bg-white/10 disabled:opacity-50"
                        >
                          <RotateCcw className="size-3" /> Reactivate
                        </button>
                      ) : confirmCancel === t.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-error-300">Confirm?</span>
                          <button
                            onClick={() => handleCancel(t.id)}
                            disabled={isBusy("cancel-" + t.id)}
                            className="flex h-8 items-center rounded-lg border border-error-300/30 bg-error-300/10 px-2.5 text-xs text-error-300 transition hover:bg-error-300/20 disabled:opacity-50"
                          >
                            Yes, cancel
                          </button>
                          <button
                            onClick={() => setConfirmCancel(null)}
                            className="flex h-8 items-center rounded-lg border border-hairline bg-surface-2 px-2.5 text-xs transition hover:bg-white/10"
                          ><X className="size-3" /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmCancel(t.id)}
                          className="flex h-8 items-center gap-1 rounded-lg border border-hairline bg-surface-2 px-2.5 text-xs transition hover:bg-white/10"
                        >
                          <Pause className="size-3" /> Cancel
                        </button>
                      )}

                      {showDeleteConfirm === t.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-error-300">Delete forever?</span>
                          <button
                            onClick={() => handleDelete(t.id)}
                            disabled={isBusy("delete-" + t.id)}
                            className="flex h-8 items-center gap-1 rounded-lg border border-error-300/30 bg-error-300/10 px-2.5 text-xs text-error-300 transition hover:bg-error-300/20 disabled:opacity-50"
                          >
                            <Trash2 className="size-3" /> Delete
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="flex h-8 items-center rounded-lg border border-hairline bg-surface-2 px-2.5 text-xs transition hover:bg-white/10"
                          ><X className="size-3" /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowDeleteConfirm(t.id)}
                          className="flex h-8 items-center gap-1 rounded-lg border border-hairline bg-surface-2 px-2.5 text-xs text-error-300 transition hover:bg-white/10 hover:text-error-300"
                        >
                          <Trash2 className="size-3" /> Delete
                        </button>
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
      </main>
    </div>
  );
}

// ─── Tenant Detail Panel ──────────────────────────────────────────────
function TenantDetailPanel({ detail, loading }: { detail: TenantDetail | null; loading: boolean }) {
  if (loading && !detail) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-surface p-6 animate-pulse">
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-surface-2" />
          ))}
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const sub = detail.subscription;
  const limits = detail.planLimits;
  const stats = detail.stats;

  return (
    <div className="rounded-2xl border border-primary/30 bg-surface p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold tracking-tight">{detail.tenant.name}</h3>
        <span className="text-xs text-muted-foreground">ID: {detail.tenant.id}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-2xl border border-hairline bg-surface-2 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Shield className="size-4 text-primary" /> Owner Info
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{detail.owner?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{detail.owner?.email ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Verified</span>
                {detail.owner?.emailVerified ? (
                  <span className="flex items-center gap-1 text-success-300"><CheckCircle className="size-3" /> Yes</span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground"><XCircle className="size-3" /> No</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{formatDate(detail.tenant.createdAt)}</span>
              </div>
            </div>
          </div>

          {sub && (
            <div className="rounded-2xl border border-hairline bg-surface-2 p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <CreditCard className="size-4 text-primary" /> Subscription
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", planBadgeClasses(sub.plan))}>
                    {sub.plan}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", statusBadgeClasses(sub.status))}>
                    <span className="size-1.5 rounded-full bg-current" />
                    {sub.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period Start</span>
                  <span className="font-medium">{formatDate(sub.currentPeriodStart)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period End</span>
                  <span className="font-medium">{formatDate(sub.currentPeriodEnd)}</span>
                </div>
                {sub.status === 'trialing' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trial End</span>
                    <span className="font-medium">{formatDate(sub.trialEnd)}</span>
                  </div>
                )}
                {sub.cancelledAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cancelled At</span>
                    <span className="font-medium text-error-300">{formatDate(sub.cancelledAt)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          {limits && (
            <div className="rounded-2xl border border-hairline bg-surface-2 p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Zap className="size-4 text-primary" /> Plan Limits
              </h4>
              <div className="space-y-3">
                {[
                  { label: "Conversations", used: detail.usage.currentMonth, limit: limits.conversations },
                  { label: "Documents", used: detail.stats.totalDocuments, limit: limits.documents },
                  { label: "Knowledge Bases", used: detail.stats.totalKnowledgeBases, limit: limits.knowledgeBases },
                  { label: "Team Members", used: detail.teamMembers.length, limit: limits.teamMembers },
                ].map(({ label, used, limit }) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="tabular-nums">{used.toLocaleString()} / {limit.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          usagePercent(used, limit) > 90 ? "bg-error-300" : usagePercent(used, limit) > 70 ? "bg-warning-300" : "bg-primary",
                        )}
                        style={{ width: Math.min(usagePercent(used, limit), 100) + "%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-hairline bg-surface-2 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="size-4 text-primary" /> Stats
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <MessageSquare className="size-4" />, label: "Total Convos", value: stats.totalConversations },
                { icon: <MessageSquare className="size-4" />, label: "Active Convos", value: stats.activeConversations },
                { icon: <Users className="size-4" />, label: "Leads", value: stats.totalLeads },
                { icon: <FileText className="size-4" />, label: "Documents", value: stats.totalDocuments },
                { icon: <Users className="size-4" />, label: "Team Members", value: stats.teamMembers },
                { icon: <Key className="size-4" />, label: "API Keys", value: stats.apiKeys },
              ].map(({ icon, label, value }) => (
                <div key={label} className="rounded-xl border border-hairline bg-surface p-3 text-center">
                  <span className="mb-1 flex justify-center text-muted-foreground">{icon}</span>
                  <p className="font-display text-lg font-bold tabular-nums">{value.toLocaleString()}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {detail.teamMembers.length > 0 && (
            <div className="rounded-2xl border border-hairline bg-surface-2 p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Users className="size-4 text-primary" /> Team Members
              </h4>
              <div className="space-y-2">
                {detail.teamMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-xl border border-hairline bg-surface p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-primary">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{m.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                      m.role === "owner" ? "bg-warning-300/20 text-warning-300 border-warning-300/30" :
                      m.role === "admin" ? "bg-info-300/20 text-info-300 border-info-300/30" :
                      "bg-white/10 text-muted-foreground border-white/10"
                    )}>
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OwnerAdminPanel() {
  const [ownerUser, setOwnerUser] = useState<OwnerUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("owner_token");
    if (!token) {
      setChecking(false);
      return;
    }
    ownerFetch<OwnerUser>("/auth/me")
      .then((user) => setOwnerUser(user))
      .catch(() => {
        localStorage.removeItem("owner_token");
      })
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = (user: OwnerUser) => {
    setOwnerUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem("owner_token");
    setOwnerUser(null);
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-white/10 border-t-warning-300" />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!ownerUser) {
    return <LoginView onLogin={handleLogin} />;
  }

  return <AdminPanelView user={ownerUser} onLogout={handleLogout} />;
}
