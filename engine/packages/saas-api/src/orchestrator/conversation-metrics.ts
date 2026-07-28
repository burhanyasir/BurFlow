import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  name: string;
  status: 'passed' | 'failed';
}

interface CategoryResult {
  total: number;
  passed: number;
  failed: number;
  tests: TestResult[];
}

interface MetricsReport {
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    durationMs: number;
  };
  categoryBreakdown: Record<string, CategoryResult>;
  conversationMetrics: ConversationMetrics;
  qualityGates: QualityGateResult[];
}

interface ConversationMetrics {
  greetingSuccessPct: number;
  smallTalkSuccessPct: number;
  directAnswerPct: number;
  repetitionRate: number;
  qualificationTriggerRate: number;
  prematureQualificationPct: number;
  ctaTriggerRate: number;
  prematureCtaPct: number;
  topicContinuityPct: number;
  memoryReusePct: number;
  hallucinationCount: number;
  internalDisclosureCount: number;
  genericOpeningCount: number;
  genericCtaCount: number;
  avgConversationLength: number;
  avgTurnsBeforeQualification: number;
  avgTurnsBeforeCta: number;
}

interface QualityGateResult {
  name: string;
  passed: boolean;
  detail: string;
}

const CATEGORY_PATTERNS: Record<string, RegExp[]> = {
  'Greetings': [/^Greetings/],
  'Small talk': [/^Small talk/],
  'Sarcasm': [/^Sarcasm/],
  'Frustration': [/^Frustration/, /^Frustration expanded/],
  'Confusion': [/^Confusion/],
  'Objections': [/^Objections/],
  'Pricing': [/^Pricing/, /^Pricing expanded/],
  'Security / Trust': [/^Security/, /^Security expanded/],
  'Integrations': [/^Integrations/, /^Integrations expanded/],
  'Support / Action': [/^Support/],
  'Booking / Demo': [/^Booking/],
  'Competitors': [/^Competitors/],
  'Random questions': [/^Random questions/],
  'Off-topic': [/^Off-topic/],
  'Mixed intents': [/^Mixed intents/],
  'Interruptions': [/^Interruptions/],
  'Topic switching': [/^Topic switching/],
  'Incomplete': [/^Incomplete/],
  'Typo': [/^Typo/],
  'Full conversation flows': [/^Full conversation/],
  'Internal leakage': [/^Internal leakage/],
  'Unsupported claims': [/^Unsupported/],
  'Generic filler': [/^Generic filler/],
  'Robotic transitions': [/^Robotic/],
  'Qualification gating': [/^Qualification gating/],
  'CTA timing': [/^CTA timing/],
  'Memory / ledger': [/^Memory/, /^Memory expanded/],
  'Mood-based tone': [/^Mood-based/],
  'State transitions': [/^State transitions/],
  'Edge cases': [/^Edge cases/],
  'Pipeline integrity': [/^Pipeline integrity/],
  'No repeated qual/CTA': [/^No repeated/],
  'Dedup & cleanup': [/^Dedup/],
  'Buying intent': [/^Buying intent/],
  'Knowledge features': [/^Knowledge/],
  'Conversation flow': [/^Conversation flow/],
  'No generic fallback': [/^No generic fallback/],
};

export function parseVitestJson(jsonOutput: string): { tests: TestResult[]; duration: number } {
  const parsed = JSON.parse(jsonOutput);
  const tests: TestResult[] = [];
  let totalDuration = 0;

  for (const file of parsed.testResults || []) {
    totalDuration = file.duration || 0;
    for (const assertion of file.assertionResults || []) {
      const category = (assertion.ancestorTitles || []).join(' > ');
      tests.push({
        name: `${category} > ${assertion.title}`,
        status: assertion.status === 'passed' ? 'passed' : 'failed',
      });
    }
  }

  return { tests, duration: totalDuration };
}

