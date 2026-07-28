import { Component } from '../core/component';
import { ApiClient } from '../core/api-client';
import { Table, TableColumn } from '../components/table';
import { Badge, StatusBadge } from '../components/ui-components';
import { Modal } from '../components/modal';
import { toast } from '../core/toast';
import { EmptyState, EMPTY_STATES } from '../onboarding/empty-states';

export class KnowledgePage extends Component {
  private api: ApiClient;
  private sources: any[] = [];
  private total = 0;
  private page = 1;
  private pageSize = 20;
  private statusFilter = '';
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private dataLoaded = false;

  constructor(api: ApiClient) {
    super();
    this.api = api;
    this.setTestId('knowledge-page');
  }

  onMount(): void {
    this.loadData();
    this.pollTimer = setInterval(() => this.loadData(true), 5000);
  }

  unmount(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    super.unmount();
  }

  async loadData(silent = false): Promise<void> {
    try {
      const res = await this.api.listSources({ status: this.statusFilter || undefined, page: this.page, pageSize: this.pageSize });
      this.sources = res.sources;
      this.total = res.total;
    } catch { this.sources = []; }
    this.dataLoaded = true;
    if (!silent) this.render();
  }

  render(): void {
    if (this.dataLoaded && this.sources.length === 0) {
      this.renderEmpty();
      return;
    }
    this.el.innerHTML = `
      <div class="page-header">
        <h1>Knowledge Management</h1>
        <p class="page-subtitle">Manage your knowledge sources and ingestion pipeline</p>
        <div class="page-actions">
          <button class="btn btn-primary" data-testid="btn-upload" id="btn-upload">Upload Document</button>
          <button class="btn btn-secondary" data-testid="btn-crawl" id="btn-crawl">Crawl URL</button>
          <button class="btn btn-secondary" data-testid="btn-publish" id="btn-publish">Publish</button>
        </div>
      </div>
      <div class="filter-bar" data-testid="filter-bar">
        <select data-testid="status-filter" id="status-filter">
          <option value="">All Statuses</option>
          <option value="queued">Queued</option>
          <option value="parsing">Parsing</option>
          <option value="normalizing">Normalizing</option>
          <option value="chunking">Chunking</option>
          <option value="embedding">Embedding</option>
          <option value="indexed">Indexed</option>
          <option value="published">Published</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      <div data-testid="sources-table"></div>
      <div data-testid="pagination"></div>
    `;

    const columns: TableColumn[] = [
      { key: 'originalName', label: 'Name', width: '250px' },
      { key: 'sourceType', label: 'Type', width: '80px' },
      { key: 'status', label: 'Status', render: (v: string) => { const b = new StatusBadge({ status: v }); b.render(); return b.getElement(); }, width: '120px' },
      { key: 'updatedAt', label: 'Updated', render: (v: string) => v ? new Date(v).toLocaleString() : '-', width: '160px' },
      { key: 'error', label: 'Error', render: (v: string) => v ? `<span style="color:#ef4444;font-size:12px">${this.escapeHtml(v.slice(0, 100))}</span>` : '-', width: '200px' },
    ];

    const table = new Table({
      columns, data: this.sources, emptyMessage: 'No knowledge sources found',
      onRowClick: (row) => this.showSourceActions(row),
      testId: 'sources-table',
    });
    const tableContainer = this.el.querySelector('[data-testid="sources-table"]')!;
    table.mount(tableContainer as HTMLElement);

    this.bindEvents();
  }

  private renderEmpty(): void {
    this.el.innerHTML = '';
    const empty = new EmptyState(EMPTY_STATES.knowledge);
    empty.mount(this.el);
    const btn = this.el.querySelector('[data-testid="empty-kb-action"]');
    btn?.addEventListener('click', () => this.showUploadModal());
  }

  private bindEvents(): void {
    const uploadBtn = this.el.querySelector('#btn-upload');
    uploadBtn?.addEventListener('click', () => this.showUploadModal());
    const crawlBtn = this.el.querySelector('#btn-crawl');
    crawlBtn?.addEventListener('click', () => this.showCrawlModal());
    const publishBtn = this.el.querySelector('#btn-publish');
    publishBtn?.addEventListener('click', () => this.publish());
    const filter = this.el.querySelector('#status-filter') as HTMLSelectElement;
    if (filter) {
      filter.value = this.statusFilter;
      filter.addEventListener('change', () => { this.statusFilter = filter.value; this.page = 1; this.loadData(); });
    }
  }

