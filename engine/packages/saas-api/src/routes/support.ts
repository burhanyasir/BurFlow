import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository, TenantRepository, ConversationRepository, MessageRepository, SubscriptionRepository, type SqlDatabase } from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { randomBytes } from 'crypto';
import { verifyWidgetToken } from '../middleware/auth';

const logger = createLogger('saas-api:support');
function generateId(): string { return randomBytes(16).toString('hex'); }

export function createSupportRoutes(
  userRepo: UserRepository,
  tenantRepo: TenantRepository,
  conversationRepo: ConversationRepository,
  messageRepo: MessageRepository,
  subRepo: SubscriptionRepository,
  db: SqlDatabase,
  jwtSecret: string,
): Router {
  const router = Router();

  // Auto-create tables if they don't exist (for PostgreSQL where 001 was already applied)
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY, tenant_id TEXT, user_email TEXT NOT NULL, user_name TEXT,
      subject TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'dashboard', status TEXT DEFAULT 'open',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`);
    db.exec(`CREATE TABLE IF NOT EXISTS support_messages (
      id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL,
      sender_type TEXT NOT NULL, sender_email TEXT, content TEXT NOT NULL,
      attachment_url TEXT, created_at TEXT NOT NULL)`);
    db.exec(`CREATE TABLE IF NOT EXISTS payment_confirmations (
      id TEXT PRIMARY KEY, tenant_id TEXT, user_email TEXT NOT NULL, requested_plan TEXT NOT NULL,
      billing_period TEXT DEFAULT 'monthly', amount TEXT NOT NULL, currency TEXT DEFAULT 'PKR',
      wallet_account TEXT NOT NULL, screenshot_url TEXT, status TEXT DEFAULT 'pending',
      owner_notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_email)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON support_tickets(tenant_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_support_tickets_source ON support_tickets(source)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payment_confirmations_status ON payment_confirmations(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payment_confirmations_tenant ON payment_confirmations(tenant_id)`);
  } catch (err: any) {
    console.error('[support] Failed to ensure tables:', err?.message);
  }

  const ownerOnly = (req: Request, res: Response, next: Function) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Auth required' });
    try {
      const payload = jwt.verify(authHeader.slice(7), jwtSecret, { algorithms: ['HS256'] }) as any;
      if (payload.role !== 'owner' || payload.panel !== 'owner') return res.status(403).json({ error: 'Owner access required' });
      next();
    } catch { return res.status(401).json({ error: 'Invalid token' }); }
  };

  const userAuth = (req: Request, res: Response, next: Function) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Auth required' });
    try {
      jwt.verify(authHeader.slice(7), jwtSecret, { algorithms: ['HS256'] });
      next();
    } catch { return res.status(401).json({ error: 'Invalid token' }); }
  };

  // ─── OWNER: Inbox — aggregated view ─────────────────────────────────
  router.get('/inbox', ownerOnly, (_req: Request, res: Response) => {
    try {
      const tickets = db.prepare('SELECT * FROM support_tickets ORDER BY updated_at DESC').all();
      const payments = db.prepare('SELECT * FROM payment_confirmations ORDER BY created_at DESC').all();
      const subRequests = db.prepare('SELECT * FROM subscription_requests WHERE status = ? ORDER BY created_at DESC').all('pending');

      res.json({ tickets, payments, subRequests });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Inbox load failed');
      res.status(500).json({ error: 'Failed to load inbox' });
    }
  });

  // ─── OWNER: Chatbot conversations (from all tenants) ────────────────
  router.get('/chatbot-conversations', ownerOnly, (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const rows = db.prepare(`
        SELECT c.id, c.session_id, c.tenant_id, c.started_at, c.message_count, c.status,
               t.name as tenant_name,
               (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
               (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at
        FROM conversations c
        LEFT JOIN tenants t ON t.id = c.tenant_id
        ORDER BY last_message_at DESC
        LIMIT ?
      `).all(limit);
      res.json({ conversations: rows });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load conversations' });
    }
  });

  // ─── OWNER: Messages for a conversation ─────────────────────────────
  router.get('/chatbot-conversations/:convId/messages', ownerOnly, (req: Request, res: Response) => {
    try {
      const { messages } = messageRepo.listByConversation(req.params.convId, 1, 100);
      res.json({ messages });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  // ─── USER: Create support ticket ────────────────────────────────────
  router.post('/tickets', userAuth, (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization!;
      const payload = jwt.verify(authHeader.slice(7), jwtSecret, { algorithms: ['HS256'] }) as any;
      const user = userRepo.findById(payload.sub);
      const tenants = user ? tenantRepo.findByOwner(user.id) : [];
      const tenant = tenants[0];

      const { subject, message, source } = req.body;
      if (!subject || !message) return res.status(400).json({ error: 'Subject and message required' });

      const id = generateId();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO support_tickets (id, tenant_id, user_email, user_name, subject, source, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(id, tenant?.id || null, user?.email || payload.email, user?.name || '', subject, source || 'dashboard', 'open', now, now);

      db.prepare(
        'INSERT INTO support_messages (id, ticket_id, sender_type, sender_email, content, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(generateId(), id, 'user', user?.email || payload.email, message, now);

      createContextLogger(logger).info({ ticketId: id, email: user?.email }, 'Support ticket created');
      res.json({ ok: true, ticketId: id });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Create ticket failed');
      res.status(500).json({ error: 'Failed to create ticket' });
    }
  });

  // ─── OWNER: List tickets ────────────────────────────────────────────
  router.get('/tickets', ownerOnly, (req: Request, res: Response) => {
    try {
      const status = (req.query.status as string) || 'all';
      const sql = status === 'all'
        ? 'SELECT * FROM support_tickets ORDER BY updated_at DESC'
        : 'SELECT * FROM support_tickets WHERE status = ? ORDER BY updated_at DESC';
      const rows = status === 'all' ? db.prepare(sql).all() : db.prepare(sql).all(status);
      res.json({ tickets: rows });
    } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
  });

  // ─── OWNER: Get ticket messages ─────────────────────────────────────
  router.get('/tickets/:ticketId', ownerOnly, (req: Request, res: Response) => {
    try {
      const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(req.params.ticketId);
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      const messages = db.prepare('SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC').all(req.params.ticketId);
      res.json({ ticket, messages });
    } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
  });

  // ─── OWNER: Send message ────────────────────────────────────────────
  router.post('/tickets/:ticketId/messages', ownerOnly, (req: Request, res: Response) => {
    try {
      const { content } = req.body;
      if (!content) return res.status(400).json({ error: 'Message required' });
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO support_messages (id, ticket_id, sender_type, sender_email, content, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(generateId(), req.params.ticketId, 'owner', 'burflow2026@gmail.com', content, now);
      db.prepare('UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?').run('replied', now, req.params.ticketId);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
  });

  // ─── OWNER: Close ticket ────────────────────────────────────────────
  router.post('/tickets/:ticketId/close', ownerOnly, (req: Request, res: Response) => {
    try {
      db.prepare('UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?').run('closed', new Date().toISOString(), req.params.ticketId);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
  });

  // ─── USER: Submit payment confirmation ──────────────────────────────
  router.post('/payment-confirm', userAuth, (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization!;
      const payload = jwt.verify(authHeader.slice(7), jwtSecret, { algorithms: ['HS256'] }) as any;
      const user = userRepo.findById(payload.sub);
      const tenants = user ? tenantRepo.findByOwner(user.id) : [];
      const tenant = tenants[0];

      const { requestedPlan, amount, walletAccount, screenshotUrl, billingPeriod } = req.body;
      if (!requestedPlan) return res.status(400).json({ error: 'Plan required' });

      const id = generateId();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO payment_confirmations (id, tenant_id, user_email, requested_plan, billing_period, amount, currency, wallet_account, screenshot_url, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(id, tenant?.id || null, user?.email || payload.email, requestedPlan, billingPeriod || 'monthly', amount || '0', 'PKR', walletAccount || 'PK58SADA0000003007645484', screenshotUrl || null, 'pending', now, now);

      createContextLogger(logger).info({ paymentId: id, email: user?.email, plan: requestedPlan }, 'Payment confirmation submitted');
      res.json({ ok: true, paymentId: id });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Payment confirm failed');
      res.status(500).json({ error: 'Failed' });
    }
  });

  // ─── OWNER: List payments ───────────────────────────────────────────
  router.get('/payments', ownerOnly, (req: Request, res: Response) => {
    try {
      const status = (req.query.status as string) || 'all';
      const sql = status === 'all'
        ? 'SELECT * FROM payment_confirmations ORDER BY created_at DESC'
        : 'SELECT * FROM payment_confirmations WHERE status = ? ORDER BY created_at DESC';
      const rows = status === 'all' ? db.prepare(sql).all() : db.prepare(sql).all(status);
      res.json({ payments: rows });
    } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
  });

  // ─── OWNER: Approve payment ─────────────────────────────────────────
  router.post('/payments/:id/approve', ownerOnly, (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const row = db.prepare('SELECT * FROM payment_confirmations WHERE id = ?').get(id) as any;
      if (!row) return res.status(404).json({ error: 'Payment not found' });
      if (row.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

      const now = new Date().toISOString();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Activate plan on tenant — ensure subscription row exists first
      subRepo.init(row.tenant_id, row.requested_plan);
      subRepo.update(row.tenant_id, {
        plan: row.requested_plan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEnd: undefined,
        cancelledAt: undefined,
      });

      db.prepare(
        'UPDATE tenants SET plan = ?, subscription_status = ?, subscription_period_end = ?, updated_at = ? WHERE id = ?'
      ).run(row.requested_plan, 'active', periodEnd, now, row.tenant_id);

      // Also approve the subscription request if one exists
      db.prepare(
        'UPDATE subscription_requests SET status = ?, updated_at = ? WHERE tenant_id = ? AND status = ?'
      ).run('approved', now, row.tenant_id, 'pending');

      db.prepare(
        'UPDATE payment_confirmations SET status = ?, owner_notes = ?, updated_at = ? WHERE id = ?'
      ).run('approved', req.body.notes || '', now, id);

      createContextLogger(logger).info({ paymentId: id, plan: row.requested_plan }, 'Payment approved');
      res.json({ ok: true });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Approve payment failed');
      res.status(500).json({ error: 'Failed' });
    }
  });

  // ─── OWNER: Reject payment ──────────────────────────────────────────
  router.post('/payments/:id/reject', ownerOnly, (req: Request, res: Response) => {
    try {
      const now = new Date().toISOString();
      db.prepare(
        'UPDATE payment_confirmations SET status = ?, owner_notes = ?, updated_at = ? WHERE id = ?'
      ).run('rejected', req.body.reason || '', now, req.params.id);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
  });

  // ─── WIDGET: Visitor requests human agent ──────────────────────────
  router.post('/request-human', (req: Request, res: Response) => {
    try {
      let { sessionId, tenantId, message } = req.body;
      if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

      // Resolve tenantId from widget token header if missing from body
      if (!tenantId) {
        const widgetToken = (req.headers['x-widget-token'] as string) || '';
        if (widgetToken) {
          const origin = req.get('Origin') || req.get('Referer') || undefined;
          const result = verifyWidgetToken(widgetToken, origin);
          if (result) tenantId = result.tenantId;
        }
      }
      if (!tenantId) return res.status(400).json({ error: 'tenantId is required (provide in body or via x-widget-token header)' });

      const now = new Date().toISOString();

      // Mark conversation as human_requested so agent inbox picks it up
      try {
        const conv = conversationRepo.findBySession(tenantId, sessionId);
        if (conv) {
          conversationRepo.updateStatus(conv.id, 'human_requested');
        }
      } catch {
        // non-critical — ticket creation is the primary path
      }

      // Create a support ticket so owner sees it in inbox
      const ticketId = generateId();
      db.prepare(
        'INSERT INTO support_tickets (id, tenant_id, user_email, user_name, subject, source, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(ticketId, tenantId, 'visitor', 'Chatbot Visitor', `Human agent requested — session ${sessionId.slice(0, 8)}`, 'chatbot', 'open', now, now);

      db.prepare(
        'INSERT INTO support_messages (id, ticket_id, sender_type, sender_email, content, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(generateId(), ticketId, 'user', 'visitor', `[Session: ${sessionId}] ${message || "I'd like to talk to a human agent."}`, now);

      createContextLogger(logger).info({ ticketId, sessionId, tenantId }, 'Human agent requested from widget');
      res.json({ ok: true, ticketId });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Request human agent failed');
      res.status(500).json({ error: 'Failed' });
    }
  });

  // ─── OWNER: Reply to chatbot conversation ──────────────────────────
  router.post('/chatbot-conversations/:convId/reply', ownerOnly, (req: Request, res: Response) => {
    try {
      const { convId } = req.params;
      const { content } = req.body;
      if (!content) return res.status(400).json({ error: 'Content required' });

      const conv = conversationRepo.findById(convId);
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });

      const msg = messageRepo.create({
        conversationId: conv.id,
        tenantId: conv.tenantId,
        role: 'assistant',
        content,
        sequenceNumber: conv.messageCount + 1,
        sender: 'agent',
      });
      conversationRepo.incrementMessageCount(conv.id);

      createContextLogger(logger).info({ convId, content: content.slice(0, 50) }, 'Owner replied to chatbot conversation');
      res.json({ ok: true, messageId: msg.id });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Reply to conversation failed');
      res.status(500).json({ error: 'Failed' });
    }
  });

  return router;
}
