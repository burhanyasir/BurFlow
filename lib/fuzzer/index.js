const { getAllPersonas, getPersona } = require("./personas");
const { generateConversation } = require("./conversation-generator");
const { analyzeConversation } = require("./failure-detector");
const { generateReport } = require("./qa-reporter");
const { generateAllRegressionTests } = require("./regression-generator");

class FuzzerCampaign {
  constructor(options = {}) {
    this.personaIds = options.personaIds || getAllPersonas().map(p => p.id);
    this.conversationsPerPersona = options.conversationsPerPersona || 3;
    this.maxTurnsPerConversation = options.maxTurnsPerConversation || 40;
    this.conversationTimeout = options.conversationTimeout || 15000;
    this.demoData = options.demoData;
    this.status = "idle";
    this.conversations = [];
    this.report = null;
    this.regressionTests = null;
    this.progress = { current: 0, total: 0, phase: "" };
    this.errors = [];
    this.startedAt = null;
    this.completedAt = null;
  }

  async run(onProgress) {
    this.status = "running";
    this.startedAt = new Date().toISOString();
    this.conversations = [];
    this.errors = [];

    const total = this.personaIds.length * this.conversationsPerPersona;
    this.progress.total = total;
    this.progress.current = 0;
    this.progress.phase = "Generating conversations";

    let convIndex = 0;

    for (const personaId of this.personaIds) {
      const persona = getPersona(personaId);
      if (!persona) {
        this.errors.push(`Unknown persona: ${personaId}`);
        continue;
      }

      for (let seed = 1; seed <= this.conversationsPerPersona; seed++) {
        this.progress.current++;
        this.progress.phase = `[${personaId}] conversation ${seed}/${this.conversationsPerPersona}`;

        try {
          const result = await this._runWithTimeout(
            () => generateConversation(personaId, this.demoData, `${seed}-${Date.now()}`),
            this.conversationTimeout
          );
          this.conversations.push(result);
        } catch (err) {
          this.errors.push({
            personaId,
            seed,
            error: err.message || String(err)
          });
          this.conversations.push({
            personaId,
            sessionId: `failed-${personaId}-${seed}`,
            turns: [],
            turnCount: 0,
            failures: [{ type: "generation_error", severity: "critical", detail: err.message || String(err) }],
            outcome: "failed",
            seed,
            error: err.message || String(err)
          });
        }

        if (onProgress) {
          onProgress({
            current: this.progress.current,
            total: this.progress.total,
            phase: this.progress.phase,
            failuresSoFar: this.conversations.filter(c => c.failures?.length > 0).length
          });
        }
      }
    }

    this.progress.phase = "Analyzing failures";
    for (const conv of this.conversations) {
      const analysis = analyzeConversation(conv);
      if (analysis.failures.length > 0) {
        conv.failures = conv.failures || [];
        conv.failures.push(...analysis.failures);
      }
    }

    this.progress.phase = "Generating report";
    this.report = generateReport({ ...this, conversations: this.conversations });

    this.progress.phase = "Generating regression tests";
    this.regressionTests = generateAllRegressionTests({ conversations: this.conversations });

    this.status = "completed";
    this.completedAt = new Date().toISOString();

    return {
      status: this.status,
      conversations: this.conversations,
      report: this.report,
      regressionTests: this.regressionTests,
      errors: this.errors,
      summary: this.report?.summary || null
    };
  }

  _runWithTimeout(fn, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
      try {
        const result = fn();
        clearTimeout(timer);
        resolve(result);
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  getResults() {
    return {
      status: this.status,
      conversations: this.conversations,
      report: this.report,
      regressionTests: this.regressionTests,
      errors: this.errors,
      startedAt: this.startedAt,
      completedAt: this.completedAt
    };
  }
}

function createFuzzerCampaign(options) {
  return new FuzzerCampaign(options);
}

module.exports = { createFuzzerCampaign, FuzzerCampaign };