const { extractEntities, isConfirmation, isChangeRequest } = require("./entity-extractor");

function createConversationRecorder() {
  const conversations = new Map();

  function startRecording(sessionId, cm) {
    const state = cm.getSessionState(sessionId);
    const conv = {
      id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId,
      startedAt: new Date().toISOString(),
      endedAt: null,
      turns: [],
      outcome: null,
      outcomeDetail: null,
      totalTurns: 0,
      metadata: { name: null, email: null, phone: null }
    };
    conversations.set(sessionId, conv);
    return conv;
  }

  function recordTurn(sessionId, cm, inputText, replyText, intent, confidence, extra) {
    if (!conversations.has(sessionId)) return;
    const conv = conversations.get(sessionId);
    const state = cm.getSessionState(sessionId);
    const entities = extractEntities(inputText);

    const turn = {
      index: conv.turns.length,
      timestamp: new Date().toISOString(),
      userMessage: inputText,
      aiResponse: replyText,
      intent,
      confidence,
      entities: {
        names: entities.names,
        phones: entities.phones,
        emails: entities.emails,
        dates: entities.dates,
        times: entities.times,
        services: entities.services,
        insurance: entities.insurance,
        contactPreference: entities.contactPreference
      },
      activeWorkflow: state?.activeWorkflow || null,
      workflowStep: state?.workflowState?.step || null,
      workflowStatus: state?.workflowState?.status || null,
      collected: state?.workflowState?.collected ? { ...state.workflowState.collected } : null,
      completions: (state?.completions || []).map(c => ({ ...c })),
      stepError: extra?.error || null,
      retries: extra?.retries || null,
      isChangeRequest: isChangeRequest(inputText),
      isConfirmation: isConfirmation(inputText)
    };

    conv.turns.push(turn);
    conv.totalTurns = conv.turns.length;

    if (state?.metadata) {
      conv.metadata = { ...conv.metadata, ...state.metadata };
    }
  }

  function finalizeConversation(sessionId, outcome, detail) {
    if (!conversations.has(sessionId)) return;
    const conv = conversations.get(sessionId);
    conv.endedAt = new Date().toISOString();
    conv.outcome = outcome;
    conv.outcomeDetail = detail;
    const lastTurn = conv.turns[conv.turns.length - 1];
    if (lastTurn?.collected) {
      conv.finalCollected = { ...lastTurn.collected };
    }
  }

  function getConversation(sessionId) {
    return conversations.get(sessionId) || null;
  }

  function getAllConversations(filters) {
    let list = Array.from(conversations.values());
    if (filters) {
      if (filters.outcome) list = list.filter(c => c.outcome === filters.outcome);
      if (filters.workflow) list = list.filter(c => c.turns.some(t => t.activeWorkflow === filters.workflow));
      if (filters.query) {
        const q = filters.query.toLowerCase();
        list = list.filter(c =>
          c.turns.some(t =>
            t.userMessage.toLowerCase().includes(q) ||
            t.aiResponse.toLowerCase().includes(q)
          )
        );
      }
      if (filters.from) list = list.filter(c => c.startedAt >= filters.from);
      if (filters.to) list = list.filter(c => c.startedAt <= filters.to);
    }
    list.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return list;
  }

  function computeAnalytics() {
    const all = Array.from(conversations.values());
    const completed = all.filter(c => c.outcome);
    const outcomes = {};
    const workflows = {};
    const intents = {};
    const services = {};
    const errors = {};
    const recoveries = [];
    let totalTurns = 0;

    for (const conv of all) {
      totalTurns += conv.totalTurns;
      if (conv.outcome) outcomes[conv.outcome] = (outcomes[conv.outcome] || 0) + 1;
      for (const turn of conv.turns) {
        if (turn.intent) intents[turn.intent] = (intents[turn.intent] || 0) + 1;
        if (turn.activeWorkflow) workflows[turn.activeWorkflow] = (workflows[turn.activeWorkflow] || 0) + 1;
        if (turn.stepError) errors[turn.stepError] = (errors[turn.stepError] || 0) + 1;
        if (turn.isChangeRequest) recoveries.push({ convId: conv.id, turn: turn.index, type: "change_request" });
        if (turn.retries?.name && turn.retries.name >= 2) {
          recoveries.push({ convId: conv.id, turn: turn.index, type: "name_retry" });
        }
        if (turn.collected?.service && !services[turn.collected.service]) {
          services[turn.collected.service] = 0;
        }
        if (turn.collected?.service) {
          services[turn.collected.service] = (services[turn.collected.service] || 0) + 1;
        }
      }
    }

    const bookingCompletions = all.filter(c =>
      c.turns.some(t => t.completions?.some(comp => comp.workflow === "appointment_booking"))
    ).length;
    const leadCompletions = all.filter(c =>
      c.turns.some(t => t.completions?.some(comp => comp.workflow === "lead_capture"))
    ).length;

    return {
      totalConversations: all.length,
      completedConversations: completed.length,
      averageTurns: all.length > 0 ? (totalTurns / all.length).toFixed(1) : 0,
      outcomeDistribution: outcomes,
      workflowUsage: workflows,
      intentDistribution: intents,
      requestedServices: Object.entries(services).sort((a, b) => b[1] - a[1]).slice(0, 10),
      bookingsCompleted: bookingCompletions,
      leadsCompleted: leadCompletions,
      bookingRate: all.length > 0 ? ((bookingCompletions / all.length) * 100).toFixed(1) + "%" : "0%",
      leadRate: all.length > 0 ? ((leadCompletions / all.length) * 100).toFixed(1) + "%" : "0%",
      commonErrors: Object.entries(errors).sort((a, b) => b[1] - a[1]).slice(0, 10),
      recoveryEvents: recoveries,
      recoveryRate: all.length > 0 ? ((recoveries.length / all.length) * 100).toFixed(1) + "%" : "0%"
    };
  }

  function exportConversations(format) {
    const list = Array.from(conversations.values());
    if (format === "csv") {
      const header = "id,sessionId,startedAt,endedAt,outcome,outcomeDetail,totalTurns,name,email,phone\n";
      const rows = list.map(c =>
        `"${c.id}","${c.sessionId}","${c.startedAt}","${c.endedAt || ""}","${c.outcome || ""}","${c.outcomeDetail || ""}",${c.totalTurns},"${c.metadata.name || ""}","${c.metadata.email || ""}","${c.metadata.phone || ""}"`
      ).join("\n");
      return header + rows;
    }
    return JSON.stringify(list, null, 2);
  }

  function reset() {
    conversations.clear();
  }

  return { startRecording, recordTurn, finalizeConversation, getConversation, getAllConversations, computeAnalytics, exportConversations, reset };
}

module.exports = { createConversationRecorder };