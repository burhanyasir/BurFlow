import { OrchestratorState, Strategy, ConversationStage } from './types';
import { stateManager } from './state-manager';
import { processRapportRepair } from './rapport-repair';
import { processPolicyEngine, PolicyDecision } from './policy-engine';
import { composeResponse, CompositionResult } from './response-composer';
import { TenantPolicy } from './types';
import { TAKEOVER_ACKNOWLEDGEMENT } from '@conversation-engine/saas-core';
import { KnowledgeBaseProvider, PayloadValidationError, UpstreamLLMError } from '@conversation-engine/conversation-orchestrator';
import { maybeTrigger } from '../services/lead-alert-service';

export interface PipelineInput {
  message: string;
  sessionId: string;
  tenantId: string;
  brainFunction: (input: any) => any;
  policy?: Partial<TenantPolicy>;
  knowledgeBaseProvider?: KnowledgeBaseProvider;
  /** Tenant CTA/business profile from the widget config (business_profile JSON). */
  businessProfile?: Record<string, unknown>;
  /**
   * When a human agent has taken over this session, the pipeline skips the
   * LLM brain entirely and returns the takeover acknowledgement instead.
   * Defense-in-depth: the chat route also short-circuits, but this guard
   * protects any direct pipeline caller from burning LLM budget mid-handoff.
   */
  isHumanTookOver?: boolean;
}

export interface PipelineResult {
  response: string;
  strategy: Strategy;
  mood: string;
  trustScore: number;
  buyingIntentScore: number;
  stage: string;
  state: OrchestratorState;
  composition: CompositionResult;
  policy: PolicyDecision;
  isRapportHandled: boolean;
  /** True when the brain degraded to heuristic responses (LLM failure/unconfigured) for this turn. */
  isFallback: boolean;
  traceId: string;
  latencyMs: number;
  quickReplies: any[];
  uiState: any;
  cta: any;
  suggestedOptions: string[];
  leadCapture?: { email?: string; phone?: string; name?: string; company?: string } | null;
}

const TRACE_LOG = true;

// Per-session mutex: ensures only one message is processed at a time per session.
// Prevents race conditions where concurrent messages corrupt conversation state.
const sessionLocks = new Map<string, Promise<void>>();

async function acquireSessionLock(sessionId: string): Promise<() => void> {
  // Wait for any existing lock on this session
  while (sessionLocks.has(sessionId)) {
    await sessionLocks.get(sessionId);
  }
  // Create a new lock
  let releaseFn: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    releaseFn = resolve;
  });
  sessionLocks.set(sessionId, lockPromise);
  // Return release function
  return () => {
    sessionLocks.delete(sessionId);
    releaseFn!();
  };
}

