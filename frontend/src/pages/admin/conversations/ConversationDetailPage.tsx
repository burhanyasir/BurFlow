import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Progress } from '../../../components/ui/Progress';
import { Tabs } from '../../../components/ui/Tabs';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { AppLayout } from '../../../layouts/AppLayout';
import { useSessionDetail, updateSessionStatus, assignSessionOwner, toggleSessionFlag, toggleSessionArchive, createSessionNote, updateSessionTags } from '../../../hooks/useConversationIntelligence';
import { personaLabel, funnelLabel, scoreToVariant, sentimentLabel, statusLabel, statusVariant, eventTypeLabel, PREDEFINED_TAG_SET } from '../../../types/conversation-intelligence';
import type { SidebarItem } from '../../../layouts/Sidebar';
import type { Note, TimelineEvent } from '../../../types/conversation-intelligence';

const NAV_ITEMS: SidebarItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Leads', href: '/dashboard/leads' },
  { label: 'Follow-ups', href: '/dashboard/followups' },
  { label: 'Conversations', href: '/dashboard/conversations', active: true },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Knowledge', href: '/dashboard/knowledge' },
  { label: 'Onboarding', href: '/dashboard/onboarding' },
];

function SectionCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'working', label: 'Working' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const OWNER_OPTIONS = [
  { value: '', label: 'Unassigned' },
  { value: 'alice', label: 'Alice Johnson' },
  { value: 'bob', label: 'Bob Smith' },
  { value: 'carol', label: 'Carol Davis' },
];

