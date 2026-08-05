import { Router, Request, Response } from 'express';
import { ConversationRepository, MessageRepository } from '@conversation-engine/saas-core';
import { validateUUID, validationError, parsePagination } from '../middleware/validate';

function findConversation(conversationRepo: ConversationRepository, tenantId: string, idOrSession: string) {
  const uuidErr = validateUUID(idOrSession, 'id');
  if (!uuidErr) {
    const conv = conversationRepo.findById(idOrSession);
    if (conv && conv.tenantId === tenantId) return conv;
  }
  return conversationRepo.findBySession(tenantId, idOrSession);
}

export function createConversationRoutes(conversationRepo: ConversationRepository, messageRepo: MessageRepository): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });
    const { page, limit } = parsePagination(req.query, { page: 1, limit: 20, maxLimit: 200 });
    const status = req.query.status as string | undefined;
    const validStatuses = ['active', 'ended', 'escalated'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    const result = conversationRepo.listByTenant(req.user.tenantId, page, limit, status);
    res.json(result);
  });

  router.get('/:id', (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    const idErr = validateUUID(req.params.id, 'id');
    if (idErr) return validationError(res, [idErr]);

    const conversation = findConversation(conversationRepo, req.user.tenantId, req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ conversation });
  });

  router.get('/:id/messages', (req: Request, res: Response) => {
    if (!req.user?.tenantId) return res.status(401).json({ error: 'Tenant context required' });

    const idErr = validateUUID(req.params.id, 'id');
    if (idErr) return validationError(res, [idErr]);

    const conversation = findConversation(conversationRepo, req.user.tenantId, req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const { page, limit } = parsePagination(req.query, { page: 1, limit: 50, maxLimit: 200 });
    const result = messageRepo.listByConversation(conversation.id, page, limit);
    res.json(result);
  });

  return router;
}
