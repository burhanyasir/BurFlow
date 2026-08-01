import { Router, Request, Response } from 'express';
import TenantService from '../services/tenantService';

const router = Router();
const service = new TenantService();

// Start onboarding, returns onboardingId
router.post('/start', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    // Basic validation and size limits to prevent abuse
    if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'invalid payload' });
    const payloadSize = Buffer.byteLength(JSON.stringify(payload), 'utf8');
    if (payloadSize > 64 * 1024) return res.status(413).json({ error: 'payload too large' });
    if (payload.businessName && String(payload.businessName).length > 256) return res.status(400).json({ error: 'businessName too long' });

    const onboardingId = await service.startOnboarding(payload);
    res.status(201).json({ onboardingId });
  } catch (err: any) {
    // avoid leaking internal details
    console.error('onboarding.start.error', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Submit step
router.post('/:onboardingId/step', async (req: Request, res: Response) => {
  try {
    const raw = req.params.onboardingId;
    const onboardingId = Array.isArray(raw) ? raw[0] : (raw || '');
    if (!onboardingId) return res.status(400).json({ error: 'missing onboardingId' });
    const step = req.body;
    if (!step || typeof step !== 'object') return res.status(400).json({ error: 'invalid step payload' });
    const stepSize = Buffer.byteLength(JSON.stringify(step), 'utf8');
    if (stepSize > 32 * 1024) return res.status(413).json({ error: 'step payload too large' });

    const result = await service.submitStep(onboardingId, step);
    res.json(result);
  } catch (err: any) {
    console.error('onboarding.step.error', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Finalize and create tenant
router.post('/:onboardingId/complete', async (req: Request, res: Response) => {
  try {
    const raw = req.params.onboardingId;
    const onboardingId = Array.isArray(raw) ? raw[0] : (raw || '');
    if (!onboardingId) return res.status(400).json({ error: 'missing onboardingId' });

    const tenant = await service.complete(onboardingId);
    res.status(201).json(tenant);
  } catch (err: any) {
    console.error('onboarding.complete.error', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

export default router;
