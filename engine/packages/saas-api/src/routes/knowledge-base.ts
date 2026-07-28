import { Router, Request, Response } from 'express';
import { KnowledgeBaseRepository, KbDocumentRepository } from '@conversation-engine/saas-core';
import {
  requireJsonObject, validateUUID, validateRequiredString, validateOptionalString,
  validateRequiredEnum, validationError, NAME_MAX, DESCRIPTION_MAX, LABEL_MAX, VALID_DOC_SOURCE_TYPES,
} from '../middleware/validate';

export function createKnowledgeBaseRoutes(kbRepo: KnowledgeBaseRepository, docRepo: KbDocumentRepository): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });
    const bases = kbRepo.listByTenant(req.user.tenantId);
    res.json({ knowledgeBases: bases });
  });

  router.post('/', requireJsonObject, (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });
    const { name, description } = req.body;

    const errors = [
      validateRequiredString(name, 'name', { maxLength: NAME_MAX }),
      validateOptionalString(description, 'description', { maxLength: DESCRIPTION_MAX }),
    ].filter(Boolean);

    if (errors.length > 0) return validationError(res, errors as any);

    const kb = kbRepo.create(req.user.tenantId, name, description);
    res.status(201).json({ knowledgeBase: kb });
  });

  router.get('/:id', (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    const idErr = validateUUID(req.params.id, 'id');
    if (idErr) return validationError(res, [idErr]);

    const kb = kbRepo.findById(req.params.id);
    if (!kb || kb.tenantId !== req.user.tenantId) return res.status(404).json({ error: 'Knowledge base not found' });
    res.json({ knowledgeBase: kb });
  });

  router.delete('/:id', (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    const idErr = validateUUID(req.params.id, 'id');
    if (idErr) return validationError(res, [idErr]);

    const kb = kbRepo.findById(req.params.id);
    if (!kb || kb.tenantId !== req.user.tenantId) return res.status(404).json({ error: 'Knowledge base not found' });
    kbRepo.delete(kb.id);
    res.json({ message: 'Knowledge base deleted' });
  });

  router.get('/:id/documents', (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    const idErr = validateUUID(req.params.id, 'id');
    if (idErr) return validationError(res, [idErr]);

    const kb = kbRepo.findById(req.params.id);
    if (!kb || kb.tenantId !== req.user.tenantId) return res.status(404).json({ error: 'Knowledge base not found' });
    const docs = docRepo.listByKnowledgeBase(kb.id);
    res.json({ documents: docs });
  });

  router.post('/:id/documents', requireJsonObject, (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    const idErr = validateUUID(req.params.id, 'id');
    if (idErr) return validationError(res, [idErr]);

    const kb = kbRepo.findById(req.params.id);
    if (!kb || kb.tenantId !== req.user.tenantId) return res.status(404).json({ error: 'Knowledge base not found' });

    const { filename, sourceType, sourceUrl } = req.body;
    const errors = [
      validateRequiredString(filename, 'filename', { maxLength: LABEL_MAX }),
      validateRequiredEnum(sourceType, 'sourceType', VALID_DOC_SOURCE_TYPES),
      validateOptionalString(sourceUrl, 'sourceUrl', { maxLength: 500 }),
    ].filter(Boolean);

    if (errors.length > 0) return validationError(res, errors as any);

    const doc = docRepo.create({ knowledgeBaseId: kb.id, tenantId: req.user.tenantId, filename, sourceType, sourceUrl });
    res.status(201).json({ document: doc });
  });

  return router;
}
