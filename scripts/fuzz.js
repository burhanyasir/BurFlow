const path = require("path");
const fs = require("fs");
const demoData = require("../data/seed");
const { createFuzzerCampaign } = require("../lib/fuzzer");

const args = process.argv.slice(2);
const personasArg = args.find(a => a.startsWith("--personas="));
const countArg = args.find(a => a.startsWith("--count="));
const turnsArg = args.find(a => a.startsWith("--turns="));
const outputArg = args.find(a => a.startsWith("--output="));
const helpArg = args.find(a => a === "--help" || a === "-h");

if (helpArg) {
  console.log(`
AI Conversation Fuzzer — CLI

Usage: node scripts/fuzz.js [options]

Options:
  --personas=<id1,id2,...>  Persona IDs to run (default: all)
  --count=N                  Conversations per persona (default: 3)
  --turns=N                  Max turns per conversation (default: 40)
  --output=<path>            Output directory for report files (default: ./fuzz-output/)

Examples:
  node scripts/fuzz.js --count=5 --turns=30
  node scripts/fuzz.js --personas=new_patient,emergency --count=10
  node scripts/fuzz.js --count=20 --output=./reports/fuzz-weekly
`);
  process.exit(0);
}

const personaIds = personasArg
  ? personasArg.split("=")[1].split(",").map(s => s.trim())
  : null;

const conversationsPerPersona = countArg ? parseInt(countArg.split("=")[1]) : 3;
const maxTurnsPerConversation = turnsArg ? parseInt(turnsArg.split("=")[1]) : 40;
const outputDir = outputArg ? outputArg.split("=")[1] : path.join(__dirname, "..", "fuzz-output");

