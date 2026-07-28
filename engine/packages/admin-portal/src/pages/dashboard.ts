import { Component } from '../core/component';
import { ApiClient } from '../core/api-client';
import { Store } from '../core/store';
import { ProgressBar, Badge } from '../components/ui-components';

export interface DashboardState {
  conversations: number;
  activeConversations: number;
  messagesThisMonth: number;
  tokensThisMonth: number;
  knowledgeSources: number;
  publishedSources: number;
  totalChunks: number;
  apiKeys: number;
  plan: string;
  loading: boolean;
}

export class DashboardPage extends Component {
  private api: ApiClient;
  private store: Store<DashboardState>;

  constructor(api: ApiClient) {
    super();
    this.api = api;
    this.store = new Store<DashboardState>({
      conversations: 0, activeConversations: 0, messagesThisMonth: 0, tokensThisMonth: 0,
      knowledgeSources: 0, publishedSources: 0, totalChunks: 0, apiKeys: 0, plan: 'free', loading: true,
    });
    this.setTestId('dashboard-page');
  }

  onMount(): void { this.loadData(); }

  async loadData(): Promise<void> {
    try {
      const [convos, usage, sources, keys] = await Promise.all([
        this.api.listConversations({ limit: 1 }).catch(() => ({ conversations: [], total: 0 })),
        this.api.getCurrentUsage().catch(() => ({ usage: null })).then(r => r.usage),
        this.api.listSources({ pageSize: 1 }).catch(() => ({ sources: [], total: 0 })),
        this.api.listApiKeys().catch(() => ({ keys: [] })),
      ]);
      const stats = await this.api.getStats().catch(() => null);
      this.store.update({
        conversations: convos.total,
        messagesThisMonth: usage?.messagesUsed || 0,
        tokensThisMonth: usage?.tokensUsed || 0,
        knowledgeSources: sources.total,
        publishedSources: stats?.sources?.published || 0,
        totalChunks: stats?.vectors?.activeChunks || 0,
        apiKeys: keys.keys?.length || 0,
        loading: false,
      });
      this.render();
    } catch {
      this.store.set('loading', false);
      this.render();
    }
  }

  render(): void {
    const s = this.store.getAll();
    this.el.innerHTML = `
      <div class="page-header">
        <h1>Dashboard</h1>
        <p class="page-subtitle">Overview of your conversation engine</p>
      </div>
      <div class="dashboard-grid" data-testid="dashboard-grid">
        <div class="dashboard-card" data-testid="stat-conversations">
          <div class="stat-label">Total Conversations</div>
          <div class="stat-value">${s.conversations}</div>
        </div>
        <div class="dashboard-card" data-testid="stat-messages">
          <div class="stat-label">Messages This Month</div>
          <div class="stat-value">${s.messagesThisMonth.toLocaleString()}</div>
        </div>
        <div class="dashboard-card" data-testid="stat-tokens">
          <div class="stat-label">Tokens This Month</div>
          <div class="stat-value">${s.tokensThisMonth.toLocaleString()}</div>
        </div>
        <div class="dashboard-card" data-testid="stat-knowledge">
          <div class="stat-label">Knowledge Sources</div>
          <div class="stat-value">${s.knowledgeSources}</div>
        </div>
        <div class="dashboard-card" data-testid="stat-published">
          <div class="stat-label">Published Sources</div>
          <div class="stat-value">${s.publishedSources}</div>
        </div>
        <div class="dashboard-card" data-testid="stat-chunks">
          <div class="stat-label">Total Chunks</div>
          <div class="stat-value">${s.totalChunks.toLocaleString()}</div>
        </div>
        <div class="dashboard-card" data-testid="stat-apikeys">
          <div class="stat-label">API Keys</div>
          <div class="stat-value">${s.apiKeys}</div>
        </div>
        <div class="dashboard-card" data-testid="stat-plan">
          <div class="stat-label">Current Plan</div>
          <div class="stat-value">${s.plan}</div>
        </div>
      </div>
    `;
  }
}
