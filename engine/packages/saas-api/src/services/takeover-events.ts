import { Response } from 'express';
import { createLogger } from '@conversation-engine/logger';

const logger = createLogger('saas-api:takeover-events');

export type TakeoverEventType = 'TAKEOVER_STARTED' | 'OPERATOR_MESSAGE' | 'TAKEOVER_ENDED';

export interface TakeoverEvent {
  type: TakeoverEventType;
  tenantId: string;
  /** Visitor-facing session id (matches the widget's sessionId). */
  sessionId: string;
  conversationId: string;
  payload?: Record<string, unknown>;
}

type Listener = (event: TakeoverEvent) => void;

function channelKey(tenantId: string, sessionId: string): string {
  return `${tenantId}:${sessionId}`;
}

/**
 * In-process pub/sub for live takeover events. SSE endpoints (visitor widget +
 * agent inbox) subscribe per session; takeover/message/release routes emit.
 * This replaces the visitor widget's need to poll for takeover state changes —
 * the existing 4s message poll remains as a fallback.
 */
class TakeoverEventHub {
  private listeners = new Map<string, Set<Listener>>();
  /** Agent -> conversation ids they currently hold (for handback on disconnect). */
  private agentSessions = new Map<string, Set<string>>();

  subscribe(tenantId: string, sessionId: string, listener: Listener): () => void {
    const key = channelKey(tenantId, sessionId);
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) this.listeners.delete(key);
    };
  }

  emit(event: TakeoverEvent): void {
    const set = this.listeners.get(channelKey(event.tenantId, event.sessionId));
    if (!set || set.size === 0) return;
    for (const listener of set) {
      try {
        listener(event);
      } catch (err: any) {
        logger.warn({ err, event: event.type }, 'Takeover event listener threw');
      }
    }
  }

  /** Records that an agent is actively holding a conversation (handback tracking). */
  trackAgentSession(agentId: string, conversationId: string): void {
    let set = this.agentSessions.get(agentId);
    if (!set) {
      set = new Set();
      this.agentSessions.set(agentId, set);
    }
    set.add(conversationId);
  }

  untrackAgentSession(agentId: string, conversationId: string): void {
    const set = this.agentSessions.get(agentId);
    if (!set) return;
    set.delete(conversationId);
    if (set.size === 0) this.agentSessions.delete(agentId);
  }

  /** Conversation ids held by an agent — used to release them when the agent disconnects. */
  getAgentSessions(agentId: string): string[] {
    return Array.from(this.agentSessions.get(agentId) || []);
  }

  clearAgent(agentId: string): string[] {
    const set = this.agentSessions.get(agentId);
    this.agentSessions.delete(agentId);
    return set ? Array.from(set) : [];
  }
}

export const takeoverEvents = new TakeoverEventHub();

/** Writes one SSE data frame (JSON) to the response. */
export function writeSseEvent(res: Response, event: Record<string, unknown>): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

/**
 * Opens a long-lived SSE stream subscribed to a single session's takeover
 * events. Returns a cleanup function that unsubscribes and closes the stream.
 * The caller is responsible for `req.on('close')` wiring.
 */
export function openSessionEventStream(
  res: Response,
  tenantId: string,
  sessionId: string,
): () => void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Keep the connection alive with a heartbeat (some proxies drop idle SSE).
  const heartbeat = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {
      /* stream closed */
    }
  }, 15000);
  if (heartbeat.unref) heartbeat.unref();

  const unsubscribe = takeoverEvents.subscribe(tenantId, sessionId, (event) => {
    try {
      writeSseEvent(res, { type: event.type, sessionId: event.sessionId, conversationId: event.conversationId, payload: event.payload || {} });
    } catch {
      /* stream closed */
    }
  });

  return () => {
    clearInterval(heartbeat);
    unsubscribe();
    try {
      res.end();
    } catch {
      /* already closed */
    }
  };
}
