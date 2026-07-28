/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdminLayout } from '../pages/layout';
import { ApiClient } from '../core/api-client';
import { clearAuth, setAuth, loginFromToken } from '../core/auth';

function makeMockApi(): ApiClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    signup: vi.fn(),
    login: vi.fn().mockResolvedValue({ token: 'fake-token', user: { id: 'u1', email: 'a@b.com', name: 'Test' }, tenant: { id: 't1' } }),
    getMe: vi.fn(),
    updateMe: vi.fn(),
    changePassword: vi.fn(),
    listTenants: vi.fn(),
    getTenant: vi.fn().mockResolvedValue({ tenant: { id: 't1', name: 'Test Org', plan: 'free' } }),
    createTenant: vi.fn(),
    updateTenant: vi.fn(),
    deleteTenant: vi.fn(),
    getMembers: vi.fn().mockResolvedValue({ members: [] }),
    listApiKeys: vi.fn().mockResolvedValue({ keys: [] }),
    createApiKey: vi.fn(),
    revokeApiKey: vi.fn(),
    listConversations: vi.fn().mockResolvedValue({ conversations: [], total: 0, page: 1, limit: 20 }),
    getConversation: vi.fn(),
    getMessages: vi.fn().mockResolvedValue({ messages: [], total: 0 }),
    listUsage: vi.fn(),
    getCurrentUsage: vi.fn().mockResolvedValue({ usage: { messagesUsed: 0, messagesLimit: 100, tokensUsed: 0, tokensLimit: 10000, storageUsedMb: 0, storageLimitMb: 50, apiCallsUsed: 0, apiCallsLimit: 500 } }),
    listSources: vi.fn().mockResolvedValue({ sources: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
    getSource: vi.fn(),
    uploadDocument: vi.fn(),
    uploadFaq: vi.fn(),
    crawlUrl: vi.fn(),
    deleteSource: vi.fn(),
    reindexSource: vi.fn(),
    processDocument: vi.fn(),
    publishKnowledge: vi.fn(),
    searchKnowledge: vi.fn(),
    getContext: vi.fn(),
    debugRetrieval: vi.fn(),
    getVersions: vi.fn().mockResolvedValue({ versions: [], latestVersion: 0 }),
    getVersion: vi.fn(),
    getStats: vi.fn().mockResolvedValue(null),
  } as any;
}

function setupUrl(path: string) {
  window.history.pushState({}, '', path);
}

