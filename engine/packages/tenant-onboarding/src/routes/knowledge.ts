import { Router, Request, Response } from 'express';

const router = Router();

// Mock ingestion queue and status
const ingestions: Record<string, any> = {};

// Accept file metadata or source list for ingestion (mock)
router.post('/:tenantId/upload', (req: Request, res: Response) => {
  const rawTenant = req.params.tenantId;
  const tenantId = Array.isArray(rawTenant) ? rawTenant[0] : (rawTenant || '');
  if (!tenantId) return res.status(400).json({ error: 'missing tenantId' });
  const details = req.body;
  if (!details || typeof details !== 'object') return res.status(400).json({ error: 'invalid upload details' });
  const size = Buffer.byteLength(JSON.stringify(details), 'utf8');
  if (size > 5 * 1024 * 1024) return res.status(413).json({ error: 'upload details too large' });

  const id = `ing_${Date.now()}`;
  const job: any = {
    id,
    tenantId,
    status: 'queued',
    progress: 0,
    estimatedSeconds: 5,
    createdAt: new Date().toISOString(),
    details,
    errors: [] as string[],
  completedAt: undefined as string | undefined,
  };
  ingestions[id] = job;

  // simulate staged processing with progress updates (not durable across instances)
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 40) + 10;
    if (progress >= 100) {
      job.progress = 100;
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      clearInterval(interval);
    } else {
      job.progress = Math.min(99, progress);
      job.estimatedSeconds = Math.max(1, Math.floor((100 - job.progress) / 20) * 2 + 1);
    }
  }, 300);

  res.status(202).json({ id, status: 'queued' });
});

router.get('/:tenantId/ingestions/:id', (req: Request, res: Response) => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : (rawId || '');
  const item = ingestions[id];
  if (!item) return res.status(404).json({ error: 'not found' });
  res.json(item);
});

// list ingestions for tenant
router.get('/:tenantId/ingestions', (req: Request, res: Response) => {
  const rawTenant = req.params.tenantId;
  const tenantId = Array.isArray(rawTenant) ? rawTenant[0] : (rawTenant || '');
  const items = Object.values(ingestions).filter((j) => j.tenantId === tenantId);
  res.json(items);
});

export default router;
