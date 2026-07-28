function analyzeConversation(conversation) {
  const failures = [];
  const { turns, finalState } = conversation;

  if (!turns || turns.length === 0) {
    failures.push({ type: "empty_conversation", severity: "critical", detail: "No turns were generated" });
    return { failures, summary: { totalFailures: 1, critical: 1, high: 0, medium: 0, low: 0 } };
  }

  const allResponses = turns.map(t => t.response);
  const normalizedResponses = turns.map(t => normalizeResponse(t.response));

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    const response = turn.response;

    if (i >= 3) {
      const recent = normalizedResponses.slice(i - 2, i + 1);
      if (new Set(recent).size <= 1) {
        addUnique(failures, {
          type: "repeated_response",
          severity: "critical",
          turn: i,
          detail: `Same response repeated 3+ times: "${turns[i].response.slice(0, 80)}..."`,
          meta: { text: turns[i].response }
        });
        break;
      }
    }

    if (i >= 2) {
      const contextCounts = {};
      for (let j = Math.max(0, i - 5); j < i; j++) {
        if (turns[j].activeWorkflow === turns[i].activeWorkflow &&
            turns[j].workflowStep === turns[i].workflowStep) {
          if (turns[i].activeWorkflow && turns[i].workflowStep) {
            const key = turns[i].activeWorkflow + ":" + turns[i].workflowStep;
            contextCounts[key] = (contextCounts[key] || 0) + 1;
          }
        }
      }
      for (const [key, count] of Object.entries(contextCounts)) {
        if (count >= 4) {
          addUnique(failures, {
            type: "workflow_loop",
            severity: "high",
            turn: i,
            detail: `Stuck in workflow step ${key} for ${count + 1} turns`,
            meta: { workflow: turns[i].activeWorkflow, step: turns[i].workflowStep, count: count + 1 }
          });
        }
      }
    }

    if (response && response.length > 0) {
      const contradictions = checkContradictions(response, turn);
      for (const c of contradictions) addUnique(failures, c);
    }

    if (response && containsHallucinatedInfo(response)) {
      addUnique(failures, {
        type: "hallucinated_information",
        severity: "high",
        turn: i,
        detail: `Response may contain hallucinated information: "${response.slice(0, 100)}..."`,
        meta: { text: response }
      });
    }

    if (turn.activeWorkflow && turn.activeWorkflow === "emergency" && response) {
      if (response.toLowerCase().includes("business hours") || response.toLowerCase().includes("we're closed")) {
        addUnique(failures, {
          type: "emergency_mishandled",
          severity: "critical",
          turn: i,
          detail: "Emergency query received business hours response instead of immediate help",
          meta: { text: response }
        });
      }
    }
  }

  if (finalState) {
    if (finalState.completions && Array.isArray(finalState.completions)) {
      for (const comp of finalState.completions) {
        if (comp.workflow && comp.completedAt && new Date(comp.completedAt).getTime() < new Date(conversation.startedAt).getTime()) {
          addUnique(failures, {
            type: "temporal_anomaly",
            severity: "high",
            detail: `Completion timestamp for ${comp.workflow} is before conversation started`,
            meta: { completedAt: comp.completedAt, startedAt: conversation.startedAt }
          });
        }
      }
    }

    if (finalState.metadata) {
      const meta = finalState.metadata;
      if (meta.name && (!conversation.turns || !conversation.turns.some(t => t.metadata?.name === meta.name))) {
        addUnique(failures, {
          type: "phantom_state",
          severity: "medium",
          detail: `Session has name "${meta.name}" but no turn recorded it being set`,
          meta: { name: meta.name }
        });
      }
    }
  }

  const uniqueFailures = deduplicate(failures);

  const summary = {
    totalFailures: uniqueFailures.length,
    critical: uniqueFailures.filter(f => f.severity === "critical").length,
    high: uniqueFailures.filter(f => f.severity === "high").length,
    medium: uniqueFailures.filter(f => f.severity === "medium").length,
    low: uniqueFailures.filter(f => f.severity === "low").length
  };

  return { failures: uniqueFailures, summary };
}

