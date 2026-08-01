import { Router, Request, Response } from 'express';
import * as integration from '../services/integration';
import { authenticate, requireTenant, requireRole, requirePermission, auditAction, rateLimit } from '../middleware/auth';

const router = Router();

// Apply authentication and basic rate limiting to all admin routes
router.use(authenticate());
router.use(rateLimit('admin', 200, 60));

// Dashboard home summary
router.get('/home', requireTenant, requirePermission('dashboard.view'), async (req: Request, res: Response) => {
  try {
    const summary = await integration.getTelemetrySummary();
    res.json({ ok: true, summary });
  } catch (err: any) {
    console.error('admin.dashboard.home.error', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Analytics
router.get('/analytics', requireTenant, requirePermission('analytics.view'), async (req: Request, res: Response) => {
  try {
    const analytics = await integration.getAnalytics();
    res.json({ ok: true, analytics });
  } catch (err: any) {
    console.error('admin.dashboard.analytics.error', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Conversations listing/search stub
router.get('/conversations', requireTenant, requirePermission('conversations.view'), async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string | undefined;
    const conversations = await integration.getConversations({ q });
    res.json({ ok: true, conversations });
  } catch (err: any) {
    console.error('admin.dashboard.conversations.error', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Knowledge summary
router.get('/knowledge', requireTenant, requirePermission('knowledge.view'), async (req: Request, res: Response) => {
  try {
    const k = await integration.getKnowledgeSummary();
    res.json({ ok: true, knowledge: k });
  } catch (err: any) {
    console.error('admin.dashboard.knowledge.error', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Widget management
router.get('/widgets/:widgetId/preview', requireTenant, requirePermission('widget.manage'), auditAction('widget_preview'), async (req: Request, res: Response) => {
  try {
    const widgetId = req.params.widgetId || '';
    const preview = await integration.getInstallSnippet(widgetId);
    res.json({ ok: true, preview });
  } catch (err: any) {
    console.error('admin.dashboard.widget.preview.error', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// API keys
router.get('/api-keys', requireTenant, requirePermission('apikey.manage'), auditAction('apikey_list'), async (req: Request, res: Response) => {
  try {
    const keys = await integration.listApiKeys();
    res.json({ ok: true, keys });
  } catch (err: any) {
    console.error('admin.dashboard.apikeys.error', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Billing summary (uses mock provider via abstraction)
router.get('/billing', requireTenant, requirePermission('billing.view'), auditAction('billing_view'), async (req: Request, res: Response) => {
  try {
    const billing = await integration.getBillingSummary();
    res.json({ ok: true, billing });
  } catch (err: any) {
    console.error('admin.dashboard.billing.error', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Settings and audit logs
router.get('/settings', requireTenant, requirePermission('settings.manage'), auditAction('settings_view'), async (req: Request, res: Response) => {
  try {
    const settings = await integration.getSettings();
    res.json({ ok: true, settings });
  } catch (err: any) {
    console.error('admin.dashboard.settings.error', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

router.get('/audit-logs', requireTenant, requireRole('super_admin','owner','admin'), auditAction('audit_view'), async (req: Request, res: Response) => {
  try {
    const logs = await integration.getAuditLogs();
    res.json({ ok: true, logs });
  } catch (err: any) {
    console.error('admin.dashboard.audit.error', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

export default router;
