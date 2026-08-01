import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout, DashboardContent, DashboardSection, DashboardTable, DashboardSearch, DashboardFilterBar, DashboardPagination, DashboardEmptyState, DashboardErrorState, DashboardLoadingState, DashboardRightRail, Badge } from '../../../components/dashboard';
import { useSessions, useSessionDetail } from '../../../hooks/useConversationIntelligence';
import type { NavItem, Column } from '../../../components/dashboard';
import { useAuth } from '../../../lib/auth-context';
import { Copy, Check, ArrowLeft } from 'lucide-react';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Conversations', href: '/dashboard/conversations', active: true },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Knowledge', href: '/dashboard/knowledge' },
  { label: 'Widget', href: '/dashboard/widget' },
  { label: 'Billing', href: '/dashboard/billing' },
  { label: 'Onboarding', href: '/dashboard/onboarding' },
];

const STATUS_FILTERS = [
  { key: 'status', label: 'Status', options: [
    { label: 'Active', value: 'active' },
    { label: 'Ended', value: 'ended' },
    { label: 'Escalated', value: 'escalated' },
  ]},
  { key: 'intent', label: 'Intent', options: [
    { label: 'Detected', value: 'true' },
    { label: 'None', value: 'false' },
  ]},
];

function formatTime(ts: string | number): string {
  const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function statusBadgeVariant(state: string): 'success' | 'warning' | 'error' | 'neutral' | 'info' {
  switch (state) {
    case 'active': return 'success';
    case 'escalated': return 'warning';
    case 'expired': return 'neutral';
    default: return 'info';
  }
}

function displayState(state: string): string {
  switch (state) {
    case 'active': return 'Active';
    case 'expired': return 'Ended';
    case 'escalated': return 'Escalated';
    default: return state;
  }
}

export default function ConversationDashboard() {
  const navigate = useNavigate();
  const { user, tenant, logout } = useAuth();
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: sessionsData, loading: sessionsLoading, error: sessionsError, reload: reloadSessions } = useSessions(pageSize, page * pageSize);
  const { data: detail, loading: detailLoading } = useSessionDetail(selectedId);
  const workspaceName = tenant?.name || 'Conversation Engine';

  const filteredSessions = useMemo(() => {
    if (!sessionsData?.sessions) return [];
    let list = sessionsData.sessions;
    if (filters.status === 'active') list = list.filter(s => s.stateMachine === 'active');
    else if (filters.status === 'ended') list = list.filter(s => s.stateMachine === 'expired');
    else if (filters.status === 'escalated') list = list.filter(s => s.stateMachine === 'escalated' || s.stateMachine === 'handoff');
    if (filters.intent === 'true') list = list.filter(s => s.buyingIntentDetected);
    else if (filters.intent === 'false') list = list.filter(s => !s.buyingIntentDetected);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.sessionId.toLowerCase().includes(q) || s.persona.toLowerCase().includes(q) || (s.tags && s.tags.some(t => t.toLowerCase().includes(q))));
    }
    return list;
  }, [sessionsData, filters, searchQuery]);

  const columns: Column<any>[] = useMemo(() => [
    { key: 'sessionId', header: 'Session', sortable: true, cell: (s) => (
      <span className="font-mono text-xs">{s.sessionId.slice(0, 10)}…</span>
    )},
    { key: 'status', header: 'Status', sortable: true, cell: (s) => (
      <Badge variant={statusBadgeVariant(s.stateMachine)} size="sm">{displayState(s.stateMachine)}</Badge>
    )},
    { key: 'persona', header: 'Persona', sortable: true, className: 'hidden sm:table-cell', cell: (s) => (
      <span className="text-sm">{s.persona || 'Unknown'}</span>
    )},
    { key: 'turns', header: 'Turns', sortable: true, className: 'hidden md:table-cell', cell: (s) => (
      <span className="text-sm tabular-nums">{s.turnCount}</span>
    )},
    { key: 'indicators', header: '', cell: (s) => (
      <div className="flex items-center gap-1.5 justify-end">
        {s.buyingIntentDetected && <span className="h-2 w-2 rounded-full bg-success" title="Buying intent" />}
        <span className={`h-2 w-2 rounded-full ${s.hasIntel ? 'bg-wine' : 'bg-white/[0.15]'}`} title={s.hasIntel ? 'Analyzed' : 'Raw'} />
      </div>
    )},
    { key: 'time', header: 'Time', sortable: true, className: 'hidden lg:table-cell', cell: (s) => (
      <span className="text-xs text-muted-foreground">{formatTime(s.createdAt)}</span>
    )},
  ], []);

  const handleFilterChange = useCallback((key: string, value: string | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
    setPage(0);
  }, []);

  const handleCopyId = useCallback(async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

  const loading = sessionsLoading && !sessionsData;
  const error = sessionsError;

  if (loading) {
    return (
      <DashboardLayout sidebarItems={NAV_ITEMS} onNavigate={(item) => item.href && navigate(item.href)} workspaceName={workspaceName} userName={user?.name} userEmail={user?.email} onLogout={logout} onSettings={() => navigate('/dashboard/settings')}>
        <DashboardContent loading />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout sidebarItems={NAV_ITEMS} onNavigate={(item) => item.href && navigate(item.href)} workspaceName={workspaceName} userName={user?.name} userEmail={user?.email} onLogout={logout} onSettings={() => navigate('/dashboard/settings')}>
        <DashboardContent>
          <DashboardErrorState message={error} onRetry={reloadSessions} />
        </DashboardContent>
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
      rightRail={
        selectedId ? (
          <div className="space-y-4">
            {detailLoading ? (
              <DashboardLoadingState variant="skeleton" />
            ) : detail ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-foreground">Conversation Detail</h2>
                  <button onClick={() => setSelectedId(null)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition" aria-label="Close detail">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </div>

                {/* Customer Info */}
                <div className="glass rounded-2xl p-4 space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Customer</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Persona</span>
                    <span className="text-xs text-foreground">{detail.persona || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Stage</span>
                    <span className="text-xs text-foreground">{detail.funnelStage || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Intent</span>
                    <Badge variant={detail.buyingIntentDetected ? 'success' : 'neutral'} size="sm">{detail.buyingIntentDetected ? 'Detected' : 'None'}</Badge>
                  </div>
                  {detail.owner && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Owner</span>
                      <span className="text-xs text-foreground">{detail.owner}</span>
                    </div>
                  )}
                  <div className="pt-1">
                    <button onClick={() => handleCopyId(detail.sessionId)} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition">
                      {copiedId === detail.sessionId ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedId === detail.sessionId ? 'Copied' : 'Copy ID'}
                    </button>
                  </div>
                </div>

                {/* Confidence */}
                <div className="glass rounded-2xl p-4">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Confidence Score</p>
                  {(() => {
                    const polarities = detail.turns?.map(t => t.polarity) || [];
                    const avg = polarities.length > 0 ? Math.round((polarities.reduce((a, b) => a + b, 0) / polarities.length + 1) * 50) : 0;
                    const label = avg >= 75 ? 'High' : avg >= 40 ? 'Medium' : 'Low';
                    const color = avg >= 75 ? 'text-success' : avg >= 40 ? 'text-warning' : 'text-destructive';
                    return (
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-12 w-12 items-center justify-center">
                          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="oklch(1 0 0 / 0.06)" strokeWidth="3" />
                            <circle cx="18" cy="18" r="15.5" fill="none" stroke={avg >= 75 ? 'oklch(0.72 0.1 165)' : avg >= 40 ? 'oklch(0.78 0.1 80)' : 'oklch(0.58 0.16 25)'} strokeWidth="3" strokeDasharray={`${avg * 3.26} 326`} strokeLinecap="round" />
                          </svg>
                          <span className={cn('text-[10px] font-bold tabular-nums', color)}>{avg}%</span>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-foreground">{label}</span>
                          <p className="text-xs text-muted-foreground">Based on {polarities.length} messages</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Tags */}
                {detail.tags && detail.tags.length > 0 && (
                  <div className="glass rounded-2xl p-4">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.tags.map((tag, i) => (
                        <Badge key={i} variant="info" size="sm">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Topics */}
                {detail.topics && detail.topics.length > 0 && (
                  <div className="glass rounded-2xl p-4">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Topics</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.topics.map((topic, i) => (
                        <Badge key={i} variant="premium" size="sm">{topic}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        ) : undefined
      }
    >
      <DashboardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-[15px] font-medium text-foreground">Conversations</h1>
            <div className="flex items-center gap-2">
              <DashboardSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search by ID, persona, or tag…" />
            </div>
          </div>

          <DashboardFilterBar
            filters={STATUS_FILTERS.map(f => ({ ...f, current: filters[f.key] }))}
            onChange={handleFilterChange}
            onClearAll={handleClearFilters}
          />

          <DashboardTable
            columns={columns}
            data={filteredSessions}
            loading={sessionsLoading}
            empty={filteredSessions.length === 0 && !sessionsLoading}
            error={error}
            onRetry={reloadSessions}
            rowKey={(s) => s.sessionId}
            onRowClick={(s) => setSelectedId(s.sessionId)}
          />

          {sessionsData && sessionsData.total > pageSize && (
            <DashboardPagination
              total={sessionsData.total}
              page={page + 1}
              pageSize={pageSize}
              onPageChange={(p) => setPage(p - 1)}
            />
          )}
        </div>
      </DashboardContent>
    </DashboardLayout>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
