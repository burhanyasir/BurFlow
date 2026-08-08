import { ConversationRepository } from '../db/repositories';
import { Conversation, SessionState } from '../types';

export const TAKEOVER_ACKNOWLEDGEMENT =
  'Thanks for your message — a human team member is now assisting this conversation and will reply shortly.';

/**
 * Live human agent takeover / session handoff state machine.
 *
 * State transitions (all tenant-scoped):
 *   ai_managed ──initiateTakeover──▶ human_takeover ──releaseTakeover──▶ ai_managed
 *   ai_managed ──closeSession──────▶ closed
 */
export class SessionHandoffService {
  constructor(private conversationRepo: ConversationRepository) {}

  /**
   * Transitions a session to `human_takeover`, recording the assigned agent
   * and takeover timestamp. Returns null when the session does not exist in
   * the tenant (or is already closed).
   */
  initiateTakeover(tenantId: string, sessionId: string, agentId: string): Conversation | null {
    const conversation = this.conversationRepo.findBySession(tenantId, sessionId);
    if (!conversation || conversation.status === 'ended') return null;
    return this.conversationRepo.setSessionState(conversation.id, 'human_takeover', agentId);
  }

  /**
   * Hands control back to the AI (`ai_managed`), clearing assignment state.
   * Idempotent: a session that is not in takeover returns unchanged.
   */
  releaseTakeover(tenantId: string, sessionId: string): Conversation | null {
    const conversation = this.conversationRepo.findBySession(tenantId, sessionId);
    if (!conversation || conversation.status === 'ended') return null;
    if (conversation.sessionState !== 'human_takeover') return conversation;
    return this.conversationRepo.setSessionState(conversation.id, 'ai_managed');
  }

  /**
   * Marks a session closed (terminal state — AI and agents no longer respond).
   */
  closeSession(tenantId: string, sessionId: string): Conversation | null {
    const conversation = this.conversationRepo.findBySession(tenantId, sessionId);
    if (!conversation || conversation.status === 'ended') return null;
    return this.conversationRepo.setSessionState(conversation.id, 'closed');
  }

  /**
   * Fast state check: whether the AI is still driving this session.
   * Sessions that do not exist yet are treated as AI-managed.
   */
  isAiManaged(tenantId: string, sessionId: string): boolean {
    const conversation = this.conversationRepo.findBySession(tenantId, sessionId);
    if (!conversation) return true;
    return conversation.sessionState === 'ai_managed';
  }

  getSessionState(tenantId: string, sessionId: string): SessionState {
    const conversation = this.conversationRepo.findBySession(tenantId, sessionId);
    return conversation ? conversation.sessionState : 'ai_managed';
  }
}
