import {
  ConversationIntelligenceMemory,
  ConversationIntelligenceResult,
  SentimentSnapshot,
  AbandonmentRisk,
  RepetitionStatus,
  EscalationRecommendation,
  RoutingDecision,
  TrustSignal,
} from './conversation-intelligence-types';
import { PersonaType, FunnelStage, ObjectionCategory, QualificationState, SmartButton } from './types';
import { orchestrateTurn } from './orchestrator';

const FRUSTRATION_PHRASES = ['frustrating', 'annoying', 'terrible', 'worst', 'horrible', 'bad service', 'unacceptable', 'useless', 'never works', 'waste of time', 'too slow', 'not working', 'broken', 'fix this', 'help me', 'urgent', 'asap', 'immediately', 'right now'];
const URGENCY_PHRASES = ['urgent', 'asap', 'immediately', 'right now', 'emergency', 'critical', 'deadline', 'today', 'hurry', 'fast'];
const POSITIVE_PHRASES = ['great', 'awesome', 'amazing', 'perfect', 'excellent', 'love', 'wonderful', 'fantastic', 'good', 'nice', 'helpful', 'thank', 'thanks', 'works', 'solved', 'impressed'];
const NEGATIVE_PHRASES = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'disappointed', 'frustrated', 'angry', 'wrong', 'error', 'issue', 'problem', 'broken', 'not working', 'poor'];
const ABANDONMENT_PHRASES = ["i'll think about it", 'need to think', 'maybe later', 'not now', 'check back', 'let me decide', 'i need time', 'call me later', 'not interested', 'decide later', 'get back to me', 'still thinking', 'i will let you know', 'talk to my team'];
const TRUST_SIGNAL_STAGES: Partial<Record<FunnelStage, { type: TrustSignal['signalType']; reason: string }>> = {
  objection: { type: 'soc2', reason: 'Objection detected — inject trust signal for objection category' },
  evaluation: { type: 'testimonial', reason: 'Evaluation stage — use testimonial to build confidence' },
  purchase_intent: { type: 'trial', reason: 'Purchase intent — emphasize free trial' },
};
const TRUST_SIGNAL_PERSONA: Partial<Record<PersonaType, { type: TrustSignal['signalType']; reason: string }>> = {
  enterprise: { type: 'soc2', reason: 'Enterprise persona detected — emphasize SOC 2 / enterprise security' },
};
const ROUTING_RULES: Array<{ condition: (mem: ConversationIntelligenceMemory, result: ConversationIntelligenceResult) => boolean; decision: RoutingDecision['decision']; label: string }> = [
  { condition: (mem, result) => result.objection.category === 'enterprise_procurement', decision: 'enterprise_sales', label: 'Route to Enterprise Sales — procurement objection' },
  { condition: (mem, result) => result.objection.category === 'security' && (mem.persona === 'enterprise' || mem.persona === 'unknown'), decision: 'sdr', label: 'Route to SDR — security objection needs human conversation' },
  { condition: (mem, result) => result.escalation.shouldEscalate, decision: 'escalate', label: 'Route to escalation — sentiment escalation' },
  { condition: (mem, result) => result.buyingIntent.hasBuyingIntent && (mem.funnelStage === 'purchase_intent' || mem.funnelStage === 'evaluation'), decision: 'sales', label: 'Route to Sales — high buying intent' },
  { condition: (mem, result) => result.buyingIntent.targetTier === 'enterprise', decision: 'enterprise_sales', label: 'Route to Enterprise Sales — enterprise tier interest' },
  { condition: (mem, result) => result.isFallback, decision: 'support', label: 'Route to Support — fallback response may need human help' },
  { condition: (mem, result) => mem.turns.length >= 8 && result.leadScore.overallScore > 70, decision: 'sales', label: 'Route to Sales — high engagement after 8+ turns' },
];