export default function ConversationDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { data, loading, reload } = useSessionDetail(sessionId ?? null);

  const [noteAuthor, setNoteAuthor] = useState('alice');
  const [noteMessage, setNoteMessage] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [localTags, setLocalTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState('');

  const handleNavigate = (item: SidebarItem) => {
    if (item.href) navigate(item.href);
  };

  useEffect(() => {
    if (data?.tags) setLocalTags(data.tags);
  }, [data?.tags]);

  const handleStatusChange = async (status: string) => {
    if (!sessionId) return;
    try {
      await updateSessionStatus(sessionId, status);
      reload();
    } catch {}
  };

  const handleOwnerAssign = async (owner: string) => {
    if (!sessionId) return;
    try {
      await assignSessionOwner(sessionId, owner);
      reload();
    } catch {}
  };

  const handleToggleFlag = async () => {
    if (!sessionId || data === null) return;
    try {
      await toggleSessionFlag(sessionId, !data.flagged);
      reload();
    } catch {}
  };

  const handleToggleArchive = async () => {
    if (!sessionId || data === null) return;
    try {
      await toggleSessionArchive(sessionId, !data.archived);
      reload();
    } catch {}
  };

  const handleAddNote = async () => {
    if (!sessionId || !noteMessage.trim()) return;
    try {
      await createSessionNote(sessionId, noteAuthor, noteMessage);
      setNoteMessage('');
      reload();
    } catch {}
  };

  const handleAddTag = async (tag: string) => {
    if (!sessionId || !tag) return;
    const next = localTags.includes(tag) ? localTags.filter(t => t !== tag) : [...localTags, tag];
    setLocalTags(next);
    try {
      await updateSessionTags(sessionId, next);
      reload();
    } catch {}
  };

  const handleAddCustomTag = async () => {
    if (!sessionId || !customTag.trim()) return;
    const tag = customTag.trim();
    if (localTags.includes(tag)) return;
    const next = [...localTags, tag];
    setLocalTags(next);
    setCustomTag('');
    try {
      await updateSessionTags(sessionId, next);
      reload();
    } catch {}
  };

  if (loading) {
    return (
      <AppLayout sidebarItems={NAV_ITEMS} onNavigate={handleNavigate} workspaceName="Conversation Engine">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-[var(--color-neutral-50)] rounded" />
          <div className="h-40 bg-[var(--color-neutral-50)] rounded" />
          <div className="h-40 bg-[var(--color-neutral-50)] rounded" />
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout sidebarItems={NAV_ITEMS} onNavigate={handleNavigate} workspaceName="Conversation Engine">
        <p className="text-sm text-[var(--color-neutral-500)] py-8 text-center">Session not found.</p>
      </AppLayout>
    );
  }

  const intel = data as any;
  const tabs = data.turns.map((turn, i) => ({
    id: `turn-${i}`,
    label: `Turn ${i + 1}`,
    content: (
      <div className="space-y-3 py-2">
        <div className="flex items-start gap-3">
          <Badge variant={turn.role === 'assistant' ? 'primary' : 'neutral'} size="sm" className="shrink-0 mt-0.5">{turn.role}</Badge>
          <p className="text-sm text-[var(--color-neutral-800)] whitespace-pre-wrap">{turn.content}</p>
        </div>
        {turn.metadata && Object.keys(turn.metadata).length > 0 && (
          <details className="text-xs text-[var(--color-neutral-500)]">
            <summary className="cursor-pointer hover:text-[var(--color-neutral-700)]">Metadata</summary>
            <pre className="mt-1 p-2 bg-[var(--color-neutral-50)] rounded overflow-x-auto">{JSON.stringify(turn.metadata, null, 2)}</pre>
          </details>
        )}
      </div>
    ),
  }));

  const timeline = (data.timeline ?? []) as TimelineEvent[];
  const notes = (data.notes ?? []) as Note[];

  return (
    <AppLayout sidebarItems={NAV_ITEMS} onNavigate={handleNavigate} workspaceName="Conversation Engine">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">Conversation Detail</h1>
            <p className="text-sm text-[var(--color-neutral-500)] mt-1">
              {sessionId?.slice(0, 8)}… · {data.turns.length} turns ·{' '}
              <Badge variant={statusVariant(data.status || 'new')} size="sm">{statusLabel(data.status || 'new')}</Badge>
              {data.flagged && <Badge variant="warning" size="sm" className="ml-2">Flagged</Badge>}
              {data.archived && <Badge variant="neutral" size="sm" className="ml-2">Archived</Badge>}
            </p>
          </div>
        </div>

        {/* Action Center */}
        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-center">
              <Select
                label="Status"
                options={STATUS_OPTIONS}
                value={data.status || 'new'}
                onChange={e => handleStatusChange(e.target.value)}
                className="w-40"
              />
              <Select
                label="Assign Owner"
                options={OWNER_OPTIONS}
                value={data.owner || ''}
                onChange={e => handleOwnerAssign(e.target.value)}
                className="w-44"
              />
              <Button size="sm" variant={data.flagged ? 'secondary' : 'ghost'} onClick={handleToggleFlag}>
                {data.flagged ? 'Unflag' : 'Flag'}
              </Button>
              <Button size="sm" variant={data.archived ? 'secondary' : 'ghost'} onClick={handleToggleArchive}>
                {data.archived ? 'Unarchive' : 'Archive'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Intelligence Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SectionCard title="Score" className="lg:col-span-1">
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-[var(--color-accent-600)]">{intel.conversationIntelligence?.score ?? '—'}/10</p>
              <p className="text-xs text-[var(--color-neutral-500)] mt-1">Conversation quality</p>
              <Progress value={(intel.conversationIntelligence?.score ?? 0) * 10} variant={scoreToVariant((intel.conversationIntelligence?.score ?? 0) * 10)} className="mt-4" />
            </div>
          </SectionCard>
          <SectionCard title="Buying Intent" className="lg:col-span-1">
            <div className="text-center py-4">
              <p className={`text-4xl font-bold ${intel.buyingIntentDetected ? 'text-[var(--color-success-600)]' : 'text-[var(--color-neutral-400)]'}`}>{intel.buyingIntentDetected ? 'Yes' : 'No'}</p>
              <p className="text-xs text-[var(--color-neutral-500)] mt-1">{data.buyingIntentReason || 'No reason provided'}</p>
            </div>
          </SectionCard>
          <SectionCard title="Funnel Stage" className="lg:col-span-1">
            <div className="text-center py-4">
              <p className="text-lg font-bold text-[var(--color-neutral-900)]">{funnelLabel(intel.funnelStage)}</p>
            </div>
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard title="Persona">
            <Badge variant="info" size="md">{personaLabel(intel.persona)}</Badge>
            <p className="text-sm text-[var(--color-neutral-500)] mt-2">{intel.conversationIntelligence?.personaReason || ''}</p>
          </SectionCard>
          <SectionCard title="Qualification">
            <Badge variant={intel.conversationIntelligence?.qualificationProgress === 'completed' ? 'success' : intel.conversationIntelligence?.qualificationProgress === 'in_progress' ? 'warning' : 'neutral'} size="md">
              {intel.conversationIntelligence?.qualificationProgress || 'not_started'}
            </Badge>
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {intel.conversationIntelligence?.topObjections?.length > 0 && (
            <SectionCard title="Objections">
              <div className="space-y-2">
                {intel.conversationIntelligence.topObjections.map((o: any, i: number) => (
                  <div key={i} className="flex justify-between p-2 rounded bg-[var(--color-neutral-50)]">
                    <span className="text-sm">{o.objection}</span>
                    <span className="text-xs text-[var(--color-neutral-500)]">{o.count}x</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
          {intel.conversationIntelligence?.sentiment && (
            <SectionCard title="Sentiment">
              <Badge variant={intel.conversationIntelligence.sentiment.polarity > 0.2 ? 'success' : intel.conversationIntelligence.sentiment.polarity < -0.2 ? 'error' : 'neutral'} size="md">
                {sentimentLabel(intel.conversationIntelligence.sentiment.polarity)}
              </Badge>
              <p className="text-xs text-[var(--color-neutral-500)] mt-1">Polarity: {intel.conversationIntelligence.sentiment.polarity.toFixed(2)}</p>
            </SectionCard>
          )}
        </div>

        {/* Tags */}
        <SectionCard title="Tags">
          <div className="flex flex-wrap gap-2 mb-3">
            {localTags.map(tag => (
              <Badge key={tag} variant="primary" size="sm" className="cursor-pointer" onClick={() => handleAddTag(tag)}>
                {tag} ✕
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <Select
              options={[
                { value: '', label: 'Add predefined tag…' },
                ...PREDEFINED_TAG_SET.map(t => ({ value: t, label: t })),
              ]}
              value={selectedTag}
              onChange={e => { setSelectedTag(e.target.value); if (e.target.value) { handleAddTag(e.target.value); setSelectedTag(''); } }}
              className="w-48"
            />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Custom tag…"
              value={customTag}
              onChange={e => setCustomTag(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddCustomTag(); }}
              className="flex-1 max-w-xs"
            />
            <Button size="sm" onClick={handleAddCustomTag} disabled={!customTag.trim()}>Add</Button>
          </div>
        </SectionCard>

        {/* Timeline */}
        {timeline.length > 0 && (
          <SectionCard title="Timeline">
            <div className="space-y-3">
              {timeline.map(e => {
                let detailText = '';
                try { const d = JSON.parse(e.details); detailText = Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(', '); } catch { detailText = e.details; }
                return (
                  <div key={e.id} className="flex items-start gap-3 text-sm">
                    <Badge variant="neutral" size="sm" className="shrink-0 mt-0.5">{eventTypeLabel(e.eventType)}</Badge>
                    <div className="min-w-0">
                      <p className="text-[var(--color-neutral-700)]">{detailText}</p>
                      <p className="text-xs text-[var(--color-neutral-400)]">{e.actor ? `${e.actor} · ` : ''}{new Date(e.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* Notes */}
        <SectionCard title="Notes">
          <div className="space-y-3 mb-4">
            {notes.length === 0 && <p className="text-sm text-[var(--color-neutral-500)]">No notes yet.</p>}
            {notes.map(n => (
              <div key={n.id} className="p-3 rounded-lg bg-[var(--color-neutral-50)] border border-[var(--color-neutral-100)]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[var(--color-neutral-700)]">{n.author}</span>
                  <span className="text-xs text-[var(--color-neutral-400)]">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-[var(--color-neutral-800)] whitespace-pre-wrap">{n.message}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-start">
            <Select
              options={OWNER_OPTIONS.filter(o => o.value)}
              value={noteAuthor}
              onChange={e => setNoteAuthor(e.target.value)}
              className="w-36 shrink-0"
            />
            <Input
              placeholder="Add a note…"
              value={noteMessage}
              onChange={e => setNoteMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(); } }}
              className="flex-1"
            />
            <Button size="sm" onClick={handleAddNote} disabled={!noteMessage.trim()}>Add Note</Button>
          </div>
        </SectionCard>

        {/* Timeline Tabs */}
        <Card>
          <CardHeader><CardTitle>Conversation Timeline</CardTitle></CardHeader>
          <CardContent>
            <Tabs tabs={tabs} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
