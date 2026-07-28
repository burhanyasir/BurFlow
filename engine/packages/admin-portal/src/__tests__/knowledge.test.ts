/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KnowledgePage } from '../pages/knowledge';
import { clearAuth, setAuth } from '../core/auth';

function makeApi(overrides: Record<string, any> = {}): any {
  const defaults: Record<string, (...args: any[]) => Promise<any>> = {
    listSources: vi.fn().mockResolvedValue({
      sources: [
        { documentId: 'd1', originalName: 'test.txt', sourceType: 'upload', status: 'published', queuedAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:01:00Z' },
        { documentId: 'd2', originalName: 'faq.txt', sourceType: 'upload', status: 'queued', queuedAt: '2026-01-02T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' },
      ],
      total: 2, page: 1, pageSize: 50, totalPages: 1,
    }),
    getStats: vi.fn().mockResolvedValue({ vectors: { activeChunks: 10 }, sources: { total: 2, published: 1, failed: 0, processing: 0 } }),
    uploadDocument: vi.fn().mockResolvedValue({ documentId: 'd3', status: 'queued' }),
    uploadFaq: vi.fn().mockResolvedValue({ documentId: 'd4', status: 'queued' }),
    crawlUrl: vi.fn().mockResolvedValue({ documentId: 'd5', status: 'queued' }),
    deleteSource: vi.fn().mockResolvedValue({ message: 'deleted' }),
    processDocument: vi.fn().mockResolvedValue({ documentId: 'd1', status: 'indexed' }),
    publishKnowledge: vi.fn().mockResolvedValue({ published: true, knowledgeVersion: 1, chunkCount: 10 }),
    searchKnowledge: vi.fn().mockResolvedValue({ results: [], totalResults: 0 }),
  };
  return { ...defaults, ...overrides };
}

describe('KnowledgePage', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    setAuth({ userId: 'u1', token: 'tok', role: 'admin', tenantId: 't1' });
  });

  it('renders page header', async () => {
    const api = makeApi();
    const page = new KnowledgePage(api);
    page.mount(container);
    expect(container.textContent).toContain('Knowledge Management');
    expect(container.textContent).toContain('Manage your knowledge sources');
    page.unmount();
  });

  it('loads sources', async () => {
    const api = makeApi();
    const page = new KnowledgePage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(api.listSources).toHaveBeenCalled();
    expect(container.textContent).toContain('test.txt');
    expect(container.textContent).toContain('faq.txt');
    page.unmount();
  });

  it('upload button opens modal', async () => {
    const api = makeApi();
    const page = new KnowledgePage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 100));
    const uploadBtn = container.querySelector('[data-testid="btn-upload"]') as HTMLElement;
    if (uploadBtn) {
      uploadBtn.click();
      await new Promise(r => setTimeout(r, 100));
      expect(document.querySelector('.modal-backdrop')).toBeTruthy();
      document.querySelector('.modal-close')?.dispatchEvent(new MouseEvent('click'));
    }
    page.unmount();
  });

  it('handles API error gracefully', async () => {
    const api = makeApi({
      listSources: vi.fn().mockRejectedValue(new Error('fail')),
      getStats: vi.fn().mockRejectedValue(new Error('fail')),
    });
    const page = new KnowledgePage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.querySelector('[data-testid="knowledge-page"]')).toBeTruthy();
    page.unmount();
  });

  it('shows empty state when no sources', async () => {
    const api = makeApi({
      listSources: vi.fn().mockResolvedValue({ sources: [], total: 0, page: 1, pageSize: 50, totalPages: 0 }),
    });
    const page = new KnowledgePage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    expect(container.textContent).toContain('No Knowledge Sources Yet');
    page.unmount();
  });

  it('status filter select is rendered', async () => {
    const api = makeApi();
    const page = new KnowledgePage(api);
    page.mount(container);
    await new Promise(r => setTimeout(r, 50));
    const select = container.querySelector('[data-testid="status-filter"]') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.tagName).toBe('SELECT');
    const options = select.querySelectorAll('option');
    expect(options.length).toBeGreaterThan(1);
    page.unmount();
  });
});
