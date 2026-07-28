import { Component } from '../core/component';
import { ApiClient } from '../core/api-client';
import { Table, TableColumn } from '../components/table';
import { RoleBadge } from '../components/ui-components';
import { getAuth, canAccessAdmin } from '../core/auth';
import { toast } from '../core/toast';
import { EmptyState, EMPTY_STATES } from '../onboarding/empty-states';

export class UsersPage extends Component {
  private api: ApiClient;
  private members: any[] = [];
  private tenantName = '';
  private dataLoaded = false;

  constructor(api: ApiClient) {
    super();
    this.api = api;
    this.setTestId('users-page');
  }

  onMount(): void { this.loadData(); }

  async loadData(): Promise<void> {
    const auth = getAuth();
    if (!auth.tenantId) return;
    try {
      const [membersRes, tenantRes] = await Promise.all([
        this.api.getMembers(auth.tenantId),
        this.api.getTenant(auth.tenantId),
      ]);
      this.members = membersRes.members;
      this.tenantName = tenantRes.tenant.name;
    } catch { /* ignore */ }
    this.dataLoaded = true;
    this.render();
  }

  render(): void {
    if (this.dataLoaded && this.members.length === 0) {
      this.renderEmpty();
      return;
    }
    this.el.innerHTML = `
      <div class="page-header">
        <h1>User & Role Management</h1>
        <p class="page-subtitle">Manage team members for ${this.escapeHtml(this.tenantName)}</p>
      </div>
      <div data-testid="users-table"></div>
    `;

    const columns: TableColumn[] = [
      { key: 'name', label: 'Name', width: '200px' },
      { key: 'email', label: 'Email', width: '250px' },
      { key: 'role', label: 'Role', render: (v: string) => { const b = new RoleBadge({ role: v }); b.render(); return b.getElement(); }, width: '120px' },
    ];

    const table = new Table({
      columns, data: this.members, emptyMessage: 'No team members found',
      testId: 'users-table',
    });
    const tableContainer = this.el.querySelector('[data-testid="users-table"]')!;
    table.mount(tableContainer as HTMLElement);
  }

  private renderEmpty(): void {
    this.el.innerHTML = '';
    const empty = new EmptyState(EMPTY_STATES.users);
    empty.mount(this.el);
    const btn = this.el.querySelector('[data-testid="empty-users-action"]');
    btn?.addEventListener('click', () => {
      toast.info('Invite functionality coming soon. You can add team members from the settings page.');
    });
  }

  private escapeHtml(str: string): string { return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
}
