const demoData = require("./data/seed");
const { createConversationManager } = require("./lib/conversation-manager");
const { extractEntities, isConfirmation, isChangeRequest } = require("./lib/entity-extractor");

// ============================================================
// QA TEST RUNNER
// ============================================================
class QARunner {
  constructor() {
    this.scenarios = [];
    this.results = [];
    this.startTime = null;
    this.endTime = null;
  }

  add(scenario) {
    this.scenarios.push(scenario);
  }

  addAll(scenarios) {
    this.scenarios.push(...scenarios);
  }

  run() {
    this.startTime = Date.now();
    const cm = createConversationManager(demoData);
    console.log(`Running ${this.scenarios.length} QA scenarios...`);

    for (let i = 0; i < this.scenarios.length; i++) {
      const s = this.scenarios[i];
      const progress = `[${i + 1}/${this.scenarios.length}]`;
      process.stdout.write(`  ${progress} ${s.id}... `);

      const result = this._runScenario(cm, s);
      this.results.push(result);
      process.stdout.write(result.passed ? "PASS\n" : "FAIL\n");
    }

    this.endTime = Date.now();
    return this._generateReport();
  }

  _runScenario(cm, scenario) {
    const sid = scenario.sessionId || `qa-${scenario.id}-${Date.now()}`;
    const turnResults = [];
    let passed = true;

    for (const turn of scenario.turns) {
      const reply = cm.processMessage(sid, turn.input);
      const state = cm.getSessionState(sid);
      const entities = extractEntities(turn.input);

      const turnResult = { input: turn.input, reply, checks: [] };
      let turnPassed = true;

      for (const check of turn.checks || []) {
        const cr = this._runCheck(check, reply, state, entities, sid, cm);
        turnResult.checks.push(cr);
        if (!cr.passed) { turnPassed = false; passed = false; }
      }

      turnResult.passed = turnPassed;
      turnResults.push(turnResult);
    }

    const finalState = cm.getSessionState(sid);
    const finalChecks = [];
    for (const check of scenario.checks || []) {
      const cr = this._runCheck(check, "", finalState, null, sid, cm);
      finalChecks.push(cr);
      if (!cr.passed) passed = false;
    }

    return {
      id: scenario.id,
      category: scenario.category,
      description: scenario.description,
      passed,
      turnResults,
      finalState,
      finalChecks,
      transcript: turnResults.map(t => `  USER: ${t.input}\n  BOT:  ${t.reply}`).join("\n")
    };
  }

  _runCheck(check, reply, state, entities, sid, cm) {
    const { type, value, path } = check;
    let passed = false;
    let actual = null;
    let detail = "";

    try {
      switch (type) {
        case "contains":
          actual = reply;
          passed = reply.toLowerCase().includes(value.toLowerCase());
          if (!passed) detail = `Expected reply to contain "${value}"`;
          break;
        case "notContains":
          actual = reply;
          passed = !reply.toLowerCase().includes(value.toLowerCase());
          if (!passed) detail = `Expected reply NOT to contain "${value}"`;
          break;
        case "regex":
          actual = reply;
          passed = new RegExp(value, "i").test(reply);
          if (!passed) detail = `Expected reply to match /${value}/i`;
          break;
        case "stateStep":
          actual = state?.workflowState?.step;
          passed = actual === value;
          if (!passed) detail = `Expected step "${value}" got "${actual}"`;
          break;
        case "stateStatus":
          actual = state?.workflowState?.status;
          passed = actual === value;
          if (!passed) detail = `Expected status "${value}" got "${actual}"`;
          break;
        case "workflowActive":
          actual = state?.activeWorkflow;
          if (value === null) passed = actual === null;
          else passed = actual === value;
          if (!passed) detail = `Expected activeWorkflow "${value}" got "${actual}"`;
          break;
        case "stateCollected":
          actual = JSON.stringify(state?.workflowState?.collected);
          let match = true;
          for (const k of Object.keys(value)) {
            const v = state?.workflowState?.collected?.[k];
            if (v !== value[k]) { match = false; detail += ` collected.${k}: expected "${value[k]}" got "${v}"`; }
          }
          passed = match;
          break;
        case "completions":
          actual = state?.completions?.length || 0;
          passed = actual >= value;
          if (!passed) detail = `Expected >=${value} completions, got ${actual}`;
          break;
        case "pausedCount":
          actual = state?.pausedWorkflows?.length || 0;
          passed = actual === value;
          break;
        case "metadata":
          actual = JSON.stringify(state?.metadata);
          for (const k of Object.keys(value)) {
            const v = state?.metadata?.[k];
            if (v !== value[k]) { match = false; detail += ` metadata.${k}: expected "${value[k]}" got "${v}"`; }
          }
          passed = match;
          break;
        case "entityExtracted":
          actual = JSON.stringify(entities?.[value.field]);
          passed = entities?.[value.field]?.length > 0;
          if (!passed) detail = `Expected entity "${value.field}" to be extracted`;
          break;
        case "entityCount":
          actual = entities?.[value.field]?.length || 0;
          passed = actual === value.count;
          break;
        default:
          passed = false;
          detail = `Unknown check type: ${type}`;
      }
    } catch (e) {
      passed = false;
      detail = `Error: ${e.message}`;
    }

    return { type, value, passed, actual, detail };
  }

