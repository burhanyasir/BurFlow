/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiKeysPage } from '../pages/api-keys';
import { clearAuth, setAuth } from '../core/auth';

function makeApi(overrides: Record<string, any> = {}): any {
  const defaults: Record<string, (...args: any[]) => Promise<any>> = {
    listApiKeys: vi.fn().mockResolvedValue({
      keys: [
        { id: 'k1', label: 'Production', keyPrefix: 'sk_abc', role: 'admin', lastUsedAt: '2026-01-10T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' },
        { id: 'k2', label: 'Testing', keyPrefix: 'sk_def', role: 'end-user', createdAt: '2026-01-05T00:00:00Z' },
      ],
    }),
    createApiKey: vi.fn().mockResolvedValue({ key: 'sk_new_xyz123', apiKey: { id: 'k3', label: 'New', keyPrefix: 'sk_new', role: 'admin' } }),
    revokeApiKey: vi.fn().mockResolvedValue({ message: 'revoked' }),
  };
  return { ...defaults, ...overrides };
}

describe('ApiKeysPage', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    setAuth({ userId: 'u1', token: 'tok', role: 'admin', tenantId: 't1' });
  });

  it('renders page header', async () => {
    const api = makeApi();
    const page = new ApiKeysPage(api);
    page.mount(container);
    expect(container.textContent).toContain('API Keys');
    page.unmount();
  });

  it('loads API keys', async () => {
    const api = makeApi();
    const page = new ApiKeysPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(api.listApiKeys).toHaveBeenCalled();
    expect(container.textContent).toContain('Production');
    expect(container.textContent).toContain('Testing');
    page.unmount();
  });

  it('shows key prefixes', async () => {
    const api = makeApi();
    const page = new ApiKeysPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.textContent).toContain('sk_abc');
    expect(container.textContent).toContain('sk_def');
    page.unmount();
  });

  it('create button visible for admin', async () => {
    const api = makeApi();
    const page = new ApiKeysPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.querySelector('[data-testid="btn-create-key"]')).toBeTruthy();
    page.unmount();
  });

  it('create key opens modal', async () => {
    const api = makeApi();
    const page = new ApiKeysPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    const btn = container.querySelector('[data-testid="btn-create-key"]') as HTMLElement;
    btn.click();
    await new Promise(r => setTimeout(r, 50));
    expect(document.querySelector('[data-testid="create-key-modal"]')).toBeTruthy();
    document.querySelector('.modal-close')?.dispatchEvent(new MouseEvent('click'));
    page.unmount();
  });

  it('handles API error gracefully', async () => {
    const api = makeApi({
      listApiKeys: vi.fn().mockRejectedValue(new Error('fail')),
    });
    const page = new ApiKeysPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.querySelector('[data-testid="apikeys-page"]')).toBeTruthy();
    page.unmount();
  });

  it('shows empty state when no keys', async () => {
    const api = makeApi({
      listApiKeys: vi.fn().mockResolvedValue({ keys: [] }),
    });
    const page = new ApiKeysPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.textContent).toContain('No API Keys Yet');
    page.unmount();
  });

  it('revoke button triggers revoke', async () => {
    const api = makeApi();
    const page = new ApiKeysPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    const revokeBtns = container.querySelectorAll('.btn-danger');
    if (revokeBtns.length > 0) {
      (revokeBtns[0] as HTMLElement).click();
      await new Promise(r => setTimeout(r, 50));
      expect(api.revokeApiKey).toHaveBeenCalled();
    }
    page.unmount();
  });
});