async function main() {
  console.log("=".repeat(60));
  console.log("AI CONVERSATION FUZZER");
  console.log("=".repeat(60));

  const campaign = createFuzzerCampaign({
    personaIds: personaIds || undefined,
    conversationsPerPersona,
    maxTurnsPerConversation,
    demoData
  });

  console.log(`Personas: ${(personaIds || campaign.personaIds).length}`);
  console.log(`Conversations per persona: ${conversationsPerPersona}`);
  console.log(`Max turns per conversation: ${maxTurnsPerConversation}`);
  console.log(`Total conversations: ${(personaIds || campaign.personaIds).length * conversationsPerPersona}`);
  console.log("");

  console.log("Running fuzzer...");
  const startTime = Date.now();

  const result = await campaign.run((progress) => {
    const pct = ((progress.current / progress.total) * 100).toFixed(1);
    process.stdout.write(`\r  Progress: ${progress.current}/${progress.total} (${pct}%) — ${progress.phase}   `);
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\nCompleted in ${elapsed}s`);
  console.log("");

  const report = result.report;

  console.log("=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total conversations:    ${report.summary.totalConversations}`);
  console.log(`Clean:                  ${report.summary.cleanConversations}`);
  console.log(`With failures:          ${report.summary.conversationsWithFailures}`);
  console.log(`Total failure events:   ${report.summary.totalFailures}`);
  console.log(`Pass rate:              ${report.summary.passRate}%`);
  console.log(`Avg turns/conversation: ${report.summary.averageTurnsPerConversation}`);
  console.log("");

  console.log("FAILURE BREAKDOWN BY SEVERITY:");
  console.log(`  Critical: ${report.severitySummary.critical}`);
  console.log(`  High:     ${report.severitySummary.high}`);
  console.log(`  Medium:   ${report.severitySummary.medium}`);
  console.log(`  Low:      ${report.severitySummary.low}`);
  console.log("");

  console.log("FAILURE TYPES:");
  for (const ft of report.failureTypes.slice(0, 10)) {
    console.log(`  ${ft.type.padEnd(28)} ${ft.count.toString().padStart(4)} (${ft.severity}, ${ft.affectedConversations} conversations)`);
  }
  console.log("");

  console.log("PERSONA PERFORMANCE (sorted by fail rate):");
  for (const p of report.personaPerformance) {
    const bar = "▓".repeat(Math.min(Math.round(parseFloat(p.failRate) / 5), 20));
    console.log(`  ${p.persona.padEnd(22)} ${p.failRate.padStart(5)}% fail  ${p.failed}/${p.total}  avg ${p.avgTurns.padStart(4)} turns  ${bar}`);
  }
  console.log("");

  console.log("OUTCOME DISTRIBUTION:");
  for (const [outcome, count] of Object.entries(report.outcomeDistribution)) {
    console.log(`  ${outcome.padEnd(24)} ${count}`);
  }
  console.log("");

  fs.mkdirSync(outputDir, { recursive: true });

  const summaryPath = path.join(outputDir, "fuzz-summary.txt");
  const summaryLines = [
    `Fuzzer Report — ${new Date().toISOString()}`,
    `========================================`,
    ``,
    `Total conversations:    ${report.summary.totalConversations}`,
    `Clean:                  ${report.summary.cleanConversations}`,
    `With failures:          ${report.summary.conversationsWithFailures}`,
    `Total failure events:   ${report.summary.totalFailures}`,
    `Pass rate:              ${report.summary.passRate}%`,
    `Avg turns/conversation: ${report.summary.averageTurnsPerConversation}`,
    ``,
    `FAILURE BREAKDOWN BY SEVERITY:`,
    `  Critical: ${report.severitySummary.critical}`,
    `  High:     ${report.severitySummary.high}`,
    `  Medium:   ${report.severitySummary.medium}`,
    `  Low:      ${report.severitySummary.low}`,
    ``,
    `FAILURE TYPES:`
  ];
  for (const ft of report.failureTypes) {
    summaryLines.push(`  ${ft.type}: ${ft.count} occurrences (${ft.severity})`);
  }
  summaryLines.push(``);
  summaryLines.push(`PERSONA PERFORMANCE:`);
  for (const p of report.personaPerformance) {
    summaryLines.push(`  ${p.persona}: ${p.failRate}% fail rate (${p.failed}/${p.total})`);
  }
  summaryLines.push(``);
  summaryLines.push(`OUTCOME DISTRIBUTION:`);
  for (const [outcome, count] of Object.entries(report.outcomeDistribution)) {
    summaryLines.push(`  ${outcome}: ${count}`);
  }
  fs.writeFileSync(summaryPath, summaryLines.join("\n"), "utf-8");
  console.log(`Summary written to: ${summaryPath}`);

  const jsonPath = path.join(outputDir, "fuzz-report.json");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`Full report written to: ${jsonPath}`);

  if (result.regressionTests && result.regressionTests.templates.length > 0) {
    const regrPath = path.join(outputDir, "regression-tests.txt");
    fs.writeFileSync(regrPath, result.regressionTests.combinedTemplate, "utf-8");
    console.log(`Regression tests (${result.regressionTests.templates.length}) written to: ${regrPath}`);
  }

  const conversationsPath = path.join(outputDir, "all-conversations.json");
  const exportableConvs = campaign.conversations.map(c => ({
    personaId: c.personaId,
    outcome: c.outcome,
    turnCount: c.turnCount,
    failures: (c.failures || []).length,
    startedAt: c.startedAt,
    endedAt: c.endedAt,
    turns: (c.turns || []).map(t => ({
      index: t.index,
      message: t.message,
      response: t.response?.slice(0, 200),
      activeWorkflow: t.activeWorkflow,
      workflowStep: t.workflowStep
    }))
  }));
  fs.writeFileSync(conversationsPath, JSON.stringify(exportableConvs, null, 2), "utf-8");
  console.log(`All conversations written to: ${conversationsPath}`);

  if (result.errors.length > 0) {
    console.log(`\nErrors: ${result.errors.length}`);
    for (const err of result.errors.slice(0, 5)) {
      console.log(`  [${err.personaId}] seed ${err.seed}: ${err.error.slice(0, 100)}`);
    }
  }

  console.log("\nDone.");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});