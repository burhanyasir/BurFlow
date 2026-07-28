function generateReport(campaign) {
  const conversations = campaign.conversations || [];
  const totalConversations = conversations.length;
  const conversationsWithFailures = conversations.filter(c => c.failures && c.failures.length > 0);
  const cleanConversations = conversations.filter(c => !c.failures || c.failures.length === 0);

  const outcomeStats = {};
  for (const c of conversations) {
    outcomeStats[c.outcome] = (outcomeStats[c.outcome] || 0) + 1;
  }

  const personaStats = {};
  for (const c of conversations) {
    if (!personaStats[c.personaId]) {
      personaStats[c.personaId] = { total: 0, failed: 0, outcomes: {}, turns: [] };
    }
    personaStats[c.personaId].total++;
    personaStats[c.personaId].turns.push(c.turnCount || c.turns?.length || 0);
    if (c.failures && c.failures.length > 0) personaStats[c.personaId].failed++;
    personaStats[c.personaId].outcomes[c.outcome] = (personaStats[c.personaId].outcomes[c.outcome] || 0) + 1;
  }

  const failureTypeStats = {};
  let totalFailures = 0;
  for (const c of conversationsWithFailures) {
    for (const f of (c.failures || [])) {
      totalFailures++;
      if (!failureTypeStats[f.type]) {
        failureTypeStats[f.type] = { count: 0, severity: f.severity, conversations: [] };
      }
      failureTypeStats[f.type].count++;
      if (!failureTypeStats[f.type].conversations.includes(c.personaId + ":" + c.sessionId.slice(-8))) {
        failureTypeStats[f.type].conversations.push(c.personaId + ":" + c.sessionId.slice(-8));
      }
    }
  }

  const avgTurns = conversations.reduce((s, c) => s + (c.turnCount || c.turns?.length || 0), 0) / Math.max(totalConversations, 1);

  const completionBreakdown = {};
  for (const c of conversations) {
    const wfs = c.finalState?.completions?.map(co => co.workflow) || [];
    if (wfs.length > 0) {
      for (const w of wfs) {
        completionBreakdown[w] = (completionBreakdown[w] || 0) + 1;
      }
    } else {
      completionBreakdown.abandoned = (completionBreakdown.abandoned || 0) + 1;
    }
  }

  const topFailures = Object.entries(failureTypeStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20);

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const failureDetail = conversationsWithFailures
    .sort((a, b) => {
      const aMax = Math.min(...(a.failures || []).map(f => severityOrder[f.severity] ?? 99));
      const bMax = Math.min(...(b.failures || []).map(f => severityOrder[f.severity] ?? 99));
      return aMax - bMax;
    })
    .slice(0, 50)
    .map(c => formatFailureDetail(c));

  const transcripts = conversationsWithFailures
    .slice(0, 20)
    .map(c => formatTranscript(c));

  return {
    reportTitle: "AI Conversation Fuzzer — QA Report",
    generatedAt: new Date().toISOString(),
    campaign: {
      personaCount: campaign.personaIds?.length || 0,
      conversationsPerPersona: campaign.conversationsPerPersona || 0,
      maxTurnsPerConversation: campaign.maxTurnsPerConversation || 40,
      totalConversationsRequested: (campaign.personaIds?.length || 0) * (campaign.conversationsPerPersona || 0)
    },
    summary: {
      totalConversations,
      conversationsWithFailures: conversationsWithFailures.length,
      cleanConversations: cleanConversations.length,
      totalFailures,
      failureRate: totalConversations > 0 ? ((conversationsWithFailures.length / totalConversations) * 100).toFixed(1) : "0.0",
      averageTurnsPerConversation: avgTurns.toFixed(1),
      passRate: totalConversations > 0 ? ((cleanConversations.length / totalConversations) * 100).toFixed(1) : "0.0"
    },
    outcomeDistribution: outcomeStats,
    completionBreakdown,
    personaPerformance: Object.entries(personaStats).map(([id, stats]) => ({
      persona: id,
      total: stats.total,
      failed: stats.failed,
      failRate: stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(1) : "0.0",
      avgTurns: (stats.turns.reduce((s, t) => s + t, 0) / Math.max(stats.turns.length, 1)).toFixed(1),
      outcomes: stats.outcomes
    })).sort((a, b) => parseFloat(b.failRate) - parseFloat(a.failRate)),

    failureTypes: topFailures.map(([type, stats]) => ({
      type,
      count: stats.count,
      severity: stats.severity,
      affectedConversations: stats.conversations.length
    })),

    severitySummary: {
      critical: Object.entries(failureTypeStats)
        .filter(([, s]) => s.severity === "critical")
        .reduce((sum, [, s]) => sum + s.count, 0),
      high: Object.entries(failureTypeStats)
        .filter(([, s]) => s.severity === "high")
        .reduce((sum, [, s]) => sum + s.count, 0),
      medium: Object.entries(failureTypeStats)
        .filter(([, s]) => s.severity === "medium")
        .reduce((sum, [, s]) => sum + s.count, 0),
      low: Object.entries(failureTypeStats)
        .filter(([, s]) => s.severity === "low")
        .reduce((sum, [, s]) => sum + s.count, 0)
    },

    rootCauses: generateRootCauses(topFailures, conversationsWithFailures),

    topFailuresDetail: failureDetail,
    sampleTranscripts: transcripts
  };
}

