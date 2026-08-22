import { useState, useEffect, useCallback } from 'react';
import { cn } from '../../../utils/cn';
import {
  Inbox, MessageSquare, CreditCard, Send, CheckCircle, XCircle,
  Clock, Mail, ChevronDown, ExternalLink, Loader2, X, User,
} from 'lucide-react';

type InboxTab = 'tickets' | 'chatbot' | 'payments';

interface SupportTicket {
  id: string; tenant_id: string | null; user_email: string; user_name: string;
  subject: string; source: string; status: string; created_at: string; updated_at: string;
}

interface SupportMessage {
  id: string; ticket_id: string; sender_type: string; sender_email: string;
  content: string; attachment_url: string | null; created_at: string;
}

interface ChatbotConversation {
  id: string; session_id: string; tenant_id: string; tenant_name: string;
  started_at: string; message_count: number; status: string;
  last_message: string; last_message_at: string;
}

interface ChatMessage {
  id: string; role: string; content: string; sender: string | null; created_at: string;
}

interface PaymentConfirmation {
  id: string; tenant_id: string; user_email: string; requested_plan: string;
  billing_period: string; amount: string; currency: string; wallet_account: string;
  screenshot_url: string | null; status: string; owner_notes: string;
  created_at: string; updated_at: string;
}

function ownerFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('owner_token');
  return fetch(`/api/support${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  }).then(async (res) => {
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || `Failed (${res.status})`); }
    return res.json();
  });
}

export default function OwnerInbox() {
  const [tab, setTab] = useState<InboxTab>('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [chatConvs, setChatConvs] = useState<ChatbotConversation[]>([]);
  const [payments, setPayments] = useState<PaymentConfirmation[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const [selectedConv, setSelectedConv] = useState<ChatbotConversation | null>(null);
  const [convMessages, setConvMessages] = useState<ChatMessage[]>([]);
  const [convReply, setConvReply] = useState('');
  const [sendingConvReply, setSendingConvReply] = useState(false);

  const [selectedPayment, setSelectedPayment] = useState<PaymentConfirmation | null>(null);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketsRes, chatRes, paymentsRes] = await Promise.allSettled([
        ownerFetch<{ tickets: SupportTicket[] }>('/tickets'),
        ownerFetch<{ conversations: ChatbotConversation[] }>('/chatbot-conversations?limit=50'),
        ownerFetch<{ payments: PaymentConfirmation[] }>('/payments'),
      ]);
      if (ticketsRes.status === 'fulfilled') setTickets(ticketsRes.value.tickets || []);
      if (chatRes.status === 'fulfilled') setChatConvs(chatRes.value.conversations || []);
      if (paymentsRes.status === 'fulfilled') setPayments(paymentsRes.value.payments || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  const openTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setSelectedConv(null);
    try {
      const res = await ownerFetch<{ messages: SupportMessage[] }>(`/tickets/${ticket.id}`);
      setTicketMessages(res.messages || []);
    } catch { /* ignore */ }
  };

  const sendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;
    setSending(true);
    try {
      await ownerFetch(`/tickets/${selectedTicket.id}/messages`, {
        method: 'POST', body: JSON.stringify({ content: newMessage.trim() }),
      });
      setNewMessage('');
      const res = await ownerFetch<{ messages: SupportMessage[] }>(`/tickets/${selectedTicket.id}`);
      setTicketMessages(res.messages || []);
      await loadInbox();
    } catch { /* ignore */ } finally { setSending(false); }
  };

  const closeTicket = async (id: string) => {
    await ownerFetch(`/tickets/${id}/close`, { method: 'POST' });
    await loadInbox();
    if (selectedTicket?.id === id) setSelectedTicket(null);
  };

  const openConversation = async (conv: ChatbotConversation) => {
    setSelectedConv(conv);
    setSelectedTicket(null);
    setSelectedPayment(null);
    try {
      const res = await ownerFetch<{ messages: ChatMessage[] }>(`/chatbot-conversations/${conv.id}/messages`);
      setConvMessages(res.messages || []);
    } catch { /* ignore */ }
  };

  const sendConvReply = async () => {
    if (!selectedConv || !convReply.trim()) return;
    setSendingConvReply(true);
    try {
      await ownerFetch(`/chatbot-conversations/${selectedConv.id}/reply`, {
        method: 'POST', body: JSON.stringify({ content: convReply.trim() }),
      });
      setConvReply('');
      const res = await ownerFetch<{ messages: ChatMessage[] }>(`/chatbot-conversations/${selectedConv.id}/messages`);
      setConvMessages(res.messages || []);
    } catch { /* ignore */ } finally { setSendingConvReply(false); }
  };

  const approvePayment = async (id: string) => {
    await ownerFetch(`/payments/${id}/approve`, { method: 'POST', body: JSON.stringify({ notes: 'Approved via inbox' }) });
    await loadInbox();
    setSelectedPayment(null);
  };

  const rejectPayment = async (id: string) => {
    await ownerFetch(`/payments/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason: 'Rejected' }) });
    await loadInbox();
    setSelectedPayment(null);
  };

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleString() : '—';
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const pendingPayments = payments.filter(p => p.status === 'pending').length;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-2xl border border-hairline bg-surface">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r border-hairline overflow-y-auto">
        <div className="p-4">
          <h2 className="font-display text-sm font-bold tracking-tight mb-3 flex items-center gap-2">
            <Inbox className="size-4 text-warning-300" /> Inbox
          </h2>
          <div className="space-y-1">
            {([
              { key: 'tickets' as InboxTab, label: 'Support Tickets', icon: <MessageSquare className="size-3.5" />, badge: openTickets },
              { key: 'chatbot' as InboxTab, label: 'Chatbot Conversations', icon: <Mail className="size-3.5" />, badge: null },
              { key: 'payments' as InboxTab, label: 'Payments', icon: <CreditCard className="size-3.5" />, badge: pendingPayments },
            ]).map(item => (
              <button
                key={item.key}
                onClick={() => { setTab(item.key); setSelectedTicket(null); setSelectedConv(null); }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition',
                   tab === item.key ? 'bg-surface-2 text-foreground' : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
                )}
              >
                {item.icon}
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge !== null && item.badge > 0 && (
                  <span className="rounded-full bg-warning-300/20 px-1.5 py-0.5 text-[10px] font-bold text-warning-300">{item.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="border-t border-hairline">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
          ) : tab === 'tickets' ? (
            tickets.length === 0 ? <p className="p-4 text-xs text-muted-foreground text-center">No tickets</p> :
            tickets.map(t => (
              <button key={t.id} onClick={() => openTicket(t)} className={cn('w-full border-b border-hairline px-4 py-3 text-left transition hover:bg-surface-2', selectedTicket?.id === t.id && 'bg-surface-2')}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate max-w-[140px]">{t.user_email}</span>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', t.status === 'open' ? 'bg-warning-300/20 text-warning-300' : t.status === 'replied' ? 'bg-info-300/20 text-info-300' : 'bg-surface-2 text-muted-foreground')}>{t.status}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{t.subject}</p>
                <p className="text-[9px] text-muted-foreground/60 mt-0.5">{fmtDate(t.updated_at)}</p>
              </button>
            ))
          ) : tab === 'chatbot' ? (
            chatConvs.length === 0 ? <p className="p-4 text-xs text-muted-foreground text-center">No conversations</p> :
            chatConvs.map(c => (
              <button key={c.id} onClick={() => openConversation(c)} className={cn('w-full border-b border-hairline px-4 py-3 text-left transition hover:bg-surface-2', selectedConv?.id === c.id && 'bg-surface-2')}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate max-w-[140px]">{c.tenant_name || c.session_id.slice(0, 8)}</span>
                  <span className="text-[9px] text-muted-foreground">{c.message_count} msgs</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{c.last_message || 'No messages yet'}</p>
                <p className="text-[9px] text-muted-foreground/60 mt-0.5">{fmtDate(c.last_message_at)}</p>
              </button>
            ))
          ) : (
            payments.length === 0 ? <p className="p-4 text-xs text-muted-foreground text-center">No payments</p> :
            payments.map(p => (
              <button key={p.id} onClick={() => { setSelectedPayment(p); setSelectedTicket(null); setSelectedConv(null); }} className={cn('w-full border-b border-hairline px-4 py-3 text-left transition hover:bg-surface-2', selectedPayment?.id === p.id && 'bg-surface-2')}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate max-w-[140px]">{p.user_email}</span>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', p.status === 'pending' ? 'bg-warning-300/20 text-warning-300' : p.status === 'approved' ? 'bg-success-300/20 text-success-300' : 'bg-error-300/20 text-error-300')}>{p.status}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{p.requested_plan} plan &middot; {p.amount} {p.currency}</p>
                <p className="text-[9px] text-muted-foreground/60 mt-0.5">{fmtDate(p.created_at)}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {!selectedTicket && !selectedConv && !selectedPayment ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Inbox className="mx-auto mb-3 size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Select a conversation from the sidebar</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                {tab === 'tickets' && 'View support tickets from dashboard users'}
                {tab === 'chatbot' && 'Read chatbot conversations from the landing page'}
                {tab === 'payments' && 'Review payment confirmations and activate plans'}
              </p>
            </div>
          </div>
        ) : selectedPayment ? (
          <div className="flex h-full flex-col">
            <div className="border-b border-hairline px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold">Payment from {selectedPayment.user_email}</h3>
                  <p className="text-xs text-muted-foreground">{selectedPayment.requested_plan} plan &middot; {selectedPayment.amount} {selectedPayment.currency} &middot; {selectedPayment.billing_period}</p>
                </div>
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold uppercase', selectedPayment.status === 'pending' ? 'bg-warning-300/20 text-warning-300' : selectedPayment.status === 'approved' ? 'bg-success-300/20 text-success-300' : 'bg-error-300/20 text-error-300')}>{selectedPayment.status}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-hairline bg-surface-2 p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bank Account</p>
                  <p className="font-mono text-lg font-bold">{selectedPayment.wallet_account}</p>
                </div>
                <div className="rounded-xl border border-hairline bg-surface-2 p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Submitted</p>
                  <p className="text-sm">{fmtDate(selectedPayment.created_at)}</p>
                </div>
              </div>

              {selectedPayment.screenshot_url ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Screenshot</p>
                  <div className="rounded-xl border border-hairline overflow-hidden">
                    <img src={selectedPayment.screenshot_url} alt="Payment screenshot" className="w-full max-h-[500px] object-contain bg-black/20" />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-hairline bg-surface-2 p-6 text-center">
                  <p className="text-sm text-muted-foreground">No screenshot uploaded</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">The user hasn't uploaded a payment screenshot yet.</p>
                </div>
              )}

              {selectedPayment.status === 'pending' && (
                <div className="flex gap-3">
                  <button onClick={() => approvePayment(selectedPayment.id)} className="flex items-center gap-2 rounded-xl bg-success-300/20 px-5 py-2.5 text-sm font-semibold text-success-300 hover:bg-success-300/30 transition">
                    <CheckCircle className="size-4" /> Approve & Activate Plan
                  </button>
                  <button onClick={() => rejectPayment(selectedPayment.id)} className="flex items-center gap-2 rounded-xl bg-error-300/20 px-5 py-2.5 text-sm font-semibold text-error-300 hover:bg-error-300/30 transition">
                    <XCircle className="size-4" /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : selectedTicket ? (
          <div className="flex h-full flex-col">
            <div className="border-b border-hairline px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold">{selectedTicket.subject}</h3>
                  <p className="text-xs text-muted-foreground">{selectedTicket.user_email} &middot; {fmtDate(selectedTicket.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <a href={`mailto:${selectedTicket.user_email}`} className="flex items-center gap-1 rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface transition">
                    <Mail className="size-3" /> Email
                  </a>
                  <button onClick={() => closeTicket(selectedTicket.id)} className="flex items-center gap-1 rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface transition">
                    <XCircle className="size-3" /> Close
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {ticketMessages.map(m => (
                <div key={m.id} className={cn('max-w-[80%] rounded-2xl px-4 py-3', m.sender_type === 'owner' ? 'ml-auto bg-primary/10 border border-primary/20' : 'bg-surface-2 border border-hairline')}>
                  <p className="text-xs font-medium mb-1">{m.sender_type === 'owner' ? 'You' : m.sender_email}</p>
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  <p className="text-[9px] text-muted-foreground/60 mt-1">{fmtDate(m.created_at)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-hairline px-6 py-3">
              <div className="flex gap-2">
                <input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a reply..."
                  className="flex-1 rounded-xl border border-hairline bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button onClick={sendMessage} disabled={sending || !newMessage.trim()} className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition disabled:opacity-50">
                  {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Send
                </button>
              </div>
            </div>
          </div>
        ) : selectedConv ? (
          <div className="flex h-full flex-col">
            <div className="border-b border-hairline px-6 py-4">
              <h3 className="text-sm font-bold">{selectedConv.tenant_name || 'Chatbot'}</h3>
              <p className="text-xs text-muted-foreground">Session: {selectedConv.session_id.slice(0, 12)}... &middot; {selectedConv.message_count} messages</p>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {convMessages.map(m => (
                <div key={m.id} className={cn('max-w-[80%] rounded-2xl px-4 py-3', m.role === 'user' ? 'bg-surface-2 border border-hairline' : m.sender === 'agent' ? 'ml-auto bg-warning-300/10 border border-warning-300/20' : 'ml-auto bg-primary/10 border border-primary/20')}>
                  <p className="text-xs font-medium mb-1">{m.role === 'user' ? 'Visitor' : m.sender === 'agent' ? 'Agent (Human)' : 'AI Bot'}</p>
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  <p className="text-[9px] text-muted-foreground/60 mt-1">{fmtDate(m.created_at)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-hairline px-6 py-3">
              <div className="flex gap-2">
                <input
                  value={convReply}
                  onChange={e => setConvReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendConvReply()}
                  placeholder="Reply as human agent..."
                  className="flex-1 rounded-xl border border-hairline bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button onClick={sendConvReply} disabled={sendingConvReply || !convReply.trim()} className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition disabled:opacity-50">
                  {sendingConvReply ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Send
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