export async function executePipeline(input: PipelineInput): Promise<PipelineResult> {
  const startTime = Date.now();
  const { message, sessionId, tenantId, brainFunction, policy, knowledgeBaseProvider: kbProvider, businessProfile } = input;

  // Acquire per-session lock to prevent concurrent state corruption
  const releaseLock = await acquireSessionLock(sessionId);
  try {
  const traceId = `${sessionId.slice(-8)}-${Date.now() % 10000}`;

  // Step 1: Load conversation state
  const state = stateManager.getOrCreate(sessionId, tenantId, policy);

  // ─── Human Takeover Guard ────────────────────────────────────
  // Skip ALL LLM execution while a human agent is driving the session.
  if (input.isHumanTookOver) {
    state.strategy = 'human_handoff';
    state.stage = 'human_handoff';
    state.lastStrategy = 'human_handoff';
    state.lastUserMessage = message;
    stateManager.recordTurn(state, message, TAKEOVER_ACKNOWLEDGEMENT, state.ledger.questionsAnswered);
    if (TRACE_LOG) {
      console.log(`[ORCH:${traceId}] Human takeover active — LLM skipped, acknowledgement returned`);
    }
    return {
      response: TAKEOVER_ACKNOWLEDGEMENT,
      strategy: 'human_handoff' as Strategy,
      mood: state.mood,
      trustScore: state.trustScore,
      buyingIntentScore: state.buyingIntentScore,
      stage: 'human_handoff',
      state,
      composition: { text: TAKEOVER_ACKNOWLEDGEMENT, leakageDetected: false, duplicatesRemoved: 0 },
      policy: {
        strategy: 'human_handoff' as Strategy,
        priority: 1,
        buyingSignalDetected: false,
        canQualify: false,
        canShowCTA: false,
        detectedTopics: [],
        detectedUseCase: null,
        detectedIndustry: null,
      },
      isRapportHandled: false,
      isFallback: false,
      traceId,
      latencyMs: Date.now() - startTime,
      quickReplies: [],
      uiState: { state: 'handoff', buttons: [], suggestedActions: [] },
      cta: null,
      suggestedOptions: [],
      leadCapture: null,
    };
  }

  if (TRACE_LOG) {
    console.log(`[ORCH:${traceId}] Stage=${state.stage} Mood=${state.mood} Turn=${state.turnCount} Trust=${state.trustScore} Buying=${state.buyingIntentScore}`);
  }

  // Step 2: Rapport & Repair Layer
  const rapportResult = processRapportRepair(message, state);
  if (TRACE_LOG && rapportResult.handled) {
    console.log(`[ORCH:${traceId}] Rapport handled — strategy=${rapportResult.strategy} mood=${rapportResult.mood}`);
  }

  if (rapportResult.handled) {
    state.strategy = rapportResult.strategy;
    // Prevent backward transition from substantive stages back to greeting
    if (!(state.stage !== 'greeting' && mapStrategyToStage(rapportResult.strategy) === 'greeting')) {
      state.stage = mapStrategyToStage(rapportResult.strategy);
    }
    state.lastStrategy = rapportResult.strategy;
    state.lastUserMessage = message;
    state.lastBotMessage = rapportResult.response;
    state.mood = rapportResult.mood;

    stateManager.recordTurn(state, message, rapportResult.response, []);

    // Generate quickReplies for rapport responses
    const rapportBrainInput = {
      message,
      responseText: rapportResult.response,
      legacyMemory: {
        turns: [{ message, response: rapportResult.response, polarity: 0, frustration: 0.1, urgency: 0.1, timestamp: Date.now() }],
        turnCount: state.turnCount,
        persona: state.knownFacts.industry || 'small_business',
        funnelStage: state.stage,
        buyingIntentDetected: state.buyingIntentScore > 30,
        buyingIntentPhrase: state.knownFacts.buyingIntentPhrase || '',
        objections: state.knownFacts.objections,
        qualificationState: { completed: false, questionsAskedCount: 0 },
        repeatedPhraseCount: state.repeatedQuestionCount,
        topics: [],
        industry: state.knownFacts.industry || undefined,
        useCase: state.knownFacts.useCase || undefined,
      },
      tenantId,
      knowledgeBaseProvider: kbProvider,
      businessProfile,
    };
    let rapportQuickReplies: any[] = [];
    let rapportUiState: any = { buttons: [], suggestedActions: [] };
    let rapportLeadCapture: any = null;
    let rapportBrainOutputSuggested: string[] = [];
    try {
      const rapportBrainOutput = await brainFunction(rapportBrainInput);
      rapportQuickReplies = rapportBrainOutput?.quickReplies || [];
      rapportUiState = rapportBrainOutput?.uiState || rapportUiState;
      rapportLeadCapture = rapportBrainOutput?.extractedLead || null;
      rapportBrainOutputSuggested = rapportBrainOutput?.suggestedOptions || [];
    } catch {}

    const latencyMs = Date.now() - startTime;
    return {
      response: rapportResult.response,
      strategy: rapportResult.strategy,
      mood: state.mood,
      trustScore: state.trustScore,
      buyingIntentScore: state.buyingIntentScore,
      stage: state.stage,
      state,
      composition: { text: rapportResult.response, leakageDetected: false, duplicatesRemoved: 0 },
      policy: {
        strategy: rapportResult.strategy,
        priority: 1,
        buyingSignalDetected: false,
        canQualify: false,
        canShowCTA: false,
        detectedTopics: [],
        detectedUseCase: null,
        detectedIndustry: null,
      },
      isRapportHandled: true,
      isFallback: false,
      traceId,
      latencyMs,
      quickReplies: rapportQuickReplies,
      uiState: rapportUiState,
      cta: null,
      suggestedOptions: rapportBrainOutputSuggested,
      leadCapture: rapportLeadCapture,
    };
  }

  // Step 3: Policy Engine — decide ONE strategy
  const policyDecision = processPolicyEngine(message, state, { handled: false, strategy: 'answer' });
  state.strategy = policyDecision.strategy;
  state.stage = mapStrategyToStage(policyDecision.strategy);
  state.lastStrategy = policyDecision.strategy;

  if (TRACE_LOG) {
    console.log(`[ORCH:${traceId}] Policy → strategy=${policyDecision.strategy} priority=${policyDecision.priority} buying=${policyDecision.buyingSignalDetected} qual=${policyDecision.canQualify} cta=${policyDecision.canShowCTA}`);
  }

  // Step 4: Update state with detected info
  if (policyDecision.detectedUseCase && !state.knownFacts.useCase) {
    state.knownFacts.useCase = policyDecision.detectedUseCase;
  }
  if (policyDecision.detectedIndustry && !state.knownFacts.industry) {
    state.knownFacts.industry = policyDecision.detectedIndustry;
  }

  for (const topic of policyDecision.detectedTopics) {
    stateManager.addPendingTopic(state, topic);
  }

  // Step 5: Build brain input with full conversation context
  const brainInput = buildBrainInput(message, state, policyDecision, tenantId, kbProvider, businessProfile);

  // Step 6: Call frozen Conversation Engine
  let brainOutput: any;
  try {
    brainOutput = await brainFunction(brainInput);
  } catch (err: any) {
    // Typed payload (400) and upstream LLM (502) errors must surface to the route
    // layer instead of being masked as a graceful repair response.
    if (err instanceof PayloadValidationError || err instanceof UpstreamLLMError) throw err;
    console.log(`[ORCH:${traceId}] Brain threw: ${err.message}`);
    return {
      response: "Let me think about that differently. Could you rephrase your question?",
      strategy: 'repair_confusion',
      mood: state.mood,
      trustScore: state.trustScore,
      buyingIntentScore: state.buyingIntentScore,
      stage: state.stage,
      state,
      composition: { text: '', leakageDetected: false, duplicatesRemoved: 0 },
      policy: policyDecision,
      isRapportHandled: false,
      isFallback: true,
      traceId,
      latencyMs: Date.now() - startTime,
      quickReplies: [],
      uiState: { buttons: [], suggestedActions: [] },
      cta: null,
      suggestedOptions: [],
    };
  }

  const rawResponse = brainOutput?.responseText || '';
  if (TRACE_LOG) {
    console.log(`[ORCH:${traceId}] RAW(${policyDecision.strategy}): "${rawResponse.slice(0, 150)}"`);
    logBrainTrace(traceId, brainOutput);
  }

  // Step 7: Response Composer
  const composition = composeResponse(rawResponse, state, message);
  const finalResponse = composition.text;

  if (TRACE_LOG && composition.leakageDetected) {
    console.log(`[ORCH:${traceId}] LEAKAGE DETECTED and stripped`);
  }

  // Step 8: Qualification Manager check (embedded in policy engine)
  // Step 9: CTA Planner check (embedded in policy engine)

  // Step 10: Update state with brain output
  if (brainOutput && brainOutput.legacyMemory) {
    const updated = brainOutput.legacyMemory;
    stateManager.recordTurn(state, message, finalResponse, state.ledger.questionsAnswered);
    for (const t of (updated.topics || [])) {
      stateManager.addPendingTopic(state, t);
    }
    if (updated.funnelStage) state.stage = updated.funnelStage;
  } else {
    stateManager.recordTurn(state, message, finalResponse, state.ledger.questionsAnswered);
  }

  // Non-blocking lead qualification alert
  // Fires when funnelStage transitions to 'qualify'/'booking' or when contact details are provided.
  // NOTE: only the legacy LEAD_ALERT_WEBHOOK_URL path is used here. Tenant
  // configured channels (widget config) are dispatched by the chat/whatsapp
  // routes via captureLeadFromTurn (dispatchLeadNotifications / notifyLeadCaptured),
  // which gates on isNew / qualificationChanged and honors notifyThreshold.
  // Plumb the tenant config into this call and every turn double-alerts.
  try {
    await maybeTrigger(
      state.tenantId ?? input.tenantId,
      state.stage,
      brainOutput?.extractedLead
        ? { email: brainOutput.extractedLead.email ?? undefined, phone: brainOutput.extractedLead.phone ?? undefined }
        : null,
      state.knownFacts.useCase || state.knownFacts.industry || '',
      [...state.ledger.topicsCovered, ...state.ledger.topicsPending]
    );
  } catch {}

  // Log metrics
  stateManager.logMetrics(state, traceId);

  const latencyMs = Date.now() - startTime;
  return {
    response: finalResponse,
    strategy: policyDecision.strategy,
    mood: state.mood,
    trustScore: state.trustScore,
    buyingIntentScore: state.buyingIntentScore,
    stage: state.stage,
    state,
    composition,
    policy: policyDecision,
    isRapportHandled: false,
    isFallback: !!(brainOutput?.ciResult?.isFallback || brainOutput?.orchestratorResult?.isFallback),
    traceId,
    latencyMs,
    quickReplies: brainOutput?.quickReplies?.length ? brainOutput.quickReplies : generateStageFallbackQuickReplies(policyDecision.strategy, state),
    uiState: brainOutput?.uiState || { buttons: [], suggestedActions: [] },
    cta: brainOutput?.cta || null,
    suggestedOptions: brainOutput?.suggestedOptions || [],
    leadCapture: brainOutput?.extractedLead || null,
  };
  } finally {
    releaseLock();
  }
}

