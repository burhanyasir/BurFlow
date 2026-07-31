import { Router, Request, Response } from 'express';

const router = Router();

// Mock ingestion queue and status
const ingestions: Record<string, any> = {};

// Accept file metadata for ingestion (mock)
router.post('/:tenantId/upload', (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const id = `ing_${Date.now()}`;
  ingestions[id] = { id, tenantId, status: 'queued', createdAt: new Date().toISOString(), details: req.body };
  // simulate async indexing
  setTimeout(() => { ingestions[id].status = 'indexed'; ingestions[id].indexedAt = new Date().toISOString(); }, 200);
  res.status(202).json({ id, status: 'queued' });
});

router.get('/:tenantId/ingestions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const item = ingestions[id];
  if (!item) return res.status(404).json({ error: 'not found' });
  res.json(item);
});

export default router;