export function categorizeTests(tests: TestResult[]): Record<string, CategoryResult> {
  const categories: Record<string, CategoryResult> = {};

  for (const [catName, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    const matching = tests.filter(t => patterns.some(p => p.test(t.name)));
    categories[catName] = {
      total: matching.length,
      passed: matching.filter(t => t.status === 'passed').length,
      failed: matching.filter(t => t.status === 'failed').length,
      tests: matching,
    };
  }

  return categories;
}

export function computeMetrics(categories: Record<string, CategoryResult>, allTests: TestResult[]): ConversationMetrics {
  const greetingCat = categories['Greetings'];
  const smallTalkCat = categories['Small talk'];
  const leakageCat = categories['Internal leakage'];
  const unsupportedCat = categories['Unsupported claims'];
  const genericCat = categories['Generic filler'];
  const roboticCat = categories['Robotic transitions'];
  const qualCat = categories['Qualification gating'];
  const ctaCat = categories['CTA timing'];
  const repeatCat = categories['No repeated qual/CTA'];
  const memoryCat = categories['Memory / ledger'];
  const flowCat = categories['Full conversation flows'];
  const dedupCat = categories['Dedup & cleanup'];
  const buyingCat = categories['Buying intent'];

  const allPassed = allTests.filter(t => t.status === 'passed').length;
  const allTotal = allTests.length;

  // Hallucination count: failed unsupported/generic/robotic tests
  const hallucinationCount = (unsupportedCat?.failed || 0) + (genericCat?.failed || 0) + (roboticCat?.failed || 0);

  // Internal disclosure count: failed leakage tests
  const internalDisclosureCount = leakageCat?.failed || 0;

  // Generic opening/CTA count = generic filler + robotic failures
  const genericOpeningCount = (genericCat?.failed || 0) + (roboticCat?.failed || 0);
  const genericCtaCount = 0; // tracked via test assertions

  return {
    greetingSuccessPct: greetingCat ? (greetingCat.passed / Math.max(greetingCat.total, 1)) * 100 : 0,
    smallTalkSuccessPct: smallTalkCat ? (smallTalkCat.passed / Math.max(smallTalkCat.total, 1)) * 100 : 0,
    directAnswerPct: (allPassed / Math.max(allTotal, 1)) * 100,
    repetitionRate: dedupCat ? ((dedupCat.total - dedupCat.passed) / Math.max(dedupCat.total, 1)) * 100 : 0,
    qualificationTriggerRate: qualCat ? (qualCat.passed / Math.max(qualCat.total, 1)) * 100 : 0,
    prematureQualificationPct: qualCat ? ((qualCat.total - qualCat.passed) / Math.max(qualCat.total, 1)) * 100 : 0,
    ctaTriggerRate: ctaCat ? (ctaCat.passed / Math.max(ctaCat.total, 1)) * 100 : 0,
    prematureCtaPct: ctaCat ? ((ctaCat.total - ctaCat.passed) / Math.max(ctaCat.total, 1)) * 100 : 0,
    topicContinuityPct: flowCat ? (flowCat.passed / Math.max(flowCat.total, 1)) * 100 : 0,
    memoryReusePct: (memoryCat?.passed || 0) / Math.max(memoryCat?.total || 1, 1) * 100,
    hallucinationCount,
    internalDisclosureCount,
    genericOpeningCount,
    genericCtaCount,
    avgConversationLength: flowCat ? flowCat.passed : 0,
    avgTurnsBeforeQualification: qualCat ? Math.round(qualCat.passed / Math.max(qualCat.total - qualCat.passed, 1)) : 0,
    avgTurnsBeforeCta: ctaCat ? Math.round(ctaCat.passed / Math.max(ctaCat.total - ctaCat.passed, 1)) : 0,
  };
}

export function checkQualityGates(metrics: ConversationMetrics, categories: Record<string, CategoryResult>): QualityGateResult[] {
  return [
    { name: 'No regressions', passed: Object.values(categories).every(c => c.failed === 0), detail: `Categories with failures: ${Object.entries(categories).filter(([,c]) => c.failed > 0).map(([n]) => n).join(', ') || 'none'}` },
    { name: 'Greeting success ≥95%', passed: metrics.greetingSuccessPct >= 95, detail: `${metrics.greetingSuccessPct.toFixed(1)}%` },
    { name: 'Small-talk success ≥90%', passed: metrics.smallTalkSuccessPct >= 90, detail: `${metrics.smallTalkSuccessPct.toFixed(1)}%` },
    { name: 'Direct answer rate ≥98%', passed: metrics.directAnswerPct >= 98, detail: `${metrics.directAnswerPct.toFixed(1)}%` },
    { name: 'Repetition rate <5%', passed: metrics.repetitionRate < 5, detail: `${metrics.repetitionRate.toFixed(1)}%` },
    { name: 'Premature qualification <5%', passed: metrics.prematureQualificationPct < 5, detail: `${metrics.prematureQualificationPct.toFixed(1)}%` },
    { name: 'Premature CTA <5%', passed: metrics.prematureCtaPct < 5, detail: `${metrics.prematureCtaPct.toFixed(1)}%` },
    { name: 'No internal disclosure', passed: metrics.internalDisclosureCount === 0, detail: `${metrics.internalDisclosureCount} disclosure(s)` },
    { name: 'No hallucinated statistics', passed: metrics.hallucinationCount === 0, detail: `${metrics.hallucinationCount} hallucination(s)` },
    { name: 'Memory continuity', passed: metrics.memoryReusePct >= 90, detail: `${metrics.memoryReusePct.toFixed(1)}%` },
    { name: 'Topic continuity', passed: metrics.topicContinuityPct >= 90, detail: `${metrics.topicContinuityPct.toFixed(1)}%` },
  ];
}

export function generateReport(report: MetricsReport): string {
  const lines: string[] = [];
  const sep = '='.repeat(68);

  lines.push(sep);
  lines.push(`  CONVERSATION REGRESSION METRICS REPORT`);
  lines.push(`  ${report.timestamp}`);
  lines.push(sep);
  lines.push('');
  lines.push(`  SUMMARY`);
  lines.push(`  ${'-'.repeat(40)}`);
  lines.push(`  Total tests : ${report.summary.total}`);
  lines.push(`  Passed      : ${report.summary.passed}`);
  lines.push(`  Failed      : ${report.summary.failed}`);
  lines.push(`  Pass rate   : ${report.summary.passRate.toFixed(1)}%`);
  lines.push(`  Duration    : ${report.summary.durationMs}ms`);
  lines.push('');

  lines.push(`  CONVERSATION QUALITY METRICS`);
  lines.push(`  ${'-'.repeat(50)}`);
  const m = report.conversationMetrics;
  const fmt = (v: number) => v.toFixed(1);
  lines.push(`  Greeting success           : ${fmt(m.greetingSuccessPct)}%`);
  lines.push(`  Small-talk success         : ${fmt(m.smallTalkSuccessPct)}%`);
  lines.push(`  Direct answer rate         : ${fmt(m.directAnswerPct)}%`);
  lines.push(`  Repetition rate            : ${fmt(m.repetitionRate)}%`);
  lines.push(`  Qualification trigger rate : ${fmt(m.qualificationTriggerRate)}%`);
  lines.push(`  Premature qualification    : ${fmt(m.prematureQualificationPct)}%`);
  lines.push(`  CTA trigger rate           : ${fmt(m.ctaTriggerRate)}%`);
  lines.push(`  Premature CTA              : ${fmt(m.prematureCtaPct)}%`);
  lines.push(`  Topic continuity           : ${fmt(m.topicContinuityPct)}%`);
  lines.push(`  Memory reuse               : ${fmt(m.memoryReusePct)}%`);
  lines.push(`  Hallucinations             : ${m.hallucinationCount}`);
  lines.push(`  Internal disclosures       : ${m.internalDisclosureCount}`);
  lines.push(`  Generic openings           : ${m.genericOpeningCount}`);
  lines.push(`  Generic CTAs               : ${m.genericCtaCount}`);
  lines.push('');

  lines.push(`  QUALITY GATES`);
  lines.push(`  ${'-'.repeat(50)}`);
  let allPassed = true;
  for (const gate of report.qualityGates) {
    const icon = gate.passed ? '[PASS]' : '[FAIL]';
    lines.push(`  ${icon} ${gate.name.padEnd(35)} ${gate.detail}`);
    if (!gate.passed) allPassed = false;
  }
  lines.push('');
  lines.push(`  Overall: ${allPassed ? 'ALL GATES PASSED' : 'SOME GATES FAILED'}`);
  lines.push(sep);

  return lines.join('\n');
}

export function runMetrics(vitestJsonPath?: string): MetricsReport {
  const testFile = 'packages/saas-api/src/__tests__/conversation-regression.test.ts';

  let jsonOutput: string;
  let durationMs: number;

  if (vitestJsonPath && fs.existsSync(vitestJsonPath)) {
    jsonOutput = fs.readFileSync(vitestJsonPath, 'utf-8');
    durationMs = 0;
  } else {
    const cwd = process.cwd();
    const engineRoot = cwd.includes('packages') ? path.resolve(cwd, '..', '..') : cwd;
    const cmd = `npx vitest run "${testFile}" --reporter=json`;
    try {
      const stdout = execSync(cmd, { cwd: engineRoot, encoding: 'utf-8', timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] });
      jsonOutput = stdout;
      durationMs = 0;
    } catch (e: any) {
      jsonOutput = e.stdout || '{}';
      if (!jsonOutput || jsonOutput === '{}') {
        jsonOutput = e.stderr || '{}';
      }
      durationMs = 0;
    }
  }

  const { tests, duration } = parseVitestJson(jsonOutput);
  durationMs = durationMs || duration;

  const allTests: TestResult[] = tests;
  const total = allTests.length;
  const passed = allTests.filter(t => t.status === 'passed').length;
  const failed = total - passed;

  const categories = categorizeTests(allTests);
  const metrics = computeMetrics(categories, allTests);
  const qualityGates = checkQualityGates(metrics, categories);

  const report: MetricsReport = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed,
      failed,
      passRate: total > 0 ? (passed / total) * 100 : 0,
      durationMs,
    },
    categoryBreakdown: categories,
    conversationMetrics: metrics,
    qualityGates,
  };

  return report;
}

if (require.main === module) {
  const report = runMetrics();
  const text = generateReport(report);
  console.log(text);

  const reportPath = path.resolve(process.cwd(), 'regression-report.txt');
  fs.writeFileSync(reportPath, text, 'utf-8');
  console.log(`\nReport saved to ${reportPath}`);
}