function detectAbandonmentRisk(message: string, memory: ConversationIntelligenceMemory): AbandonmentRisk {
  const lowerMsg = message.toLowerCase().trim();

  const matchedPhrase = ABANDONMENT_PHRASES.find(p => lowerMsg.includes(p));

  if (matchedPhrase) {
    return { level: 'high', score: 85, details: `Abandonment phrase detected: "${matchedPhrase}"` };
  }

  if (memory.turns.length >= 2) {
    const lastTurn = memory.turns[memory.turns.length - 1];
    const lastPolarity = lastTurn.polarity;
    if (lastPolarity < -0.3 && memory.turns.length >= 3) {
      return { level: 'medium', score: 55, details: 'Declining sentiment over multiple turns' };
    }
  }

  if (memory.turns.length >= 10 && memory.turns.every(t => t.polarity < 0.1)) {
    return { level: 'medium', score: 45, details: 'Extended conversation without positive engagement' };
  }

  return { level: 'low', score: 10 };
}

function detectSentiment(message: string, history: ConversationIntelligenceMemory['turns']): { polarity: number; frustration: number; urgency: number } {
  const lowerMsg = message.toLowerCase();
  let polarity = 0;
  let frustration = 0;
  let urgency = 0;

  for (const phrase of POSITIVE_PHRASES) {
    if (lowerMsg.includes(phrase)) polarity += 0.15;
  }
  for (const phrase of NEGATIVE_PHRASES) {
    if (lowerMsg.includes(phrase)) polarity -= 0.15;
  }
  for (const phrase of FRUSTRATION_PHRASES) {
    if (lowerMsg.includes(phrase)) frustration += 0.2;
  }
  for (const phrase of URGENCY_PHRASES) {
    if (lowerMsg.includes(phrase)) urgency += 0.25;
  }

  if (lowerMsg.includes('?')) polarity -= 0.05;
  if (lowerMsg.length > 100) frustration += 0.1;
  if (lowerMsg.includes('!')) urgency += 0.1;

  polarity = Math.max(-1, Math.min(1, polarity));
  frustration = Math.max(0, Math.min(1, frustration));
  urgency = Math.max(0, Math.min(1, urgency));

  if (history.length > 0) {
    const avgHistoryPolarity = history.reduce((sum, t) => sum + t.polarity, 0) / history.length;
    polarity = (polarity + avgHistoryPolarity) / 2;
  }

  return { polarity, frustration, urgency };
}

function computeSentimentTrend(history: ConversationIntelligenceMemory['turns']): SentimentSnapshot['trend'] {
  if (history.length < 3) return 'stable';
  const recent = history.slice(-3).map(t => t.polarity);
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const older = history.slice(-6, -3).map(t => t.polarity);
  if (older.length === 0) return 'stable';
  const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
  const diff = avgRecent - avgOlder;
  if (diff > 0.1) return 'improving';
  if (diff < -0.1) return 'declining';
  return 'stable';
}

function detectRepetition(message: string, history: ConversationIntelligenceMemory['turns']): RepetitionStatus {
  if (history.length === 0) return { hasRepetition: false, count: 0, topics: [] };

  const words = message.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3);
  const repeatedTopics: string[] = [];
  let count = 0;

  for (const turn of history) {
    const turnWords = turn.message.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3);
    const overlap = words.filter(w => turnWords.includes(w));
    if (overlap.length >= 3) {
      count++;
      for (const topic of overlap.slice(0, 2)) {
        if (!repeatedTopics.includes(topic)) repeatedTopics.push(topic);
      }
    }
  }

  return { hasRepetition: count >= 2, count, topics: repeatedTopics.slice(0, 4) };
}