  private showUploadModal(): void {
    const form = document.createElement('div');
    form.innerHTML = `
      <div class="form-group"><label>Filename</label><input type="text" data-testid="input-filename" id="upload-filename" placeholder="document.pdf" class="form-input" /></div>
      <div class="form-group"><label>Source Type</label><select data-testid="input-sourcetype" id="upload-sourcetype" class="form-input">
        <option value="text">Text</option><option value="markdown">Markdown</option><option value="html">HTML</option><option value="faq">FAQ</option>
        <option value="pdf">PDF</option><option value="docx">DOCX</option>
      </select></div>
      <div class="form-group"><label>Content</label><textarea data-testid="input-content" id="upload-content" class="form-input" rows="6" placeholder="Paste document content..."></textarea></div>
    `;
    new Modal({
      title: 'Upload Document', content: form,
      actions: [{ label: 'Upload', onClick: () => this.handleUpload(), variant: 'primary' }, { label: 'Cancel', onClick: () => {}, variant: 'secondary' }],
      testId: 'upload-modal',
    }).open();
  }

  private async handleUpload(): Promise<void> {
    const filename = (document.getElementById('upload-filename') as HTMLInputElement)?.value;
    const sourceType = (document.getElementById('upload-sourcetype') as HTMLSelectElement)?.value;
    const content = (document.getElementById('upload-content') as HTMLTextAreaElement)?.value;
    if (!filename || !content) { toast.error('Filename and content required'); return; }
    try {
      await this.api.uploadDocument(filename, sourceType, content);
      toast.success('Document uploaded successfully');
      this.loadData();
    } catch (e: any) { toast.error(e.message || 'Upload failed'); }
  }

  private showCrawlModal(): void {
    const form = document.createElement('div');
    form.innerHTML = `
      <div class="form-group"><label>URL</label><input type="url" data-testid="input-url" id="crawl-url" placeholder="https://example.com/docs" class="form-input" /></div>
      <div class="form-group"><label>Max Depth</label><input type="number" data-testid="input-depth" id="crawl-depth" value="2" min="0" max="5" class="form-input" /></div>
      <div class="form-group"><label>Max Pages</label><input type="number" data-testid="input-pages" id="crawl-pages" value="10" min="1" max="50" class="form-input" /></div>
    `;
    new Modal({
      title: 'Crawl Website', content: form,
      actions: [{ label: 'Start Crawl', onClick: () => this.handleCrawl(), variant: 'primary' }, { label: 'Cancel', onClick: () => {}, variant: 'secondary' }],
      testId: 'crawl-modal',
    }).open();
  }

  private async handleCrawl(): Promise<void> {
    const url = (document.getElementById('crawl-url') as HTMLInputElement)?.value;
    const depth = parseInt((document.getElementById('crawl-depth') as HTMLInputElement)?.value || '2');
    const pages = parseInt((document.getElementById('crawl-pages') as HTMLInputElement)?.value || '10');
    if (!url) { toast.error('URL required'); return; }
    try {
      await this.api.crawlUrl(url, depth, pages);
      toast.success('Crawl started');
      this.loadData();
    } catch (e: any) { toast.error(e.message || 'Crawl failed'); }
  }

  private async publish(): Promise<void> {
    try {
      const result = await this.api.publishKnowledge();
      toast.success(`Published version ${result.knowledgeVersion} with ${result.chunkCount} chunks`);
      this.loadData();
    } catch (e: any) { toast.error(e.message || 'Publish failed'); }
  }

  private showSourceActions(source: any): void {
    const actions = [
      { label: 'Process', onClick: () => this.processSource(source.documentId), variant: 'primary' as const },
      { label: 'Reindex', onClick: () => this.reindexSource(source.documentId), variant: 'secondary' as const },
      { label: 'Delete', onClick: () => this.deleteSource(source.documentId), variant: 'danger' as const },
    ];
    new Modal({
      title: source.originalName, content: `<p>Status: ${source.status}</p><p>Type: ${source.sourceType}</p><p>Queued: ${new Date(source.queuedAt).toLocaleString()}</p>`,
      actions, testId: 'source-modal',
    }).open();
  }

  private async processSource(id: string): Promise<void> {
    try { await this.api.processDocument(id); toast.success('Document processed'); this.loadData(); }
    catch (e: any) { toast.error(e.message || 'Process failed'); }
  }

  private async reindexSource(id: string): Promise<void> {
    try { await this.api.reindexSource(id); toast.success('Reindex started'); this.loadData(); }
    catch (e: any) { toast.error(e.message || 'Reindex failed'); }
  }

  private async deleteSource(id: string): Promise<void> {
    try { await this.api.deleteSource(id); toast.success('Source deleted'); this.loadData(); }
    catch (e: any) { toast.error(e.message || 'Delete failed'); }
  }

  private escapeHtml(str: string): string { return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
}
