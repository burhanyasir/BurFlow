import {
  processConversationBrain,
  ConversationIntelligenceMemory,
  PersonaType,
} from '@conversation-engine/conversation-orchestrator';
import { SessionStore, SessionRecord } from '@conversation-engine/session-store';

const INTEL_STATE_KEY = 'conversationIntel';

export interface EnrichedChatResponse {
  response: string;
  turnId: string;
  latencyMs: number;
  stageTimings?: Record<string, number>;
  degraded?: string[];
  error?: { code: string; message: string };
  conversationIntelligence?: {
    leadScore: number;
    conversationScore: number;
    sentiment: { polarity: number; frustration: string; urgency: string; trend: string };
    abandonmentRisk: { level: string; score: number; details?: string };
    repetition: { hasRepetition: boolean; count: number };
    escalation: { shouldEscalate: boolean; urgency: string; reason?: string };
    routingDecision: { decision: string; label: string; confidence: number };
    buyingIntent: { hasBuyingIntent: boolean; phrase?: string; targetTier?: string; confidence: number };
    qualification: { progress: number; completed: boolean };
    trustSignal?: { shouldInject: boolean; type?: string; reason?: string };
  };
  cta: { primaryCTA: string; label: string; link: string };
  quickReplies: Array<{ id: string; label: string; action: string; payload: string; variant?: string }>;
  conversationBrain?: {
    goal: string;
    customerIntent: string;
    funnelStage: string;
    topicsDiscussed: string[];
    missingQualification: string[];
    validationIssues: string[];
  };
}

function parseIntelState(session: SessionRecord | null): ConversationIntelligenceMemory {
  if (!session) return defaultMemory();
  try {
    const data = JSON.parse(session.state);
    const intel = data[INTEL_STATE_KEY];
    if (intel) return intel as ConversationIntelligenceMemory;
  } catch {}
  return defaultMemory();
}

function defaultMemory(): ConversationIntelligenceMemory {
  return {
    turns: [],
    persona: 'unknown' as PersonaType,
    funnelStage: 'greeting' as any,
    buyingIntentDetected: false,
    objections: [],
    qualificationState: { questionsAskedCount: 0, completed: false },
    repeatedPhraseCount: 0,
    topics: [],
  };
}

function serializeIntelState(memory: ConversationIntelligenceMemory): string {
  return JSON.stringify({ [INTEL_STATE_KEY]: memory });
}

export async function enrichWithConversationIntelligence(
  pipelineResponse: { response: string; turnId: string; latencyMs: number; stageTimings?: Record<string, number>; degradedStages?: string[]; error?: { code: string; message: string } },
  message: string,
  tenantId: string,
  sessionStore: SessionStore,
  sessionId: string,
): Promise<EnrichedChatResponse> {
  const session = await sessionStore.loadSession(tenantId, sessionId);
  const legacyMemory = parseIntelState(session);

  const brainResult = await processConversationBrain({
    message,
    responseText: pipelineResponse.response,
    legacyMemory,
  });

  const intelState = serializeIntelState(brainResult.legacyMemory);
  if (session) {
    await sessionStore.commitSession(tenantId, sessionId, session.version, { state: intelState });
  }

  const { ciResult } = brainResult;

  return {
    response: pipelineResponse.response,
    turnId: pipelineResponse.turnId,
    latencyMs: pipelineResponse.latencyMs,
    stageTimings: pipelineResponse.stageTimings,
    degraded: pipelineResponse.degradedStages && pipelineResponse.degradedStages.length > 0 ? pipelineResponse.degradedStages : undefined,
    error: pipelineResponse.error,
    conversationIntelligence: {
      leadScore: ciResult.leadScore?.overallScore ?? 0,
      conversationScore: ciResult.conversationScore?.overallScore ?? 0,
      sentiment: {
        polarity: ciResult.sentiment.polarity,
        frustration: ciResult.sentiment.frustration,
        urgency: ciResult.sentiment.urgency,
        trend: ciResult.sentiment.trend,
      },
      abandonmentRisk: {
        level: ciResult.abandonmentRisk.level,
        score: ciResult.abandonmentRisk.score,
        details: ciResult.abandonmentRisk.details,
      },
      repetition: {
        hasRepetition: ciResult.repetition.hasRepetition,
        count: ciResult.repetition.count,
      },
      escalation: {
        shouldEscalate: ciResult.escalation.shouldEscalate,
        urgency: ciResult.escalation.urgency,
        reason: ciResult.escalation.reason,
      },
      routingDecision: {
        decision: ciResult.routingDecision.decision,
        label: ciResult.routingDecision.label,
        confidence: ciResult.routingDecision.confidence,
      },
      buyingIntent: {
        hasBuyingIntent: ciResult.buyingIntent.hasBuyingIntent,
        phrase: ciResult.buyingIntent.intentPhrase,
        targetTier: ciResult.buyingIntent.targetTier,
        confidence: ciResult.buyingIntent.confidence,
      },
      qualification: {
        progress: ciResult.qualificationProgress,
        completed: ciResult.qualification.completed,
      },
      trustSignal: ciResult.trustSignal.shouldInject
        ? { shouldInject: true, type: ciResult.trustSignal.signalType, reason: ciResult.trustSignal.reason }
        : undefined,
    },
    cta: {
      primaryCTA: brainResult.cta.primaryCTA,
      label: brainResult.cta.label,
      link: brainResult.cta.link,
    },
    quickReplies: brainResult.quickReplies.map(qr => ({
      id: qr.id,
      label: qr.label,
      action: qr.action,
      payload: qr.payload,
      variant: qr.variant,
    })),
    conversationBrain: brainResult.plan ? {
      goal: brainResult.plan.goal,
      customerIntent: brainResult.plan.customerIntent,
      funnelStage: brainResult.plan.funnelStage,
      topicsDiscussed: brainResult.plan.topicsToDiscuss,
      missingQualification: brainResult.plan.missingQualification,
      validationIssues: brainResult.validation.issues,
    } : undefined,
  };
}
