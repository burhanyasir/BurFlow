import { Router, Request, Response } from 'express';
import WizardService from '../services/wizardService';
import { validateStep, isValidDomain, isSupportedLanguage, isSupportedCategory } from '../services/validation';

const router = Router();
const service = new WizardService();

// Start wizard: optionally include step 1 payload (business info)
router.post('/start', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (payload && typeof payload !== 'object') return res.status(400).json({ error: 'invalid payload' });
    const id = service.start(payload);
    res.status(201).json({ wizardId: id });
  } catch (err: any) {
    console.error('wizard.start.error', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Get wizard state (includes progress info)
router.get('/:wizardId/state', (req: Request, res: Response) => {
  try {
    const id = req.params.wizardId || '';
    if (!id) return res.status(400).json({ error: 'missing wizardId' });
    const state = service.get(id);
    if (!state) return res.status(404).json({ error: 'not found' });
    const progress = service.computeProgress(id);
    res.json({ state, progress });
  } catch (err: any) {
    console.error('wizard.state.error', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Submit a step: stepNumber from 1..7
router.post('/:wizardId/step/:stepNumber', async (req: Request, res: Response) => {
  try {
    const id = req.params.wizardId || '';
    const raw = req.params.stepNumber || '0';
    const stepNumber = parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
    if (!id) return res.status(400).json({ error: 'missing wizardId' });
    if (!stepNumber || stepNumber < 1 || stepNumber > 7) return res.status(400).json({ error: 'invalid stepNumber' });

    const payload = req.body;
    if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'invalid payload' });
    const size = Buffer.byteLength(JSON.stringify(payload), 'utf8');
    if (size > 512 * 1024) return res.status(413).json({ error: 'payload too large' });

    // Schema-driven validation
    const validation = validateStep(stepNumber, payload);
    if (!validation.valid) return res.status(422).json({ error: 'validation_failed', details: validation.errors });

    // Additional validations
    if (stepNumber === 1) {
      // domain validation if website provided
      if (payload.website && !isValidDomain(payload.website)) return res.status(422).json({ error: 'invalid_website' });
      if (payload.language && !isSupportedLanguage(payload.language)) return res.status(422).json({ error: 'unsupported_language' });
      if (payload.industry && !isSupportedCategory(payload.industry)) return res.status(422).json({ error: 'unsupported_industry' });
    }

    // Conditional flow checks: ensure step is allowed (e.g., skipped steps)
    const state = service.get(id);
    if (!state) return res.status(404).json({ error: 'not found' });
    if (state.skippedSteps && state.skippedSteps.includes(stepNumber)) return res.status(400).json({ error: 'step_skipped_by_conditional_flow' });

    await service.submitStep(id, stepNumber, payload);

    // if widget step, return live preview
    if (stepNumber === 5) {
      const preview = service.previewWidget(id);
      return res.json({ ok: true, preview: preview.preview });
    }

    res.json({ ok: true });
  } catch (err: any) {
    console.error('wizard.step.error', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Complete wizard and return tenant summary (mocked)
router.post('/:wizardId/complete', async (req: Request, res: Response) => {
  try {
    const id = req.params.wizardId || '';
    if (!id) return res.status(400).json({ error: 'missing wizardId' });
    const summary = service.complete(id);
    // AI initialization: attempt to call existing public initialization entry points (non-blocking)
    (async () => {
      try {
        // conversation-orchestrator provisioning hook
        try {
          // Many engine packages expose programmatic APIs; attempt to call common entrypoints if present.
          // Try conversation-orchestrator
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const convo = require('../../conversation-orchestrator/src/conversation-brain');
          if (convo && typeof convo.provisionForTenant === 'function') {
            convo.provisionForTenant(summary.tenantId, summary);
          }
        } catch (e) {
          // ignore missing module or function
        }

        // Try knowledge engine initializer
        try {
          const ke = require('../../stage-1-ingestion/src/index');
          if (ke && typeof ke.initializeTenantKnowledge === 'function') {
            ke.initializeTenantKnowledge(summary.tenantId, { docs: summary.knowledge || [] });
          }
        } catch (e) {
          // ignore
        }

        // Try sales intelligence initializer
        try {
          const si = require('../../conversation-evaluator/src/templates');
          if (si && typeof si.setupTenantSalesTemplates === 'function') {
            si.setupTenantSalesTemplates(summary.tenantId, summary);
          }
        } catch (e) {
          // ignore
        }

        // Universal journey engine (apply template bundle if loaded)
        try {
          const uj = require('../../conversation-orchestrator/src/universal-customer-journey');
          if (uj && typeof uj.applyTemplateToTenant === 'function' && (summary as any).templateBundle) {
            uj.applyTemplateToTenant(summary.tenantId, (summary as any).templateBundle);
          }
        } catch (e) {
          // ignore
        }
      } catch (err) {
        console.error('ai.init.error', err);
      }
    })();

    res.status(201).json(summary);
  } catch (err: any) {
    console.error('wizard.complete.error', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Live preview endpoint
router.get('/:wizardId/preview', (req: Request, res: Response) => {
  try {
    const id = req.params.wizardId || '';
    if (!id) return res.status(400).json({ error: 'missing wizardId' });
    const preview = service.previewWidget(id);
    res.json(preview);
  } catch (err: any) {
    console.error('wizard.preview.error', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Resume endpoint
router.post('/:wizardId/resume', (req: Request, res: Response) => {
  try {
    const id = req.params.wizardId || '';
    if (!id) return res.status(400).json({ error: 'missing wizardId' });
    const state = service.resume(id);
    if (!state) return res.status(404).json({ error: 'not found' });
    const progress = service.computeProgress(id);
    res.json({ wizardId: id, currentStep: state.currentStep, progress, status: state.status });
  } catch (err: any) {
    console.error('wizard.resume.error', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

export default router;
