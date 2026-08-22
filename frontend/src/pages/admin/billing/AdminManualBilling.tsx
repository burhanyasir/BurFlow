import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/dashboard';
import type { NavItem } from '../../../components/dashboard';
import { PageHead, DashButton, Panel, EmptyState } from '../../../components/dash/ui';
import { useAuth } from '../../../lib/auth-context';
import { apiClient } from '../../../lib/api-client';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../utils/cn';
import { CreditCard, Check, RefreshCw, Search, Users, AlertTriangle, Zap } from 'lucide-react';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Conversations', href: '/dashboard/conversations' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Knowledge', href: '/dashboard/knowledge' },
  { label: 'Widget', href: '/dashboard/widget' },
  { label: 'Billing', href: '/dashboard/billing' },
  { label: 'Manual Billing', href: '/dashboard/billing/manual', active: true },
  { label: 'Onboarding', href: '/dashboard/onboarding' },
];

const PLAN_OPTIONS = [
  { id: 'free', name: 'Free', price: '$0/mo', color: 'text-neutral-400' },
  { id: 'starter', name: 'Starter', price: '$49/mo', color: 'text-blue-400' },
  { id: 'pro', name: 'Pro', price: '$99/mo', color: 'text-purple-400' },
  { id: 'advanced', name: 'Advanced', price: '$120/mo', color: 'text-amber-400' },
];

interface TenantInfo {
  tenantId: string;
  tenantName: string;
  ownerEmail: string;
  plan: string;
  status: string;
  currentPeriodEnd: string;
}

export default function AdminManualBilling() {
  const navigate = useNavigate();
  const { user, tenant, logout } = useAuth();
  const { addToast } = useToast();
  const workspaceName = tenant?.name || 'Conversation Engine';

  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activating, setActivating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTenants = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await apiClient.get<{ tenants: TenantInfo[]; total: number }>('/admin/tenants');
      setTenants(res.tenants || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTenants(); }, [loadTenants]);

  const handleActivate = async (tenantId: string, plan: string) => {
    setActivating(tenantId); setError(null);
    try {
      await apiClient.post('/admin/billing/activate', { plan, tenantId });
      addToast(`Plan updated to ${plan} — subscription active`, 'success');
      await loadTenants();
    } catch (err: any) {
      setError(err.message || 'Failed to activate plan');
      addToast(err.message || 'Activation failed', 'error');
    } finally {
      setActivating(null);
    }
  };

  const filtered = tenants.filter(t =>
    t.tenantName.toLowerCase().includes(search.toLowerCase()) ||
    t.ownerEmail.toLowerCase().includes(search.toLowerCase()) ||
    t.tenantId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout sidebarItems={NAV_ITEMS} onNavigate={(item) => item.href && navigate(item.href)} workspaceName={workspaceName} userName={user?.name} userEmail={user?.email} onLogout={logout} onSettings={() => navigate('/dashboard/settings')}>
      <div className="space-y-6">
        <PageHead
          title="Manual Billing"
          sub="Manually activate or change subscription plans for tenants"
          actions={<DashButton variant="ghost" onClick={loadTenants}><RefreshCw className="size-4" /> Refresh</DashButton>}
        />

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3">
            <AlertTriangle className="size-5 shrink-0 text-red-500" />
            <p className="flex-1 text-sm text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="text-xs font-medium text-neutral-500 hover:text-white">Dismiss</button>
          </div>
        )}

        <Panel>
          <div className="flex items-center gap-3">
            <Search className="size-4 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or tenant ID..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-500 outline-none"
            />
          </div>
        </Panel>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map(i => <div key={i} className="h-48 rounded-2xl border border-white/5 bg-white/[0.02] animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="size-6" />}
            title={search ? 'No tenants match your search' : 'No tenants found'}
            body={search ? 'Try a different search term.' : 'There are no tenants in the system yet.'}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map(t => (
              <div key={t.tenantId} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-sm font-bold text-white">{t.tenantName}</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">{t.ownerEmail}</p>
                  </div>
                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold', t.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : t.status === 'trialing' ? 'bg-blue-500/10 text-blue-400' : 'bg-neutral-500/10 text-neutral-400')}>
                    {t.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <CreditCard className="size-3.5 text-neutral-500" />
                  <span className="text-xs text-neutral-400">Current plan: <span className="font-semibold text-white">{t.plan}</span></span>
                </div>

                {t.currentPeriodEnd && (
                  <p className="text-[11px] text-neutral-600">Period ends: {new Date(t.currentPeriodEnd).toLocaleDateString()}</p>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {PLAN_OPTIONS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleActivate(t.tenantId, p.id)}
                      disabled={activating === t.tenantId || t.plan === p.id}
                      className={cn(
                        'flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
                        t.plan === p.id
                          ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                          : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white',
                        activating === t.tenantId && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {t.plan === p.id && <Check className="size-3" />}
                      {activating === t.tenantId ? '...' : p.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
