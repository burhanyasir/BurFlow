/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardPage } from '../pages/dashboard';
import { ApiClient } from '../core/api-client';
import { setAuth, clearAuth } from '../core/auth';

function makeApi(overrides: Record<string, any> = {}): ApiClient {
  const defaults: Record<string, (...args: any[]) => Promise<any>> = {
    getCurrentUsage: vi.fn().mockResolvedValue({ usage: { messagesUsed: 10, messagesLimit: 100, tokensUsed: 500, tokensLimit: 10000, storageUsedMb: 2, storageLimitMb: 50, apiCallsUsed: 20, apiCallsLimit: 500 } }),
    listConversations: vi.fn().mockResolvedValue({ total: 5, conversations: [] }),
    listSources: vi.fn().mockResolvedValue({ total: 3, sources: [] }),
    getStats: vi.fn().mockResolvedValue({ vectors: { activeChunks: 42, deletedChunks: 1 }, sources: { total: 3, published: 2, failed: 0, processing: 1 } }),
    getVersions: vi.fn().mockResolvedValue({ versions: [1, 2, 3], latestVersion: 3 }),
    listApiKeys: vi.fn().mockResolvedValue({ keys: [{ id: 'k1' }, { id: 'k2' }] }),
  };
  const merged = { ...defaults, ...overrides };
  return { get: (...a: any[]) => merged.getCurrentUsage(...a), post: (...a: any[]) => merged.getCurrentUsage(...a), put: (...a: any[]) => merged.getCurrentUsage(...a), del: (...a: any[]) => merged.getCurrentUsage(...a), getCurrentUsage: merged.getCurrentUsage, listConversations: merged.listConversations, listSources: merged.listSources, getStats: merged.getStats, getVersions: merged.getVersions, listApiKeys: merged.listApiKeys } as any;
}

describe('DashboardPage', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    clearAuth();
  });

  it('renders without crashing', async () => {
    const api = makeApi();
    const page = new DashboardPage(api);
    page.mount(container);
    expect(container.querySelector('[data-testid="dashboard-page"]')).toBeTruthy();
    expect(container.querySelector('.page-header')).toBeTruthy();
    expect(container.textContent).toContain('Dashboard');
    page.unmount();
  });

  it('shows stat cards', async () => {
    const api = makeApi();
    const page = new DashboardPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.textContent).toContain('Total Conversations');
    expect(container.textContent).toContain('Messages This Month');
    expect(container.textContent).toContain('Tokens This Month');
    expect(container.textContent).toContain('Knowledge Sources');
    expect(container.textContent).toContain('Total Chunks');
    expect(container.textContent).toContain('API Keys');
    page.unmount();
  });

  it('loads data from APIs', async () => {
    const api = makeApi();
    const page = new DashboardPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(api.getCurrentUsage).toHaveBeenCalled();
    expect(api.listConversations).toHaveBeenCalled();
    expect(api.listSources).toHaveBeenCalled();
    expect(api.getStats).toHaveBeenCalled();
    expect(api.listApiKeys).toHaveBeenCalled();
    page.unmount();
  });

  it('handles API errors gracefully', async () => {
    const api = makeApi({
      getCurrentUsage: vi.fn().mockRejectedValue(new Error('fail')),
      listConversations: vi.fn().mockRejectedValue(new Error('fail')),
      listSources: vi.fn().mockRejectedValue(new Error('fail')),
      getStats: vi.fn().mockRejectedValue(new Error('fail')),
      listApiKeys: vi.fn().mockRejectedValue(new Error('fail')),
      getVersions: vi.fn().mockRejectedValue(new Error('fail')),
    });
    const page = new DashboardPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.querySelector('[data-testid="dashboard-page"]')).toBeTruthy();
    page.unmount();
  });

  it('displays usage values', async () => {
    const api = makeApi();
    const page = new DashboardPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.textContent).toContain('10');
    expect(container.textContent).toContain('500');
    page.unmount();
  });
});