  _generateReport() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed);
    const totalTurns = this.results.reduce((s, r) => s + r.turnResults.length, 0);
    const failedTurns = this.results.reduce((s, r) => s + r.turnResults.filter(t => !t.passed).length, 0);
    const totalChecks = this.results.reduce((s, r) => s + r.turnResults.reduce((s2, t) => s2 + t.checks.length, 0), 0);
    const failedChecks = this.results.reduce((s, r) => s + r.turnResults.reduce((s2, t) => s2 + t.checks.filter(c => !c.passed).length, 0), 0);

    const categories = {};
    for (const r of this.results) {
      if (!categories[r.category]) categories[r.category] = { total: 0, passed: 0, failed: 0 };
      categories[r.category].total++;
      if (r.passed) categories[r.category].passed++;
      else categories[r.category].failed++;
    }

    const duration = ((this.endTime - this.startTime) / 1000).toFixed(1);

    const report = {
      summary: {
        total,
        passed,
        failed: failed.length,
        passRate: total > 0 ? ((passed / total) * 100).toFixed(1) + "%" : "N/A",
        totalTurns,
        failedTurns,
        totalChecks,
        failedChecks,
        duration: `${duration}s`
      },
      categories,
      failures: failed.map(r => ({
        id: r.id,
        category: r.category,
        description: r.description,
        failedTurns: r.turnResults.filter(t => !t.passed).map(t => ({
          input: t.input,
          reply: t.reply,
          failedChecks: t.checks.filter(c => !c.passed).map(c => ({
            type: c.type,
            value: c.value,
            detail: c.detail,
            actual: c.actual
          }))
        })),
        finalChecks: r.finalChecks.filter(c => !c.passed),
        transcript: r.transcript
      })),
      allResults: this.results
    };

    return report;
  }

  printReport(report) {
    const s = report.summary;
    console.log(`\n${"=".repeat(60)}`);
    console.log(`  QA REPORT`);
    console.log(`${"=".repeat(60)}`);
    console.log(`  Duration:     ${s.duration}`);
    console.log(`  Scenarios:    ${s.passed}/${s.total} passed (${s.passRate})`);
    console.log(`  Turns:        ${s.totalTurns} total, ${s.failedTurns} failed`);
    console.log(`  Checks:       ${s.totalChecks} total, ${s.failedChecks} failed`);
    console.log(`${"-".repeat(60)}`);

    console.log(`  By Category:`);
    for (const [cat, stats] of Object.entries(report.categories)) {
      const rate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(0) : "N/A";
      console.log(`    ${cat.padEnd(20)} ${stats.passed}/${stats.total} (${rate}%)`);
    }

    if (report.failures.length > 0) {
      console.log(`${"-".repeat(60)}`);
      console.log(`  FAILURES:`);
      for (const f of report.failures) {
        console.log(`\n  [${f.id}] ${f.description}`);
        for (const ft of f.failedTurns) {
          console.log(`    USER: ${ft.input}`);
          console.log(`    BOT:  ${ft.reply.substring(0, 120)}`);
          for (const fc of ft.failedChecks) {
            console.log(`    CHECK: ${fc.type}="${fc.value}" — ${fc.detail}`);
          }
        }
      }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`  Confidence: ${s.passRate}`);
    if (s.failed === 0) console.log(`  All scenarios passed. System is stable.`);
    else console.log(`  ${s.failed} scenario(s) failed. Review transcripts above.`);
    console.log(`${"=".repeat(60)}`);
  }
}

// ============================================================
// HELPER: Build a check list
// ============================================================
function C(type, value) { return { type, value }; }

// ============================================================
// SCENARIO DEFINITIONS
// ============================================================
const scenarios = [];

