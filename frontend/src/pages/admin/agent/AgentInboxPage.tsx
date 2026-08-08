import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../../layouts/AppLayout';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../components/ui/Toast';
import type { SidebarItem } from '../../../layouts/Sidebar';
import {
  fetchSessions, fetchMessages, initiateTakeover, releaseTakeover, sendAgentMessage,
  type AgentSession, type SessionMessage,
} from '../../../services/agent-api';

const POLL_INTERVAL_MS = 3000;
const LEAD_SCORE_HIGH = 60;

const NAV_ITEMS: SidebarItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Agent Inbox', href: '/agent', active: true, badge: 'live' },
  { label: 'Leads', href: '/dashboard/leads' },
  { label: 'Conversations', href: '/dashboard/conversations' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Knowledge', href: '/dashboard/knowledge' },
];

type FilterTab = 'all' | 'needs' | 'active';

const FILTERS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All Sessions' },
  { id: 'needs', label: 'Needs Takeover' },
  { id: 'active', label: 'Active Takeover' },
];

function relativeTime(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function displayName(session: AgentSession): string {
  return session.visitorName || (session.visitorEmail ? session.visitorEmail.split('@')[0] : 'Anonymous visitor');
}

function stateLabel(state: AgentSession['sessionState']): string {
  if (state === 'human_takeover') return 'Human takeover';
  if (state === 'closed') return 'Closed';
  return 'AI managed';
}

export default function AgentInboxPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [pollError, setPollError] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const refreshSessions = useCallback(async () => {
    try {
      const res = await fetchSessions();
      setSessions(res.sessions);
      setPollError(null);
    } catch (err: any) {
      setPollError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshThread = useCallback(async (conversationId: string) => {
    try {
      const thread = await fetchMessages(conversationId);
      setMessages(thread.messages);
    } catch {}
  }, []);

  // Short-poll every 3 seconds: session list + active thread.
  useEffect(() => {
    refreshSessions();
    const interval = setInterval(() => {
      refreshSessions();
      if (selectedId) refreshThread(selectedId);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshSessions, refreshThread, selectedId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectSession = async (session: AgentSession) => {
    setSelectedId(session.id);
    setThreadLoading(true);
    try {
      await refreshThread(session.id);
    } finally {
      setThreadLoading(false);
    }
  };

  const handleTakeover = async () => {
    if (!selectedId) return;
    const session = sessions.find(s => s.id === selectedId);
    if (!session || session.sessionState === 'closed') return;
    setBusy(true);
    try {
      await initiateTakeover(selectedId);
      addToast('Conversation taken over — AI responses are paused', 'success');
      await refreshSessions();
      await refreshThread(selectedId);
    } catch (err: any) {
      addToast(err.message || 'Takeover failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRelease = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      await releaseTakeover(selectedId);
      addToast('Control released — AI is handling this session again', 'info');
      await refreshSessions();
      await refreshThread(selectedId);
    } catch (err: any) {
      addToast(err.message || 'Release failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!selectedId || !content || sending) return;
    setSending(true);
    try {
      const sent = await sendAgentMessage(selectedId, content);
      setMessages(prev => [...prev, {
        id: sent.id,
        conversationId: sent.conversationId,
        tenantId: '',
        role: sent.role,
        content: sent.content,
        sequenceNumber: sent.sequenceNumber,
        createdAt: sent.createdAt,
        sender: 'agent',
      }]);
      setDraft('');
      refreshSessions();
    } catch (err: any) {
      addToast(err.message || 'Message failed to send', 'error');
    } finally {
      setSending(false);
    }
  };

  const selected = sessions.find(s => s.id === selectedId) || null;

  const visibleSessions = sessions.filter(s => {
    if (filter === 'needs') return s.needsTakeover;
    if (filter === 'active') return s.sessionState === 'human_takeover';
    return true;
  });

  const needsCount = sessions.filter(s => s.needsTakeover).length;
  const activeCount = sessions.filter(s => s.sessionState === 'human_takeover').length;

  const handleNavigate = (item: SidebarItem) => {
    if (item.href) navigate(item.href);
  };

  const isTakenOver = selected?.sessionState === 'human_takeover';
  const inputDisabled = !selected || selected.sessionState === 'closed';

  return (
    <AppLayout sidebarItems={NAV_ITEMS} onNavigate={handleNavigate} workspaceName="Conversation Engine" className="p-0">
      <div className="flex h-[calc(100vh-4rem)] min-h-[480px]">
        {/* ─── Session list ─────────────────────────────────────── */}
        <aside className="w-80 shrink-0 border-r border-[var(--color-neutral-200)] bg-white flex flex-col min-w-0">
          <div className="p-4 border-b border-[var(--color-neutral-200)]">
            <h1 className="text-lg font-bold text-[var(--color-neutral-900)]">Agent Inbox</h1>
            <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">Live sessions · refreshes every 3s</p>
            <div className="flex gap-1 mt-3">
              {FILTERS.map(f => {
                const count = f.id === 'all' ? sessions.length : f.id === 'needs' ? needsCount : activeCount;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`flex-1 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors ${
                      filter === f.id
                        ? 'bg-[var(--color-accent-600)] text-white'
                        : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-200)]'
                    }`}
                  >
                    {f.label}
                    <span className="ml-1 opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="card" />)}
              </div>
            ) : visibleSessions.length === 0 ? (
              <EmptyState
                title={filter === 'all' ? 'No active sessions' : 'No sessions match this filter'}
                description={filter === 'all' ? 'Visitor conversations will appear here as soon as they start chatting.' : 'Try switching filters or check back shortly.'}
              />
            ) : (
              <ul className="divide-y divide-[var(--color-neutral-100)]">
                {visibleSessions.map(session => (
                  <li key={session.id}>
                    <button
                      onClick={() => selectSession(session)}
                      className={`w-full text-left px-4 py-3 transition-colors hover:bg-[var(--color-neutral-50)] ${
                        selectedId === session.id ? 'bg-[var(--color-accent-100)]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[var(--color-neutral-900)] truncate">
                          {displayName(session)}
                        </span>
                        <span className="text-[10px] text-[var(--color-neutral-400)] shrink-0">{relativeTime(session.lastActivityAt)}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--color-neutral-500)] font-mono truncate">
                        {session.visitorEmail || session.sessionId.slice(0, 8) + '…'}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        {session.leadScore != null && (
                          <Badge variant={session.leadScore >= LEAD_SCORE_HIGH ? 'success' : 'neutral'} size="sm">
                            Score {session.leadScore}
                          </Badge>
                        )}
                        {session.qualificationStatus === 'sales_qualified' && (
                          <Badge variant="primary" size="sm">Sales Qualified</Badge>
                        )}
                        {session.pendingHandoff && <Badge variant="warning" size="sm">Help Requested</Badge>}
                        <Badge variant={session.sessionState === 'human_takeover' ? 'danger' : 'neutral'} size="sm">
                          {stateLabel(session.sessionState)}
                        </Badge>
                      </div>
                      {session.lastMessage && (
                        <p className="mt-1.5 text-xs text-[var(--color-neutral-400)] truncate">{session.lastMessage}</p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* ─── Chat area ────────────────────────────────────────── */}
        <section className="flex-1 flex flex-col min-w-0 bg-[var(--color-neutral-0)]">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                title="Select a session"
                description="Choose a conversation from the list to view its thread and take over the conversation."
              />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-5 py-4 border-b border-[var(--color-neutral-200)] bg-white flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={displayName(selected)} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-[var(--color-neutral-900)] truncate">{displayName(selected)}</h2>
                      <Badge variant={isTakenOver ? 'danger' : 'neutral'} size="sm" dot>
                        {stateLabel(selected.sessionState)}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--color-neutral-500)] truncate">
                      {selected.visitorEmail || 'No email captured'} · {selected.sessionId}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {selected.leadScore != null && (
                    <Badge variant={selected.leadScore >= LEAD_SCORE_HIGH ? 'success' : 'neutral'} size="sm">
                      Lead score {selected.leadScore}/100
                    </Badge>
                  )}
                  {selected.qualificationStatus && (
                    <Badge variant="primary" size="sm">{selected.qualificationStatus.replace(/_/g, ' ')}</Badge>
                  )}
                  {isTakenOver ? (
                    <Button variant="secondary" size="sm" loading={busy} onClick={handleRelease}>Release to AI</Button>
                  ) : (
                    <Button variant="primary" size="sm" loading={busy} onClick={handleTakeover} disabled={selected.sessionState === 'closed'}>
                      Take Over Conversation
                    </Button>
                  )}
                </div>
              </div>

              {pollError && (
                <div className="px-5 py-2 bg-[var(--color-error-100)] border-b border-[var(--color-error-200)] text-xs text-[var(--color-error-700)]">
                  Live refresh failed: {pollError}
                </div>
              )}

              {/* Thread */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {threadLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="card" />)}
                  </div>
                ) : messages.length === 0 ? (
                  <EmptyState title="No messages yet" description="This session has not exchanged any messages yet." />
                ) : (
                  messages.map(m => {
                    const isAgent = m.sender === 'agent';
                    const isUser = m.role === 'user';
                    return (
                      <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                            isUser
                              ? 'bg-[var(--color-accent-600)] text-white rounded-br-md'
                              : isAgent
                                ? 'bg-[var(--color-accent-200)] text-[var(--color-neutral-900)] rounded-bl-md border border-[var(--color-accent-300)]'
                                : 'bg-white border border-[var(--color-neutral-200)] text-[var(--color-neutral-800)] rounded-bl-md'
                          }`}
                        >
                          {!isUser && (
                            <div className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${isAgent ? 'text-[var(--color-accent-600)]' : 'text-[var(--color-neutral-400)]'}`}>
                              {isAgent ? 'Agent' : 'AI Assistant'}
                            </div>
                          )}
                          {m.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={threadEndRef} />
              </div>

              {/* Composer */}
              <div className="px-5 py-3 border-t border-[var(--color-neutral-200)] bg-white">
                {!isTakenOver && selected.sessionState !== 'closed' && (
                  <p className="text-[11px] text-[var(--color-neutral-400)] mb-2">
                    Take over the conversation to reply to the visitor directly.
                  </p>
                )}
                <div className="flex items-end gap-2">
                  <textarea
                    className="flex-1 resize-none rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-3 py-2.5 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)] focus:border-transparent"
                    rows={2}
                    placeholder={isTakenOver ? 'Type your reply…' : 'Take over to reply…'}
                    value={draft}
                    disabled={inputDisabled}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (isTakenOver) handleSend();
                      }
                    }}
                  />
                  <Button
                    size="md"
                    loading={sending}
                    disabled={inputDisabled || !isTakenOver || !draft.trim()}
                    onClick={handleSend}
                  >
                    Send Message
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