function addUnique(arr, item) {
  const exists = arr.some(f =>
    f.type === item.type &&
    (item.turn === undefined || f.turn === item.turn) &&
    f.severity === item.severity
  );
  if (!exists) arr.push(item);
}

function deduplicate(failures) {
  const seen = new Set();
  return failures.filter(f => {
    const key = f.type + "|" + (f.turn ?? -1) + "|" + f.severity;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeResponse(str) {
  return str.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(-60);
}

const UNCERTAIN_PHRASES = [
  "i'm not sure", "i don't know", "maybe", "perhaps", "i think",
  "i can't say", "i cannot", "unable to"
];

const CONTRADICTORY_CLINIC_FACTS = {
  "monday": ["we're closed", "we're not open", "we don't open"],
  "8-6": ["open at 9", "9-5"],
  "saturday": ["closed", "not open"],
  "9-2": ["office hours are"],
};

function checkContradictions(response, turn) {
  const contradictions = [];
  const lower = response.toLowerCase();

  if (UNCERTAIN_PHRASES.some(p => lower.includes(p))) {
    contradictions.push({
      type: "uncertain_response",
      severity: "medium",
      turn: turn.index,
      detail: `Response expresses uncertainty: "${response.slice(0, 80)}..."`,
      meta: { text: response }
    });
  }

  const confusedFollowUps = ["what?", "huh", "i don't understand", "repeat"];
  const hasConfusedInput = confusedFollowUps.some(p => turn.message.toLowerCase().includes(p));
  if (!hasConfusedInput && lower.includes("i don't understand")) {
    contradictions.push({
      type: "context_loss",
      severity: "high",
      turn: turn.index,
      detail: `AI lost context and said "I don't understand" after a coherent user message: "${turn.message.slice(0, 60)}..."`,
      meta: { userMessage: turn.message, response }
    });
  }

  return contradictions;
}

function containsHallucinatedInfo(response) {
  const lower = response.toLowerCase();
  const hallPhrases = [
    { phrase: "we offer 24/7", exempt: ["emergency"] },
    { phrase: "100%", exempt: ["satisfaction", "guarantee"] },
    { phrase: "free", exempt: ["consultation", "estimate", "exam", "parking", "wi-fi", "wifi", "coffee"] },
    { phrase: "no cost", exempt: [] },
    { phrase: "discount 50%", exempt: ["sign up", "new patient"] },
    { phrase: "anytime", exempt: ["available", "questions", "call us", "contact"] }
  ];

  for (const h of hallPhrases) {
    if (lower.includes(h.phrase)) {
      if (h.exempt.length === 0 || !h.exempt.some(e => lower.includes(e))) {
        return true;
      }
    }
  }
  return false;
}

const CRITICAL_FAILURE_PATTERNS = {
  infinite_loop: ["going in circles", "max iteration"],
  context_corruption: ["lost track of what we were doing", "i'm sorry, i seem"],
  state_leak: ["you said", "earlier you", "previously you"]
};

function checkAllConversations(conversations) {
  const allFailures = [];
  let total = 0;
  let failed = 0;

  for (const conv of conversations) {
    total++;
    const analysis = analyzeConversation(conv);
    if (analysis.failures.length > 0) {
      failed++;
      allFailures.push({
        sessionId: conv.sessionId,
        personaId: conv.personaId,
        failures: analysis.failures,
        summary: analysis.summary
      });
    }
  }

  return {
    total,
    failed,
    passRate: total > 0 ? ((total - failed) / total * 100).toFixed(1) : "0.0",
    conversationResults: allFailures,
    aggregatedSummary: {
      totalFailures: allFailures.reduce((s, cr) => s + cr.summary.totalFailures, 0),
      critical: allFailures.reduce((s, cr) => s + cr.summary.critical, 0),
      high: allFailures.reduce((s, cr) => s + cr.summary.high, 0),
      medium: allFailures.reduce((s, cr) => s + cr.summary.medium, 0),
      low: allFailures.reduce((s, cr) => s + cr.summary.low, 0)
    }
  };
}

module.exports = { analyzeConversation, checkAllConversations };