// ------------------------------------------------------------------
// CATEGORY: booking — Standard booking flows
// ------------------------------------------------------------------
const bookingScenarios = [
  {
    id: "booking-clean-new-sms",
    category: "booking",
    description: "New patient booking cleaning with SMS contact",
    sessionId: "qa-bcns",
    turns: [
      { input: "I need to book a cleaning", checks: [C("contains", "new patient")] },
      { input: "new patient", checks: [C("contains", "day"), C("stateStep", "date")] },
      { input: "next Monday", checks: [C("contains", "time"), C("stateStep", "time")] },
      { input: "9 AM", checks: [C("contains", "name"), C("stateStep", "name")] },
      { input: "Alice Johnson", checks: [C("contains", "reach"), C("stateStep", "phone")] },
      { input: "SMS me at 555-100-2000", checks: [C("contains", "confirm"), C("stateStep", "confirm")] },
      { input: "yes", checks: [C("contains", "confirmed"), C("workflowActive", null), C("completions", 1)] }
    ],
    checks: [C("stateCollected", { service: "General Checkup & Cleaning", name: "Alice Johnson", contactMethod: "sms", patientType: "new" })]
  },
  {
    id: "booking-checkup-existing",
    category: "booking",
    description: "Existing patient booking checkup",
    sessionId: "qa-bce",
    turns: [
      { input: "I want a checkup please", checks: [C("contains", "new patient"), C("stateStep", "visit_type")] },
      { input: "existing patient", checks: [C("contains", "day"), C("stateStep", "date")] },
      { input: "Friday", checks: [C("contains", "time"), C("stateStep", "time")] },
      { input: "2:30 PM", checks: [C("contains", "name"), C("stateStep", "name")] },
      { input: "Bob Williams", checks: [C("contains", "reach"), C("stateStep", "phone")] },
      { input: "555-200-3000", checks: [C("contains", "confirm"), C("stateStep", "confirm")] },
      { input: "looks good", checks: [C("contains", "confirmed")] }
    ]
  },
  {
    id: "booking-whitening-new",
    category: "booking",
    description: "Teeth whitening booking with email contact",
    sessionId: "qa-bwn",
    turns: [
      { input: "Book teeth whitening", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "next Wednesday", checks: [C("contains", "time")] },
      { input: "11 AM", checks: [C("contains", "name")] },
      { input: "Carol Davis", checks: [C("contains", "reach")] },
      { input: "carol@email.com", checks: [C("contains", "confirm")] },
      { input: "yes please", checks: [C("contains", "confirmed")] }
    ],
    checks: [C("stateCollected", { service: "Teeth Whitening", contactMethod: "email", contactValue: "carol@email.com" })]
  },
  {
    id: "booking-root-canal",
    category: "booking",
    description: "Root canal booking with WhatsApp contact",
    sessionId: "qa-brc",
    turns: [
      { input: "I'd like to schedule a root canal", checks: [C("contains", "new patient")] },
      { input: "I'm a returning patient", checks: [C("contains", "day")] },
      { input: "Tuesday", checks: [C("contains", "time")] },
      { input: "10 AM", checks: [C("contains", "name")] },
      { input: "David Lee", checks: [C("contains", "reach")] },
      { input: "WhatsApp 555-333-4444", checks: [C("contains", "confirm")] },
      { input: "looks good", checks: [C("contains", "confirmed")] }
    ],
    checks: [C("stateCollected", { service: "Root Canal Treatment", contactMethod: "whatsapp" })]
  },
  {
    id: "booking-filling-existing",
    category: "booking",
    description: "Dental filling for existing patient",
    sessionId: "qa-bfe",
    turns: [
      { input: "Can I book a filling", checks: [C("contains", "new patient")] },
      { input: "existing", checks: [C("contains", "day")] },
      { input: "this Thursday", checks: [C("contains", "time")] },
      { input: "1 PM", checks: [C("contains", "name")] },
      { input: "Ellen Foster", checks: [C("contains", "reach")] },
      { input: "call me at 555-555-6666", checks: [C("contains", "confirm")] },
      { input: "confirm", checks: [C("contains", "confirmed")] }
    ]
  },
  {
    id: "booking-crown-new",
    category: "booking",
    description: "Dental crown for new patient with phone contact",
    sessionId: "qa-bcn",
    turns: [
      { input: "I need a dental crown", checks: [C("contains", "new patient")] },
      { input: "first time", checks: [C("contains", "day")] },
      { input: "next saturday", checks: [C("contains", "time")] },
      { input: "9 AM", checks: [C("contains", "name")] },
      { input: "Frank Green", checks: [C("contains", "reach")] },
      { input: "555-777-8888", checks: [C("contains", "confirm")] },
      { input: "book it", checks: [C("contains", "confirmed")] }
    ]
  },
  {
    id: "booking-extraction",
    category: "booking",
    description: "Tooth extraction booking",
    sessionId: "qa-be",
    turns: [
      { input: "Book an extraction", checks: [C("contains", "new patient")] },
      { input: "new patient", checks: [C("contains", "day")] },
      { input: "Mon", checks: [C("contains", "time")] },
      { input: "3 PM", checks: [C("contains", "name")] },
      { input: "Grace Hall", checks: [C("contains", "reach")] },
      { input: "grace@test.com", checks: [C("contains", "confirm")] },
      { input: "looks great", checks: [C("contains", "confirmed")] }
    ]
  },
  {
    id: "booking-invisalign",
    category: "booking",
    description: "Invisalign consultation booking",
    sessionId: "qa-bi",
    turns: [
      { input: "I'm interested in invisalign", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "next week", checks: [C("contains", "time")] },
      { input: "10:30 AM", checks: [C("contains", "name")] },
      { input: "Henry Irving", checks: [C("contains", "reach")] },
      { input: "text me at 555-888-9999", checks: [C("contains", "confirm")] },
      { input: "yes", checks: [C("contains", "confirmed")] }
    ]
  },
  {
    id: "booking-pediatric",
    category: "booking",
    description: "Pediatric dentistry booking for child",
    sessionId: "qa-bp",
    turns: [
      { input: "I want to book for my child", checks: [C("contains", "new patient")] },
      { input: "new patient", checks: [C("contains", "day")] },
      { input: "tomorrow", checks: [C("contains", "time")] },
      { input: "9 AM", checks: [C("contains", "name")] },
      { input: "Ivy Jones", checks: [C("contains", "reach")] },
      { input: "555-999-0000", checks: [C("contains", "confirm")] },
      { input: "yes", checks: [C("contains", "confirmed")] }
    ]
  }
];
scenarios.push(...bookingScenarios.map(s => ({ ...s, category: "booking" })));

