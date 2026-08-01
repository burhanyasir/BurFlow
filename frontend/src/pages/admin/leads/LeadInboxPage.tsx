import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Pagination } from '../../../components/ui/Pagination';
import { AppLayout } from '../../../layouts/AppLayout';
import { fetchLeads, updateSessionStatus, assignSessionOwner } from '../../../hooks/useConversationIntelligence';
import { personaLabel, funnelLabel, statusLabel, statusVariant } from '../../../types/conversation-intelligence';
import type { SidebarItem } from '../../../layouts/Sidebar';
import type { LeadSummary } from '../../../types/conversation-intelligence';

const NAV_ITEMS: SidebarItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Leads', href: '/dashboard/leads', active: true },
  { label: 'Follow-ups', href: '/dashboard/followups' },
  { label: 'Conversations', href: '/dashboard/conversations' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Knowledge', href: '/dashboard/knowledge' },
  { label: 'Onboarding', href: '/dashboard/onboarding' },
];

export default function LeadInboxPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchLeads(pageSize, page * pageSize);
      setLeads(res.leads);
      setTotal(res.total);
    } catch {} finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleNavigate = (item: SidebarItem) => {
    if (item.href) navigate(item.href);
  };

  const handleStatus = async (sessionId: string, status: string) => {
    try {
      await updateSessionStatus(sessionId, status);
      load();
    } catch {}
  };

  const handleAssign = async (sessionId: string, owner: string) => {
    try {
      await assignSessionOwner(sessionId, owner);
      load();
    } catch {}
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AppLayout sidebarItems={NAV_ITEMS} onNavigate={handleNavigate} workspaceName="Conversation Engine">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">Lead Inbox</h1>
          <p className="text-sm text-[var(--color-neutral-500)] mt-1">{total} qualified leads</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Leads</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-[var(--color-neutral-50)] animate-pulse rounded-lg" />
                ))}
              </div>
            ) : leads.length === 0 ? (
              <p className="text-sm text-[var(--color-neutral-500)] py-8 text-center">No leads yet. Qualified conversations will appear here.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-neutral-200)]">
                      <th className="text-left py-2 font-medium text-[var(--color-neutral-500)]">Session</th>
                      <th className="text-left py-2 font-medium text-[var(--color-neutral-500)]">Persona</th>
                      <th className="text-left py-2 font-medium text-[var(--color-neutral-500)]">Stage</th>
                      <th className="text-center py-2 font-medium text-[var(--color-neutral-500)]">Intent</th>
                      <th className="text-left py-2 font-medium text-[var(--color-neutral-500)]">Owner</th>
                      <th className="text-left py-2 font-medium text-[var(--color-neutral-500)]">Status</th>
                      <th className="text-right py-2 font-medium text-[var(--color-neutral-500)]">Turns</th>
                      <th className="text-right py-2 font-medium text-[var(--color-neutral-500)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(lead => (
                      <tr key={lead.sessionId} className="border-b border-[var(--color-neutral-100)] hover:bg-[var(--color-neutral-50)] cursor-pointer" onClick={() => navigate(`/dashboard/conversations/${lead.sessionId}`)}>
                        <td className="py-3 text-[var(--color-neutral-800)] font-mono text-xs">{lead.sessionId.slice(0, 8)}…</td>
                        <td className="py-3"><Badge variant="info" size="sm">{personaLabel(lead.persona)}</Badge></td>
                        <td className="py-3 text-[var(--color-neutral-700)]">{funnelLabel(lead.funnelStage)}</td>
                        <td className="py-3 text-center">
                          {lead.buyingIntentDetected ? (
                            <Badge variant="success" size="sm">Yes</Badge>
                          ) : (
                            <span className="text-[var(--color-neutral-400)]">—</span>
                          )}
                        </td>
                        <td className="py-3 text-[var(--color-neutral-700)]">{lead.owner || '—'}</td>
                        <td className="py-3">
                          <Badge variant={statusVariant(lead.status || 'new')} size="sm">{statusLabel(lead.status || 'new')}</Badge>
                        </td>
                        <td className="py-3 text-right text-[var(--color-neutral-500)]">{lead.turnCount}</td>
                        <td className="py-3 text-right">
                          <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                            <select
                              className="text-xs border border-[var(--color-neutral-200)] rounded px-1 py-0.5"
                              value={lead.status || 'new'}
                              onChange={e => handleStatus(lead.sessionId, e.target.value)}
                            >
                              <option value="new">New</option>
                              <option value="working">Working</option>
                              <option value="qualified">Qualified</option>
                              <option value="won">Won</option>
                              <option value="lost">Lost</option>
                            </select>
                            <select
                              className="text-xs border border-[var(--color-neutral-200)] rounded px-1 py-0.5"
                              value={lead.owner || ''}
                              onChange={e => handleAssign(lead.sessionId, e.target.value)}
                            >
                              <option value="">Unassigned</option>
                              <option value="alice">Alice</option>
                              <option value="bob">Bob</option>
                              <option value="carol">Carol</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
