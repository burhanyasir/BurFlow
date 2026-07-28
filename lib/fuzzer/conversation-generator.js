const { createConversationManager } = require("../conversation-manager");
const { getPersona } = require("./personas");

const MAX_TURNS = 40;
const MAX_STALL_TURNS = 8;

function generateConversation(personaId, demoData, seed) {
  const persona = getPersona(personaId);
  if (!persona) return { error: `Unknown persona: ${personaId}` };

  const cm = createConversationManager(JSON.parse(JSON.stringify(demoData)));
  const sessionId = `fuzz-${personaId}-${seed}-${Date.now()}`;

  const turns = [];
  const failures = [];
  let turnCount = 0;
  let stallCount = 0;
  let lastResponses = [];
  let startedAt = new Date().toISOString();

  const personaState = {
    activeWorkflow: null,
    workflowStep: null,
    collected: {},
    metadata: { name: null }
  };

  while (turnCount < MAX_TURNS) {
    const message = persona.generateMessage(turnCount, personaState);
    if (!message || message.trim().length === 0) break;

    const response = cm.processMessage(sessionId, message);
    const state = cm.getSessionState(sessionId);
    const fullState = getFullState(sessionId, cm);

    const turn = {
      index: turnCount,
      message,
      response,
      timestamp: new Date().toISOString(),
      activeWorkflow: state?.activeWorkflow || null,
      workflowStep: state?.workflowState?.step || null,
      workflowStatus: state?.workflowState?.status || null,
      collected: state?.workflowState?.collected ? { ...state.workflowState.collected } : {},
      completions: state?.completions?.length || 0,
      metadata: state?.metadata ? { ...state.metadata } : {}
    };
    turns.push(turn);

    personaState.activeWorkflow = state?.activeWorkflow || null;
    personaState.workflowStep = state?.workflowState?.step || null;
    personaState.collected = state?.workflowState?.collected ? { ...state.workflowState.collected } : {};
    personaState.metadata = state?.metadata ? { ...state.metadata } : {};

    lastResponses.push(response);
    if (lastResponses.length > MAX_STALL_TURNS) lastResponses.shift();

    const uniqCount = new Set(lastResponses.map(r => normalize(r))).size;
    if (uniqCount <= 2 && lastResponses.length >= 4) {
      stallCount++;
    } else {
      stallCount = 0;
    }

    if (stallCount >= 3) {
      failures.push({
        type: "conversation_stalled",
        severity: "high",
        turn: turnCount,
        detail: `Response stalling detected: ${lastResponses.slice(-3).join(" | ")}`,
        responses: [...lastResponses]
      });
      break;
    }

    if (turn.response && turn.response.length > 50) {
      const trimmed = turn.response.trim();
      const lastChar = trimmed.slice(-1);
      const isTruncated = lastChar !== "." && lastChar !== "?" && lastChar !== "!" && lastChar !== ")" && lastChar !== '"';
      const endsWithReturn = /[.?!]\s*$/.test(trimmed);
      if (isTruncated && !endsWithReturn && trimmed.length > 80 && !trimmed.endsWith(":") && !trimmed.endsWith("-")) {
        failures.push({
          type: "incomplete_response",
          severity: "low",
          turn: turnCount,
          detail: `Response may be truncated: "${trimmed.slice(-50)}"`,
          response: turn.response
        });
      }
    }

    if (response.toLowerCase().includes("i'm sorry, i seem to be going in circles")) {
      failures.push({
        type: "infinite_loop_detected",
        severity: "critical",
        turn: turnCount,
        detail: "System detected going in circles and forced reset",
        response
      });
      break;
    }

    if (state?.completions?.length > 0 && state.completions.length >= 1) {
      const lastCompletion = state.completions[state.completions.length - 1];
      if (lastCompletion.workflow !== "general_faq") {
        const completionMessage = " (completed: " + lastCompletion.workflow + ")";
        if (turnCount >= 2 || personaId === "emergency") {
          if (turn.response.includes("anything else")) {
            turn.completed = true;
            break;
          }
          if (turn.response.includes("Is there anything else") || turn.response.includes("anything else I can help")) {
            turn.completed = true;
            break;
          }
        }
      }
    }

    const finalMessage = persona.generateMessage(MAX_TURNS + 1, personaState);
    if (!finalMessage || finalMessage.trim().length === 0) break;
    turnCount++;
  }

  const finalState = cm.getSessionState(sessionId);

  const outcome = determineOutcome(turns, finalState, failures);

  return {
    personaId,
    sessionId,
    startedAt,
    endedAt: new Date().toISOString(),
    turns,
    turnCount: turns.length,
    failures,
    outcome,
    finalState: {
      activeWorkflow: finalState?.activeWorkflow || null,
      completions: finalState?.completions || [],
      metadata: finalState?.metadata || {},
      workflowState: finalState?.workflowState || null
    },
    seed
  };
}

function getFullState(sessionId, cm) {
  try {
    return cm.getSessionState(sessionId);
  } catch { return null; }
}

function normalize(str) {
  return str.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(-80);
}

function determineOutcome(turns, finalState, failures) {
  if (failures.some(f => f.severity === "critical")) return "critical_failure";
  if (finalState?.completions?.length > 0) {
    const workflows = finalState.completions.map(c => c.workflow);
    if (workflows.includes("appointment_booking")) return "appointment_booked";
    if (workflows.includes("emergency")) return "emergency_booked";
    if (workflows.includes("lead_capture")) return "lead_captured";
    if (workflows.includes("pricing")) return "pricing_completed";
    if (workflows.includes("insurance")) return "insurance_completed";
    return "general_completed";
  }
  if (failures.length > 0) return "failed";
  if (finalState?.activeWorkflow) return "abandoned_workflow";
  return "general";
}

module.exports = { generateConversation, MAX_TURNS };