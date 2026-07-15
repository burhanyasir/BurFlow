function generateRegressionTest(failure) {
  const { conversation, failureDetail } = failure;
  const turns = conversation.turns || [];
  const failedTurn = failureDetail.turn !== undefined ? turns[failureDetail.turn] : null;

  const scenarioId = `fuzz-regression-${failureDetail.type}-${Date.now()}`;
  const category = failureDetail.severity === "critical" ? "critical" : "regression";

  const testTurns = [];
  for (let i = 0; i <= Math.min((failedTurn?.index || 0) + 1, turns.length - 1); i++) {
    const t = turns[i];
    testTurns.push({
      input: t.message,
      checks: buildChecksForTurn(t, failureDetail, i)
    });
  }

  const scenario = {
    id: scenarioId,
    category,
    description: `Regression test for ${failureDetail.type} (${conversation.personaId}): ${failureDetail.detail?.slice(0, 120)}`,
    sessionId: `regression-${Date.now()}`,
    turns: testTurns,
    checks: buildFinalChecks(failureDetail)
  };

  const template = formatTestTemplate(scenario, failureDetail);

  return { scenario, template };
}

function buildChecksForTurn(turn, failureDetail, turnIndex) {
  const checks = [];

  if (turn.response) {
    checks.push({
      type: "notContains",
      value: "going in circles"
    });
  }

  if (failureDetail.turn === turnIndex) {
    if (failureDetail.type === "repeated_response") {
      checks.push({
        type: "notContains",
        value: turn.response?.slice(0, 60) || ""
      });
    }
    if (failureDetail.type === "workflow_loop") {
      checks.push({
        type: "notContains",
        value: "I didn't quite"
      });
    }
  }

  if (turn.activeWorkflow === "emergency") {
    checks.push({
      type: "notContains",
      value: "we're closed"
    });
    checks.push({
      type: "notContains",
      value: "business hours"
    });
  }

  if (turnIndex > 0) {
    checks.push({
      type: "workflowStep",
      value: "advance",
      fromTurn: turnIndex - 1
    });
  }

  return checks;
}

function buildFinalChecks(failureDetail) {
  const checks = [];
  if (failureDetail.type === "infinite_loop_detected" || failureDetail.type === "conversation_stalled") {
    checks.push({ type: "completionsExists", value: true });
  }
  return checks;
}

function formatTestTemplate(scenario, failureDetail) {
  const lines = [];
  lines.push("// ============================================================");
  lines.push(`// Regression Test: ${failureDetail.type}`);
  lines.push(`// Persona: ${failureDetail.conversation?.personaId || "unknown"}`);
  lines.push(`// Severity: ${failureDetail.severity}`);
  lines.push(`// Root Cause: ${failureDetail.detail?.slice(0, 120) || "Unknown"}`);
  lines.push("// ============================================================");
  lines.push("");
  lines.push("{");
  lines.push(`  id: "${scenario.id}",`);
  lines.push(`  category: "${scenario.category}",`);
  lines.push(`  description: \`${scenario.description}\`,`);
  lines.push(`  sessionId: "${scenario.sessionId}",`);
  lines.push("  turns: [");
  for (const turn of scenario.turns) {
    lines.push("    {");
    lines.push(`      input: ${JSON.stringify(turn.input)},`);
    lines.push("      checks: [");
    for (const check of turn.checks) {
      if (check.type === "workflowStep" && check.value === "advance") {
        lines.push(`        { type: "workflowAdvanced", fromTurn: ${check.fromTurn} }`);
      } else if (check.value !== undefined) {
        lines.push(`        { type: "${check.type}", value: ${JSON.stringify(check.value)} }`);
      } else {
        lines.push(`        { type: "${check.type}" }`);
      }
    }
    lines.push("      ]");
    lines.push("    },");
  }
  lines.push("  ],");
  lines.push("  checks: [");
  for (const check of scenario.checks) {
    lines.push(`    { type: "${check.type}", value: ${JSON.stringify(check.value)} }`);
  }
  lines.push("  ]");
  lines.push("},");
  lines.push("");

  return lines.join("\n");
}

function generateAllRegressionTests(campaignResults) {
  const allFailures = [];
  for (const conv of (campaignResults.conversations || [])) {
    if (conv.failures && conv.failures.length > 0) {
      for (const f of conv.failures) {
        if (f.severity === "critical" || f.severity === "high") {
          allFailures.push({
            conversation: conv,
            failureDetail: f
          });
        }
      }
    }
  }

  const tests = allFailures.map(f => generateRegressionTest(f));

  const report = {
    totalTests: tests.length,
    generatedAt: new Date().toISOString(),
    categories: {
      critical: tests.filter(t => t.scenario.category === "critical").length,
      regression: tests.filter(t => t.scenario.category === "regression").length
    },
    templates: tests.map(t => t.template)
  };

  const combinedTemplate = tests.map(t => t.template).join("\n\n");

  return {
    report,
    templates: tests.map(t => t.template),
    combinedTemplate,
    writeInstructions: `Copy the following regression tests into your qa_suite.js file to permanently capture these bugs.`
  };
}

module.exports = { generateRegressionTest, generateAllRegressionTests };