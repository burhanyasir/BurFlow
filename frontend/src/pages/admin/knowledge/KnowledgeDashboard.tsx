import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout, DashboardContent, DashboardSection, DashboardTable, DashboardSearch, DashboardPagination, DashboardMetricGrid, DashboardEmptyState, DashboardLoadingState, DashboardErrorState, Badge } from '../../../components/dashboard';
import type { NavItem, Column } from '../../../components/dashboard';
import { useAuth } from '../../../lib/auth-context';
import { fetchWithAuth } from '../../../lib/api-client';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../utils/cn';
import { Book, FileText, Globe, RefreshCw, Trash2, Upload, CheckCircle, XCircle, Clock, ScanSearch } from 'lucide-react';
import { WebsiteScannerModal } from '../../../components/dashboard/knowledge/WebsiteScannerModal';
import { ScanProgressCard } from '../../../components/dashboard/knowledge/ScanProgressCard';
import { BrandIntelligenceCard } from '../../../components/dashboard/knowledge/BrandIntelligenceCard';
import type { WebsiteScan } from '../../../components/dashboard/knowledge/types';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Conversations', href: '/dashboard/conversations' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Knowledge', href: '/dashboard/knowledge', active: true },
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

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  published: 'success', queued: 'warning', processing: 'info', failed: 'error', parsing: 'info', embedding: 'info',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr); const now = new Date(); const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today'; if (days === 1) return 'Yesterday'; if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  useEffect(() => { loadDocs(); }, [loadDocs]); useEffect(() => { loadMonitoring(); }, [loadMonitoring]); useEffect(() => { loadScanStatus(); }, [loadScanStatus]);

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
  const websiteCount = docs.filter(d => d.sourceType === 'website').length;
  const processingCount = (monitoring?.processingDocuments || 0) + (monitoring?.queuedDocuments || 0);
  const totalPages = Math.ceil(total / pageSize);

  const columns: Column<KnowledgeDoc>[] = useMemo(() => [
    { key: 'select', header: <input type="checkbox" checked={selectedDocs.size === docs.length && docs.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-hairline bg-transparent text-wine focus:ring-wine/30 cursor-pointer" aria-label="Select all" />, cell: (doc) => (
      <input type="checkbox" checked={selectedDocs.has(doc.documentId)} onChange={() => toggleSelectDoc(doc.documentId)} className="w-4 h-4 rounded border-hairline bg-transparent text-wine focus:ring-wine/30 cursor-pointer" aria-label={`Select ${doc.title || doc.originalName}`} onClick={(e) => e.stopPropagation()} />
    ), className: 'w-10' },
    { key: 'name', header: 'Name', sortable: true, cell: (doc) => (
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-wine/[0.12] shrink-0"><FileText className="h-4 w-4 text-wine" /></div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{doc.title || doc.originalName}</div>
          <div className="text-xs text-muted-foreground">{doc.sourceType} · {doc.chunkCount} chunks</div>
        </div>
      </div>
    )},
    { key: 'status', header: 'Status', cell: (doc) => <Badge variant={STATUS_BADGE[doc.status] || 'neutral'} size="sm" dot>{doc.status}</Badge>, className: 'hidden sm:table-cell' },
    { key: 'updated', header: 'Updated', cell: (doc) => <span className="text-xs text-muted-foreground">{formatDate(doc.updatedAt)}</span>, className: 'hidden md:table-cell' },
    { key: 'actions', header: '', cell: (doc) => (
      <div className="flex items-center gap-1 justify-end">
        {doc.status === 'failed' && (
          <button onClick={(e) => { e.stopPropagation(); handleRetry(doc.documentId); }} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition" aria-label="Retry">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.documentId); }} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/[0.06] transition" aria-label="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    ), className: 'w-20' },
  ], [selectedDocs, docs]);

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'published', label: 'Published' },
    { key: 'processing', label: 'Processing' }, { key: 'failed', label: 'Failed' },
  ];

  if (loading && !monitoring) {
    return <DashboardLayout sidebarItems={NAV_ITEMS} onNavigate={(item) => item.href && navigate(item.href)} workspaceName={workspaceName} userName={user?.name} userEmail={user?.email} onLogout={logout} onSettings={() => navigate('/dashboard/settings')}><DashboardContent loading /></DashboardLayout>;
  }

  return (
    <DashboardLayout sidebarItems={NAV_ITEMS} onNavigate={(item) => item.href && navigate(item.href)} workspaceName={workspaceName} userName={user?.name} userEmail={user?.email} onLogout={logout} onSettings={() => navigate('/dashboard/settings')}>
      <DashboardContent>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-[15px] font-medium text-foreground">Knowledge Center</h1>
              <p className="text-sm text-muted-foreground">Manage documents, sources, and processing</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setScanModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-hairline px-3 py-1.5 text-xs text-foreground transition hover:bg-white/[0.04]">
                <ScanSearch className="h-3.5 w-3.5" />
                Scan Website
              </button>
              <button onClick={() => navigate('/dashboard/onboarding')} className="btn-wine rounded-xl px-3 py-1.5 text-xs">Upload Document</button>
            </div>
          </div>

          {/* Website Scanner */}
          <div className="grid gap-4 lg:grid-cols-3">
            <ScanProgressCard scan={latestScan} onRefresh={loadScanStatus} onScheduleChange={handleScheduleChange} className="lg:col-span-2" />
            <BrandIntelligenceCard scan={latestScan} />
          </div>

          {/* Metric Cards */}
          {monitoring && (
            <DashboardMetricGrid columns={4}>
              {[
                { icon: <Book className="h-4 w-4" />, label: 'Knowledge Sources', value: monitoring.indexedDocuments, onClick: () => navigate('/dashboard/onboarding') },
                { icon: <FileText className="h-4 w-4" />, label: 'Documents', value: monitoring.totalDocuments, variant: 'success' as const, onClick: () => navigate('/dashboard/onboarding') },
                { icon: <Globe className="h-4 w-4" />, label: 'Website Crawls', value: websiteCount, onClick: () => navigate('/dashboard/onboarding?tab=website') },
                { icon: <RefreshCw className="h-4 w-4" />, label: 'Processing Queue', value: processingCount, variant: processingCount > 0 ? ('warning' as const) : ('default' as const), onClick: () => setProcessingExpanded((p: boolean) => !p) },
              ].map(m => (
                <div key={m.label} onClick={m.onClick} className={cn('glass rounded-2xl p-5 transition duration-300 cursor-pointer hover:-translate-y-0.5 hover:border-border-strong')}>
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', m.variant === 'success' ? 'bg-success/[0.1] text-success' : m.variant === 'warning' ? 'bg-warning/[0.1] text-warning' : 'bg-wine/[0.1] text-wine')}>{m.icon}</div>
                  <p className="mt-3 text-2xl font-bold text-foreground tabular-nums">{m.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </DashboardMetricGrid>
          )}

          {/* Empty state */}
          {!loading && monitoring && monitoring.totalDocuments === 0 && (
            <DashboardEmptyState icon={<FileText className="h-6 w-6" />} title="Upload your first document" description="Add PDFs, text files, or connect a website. Your chatbot learns from these to answer customer questions accurately." primaryAction={{ label: 'Upload Document', onClick: () => navigate('/dashboard/onboarding') }} secondaryAction={{ label: 'Crawl a website', onClick: () => navigate('/dashboard/onboarding?tab=website') }} />
          )}

          {/* Processing Queue */}
          {monitoring && processingDocs.length > 0 && (
            <DashboardSection title="Processing Queue" actions={<Badge variant="info" size="sm">{processingDocs.length}</Badge>} variant="card">
              <button onClick={() => setProcessingExpanded(p => !p)} className="flex items-center gap-2 text-sm font-medium text-foreground mb-3" aria-expanded={processingExpanded}>
                <svg className={cn('h-4 w-4 transition', processingExpanded && 'rotate-90')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                Show queue
              </button>
              {processingExpanded && (
                <div className="space-y-2">
                  {processingDocs.map(doc => (
                    <div key={doc.documentId} className="flex items-center gap-3 rounded-xl border border-hairline bg-white/[0.02] p-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-wine/[0.1] shrink-0"><RefreshCw className="h-4 w-4 animate-spin text-wine" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{doc.title || doc.originalName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant={STATUS_BADGE[doc.status] || 'neutral'} size="sm">{doc.status}</Badge>
                          {doc.chunkCount > 0 && <span className="text-xs text-muted-foreground">{doc.chunkCount} chunks</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DashboardSection>
          )}

          {/* Document Table */}
          {monitoring && monitoring.totalDocuments > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <DashboardSearch value={searchQuery} onChange={(v) => { setSearchQuery(v); setPage(0); }} placeholder="Search documents..." className="max-w-sm" />
                <div className="flex items-center gap-1" role="tablist">
                  {FILTER_TABS.map(tab => (
                    <button key={tab.key} role="tab" aria-selected={activeFilter === tab.key} onClick={() => { setActiveFilter(tab.key); setPage(0); }}
                      className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition', activeFilter === tab.key ? 'wine-gradient text-white' : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent')}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <DashboardTable columns={columns} data={filteredDocs} loading={loading} empty={filteredDocs.length === 0 && !loading} onRowClick={(doc) => {/* could open detail */}} rowKey={(d) => d.documentId} />

              {totalPages > 1 && (
                <DashboardPagination total={total} page={page + 1} pageSize={pageSize} onPageChange={(p) => setPage(p - 1)} />
              )}
            </div>
          )}

          {/* Bulk action bar */}
          {selectedDocs.size > 0 && (
            <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-2xl border border-wine/20 bg-wine/[0.12] px-5 py-3 backdrop-blur-2xl shadow-lg">
              <span className="text-sm font-medium text-foreground">{selectedDocs.size} document(s) selected</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedDocs(new Set())} className="rounded-xl border border-hairline px-3 py-1.5 text-xs text-foreground transition hover:bg-white/[0.04]">Cancel</button>
                <button onClick={handleBulkDelete} className="btn-wine rounded-xl px-3 py-1.5 text-xs">Delete Selected</button>
              </div>
            </div>
          )}
        </div>
      </DashboardContent>
      <WebsiteScannerModal open={scanModalOpen} onClose={() => setScanModalOpen(false)} onStarted={handleScanStarted} />
    </DashboardLayout>
  );
}
