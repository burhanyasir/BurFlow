import { TurnContext } from '@conversation-engine/core-types';
import { ResponseGenerator, GeneratorInput } from '@conversation-engine/response-generator';
import { createLogger } from '@conversation-engine/logger';

const logger = createLogger('response-generator');

const INTEL_STATE_KEY = 'conversationIntel';

export function buildGeneratorInput(context: TurnContext): GeneratorInput | null {
  const state = context.sessionState?.data || {};
  const intel = state[INTEL_STATE_KEY] as any || {};

  let conversationHistory = (context.conversationHistory || []).map(m => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }));

  // Inject system-level instruction for greeting bypass
  if ((context as any).isGreeting) {
    const greetingPrompts = [
      "The user sent a greeting. Respond with a warm, friendly welcome message. Introduce yourself as an AI assistant for Conversation Engine, a platform that turns documentation into instant answers with grounded AI.",
      "Suggest they can ask about: product features, pricing plans, integrations (Zendesk, Intercom, Slack), SSO/SAML, or how the grounding engine works.",
      "Keep the tone enthusiastic and helpful. End with a question to engage them.",
    ];
    conversationHistory = [
      { role: 'system', content: greetingPrompts.join(' ') },
      ...conversationHistory,
    ];
  }

  // RAG guardrail: inject system instruction when knowledge confidence is low
  if ((context as any).knowledgeLowConfidence) {
    const guardrailPrompt = [
      "IMPORTANT: The knowledge base results below have LOW CONFIDENCE scores and may not be relevant to the user's question.",
      "Do NOT answer the question using these low-confidence knowledge results.",
      "Instead, respond gracefully: explain that you focus on answering questions about Conversation Engine's product, documentation, features, pricing, and integrations.",
      "If the question appears to be about a topic outside of Conversation Engine, politely say: 'I'm sorry, I specialize in answering questions about Conversation Engine and our documentation. I can't help with that specific topic, but I'd be happy to tell you about our product, pricing, or how to get started.'",
    ];
    conversationHistory.unshift({ role: 'system', content: guardrailPrompt.join(' ') });
  }

  return {
    message: context.message,
    conversationHistory,
    persona: intel.persona || 'unknown',
    intent: context.intent?.intent || 'unknown',
    buyingIntent: {
      detected: intel.buyingIntentDetected || false,
      phrase: intel.buyingIntentPhrase,
      tier: intel.buyingIntentTier,
      confidence: intel.buyingIntent?.confidence || 0,
    },
    leadScore: intel.leadScore?.overallScore || 0,
    conversationScore: intel.conversationScore?.overallScore || 0,
    qualificationState: {
      completed: intel.qualificationState?.completed || false,
      progress: intel.qualificationProgress || 0,
      answeredQuestions: Object.keys(intel.qualificationState || {}).filter(k => k !== 'completed'),
    },
    sentiment: {
      polarity: intel.sentiment?.polarity || 0,
      frustration: intel.sentiment?.frustration || 'low',
      urgency: intel.sentiment?.urgency || 'low',
      trend: intel.sentiment?.trend || 'stable',
    },
    trustSignals: intel.trustSignals || [],
    recoveryState: {
      needsRecovery: intel.recoveryState?.needsRecovery || false,
      recoverySuggestion: intel.recoveryState?.recoverySuggestion,
    },
    abandonmentRisk: {
      level: intel.abandonmentRisk?.level || 'low',
      score: intel.abandonmentRisk?.score || 0,
      details: intel.abandonmentRisk?.details,
    },
    contextStack: state as Record<string, unknown>,
    knowledgeResults: (context as any).knowledgeResults || [],
    currentCta: {
      primaryCTA: intel.cta?.primaryCTA || 'none',
      label: intel.cta?.label || '',
      link: intel.cta?.link || '',
    },
    quickReplies: (intel.quickReplies || []).map((qr: any) => ({
      id: qr.id || '',
      label: qr.label || '',
      action: qr.action || '',
      payload: qr.payload || '',
    })),
    funnelStage: intel.funnelStage || 'greeting',
    objections: intel.objections || [],
    topics: intel.topics || [],
    systemPrompt: context.tenantConfig?.llm.systemPrompt,
    tenantConfig: context.tenantConfig ? {
      model: context.tenantConfig.llm.model,
      temperature: context.tenantConfig.llm.temperature,
      maxTokens: context.tenantConfig.llm.maxTokens,
    } : undefined,
  };
}

export async function runLLMResponseGeneration(
  context: TurnContext,
  generator: ResponseGenerator,
  signal: AbortSignal,
): Promise<{ used: boolean; message: string }> {
  if (!context.tenantConfig) {
    return { used: false, message: 'No tenant config' };
  }

  const input = buildGeneratorInput(context);
  if (!input) {
    return { used: false, message: 'Could not build generator input' };
  }

  try {
    const output = await generator.generate(input, signal);
    context.generatedResponse = output.response;

    if (output.usage) {
      logger.info({
        provider: output.usage.provider,
        model: output.usage.model,
        tokens: output.usage.totalTokens,
        latencyMs: output.usage.latencyMs,
        confidence: output.confidence,
      }, 'LLM response generated');
    }

    return { used: true, message: output.response };
  } catch (err: any) {
    logger.warn({ err: err.message }, 'LLM response generation failed, using fallback');
    return { used: false, message: err.message };
  }
}
