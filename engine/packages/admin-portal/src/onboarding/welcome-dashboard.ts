import { Component } from '../core/component';
import { ApiClient } from '../core/api-client';
import { getOnboardingProgress, getOnboardingPercent, isOnboardingComplete, hasCompletedStep, getNextIncompleteStep, ONBOARDING_STEP_LABELS, setOnboardingProgress } from './store';
import type { OnboardingStepId } from './types';
import { toast } from '../core/toast';

const S = {
  page: 'padding:24px;max-width:1200px;margin:0 auto;',
  header: 'margin-bottom:32px;',
  title: 'font-size:28px;font-weight:700;color:#111827;margin:0 0 8px 0;',
  subtitle: 'font-size:16px;color:#6b7280;margin:0;',
  grid: 'display:grid;grid-template-columns:1fr 360px;gap:24px;',
  card: 'background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;',
  cardTitle: 'font-size:18px;font-weight:600;color:#111827;margin:0 0 16px 0;',
  checkItem: 'display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f3f4f6;',
  checkIcon: 'width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;',
  stepLabel: 'font-size:14px;color:#374151;flex:1;',
  actions: 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;',
  actionBtn: 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:20px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;cursor:pointer;transition:all 0.15s;font-family:inherit;',
  actionIcon: 'width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;',
  actionLabel: 'font-size:13px;font-weight:500;color:#374151;',
  statsRow: 'display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:24px;',
  statCard: 'background:#f9fafb;border-radius:8px;padding:16px;text-align:center;',
  statValue: 'font-size:24px;font-weight:700;color:#111827;',
  statLabel: 'font-size:12px;color:#6b7280;margin-top:4px;',
  progressTrack: 'height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;margin:12px 0;',
  progressFill: 'height:100%;border-radius:4px;transition:width 0.4s ease;',
  continueBtn: 'width:100%;padding:12px;background:#7c2d12;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;',
  demoBtn: 'width:100%;padding:10px;background:transparent;color:#7c2d12;border:1px solid #7c2d12;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit;margin-top:8px;',
  statGrid: 'display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:24px;',
  welcomeBanner: 'background:linear-gradient(135deg,#7c2d12 0%,#a04020 100%);border-radius:12px;padding:32px;color:#fff;margin-bottom:24px;',
  welcomeTitle: 'font-size:24px;font-weight:700;margin:0 0 8px 0;',
  welcomeText: 'font-size:15px;opacity:0.9;margin:0 0 20px 0;line-height:1.5;',
};

export class WelcomeDashboard extends Component {
  private api: ApiClient;
  private loading = true;
  private stats: any = { conversations: 0, messages: 0, sources: 0 };
  private onStartWizard: () => void;

  constructor(api: ApiClient, onStartWizard: () => void) {
    super();
    this.api = api;
    this.onStartWizard = onStartWizard;
    this.setTestId('welcome-dashboard');
  }

  onMount(): void { this.loadData(); }

  async loadData(): Promise<void> {
    try {
      const [progressRes, usageRes, convosRes, sourcesRes] = await Promise.all([
        this.api.get<any>('/api/onboarding/progress').catch(() => ({ progress: null })),
        this.api.getCurrentUsage().catch(() => ({ usage: null })),
        this.api.listConversations({ limit: 1 }).catch(() => ({ total: 0 })),
        this.api.listSources({ pageSize: 1 }).catch(() => ({ total: 0 })),
      ]);
      if (progressRes?.progress) setOnboardingProgress(progressRes.progress);
      this.stats = {
        conversations: convosRes.total || 0,
        messages: usageRes?.usage?.messagesUsed || 0,
        sources: sourcesRes.total || 0,
      };
    } catch { /* ignore */ }
    this.loading = false;
    this.render();
  }

