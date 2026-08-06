import express from 'express';
import http from 'http';
import { createChatRoutes } from './packages/saas-api/src/routes/chat';

async function main() {
  class MemoryRepo {
    public created: any[] = [];
    findBySession() { return null; }
    create(data: any) { this.created.push(data); return { id: 'conv-1', ...data }; }
    incrementMessageCount() {}
  }

  const conversationRepo = new MemoryRepo();
  const messageRepo = new MemoryRepo();
  const usageRepo = { incrementMessages: (_tenantId: string, _period: string) => {} };

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => { req.tenantId = 'widget-tenant'; next(); });
  app.use('/api/chat', createChatRoutes(conversationRepo as any, messageRepo as any, usageRepo as any));

  const server = app.listen(0, () => {
    const port = (server.address() as any).port;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const body = JSON.stringify({ message: 'Hello widget', sessionId });
    const options = {
      hostname: '127.0.0.1',
      port,
      path: '/api/chat/stream',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-session-id': sessionId,
        'x-tenant-id': 'widget-tenant',
        'accept': 'text/event-stream',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(JSON.stringify({ sessionId, statusCode: res.statusCode, headers: res.headers, body: data }));
        server.close();
      });
    });
    req.on('error', (err) => {
      console.error(err);
      server.close();
    });
    req.write(body);
    req.end();
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
