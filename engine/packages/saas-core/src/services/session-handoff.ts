import { ConversationRepository } from '../db/repositories';
import { Conversation, SessionState } from '../types';

export const TAKEOVER_ACKNOWLEDGEMENT =
  'Thanks for your message — a human team member is now assisting this conversation and will reply shortly.';

/** Auto-release after this many milliseconds if no operator message is sent. */
const TAKEOVER_TIMEOUT_MS = 90_000; // 90 seconds

/**
 * Live human agent takeover / session handoff state machine.
 *
 * State transitions (all tenant-scoped):
 *   ai_managed ──initiateTakeover──▶ human_takeover ──releaseTakeover──▶ ai_managed
 *   ai_managed ──closeSession──────▶ closed
 */
export class SessionHandoffService {
  private takeoverTimers = new Map<string, NodeJS.Timeout>();

  constructor(private conversationRepo: ConversationRepository) {}

  /**
   * Transitions a session to `human_takeover`, recording the assigned agent
   * and takeover timestamp. Returns null when the session does not exist in
   * the tenant (or is already closed).
   */
  initiateTakeover(tenantId: string, sessionId: string, agentId: string): Conversation | null {
    const conversation = this.conversationRepo.findBySession(tenantId, sessionId);
    if (!conversation || conversation.status === 'ended') return null;

    const updated = this.conversationRepo.setSessionState(conversation.id, 'human_takeover', agentId);
    if (!updated) return null;

    // Start dead-man timer — auto-release if no operator message within timeout
    this.startTakeoverTimer(updated.id, tenantId, sessionId, agentId);

    return updated;
  }

  /**
   * Hands control back to the AI (`ai_managed`), clearing assignment state.
   * Idempotent: a session that is not in takeover returns unchanged.
   */
  releaseTakeover(tenantId: string, sessionId: string): Conversation | null {
    const conversation = this.conversationRepo.findBySession(tenantId, sessionId);
    if (!conversation || conversation.status === 'ended') return null;
    if (conversation.sessionState !== 'human_takeover') return conversation;

    this.clearTakeoverTimer(conversation.id);

    return this.conversationRepo.setSessionState(conversation.id, 'ai_managed');
  }

  /**
   * Marks a session closed (terminal state — AI and agents no longer respond).
   */
  closeSession(tenantId: string, sessionId: string): Conversation | null {
    const conversation = this.conversationRepo.findBySession(tenantId, sessionId);
    if (!conversation || conversation.status === 'ended') return null;

    this.clearTakeoverTimer(conversation.id);

    return this.conversationRepo.setSessionState(conversation.id, 'closed');
  }

  /**
   * Call this when an operator sends a message during takeover.
   * Resets the dead-man timer so the session stays in takeover.
   */
  onOperatorMessage(tenantId: string, sessionId: string): void {
    const conversation = this.conversationRepo.findBySession(tenantId, sessionId);
    if (!conversation || conversation.sessionState !== 'human_takeover') return;

    this.clearTakeoverTimer(conversation.id);
    this.startTakeoverTimer(conversation.id, tenantId, sessionId, conversation.assignedAgentId || 'agent');
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

  /** Start the dead-man timer for a takeover session. */
  private startTakeoverTimer(conversationId: string, tenantId: string, sessionId: string, agentId: string): void {
    this.clearTakeoverTimer(conversationId);

    const timer = setTimeout(() => {
      console.warn(`[Handoff] DEAD-MAN TIMEOUT — conversation=${conversationId} agent=${agentId} — releasing to AI`);
      this.releaseTakeover(tenantId, sessionId);
      // Emit event so the widget knows to send the fallback message
      this.onDeadManTimeout?.(tenantId, sessionId, conversationId);
    }, TAKEOVER_TIMEOUT_MS);

    this.takeoverTimers.set(conversationId, timer);
  }

  /** Clear the dead-man timer. */
  private clearTakeoverTimer(conversationId: string): void {
    const timer = this.takeoverTimers.get(conversationId);
    if (timer) {
      clearTimeout(timer);
      this.takeoverTimers.delete(conversationId);
    }
  }

  /** Optional callback when dead-man timer fires — set by the API layer. */
  onDeadManTimeout?: (tenantId: string, sessionId: string, conversationId: string) => void;
}
