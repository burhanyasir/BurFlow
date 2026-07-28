import { Component } from '../core/component';
import { ApiClient } from '../core/api-client';
import { Router } from '../core/router';
import { isAuthenticated, canAccessAdmin, canManageKnowledge, getAuth, onAuthChange, clearAuth, loginFromToken } from '../core/auth';
import { toast } from '../core/toast';
import { DashboardPage } from '../pages/dashboard';
import { ConversationsPage } from '../pages/conversations';
import { KnowledgePage } from '../pages/knowledge';
import { SettingsPage } from '../pages/settings';
import { UsersPage } from '../pages/users';
import { ApiKeysPage } from '../pages/api-keys';
import { AnalyticsPage } from '../pages/analytics';
import { WelcomeDashboard } from '../onboarding/welcome-dashboard';
import { SetupWizard } from '../onboarding/setup-wizard';
import { HelpPanel } from '../onboarding/help-panel';
import { FirstSuccessScreen } from '../onboarding/first-success';
import { getOnboardingProgress, setOnboardingProgress, isOnboardingComplete } from '../onboarding/store';

export class AdminLayout extends Component {
  private api: ApiClient;
  private router: Router;
  private sidebar: HTMLElement | null = null;
  private content: HTMLElement | null = null;
  private currentPage: Component | null = null;
  private activeRoute = '/dashboard';
  private helpPanel: HelpPanel | null = null;
  private wizard: SetupWizard | null = null;
  private onboardingLoaded = false;

  constructor(api: ApiClient) {
    super();
    this.api = api;
    this.router = new Router('/admin');
    this.setTestId('admin-layout');
    this.setupRoutes();
  }

  private setupRoutes(): void {
    const guarded = (handler: () => void, roles?: string[]) => () => {
      if (!isAuthenticated()) { this.router.navigate('/login'); return; }
      if (roles && roles.length > 0) {
        const auth = getAuth();
        if (!roles.includes(auth.role || '')) { this.router.navigate('/dashboard'); return; }
      }
      handler();
    };

    this.router.addRoute('/login', () => this.showLogin(), false);
    this.router.addRoute('/dashboard', guarded(() => this.showDashboard()), true);
    this.router.addRoute('/conversations', guarded(() => this.showPage(new ConversationsPage(this.api), '/conversations')), true);
    this.router.addRoute('/knowledge', guarded(() => this.showPage(new KnowledgePage(this.api), '/knowledge')), true);
    this.router.addRoute('/analytics', guarded(() => this.showPage(new AnalyticsPage(this.api), '/analytics')), true);
    this.router.addRoute('/settings', guarded(() => this.showPage(new SettingsPage(this.api), '/settings')), true);
    this.router.addRoute('/users', guarded(() => this.showPage(new UsersPage(this.api), '/users'), ['owner', 'admin']), true, ['owner', 'admin']);
    this.router.addRoute('/api-keys', guarded(() => this.showPage(new ApiKeysPage(this.api), '/api-keys'), ['owner', 'admin']), true, ['owner', 'admin']);
    this.router.addRoute('/wizard', guarded(() => this.showWizard()), true);
    this.router.onNotFound(() => this.router.navigate('/dashboard'));
  }

  mount(parent: HTMLElement): void {
    super.mount(parent);
    onAuthChange(() => { this.updateSidebar(); this.loadOnboarding(); });
    this.loadOnboarding();
    this.router.resolve();
  }

  private async loadOnboarding(): Promise<void> {
    if (!isAuthenticated() || this.onboardingLoaded) return;
    try {
      const res = await this.api.get<any>('/api/onboarding/progress');
      if (res?.progress) {
        setOnboardingProgress(res.progress);
        this.onboardingLoaded = true;
      }
    } catch { /* ignore */ }
  }

