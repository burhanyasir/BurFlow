const { buildSalesPlaybook } = require('./packages/conversation-orchestrator/src/sales-playbook-engine.ts');
const input = {
  businessIntelligence: {
    industry: 'SaaS',
    businessType: 'saas',
    pricingModel: '$199 per month',
    trustSignals: ['case studies', 'customer testimonials'],
  },
  websiteScanner: {
    pageType: 'pricing',
    pageSummary: 'Pricing page with detailed plan comparisons and cost breakdown.',
    extractedSignals: ['pricing', 'plans'],
  },
  knowledgeEngine: {
    facts: ['pricing comparisons', 'service tiers'],
  },
};
const cases = [
  { intent: 'Pricing', label: 'pricing' },
  { intent: 'Comparison', label: 'comparison' },
  { intent: 'General Information', label: 'general' },
];
for (const c of cases) {
  const result = buildSalesPlaybook({ visitorIntent: { primaryIntent: c.intent, confidence: 0.92 }, conversationStage: 'decision', ...input });
  console.log(c.label, JSON.stringify({ stage: result.readiness.stage, cta: result.cta.id, nextStep: result.nextStep, pricingReady: result.readiness.pricingReady }, null, 2));
}
