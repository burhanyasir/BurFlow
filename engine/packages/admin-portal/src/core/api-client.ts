export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientConfig {
  baseUrl: string;
  getToken: () => string | null;
}

export class ApiClient {
  private baseUrl: string;
  private getToken: () => string | null;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getToken = config.getToken;
  }

  private async request<T>(method: string, path: string, body?: unknown, params?: Record<string, string | number | undefined>): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
      }
      const str = qs.toString();
      if (str) url += `?${str}`;
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, {
      method, headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new ApiError(response.status, typeof data === 'string' ? data : data?.error || 'Request failed', data);
    }
    return data as T;
  }

  get<T>(path: string, params?: Record<string, string | number | undefined>) { return this.request<T>('GET', path, undefined, params); }
  post<T>(path: string, body?: unknown) { return this.request<T>('POST', path, body); }
  put<T>(path: string, body?: unknown) { return this.request<T>('PUT', path, body); }
  del<T>(path: string) { return this.request<T>('DELETE', path); }

  // Auth
  signup(email: string, password: string, name: string, companyName?: string) {
    return this.post<{ user: any; tenant: any; token: string }>('/api/auth/signup', { email, password, name, companyName });
  }
  login(email: string, password: string) {
    return this.post<{ user: any; tenant: any; token: string }>('/api/auth/login', { email, password });
  }
  getMe() { return this.get<{ user: any; tenants: any[] }>('/api/auth/me'); }
  updateMe(data: { name?: string; avatarUrl?: string }) { return this.put<{ user: any }>('/api/auth/me', data); }
  changePassword(currentPassword: string, newPassword: string) {
    return this.put<{ message: string }>('/api/auth/password', { currentPassword, newPassword });
  }

  // Tenants
  listTenants() { return this.get<{ tenants: any[] }>('/api/tenants'); }
  getTenant(id: string) { return this.get<{ tenant: any }>(`/api/tenants/${id}`); }
  createTenant(name: string) { return this.post<{ tenant: any }>('/api/tenants', { name }); }
  updateTenant(id: string, data: { name?: string; settings?: any }) { return this.put<{ tenant: any }>(`/api/tenants/${id}`, data); }
  deleteTenant(id: string) { return this.del<{ message: string }>(`/api/tenants/${id}`); }
  getMembers(id: string) { return this.get<{ members: any[] }>(`/api/tenants/${id}/members`); }

  // API Keys
  listApiKeys() { return this.get<{ keys: any[] }>('/api/api-keys'); }
  createApiKey(label: string, role?: string) { return this.post<{ key: string; apiKey: any }>('/api/api-keys', { label, role }); }
  revokeApiKey(id: string) { return this.del<{ message: string }>(`/api/api-keys/${id}`); }

  // Conversations
  listConversations(params?: { page?: number; limit?: number }) {
    return this.get<{ conversations: any[]; total: number; page: number; limit: number }>('/api/conversations', params);
  }
  getConversation(id: string) { return this.get<{ conversation: any }>(`/api/conversations/${id}`); }
  getMessages(id: string, params?: { page?: number; limit?: number }) {
    return this.get<{ messages: any[]; total: number }>(`/api/conversations/${id}/messages`, params);
  }

  // Usage
  listUsage(params?: { page?: number; limit?: number }) {
    return this.get<{ records: any[]; total: number }>('/api/usage', params);
  }
  getCurrentUsage() { return this.get<{ usage: any }>('/api/usage/current'); }

  // Knowledge
  listSources(params?: { status?: string; page?: number; pageSize?: number }) {
    return this.get<{ sources: any[]; total: number; page: number; pageSize: number; totalPages: number }>('/api/knowledge/sources', params);
  }
  getSource(id: string) { return this.get<{ source: any }>(`/api/knowledge/sources/${id}`); }
  uploadDocument(filename: string, sourceType: string, content: string) {
    return this.post<{ documentId: string; status: string; queuedAt: string }>('/api/knowledge/upload', { filename, sourceType, content });
  }
  uploadFaq(filename: string | undefined, content: string) {
    return this.post<{ documentId: string; status: string }>('/api/knowledge/upload/faq', { filename, content });
  }
  crawlUrl(url: string, maxDepth?: number, maxPages?: number) {
    return this.post<{ documentId: string; status: string; crawlOptions: any }>('/api/knowledge/crawl', { url, maxDepth, maxPages });
  }
  deleteSource(id: string) { return this.del<{ message: string }>(`/api/knowledge/sources/${id}`); }
  reindexSource(id: string) { return this.post<{ documentId: string; status: string }>(`/api/knowledge/sources/${id}/reindex`); }
  processDocument(id: string, content?: string) {
    return this.post<{ documentId: string; status: string; chunksCreated: number; knowledgeVersion: number }>(`/api/knowledge/process/${id}`, { content: content || '' });
  }
  publishKnowledge() { return this.post<{ published: boolean; knowledgeVersion: number; publishedAt: string; chunkCount: number }>('/api/knowledge/publish'); }
  searchKnowledge(query: string, topK?: number, threshold?: number) {
    return this.post<{ query: string; results: any[]; totalResults: number; retrievalTimeMs: number }>('/api/knowledge/search', { query, topK, threshold });
  }
  getContext(query: string, tokenBudget?: number) {
    return this.post<{ query: string; context: string; tokenCount: number; citations: any[]; chunkCount: number }>('/api/knowledge/context', { query, tokenBudget });
  }
  debugRetrieval(query: string, topK?: number, threshold?: number) {
    return this.post<{ query: string; results: any[]; vectorStats: any; latestKnowledgeVersion: number; allVersions: number[] }>('/api/knowledge/debug', { query, topK, threshold });
  }
  getVersions() { return this.get<{ versions: number[]; latestVersion: number }>('/api/knowledge/versions'); }
  getVersion(version: number) { return this.get<any>(`/api/knowledge/versions/${version}`); }
  getStats() { return this.get<any>('/api/knowledge/stats'); }
}
