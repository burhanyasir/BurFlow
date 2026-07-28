import { Component } from '../core/component';
import { ApiClient } from '../core/api-client';
import { ProgressBar, Badge } from '../components/ui-components';
import { EmptyState, EMPTY_STATES } from '../onboarding/empty-states';

export class AnalyticsPage extends Component {
  private api: ApiClient;
  private usage: any = null;
  private stats: any = null;
  private versions: any = null;
  private dataLoaded = false;

  constructor(api: ApiClient) {
    super();
    this.api = api;
    this.setTestId('analytics-page');
  }

  onMount(): void { this.loadData(); }

  async loadData(): Promise<void> {
    try {
      const [usageRes, statsRes, versionsRes] = await Promise.all([
        this.api.getCurrentUsage().catch(() => ({ usage: null })),
        this.api.getStats().catch(() => null),
        this.api.getVersions().catch(() => ({ versions: [], latestVersion: 0 })),
      ]);
      this.usage = usageRes.usage;
      this.stats = statsRes;
      this.versions = versionsRes;
    } catch { /* ignore */ }
    this.dataLoaded = true;
    this.render();
  }

  render(): void {
    if (this.dataLoaded && !this.usage && !this.stats) {
      this.renderEmpty();
      return;
    }
    const u = this.usage;
    const s = this.stats;
    const v = this.versions;

    this.el.innerHTML = `
      <div class="page-header"><h1>Analytics</h1><p class="page-subtitle">Usage metrics and quality scoring</p></div>
      <div class="analytics-grid" data-testid="analytics-grid">
        <div class="analytics-section">
          <h3>Usage This Period</h3>
          <div class="analytics-cards">
            <div class="analytics-card" data-testid="analytics-messages">
              <div class="stat-label">Messages</div>
              <div class="stat-value">${u?.messagesUsed?.toLocaleString() || 0} / ${u?.messagesLimit?.toLocaleString() || '-'}</div>
              ${u ? `<div class="stat-bar"><div class="stat-bar-fill" style="width:${Math.min(100, (u.messagesUsed / u.messagesLimit) * 100)}%"></div></div>` : ''}
            </div>
            <div class="analytics-card" data-testid="analytics-tokens">
              <div class="stat-label">Tokens</div>
              <div class="stat-value">${u?.tokensUsed?.toLocaleString() || 0} / ${u?.tokensLimit?.toLocaleString() || '-'}</div>
              ${u ? `<div class="stat-bar"><div class="stat-bar-fill" style="width:${Math.min(100, (u.tokensUsed / u.tokensLimit) * 100)}%"></div></div>` : ''}
            </div>
            <div class="analytics-card" data-testid="analytics-storage">
              <div class="stat-label">Storage (MB)</div>
              <div class="stat-value">${u?.storageUsedMb || 0} / ${u?.storageLimitMb || '-'}</div>
              ${u ? `<div class="stat-bar"><div class="stat-bar-fill" style="width:${Math.min(100, (u.storageUsedMb / u.storageLimitMb) * 100)}%"></div></div>` : ''}
            </div>
            <div class="analytics-card" data-testid="analytics-apicalls">
              <div class="stat-label">API Calls</div>
              <div class="stat-value">${u?.apiCallsUsed?.toLocaleString() || 0} / ${u?.apiCallsLimit?.toLocaleString() || '-'}</div>
              ${u ? `<div class="stat-bar"><div class="stat-bar-fill" style="width:${Math.min(100, (u.apiCallsUsed / u.apiCallsLimit) * 100)}%"></div></div>` : ''}
            </div>
          </div>
        </div>
        <div class="analytics-section">
          <h3>Knowledge Health</h3>
          <div class="analytics-cards">
            <div class="analytics-card" data-testid="analytics-vectors">
              <div class="stat-label">Active Chunks</div>
              <div class="stat-value">${s?.vectors?.activeChunks || 0}</div>
            </div>
            <div class="analytics-card" data-testid="analytics-deleted">
              <div class="stat-label">Deleted Chunks</div>
              <div class="stat-value">${s?.vectors?.deletedChunks || 0}</div>
            </div>
            <div class="analytics-card" data-testid="analytics-published-sources">
              <div class="stat-label">Published Sources</div>
              <div class="stat-value">${s?.sources?.published || 0} / ${s?.sources?.total || 0}</div>
            </div>
            <div class="analytics-card" data-testid="analytics-failed-sources">
              <div class="stat-label">Failed Sources</div>
              <div class="stat-value">${s?.sources?.failed || 0}</div>
            </div>
          </div>
        </div>
        <div class="analytics-section">
          <h3>Knowledge Versions</h3>
          <div class="analytics-card" data-testid="analytics-versions">
            <div class="stat-label">Latest Version</div>
            <div class="stat-value">${v?.latestVersion || 0}</div>
            <div style="margin-top:8px;font-size:13px;color:#6b7280;">Total versions: ${v?.versions?.length || 0}</div>
          </div>
        </div>
      </div>
    `;
  }

  private renderEmpty(): void {
    this.el.innerHTML = '';
    const empty = new EmptyState(EMPTY_STATES.analytics);
    empty.mount(this.el);
    const btn = this.el.querySelector('[data-testid="empty-analytics-action"]');
    btn?.addEventListener('click', () => {
      window.history.pushState({}, '', '/admin/wizard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  }
}
