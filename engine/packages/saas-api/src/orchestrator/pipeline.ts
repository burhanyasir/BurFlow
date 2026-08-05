import { OrchestratorState, Strategy, ConversationStage } from './types';
import { stateManager } from './state-manager';
import { processRapportRepair } from './rapport-repair';
import { processPolicyEngine, PolicyDecision } from './policy-engine';
import { composeResponse, CompositionResult } from './response-composer';
import { TenantPolicy } from './types';
import { KnowledgeBaseProvider } from '@conversation-engine/conversation-orchestrator';

export interface PipelineInput {
  message: string;
  sessionId: string;
  tenantId: string;
  brainFunction: (input: any) => any;
  policy?: Partial<TenantPolicy>;
  knowledgeBaseProvider?: KnowledgeBaseProvider;
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
  traceId: string;
  latencyMs: number;
  quickReplies: any[];
  uiState: any;
  cta: any;
}

const TRACE_LOG = true;

export async function executePipeline(input: PipelineInput): Promise<PipelineResult> {
  const startTime = Date.now();
  const { message, sessionId, tenantId, brainFunction, policy, knowledgeBaseProvider: kbProvider } = input;
  const traceId = `${sessionId.slice(-8)}-${Date.now() % 10000}`;

  // Step 1: Load conversation state
  const state = stateManager.getOrCreate(sessionId, tenantId, policy);

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
    };
    let rapportQuickReplies: any[] = [];
    let rapportUiState: any = { buttons: [], suggestedActions: [] };
    try {
      const rapportBrainOutput = await brainFunction(rapportBrainInput);
      rapportQuickReplies = rapportBrainOutput?.quickReplies || [];
      rapportUiState = rapportBrainOutput?.uiState || rapportUiState;
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
      traceId,
      latencyMs,
      quickReplies: rapportQuickReplies,
      uiState: rapportUiState,
      cta: null,
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
  const brainInput = buildBrainInput(message, state, policyDecision, tenantId, kbProvider);

  // Step 6: Call frozen Conversation Engine
  let brainOutput: any;
  try {
    brainOutput = await brainFunction(brainInput);
  } catch (err: any) {
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
      traceId,
      latencyMs: Date.now() - startTime,
      quickReplies: [],
      uiState: { buttons: [], suggestedActions: [] },
      cta: null,
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
    traceId,
    latencyMs,
    quickReplies: brainOutput?.quickReplies || [],
    uiState: brainOutput?.uiState || { buttons: [], suggestedActions: [] },
    cta: brainOutput?.cta || null,
  };
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

function buildBrainInput(message: string, state: OrchestratorState, policy: PolicyDecision, tenantId?: string, kbProvider?: KnowledgeBaseProvider): any {
  const turns = state.turnCount > 0
    ? [{ message: state.lastUserMessage || '', response: state.lastBotMessage || '', polarity: 0, frustration: 0, urgency: 0, timestamp: Date.now() }]
    : [];

  return {
    message,
    responseText: '',
    tenantId,
    knowledgeBaseProvider: kbProvider,
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