function mapStrategyToStage(strategy: Strategy): ConversationStage {
  const map: Record<string, ConversationStage> = {
    greeting: 'greeting',
    repair_confusion: 'discovery',
    answer: 'discovery',
    educate: 'education',
    clarify: 'discovery',
    retrieve_knowledge: 'discovery',
    qualify: 'qualification',
    trust_building: 'evaluation',
    objection_handling: 'objection_handling',
    buying_discussion: 'buying_discussion',
    booking: 'closing',
    human_handoff: 'human_handoff',
    close_conversation: 'finished',
  };
  return map[strategy] || 'discovery';
}

function buildBrainInput(message: string, state: OrchestratorState, policy: PolicyDecision, tenantId?: string, kbProvider?: KnowledgeBaseProvider, businessProfile?: Record<string, unknown>): any {
  const turns = state.turnCount > 0
    ? [{ message: state.lastUserMessage || '', response: state.lastBotMessage || '', polarity: 0, frustration: 0, urgency: 0, timestamp: Date.now() }]
    : [];

  return {
    message,
    responseText: '',
    tenantId,
    knowledgeBaseProvider: kbProvider,
    businessProfile,
    legacyMemory: {
      turns,
      turnCount: state.turnCount,
      persona: state.knownFacts.industry || 'small_business',
      funnelStage: state.stage,
      buyingIntentDetected: state.buyingIntentScore > 30,
      buyingIntentPhrase: state.knownFacts.buyingIntentPhrase || '',
      objections: state.knownFacts.objections,
      qualificationState: {
        completed: state.ledger.questionsAnswered.length > 0 || state.policy.qualification.maxQuestions <= state.qualificationAttempts,
        questionsAskedCount: state.qualificationAttempts,
      },
      repeatedPhraseCount: state.repeatedQuestionCount,
      topics: [...state.ledger.topicsCovered, ...state.ledger.topicsPending],
      industry: state.knownFacts.industry || undefined,
      useCase: state.knownFacts.useCase || undefined,
    },
  };
}

