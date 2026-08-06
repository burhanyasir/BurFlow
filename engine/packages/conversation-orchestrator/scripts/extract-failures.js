const fs = require('fs');
const p = 'packages/conversation-orchestrator/SALES_CONVERSION_REAL_WORLD_BENCHMARK.md';
const s = fs.readFileSync(p, 'utf8');
const blocks = s.split('\n### ');
const target = 'Expected next step: continue_education, actual: review_pricing';
const out = [];
for (const b of blocks) {
  if (b.includes(target)) {
    const lines = b.split('\n').map(l => l.trim());
    const header = lines[0] || '';
    const obj = {
      header,
      URL: null,
      industry: null,
      pageType: null,
      funnelStage: null,
      persona: 'N/A',
      companySize: 'N/A',
      budget: 'N/A',
      visitorIntent: 'N/A',
      conversationReadiness: 'N/A',
      pricingReadiness: 'N/A',
      qualificationState: 'N/A',
      ctaChosen: null,
      nextStepChosen: null,
      expectedNextStep: null,
      expectedCTA: null,
      failureCategories: null,
      raw: b
    };
    for (const L of lines) {
      if (L.startsWith('- URL:')) obj.URL = L.replace('- URL:', '').trim();
      if (L.startsWith('- Failure categories:')) obj.failureCategories = L.replace('- Failure categories:', '').trim();
      if (L.startsWith('- Expected plan:')) {
        const m = L.replace('- Expected plan:', '').trim().split(', actual:');
        obj.expectedPlan = m[0].trim();
        obj.actualPlan = (m[1] || '').trim();
      }
      if (L.startsWith('- Expected next step:')) {
        const m = L.replace('- Expected next step:', '').trim().split(', actual:');
        obj.expectedNextStep = m[0].trim();
        obj.nextStepChosen = (m[1] || '').trim();
      }
      if (L.startsWith('- Expected CTA:')) {
        const m = L.replace('- Expected CTA:', '').trim().split(', actual:');
        obj.expectedCTA = m[0].trim();
        obj.ctaChosen = (m[1] || '').trim();
      }
      if (L.startsWith('- Expected qualification timing:')) {
        obj.qualificationState = L.replace('- Expected qualification timing:', '').trim();
      }
      if (L.startsWith('- Expected trust signal usage:')) {
        obj.trustSignalUsage = L.replace('- Expected trust signal usage:', '').trim();
      }
    }
    const hd = header.split('—');
    if (hd.length > 1) {
      const parts = hd[1].split('/').map(x => x.trim());
      obj.industry = parts[0] || null;
      obj.pageType = parts[1] || null;
      obj.funnelStage = parts[2] || null;
      obj.visitorIntent = obj.pageType || 'N/A';
    }
    out.push(obj);
  }
}
fs.writeFileSync('packages/conversation-orchestrator/tmp-failing-cases.json', JSON.stringify(out, null, 2));
console.log('extracted', out.length, 'cases to packages/conversation-orchestrator/tmp-failing-cases.json');
