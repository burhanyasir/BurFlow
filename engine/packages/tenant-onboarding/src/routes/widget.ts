import { Router, Request, Response } from 'express';

const router = Router();

// Simple widget settings store in-memory for vertical slice
const widgets: Record<string, any> = {};

router.post('/:tenantId/settings', (req: Request, res: Response) => {
  const raw = req.params.tenantId;
  const tenantId = Array.isArray(raw) ? raw[0] : (raw || '');
  if (!tenantId) return res.status(400).json({ error: 'missing tenantId' });
  const settings = req.body;
  if (!settings || typeof settings !== 'object') return res.status(400).json({ error: 'invalid settings' });
  const size = Buffer.byteLength(JSON.stringify(settings), 'utf8');
  if (size > 32 * 1024) return res.status(413).json({ error: 'settings payload too large' });

  // Basic sanitization: only allow a whitelist of keys (future: use JSON schema)
  const allowed = ['theme', 'greeting', 'enabled', 'widgets', 'locale', 'color', 'position', 'logo', 'avatar', 'welcome'];
  const sanitized: Record<string, any> = {};
  for (const k of Object.keys(settings)) {
    if (allowed.includes(k)) sanitized[k] = settings[k];
  }

  widgets[tenantId] = { ...(widgets[tenantId] || {}), ...sanitized };
  res.status(200).json({ ok: true, settings: widgets[tenantId] });
});

router.get('/:tenantId/settings', (req: Request, res: Response) => {
  const raw = req.params.tenantId;
  const tenantId = Array.isArray(raw) ? raw[0] : (raw || '');
  if (!tenantId) return res.status(400).json({ error: 'missing tenantId' });
  res.json(widgets[tenantId] || {});
});

export default router;