function generateRootCauses(topFailures, failedConversations) {
  const causes = [];
  const typeMap = {};
  for (const [type] of topFailures) {
    typeMap[type] = [];
  }
  for (const c of failedConversations) {
    for (const f of (c.failures || [])) {
      if (typeMap[f.type]) {
        typeMap[f.type].push({
          persona: c.personaId,
          sessionId: c.sessionId,
          turn: f.turn,
          detail: f.detail
        });
      }
    }
  }
  for (const [type, samples] of Object.entries(typeMap)) {
    if (samples.length > 0) {
      causes.push({
        failureType: type,
        occurrenceCount: samples.length,
        sampleSize: Math.min(samples.length, 5),
        samples: samples.slice(0, 5),
        possibleFix: suggestFix(type)
      });
    }
  }
  return causes;
}

function suggestFix(type) {
  const fixes = {
    repeated_response: "Check the conversation manager's processToCompletion for step advancement logic. Ensure each step advances the state machine even on unexpected input.",
    workflow_loop: "Verify that each workflow step can always advance or fail within MAX_STEP_FAILURES iterations. Look for missing process handlers that return null without advancing.",
    context_loss: "Check handleGeneralQuestion and handleBusinessInfo for early returns that don't consider active workflow context.",
    conversation_stalled: "Review isRelevantToWorkflow to ensure it doesn't filter out valid responses. Check for regex patterns that might reject valid user input.",
    uncertain_response: "General FAQ fallback produces 'I'm not sure' responses. Add more comprehensive FAQ matching or a default 'let me connect you' response.",
    emergency_mishandled: "Emergency detection should bypass all non-emergency handlers. Verify emergency score threshold and early routing in processMessage.",
    hallucinated_information: "Review business-knowledge.js for hallucinated facts. Ensure no hardcoded prices/claims without data source.",
    phantom_state: "Check that entity extraction from memory correctly updates session metadata. Verify name extraction from non-obvious patterns.",
    infinite_loop_detected: "Review processToCompletion's max iteration logic. Ensure workflow steps always advance or handle unexpected input gracefully.",
    temporal_anomaly: "Check date handling in completion timestamps. Ensure timestamps are generated in the correct timezone."
  };
  return fixes[type] || "Review the source code handling for this failure type and add appropriate guards or fallback logic.";
}

function formatFailureDetail(conversation) {
  const failures = (conversation.failures || []).slice(0, 10);
  return {
    personaId: conversation.personaId,
    sessionId: conversation.sessionId,
    turnCount: conversation.turnCount || conversation.turns?.length || 0,
    outcome: conversation.outcome,
    failureCount: failures.length,
    topFailures: failures.map(f => ({
      turn: f.turn,
      type: f.type,
      severity: f.severity,
      detail: f.detail.slice(0, 200)
    })),
    userMessages: (conversation.turns || []).map(t => t.message).slice(0, 30)
  };
}

function formatTranscript(conversation) {
  return {
    personaId: conversation.personaId,
    sessionId: conversation.sessionId,
    outcome: conversation.outcome,
    failureCount: (conversation.failures || []).length,
    turns: (conversation.turns || []).slice(0, 30).map(t => ({
      index: t.index,
      user: t.message,
      bot: t.response?.slice(0, 300),
      workflow: t.activeWorkflow,
      step: t.workflowStep
    }))
  };
}

module.exports = { generateReport };