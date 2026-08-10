import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/dashboard';
import { PageHead, DashButton, Panel, StatCard, EmptyState } from '../../../components/dash/ui';
import { useAuth } from '../../../lib/auth-context';
import { fetchWithAuth } from '../../../lib/api-client';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../utils/cn';
import { AlertTriangle, BookOpen, BookPlus, CheckCircle2, ChevronLeft, ChevronRight, Clock, FileText, Globe, HelpCircle, RefreshCw, Search, Sparkles, Trash2, Upload } from 'lucide-react';
import { WebsiteScannerModal } from '../../../components/dashboard/knowledge/WebsiteScannerModal';
import { KbGapConvertModal } from '../../../components/dashboard/knowledge/KbGapConvertModal';
import type { WebsiteScan, UnansweredGap } from '../../../components/dashboard/knowledge/types';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Conversations', href: '/dashboard/conversations' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Knowledge', href: '/dashboard/knowledge' },
  { label: 'Widget', href: '/dashboard/widget' },
  { label: 'Billing', href: '/dashboard/billing' },
  { label: 'Onboarding', href: '/dashboard/onboarding' },
];

interface KnowledgeDoc {
  documentId: string; tenantId: string; originalName: string; sourceType: string;
  title: string; status: string; error: string | null; chunkCount: number;
  contentHash: string; version: number; createdAt: string; updatedAt: string;
}

interface MonitoringStats {
  totalDocuments: number; totalChunks: number; indexedDocuments: number;
  failedDocuments: number; queuedDocuments: number; processingDocuments: number; embeddingProgress: number;
}

type FilterTab = 'all' | 'published' | 'processing' | 'failed';

const SCAN_COUNTS: { key: keyof Pick<WebsiteScan, 'pagesDiscovered' | 'pagesScanned' | 'pagesIndexed' | 'pagesAdded' | 'pagesUpdated' | 'pagesUnchanged' | 'pagesDeleted'>; label: string; accent?: boolean }[] = [
  { key: 'pagesDiscovered', label: 'Discovered' },
  { key: 'pagesScanned', label: 'Scanned' },
  { key: 'pagesIndexed', label: 'Indexed', accent: true },
  { key: 'pagesAdded', label: 'Added', accent: true },
  { key: 'pagesUpdated', label: 'Updated' },
  { key: 'pagesUnchanged', label: 'Unchanged' },
  { key: 'pagesDeleted', label: 'Deleted' },
];

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr); const now = new Date(); const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today'; if (days === 1) return 'Yesterday'; if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWhen(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function StatusChip({ label, chipClass, dotClass }: { label: string; chipClass: string; dotClass: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', chipClass)}>
      <span className={cn('size-2 rounded-full', dotClass)} />
      {label}
    </span>
  );
}

function docStatusStyle(status: string): { chipClass: string; dotClass: string } {
  if (status === 'failed') return { chipClass: 'bg-error-300/25 text-foreground', dotClass: 'bg-error-500' };
  if (status === 'published') return { chipClass: 'bg-ember-soft text-foreground', dotClass: 'bg-success' };
  return { chipClass: 'bg-warning-300/25 text-foreground', dotClass: 'bg-warning-500' };
}

function scanStatusStyle(status: WebsiteScan['status']) {
  switch (status) {
    case 'failed': return { chipClass: 'bg-error-300/25 text-foreground', dotClass: 'bg-error-500' };
    case 'completed': return { chipClass: 'bg-ember-soft text-foreground', dotClass: 'bg-success' };
    default: return { chipClass: 'bg-warning-300/25 text-foreground', dotClass: 'bg-warning-500' };
  }
}

