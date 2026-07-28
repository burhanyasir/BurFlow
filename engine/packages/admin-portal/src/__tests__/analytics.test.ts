/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsPage } from '../pages/analytics';
import { clearAuth, setAuth } from '../core/auth';

function makeApi(overrides: Record<string, any> = {}): any {
  const defaults: Record<string, (...args: any[]) => Promise<any>> = {
    getCurrentUsage: vi.fn().mockResolvedValue({
      usage: {
        messagesUsed: 150, messagesLimit: 1000,
        tokensUsed: 50000, tokensLimit: 500000,
        storageUsedMb: 12.5, storageLimitMb: 100,
        apiCallsUsed: 200, apiCallsLimit: 2000,
      },
    }),
    getStats: vi.fn().mockResolvedValue({
      vectors: { activeChunks: 256, deletedChunks: 12, totalChunks: 268 },
      sources: { total: 8, published: 6, failed: 1, processing: 1 },
    }),
    getVersions: vi.fn().mockResolvedValue({
      versions: [1, 2, 3, 4, 5], latestVersion: 5,
    }),
  };
  return { ...defaults, ...overrides };
}

describe('AnalyticsPage', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    setAuth({ userId: 'u1', token: 'tok', role: 'admin', tenantId: 't1' });
  });

  it('renders page header', async () => {
    const api = makeApi();
    const page = new AnalyticsPage(api);
    page.mount(container);
    expect(container.textContent).toContain('Analytics');
    expect(container.textContent).toContain('Usage metrics and quality scoring');
    page.unmount();
  });

  it('loads analytics data', async () => {
    const api = makeApi();
    const page = new AnalyticsPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(api.getCurrentUsage).toHaveBeenCalled();
    expect(api.getStats).toHaveBeenCalled();
    expect(api.getVersions).toHaveBeenCalled();
    page.unmount();
  });

  it('displays usage metrics', async () => {
    const api = makeApi();
    const page = new AnalyticsPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.textContent).toContain('Messages');
    expect(container.textContent).toContain('150');
    expect(container.textContent).toContain('1,000');
    expect(container.textContent).toContain('Tokens');
    expect(container.textContent).toContain('50,000');
    page.unmount();
  });

  it('displays knowledge health', async () => {
    const api = makeApi();
    const page = new AnalyticsPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.textContent).toContain('Knowledge Health');
    expect(container.textContent).toContain('256');
    expect(container.textContent).toContain('12');
    expect(container.textContent).toContain('6 / 8');
    page.unmount();
  });

  it('displays version info', async () => {
    const api = makeApi();
    const page = new AnalyticsPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.textContent).toContain('Knowledge Versions');
    expect(container.textContent).toContain('5');
    expect(container.textContent).toContain('Total versions: 5');
    page.unmount();
  });

  it('handles API errors gracefully', async () => {
    const api = makeApi({
      getCurrentUsage: vi.fn().mockRejectedValue(new Error('fail')),
      getStats: vi.fn().mockRejectedValue(new Error('fail')),
      getVersions: vi.fn().mockRejectedValue(new Error('fail')),
    });
    const page = new AnalyticsPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.querySelector('[data-testid="analytics-page"]')).toBeTruthy();
    expect(container.textContent).toContain('No Analytics Data Yet');
    page.unmount();
  });

  it('displays storage and API calls', async () => {
    const api = makeApi();
    const page = new AnalyticsPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.textContent).toContain('Storage (MB)');
    expect(container.textContent).toContain('12.5');
    expect(container.textContent).toContain('API Calls');
    expect(container.textContent).toContain('200');
    page.unmount();
  });
});
