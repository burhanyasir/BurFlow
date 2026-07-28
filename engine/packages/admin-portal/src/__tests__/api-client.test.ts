import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient, ApiError } from '../core/api-client';

function mockFetch(response: any, ok = true, status = 200, contentType = 'application/json') {
  const text = contentType.includes('json') ? JSON.stringify(response) : String(response);
  vi.fn().mockResolvedValue({
    ok, status, headers: { get: (h: string) => h === 'content-type' ? contentType : null },
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(text),
  });
}

describe('ApiClient', () => {
  let client: ApiClient;
  let fetchSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    client = new ApiClient({ baseUrl: 'http://api.test', getToken: () => 'test-token' });
  });

  it('sends Authorization header', async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ user: {} }) });
    await client.getMe();
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://api.test/api/auth/me',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) })
    );
  });

  it('omits Authorization when token is null', async () => {
    client = new ApiClient({ baseUrl: 'http://api.test', getToken: () => null });
    fetchSpy.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ user: {} }) });
    await client.getMe();
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://api.test/api/auth/me',
      expect.objectContaining({ headers: expect.not.objectContaining({ Authorization: expect.any(String) }) })
    );
  });

  it('builds query string from params', async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve({}) });
    await client.listConversations({ page: 2, limit: 10 });
    expect(fetchSpy).toHaveBeenCalledWith('http://api.test/api/conversations?page=2&limit=10', expect.anything());
  });

  it('skips undefined params', async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve({}) });
    await client.listSources({ status: 'indexed', page: undefined, pageSize: 50 });
    expect(fetchSpy).toHaveBeenCalledWith('http://api.test/api/knowledge/sources?status=indexed&pageSize=50', expect.anything());
  });

  it('strips trailing slash from baseUrl', async () => {
    client = new ApiClient({ baseUrl: 'http://api.test/', getToken: () => null });
    fetchSpy.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve({}) });
    await client.getMe();
    expect(fetchSpy).toHaveBeenCalledWith('http://api.test/api/auth/me', expect.anything());
  });

  it('throws ApiError on non-OK response', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 404, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ error: 'Not found' }) });
    await expect(client.getMe()).rejects.toThrow(ApiError);
    await expect(client.getMe()).rejects.toMatchObject({ status: 404 });
  });

  it('throws ApiError with text body', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 500, headers: { get: () => 'text/plain' }, text: () => Promise.resolve('Server error') });
    await expect(client.getMe()).rejects.toThrow('Server error');
  });

  it('sends POST body as JSON', async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve({}) });
    await client.signup('a@b.com', 'pass', 'Alice');
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://api.test/api/auth/signup',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'a@b.com', password: 'pass', name: 'Alice' }) })
    );
  });

  it('sends DELETE without body', async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ message: 'deleted' }) });
    await client.deleteTenant('t1');
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://api.test/api/tenants/t1',
      expect.objectContaining({ method: 'DELETE', body: undefined })
    );
  });

  it('uploads document', async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ documentId: 'd1', status: 'queued' }) });
    const res = await client.uploadDocument('test.txt', 'upload', 'content');
    expect(res.documentId).toBe('d1');
    expect(res.status).toBe('queued');
  });

  it('crawlUrl sends correct payload', async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ documentId: 'd2' }) });
    await client.crawlUrl('http://example.com', 3, 10);
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://api.test/api/knowledge/crawl',
      expect.objectContaining({ body: JSON.stringify({ url: 'http://example.com', maxDepth: 3, maxPages: 10 }) })
    );
  });

  it('searchKnowledge sends query', async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ query: 'test', results: [] }) });
    const res = await client.searchKnowledge('test query', 5, 0.5);
    expect(res.query).toBe('test');
    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sentBody.query).toBe('test query');
    expect(sentBody.topK).toBe(5);
    expect(sentBody.threshold).toBe(0.5);
  });

  it('publishKnowledge works', async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ published: true, knowledgeVersion: 1 }) });
    const res = await client.publishKnowledge();
    expect(res.published).toBe(true);
    expect(res.knowledgeVersion).toBe(1);
  });

  it('ApiError has correct name', () => {
    const err = new ApiError(400, 'Bad');
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(400);
    expect(err.message).toBe('Bad');
  });

  it('createApiKey returns key', async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ key: 'sk_abc', apiKey: { id: 'k1' } }) });
    const res = await client.createApiKey('My Key', 'admin');
    expect(res.key).toBe('sk_abc');
  });

  it('listApiKeys returns array', async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ keys: [] }) });
    const res = await client.listApiKeys();
    expect(res.keys).toEqual([]);
  });

  it('getContext sends query and tokenBudget', async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ context: 'ctx', citations: [] }) });
    await client.getContext('question', 2000);
    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sentBody.query).toBe('question');
    expect(sentBody.tokenBudget).toBe(2000);
  });

  it('getStats works', async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ vectors: { activeChunks: 100 } }) });
    const res = await client.getStats();
    expect(res.vectors.activeChunks).toBe(100);
  });

  it('getVersions works', async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ versions: [1, 2], latestVersion: 2 }) });
    const res = await client.getVersions();
    expect(res.latestVersion).toBe(2);
  });
});