export default function KnowledgeDashboard() {
  const navigate = useNavigate(); const { user, tenant, logout } = useAuth(); const { addToast } = useToast();
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]); const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); const [loading, setLoading] = useState(true);
  const [monitoring, setMonitoring] = useState<MonitoringStats | null>(null);
  const [searchQuery, setSearchQuery] = useState(''); const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [processingExpanded, setProcessingExpanded] = useState(true);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [latestScan, setLatestScan] = useState<WebsiteScan | null>(null);
  const [gaps, setGaps] = useState<UnansweredGap[]>([]);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [convertGap, setConvertGap] = useState<UnansweredGap | null>(null);
  const pageSize = 20; const workspaceName = tenant?.name || 'Conversation Engine';

  const loadDocs = useCallback(async () => {
    setLoading(true); try {
      const params = new URLSearchParams({ limit: String(pageSize), offset: String(page * pageSize) });
      if (searchQuery) params.set('q', searchQuery); if (activeFilter !== 'all') params.set('status', activeFilter);
      const res = await fetchWithAuth(`/api/admin/knowledge/documents?${params}`); const data = await res.json();
      setDocs(data.documents || []); setTotal(data.total || 0);
    } catch { addToast('Failed to load documents', 'error'); } finally { setLoading(false); }
  }, [page, searchQuery, activeFilter, addToast]);

  const loadMonitoring = useCallback(async () => {
    try {
      const [monRes] = await Promise.all([fetchWithAuth('/api/admin/knowledge/monitoring')]);
      if (monRes.ok) setMonitoring(await monRes.json());
    } catch { /* silent */ }
  }, []);

  const loadScanStatus = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/knowledge/scan/status');
      if (!res.ok) return;
      const data = await res.json();
      setLatestScan(data.scan || null);
    } catch { /* silent */ }
  }, []);

  const loadGaps = useCallback(async () => {
    setGapsLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/unanswered?resolved=false');
      if (res.ok) setGaps(await res.json());
    } catch { /* silent */ } finally { setGapsLoading(false); }
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]); useEffect(() => { loadMonitoring(); }, [loadMonitoring]); useEffect(() => { loadScanStatus(); }, [loadScanStatus]); useEffect(() => { loadGaps(); }, [loadGaps]);

  const scanActive = latestScan?.status === 'queued' || latestScan?.status === 'crawling';

  useEffect(() => {
    if (!scanActive) return;
    const timer = setInterval(() => { loadScanStatus(); }, 5000);
    return () => clearInterval(timer);
  }, [scanActive, loadScanStatus]);

  const handleScanStarted = (scan: WebsiteScan) => {
    setLatestScan(scan);
    loadDocs();
    loadMonitoring();
  };

  const handleScheduleChange = async (schedule: WebsiteScan['schedule']) => {
    if (!latestScan) return;
    try {
      const res = await fetchWithAuth('/api/knowledge/scan/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: latestScan.rootUrl, schedule }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || 'Failed to update schedule', 'error');
        return;
      }
      setLatestScan(data.scan);
      addToast(schedule === 'manual' ? 'Auto-scan disabled' : `Auto-scan set to ${schedule}`, 'success');
    } catch {
      addToast('Failed to update schedule', 'error');
    }
  };

  useEffect(() => {
    if (latestScan?.status === 'completed') {
      loadDocs();
      loadMonitoring();
    }
  }, [latestScan?.status, loadDocs, loadMonitoring]);

  const handleRefresh = useCallback(() => { loadDocs(); loadMonitoring(); loadScanStatus(); loadGaps(); }, [loadDocs, loadMonitoring, loadScanStatus, loadGaps]);

  const handleDelete = async (documentId: string) => {
    try { await fetchWithAuth(`/api/admin/knowledge/documents/${documentId}`, { method: 'DELETE' }); addToast('Document deleted', 'success'); loadDocs(); loadMonitoring(); }
    catch { addToast('Failed to delete document', 'error'); }
  };

  const handleRetry = async (documentId: string) => {
    try {
      await fetchWithAuth(`/api/admin/knowledge/documents/${documentId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'queued' }) });
      addToast('Queued for retry', 'success'); loadDocs();
    } catch { addToast('Failed to retry', 'error'); }
  };

  const toggleSelectAll = () => { setSelectedDocs(prev => prev.size === docs.length ? new Set() : new Set(docs.map(d => d.documentId))); };
  const toggleSelectDoc = (id: string) => { setSelectedDocs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedDocs);
    try { await Promise.all(ids.map(id => fetchWithAuth(`/api/admin/knowledge/documents/${id}`, { method: 'DELETE' }))); addToast(`${ids.length} deleted`, 'success'); setSelectedDocs(new Set()); loadDocs(); loadMonitoring(); }
    catch { addToast('Failed to delete some documents', 'error'); }
  };

  const filteredDocs = useMemo(() => docs.filter(d => {
    if (activeFilter === 'all') return true; if (activeFilter === 'published') return d.status === 'published';
    if (activeFilter === 'processing') return ['queued', 'processing', 'parsing', 'embedding'].includes(d.status);
    if (activeFilter === 'failed') return d.status === 'failed'; return true;
  }), [docs, activeFilter]);

  const processingDocs = useMemo(() => docs.filter(d => ['queued', 'processing', 'parsing', 'embedding'].includes(d.status)), [docs]);

  // Group unresolved gaps by normalized question text so repeated queries show
  // a frequency count instead of one row per conversation.
  const gapGroups = useMemo(() => {
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    const groups = new Map<string, UnansweredGap[]>();
    for (const g of gaps) {
      const key = norm(g.question) || g.id;
      const arr = groups.get(key) || [];
      arr.push(g);
      groups.set(key, arr);
    }
    return Array.from(groups.values())
      .map(items => ({
        key: items[0].id,
        question: items[0].question,
        count: items.length,
        lastAsked: items.reduce((max, g) => (g.createdAt > max ? g.createdAt : max), items[0].createdAt),
        id: items[0].id,
      }))
      .sort((a, b) => (a.lastAsked < b.lastAsked ? 1 : -1));
  }, [gaps]);

  const websiteCount = docs.filter(d => d.sourceType === 'website').length;
  const processingCount = (monitoring?.processingDocuments || 0) + (monitoring?.queuedDocuments || 0);
  const totalPages = Math.ceil(total / pageSize);

  const scanProgress = latestScan && latestScan.pagesDiscovered > 0
    ? Math.round((latestScan.pagesScanned / latestScan.pagesDiscovered) * 100)
    : 0;

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'published', label: 'Published' },
    { key: 'processing', label: 'Processing' }, { key: 'failed', label: 'Failed' },
  ];

  if (loading && !monitoring) {
    return (
      <DashboardLayout sidebarItems={NAV_ITEMS} onNavigate={(item) => item.href && navigate(item.href)} workspaceName={workspaceName} userName={user?.name} userEmail={user?.email} onLogout={logout} onSettings={() => navigate('/dashboard/settings')}>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-36 animate-pulse rounded-2xl border border-hairline bg-surface" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-3xl border border-hairline bg-surface" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarItems={NAV_ITEMS} onNavigate={(item) => item.href && navigate(item.href)} workspaceName={workspaceName} userName={user?.name} userEmail={user?.email} onLogout={logout} onSettings={() => navigate('/dashboard/settings')}>
      <div className="space-y-6">
        <PageHead
          title="Knowledge base"
          sub="Manage the documents and sources your chatbot learns from to answer customer questions."
          actions={
            <>
              <DashButton variant="ghost" onClick={handleRefresh}>
                <RefreshCw className="size-4" /> Refresh
              </DashButton>
              <DashButton variant="ghost" onClick={() => setScanModalOpen(true)}>
                <Globe className="size-4" /> Scan website
              </DashButton>
              <DashButton onClick={() => navigate('/dashboard/onboarding')}>
                <Upload className="size-4" /> Add documents
              </DashButton>
            </>
          }
        />

        {/* Website scan status */}
        {latestScan && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel className="lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ember-soft text-primary">
                    <Globe className={cn('size-4', scanActive && 'animate-pulse')} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{latestScan.rootUrl}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {scanActive ? `Started ${formatWhen(latestScan.startedAt)}` : `Finished ${formatWhen(latestScan.completedAt)}`}
                      {latestScan.schedule !== 'manual' && <span>· Auto {latestScan.schedule}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip label={latestScan.status} {...scanStatusStyle(latestScan.status)} />
                  <select
                    value={latestScan.schedule}
                    onChange={(e) => handleScheduleChange(e.target.value as WebsiteScan['schedule'])}
                    className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs text-foreground outline-none transition focus:border-primary/40"
                    aria-label="Scan schedule"
                  >
                    <option value="manual">Manual</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                  <button
                    onClick={loadScanStatus}
                    className="grid size-8 place-items-center rounded-full border border-hairline bg-surface text-muted-foreground transition hover:text-foreground"
                    aria-label="Refresh scan status"
                  >
                    <RefreshCw className={cn('size-3.5', scanActive && 'animate-spin')} />
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Crawl progress</span>
                  <span className="text-xs font-semibold tabular-nums">{scanProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={scanProgress} aria-valuemin={0} aria-valuemax={100}>
                  <div className={cn('h-full rounded-full transition-all duration-500', scanActive ? 'bg-primary animate-pulse' : 'bg-success')} style={{ width: `${Math.min(scanProgress, 100)}%` }} />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {SCAN_COUNTS.map(item => (
                  <div key={item.key} className="rounded-xl border border-hairline bg-surface-2/60 px-2 py-2 text-center">
                    <p className={cn('text-sm font-bold tabular-nums', item.accent ? 'text-primary' : 'text-foreground')}>{latestScan[item.key]}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>

              {latestScan.lastError && (
                <p className="mt-4 rounded-xl border border-error-300/25 bg-error-300/25 px-3 py-2 text-xs text-foreground">
                  {latestScan.lastError}
                </p>
              )}
            </Panel>

            {latestScan.brandTone && (
              <Panel>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ember-soft text-primary">
                    <Sparkles className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Brand Intelligence</p>
                    <p className="text-xs text-muted-foreground">Detected from the latest website scan</p>
                  </div>
                </div>
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Brand tone</span>
                    <span className="rounded-full bg-ember-soft px-3 py-1 text-xs font-semibold text-foreground">{latestScan.brandTone}</span>
                  </div>
                  {latestScan.primaryCtas.length > 0 && (
                    <div className="flex items-start justify-between gap-4">
                      <span className="pt-1 text-xs uppercase tracking-wider text-muted-foreground">Primary CTAs</span>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {latestScan.primaryCtas.map(cta => (
                          <span key={cta} className="rounded-full border border-hairline bg-surface-2/60 px-2.5 py-1 text-xs">{cta}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {typeof latestScan.confidenceScore === 'number' && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">Confidence</span>
                        <span className="text-xs font-semibold tabular-nums">{Math.round(latestScan.confidenceScore * 100)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(Math.round(latestScan.confidenceScore * 100), 100)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </Panel>
            )}
          </div>
        )}

        {/* Key metrics */}
        {monitoring && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<CheckCircle2 className="size-4" />}
              label="Indexed documents"
              value={String(monitoring.indexedDocuments)}
              hint={`${Math.round((monitoring.indexedDocuments / Math.max(monitoring.totalDocuments, 1)) * 100)}% of all documents`}
            />
            <StatCard
              icon={<FileText className="size-4" />}
              label="Total documents"
              value={String(monitoring.totalDocuments)}
              hint={`${websiteCount} from website crawls`}
            />
            <StatCard
              icon={<AlertTriangle className="size-4" />}
              label="Failed documents"
              value={String(monitoring.failedDocuments)}
              hint={`${processingCount} still in queue`}
            />
            <StatCard
              icon={<BookOpen className="size-4" />}
              label="Knowledge chunks"
              value={String(monitoring.totalChunks)}
              hint="Chunks indexed for retrieval"
            />
          </div>
        )}

        {/* Unanswered questions / KB gaps */}
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-warning-300/25 text-warning-500">
                <HelpCircle className="size-4" />
              </span>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Unanswered questions</h2>
                <p className="text-xs text-muted-foreground">
                  Visitor queries your chatbot couldn't answer from the knowledge base
                </p>
              </div>
            </div>
            {gapGroups.length > 0 && (
              <span className="rounded-full bg-warning-300/25 px-3 py-1 text-xs font-semibold text-foreground">
                {gapGroups.length} gap{gapGroups.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="mt-5 space-y-2">
            {gapsLoading ? (
              [0, 1, 2].map(i => (
                <div key={i} className="h-16 animate-pulse rounded-xl border border-hairline bg-surface-2/60" />
              ))
            ) : gapGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-hairline px-4 py-8 text-center">
                <HelpCircle className="mx-auto size-5 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">No unanswered questions</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Gaps appear here when the chatbot can't answer a visitor's question from your knowledge base.
                </p>
              </div>
            ) : (
              gapGroups.map(group => (
                <div key={group.key} className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-2/60 p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warning-300/25 text-warning-500">
                    <HelpCircle className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{group.question}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      asked {group.count} {group.count === 1 ? 'time' : 'times'} · last {formatWhen(group.lastAsked)}
                    </p>
                  </div>
                  <DashButton onClick={() => setConvertGap(gaps.find(g => g.id === group.id) || null)}>
                    <BookPlus className="size-4" /> Add to KB
                  </DashButton>
                </div>
              ))
            )}
          </div>
        </Panel>

        {/* Empty state */}
        {!loading && monitoring && monitoring.totalDocuments === 0 && (
          <EmptyState
            icon={<FileText className="size-6" />}
            title="Upload your first document"
            body="Add PDFs, text files, or connect a website. Your chatbot learns from these to answer customer questions accurately."
            actions={
              <>
                <DashButton onClick={() => navigate('/dashboard/onboarding')}>
                  <Upload className="size-4" /> Add documents
                </DashButton>
                <DashButton variant="ghost" onClick={() => setScanModalOpen(true)}>
                  <Globe className="size-4" /> Crawl a website
                </DashButton>
              </>
            }
          />
        )}

        {/* Processing queue */}
        {monitoring && processingDocs.length > 0 && (
          <Panel>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Processing queue</h2>
              <span className="rounded-full bg-ember-soft px-3 py-1 text-xs font-semibold">{processingDocs.length}</span>
            </div>
            <button
              onClick={() => setProcessingExpanded(p => !p)}
              className="mt-2 flex items-center gap-1.5 text-sm font-medium text-foreground"
              aria-expanded={processingExpanded}
            >
              <ChevronRight className={cn('size-4 text-muted-foreground transition-transform', processingExpanded && 'rotate-90')} />
              Show queue
            </button>
            {processingExpanded && (
              <div className="mt-4 space-y-2">
                {processingDocs.map(doc => {
                  const s = docStatusStyle(doc.status);
                  return (
                    <div key={doc.documentId} className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-2/60 p-3">
                      <RefreshCw className="size-4 shrink-0 animate-spin text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{doc.title || doc.originalName}</p>
                        {doc.chunkCount > 0 && <p className="mt-0.5 text-xs text-muted-foreground">{doc.chunkCount} chunks</p>}
                      </div>
                      <StatusChip label={doc.status} chipClass={s.chipClass} dotClass={s.dotClass} />
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        )}

        {/* Documents list */}
        {monitoring && monitoring.totalDocuments > 0 && (
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold tracking-tight">Documents</h2>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={selectedDocs.size === docs.length && docs.length > 0}
                    onChange={toggleSelectAll}
                    className="size-4 rounded border-hairline bg-transparent text-primary focus:ring-primary/30"
                    aria-label="Select all"
                  />
                  Select all
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                    placeholder="Search documents…"
                    className="h-9 w-full rounded-full border border-hairline bg-surface pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:shadow-glow sm:w-56"
                  />
                </div>
                <div className="flex items-center gap-1" role="tablist">
                  {FILTER_TABS.map(tab => (
                    <button
                      key={tab.key}
                      role="tab"
                      aria-selected={activeFilter === tab.key}
                      onClick={() => { setActiveFilter(tab.key); setPage(0); }}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                        activeFilter === tab.key ? 'bg-ember-soft text-foreground' : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {loading ? (
                [0, 1, 2].map(i => (
                  <div key={i} className="h-16 animate-pulse rounded-xl border border-hairline bg-surface-2/60" />
                ))
              ) : filteredDocs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No documents match your search.</p>
              ) : (
                filteredDocs.map(doc => {
                  const s = docStatusStyle(doc.status);
                  return (
                    <div key={doc.documentId} className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-2/60 p-3">
                      <input
                        type="checkbox"
                        checked={selectedDocs.has(doc.documentId)}
                        onChange={() => toggleSelectDoc(doc.documentId)}
                        className="size-4 shrink-0 rounded border-hairline bg-transparent text-primary focus:ring-primary/30"
                        aria-label={`Select ${doc.title || doc.originalName}`}
                      />
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ember-soft text-primary">
                        <FileText className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{doc.title || doc.originalName}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {doc.sourceType} · {doc.chunkCount} chunks · {formatDate(doc.updatedAt)}
                        </p>
                      </div>
                      <StatusChip label={doc.status} chipClass={s.chipClass} dotClass={s.dotClass} />
                      <div className="flex shrink-0 items-center gap-1.5">
                        {doc.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(doc.documentId)}
                            className="grid size-8 place-items-center rounded-full border border-hairline bg-surface text-muted-foreground transition hover:text-foreground"
                            aria-label="Retry"
                          >
                            <RefreshCw className="size-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(doc.documentId)}
                          className="grid size-8 place-items-center rounded-full border border-hairline bg-surface text-muted-foreground transition hover:border-error-300/40 hover:text-error-500"
                          aria-label="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between border-t border-hairline pt-4">
                <p className="text-xs text-muted-foreground">
                  {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="grid size-8 place-items-center rounded-full border border-hairline bg-surface text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="grid size-8 place-items-center rounded-full border border-hairline bg-surface text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </Panel>
        )}

        {/* Bulk action bar */}
        {selectedDocs.size > 0 && (
          <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface/95 px-5 py-3 shadow-lift backdrop-blur">
            <span className="text-sm font-medium">
              {selectedDocs.size} document{selectedDocs.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <DashButton variant="ghost" onClick={() => setSelectedDocs(new Set())}>
                Cancel
              </DashButton>
              <DashButton onClick={handleBulkDelete}>
                <Trash2 className="size-4" /> Delete selected
              </DashButton>
            </div>
          </div>
        )}
      </div>
      <WebsiteScannerModal open={scanModalOpen} onClose={() => setScanModalOpen(false)} onStarted={handleScanStarted} />
      <KbGapConvertModal
        gap={convertGap}
        onClose={() => setConvertGap(null)}
        onConverted={() => { loadGaps(); loadDocs(); loadMonitoring(); }}
      />
    </DashboardLayout>
  );
}
