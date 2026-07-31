import { Router, Request, Response } from 'express';

const router = Router();

// Mock ingestion queue and status
const ingestions: Record<string, any> = {};

// Accept file metadata for ingestion (mock)
router.post('/:tenantId/upload', (req: Request, res: Response) => {
  const rawTenant = req.params.tenantId;
  const tenantId = Array.isArray(rawTenant) ? rawTenant[0] : (rawTenant || 'unknown');
  const id = `ing_${Date.now()}`;
  ingestions[id] = { id, tenantId, status: 'queued', createdAt: new Date().toISOString(), details: req.body };
  // simulate async indexing
  setTimeout(() => { ingestions[id].status = 'indexed'; ingestions[id].indexedAt = new Date().toISOString(); }, 200);
  res.status(202).json({ id, status: 'queued' });
});

router.get('/:tenantId/ingestions/:id', (req: Request, res: Response) => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : (rawId || '');
  const item = ingestions[id];
  if (!item) return res.status(404).json({ error: 'not found' });
  res.json(item);
});

export default router;