function logBrainTrace(traceId: string, output: any): void {
  if (!output) return;
  const plan = output.plan || {};
  const strategy = output.strategy || {};
  console.log(`[ORCH:${traceId}] Plan: intent=${plan.customerIntent || '?'} goal=${plan.goal || '?'} topics=${JSON.stringify(plan.topicsToDiscuss || [])}`);
  console.log(`[ORCH:${traceId}] Strat: primary=${strategy.primaryGoal || '?'} topic=${strategy.topicToAnswer || '?'} follow=${strategy.followUpTopic || '?'}`);
}

export function getState(sessionId: string): OrchestratorState | undefined {
  return stateManager.get(sessionId);
}

function generateStageFallbackQuickReplies(strategy: string, state: any): any[] {
  const stageChips: Record<string, Array<{id: string; label: string; action: string; payload: string; variant: string; category: string; score: number}>> = {
    greeting: [
      { id: 'fb_pricing', label: 'View Pricing', action: 'send_text', payload: 'What are your pricing plans?', variant: 'secondary', category: 'pricing', score: 45 },
      { id: 'fb_features', label: 'Key Features', action: 'send_text', payload: 'What features do you offer?', variant: 'secondary', category: 'features', score: 40 },
      { id: 'fb_demo', label: 'Book a Demo', action: 'navigate', payload: '/signup', variant: 'primary', category: 'demo', score: 55 },
    ],
    discovery: [
      { id: 'fb_pricing', label: 'View Pricing', action: 'send_text', payload: 'Tell me about pricing', variant: 'secondary', category: 'pricing', score: 45 },
      { id: 'fb_demo', label: 'Book a Demo', action: 'navigate', payload: '/signup', variant: 'primary', category: 'demo', score: 55 },
    ],
    qualification: [
      { id: 'fb_book', label: 'Book Appointment', action: 'navigate', payload: '/contact', variant: 'primary', category: 'demo', score: 55 },
      { id: 'fb_pricing', label: 'View Pricing', action: 'send_text', payload: 'What are the pricing options?', variant: 'secondary', category: 'pricing', score: 45 },
    ],
  };
  return stageChips[strategy] || stageChips.discovery;
}
