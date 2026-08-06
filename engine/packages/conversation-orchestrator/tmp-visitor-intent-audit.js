const fs = require('fs');
const path = require('path');
const root = path.resolve('d:/Proj Chatbot/engine/packages/conversation-orchestrator');
const harnessPath = path.join(root, 'src/sales-conversion-real-world-evaluation-harness.ts');
const failuresPath = path.join(root, 'tmp-failing-cases.json');
const outPath = path.join(root, 'tmp-visitor-intent-audit.json');
const harnessText = fs.readFileSync(harnessPath, 'utf8');
const failures = JSON.parse(fs.readFileSync(failuresPath, 'utf8'));
const failingUrls = new Set(failures.map((f) => f.URL));

function parseWebsiteProfiles(text) {
  const startMarker = 'const websiteProfiles: RealWorldWebsiteProfile[] = [';
  const start = text.indexOf(startMarker);
  if (start < 0) throw new Error('websiteProfiles marker not found');
  const arrayStart = text.lastIndexOf('[', start + 100);
  let depth = 0;
  let end = -1;
  for (let i = arrayStart; i < text.length; i++) {
    const ch = text[i];
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end < 0) throw new Error('array end not found');
  const arrayText = text.slice(arrayStart, end + 1);
  return eval(`(${arrayText})`);
}

function detectVisitorIntent(message) {
  const lower = message.toLowerCase();
  let intent = 'General Information';
  let matchedKeywords = [];
  let rule = 'none';
  let regex = 'none';
  if (/(buy|purchase|sign up|start trial|get started|free trial)/.test(lower)) {
    intent = 'Buying';
    rule = 'Buying';
    regex = '/(buy|purchase|sign up|start trial|get started|free trial)/';
    matchedKeywords = ['buy', 'purchase', 'trial'];
  } else if (/(pricing|price|cost|plans|tiers)/.test(lower)) {
    intent = 'Pricing';
    rule = 'Pricing';
    regex = '/(pricing|price|cost|plans|tiers)/';
    matchedKeywords = ['pricing', 'price', 'cost', 'plans', 'tiers'].filter((k) => lower.includes(k));
  } else if (/(compare|vs|competitor|alternative)/.test(lower)) {
    intent = 'Comparison';
    rule = 'Comparison';
    regex = '/(compare|vs|competitor|alternative)/';
    matchedKeywords = ['compare', 'vs', 'competitor', 'alternative'].filter((k) => lower.includes(k));
  } else if (/(demo|book|schedule|appointment|call)/.test(lower)) {
    intent = 'Booking';
    rule = 'Booking';
    regex = '/(demo|book|schedule|appointment|call)/';
    matchedKeywords = ['demo', 'book', 'schedule', 'appointment', 'call'].filter((k) => lower.includes(k));
  } else if (/(support|help|issue|problem|ticket)/.test(lower)) {
    intent = 'Support';
    rule = 'Support';
    regex = '/(support|help|issue|problem|ticket)/';
    matchedKeywords = ['support', 'help', 'issue', 'problem', 'ticket'].filter((k) => lower.includes(k));
  } else if (/(security|compliance|privacy|soc2|gdpr)/.test(lower)) {
    intent = 'Product Research';
    rule = 'Product Research';
    regex = '/(security|compliance|privacy|soc2|gdpr)/';
    matchedKeywords = ['security', 'compliance', 'privacy', 'soc2', 'gdpr'].filter((k) => lower.includes(k));
  }
  return { intent, rule, regex, matchedKeywords };
}

const websiteProfiles = parseWebsiteProfiles(harnessText);
const cases = websiteProfiles.map((profile) => {
  const message = profile.messageTemplate
    .replace(/\{products\}/g, profile.products.join(', '))
    .replace(/\{pricingModel\}/g, profile.pricingModel);
  const { intent, rule, regex, matchedKeywords } = detectVisitorIntent(message);
  const expectedPricing = ['pricing', 'comparison'].includes(profile.visitorIntent);
  const predictedPricing = intent === 'Pricing';
  const isFailing = failingUrls.has(profile.url);
  return {
    url: profile.url,
    industry: profile.industry,
    pageType: profile.pageType,
    journeyStage: profile.journeyStage,
    harnessIntent: profile.visitorIntent,
    expectedPricing,
    predictedPricing,
    isFailing,
    message,
    intent,
    rule,
    regex,
    matchedKeywords,
  };
});

const failingCases = cases.filter((c) => c.isFailing);
const expectedPositive = cases.filter((c) => c.expectedPricing);
const predictedPositive = cases.filter((c) => c.predictedPricing);
const tp = expectedPositive.filter((c) => c.predictedPricing).length;
const fp = predictedPositive.filter((c) => !c.expectedPricing).length;
const fn = expectedPositive.filter((c) => !c.predictedPricing).length;
const tn = cases.length - tp - fp - fn;
const precision = tp / (tp + fp) || 0;
const recall = tp / (tp + fn) || 0;

const triggerStats = {};
for (const term of ['pricing', 'price', 'cost', 'plans', 'tiers']) {
  const termCases = cases.filter((c) => c.message.toLowerCase().includes(term));
  const tpTerm = termCases.filter((c) => c.expectedPricing && c.predictedPricing).length;
  const fpTerm = termCases.filter((c) => !c.expectedPricing && c.predictedPricing).length;
  const fnTerm = expectedPositive.filter((c) => !c.message.toLowerCase().includes(term)).length;
  triggerStats[term] = {
    tp: tpTerm,
    fp: fpTerm,
    fn: fnTerm,
    precision: tpTerm / (tpTerm + fpTerm) || 0,
    recall: tpTerm / (tpTerm + fnTerm) || 0,
    failCount: failingCases.filter((c) => c.message.toLowerCase().includes(term)).length,
  };
}

const ranked = Object.entries(triggerStats)
  .map(([term, stats]) => ({ term, ...stats }))
  .sort((a, b) => b.tp - a.tp || a.fp - b.fp || b.precision - a.precision);

const report = {
  overall: { totalCases: cases.length, failingCases: failingCases.length, tp, fp, fn, tn, precision, recall },
  failingCases: failingCases.map((c) => ({
    url: c.url,
    industry: c.industry,
    pageType: c.pageType,
    journeyStage: c.journeyStage,
    harnessIntent: c.harnessIntent,
    message: c.message,
    rule: c.rule,
    regex: c.regex,
    matchedKeywords: c.matchedKeywords,
    triggerPath: c.predictedPricing ? 'Pricing regex matched -> intent = Pricing -> pricingInterest = true' : 'No pricing trigger',
  })),
  triggerStats,
  ranked,
};

fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
