import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'http';
import { createChatRoutes } from '../routes/chat';
import { executePipeline } from '../orchestrator';

vi.mock('../orchestrator', () => ({
  executePipeline: vi.fn(),
  getState: vi.fn(),
}));

function buildApp(): { app: express.Express; repos: any } {
  const executePipelineMock = vi.mocked(executePipeline);
  executePipelineMock.mockResolvedValue({
    response: 'ok', strategy: 'answer', mood: 'friendly', trustScore: 50, buyingIntentScore: 0,
    stage: 'discovery', state: {}, composition: { text: 'ok' }, policy: { strategy: 'answer', priority: 1, buyingSignalDetected: false, canQualify: false, canShowCTA: false, detectedTopics: [], detectedUseCase: null, detectedIndustry: null },
    isRapportHandled: false, traceId: 't', latencyMs: 1, quickReplies: [], uiState: { buttons: [], suggestedActions: [] }, cta: null,
  } as any);

  class MemoryRepo {
    public created: any[] = [];
    findBySession() { return null; }
    create(data: any) { this.created.push(data); return { id: 'conv-1', ...data }; }
    incrementMessageCount() {}
  }
  const conversationRepo = new MemoryRepo();
  const messageRepo = new MemoryRepo();
  const usageRepo = { incrementMessages: vi.fn() };

  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => { req.tenantId = 'tenant-1'; next(); });
  app.use('/api/chat', createChatRoutes(conversationRepo as any, messageRepo as any, usageRepo as any));

  return { app, repos: { conversationRepo, messageRepo, usageRepo } };
}

function startServer(app: express.Express): { port: number; server: http.Server } {
  const server = app.listen(0);
  const port = (server.address() as any).port;
  return { port, server };
}

function requestJson(port: number, method: string, path: string, body?: any, headers?: Record<string, string>) {
  return new Promise<{ statusCode: number; body: string; headers: http.IncomingHttpHeaders }>((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request({ hostname: '127.0.0.1', port, path, method, headers: { 'content-type': 'application/json', ...(headers || {}) } }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: raw, headers: res.headers }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

describe('chat route — payload validation (text / image / non-text)', () => {
  let server: http.Server;
  let port: number;
  beforeEach(() => {
    const { app } = buildApp();
    ({ server, port } = startServer(app));
  });
  afterEach(async () => { await new Promise<void>((r) => server.close(() => r())); });

  it('accepts a plain text message (200)', async () => {
    const res = await requestJson(port, 'POST', '/api/chat/', { message: 'hello' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).response).toBe('ok');
  });

  it('rejects a non-text/non-multimodal message body (400)', async () => {
    const res = await requestJson(port, 'POST', '/api/chat/', { message: { foo: 'bar' } });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toMatch(/Unsupported content block type/);
  });

  it('rejects a numeric message (400)', async () => {
    const res = await requestJson(port, 'POST', '/api/chat/', { message: 42 });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a missing message field (400)', async () => {
    const res = await requestJson(port, 'POST', '/api/chat/', { sessionId: 's1' });
    expect(res.statusCode).toBe(400);
  });

  it('accepts a multimodal text+image/png array (200, image stripped for text providers)', async () => {
    const content = [
      { type: 'text', text: 'what is this' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC' } },
    ];
    const res = await requestJson(port, 'POST', '/api/chat/', { message: content });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.response).toBe('ok');
  });

  it('rejects an unsupported image MIME type (image/webp) (400)', async () => {
    const content = [{ type: 'image_url', image_url: { url: 'data:image/webp;base64,UklGRjoAAABXRUQVlA4ICwAAEAcQERGIiP4fAA==' } }];
    const res = await requestJson(port, 'POST', '/api/chat/', { message: content });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toMatch(/Unsupported image MIME type/);
  });

  it('rejects an oversized message (400, > MESSAGE_MAX)', async () => {
    const res = await requestJson(port, 'POST', '/api/chat/', { message: 'x'.repeat(60000) });
    expect(res.statusCode).toBe(400);
  });
});

describe('chat route — per-session rate limit (20/min)', () => {
  let server: http.Server;
  let port: number;
  beforeEach(() => {
    const { app } = buildApp();
    ({ server, port } = startServer(app));
  });
  afterEach(async () => { await new Promise<void>((r) => server.close(() => r())); });

  it('allows the first 20 then returns 429 for the 21st (same session)', async () => {
    const session = 'rate-session-' + Date.now();
    const statuses: number[] = [];
    // Fire many concurrently so they all land in one 60s window.
    const promises = [];
    for (let i = 0; i < 25; i++) {
      promises.push(requestJson(port, 'POST', '/api/chat/', { message: 'hi', sessionId: session }).then(r => statuses.push(r.statusCode)));
    }
    await Promise.all(promises);
    const counts: Record<number, number> = {};
    for (const s of statuses) counts[s] = (counts[s] || 0) + 1;
    expect(counts[200]).toBe(20);
    expect(counts[429]).toBe(5);
  });
});
