import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Pagination } from '../../../components/ui/Pagination';
import { AppLayout } from '../../../layouts/AppLayout';
import { fetchFollowUps, updateSessionStatus, assignSessionOwner } from '../../../hooks/useConversationIntelligence';
import { personaLabel, funnelLabel, followUpReasonLabel, statusLabel, statusVariant } from '../../../types/conversation-intelligence';
import type { SidebarItem } from '../../../layouts/Sidebar';
import type { FollowUpSummary } from '../../../types/conversation-intelligence';

const NAV_ITEMS: SidebarItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Leads', href: '/dashboard/leads' },
  { label: 'Follow-ups', href: '/dashboard/followups', active: true },
  { label: 'Conversations', href: '/dashboard/conversations' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Knowledge', href: '/dashboard/knowledge' },
  { label: 'Onboarding', href: '/dashboard/onboarding' },
];

export default function FollowUpQueuePage() {
  const navigate = useNavigate();
  const [followups, setFollowups] = useState<FollowUpSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchFollowUps(pageSize, page * pageSize);
      setFollowups(res.followups);
      setTotal(res.total);
    } catch {} finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleNavigate = (item: SidebarItem) => {
    if (item.href) navigate(item.href);
  };

  const handleAssign = async (sessionId: string, owner: string) => {
    try {
      await assignSessionOwner(sessionId, owner);
      load();
    } catch {}
  };

  const handleComplete = async (sessionId: string) => {
    try {
      await updateSessionStatus(sessionId, 'working');
      load();
    } catch {}
  };

  const handleSnooze = async (sessionId: string) => {
    try {
      await updateSessionStatus(sessionId, 'new');
      load();
    } catch {}
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AppLayout sidebarItems={NAV_ITEMS} onNavigate={handleNavigate} workspaceName="Conversation Engine">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">Follow-up Queue</h1>
          <p className="text-sm text-[var(--color-neutral-500)] mt-1">{total} conversations requiring follow-up</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Follow-ups</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-[var(--color-neutral-50)] animate-pulse rounded-lg" />
                ))}
              </div>
            ) : followups.length === 0 ? (
              <p className="text-sm text-[var(--color-neutral-500)] py-8 text-center">No follow-ups needed right now.</p>
            ) : (
              <div className="space-y-2">
                {followups.map(fu => (
                  <div key={fu.sessionId} className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-neutral-200)] hover:bg-[var(--color-neutral-50)] cursor-pointer transition-colors" onClick={() => navigate(`/dashboard/conversations/${fu.sessionId}`)}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--color-neutral-900)]">{fu.sessionId.slice(0, 8)}…</p>
                        <p className="text-xs text-[var(--color-neutral-500)]">{fu.turnCount} turns · {personaLabel(fu.persona)}</p>
                      </div>
                      <Badge variant="warning" size="sm">{followUpReasonLabel(fu.followUpReason)}</Badge>
                      {fu.buyingIntentDetected && <Badge variant="success" size="sm">Intent</Badge>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-[var(--color-neutral-500)]">{fu.owner || 'Unassigned'}</span>
                      <Badge variant={statusVariant(fu.status || 'new')} size="sm">{statusLabel(fu.status || 'new')}</Badge>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <select
                          className="text-xs border border-[var(--color-neutral-200)] rounded px-1 py-0.5"
                          value={fu.owner || ''}
                          onChange={e => handleAssign(fu.sessionId, e.target.value)}
                        >
                          <option value="">Assign</option>
                          <option value="alice">Alice</option>
                          <option value="bob">Bob</option>
                          <option value="carol">Carol</option>
                        </select>
                        <button className="text-xs text-[var(--color-accent-600)] hover:underline px-1" onClick={() => handleComplete(fu.sessionId)}>Complete</button>
                        <button className="text-xs text-[var(--color-neutral-400)] hover:underline px-1" onClick={() => handleSnooze(fu.sessionId)}>Snooze</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination currentPage={page + 1} totalPages={totalPages} onPageChange={p => setPage(p - 1)} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
