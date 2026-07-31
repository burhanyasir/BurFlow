import { Router, Request, Response } from 'express';
import TenantService from '../services/tenantService';

const router = Router();
const service = new TenantService();

// Start onboarding, returns onboardingId
router.post('/start', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const onboardingId = await service.startOnboarding(payload);
    res.status(201).json({ onboardingId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Submit step
router.post('/:onboardingId/step', async (req: Request, res: Response) => {
  try {
    const raw = req.params.onboardingId;
    const onboardingId = Array.isArray(raw) ? raw[0] : (raw || '');
    const step = req.body;
    const result = await service.submitStep(onboardingId, step);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Finalize and create tenant
router.post('/:onboardingId/complete', async (req: Request, res: Response) => {
  try {
    const raw = req.params.onboardingId;
    const onboardingId = Array.isArray(raw) ? raw[0] : (raw || '');
    const tenant = await service.complete(onboardingId);
    res.status(201).json(tenant);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
