/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsPage } from '../pages/settings';
import { clearAuth, setAuth } from '../core/auth';

function makeApi(overrides: Record<string, any> = {}): any {
  const defaults: Record<string, (...args: any[]) => Promise<any>> = {
    getTenant: vi.fn().mockResolvedValue({
      tenant: {
        id: 't1', name: 'Test Tenant', ownerId: 'u1', plan: 'professional',
        settings: {
          branding: { primaryColor: '#3b82f6', companyName: 'Acme', welcomeMessage: 'Hi!', offlineMessage: 'We are offline' },
          ai: { systemPrompt: 'You are helpful', model: 'gpt-4', temperature: 0.7, maxTokens: 2048, fallbackResponse: 'Sorry' },
          safety: { contentFilterThreshold: 'moderate', crisisResponseEnabled: true, piiRedactionMode: 'notify' },
          widget: { position: 'bottom-right', theme: 'light', autoOpen: false },
        },
      },
    }),
    updateTenant: vi.fn().mockResolvedValue({ tenant: { id: 't1' } }),
  };
  return { ...defaults, ...overrides };
}

describe('SettingsPage', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    setAuth({ userId: 'u1', token: 'tok', role: 'admin', tenantId: 't1' });
  });

  it('renders page header', async () => {
    const api = makeApi();
    const page = new SettingsPage(api);
    page.mount(container);
    expect(container.textContent).toContain('Settings');
    expect(container.textContent).toContain('Configure your tenant');
    page.unmount();
  });

  it('loads tenant settings', async () => {
    const api = makeApi();
    const page = new SettingsPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(api.getTenant).toHaveBeenCalled();
    page.unmount();
  });

  it('displays tabs', async () => {
    const api = makeApi();
    const page = new SettingsPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.textContent).toContain('Branding');
    expect(container.textContent).toContain('AI Prompt');
    expect(container.textContent).toContain('Safety');
    expect(container.textContent).toContain('Widget');
    page.unmount();
  });

  it('handles API error gracefully', async () => {
    const api = makeApi({
      getTenant: vi.fn().mockRejectedValue(new Error('fail')),
    });
    const page = new SettingsPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.querySelector('[data-testid="settings-page"]')).toBeTruthy();
    page.unmount();
  });

  it('displays branding values', async () => {
    const api = makeApi();
    const page = new SettingsPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    const companyInput = container.querySelector('[data-testid="input-company"]') as HTMLInputElement;
    expect(companyInput?.value).toBe('Acme');
    const welcomeTextarea = container.querySelector('[data-testid="input-welcome"]') as HTMLTextAreaElement;
    expect(welcomeTextarea?.value).toBe('Hi!');
    page.unmount();
  });
});