// ------------------------------------------------------------------
// CATEGORY: multi-service — Multiple services detection
// ------------------------------------------------------------------
const multiServiceScenarios = [
  {
    id: "multi-two-services",
    category: "multi-service",
    description: "Two services mentioned — asks which to book first",
    sessionId: "qa-ms1",
    turns: [
      { input: "I need cleaning and whitening", checks: [C("contains", "interested"), C("contains", "services"), C("contains", "which one")] },
      { input: "cleaning", checks: [C("contains", "cleaning"), C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Wednesday", checks: [C("contains", "time")] },
      { input: "2 PM", checks: [C("contains", "name")] },
      { input: "Kim Lee", checks: [C("contains", "reach")] },
      { input: "555-111-2222", checks: [C("contains", "confirm")] },
      { input: "yes", checks: [C("contains", "confirmed")] }
    ]
  },
  {
    id: "multi-three-services",
    category: "multi-service",
    description: "Three services in one message",
    sessionId: "qa-ms2",
    turns: [
      { input: "I need a filling, crown, and whitening", checks: [C("contains", "services"), C("contains", "which one")] },
      { input: "filling", checks: [C("contains", "filling"), C("contains", "new patient")] }
    ]
  },
  {
    id: "multi-single-service-no-confusion",
    category: "multi-service",
    description: "Single service should not trigger multi-prompt",
    sessionId: "qa-ms3",
    turns: [
      { input: "book a cleaning", checks: [C("notContains", "services"), C("contains", "new patient"), C("stateStep", "visit_type")] }
    ]
  },
  {
    id: "multi-service-and-alias",
    category: "multi-service",
    description: "Service and its alias deduplicated",
    sessionId: "qa-ms4",
    turns: [
      { input: "I need teeth whitening and whitening", checks: [C("notContains", "2 services"), C("contains", "new patient")] }
    ]
  }
];
scenarios.push(...multiServiceScenarios);

// ------------------------------------------------------------------
// CATEGORY: dates — Date parsing variants
// ------------------------------------------------------------------
const dateScenarios = [
  {
    id: "date-standalone-monday",
    category: "dates",
    description: "Just 'Monday' as date",
    sessionId: "qa-d1",
    turns: [
      { input: "book a cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Monday", checks: [C("contains", "time"), C("regex", "Monday|time")] }
    ]
  },
  {
    id: "date-abbrev-wed",
    category: "dates",
    description: "Abbreviation 'Wed'",
    sessionId: "qa-d2",
    turns: [
      { input: "book cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Wed", checks: [C("regex", "Wednesday|time")] }
    ]
  },
  {
    id: "date-abbrev-fri",
    category: "dates",
    description: "Abbreviation 'Fri'",
    sessionId: "qa-d3",
    turns: [
      { input: "book cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Fri", checks: [C("regex", "Friday|time")] }
    ]
  },
  {
    id: "date-tomorrow",
    category: "dates",
    description: "'Tomorrow' as date",
    sessionId: "qa-d4",
    turns: [
      { input: "book cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "tomorrow", checks: [C("regex", "tomorrow|time")] }
    ]
  },
  {
    id: "date-next-week",
    category: "dates",
    description: "'Next week' as date",
    sessionId: "qa-d5",
    turns: [
      { input: "book cleaning", checks: [C("contains", "new patient")] },
      { input: "existing", checks: [C("contains", "day")] },
      { input: "next week", checks: [C("regex", "Monday|time")] }
    ]
  },
  {
    id: "date-this-thursday",
    category: "dates",
    description: "'This Thursday'",
    sessionId: "qa-d6",
    turns: [
      { input: "book cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "this Thursday", checks: [C("contains", "time")] }
    ]
  },
  {
    id: "date-july-16",
    category: "dates",
    description: "Month day format 'July 16'",
    sessionId: "qa-d7",
    turns: [
      { input: "book cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "July 16", checks: [C("contains", "time")] }
    ]
  },
  {
    id: "date-numeric-slash",
    category: "dates",
    description: "Numeric date '7/16'",
    sessionId: "qa-d8",
    turns: [
      { input: "book cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "7/16", checks: [C("contains", "time")] }
    ]
  },
  {
    id: "date-today",
    category: "dates",
    description: "'Today' as date",
    sessionId: "qa-d9",
    turns: [
      { input: "book cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "today", checks: [C("contains", "time")] }
    ]
  }
];
scenarios.push(...dateScenarios);

// ------------------------------------------------------------------
// CATEGORY: names — Name validation
// ------------------------------------------------------------------
const nameScenarios = [
  {
    id: "name-two-word-proper",
    category: "names",
    description: "Standard two-word name 'John Brick'",
    sessionId: "qa-n1",
    turns: [
      { input: "book a cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Monday", checks: [C("contains", "time")] },
      { input: "10 AM", checks: [C("contains", "name")] },
      { input: "John Brick", checks: [C("contains", "John Brick"), C("stateStep", "phone")] }
    ]
  },
  {
    id: "name-two-word-ali",
    category: "names",
    description: "Name 'Ali Asam'",
    sessionId: "qa-n2",
    turns: [
      { input: "book a cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Tuesday", checks: [C("contains", "time")] },
      { input: "11 AM", checks: [C("contains", "name")] },
      { input: "Ali Asam", checks: [C("contains", "Ali Asam"), C("stateStep", "phone")] }
    ]
  },
  {
    id: "name-lowercase-triggers-confirm",
    category: "names",
    description: "Lowercase name triggers confirm step",
    sessionId: "qa-n3",
    turns: [
      { input: "booking cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Wednesday", checks: [C("contains", "time")] },
      { input: "10 AM", checks: [C("contains", "name")] },
      { input: "mary jane", checks: [C("contains", "confirm"), C("stateStep", "confirm_name")] },
      { input: "yes", checks: [C("contains", "reach"), C("stateStep", "phone")] }
    ]
  },
  {
    id: "name-rejected-then-confirm",
    category: "names",
    description: "Unclear name rejected then offered confirm",
    sessionId: "qa-n4",
    turns: [
      { input: "book cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Thu", checks: [C("contains", "time")] },
      { input: "2 PM", checks: [C("contains", "name")] },
      { input: "x", checks: [C("contains", "full name")] },
      { input: "Sam", checks: [C("contains", "Sam"), C("stateStep", "phone")] }
    ]
  }
];
scenarios.push(...nameScenarios);

// ------------------------------------------------------------------
// CATEGORY: contacts — Contact preference handling
// ------------------------------------------------------------------
const contactScenarios = [
  {
    id: "contact-whatsapp",
    category: "contacts",
    description: "WhatsApp contact preference",
    sessionId: "qa-c1",
    turns: [
      { input: "book cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Mon", checks: [C("contains", "time")] },
      { input: "9 AM", checks: [C("contains", "name")] },
      { input: "Paul Allen", checks: [C("contains", "reach")] },
      { input: "WhatsApp: 555-123-4567", checks: [C("contains", "via WhatsApp"), C("stateStep", "confirm")] }
    ]
  },
  {
    id: "contact-email",
    category: "contacts",
    description: "Email contact",
    sessionId: "qa-c2",
    turns: [
      { input: "book cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Fri", checks: [C("contains", "time")] },
      { input: "10 AM", checks: [C("contains", "name")] },
      { input: "Quinn Brown", checks: [C("contains", "reach")] },
      { input: "quinn@test.com", checks: [C("contains", "via email"), C("stateStep", "confirm")] }
    ]
  },
  {
    id: "contact-sms",
    category: "contacts",
    description: "SMS contact",
    sessionId: "qa-c3",
    turns: [
      { input: "book cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Tue", checks: [C("contains", "time")] },
      { input: "11 AM", checks: [C("contains", "name")] },
      { input: "Rachel Green", checks: [C("contains", "reach")] },
      { input: "text me at 555-222-3333", checks: [C("contains", "via sms"), C("stateStep", "confirm")] }
    ]
  },
  {
    id: "contact-phone-call",
    category: "contacts",
    description: "Phone call contact",
    sessionId: "qa-c4",
    turns: [
      { input: "book cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Wed", checks: [C("contains", "time")] },
      { input: "2 PM", checks: [C("contains", "name")] },
      { input: "Sam Turner", checks: [C("contains", "reach")] },
      { input: "call me at 555-444-5555", checks: [C("contains", "confirm")] }
    ]
  }
];
scenarios.push(...contactScenarios);

// ------------------------------------------------------------------
// CATEGORY: changes — Mid-workflow changes
// ------------------------------------------------------------------
const changeScenarios = [
  {
    id: "change-service-mid-booking",
    category: "changes",
    description: "Change service during phone step",
    sessionId: "qa-ch1",
    turns: [
      { input: "book a cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Monday", checks: [C("contains", "time")] },
      { input: "10 AM", checks: [C("contains", "name")] },
      { input: "Tom White", checks: [C("contains", "reach")] },
      { input: "Actually, I want whitening instead", checks: [C("contains", "whitening"), C("stateStep", "visit_type")] }
    ]
  },
  {
    id: "change-date-mid-booking",
    category: "changes",
    description: "Change date during time step",
    sessionId: "qa-ch2",
    turns: [
      { input: "book cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Monday", checks: [C("contains", "time")] },
      { input: "actually change to Friday", checks: [C("regex", "Friday|time")] }
    ]
  },
  {
    id: "change-time",
    category: "changes",
    description: "Change time mid-booking with 'actually'",
    sessionId: "qa-ch3",
    turns: [
      { input: "book cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Wednesday", checks: [C("contains", "time")] },
      { input: "2 PM", checks: [C("contains", "name")] },
      { input: "Ursula King", checks: [C("contains", "reach")] },
      { input: "actually I wanted 3 PM instead", checks: [C("contains", "3"), C("stateStep", "confirm")] }
    ]
  },
  {
    id: "change-service-via-different",
    category: "changes",
    description: "Change service via 'change' keyword",
    sessionId: "qa-ch4",
    turns: [
      { input: "book a filling", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Thursday", checks: [C("contains", "time")] },
      { input: "change service to crown", checks: [C("contains", "crown"), C("stateStep", "visit_type")] }
    ]
  }
];
scenarios.push(...changeScenarios);

// ------------------------------------------------------------------
// CATEGORY: inline — Inline questions during workflow
// ------------------------------------------------------------------
const inlineScenarios = [
  {
    id: "inline-ask-services",
    category: "inline",
    description: "Ask about services mid-booking and resume",
    sessionId: "qa-in1",
    turns: [
      { input: "book a checkup", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "tell me about your services", checks: [C("contains", "back to what we were doing")] },
      { input: "Friday", checks: [C("contains", "time")] }
    ]
  },
  {
    id: "inline-ask-hours",
    category: "inline",
    description: "Ask hours mid-booking and resume",
    sessionId: "qa-in2",
    turns: [
      { input: "book cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "what are your hours", checks: [C("contains", "back to what we were doing")] },
      { input: "Monday", checks: [C("contains", "time")] }
    ]
  },
  {
    id: "inline-ask-location",
    category: "inline",
    description: "Ask location mid-booking and resume",
    sessionId: "qa-in3",
    turns: [
      { input: "book a cleaning", checks: [C("contains", "new patient")] },
      { input: "existing", checks: [C("contains", "day")] },
      { input: "where are you located", checks: [C("contains", "back to what we were doing")] },
      { input: "Wed", checks: [C("contains", "time")] }
    ]
  }
];
scenarios.push(...inlineScenarios);

// ------------------------------------------------------------------
// CATEGORY: topic-switch — Topic switching
// ------------------------------------------------------------------
const topicSwitchScenarios = [
  {
    id: "switch-booking-to-emergency",
    category: "topic-switch",
    description: "Switch from booking to emergency",
    sessionId: "qa-ts1",
    turns: [
      { input: "book a cleaning", checks: [C("contains", "new patient"), C("workflowActive", "appointment_booking")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "I have a dental emergency", checks: [C("contains", "slot"), C("workflowActive", "emergency")] }
    ]
  },
  {
    id: "switch-booking-to-pricing",
    category: "topic-switch",
    description: "Switch from booking to pricing",
    sessionId: "qa-ts2",
    turns: [
      { input: "book cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "how much does whitening cost", checks: [C("contains", "price")] }
    ]
  },
  {
    id: "switch-booking-to-insurance",
    category: "topic-switch",
    description: "Switch from booking to insurance",
    sessionId: "qa-ts3",
    turns: [
      { input: "book cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "do you take delta dental", checks: [C("contains", "member ID"), C("workflowActive", "insurance")] }
    ]
  }
];
scenarios.push(...topicSwitchScenarios);

// ------------------------------------------------------------------
// CATEGORY: emergency — Emergency flows
// ------------------------------------------------------------------
const emergencyScenarios = [
  {
    id: "emergency-cracked-tooth",
    category: "emergency",
    description: "Cracked tooth emergency",
    sessionId: "qa-e1",
    turns: [
      { input: "I have a cracked tooth", checks: [C("contains", "slot")] },
      { input: "11:30 AM", checks: [C("contains", "name")] },
      { input: "Victor Adams", checks: [C("contains", "number")] },
      { input: "555-101-2020", checks: [C("contains", "confirm")] },
      { input: "yes", checks: [C("contains", "all set")] }
    ]
  },
  {
    id: "emergency-severe-pain",
    category: "emergency",
    description: "Severe pain emergency — urgent",
    sessionId: "qa-e2",
    turns: [
      { input: "My tooth hurts so bad it's bleeding", checks: [C("contains", "urgent"), C("contains", "slot")] }
    ]
  }
];
scenarios.push(...emergencyScenarios);

// ------------------------------------------------------------------
// CATEGORY: insurance — Insurance verification
// ------------------------------------------------------------------
const insuranceScenarios = [
  {
    id: "insurance-aetna",
    category: "insurance",
    description: "Aetna insurance verification",
    sessionId: "qa-ins1",
    turns: [
      { input: "Do you accept Aetna", checks: [C("contains", "member ID"), C("workflowActive", "insurance")] },
      { input: "AE789012", checks: [C("contains", "name")] },
      { input: "Wendy Park", checks: [C("contains", "confirm")] },
      { input: "yes", checks: [C("contains", "submitted")] }
    ]
  },
  {
    id: "insurance-cigna",
    category: "insurance",
    description: "Cigna insurance inquiry",
    sessionId: "qa-ins2",
    turns: [
      { input: "Are you in-network with Cigna", checks: [C("contains", "member ID")] },
      { input: "CG554433", checks: [C("contains", "name")] },
      { input: "Xander Cole", checks: [C("contains", "confirm")] },
      { input: "looks good", checks: [C("contains", "submitted")] }
    ]
  }
];
scenarios.push(...insuranceScenarios);

// ------------------------------------------------------------------
// CATEGORY: pricing — Pricing inquiries
// ------------------------------------------------------------------
const pricingScenarios = [
  {
    id: "pricing-whitening",
    category: "pricing",
    description: "Pricing for teeth whitening",
    sessionId: "qa-p1",
    turns: [
      { input: "How much is teeth whitening", checks: [C("contains", "$350")] }
    ]
  },
  {
    id: "pricing-root-canal-then-book",
    category: "pricing",
    description: "Pricing then book appointment",
    sessionId: "qa-p2",
    turns: [
      { input: "root canal cost", checks: [C("contains", "root canal")] },
      { input: "book an appointment", checks: [C("contains", "new patient")] }
    ]
  }
];
scenarios.push(...pricingScenarios);

// ------------------------------------------------------------------
// CATEGORY: lead — Lead capture
// ------------------------------------------------------------------
const leadScenarios = [
  {
    id: "lead-capture-basic",
    category: "lead",
    description: "Basic lead capture",
    sessionId: "qa-l1",
    turns: [
      { input: "I'm interested in your services", checks: [C("contains", "name"), C("workflowActive", "lead_capture")] },
      { input: "Yara Quinn", checks: [C("contains", "reach")] },
      { input: "yara@email.com", checks: [C("contains", "interest")] },
      { input: "teeth whitening", checks: [C("contains", "confirm")] },
      { input: "yes", checks: [C("contains", "Thank you")] }
    ]
  }
];
scenarios.push(...leadScenarios);

// ------------------------------------------------------------------
// CATEGORY: reputation — Trust questions
// ------------------------------------------------------------------
const reputationScenarios = [
  {
    id: "reputation-good-doctors",
    category: "reputation",
    description: "'Are you good doctors?'",
    sessionId: "qa-r1",
    turns: [
      { input: "Are you good doctors?", checks: [C("contains", "15+ years")] }
    ]
  },
  {
    id: "reputation-rating",
    category: "reputation",
    description: "'What's your rating?'",
    sessionId: "qa-r2",
    turns: [
      { input: "What's your rating?", checks: [C("contains", "4.8")] }
    ]
  },
  {
    id: "reputation-reviews",
    category: "reputation",
    description: "'Do you have good reviews?'",
    sessionId: "qa-r3",
    turns: [
      { input: "Do you have good reviews?", checks: [C("contains", "referral")] }
    ]
  },
  {
    id: "reputation-experience",
    category: "reputation",
    description: "'How experienced is your team?'",
    sessionId: "qa-r4",
    turns: [
      { input: "How experienced is your team?", checks: [C("contains", "15+ years")] }
    ]
  },
  {
    id: "reputation-recommended",
    category: "reputation",
    description: "'Are you recommended?'",
    sessionId: "qa-r5",
    turns: [
      { input: "Are you recommended?", checks: [C("contains", "referral")] }
    ]
  }
];
scenarios.push(...reputationScenarios);

// ------------------------------------------------------------------
// CATEGORY: faq — FAQ interruptions
// ------------------------------------------------------------------
const faqScenarios = [
  {
    id: "faq-hours",
    category: "faq",
    description: "Ask about hours",
    sessionId: "qa-f1",
    turns: [
      { input: "What are your hours?", checks: [C("contains", "open")] }
    ]
  },
  {
    id: "faq-location",
    category: "faq",
    description: "Ask about location",
    sessionId: "qa-f2",
    turns: [
      { input: "Where are you located?", checks: [C("contains", "Wellness")] }
    ]
  },
  {
    id: "faq-payment-plans",
    category: "faq",
    description: "Ask about payment plans",
    sessionId: "qa-f3",
    turns: [
      { input: "Do you offer payment plans?", checks: [C("contains", "CareCredit")] }
    ]
  }
];
scenarios.push(...faqScenarios);

// ------------------------------------------------------------------
// CATEGORY: offtopic — Off-topic conversations
// ------------------------------------------------------------------
const offtopicScenarios = [
  {
    id: "offtopic-weather",
    category: "offtopic",
    description: "Ask about weather — should stay on topic",
    sessionId: "qa-o1",
    turns: [
      { input: "How's the weather today?", checks: [C("contains", "BrightSmile")] }
    ]
  },
  {
    id: "offtopic-politics",
    category: "offtopic",
    description: "Ask about politics — should redirect",
    sessionId: "qa-o2",
    turns: [
      { input: "What do you think about the election?", checks: [C("contains", "BrightSmile")] }
    ]
  },
  {
    id: "offtopic-personal",
    category: "offtopic",
    description: "Personal question — should redirect",
    sessionId: "qa-o3",
    turns: [
      { input: "Are you married?", checks: [C("contains", "dentistry")] }
    ]
  }
];
scenarios.push(...offtopicScenarios);

// ------------------------------------------------------------------
// CATEGORY: hostile — Hostile users
// ------------------------------------------------------------------
const hostileScenarios = [
  {
    id: "hostile-insult",
    category: "hostile",
    description: "User insults the bot",
    sessionId: "qa-h1",
    turns: [
      { input: "You're useless and dumb", checks: [C("contains", "sorry you're having a frustrating experience")] }
    ]
  },
  {
    id: "hostile-threat",
    category: "hostile",
    description: "User threatens",
    sessionId: "qa-h2",
    turns: [
      { input: "I'll sue you if you mess this up", checks: [C("contains", "help")] }
    ]
  },
  {
    id: "hostile-spam",
    category: "hostile",
    description: "Spam input",
    sessionId: "qa-h3",
    turns: [
      { input: "asdf asdf asdf asdf asdf asdf", checks: [C("contains", "BrightSmile")] }
    ]
  }
];
scenarios.push(...hostileScenarios);

// ------------------------------------------------------------------
// CATEGORY: invalid — Invalid inputs
// ------------------------------------------------------------------
const invalidScenarios = [
  {
    id: "invalid-empty",
    category: "invalid",
    description: "Empty input",
    sessionId: "qa-i1",
    turns: [
      { input: "", checks: [C("contains", "help")] }
    ]
  },
  {
    id: "invalid-numbers-only",
    category: "invalid",
    description: "Numbers only input",
    sessionId: "qa-i2",
    turns: [
      { input: "12345 67890", checks: [C("contains", "BrightSmile")] }
    ]
  },
  {
    id: "invalid-symbols",
    category: "invalid",
    description: "Symbols only input",
    sessionId: "qa-i3",
    turns: [
      { input: "@#$%^&*()", checks: [C("contains", "BrightSmile")] }
    ]
  }
];
scenarios.push(...invalidScenarios);

// ------------------------------------------------------------------
// CATEGORY: typos — Typo handling
// ------------------------------------------------------------------
const typoScenarios = [
  {
    id: "typo-cleaning",
    category: "typos",
    description: "Typo 'cleen' should still work",
    sessionId: "qa-t1",
    turns: [
      { input: "I need a cleening", checks: [C("contains", "new patient")] }
    ]
  },
  {
    id: "typo-wednesday",
    category: "typos",
    description: "Short 'wed' already supported",
    sessionId: "qa-t2",
    turns: [
      { input: "book a cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Wed", checks: [C("contains", "time")] }
    ]
  },
  {
    id: "typo-misspelled-service",
    category: "typos",
    description: "Misspelled service name",
    sessionId: "qa-t3",
    turns: [
      { input: "I want whitenning", checks: [C("notContains", "service")] }
    ]
  }
];
scenarios.push(...typoScenarios);

// ------------------------------------------------------------------
// CATEGORY: loop — Infinite loop prevention
// ------------------------------------------------------------------
const loopScenarios = [
  {
    id: "loop-three-failures",
    category: "loop",
    description: "3 failures triggers recovery offer",
    sessionId: "qa-lp1",
    turns: [
      { input: "book a zxyw", checks: [C("contains", "service")] },
      { input: "qwerty", checks: [C("contains", "service")] },
      { input: "asdfgh", checks: [C("contains", "start over")] }
    ]
  },
  {
    id: "loop-recovery-start-over",
    category: "loop",
    description: "Recovery 'start over' resets workflow",
    sessionId: "qa-lp2",
    turns: [
      { input: "book a zxyw", checks: [] },
      { input: "qwerty", checks: [] },
      { input: "asdfgh", checks: [] },
      { input: "start over", checks: [C("contains", "service")] },
      { input: "cleaning", checks: [C("contains", "new patient"), C("stateStep", "visit_type")] }
    ]
  },
  {
    id: "loop-recovery-clinic",
    category: "loop",
    description: "Recovery 'call clinic' offers referral",
    sessionId: "qa-lp3",
    turns: [
      { input: "book a zxyw", checks: [] },
      { input: "qwerty", checks: [] },
      { input: "asdfgh", checks: [] },
      { input: "I want to speak to the clinic", checks: [C("contains", "BrightSmile")] }
    ]
  }
];
scenarios.push(...loopScenarios);

// ------------------------------------------------------------------
// CATEGORY: prefill — Memory prefill
// ------------------------------------------------------------------
const prefillScenarios = [
  {
    id: "prefill-service-from-pricing",
    category: "prefill",
    description: "Service pre-filled from pricing conversation",
    sessionId: "qa-pr1",
    turns: [
      { input: "How much is a root canal", checks: [C("contains", "root canal")] },
      { input: "I want to book an appointment", checks: [C("contains", "root canal"), C("stateStep", "visit_type")] }
    ]
  },
  {
    id: "prefill-date-from-context",
    category: "prefill",
    description: "Date pre-filled from previous mention",
    sessionId: "qa-pr2",
    turns: [
      { input: "book a cleaning on Friday", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "time")] }
    ]
  }
];
scenarios.push(...prefillScenarios);

// ------------------------------------------------------------------
// CATEGORY: regression — Previously fixed bugs
// ------------------------------------------------------------------
const regressionScenarios = [
  {
    id: "regression-contact-pref-whatsapp",
    category: "regression",
    description: "WhatsApp contact preference (previous fix)",
    sessionId: "qa-reg1",
    turns: [
      { input: "book a cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Thu", checks: [C("contains", "time")] },
      { input: "10 AM", checks: [C("contains", "name")] },
      { input: "Regina Test", checks: [C("contains", "reach")] },
      { input: "WhatsApp: 555-000-1111", checks: [C("contains", "via WhatsApp")] },
      { input: "yes", checks: [C("contains", "confirmed")] }
    ]
  },
  {
    id: "regression-confirm-summary",
    category: "regression",
    description: "Confirmation summary before completion",
    sessionId: "qa-reg2",
    turns: [
      { input: "book a cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Tue", checks: [C("contains", "time")] },
      { input: "11 AM", checks: [C("contains", "name")] },
      { input: "Sam Confirm", checks: [C("contains", "reach")] },
      { input: "555-123-4567", checks: [C("contains", "confirm")] },
      { input: "yes", checks: [C("contains", "confirmed")] }
    ]
  },
  {
    id: "regression-inline-resume",
    category: "regression",
    description: "Inline question resumes workflow",
    sessionId: "qa-reg3",
    turns: [
      { input: "book checkup", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "what services do you offer", checks: [C("contains", "back to what we were doing")] },
      { input: "Friday", checks: [C("contains", "time")] }
    ]
  },
  {
    id: "regression-reputation-handler",
    category: "regression",
    description: "Reputation question answered",
    sessionId: "qa-reg4",
    turns: [
      { input: "Are you any good?", checks: [C("contains", "15+ years")] }
    ]
  },
  {
    id: "regression-multi-booking",
    category: "regression",
    description: "Multiple bookings same session",
    sessionId: "qa-reg5",
    turns: [
      { input: "book cleaning", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Mon", checks: [C("contains", "time")] },
      { input: "9 AM", checks: [C("contains", "name")] },
      { input: "Multi Booker", checks: [C("contains", "reach")] },
      { input: "555-111-2222", checks: [C("contains", "confirm")] },
      { input: "yes", checks: [C("contains", "confirmed")] },
      { input: "I also need whitening", checks: [C("contains", "teeth whitening"), C("stateStep", "visit_type")] }
    ]
  }
];
scenarios.push(...regressionScenarios);

// ------------------------------------------------------------------
// CATEGORY: fuzz-regression — Fuzzer-discovered bug fixes
// ------------------------------------------------------------------
const fuzzRegressionScenarios = [
  {
    id: "fuzz-insurance-varied-responses",
    category: "fuzz-regression",
    description: "Repeated insurance queries get varied responses (not identical)",
    sessionId: "qa-fuzz1",
    turns: [
      { input: "Do you take Aetna?", checks: [C("notContains", "going in circles")] },
      { input: "What about Cigna?", checks: [C("notContains", "going in circles"), C("workflowActive", "insurance")] },
      { input: "Do you accept Delta Dental?", checks: [C("notContains", "going in circles"), C("notContains", "Yes, we accept Aetna")] }
    ]
  },
  {
    id: "fuzz-pricing-varied-responses",
    category: "fuzz-regression",
    description: "Repeated pricing queries get varied responses",
    sessionId: "qa-fuzz2",
    turns: [
      { input: "How much is cleaning?", checks: [C("notContains", "going in circles")] },
      { input: "What about filling pricing?", checks: [C("notContains", "going in circles")] },
      { input: "And whitening?", checks: [C("notContains", "going in circles"), C("notContains", "How much is cleaning")] }
    ]
  },
  {
    id: "fuzz-confused-advances",
    category: "fuzz-regression",
    description: "Confused/pediatric questions don't stall the workflow",
    sessionId: "qa-fuzz3",
    turns: [
      { input: "book pediatric checkup", checks: [C("contains", "new patient")] },
      { input: "new", checks: [C("contains", "day")] },
      { input: "Is it safe for my child?", checks: [C("notContains", "going in circles")] },
      { input: "Will it hurt?", checks: [C("notContains", "going in circles")] },
      { input: "Monday", checks: [C("regex", "Monday|time|AM|PM|available")] }
    ]
  },
  {
    id: "fuzz-insurance-then-pricing",
    category: "fuzz-regression",
    description: "Complete insurance then start pricing — no workflow loop",
    sessionId: "qa-fuzz4",
    turns: [
      { input: "Do you accept Blue Cross?", checks: [C("contains", "member ID")] },
      { input: "BC123456", checks: [C("contains", "name")] },
      { input: "Jane Smith", checks: [C("contains", "confirm")] },
      { input: "yes", checks: [C("contains", "submitted")] },
      { input: "How much for whitening?", checks: [C("notContains", "going in circles")] }
    ]
  },
  {
    id: "fuzz-no-escalation-loop",
    category: "fuzz-regression",
    description: "Repeated failures don't produce infinite identical responses",
    sessionId: "qa-fuzz5",
    turns: [
      { input: "xyzzy", checks: [C("notContains", "going in circles")] },
      { input: "plugh", checks: [C("notContains", "going in circles")] },
      { input: "frobnicate", checks: [C("notContains", "going in circles")] },
      { input: "xyzzy", checks: [C("notContains", "going in circles")] },
      { input: "plugh", checks: [C("notContains", "going in circles")] }
    ]
  }
];
scenarios.push(...fuzzRegressionScenarios);

// ------------------------------------------------------------------
// MAIN
// ------------------------------------------------------------------
const runner = new QARunner();
runner.addAll(scenarios);
const report = runner.run();
runner.printReport(report);

// Save report to JSON file
const fs = require("fs");
const reportPath = `qa_report_${Date.now()}.json`;
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nFull report saved to: ${reportPath}`);

process.exit(report.summary.failed > 0 ? 1 : 0);
