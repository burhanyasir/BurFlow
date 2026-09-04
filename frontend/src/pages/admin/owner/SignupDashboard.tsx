import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/dashboard';
import { PageHead, Panel, StatCard } from '../../../components/dash/ui';
import { useAuth } from '../../../lib/auth-context';
import { apiClient } from '../../../lib/api-client';
import { useToast } from '../../../components/ui/Toast';
import { Users, Calendar, Globe, TrendingUp, Search, ChevronLeft, ChevronRight, RefreshCw, ExternalLink, Scan } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Conversations', href: '/dashboard/conversations' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Knowledge', href: '/dashboard/knowledge' },
  { label: 'Widget', href: '/dashboard/widget' },
  { label: 'Billing', href: '/dashboard/billing' },
  { label: 'Owner', href: '/dashboard/owner' },
];

interface SignupItem {
  id: string;
  name: string;
  email: string;
  company: string;
  website: string;
  createdAt: string;
  scanned: boolean;
}

interface SignupStats {
  total: number;
  today: number;
  scannedWebsites: number;
  conversionRate: number;
}

interface SignupPage {
  items: SignupItem[];
  total: number;
  page: number;
  totalPages: number;
}

function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export default function SignupDashboard() {
  const navigate = useNavigate();
  const { user, tenant, logout } = useAuth();
  const { addToast } = useToast();
  const workspaceName = tenant?.name || 'Owner Panel';

  const [stats, setStats] = useState<SignupStats | null>(null);
  const [pageData, setPageData] = useState<SignupPage | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await apiClient.get<SignupStats>('/api/owner/signups/stats');
      setStats(data);
    } catch {
      addToast('Failed to load signup stats', 'error');
    } finally {
      setStatsLoading(false);
    }
  }, [addToast]);

  const loadSignups = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const data = await apiClient.get<SignupPage>(`/api/owner/signups?${params}`);
      setPageData(data);
    } catch {
      addToast('Failed to load signups', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, addToast]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadSignups(); }, [loadSignups]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {}, 300);
  };

  const handleRefresh = () => { loadStats(); loadSignups(); };

  const handleRescan = async (signupId: string) => {
    try {
      await apiClient.post(`/api/owner/signups/${signupId}/rescan`);
      addToast('Rescan initiated', 'success');
      loadSignups();
    } catch {
      addToast('Failed to initiate rescan', 'error');
    }
  };

  const items = pageData?.items || [];
  const total = pageData?.total || 0;
  const totalPages = pageData?.totalPages || 1;

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
          title="Signup Dashboard"
          sub="Monitor new owner registrations, website scan status, and conversion metrics."
          actions={
            <button
              onClick={handleRefresh}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-hairline bg-surface px-5 text-sm font-semibold text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-lift"
            >
              <RefreshCw className="size-4" /> Refresh
            </button>
          }
        />

        {/* Metric cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Users className="size-4" />}
            label="Total Registrations"
            value={statsLoading ? '—' : String(stats?.total ?? 0)}
            hint="All-time signups"
          />
          <StatCard
            icon={<Calendar className="size-4" />}
            label="Today's Signups"
            value={statsLoading ? '—' : String(stats?.today ?? 0)}
            hint="Registered today"
          />
          <StatCard
            icon={<Globe className="size-4" />}
            label="Active Scanned Websites"
            value={statsLoading ? '—' : String(stats?.scannedWebsites ?? 0)}
            hint="Websites with completed crawl"
          />
          <StatCard
            icon={<TrendingUp className="size-4" />}
            label="Conversion Rate"
            value={statsLoading ? '—' : `${stats?.conversionRate ?? 0}%`}
            hint="Signup to active widget"
          />
        </div>

        {/* Signups table */}
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold tracking-tight">Recent Signups</h2>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by name, email, or company…"
                className="h-9 w-full rounded-full border border-hairline bg-surface pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:shadow-glow sm:w-64"
              />
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="hidden pb-3 pr-4 md:table-cell">Company / Website</th>
                  <th className="hidden pb-3 pr-4 sm:table-cell">Signed Up</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="py-3 pr-4">
                          <div className="h-4 animate-pulse rounded bg-surface-2/60" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      No signups found{search ? ' matching your search.' : '.'}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="transition hover:bg-surface-2/40">
                      <td className="py-3 pr-4">
                        <span className="font-medium text-foreground">{item.name || '—'}</span>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{item.email}</td>
                      <td className="hidden py-3 pr-4 md:table-cell">
                        <div className="flex flex-col">
                          {item.company && <span className="text-foreground">{item.company}</span>}
                          {item.website && (
                            <a
                              href={item.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              {item.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                          {!item.company && !item.website && <span className="text-muted-foreground">—</span>}
                        </div>
                      </td>
                      <td className="hidden py-3 pr-4 sm:table-cell">
                        <span className="text-muted-foreground">{formatRelativeTime(item.createdAt)}</span>
                      </td>
                      <td className="py-3 pr-4">
                        {item.scanned ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                            <span className="size-1.5 rounded-full bg-success" />
                            Scanned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-300/25 px-2.5 py-1 text-xs font-semibold text-warning-500">
                            <span className="size-1.5 rounded-full bg-warning-500" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleRescan(item.id)}
                            className="grid size-8 place-items-center rounded-full border border-hairline bg-surface text-muted-foreground transition hover:text-foreground"
                            title="Run Rescan"
                            aria-label="Run rescan"
                          >
                            <Scan className="size-3.5" />
                          </button>
                          {item.website && (
                            <a
                              href={item.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="grid size-8 place-items-center rounded-full border border-hairline bg-surface text-muted-foreground transition hover:text-foreground"
                              title="View Website"
                              aria-label="View website"
                            >
                              <ExternalLink className="size-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-5 flex items-center justify-between border-t border-hairline pt-4">
              <p className="text-xs text-muted-foreground">
                {total === 0 ? '0 results' : `${(page - 1) * 20 + 1}–${Math.min(page * 20, total)} of ${total}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="grid size-8 place-items-center rounded-full border border-hairline bg-surface text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-xs tabular-nums text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="grid size-8 place-items-center rounded-full border border-hairline bg-surface text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </DashboardLayout>
  );
}
