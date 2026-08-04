import { Router, Request, Response } from 'express';
import { OnboardingProgressRepository, ConversationRepository, MessageRepository, UsageRepository, KbDocumentRepository, UserRepository } from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { authMiddleware } from '../middleware/auth';
import { requireJsonObject, validateRequiredString, validationError } from '../middleware/validate';

const logger = createLogger('saas-api:onboarding');

const BUSINESS_TYPES = ['ecommerce', 'saas', 'healthcare', 'finance', 'education', 'enterprise', 'other'];
const SAMPLE_CONVERSATIONS = [
  { sessionId: 'demo-session-1', messages: [{ role: 'user', content: 'How do I reset my password?' }, { role: 'assistant', content: 'To reset your password, go to Settings > Security > Change Password. You will need your current password to set a new one.' }] },
  { sessionId: 'demo-session-2', messages: [{ role: 'user', content: 'What are your business hours?' }, { role: 'assistant', content: 'Our business hours are Monday through Friday, 9 AM to 6 PM EST. We also offer 24/7 support for enterprise customers.' }] },
  { sessionId: 'demo-session-3', messages: [{ role: 'user', content: 'Can I upgrade my plan?' }, { role: 'assistant', content: 'Yes, you can upgrade anytime from your billing settings. We offer Starter, Professional, and Enterprise plans.' }] },
  { sessionId: 'demo-session-4', messages: [{ role: 'user', content: 'How does the widget work?' }, { role: 'assistant', content: 'The widget is a JavaScript snippet you add to your website. It automatically loads your knowledge base and starts answering customer questions.' }] },
  { sessionId: 'demo-session-5', messages: [{ role: 'user', content: 'Do you have an API?' }, { role: 'assistant', content: 'Yes, we have a REST API. You can find the documentation in the API Keys section. All API requests need to be authenticated with an API key.' }] },
];

export function createOnboardingRoutes(
  onboardingRepo: OnboardingProgressRepository,
  conversationRepo: ConversationRepository,
  messageRepo: MessageRepository,
  usageRepo: UsageRepository,
  kbDocRepo: KbDocumentRepository,
  userRepo: UserRepository,
  jwtSecret: string,
): Router {
  const router = Router();
  const auth = authMiddleware(jwtSecret);

  router.get('/progress', auth, (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const progress = onboardingRepo.init(req.user.tenantId!);
      res.json({ progress });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Failed to get onboarding progress');
      res.status(500).json({ error: 'Failed to get onboarding progress' });
    }
  });

  router.put('/progress', auth, requireJsonObject, (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const { completedSteps, skippedSteps, currentStep, completionPercentage, onboardingStatus, businessType, primaryWebsite, businessProfile, demoDataLoaded, widgetInstalled, firstSuccessfulConversation, completedAt } = req.body;
      const progress = onboardingRepo.update(req.user.tenantId!, {
        completedSteps, skippedSteps, currentStep, completionPercentage, onboardingStatus,
        businessType, primaryWebsite, businessProfile, demoDataLoaded, widgetInstalled, firstSuccessfulConversation, completedAt,
      });
      res.json({ progress });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Failed to update onboarding progress');
      res.status(500).json({ error: 'Failed to update onboarding progress' });
    }
  });

  router.post('/progress/complete-step', auth, requireJsonObject, (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const { step } = req.body;
      const errors = [validateRequiredString(step, 'step')].filter(Boolean);
      if (errors.length > 0) return validationError(res, errors as any);
      const progress = onboardingRepo.markStepComplete(req.user.tenantId!, step);
      res.json({ progress });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Complete step failed');
      res.status(500).json({ error: 'Failed to complete step' });
    }
  });

  router.post('/progress/skip-step', auth, requireJsonObject, (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const { step } = req.body;
      const errors = [validateRequiredString(step, 'step')].filter(Boolean);
      if (errors.length > 0) return validationError(res, errors as any);
      const progress = onboardingRepo.skipStep(req.user.tenantId!, step);
      res.json({ progress });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Skip step failed');
      res.status(500).json({ error: 'Failed to skip step' });
    }
  });

  router.get('/first-success-dashboard', auth, (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const dashboard = onboardingRepo.getFirstSuccessDashboard(req.user.tenantId!);
      res.json(dashboard);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'First success dashboard failed');
      res.status(500).json({ error: 'Failed to load dashboard' });
    }
  });

  router.get('/activation-checklist', auth, (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const checklist = onboardingRepo.getActivationChecklist(req.user.tenantId!);
      res.json(checklist);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Activation checklist failed');
      res.status(500).json({ error: 'Failed to load checklist' });
    }
  });

  router.get('/business-types', (_req: Request, res: Response) => {
    res.json({ types: BUSINESS_TYPES });
  });

  router.post('/seed-demo-data', auth, async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const tenantId = req.user.tenantId;
    try {
      const now = new Date().toISOString();
      for (const conv of SAMPLE_CONVERSATIONS) {
        const c = conversationRepo.create(tenantId!, conv.sessionId);
        conversationRepo.endConversation(c.id);
        conv.messages.forEach((msg, i) => {
          messageRepo.create({
            conversationId: c.id, tenantId: tenantId!, role: msg.role as 'user' | 'assistant', content: msg.content, sequenceNumber: i + 1,
            tokenCount: msg.content.split(' ').length * 2, latencyMs: msg.role === 'assistant' ? Math.floor(Math.random() * 500) + 200 : 0,
          });
        });
      }
      const demoDocs = [
        { filename: 'Getting Started Guide', sourceType: 'text' as const, content: 'Welcome to the platform. This guide covers setup, configuration, and best practices for using AI Customer Support.' },
        { filename: 'FAQ - Common Questions', sourceType: 'faq' as const, content: 'Q: How do I reset my password?\nA: Go to Settings > Security > Change Password.\n\nQ: What are your business hours?\nA: Mon-Fri 9AM-6PM EST.' },
        { filename: 'Pricing Overview', sourceType: 'text' as const, content: 'We offer three plans: Free (100 messages/mo), Starter ($29/mo, 1000 messages), Professional ($99/mo, 10000 messages), and Enterprise (custom).' },
      ];
      for (const doc of demoDocs) {
        const kb = kbDocRepo.create({ knowledgeBaseId: 'demo', tenantId: tenantId!, filename: doc.filename, sourceType: doc.sourceType });
        kbDocRepo.updateStatus(kb.id, 'published' as any);
      }
      onboardingRepo.update(tenantId!, { demoDataLoaded: true });
      res.json({ message: 'Demo data loaded', conversations: SAMPLE_CONVERSATIONS.length, documents: demoDocs.length });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Failed to seed demo data');
      res.status(500).json({ error: 'Failed to seed demo data' });
    }
  });

  return router;
}