  render(): void {
    if (this.loading) {
      this.el.innerHTML = '<div style="text-align:center;padding:60px;color:#6b7280;">Loading...</div>';
      return;
    }

    const progress = getOnboardingProgress();
    const completed = isOnboardingComplete();
    const percent = getOnboardingPercent();
    const nextStep = getNextIncompleteStep();

    if (completed) {
      this.renderDashboard();
      return;
    }

    const allSteps: OnboardingStepId[] = ['workspace', 'business_type', 'website', 'brand_color', 'logo', 'knowledge_source', 'widget_install', 'test_chatbot'];

    this.el.innerHTML = `
      <div style="${S.page}">
        <div style="${S.welcomeBanner}">
          <h1 style="${S.welcomeTitle}">Welcome to AI Customer Support</h1>
          <p style="${S.welcomeText}">Let's get you set up in just a few minutes. Complete the steps below to go live.</p>
          <button data-testid="btn-continue-setup" style="${S.continueBtn}">${nextStep ? 'Continue Setup' : 'Complete Setup'}</button>
        </div>
        <div style="${S.grid}">
          <div style="${S.card}">
            <h2 style="${S.cardTitle}">Setup Progress</h2>
            <div style="display:flex;justify-content:space-between;font-size:13px;color:#6b7280;">
              <span>${progress?.completedSteps.length || 0} of 8 steps</span>
              <span>${percent}%</span>
            </div>
            <div style="${S.progressTrack}">
              <div style="${S.progressFill};width:${percent}%;background:${percent === 100 ? '#10b981' : '#7c2d12'};"></div>
            </div>
            <div data-testid="setup-checklist">
              ${allSteps.map(step => {
                const done = hasCompletedStep(step);
                return `<div style="${S.checkItem}">
                  <div style="${S.checkIcon};background:${done ? '#10b981' : '#e5e7eb'};color:${done ? '#fff' : '#9ca3af'};">${done ? '✓' : (allSteps.indexOf(step) + 1)}</div>
                  <span style="${S.stepLabel};color:${done ? '#10b981' : '#374151'};${done ? 'text-decoration:line-through;' : ''}">${ONBOARDING_STEP_LABELS[step]}</span>
                </div>`;
              }).join('')}
            </div>
          </div>
          <div style="${S.card}">
            <h2 style="${S.cardTitle}">Quick Actions</h2>
            <div style="${S.actions}">
              <button data-testid="quick-upload" class="quick-action-btn" style="${S.actionBtn};${!hasCompletedStep('knowledge_source') ? 'opacity:0.5;' : ''}" ${!hasCompletedStep('knowledge_source') ? 'disabled' : ''}>
                <div style="${S.actionIcon};background:#fef3c7;">📄</div>
                <span style="${S.actionLabel}">Upload Knowledge</span>
              </button>
              <button data-testid="quick-widget" class="quick-action-btn" style="${S.actionBtn};${!hasCompletedStep('widget_install') ? 'opacity:0.5;' : ''}" ${!hasCompletedStep('widget_install') ? 'disabled' : ''}>
                <div style="${S.actionIcon};background:#dbeafe;">💬</div>
                <span style="${S.actionLabel}">Install Widget</span>
              </button>
              <button data-testid="quick-test" class="quick-action-btn" style="${S.actionBtn}">
                <div style="${S.actionIcon};background:#d1fae5;">🧪</div>
                <span style="${S.actionLabel}">Test Chatbot</span>
              </button>
              <button data-testid="quick-analytics" class="quick-action-btn" style="${S.actionBtn}">
                <div style="${S.actionIcon};background:#ede9fe;">📊</div>
                <span style="${S.actionLabel}">Analytics</span>
              </button>
            </div>
            <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e5e7eb;">
              <button data-testid="btn-load-demo" style="${S.demoBtn}">Load Sample Data</button>
            </div>
          </div>
        </div>
        <div style="${S.statsRow}">
          <div style="${S.statCard}"><div style="${S.statValue}">${this.stats.conversations}</div><div style="${S.statLabel}">Conversations</div></div>
          <div style="${S.statCard}"><div style="${S.statValue}">${this.stats.messages}</div><div style="${S.statLabel}">Messages</div></div>
          <div style="${S.statCard}"><div style="${S.statValue}">${this.stats.sources}</div><div style="${S.statLabel}">Knowledge Sources</div></div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.el.querySelector('[data-testid="btn-continue-setup"]')?.addEventListener('click', () => this.onStartWizard());

    this.el.querySelectorAll('.quick-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const testId = (btn as HTMLElement).dataset.testid;
        if (testId === 'quick-test') {
          this.api.get<any>('api/knowledge/context?query=hello').then(() => toast.success('Chatbot is working!')).catch(() => toast.info('Add knowledge first'));
        } else if (testId === 'quick-analytics') {
          window.location.href = '/admin/analytics';
        } else {
          toast.info('Complete the setup wizard first');
        }
      });
    });

    this.el.querySelector('[data-testid="btn-load-demo"]')?.addEventListener('click', async () => {
      try {
        await this.api.post('/api/onboarding/seed-demo-data');
        toast.success('Demo data loaded!');
        this.loadData();
      } catch { toast.error('Failed to load demo data'); }
    });
  }

  private renderDashboard(): void {
    this.el.innerHTML = `
      <div style="${S.page}">
        <div style="${S.header}">
          <h1 style="${S.title}">Dashboard</h1>
          <p style="${S.subtitle}">Overview of your conversation engine</p>
        </div>
        <div class="dashboard-grid" data-testid="dashboard-grid">
          <div class="dashboard-card" data-testid="stat-conversations">
            <div class="stat-label">Total Conversations</div>
            <div class="stat-value">${this.stats.conversations}</div>
          </div>
          <div class="dashboard-card" data-testid="stat-messages">
            <div class="stat-label">Messages</div>
            <div class="stat-value">${this.stats.messages}</div>
          </div>
          <div class="dashboard-card" data-testid="stat-sources">
            <div class="stat-label">Knowledge Sources</div>
            <div class="stat-value">${this.stats.sources}</div>
          </div>
        </div>
        <div style="${S.actions}">
          <button data-testid="quick-upload-kb" class="quick-action-btn" style="${S.actionBtn}">
            <div style="${S.actionIcon};background:#fef3c7;">📄</div>
            <span style="${S.actionLabel}">Upload Knowledge</span>
          </button>
          <button data-testid="quick-install-widget" class="quick-action-btn" style="${S.actionBtn}">
            <div style="${S.actionIcon};background:#dbeafe;">💬</div>
            <span style="${S.actionLabel}">Widget Installation</span>
          </button>
          <button data-testid="quick-test-bot" class="quick-action-btn" style="${S.actionBtn}">
            <div style="${S.actionIcon};background:#d1fae5;">🧪</div>
            <span style="${S.actionLabel}">Test Chatbot</span>
          </button>
          <button data-testid="quick-analytics-view" class="quick-action-btn" style="${S.actionBtn}">
            <div style="${S.actionIcon};background:#ede9fe;">📊</div>
            <span style="${S.actionLabel}">View Analytics</span>
          </button>
        </div>
      </div>
    `;

    this.el.querySelectorAll('.quick-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const testId = (btn as HTMLElement).dataset.testid;
        if (testId === 'quick-upload-kb') window.location.href = '/admin/knowledge';
        else if (testId === 'quick-install-widget') window.location.href = '/admin/settings';
        else if (testId === 'quick-test-bot') toast.info('Open your website to test the widget');
        else if (testId === 'quick-analytics-view') window.location.href = '/admin/analytics';
      });
    });
  }
}
