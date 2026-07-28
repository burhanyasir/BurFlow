import { Component } from '../core/component';
import { ApiClient } from '../core/api-client';
import { Table, TableColumn } from '../components/table';
import { RoleBadge } from '../components/ui-components';
import { Modal } from '../components/modal';
import { toast } from '../core/toast';
import { canAccessAdmin } from '../core/auth';
import { EmptyState, EMPTY_STATES } from '../onboarding/empty-states';

export class ApiKeysPage extends Component {
  private api: ApiClient;
  private keys: any[] = [];
  private dataLoaded = false;

  constructor(api: ApiClient) {
    super();
    this.api = api;
    this.setTestId('apikeys-page');
  }

  onMount(): void { this.loadData(); }

  async loadData(): Promise<void> {
    try {
      const res = await this.api.listApiKeys();
      this.keys = res.keys;
    } catch { this.keys = []; }
    this.dataLoaded = true;
    this.render();
  }

  render(): void {
    if (this.dataLoaded && this.keys.length === 0) {
      this.renderEmpty();
      return;
    }
    const isAdmin = canAccessAdmin();
    this.el.innerHTML = `
      <div class="page-header">
        <h1>API Keys</h1>
        <p class="page-subtitle">Manage API keys for programmatic access</p>
        ${isAdmin ? '<button class="btn btn-primary" data-testid="btn-create-key" id="btn-create-key">Create API Key</button>' : ''}
      </div>
      <div data-testid="apikeys-table"></div>
    `;

    const columns: TableColumn[] = [
      { key: 'label', label: 'Label', width: '200px' },
      { key: 'keyPrefix', label: 'Key Prefix', width: '150px', render: (v: string) => `<code>${v}</code>` },
      { key: 'role', label: 'Role', render: (v: string) => { const b = new RoleBadge({ role: v }); b.render(); return b.getElement(); }, width: '120px' },
      { key: 'lastUsedAt', label: 'Last Used', render: (v: string) => v ? new Date(v).toLocaleString() : 'Never', width: '160px' },
      { key: 'createdAt', label: 'Created', render: (v: string) => new Date(v).toLocaleString(), width: '160px' },
    ];

    if (isAdmin) {
      columns.push({
        key: 'id', label: 'Actions', width: '100px',
        render: (_: any, row: any) => {
          const btn = document.createElement('button');
          btn.className = 'btn btn-danger btn-sm';
          btn.textContent = 'Revoke';
          btn.onclick = (e) => { e.stopPropagation(); this.revokeKey(row.id); };
          return btn;
        },
      });
    }

    const table = new Table({
      columns, data: this.keys, emptyMessage: 'No API keys found',
      testId: 'apikeys-table',
    });
    const tableContainer = this.el.querySelector('[data-testid="apikeys-table"]')!;
    table.mount(tableContainer as HTMLElement);

    this.el.querySelector('#btn-create-key')?.addEventListener('click', () => this.showCreateModal());
  }

  private renderEmpty(): void {
    this.el.innerHTML = '';
    const empty = new EmptyState(EMPTY_STATES.apiKeys);
    empty.mount(this.el);
    const btn = this.el.querySelector('[data-testid="empty-apikeys-action"]');
    btn?.addEventListener('click', () => this.showCreateModal());
  }

  private showCreateModal(): void {
    const form = document.createElement('div');
    form.innerHTML = `
      <div class="form-group"><label>Label</label><input class="form-input" data-testid="input-label" id="key-label" placeholder="My API Key" /></div>
      <div class="form-group"><label>Role</label><select class="form-input" data-testid="input-role" id="key-role">
        <option value="end-user">End User</option><option value="operator">Operator</option><option value="admin">Admin</option><option value="service">Service</option>
      </select></div>
    `;
    new Modal({
      title: 'Create API Key', content: form,
      actions: [{ label: 'Create', onClick: () => this.createKey(), variant: 'primary' }, { label: 'Cancel', onClick: () => {}, variant: 'secondary' }],
      testId: 'create-key-modal',
    }).open();
  }

  private async createKey(): Promise<void> {
    const label = (document.getElementById('key-label') as HTMLInputElement)?.value;
    const role = (document.getElementById('key-role') as HTMLSelectElement)?.value;
    if (!label) { toast.error('Label required'); return; }
    try {
      const res = await this.api.createApiKey(label, role);
      new Modal({
        title: 'API Key Created', content: `<p>Copy this key now - it won't be shown again:</p><pre style="padding:12px;background:#f3f4f6;border-radius:4px;word-break:break-all;">${res.key}</pre>`,
        actions: [{ label: 'Done', onClick: () => {}, variant: 'primary' }],
        testId: 'key-created-modal',
      }).open();
      this.loadData();
    } catch (e: any) { toast.error(e.message || 'Failed to create key'); }
  }

  private async revokeKey(id: string): Promise<void> {
    try { await this.api.revokeApiKey(id); toast.success('API key revoked'); this.loadData(); }
    catch (e: any) { toast.error(e.message || 'Revoke failed'); }
  }
}
