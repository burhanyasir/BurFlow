import { Router, Request, Response } from 'express';

const router = Router();

// Simple widget settings store in-memory for vertical slice
const widgets: Record<string, any> = {};

router.post('/:tenantId/settings', (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const settings = req.body;
  widgets[tenantId] = { ...(widgets[tenantId] || {}), ...settings };
  res.status(200).json({ ok: true, settings: widgets[tenantId] });
});

router.get('/:tenantId/settings', (req: Request, res: Response) => {
  const { tenantId } = req.params;
  res.json(widgets[tenantId] || {});
});

export default router;
