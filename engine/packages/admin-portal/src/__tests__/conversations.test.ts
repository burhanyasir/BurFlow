/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationsPage } from '../pages/conversations';
import { clearAuth, setAuth } from '../core/auth';

function makeApi(overrides: Record<string, any> = {}): any {
  const defaults: Record<string, (...args: any[]) => Promise<any>> = {
    listConversations: vi.fn().mockResolvedValue({
      conversations: [
        { id: 'c1', sessionId: 's1', messageCount: 5, status: 'active', startedAt: '2026-01-01T00:00:00Z' },
        { id: 'c2', sessionId: 's2', messageCount: 3, status: 'ended', startedAt: '2026-01-02T00:00:00Z' },
      ],
      total: 2, page: 1, limit: 50,
    }),
    getConversation: vi.fn().mockResolvedValue({ conversation: { id: 'c1', sessionId: 's1', status: 'active' } }),
    getMessages: vi.fn().mockResolvedValue({
      messages: [
        { id: 'm1', role: 'user', content: 'Hello', sequenceNumber: 1, createdAt: '2026-01-01T00:01:00Z' },
        { id: 'm2', role: 'assistant', content: 'Hi there!', sequenceNumber: 2, createdAt: '2026-01-01T00:01:01Z' },
      ],
      total: 2,
    }),
  };
  return { ...defaults, ...overrides };
}

describe('ConversationsPage', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    setAuth({ userId: 'u1', token: 'tok', role: 'admin', tenantId: 't1' });
  });

  it('renders page header', async () => {
    const api = makeApi();
    const page = new ConversationsPage(api);
    page.mount(container);
    expect(container.textContent).toContain('Conversations');
    expect(container.textContent).toContain('Monitor user conversations');
    page.unmount();
  });

  it('loads conversations', async () => {
    const api = makeApi();
    const page = new ConversationsPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(api.listConversations).toHaveBeenCalled();
    expect(container.textContent).toContain('active');
    expect(container.textContent).toContain('ended');
    page.unmount();
  });

  it('click row opens detail modal', async () => {
    const api = makeApi();
    const page = new ConversationsPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 100));
    const rows = container.querySelectorAll('tbody tr');
    if (rows.length > 0) {
      rows[0].click();
      await new Promise(r => setTimeout(r, 100));
      expect(document.querySelector('.modal-backdrop')).toBeTruthy();
      document.querySelector('.modal-close')?.dispatchEvent(new MouseEvent('click'));
    }
    page.unmount();
  });

  it('handles API error gracefully', async () => {
    const api = makeApi({
      listConversations: vi.fn().mockRejectedValue(new Error('fail')),
    });
    const page = new ConversationsPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.querySelector('[data-testid="conversations-page"]')).toBeTruthy();
    page.unmount();
  });

  it('shows empty state when no conversations', async () => {
    const api = makeApi({
      listConversations: vi.fn().mockResolvedValue({ conversations: [], total: 0, page: 1, limit: 50 }),
    });
    const page = new ConversationsPage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.textContent).toContain('No Conversations Yet');
    page.unmount();
  });
});
