import {
  OrchestratedTurnResult,
  PersonaType,
  FunnelStage,
  QualificationState
} from './types';
import { detectPersona } from './persona-detector';
import { detectFunnelStage } from './funnel-stage-detector';
import { detectBuyingIntent } from './buying-intent-detector';
import { handleGreeting } from './greeting-engine';
import { routeQuery } from './retrieval-router';
import { handleObjection } from './objection-engine';
import { processQualification } from './qualification-engine';
import { selectCTA } from './cta-engine';
import { generateConversationUI } from './conversation-ui-engine';

export interface OrchestratorInput {
  message: string;
  history?: string[];
  companyName?: string;
  sessionMemory?: {
    persona?: PersonaType;
    funnelStage?: FunnelStage;
    qualification?: QualificationState;
  };
}

export function orchestrateTurn(input: OrchestratorInput): OrchestratedTurnResult {
  const { message, history = [], companyName, sessionMemory } = input;

  // 1. Domain Routing
  const routing = routeQuery(message);

  // 2. Persona Detection
  const persona = detectPersona({
    message,
    history,
    previousPersona: sessionMemory?.persona,
    previousConfidence: (sessionMemory as any)?.personaConfidence ?? 0.5,
    turnCount: history.length,
  });

  // 3. Buying Intent Detection
  const buyingIntent = detectBuyingIntent(message);

  // 4. Objection Handling
  const objection = handleObjection(message);

  // 5. Funnel Stage Detection
  const funnelStage = detectFunnelStage(
    message,
    sessionMemory?.funnelStage || 'greeting',
    buyingIntent.hasBuyingIntent,
    objection.isObjection
  );

  // 6. Qualification Processing
  const currentQual: QualificationState = sessionMemory?.qualification || {
    questionsAskedCount: 0,
    completed: false
  };
  const qualResult = processQualification(message, currentQual);

  // 7. Greeting Check
  const greetingResponse = handleGreeting(message, persona.persona, companyName);

  // Determine Response Text & Sources
  let responseText = '';
  let sources: string[] = [];
  let isFallback = false;

  if (greetingResponse) {
    responseText = greetingResponse;
  } else if (qualResult.promptQuestion) {
    responseText = qualResult.promptQuestion;
  } else if (objection.isObjection) {
    responseText = objection.groundedAnswer;
    sources = objection.sources;
  }

  // 9. CTA Selection
  const cta = selectCTA({
    persona: persona.persona,
    stage: funnelStage,
    buyingIntent,
  });

  // 10. Conversation UI Engine (Buttons, Suggestions, Cards)
  const uiState = generateConversationUI(persona.persona, funnelStage, buyingIntent, objection, history, message);

  // Append qualification options if present
  if (qualResult.options && qualResult.options.length > 0) {
    uiState.buttons = qualResult.options;
  }

  return {
    responseText,
    persona,
    funnelStage,
    buyingIntent,
    qualification: qualResult.updatedState,
    objection,
    cta,
    uiState,
    routing,
    sources,
    isFallback
  };
}
