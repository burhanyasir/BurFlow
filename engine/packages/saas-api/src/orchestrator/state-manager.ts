import {
  OrchestratorState,
  ConversationLedger,
  KnownFacts,
  ConversationQualityMetrics,
  ConversationMood,
  TenantPolicy,
  DEFAULT_TENANT_POLICY,
} from './types';

export function createInitialState(sessionId: string, tenantId: string, policy?: Partial<TenantPolicy>): OrchestratorState {
  return {
    sessionId,
    tenantId,
    stage: 'greeting',
    strategy: 'greeting',
    mood: 'neutral',
    trustScore: 20,
    buyingIntentScore: 0,
    lastUserMessage: '',
    lastBotMessage: '',
    lastUnansweredQuestion: '',
    turnCount: 0,
    policy: policy ? { ...DEFAULT_TENANT_POLICY, ...policy } : DEFAULT_TENANT_POLICY,
    knownFacts: {
      integrations: [],
      objections: [],
    },
    ledger: {
      topicsCovered: [],
      topicsPending: [],
      questionsAnswered: [],
      questionsSkipped: [],
      trustSignalsShown: [],
      proofShown: [],
      featuresExplained: [],
      pricingDiscussed: false,
      integrationsDiscussed: false,
      securityDiscussed: false,
      objectionsEncountered: [],
      ctasShown: [],
    },
    metrics: {
      answerFirstCompliance: 100,
      questionRepetitionRate: 0,
      qualificationTiming: 0,
      internalLeakageCount: 0,
      memoryConsistency: 100,
      topicCoherence: 100,
      trustBuildingCompliance: 100,
      ctaTiming: 100,
      conversationCompletion: 0,
      userInterruptionRate: 0,
      conversationLength: 0,
      fallbackFrequency: 0,
    },
    pendingQualificationQuestions: [],
    askedQualificationQuestions: [],
    pendingFollowUpTopics: [],
    previousCta: null,
    qualificationAttempts: 0,
    turnsSinceLastQualification: 0,
    repeatedQuestionCount: 0,
    conversationSummary: '',
    lastStrategy: null,
  };
}

export class ConversationStateManager {
  private stores = new Map<string, OrchestratorState>();

  getOrCreate(sessionId: string, tenantId: string, policy?: Partial<TenantPolicy>): OrchestratorState {
    let state = this.stores.get(sessionId);
    if (!state) {
      state = createInitialState(sessionId, tenantId, policy);
      this.stores.set(sessionId, state);
    }
    return state;
  }

  get(sessionId: string): OrchestratorState | undefined {
    return this.stores.get(sessionId);
  }

  save(sessionId: string, state: OrchestratorState): void {
    this.stores.set(sessionId, state);
  }

  delete(sessionId: string): void {
    this.stores.delete(sessionId);
  }

  recordTurn(
    state: OrchestratorState,
    userMessage: string,
    botResponse: string,
    questionsAnswered: string[],
  ): void {
    state.turnCount++;
    state.lastUserMessage = userMessage;
    state.lastBotMessage = botResponse;
    state.turnsSinceLastQualification++;
    state.metrics.conversationLength = state.turnCount;

    if (state.lastStrategy === 'answer') {
      for (const q of questionsAnswered) {
        if (!state.ledger.questionsAnswered.includes(q)) {
          state.ledger.questionsAnswered.push(q);
        }
      }
    }

    const summaryLen = state.conversationSummary.length;
    if (summaryLen < 2000) {
      const addition = `User: ${userMessage.slice(0, 80)} Bot: ${botResponse.slice(0, 80)}. `;
      state.conversationSummary += addition;
      if (state.conversationSummary.length > 2500) {
        state.conversationSummary = state.conversationSummary.slice(-2000);
      }
    }
  }

  recordTrustSignal(state: OrchestratorState, signal: string): void {
    if (!state.ledger.trustSignalsShown.includes(signal)) {
      state.ledger.trustSignalsShown.push(signal);
    }
    state.trustScore = Math.min(100, state.trustScore + 10);
  }

  recordProof(state: OrchestratorState, proof: string): void {
    if (!state.ledger.proofShown.includes(proof)) {
      state.ledger.proofShown.push(proof);
    }
  }

  recordTopicCovered(state: OrchestratorState, topic: string): void {
    if (!state.ledger.topicsCovered.includes(topic)) {
      state.ledger.topicsCovered.push(topic);
    }
    state.ledger.topicsPending = state.ledger.topicsPending.filter(t => t !== topic);
  }

  addPendingTopic(state: OrchestratorState, topic: string): void {
    if (!state.ledger.topicsCovered.includes(topic) && !state.ledger.topicsPending.includes(topic)) {
      state.ledger.topicsPending.push(topic);
    }
  }

  logMetrics(state: OrchestratorState, traceId: string): void {
    console.log(`[METRICS:${traceId}] answerFirst=${state.metrics.answerFirstCompliance}% repRate=${state.metrics.questionRepetitionRate}% qualTiming=${state.metrics.qualificationTiming} leakage=${state.metrics.internalLeakageCount} trustScore=${state.trustScore} buyingScore=${state.buyingIntentScore}`);
  }
}

export const stateManager = new ConversationStateManager();
