import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/dashboard';
import type { NavItem } from '../../../components/dashboard';
import { PageHead, DashButton, Panel, StatCard, EmptyState } from '../../../components/dash/ui';
import { useAuth } from '../../../lib/auth-context';
import { apiClient } from '../../../lib/api-client';
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, MessageSquare, Users } from 'lucide-react';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Conversations', href: '/dashboard/conversations', active: true },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Knowledge', href: '/dashboard/knowledge' },
  { label: 'Widget', href: '/dashboard/widget' },
  { label: 'Billing', href: '/dashboard/billing' },
  { label: 'Onboarding', href: '/dashboard/onboarding' },
];

interface Conversation {
  id: string;
  tenantId: string;
  sessionId: string;
  userId?: string;
  startedAt: string;
  endedAt?: string;
  messageCount: number;
  status: 'active' | 'ended' | 'escalated';
  lastMessage?: string;
}

interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
}

type FilterStatus = 'all' | 'active' | 'handoff_requested' | 'completed';

function formatRelativeTime(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'neutral' | 'info' {
  switch (status) {
    case 'active': return 'success';
    case 'handoff_requested': return 'warning';
    case 'ended': case 'completed': return 'neutral';
    case 'escalated': return 'error';
    default: return 'info';
  }
}

function statusDotClass(status: string): string {
  switch (statusVariant(status)) {
    case 'success': return 'bg-success';
    case 'warning': return 'bg-warning-500';
    case 'error': return 'bg-error-500';
    default: return 'bg-surface-2';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Active';
    case 'handoff_requested': return 'Needs Human';
    case 'ended': return 'Ended';
    case 'completed': return 'Completed';
    case 'escalated': return 'Escalated';
    default: return status;
  }
}

function mapApiStatus(filter: FilterStatus): string | undefined {
  switch (filter) {
    case 'active': return 'active';
    case 'completed': return 'ended';
    case 'handoff_requested': return 'escalated';
    default: return undefined;
  }
}

const FILTER_BUTTONS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'handoff_requested', label: 'Handoff Requested' },
  { key: 'completed', label: 'Completed' },
];

export default function ConversationDashboard() {
  const navigate = useNavigate();
  const { user, tenant, logout } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const pageSize = 20;

  const workspaceName = tenant?.name || 'Conversation Engine';

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = mapApiStatus(activeFilter);
      const qs = `?page=${page}&limit=${pageSize}${statusParam ? `&status=${statusParam}` : ''}`;
      const data = await apiClient.get<ConversationsResponse>(`/conversations${qs}`);
      setConversations(data.conversations || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [page, activeFilter]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const handleFilterChange = useCallback((filter: FilterStatus) => {
    setActiveFilter(filter);
    setPage(1);
  }, []);

  const todayCount = conversations.filter(c => {
    const d = new Date(c.startedAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const avgMessages = conversations.length > 0
    ? Math.round(conversations.reduce((sum, c) => sum + c.messageCount, 0) / conversations.length)
    : 0;

  const handoffCount = conversations.filter(c => c.status === 'escalated').length;

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
          title="Conversations"
          sub="Every visitor conversation captured by your widget — with status, escalation, and handoff state."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={<MessageSquare className="size-4" />}
            label="Conversations today"
            value={String(todayCount)}
            hint="Started in the last 24 hours"
          />
          <StatCard
            icon={<Users className="size-4" />}
            label="Handoff requests pending"
            value={String(handoffCount)}
            hint="Escalated and awaiting a human"
          />
          <StatCard
            icon={<Clock className="size-4" />}
            label="Avg messages / conversation"
            value={String(avgMessages)}
            hint="Across the current page"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTER_BUTTONS.map((f) => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold transition ${
                activeFilter === f.key
                  ? 'bg-primary text-primary-foreground shadow-soft'
                  : 'border border-hairline bg-surface text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Panel>
            <h2 className="text-lg font-bold tracking-tight">Conversations</h2>
            <div className="mt-4 space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl border border-hairline bg-surface-2/60" />
              ))}
            </div>
          </Panel>
        ) : error ? (
          <Panel>
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertTriangle className="size-8 text-error-500" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <DashButton variant="ghost" onClick={fetchConversations}>Retry</DashButton>
            </div>
          </Panel>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="size-6" />}
            title="No conversations found"
            body="Visitor conversations will appear here as soon as the widget engages someone. Try a different filter if you expect to see results."
            actions={
              activeFilter !== 'all' ? (
                <DashButton variant="ghost" onClick={() => handleFilterChange('all')}>
                  Clear filters
                </DashButton>
              ) : undefined
            }
          />
        ) : (
          <Panel>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Conversations</h2>
              <span className="rounded-full bg-ember-soft px-3 py-1 text-xs font-semibold">{total}</span>
            </div>
            <div className="mt-4 space-y-3">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/dashboard/conversations/${conv.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/dashboard/conversations/${conv.id}`); }}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-hairline bg-surface-2/60 p-4 transition hover:-translate-y-px hover:shadow-soft"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{conv.lastMessage || '—'}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{conv.sessionId.slice(0, 12)}…</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ember-soft px-3 py-1 text-xs font-semibold">
                    <span className={`size-1.5 shrink-0 rounded-full ${statusDotClass(conv.status)}`} />
                    {statusLabel(conv.status)}
                  </span>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{formatRelativeTime(conv.startedAt)}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{conv.messageCount} msgs</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </div>
              ))}
            </div>
            {total > pageSize && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
                <p className="text-xs text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} · Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1}
                    aria-label="Previous page"
                    className="grid size-9 place-items-center rounded-full border border-hairline bg-surface text-sm transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * pageSize >= total}
                    aria-label="Next page"
                    className="grid size-9 place-items-center rounded-full border border-hairline bg-surface text-sm transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </Panel>
        )}
      </div>
    </DashboardLayout>
  );
}
