// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Tokenless autoInit bootstrap ─────────────────────────
// jsdom always reports document.currentScript === null, which reproduces the
// async/defer/module loading condition where the widget previously stayed
// dormant (missing launcher bubble).
describe('widget autoInit (tokenless bootstrap)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Simulate the embed snippet: a script tag carrying data-tenant-id.
    const script = document.createElement('script');
    script.src = '/widget/widget.js';
    script.setAttribute('data-tenant-id', 'demo-tenant');
    script.setAttribute('data-primary-color', '#123456');
    document.body.appendChild(script);

    // Page is fully loaded — autoInit should run immediately, not wait for
    // DOMContentLoaded.
    try {
      Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
    } catch {
      // Some jsdom versions expose readyState as a non-configurable getter.
    }

    const fetchMock = vi.fn();
    (globalThis as any).fetch = fetchMock;
    delete (window as any).__CURRENT_WIDGET;
    delete (window as any).__BurFlowWidgetInstance;
  });

  afterEach(() => {
    const widget = (window as any).__CURRENT_WIDGET || (window as any).__BurFlowWidgetInstance;
    if (widget && typeof widget.destroy === 'function') {
      widget.destroy();
    } else if (widget && typeof widget.unmount === 'function') {
      widget.unmount();
    }
    delete (window as any).__CURRENT_WIDGET;
    delete (window as any).__BurFlowWidgetInstance;
    vi.resetModules();
  });

  it('mounts the launcher via DOM fallback when the token exchange fails', async () => {
    (globalThis as any).fetch.mockRejectedValue(new Error('network down'));

    await import('../index');
    await new Promise((r) => setTimeout(r, 30));

    expect((window as any).__CURRENT_WIDGET).toBeTruthy();
    // The bubble must render even though the backend was unreachable.
    expect(document.querySelector('.cw-bubble')).toBeTruthy();
  });

  it('exchanges the tenant id and initializes with the minted token on success', async () => {
    (globalThis as any).fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'fresh-minted-token' }),
    });

    await import('../index');
    await new Promise((r) => setTimeout(r, 30));

    expect((globalThis as any).fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/widget/public-token?tenantId=demo-tenant'),
    );
    const widget = (window as any).__CURRENT_WIDGET;
    expect(widget).toBeTruthy();
    expect(document.querySelector('.cw-bubble')).toBeTruthy();
  });

  it('does not initialize when no widget script attributes are present', async () => {
    document.body.innerHTML = '';

    await import('../index');
    await new Promise((r) => setTimeout(r, 30));

    expect((window as any).__CURRENT_WIDGET).toBeUndefined();
  });

  it('loads remote config same-origin (no data-api-url) after the token exchange', async () => {
    // data-tenant-id only, no data-api-url → empty apiUrl means same-origin.
    const fetchMock = (globalThis as any).fetch;
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'fresh-minted-token' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          companyName: 'BrandCo',
          launcherText: 'Chat with BrandCo',
          starterOptions: ['Option A', 'Option B'],
          greeting: 'Hi from BrandCo',
        }),
      });

    await import('../index');
    await new Promise((r) => setTimeout(r, 50));

    const calls = fetchMock.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((u: string) => u.includes('/api/widget/public-token?tenantId=demo-tenant'))).toBe(true);
    // Same-origin config fetch must use a relative URL (empty apiUrl base) and
    // must actually run — the old guard skipped it when apiUrl was empty.
    expect(calls.some((u: string) => u.startsWith('/api/widget/config?token='))).toBe(true);
    const widget = (window as any).__CURRENT_WIDGET;
    expect(widget.config.companyName).toBe('BrandCo');
    expect(widget.config.launcherText).toBe('Chat with BrandCo');
  });

  it('applies remote config (companyName, starterOptions, placeholder) after remote config loads', async () => {
    const fetchMock = (globalThis as any).fetch;
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'fresh-minted-token' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          companyName: 'MTH Medical Store',
          starterOptions: ['🛒 Show top selling health products', '🚚 How does same-day delivery work?', '🔄 What is your return policy?'],
          businessProfile: { business_type: 'ecommerce', company_name: 'MTH Medical Store' },
        }),
      });

    await import('../index');
    await new Promise((r) => setTimeout(r, 50));

    const widget = (window as any).__CURRENT_WIDGET;
    expect(widget.config.companyName).toBe('MTH Medical Store');
    expect(widget.config.starterOptions).toContain('🛒 Show top selling health products');
    // Input placeholder must be store-oriented after the config applies.
    expect(widget.inputEl.placeholder).toContain('What products');
  });
});
