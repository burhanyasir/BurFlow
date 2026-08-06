import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'http';
import { createChatRoutes } from '../routes/chat';
import { executePipeline } from '../orchestrator';

vi.mock('../orchestrator', () => ({
  executePipeline: vi.fn(),
  getState: vi.fn(),
}));

describe('chat streaming route', () => {
  const executePipelineMock = vi.mocked(executePipeline);

  class MemoryRepo {
    public created: any[] = [];
    findBySession() { return null; }
    create(data: any) { this.created.push(data); return { id: 'conv-1', ...data }; }
    incrementMessageCount() {}
  }

  const conversationRepo = new MemoryRepo();
  const messageRepo = new MemoryRepo();
  const usageRepo = { incrementMessages: vi.fn() };

  let server: http.Server | undefined;
  let port = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    conversationRepo.created = [];
    messageRepo.created = [];
    usageRepo.incrementMessages.mockClear();
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
      server = undefined;
      port = 0;
    }
  });

  function startServer() {
    const app = express();
    app.use(express.json());
    app.use((req: any, _res: any, next: any) => {
      req.tenantId = 'tenant-1';
      next();
    });
    app.use('/api/chat', createChatRoutes(conversationRepo as any, messageRepo as any, usageRepo as any));
    server = app.listen(0);
    port = (server.address() as any).port;
  }

  function requestJson(method: string, path: string, body?: any, headers?: Record<string, string>) {
    return new Promise<{ statusCode: number; body: string; headers: http.IncomingHttpHeaders }>((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port, path, method, headers: { 'content-type': 'application/json', ...(headers || {}) } }, (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: raw, headers: res.headers }));
      });
      req.on('error', reject);
      req.write(body ? JSON.stringify(body) : '');
      req.end();
    });
  }

  it('streams SSE UI state events and supports fallback JSON', async () => {
    startServer();
    executePipelineMock.mockReturnValue({
      response: 'Hello there',
      strategy: 'answer',
      mood: 'friendly',
      trustScore: 80,
      buyingIntentScore: 40,
      stage: 'discovery',
      state: {} as any,
      composition: { text: 'Hello there', leakageDetected: false, duplicatesRemoved: 0 },
      policy: { strategy: 'answer', priority: 1, buyingSignalDetected: false, canQualify: false, canShowCTA: false, detectedTopics: [], detectedUseCase: null, detectedIndustry: null },
      uiState: { buttons: [], suggestedActions: [{ id: 'a1', label: 'Book demo', action: 'send_text', payload: 'Book demo', variant: 'primary' }], activeCard: { type: 'pricing', data: { plan: 'Pro' } } },
      cta: { label: 'Book demo', link: 'https://example.com/demo' },
      isRapportHandled: false,
      traceId: 'trace-1',
      latencyMs: 12,
    } as any);

    const sseRes = await requestJson('POST', '/api/chat/stream', { message: 'Hello', sessionId: 'abc' }, { accept: 'text/event-stream' });
    expect(sseRes.statusCode).toBe(200);
    expect(sseRes.headers['content-type']).toContain('text/event-stream');
    expect(sseRes.body).toContain('ui_state');
    expect(sseRes.body).toContain('Book demo');

    const jsonRes = await requestJson('POST', '/api/chat/stream', { message: 'Hello', sessionId: 'abc' }, { accept: 'application/json' });
    expect(jsonRes.statusCode).toBe(200);
    expect(jsonRes.headers['content-type']).toContain('application/json');
    const payload = JSON.parse(jsonRes.body);
    expect(payload.response).toBe('Hello there');
    expect(payload.uiState?.suggestedActions[0].label).toBe('Book demo');
    expect(payload.cta?.label).toBe('Book demo');
  });
});
