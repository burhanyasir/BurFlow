import { apiClient, API_BASE } from '../lib/api-client';
import { storage } from '../lib/storage';

export type SessionState = 'ai_managed' | 'human_takeover' | 'closed';

export interface AgentSession {
  id: string;
  sessionId: string;
  visitorName?: string;
  visitorEmail?: string;
  leadScore: number | null;
  qualificationStatus: string | null;
  buyingIntent: string | null;
  sessionState: SessionState;
  assignedAgentId?: string;
  takeoverAt?: string;
  startedAt: string;
  messageCount: number;
  lastMessage?: string;
  lastActivityAt: string;
  pendingHandoff: boolean;
  needsTakeover: boolean;
}

export interface SessionMessage {
  id: string;
  conversationId: string;
  tenantId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sequenceNumber: number;
  createdAt: string;
  sender?: 'agent';
}

export interface AgentThread {
  sessionId: string;
  conversationId: string;
  sessionState: SessionState;
  messages: SessionMessage[];
  total: number;
}

export interface AgentActionResponse {
  sessionId: string;
  conversationId: string;
  sessionState: SessionState;
  assignedAgentId?: string;
  takeoverAt?: string;
}

export interface AgentMessageResponse {
  id: string;
  conversationId: string;
  role: 'assistant';
  content: string;
  sequenceNumber: number;
  createdAt: string;
  sender: 'agent';
}

/** Active sessions for the agent inbox. */
export async function fetchSessions(): Promise<{ sessions: AgentSession[]; total: number }> {
  return apiClient.get<{ sessions: AgentSession[]; total: number }>('/sessions');
}

/** Full message thread for a session. */
export async function fetchMessages(sessionConversationId: string): Promise<AgentThread> {
  return apiClient.get<AgentThread>(`/sessions/${sessionConversationId}/messages`);
}

/** Take control of a session (AI responses are suppressed while active). */
export async function initiateTakeover(sessionConversationId: string, agentId?: string): Promise<AgentActionResponse> {
  return apiClient.post<AgentActionResponse>(`/sessions/${sessionConversationId}/takeover`, agentId ? { agentId } : {});
}

/** Release control back to the AI. */
export async function releaseTakeover(sessionConversationId: string): Promise<AgentActionResponse> {
  return apiClient.post<AgentActionResponse>(`/sessions/${sessionConversationId}/release`, {});
}

/** Send a manual reply from the agent to the visitor. */
export async function sendAgentMessage(sessionConversationId: string, content: string): Promise<AgentMessageResponse> {
  return apiClient.post<AgentMessageResponse>(`/sessions/${sessionConversationId}/message`, { content });
}

/**
 * Opens the agent presence stream (SSE). While this connection is open the
 * agent's takeovers stay active; when it drops (tab closed / navigation) the
 * server automatically releases every session this agent holds and the AI
 * resumes. Returns an AbortController to close the stream.
 */
export function openAgentEventStream(): AbortController {
  const controller = new AbortController();
  const token = storage.getToken();
  const headers: Record<string, string> = { Accept: 'text/event-stream' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  fetch(`${API_BASE}/sessions/events`, { headers, signal: controller.signal }).catch(() => {
    // Presence stream is best-effort — the 3s session poll covers updates.
  });
  return controller;
}