  render(): void {
    this.el.innerHTML = '';
    this.el.style.cssText = 'display:flex;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;';
    this.sidebar = this.createElement('nav', { class: 'sidebar', 'data-testid': 'sidebar' });
    this.sidebar.style.cssText = 'width:240px;background:#1f2937;color:#f9fafb;padding:0;flex-shrink:0;display:flex;flex-direction:column;';
    this.content = this.createElement('main', { class: 'main-content', 'data-testid': 'main-content' });
    this.content.style.cssText = 'flex:1;padding:24px;overflow-y:auto;background:#f9fafb;';
    this.el.appendChild(this.sidebar);
    this.el.appendChild(this.content);
    this.updateSidebar();
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  private updateSidebar(): void {
    if (!this.sidebar) return;
    const auth = getAuth();
    const isLoggedIn = isAuthenticated();
    this.sidebar.innerHTML = '';
    this.sidebar.style.display = 'flex';
    this.sidebar.style.flexDirection = 'column';

    const logo = this.createElement('div', { class: 'sidebar-logo' }, 'Admin Portal');
    logo.style.cssText = 'padding:16px 20px;font-size:18px;font-weight:700;border-bottom:1px solid #374151;margin-bottom:8px;flex-shrink:0;';
    this.sidebar.appendChild(logo);

    if (!isLoggedIn) {
      const loginItem = this.createNavItem('Login', '/login', 'login');
      this.sidebar.appendChild(loginItem);
      return;
    }

    const navContainer = this.createElement('div');
    navContainer.style.cssText = 'flex:1;overflow-y:auto;padding:0 0 8px 0;';

    const navItems = [
      { label: 'Dashboard', path: '/dashboard', icon: '\u25A0' },
      { label: 'Conversations', path: '/conversations', icon: '\u25A0' },
      { label: 'Knowledge', path: '/knowledge', icon: '\u25A0' },
      { label: 'Analytics', path: '/analytics', icon: '\u25A0' },
      { label: 'Settings', path: '/settings', icon: '\u25A0' },
    ];
    if (canAccessAdmin()) {
      navItems.push({ label: 'Users', path: '/users', icon: '\u25A0' });
      navItems.push({ label: 'API Keys', path: '/api-keys', icon: '\u25A0' });
    }

    navItems.forEach(item => {
      navContainer.appendChild(this.createNavItem(item.label, item.path, item.path.replace('/', '')));
    });

    this.sidebar.appendChild(navContainer);

    const userSection = document.createElement('div');
    userSection.style.cssText = 'padding:12px 20px;border-top:1px solid #374151;flex-shrink:0;';
    userSection.innerHTML = `<div style="font-size:13px;color:#9ca3af;">${this.esc(auth.name || auth.email || '')}</div><div style="font-size:11px;color:#6b7280;margin-bottom:8px;">${this.esc(auth.role || '')}</div>`;

    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Logout';
    logoutBtn.style.cssText = 'width:100%;padding:8px;background:transparent;color:#9ca3af;border:1px solid #374151;border-radius:6px;font-size:13px;cursor:pointer;font-family:inherit;';
    logoutBtn.onmouseover = () => { logoutBtn.style.background = '#374151'; logoutBtn.style.color = '#f9fafb'; };
    logoutBtn.onmouseout = () => { logoutBtn.style.background = 'transparent'; logoutBtn.style.color = '#9ca3af'; };
    logoutBtn.onclick = () => {
      clearAuth();
      this.router.navigate('/login');
    };
    userSection.appendChild(logoutBtn);
    this.sidebar.appendChild(userSection);

    // Help panel
    this.helpPanel?.unmount();
    this.helpPanel = new HelpPanel();
    this.helpPanel.mount(this.sidebar);
  }

  private createNavItem(label: string, path: string, testId: string): HTMLElement {
    const item = document.createElement('button');
    item.setAttribute('data-testid', `nav-${testId}`);
    item.textContent = label;
    item.style.cssText = `display:block;width:100%;text-align:left;padding:10px 20px;border:none;background:${this.activeRoute === path ? '#374151' : 'transparent'};color:#f9fafb;cursor:pointer;font-size:14px;border-left:3px solid ${this.activeRoute === path ? '#3b82f6' : 'transparent'};font-family:inherit;`;
    item.onmouseover = () => { if (this.activeRoute !== path) item.style.background = '#2d3748'; };
    item.onmouseout = () => { item.style.background = this.activeRoute === path ? '#374151' : 'transparent'; };
    item.onclick = () => this.router.navigate(path);
    return item;
  }

  private showDashboard(): void {
    const progress = getOnboardingProgress();
    const completed = isOnboardingComplete();

    // If onboarding hasn't loaded yet, try loading it
    if (!this.onboardingLoaded) {
      this.loadOnboarding().then(() => {
        const p = getOnboardingProgress();
        if (p && !isOnboardingComplete()) {
          this.showPage(new WelcomeDashboard(this.api, () => this.showWizard()), '/dashboard');
        } else {
          this.showPage(new DashboardPage(this.api), '/dashboard');
        }
      });
      // Show a loading state
      this.showPage(new DashboardPage(this.api), '/dashboard');
      return;
    }

    if (progress && !completed) {
      this.showPage(new WelcomeDashboard(this.api, () => this.showWizard()), '/dashboard');
    } else {
      this.showPage(new DashboardPage(this.api), '/dashboard');
    }
  }

  private showWizard(): void {
    this.wizard?.unmount();
    this.wizard = new SetupWizard(this.api, {
      onComplete: () => {
        this.wizard?.unmount();
        this.wizard = null;
        this.showDashboard();
        // Show success screen
        const success = new FirstSuccessScreen({
          onTestChatbot: () => { success.unmount(); toast.success('Test your chatbot from the Knowledge page'); },
          onViewDashboard: () => { success.unmount(); this.router.navigate('/dashboard'); },
          onGoToAnalytics: () => { success.unmount(); this.router.navigate('/analytics'); },
        });
        success.mount(document.body);
      },
      onClose: () => {
        this.wizard?.unmount();
        this.wizard = null;
      },
    });
    this.wizard.mount(document.body);
  }

  private showPage(page: Component, route: string): void {
    this.currentPage?.unmount();
    this.currentPage = page;
    this.activeRoute = route;
    this.updateSidebar();
    if (this.content) {
      this.content.innerHTML = '';
      page.mount(this.content);
    }
  }

  private showLogin(): void {
    this.currentPage?.unmount();
    this.currentPage = null;
    if (this.content) {
      this.content.innerHTML = `
        <div style="max-width:400px;margin:80px auto;">
          <h1 style="text-align:center;margin-bottom:24px;">Login</h1>
          <form id="login-form" data-testid="login-form">
            <div class="form-group"><label>Email</label><input type="email" class="form-input" data-testid="login-email" id="login-email" required /></div>
            <div class="form-group"><label>Password</label><input type="password" class="form-input" data-testid="login-password" id="login-password" required /></div>
            <div id="login-error" data-testid="login-error" style="color:#ef4444;margin:8px 0;display:none;"></div>
            <button type="submit" class="btn btn-primary" data-testid="login-submit" style="width:100%;">Login</button>
          </form>
          <p style="text-align:center;margin-top:16px;font-size:14px;color:#6b7280;">Don't have an account? <a href="/admin/signup" data-testid="signup-link">Sign up</a></p>
        </div>
      `;
      document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = (document.getElementById('login-email') as HTMLInputElement).value;
        const password = (document.getElementById('login-password') as HTMLInputElement).value;
        const errorEl = document.getElementById('login-error')!;
        try {
          const res = await this.api.login(email, password);
          loginFromToken(res.token);
          this.loadOnboarding();
          this.router.navigate('/dashboard');
        } catch (err: any) {
          errorEl.textContent = err.message || 'Login failed';
          errorEl.style.display = 'block';
        }
      });
    }
  }

  getRouter(): Router { return this.router; }
}
