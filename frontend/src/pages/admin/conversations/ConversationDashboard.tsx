import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout, DashboardContent, Badge } from '../../../components/dashboard';
import type { NavItem } from '../../../components/dashboard';
import { useAuth } from '../../../lib/auth-context';
import { apiClient } from '../../../lib/api-client';
import { ArrowLeft, MessageSquare, Clock, Users } from 'lucide-react';

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

interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sequenceNumber: number;
  createdAt: string;
}

interface HandoffRequest {
  id: string;
  sessionId: string;
  visitorEmail?: string;
  conversationSummary?: string;
  status: 'pending' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
}

interface MessagesResponse {
  messages: Message[];
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
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [handoff, setHandoff] = useState<HandoffRequest | null>(null);
  const [resolving, setResolving] = useState(false);
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

  const fetchMessages = useCallback(async (convId: string) => {
    setMessagesLoading(true);
    try {
      const data = await apiClient.get<MessagesResponse>(`/conversations/${convId}/messages?limit=200`);
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const handleRowClick = useCallback(async (conv: Conversation) => {
    setSelectedConv(conv);
    setHandoff(null);
    fetchMessages(conv.id);
    try {
      const data = await apiClient.get<{ handoff: HandoffRequest | null }>(`/conversations/${conv.id}/handoff`);
      setHandoff(data.handoff);
    } catch { /* no handoff */ }
  }, [fetchMessages]);

  const handleResolve = useCallback(async () => {
    if (!selectedConv || resolving) return;
    setResolving(true);
    try {
      await apiClient.patch(`/conversations/${selectedConv.id}/resolve`, {});
      setSelectedConv({ ...selectedConv, status: 'ended' });
      setHandoff(null);
      fetchConversations();
    } catch { /* ignore */ } finally {
      setResolving(false);
    }
  }, [selectedConv, resolving, fetchConversations]);

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
      rightRail={
        selectedConv ? (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-medium text-foreground">Conversation</h3>
              <button onClick={() => { setSelectedConv(null); setMessages([]); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition" aria-label="Close">
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="glass rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Session</span><span className="font-mono text-foreground">{selectedConv.sessionId.slice(0, 12)}...</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={statusVariant(selectedConv.status)} size="sm">{statusLabel(selectedConv.status)}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Messages</span><span className="text-foreground">{selectedConv.messageCount}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Started</span><span className="text-foreground">{formatRelativeTime(selectedConv.startedAt)}</span></div>
              </div>

              {selectedConv.status === 'escalated' && (
                <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 space-y-2">
                  <p className="text-xs font-semibold text-orange-400">Needs Human</p>
                  {handoff?.visitorEmail && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-orange-300/70">Email:</span>
                      <span className="text-orange-200 font-medium">{handoff.visitorEmail}</span>
                    </div>
                  )}
                  {handoff?.conversationSummary && (
                    <p className="text-xs text-orange-300/70">{handoff.conversationSummary}</p>
                  )}
                  <button
                    onClick={handleResolve}
                    disabled={resolving}
                    className="mt-2 w-full px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition disabled:opacity-50"
                  >
                    {resolving ? 'Resolving...' : 'Mark Resolved'}
                  </button>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Chat Transcript</p>
                {messagesLoading ? (
                  <div className="text-xs text-muted-foreground py-4 text-center">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-4 text-center">No messages found</div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[var(--color-accent-600)] text-white'
                            : 'bg-white/[0.06] text-foreground'
                        }`}>
                          {msg.role === 'assistant' && <span className="mr-1 opacity-60">✨</span>}
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : undefined
      }
    >
      <DashboardContent>
        <div className="space-y-5">
          <h1 className="text-[15px] font-medium text-foreground">Conversations</h1>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent-600)]/10">
                  <MessageSquare className="h-4 w-4 text-[var(--color-accent-600)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{todayCount}</p>
                  <p className="text-xs text-muted-foreground">Conversations Today</p>
                </div>
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10">
                  <Users className="h-4 w-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{handoffCount}</p>
                  <p className="text-xs text-muted-foreground">Handoff Requests Pending</p>
                </div>
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Clock className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{avgMessages}</p>
                  <p className="text-xs text-muted-foreground">Avg Messages / Conversation</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {FILTER_BUTTONS.map((f) => (
              <button
                key={f.key}
                onClick={() => handleFilterChange(f.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  activeFilter === f.key
                    ? 'bg-[var(--color-accent-600)] text-white shadow-sm'
                    : 'bg-white/[0.04] text-muted-foreground hover:text-foreground hover:bg-white/[0.08]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Table */}
          {loading ? (
            <div className="glass rounded-xl p-8 text-center text-sm text-muted-foreground">Loading conversations...</div>
          ) : error ? (
            <div className="glass rounded-xl p-8 text-center">
              <p className="text-sm text-red-400">{error}</p>
              <button onClick={fetchConversations} className="mt-3 text-xs text-[var(--color-accent-600)] hover:underline">Retry</button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-sm text-muted-foreground">No conversations found</div>
          ) : (
            <div className="glass rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Session</th>
                    <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Started</th>
                    <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold hidden sm:table-cell">Turns</th>
                    <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold hidden md:table-cell">Last Message</th>
                    <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {conversations.map((conv) => (
                    <tr
                      key={conv.id}
                      onClick={() => handleRowClick(conv)}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{conv.sessionId.slice(0, 10)}...</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelativeTime(conv.startedAt)}</td>
                      <td className="px-4 py-3 text-xs text-foreground tabular-nums hidden sm:table-cell">{conv.messageCount}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[200px] hidden md:table-cell">{(conv.lastMessage || '—').slice(0, 60)}</td>
                      <td className="px-4 py-3"><Badge variant={statusVariant(conv.status)} size="sm">{statusLabel(conv.status)}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed transition">Prev</button>
                <button disabled={page * pageSize >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed transition">Next</button>
              </div>
            </div>
          )}
        </div>
      </DashboardContent>
    </DashboardLayout>
  );
}