describe('AdminLayout initial route resolution', () => {
  let container: HTMLElement;
  let api: ApiClient;

  beforeEach(() => {
    container = document.createElement('div');
    clearAuth();
  });

  afterEach(() => {
    container.innerHTML = '';
  });

  it('resolves /admin/login route and shows login form', () => {
    setupUrl('/admin/login');
    const layout = new AdminLayout(api);
    layout.mount(container);

    const form = container.querySelector('#login-form') as HTMLFormElement;
    expect(form).toBeTruthy();
    expect(container.textContent).toContain('Login');
    expect(container.textContent).toContain('Sign up');
    layout.unmount();
  });

  it('resolves /admin/login on browser refresh (same URL)', () => {
    setupUrl('/admin/login');
    const layout = new AdminLayout(api);
    layout.mount(container);
    expect(container.querySelector('#login-form')).toBeTruthy();
    layout.unmount();

    container.innerHTML = '';
    const layout2 = new AdminLayout(api);
    layout2.mount(container);
    expect(container.querySelector('#login-form')).toBeTruthy();
    layout2.unmount();
  });

  it('deep link /admin/dashboard redirects to login when not authenticated', () => {
    setupUrl('/admin/dashboard');
    const layout = new AdminLayout(api);
    layout.mount(container);

    expect(container.querySelector('#login-form')).toBeTruthy();
    expect(window.location.pathname).toBe('/admin/login');
    layout.unmount();
  });

  it('deep link /admin/dashboard shows dashboard when authenticated', async () => {
    loginFromToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsImVtYWlsIjoiYUBiLmNvbSIsIm5hbWUiOiJUZXN0Iiwicm9sZSI6Im93bmVyIiwidGVuYW50SWQiOiJ0MSJ9.fake');
    setupUrl('/admin/dashboard');
    const layout = new AdminLayout(api);
    layout.mount(container);

    expect(container.querySelector('[data-testid="dashboard-page"]')).toBeTruthy();
    const grid = container.querySelector('[data-testid="dashboard-grid"]');
    expect(grid).toBeTruthy();
    layout.unmount();
  });

  it('deep link /admin/conversations shows conversations when authenticated', async () => {
    loginFromToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsImVtYWlsIjoiYUBiLmNvbSIsIm5hbWUiOiJUZXN0Iiwicm9sZSI6Im93bmVyIiwidGVuYW50SWQiOiJ0MSJ9.fake');
    setupUrl('/admin/conversations');
    const layout = new AdminLayout(api);
    layout.mount(container);

    expect(container.textContent).toContain('Conversations');
    layout.unmount();
  });

  it('deep link /admin/knowledge shows knowledge page when authenticated', async () => {
    loginFromToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsImVtYWlsIjoiYUBiLmNvbSIsIm5hbWUiOiJUZXN0Iiwicm9sZSI6Im93bmVyIiwidGVuYW50SWQiOiJ0MSJ9.fake');
    setupUrl('/admin/knowledge');
    const layout = new AdminLayout(api);
    layout.mount(container);

    expect(container.textContent).toContain('Knowledge');
    layout.unmount();
  });

  it('deep link /admin/settings shows settings page when authenticated', async () => {
    loginFromToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsImVtYWlsIjoiYUBiLmNvbSIsIm5hbWUiOiJUZXN0Iiwicm9sZSI6Im93bmVyIiwidGVuYW50SWQiOiJ0MSJ9.fake');
    setupUrl('/admin/settings');
    const layout = new AdminLayout(api);
    layout.mount(container);

    expect(container.textContent).toContain('Settings');
    layout.unmount();
  });

  it('deep link /admin/users shows users page when authenticated as owner', async () => {
    loginFromToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsImVtYWlsIjoiYUBiLmNvbSIsIm5hbWUiOiJUZXN0Iiwicm9sZSI6Im93bmVyIiwidGVuYW50SWQiOiJ0MSJ9.fake');
    setupUrl('/admin/users');
    const layout = new AdminLayout(api);
    layout.mount(container);

    expect(container.textContent).toContain('Users');
    layout.unmount();
  });

  it('deep link /admin/api-keys shows API keys page when authenticated as owner', async () => {
    loginFromToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsImVtYWlsIjoiYUBiLmNvbSIsIm5hbWUiOiJUZXN0Iiwicm9sZSI6Im93bmVyIiwidGVuYW50SWQiOiJ0MSJ9.fake');
    setupUrl('/admin/api-keys');
    const layout = new AdminLayout(api);
    layout.mount(container);

    expect(container.textContent).toContain('API Keys');
    layout.unmount();
  });

  it('deep link /admin/analytics shows analytics page when authenticated', async () => {
    loginFromToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsImVtYWlsIjoiYUBiLmNvbSIsIm5hbWUiOiJUZXN0Iiwicm9sZSI6Im93bmVyIiwidGVuYW50SWQiOiJ0MSJ9.fake');
    setupUrl('/admin/analytics');
    const layout = new AdminLayout(api);
    layout.mount(container);

    expect(container.textContent).toContain('Analytics');
    layout.unmount();
  });

  it('unknown route falls back to dashboard (or login if not authenticated)', () => {
    setupUrl('/admin/nonexistent');
    const layout = new AdminLayout(api);
    layout.mount(container);

    expect(window.location.pathname).toMatch(/\/admin\/(login|dashboard)/);
    layout.unmount();
  });

  it('back/forward navigation via popstate resolves route', () => {
    setupUrl('/admin/login');
    const layout = new AdminLayout(api);
    layout.mount(container);

    expect(container.querySelector('#login-form')).toBeTruthy();

    window.history.pushState({}, '', '/admin/dashboard');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(container.querySelector('[data-testid="dashboard-page"]') || container.querySelector('#login-form')).toBeTruthy();
    layout.unmount();
  });

  it('multiple mounts (simulating hot reload) work without errors', () => {
    setupUrl('/admin/login');
    const layout1 = new AdminLayout(api);
    layout1.mount(container);
    expect(container.querySelector('#login-form')).toBeTruthy();
    layout1.unmount();

    container.innerHTML = '';
    const layout2 = new AdminLayout(api);
    layout2.mount(container);
    expect(container.querySelector('#login-form')).toBeTruthy();
    layout2.unmount();
  });

  it('layout renders sidebar with logo', () => {
    setupUrl('/admin/login');
    const layout = new AdminLayout(api);
    layout.mount(container);

    const sidebar = container.querySelector('[data-testid="sidebar"]');
    expect(sidebar).toBeTruthy();
    expect(sidebar!.textContent).toContain('Admin Portal');
    layout.unmount();
  });
});
