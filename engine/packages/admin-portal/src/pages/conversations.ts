import { Component } from '../core/component';
import { ApiClient } from '../core/api-client';
import { Table, TableColumn } from '../components/table';
import { Badge } from '../components/ui-components';
import { Modal } from '../components/modal';
import { toast } from '../core/toast';
import { EmptyState, EMPTY_STATES } from '../onboarding/empty-states';

export class ConversationsPage extends Component {
  private api: ApiClient;
  private conversations: any[] = [];
  private total = 0;
  private page = 1;
  private limit = 20;
  private table: Table | null = null;
  private dataLoaded = false;

  constructor(api: ApiClient) {
    super();
    this.api = api;
    this.setTestId('conversations-page');
  }

  onMount(): void { this.loadData(); }

  async loadData(): Promise<void> {
    try {
      const res = await this.api.listConversations({ page: this.page, limit: this.limit });
      this.conversations = res.conversations;
      this.total = res.total;
    } catch { this.conversations = []; }
    this.dataLoaded = true;
    this.render();
  }

  render(): void {
    if (this.dataLoaded && this.conversations.length === 0) {
      this.renderEmpty();
      return;
    }
    this.el.innerHTML = `
      <div class="page-header">
        <h1>Conversations</h1>
        <p class="page-subtitle">Monitor user conversations (${this.total} total)</p>
      </div>
      <div data-testid="conversations-table"></div>
      <div class="pagination" data-testid="pagination"></div>
    `;

    const columns: TableColumn[] = [
      { key: 'sessionId', label: 'Session', width: '200px' },
      { key: 'status', label: 'Status', render: (v: string) => { const b = new Badge(v, v === 'active' ? 'success' : v === 'escalated' ? 'error' : 'default'); b.render(); return b.getElement(); } },
      { key: 'messageCount', label: 'Messages', align: 'right' },
      { key: 'startedAt', label: 'Started', render: (v: string) => new Date(v).toLocaleString() },
    ];

    this.table = new Table({
      columns, data: this.conversations, emptyMessage: 'No conversations found',
      onRowClick: (row) => this.showConversation(row),
      testId: 'conversations-table',
    });
    const tableContainer = this.el.querySelector('[data-testid="conversations-table"]')!;
    this.table.mount(tableContainer as HTMLElement);

    this.renderPagination();
  }

  private renderEmpty(): void {
    this.el.innerHTML = '';
    const empty = new EmptyState(EMPTY_STATES.conversations);
    empty.mount(this.el);
    const btn = this.el.querySelector('[data-testid="empty-conversations-action"]');
    btn?.addEventListener('click', () => {
      toast.info('Install the widget on your website to start receiving conversations.');
    });
  }

  private renderPagination(): void {
    const container = this.el.querySelector('[data-testid="pagination"]')!;
    const totalPages = Math.ceil(this.total / this.limit);
    container.innerHTML = '';
    if (totalPages <= 1) return;
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:16px;';
    if (this.page > 1) {
      const prev = document.createElement('button');
      prev.className = 'btn btn-secondary';
      prev.textContent = 'Previous';
      prev.onclick = () => { this.page--; this.loadData(); };
      div.appendChild(prev);
    }
    const info = document.createElement('span');
    info.textContent = `Page ${this.page} of ${totalPages}`;
    info.style.cssText = 'display:flex;align-items:center;padding:0 16px;font-size:14px;color:#6b7280;';
    div.appendChild(info);
    if (this.page < totalPages) {
      const next = document.createElement('button');
      next.className = 'btn btn-primary';
      next.textContent = 'Next';
      next.onclick = () => { this.page++; this.loadData(); };
      div.appendChild(next);
    }
    container.appendChild(div);
  }

  private async showConversation(row: any): Promise<void> {
    try {
      const res = await this.api.getMessages(row.id, { limit: 50 });
      const messagesHtml = res.messages.map((m: any) =>
        `<div class="message message-${m.role}"><strong>${m.role}:</strong> ${this.escapeHtml(m.content)}</div>`
      ).join('');

      new Modal({
        title: `Conversation ${row.sessionId}`,
        content: `<div class="messages-container">${messagesHtml || '<p>No messages</p>'}</div>`,
        actions: [{ label: 'Close', onClick: () => {}, variant: 'secondary' }],
        testId: 'conversation-modal',
      }).open();
    } catch { /* ignore */ }
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