function computeLeadScore(memory: ConversationIntelligenceMemory, result: { polarity: number; frustration: number; urgency: number }): number {
  let score = 20;

  if (memory.buyingIntentDetected) score += 30;
  if (memory.qualificationState.completed) score += 15;
  if (memory.turns.length >= 3) score += 10;
  if (memory.turns.length >= 6) score += 5;

  const objectionHasPrice = memory.objections.includes('price');
  if (objectionHasPrice) score += 10;

  const personaScores: Partial<Record<PersonaType, number>> = {
    enterprise: 15,
    developer: 5,
    startup: 10,
    small_business: 5,
    agency: 10,
    ecommerce: 8,
    support_manager: 3,
  };
  score += personaScores[memory.persona as keyof typeof personaScores] || 0;

  if (result.polarity < -0.3) score -= 10;
  if (result.frustration > 0.6) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function computeConversationScore(memory: ConversationIntelligenceMemory, result: { polarity: number }): number {
  let score = 30;

  const turnBonus = Math.min(memory.turns.length * 5, 20);
  score += turnBonus;

  if (memory.buyingIntentDetected) score += 20;
  if (result.polarity > 0) score += 10;
  if (result.polarity < -0.5) score -= 10;
  if (memory.objections.length > 0) score += 5;
  if (memory.qualificationState.completed) score += 10;

  return Math.max(0, Math.min(100, score));
}

function computeEscalation(sentiment: { frustration: number; polarity: number }, repetition: RepetitionStatus, abandonment: AbandonmentRisk): EscalationRecommendation {
  if (sentiment.frustration > 0.6 && sentiment.polarity < -0.3) {
    return { shouldEscalate: true, urgency: 'high', reason: 'High frustration with negative sentiment' };
  }
  if (abandonment.level === 'high') {
    return { shouldEscalate: true, urgency: 'medium', reason: 'High abandonment risk detected' };
  }
  if (repetition.hasRepetition && repetition.count >= 3) {
    return { shouldEscalate: true, urgency: 'medium', reason: 'Persistent repetition detected' };
  }
  return { shouldEscalate: false, urgency: 'low' };
}

function computeQualificationProgress(state: QualificationState): number {
  if (state.completed) return 100;
  const progress = state.questionsAskedCount * 33;
  return Math.min(progress, 90);
}

function computeRoutingDecision(memory: ConversationIntelligenceMemory, result: {
  buyingIntent: ConversationIntelligenceResult['buyingIntent'];
  objection: ConversationIntelligenceResult['objection'];
  escalation: EscalationRecommendation;
  leadScore: number;
  isFallback: boolean;
}): RoutingDecision {
  for (const rule of ROUTING_RULES) {
    if (rule.condition(memory, result as any)) {
      return { decision: rule.decision, confidence: 0.85, label: rule.label };
    }
  }
  return { decision: 'assistant', confidence: 0.95, label: 'Handled by AI assistant' };
}

function computeTrustSignal(stage: FunnelStage, persona: PersonaType): TrustSignal {
  const stageSignal = TRUST_SIGNAL_STAGES[stage];
  const personaSignal = TRUST_SIGNAL_PERSONA[persona];
  if (personaSignal) return { shouldInject: true, ...personaSignal };
  if (stageSignal) return { shouldInject: true, ...stageSignal };
  return { shouldInject: false };
}

function buildQuickReplies(stage: FunnelStage, abandonment: AbandonmentRisk, repetition: RepetitionStatus, trustSignal: TrustSignal, memory?: ConversationIntelligenceMemory): SmartButton[] {
  const replies: SmartButton[] = [];

  if (abandonment.level === 'high') {
    replies.push({ id: 'qr_discount', label: '🔥 Special Offer', action: 'send_text', payload: 'Tell me about your current promotions', variant: 'primary' });
    replies.push({ id: 'qr_demo', label: '📅 Book a Quick Demo', action: 'navigate', payload: '/demo', variant: 'secondary' });
    return replies;
  }

  if (repetition.hasRepetition) {
    replies.push({ id: 'qr_human', label: '👋 Talk to a Human', action: 'send_text', payload: 'I would like to speak with a human agent', variant: 'primary' });
    replies.push({ id: 'qr_retry', label: '🔁 Try a Different Approach', action: 'send_text', payload: 'Let me rephrase my question', variant: 'secondary' });
    return replies;
  }

  if (trustSignal.shouldInject) {
    if (trustSignal.signalType === 'soc2') {
      replies.push({ id: 'qr_security', label: '🔒 View Security Docs', action: 'send_text', payload: 'Tell me about your security compliance', variant: 'outline' });
    }
    if (trustSignal.signalType === 'testimonial') {
      replies.push({ id: 'qr_customers', label: '⭐ Customer Stories', action: 'send_text', payload: 'Tell me about your customers', variant: 'outline' });
    }
  }

  const turnCount = memory?.turns?.length ?? 0;
  const hasObjPrice = memory?.objections?.includes('price');
  const hasObjSecurity = memory?.objections?.includes('security');
  const hasObjImplementation = memory?.objections?.includes('implementation');
  const hasObjCompetition = memory?.objections?.includes('competition');
  const buyingIntentDetected = memory?.buyingIntentDetected ?? false;
  const qualCompleted = memory?.qualificationState?.completed ?? false;
  const qualProgress = memory?.qualificationState?.questionsAskedCount ?? 0;
  const persona = memory?.persona;

  // Extract topics mentioned from turn history
  const mentionedTopics = new Set<string>();
  for (const t of memory?.turns ?? []) {
    const lower = t.message.toLowerCase();
    if (/(feature|capabilit|what do you do|what can|what does|product|platform|functionality)/i.test(lower)) mentionedTopics.add('features');
    if (/(price|pricing|cost|plan|tier|how much|subscription)/i.test(lower)) mentionedTopics.add('pricing');
    if (/(integrat|zendesk|intercom|slack|widget|embed|connect|plugin)/i.test(lower)) mentionedTopics.add('integrations');
    if (/(security|compliance|soc2|soc 2|gdpr|hipaa|encrypt|data.privacy)/i.test(lower)) mentionedTopics.add('security');
    if (/(demo|trial|free|try|get.started)/i.test(lower)) mentionedTopics.add('trial');
    if (/(api|sdk|developer|dev|code|webhook|rest)/i.test(lower)) mentionedTopics.add('developer');
    if (/(compare|vs |versus|competitor|alternative|difference|better.than)/i.test(lower)) mentionedTopics.add('comparison');
    if (/(walkthrough|how.*work|pipeline|architecture|technical.*overview)/i.test(lower)) mentionedTopics.add('walkthrough');
  }

  // Objection-specific follow-up suggestions
  if (hasObjPrice) {
    replies.push({ id: 'qr_obj_price_roi', label: '📈 ROI Breakdown', action: 'send_text', payload: 'Show me the ROI calculation', variant: 'secondary' });
    replies.push({ id: 'qr_obj_price_trial', label: '🚀 Try Free', action: 'navigate', payload: '/signup', variant: 'primary' });
    return replies.slice(0, 3);
  }
  if (hasObjSecurity) {
    replies.push({ id: 'qr_obj_sec_docs', label: '🔒 Security Docs', action: 'navigate', payload: '/security', variant: 'primary' });
    replies.push({ id: 'qr_obj_sec_contact', label: '📞 Talk to Security', action: 'send_text', payload: 'Connect me with your security team', variant: 'secondary' });
    return replies.slice(0, 3);
  }
  if (hasObjImplementation) {
    replies.push({ id: 'qr_obj_impl_guide', label: '📋 Setup Guide', action: 'navigate', payload: '/docs/setup', variant: 'primary' });
    replies.push({ id: 'qr_obj_impl_case', label: '📖 Migration Stories', action: 'send_text', payload: 'Show me customer migration stories', variant: 'secondary' });
    return replies.slice(0, 3);
  }
  if (hasObjCompetition) {
    replies.push({ id: 'qr_obj_comp_compare', label: '📊 Side-by-Side', action: 'send_text', payload: 'Show me a side-by-side comparison', variant: 'secondary' });
    replies.push({ id: 'qr_obj_comp_trial', label: '🚀 Try Free', action: 'navigate', payload: '/signup', variant: 'primary' });
    return replies.slice(0, 3);
  }

  // Qualification contextual
  if (!qualCompleted && turnCount >= 2 && qualProgress < 2) {
    replies.push({ id: 'qr_qual_help', label: '🎯 Help Me Choose', action: 'send_text', payload: 'Help me find the right plan', variant: 'primary' });
    replies.push({ id: 'qr_qual_features', label: '⚙️ Features', action: 'send_text', payload: 'What features do you offer?', variant: 'secondary' });
    return replies.slice(0, 3);
  }

  // Stage-appropriate suggestions using history awareness
  switch (stage) {
    case 'greeting':
    case 'discovery':
      if (!mentionedTopics.has('features')) replies.push({ id: 'qr_features', label: '⚙️ Features', action: 'send_text', payload: 'What features do you offer?', variant: 'secondary' });
      if (!mentionedTopics.has('integrations')) replies.push({ id: 'qr_integrate', label: '🔌 Integrations', action: 'send_text', payload: 'What integrations do you support?', variant: 'outline' });
      if (!mentionedTopics.has('pricing')) replies.push({ id: 'qr_pricing', label: '💰 Pricing', action: 'send_text', payload: 'What are your pricing tiers?', variant: 'secondary' });
      replies.push({ id: 'qr_demo', label: '🎥 Watch Demo', action: 'navigate', payload: '/demo', variant: 'primary' });
      break;
    case 'interest':
      if (!mentionedTopics.has('features')) replies.push({ id: 'qr_how_works', label: '⚙️ How It Works', action: 'send_text', payload: 'How does the grounding engine work?', variant: 'secondary' });
      if (!mentionedTopics.has('integrations')) replies.push({ id: 'qr_integrate', label: '🔌 Integration Guide', action: 'send_text', payload: 'How do I integrate the widget?', variant: 'outline' });
      if (!mentionedTopics.has('pricing')) replies.push({ id: 'qr_pricing', label: '💰 Pricing Plans', action: 'send_text', payload: 'What are your pricing tiers?', variant: 'secondary' });
      break;
    case 'evaluation':
      if (!mentionedTopics.has('comparison') && !mentionedTopics.has('pricing')) replies.push({ id: 'qr_compare', label: '📊 Compare Plans', action: 'send_text', payload: 'Compare all plan features', variant: 'secondary' });
      replies.push({ id: 'qr_trial', label: '🚀 Start Free Trial', action: 'navigate', payload: '/signup', variant: 'primary' });
      if (!mentionedTopics.has('security')) replies.push({ id: 'qr_security', label: '🔒 Security', action: 'send_text', payload: 'Tell me about security', variant: 'outline' });
      break;
    case 'purchase_intent':
      replies.push({ id: 'qr_signup', label: '✨ Start 14-Day Trial', action: 'navigate', payload: '/signup', variant: 'primary' });
      replies.push({ id: 'qr_contact', label: '💬 Talk to Sales', action: 'send_text', payload: 'I want to talk to sales', variant: 'secondary' });
      if (persona === 'enterprise') {
        replies.push({ id: 'qr_sso', label: '🔐 SSO Setup', action: 'send_text', payload: 'Tell me about SSO/SAML', variant: 'outline' });
      }
      break;
    default:
      if (turnCount === 0) {
        replies.push({ id: 'qr_help', label: '❓ How Can You Help?', action: 'send_text', payload: 'What can you help me with?', variant: 'secondary' });
      }
      if (!mentionedTopics.has('pricing')) replies.push({ id: 'qr_pricing', label: '💰 Pricing Plans', action: 'send_text', payload: 'What are your pricing tiers?', variant: 'outline' });
      if (!mentionedTopics.has('features')) replies.push({ id: 'qr_features', label: '⚙️ Features', action: 'send_text', payload: 'What features do you offer?', variant: 'secondary' });
  }

  return replies.slice(0, 4);
}


export interface IntelligenceInput {
  message: string;
  responseText: string;
  memory: ConversationIntelligenceMemory;
}

export function processConversationIntelligence(input: IntelligenceInput): { result: ConversationIntelligenceResult; memory: ConversationIntelligenceMemory } {
  const { message, responseText, memory } = input;
  const orchestratorResult = orchestrateTurn({ message, history: memory.turns.map(t => t.message), sessionMemory: { persona: memory.persona, funnelStage: memory.funnelStage, qualification: memory.qualificationState } });

  const sentiment = detectSentiment(message, memory.turns);

  const updatedMemory: ConversationIntelligenceMemory = {
    ...memory,
    persona: orchestratorResult.persona.persona,
    funnelStage: orchestratorResult.funnelStage,
    buyingIntentDetected: memory.buyingIntentDetected || orchestratorResult.buyingIntent.hasBuyingIntent,
    buyingIntentPhrase: memory.buyingIntentPhrase || orchestratorResult.buyingIntent.intentPhrase,
    buyingIntentTier: memory.buyingIntentTier || orchestratorResult.buyingIntent.targetTier,
    objections: orchestratorResult.objection.isObjection && !memory.objections.includes(orchestratorResult.objection.category)
      ? [...memory.objections, orchestratorResult.objection.category]
      : memory.objections,
    qualificationState: orchestratorResult.qualification,
    turns: [...memory.turns, { message, response: responseText, polarity: sentiment.polarity, frustration: sentiment.frustration, urgency: sentiment.urgency, timestamp: Date.now() }],
  };

  const repetition = detectRepetition(message, memory.turns);
  const updatedRepetition: RepetitionStatus = {
    ...repetition,
    count: memory.repeatedPhraseCount + repetition.count,
  };

  const abandonment = detectAbandonmentRisk(message, updatedMemory);

  const sentimentSnapshot: SentimentSnapshot = {
    polarity: sentiment.polarity,
    frustration: sentiment.frustration > 0.5 ? 'high' : sentiment.frustration > 0.2 ? 'medium' : 'low',
    urgency: sentiment.urgency > 0.5 ? 'high' : sentiment.urgency > 0.2 ? 'medium' : 'low',
    trend: computeSentimentTrend(updatedMemory.turns),
  };

  const escalation = computeEscalation(sentiment, updatedRepetition, abandonment);

  const leadScoreValue = computeLeadScore(updatedMemory, sentiment);
  const conversationScoreValue = computeConversationScore(updatedMemory, sentiment);

  const routingDecision = computeRoutingDecision(updatedMemory, {
    buyingIntent: orchestratorResult.buyingIntent,
    objection: orchestratorResult.objection,
    escalation,
    leadScore: leadScoreValue,
    isFallback: orchestratorResult.isFallback,
  });

  const trustSignal = computeTrustSignal(orchestratorResult.funnelStage, orchestratorResult.persona.persona);
  const quickReplies = buildQuickReplies(orchestratorResult.funnelStage, abandonment, updatedRepetition, trustSignal, updatedMemory);

  const result: ConversationIntelligenceResult = {
    responseText,
    leadScore: { overallScore: leadScoreValue },
    conversationScore: { overallScore: conversationScoreValue },
    sentiment: sentimentSnapshot,
    abandonmentRisk: abandonment,
    repetition: updatedRepetition,
    escalation,
    routingDecision,
    trustSignal,
    buyingIntent: orchestratorResult.buyingIntent,
    objection: orchestratorResult.objection,
    qualification: orchestratorResult.qualification,
    qualificationProgress: computeQualificationProgress(orchestratorResult.qualification),
    persona: orchestratorResult.persona,
    funnelStage: orchestratorResult.funnelStage,
    cta: orchestratorResult.cta,
    quickReplies,
    uiState: orchestratorResult.uiState,
    sources: orchestratorResult.sources,
    isFallback: orchestratorResult.isFallback,
    turnCount: updatedMemory.turns.length,
  };

  return { result, memory: updatedMemory };
}
