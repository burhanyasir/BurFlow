const { buildSalesPlaybook } = require('./packages/conversation-orchestrator/src/sales-playbook-engine.ts');
const cases = [
  {
    name: 'pricing with decision pricing page',
    input: {
      visitorIntent: { primaryIntent: 'Pricing', confidence: 0.92 },
      conversationStage: 'decision',
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
      knowledgeEngine: { facts: ['pricing comparisons', 'service tiers'] },
    },
  },
  {
    name: 'comparison with decision pricing page',
    input: {
      visitorIntent: { primaryIntent: 'Comparison', confidence: 0.86 },
      conversationStage: 'decision',
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
      knowledgeEngine: { facts: ['pricing comparisons', 'service tiers'] },
    },
  },
  {
    name: 'pricing with consideration pricing page',
    input: {
      visitorIntent: { primaryIntent: 'Pricing', confidence: 0.84 },
      conversationStage: 'consideration',
      businessIntelligence: {
        industry: 'Professional services',
        businessType: 'consulting',
        pricingModel: '$1500 estimate',
        trustSignals: ['expert advisors'],
      },
      websiteScanner: {
        pageType: 'pricing',
        pageSummary: 'Comparing pricing tiers and requesting a demo for the enterprise package.',
        extractedSignals: ['pricing', 'demo'],
      },
      knowledgeEngine: { facts: ['implementation timeline', 'decision committee'] },
    },
  },
  {
    name: 'comparison with consideration pricing page',
    input: {
      visitorIntent: { primaryIntent: 'Comparison', confidence: 0.84 },
      conversationStage: 'consideration',
      businessIntelligence: {
        industry: 'Professional services',
        businessType: 'consulting',
        pricingModel: '$1500 estimate',
        trustSignals: ['expert advisors'],
      },
      websiteScanner: {
        pageType: 'pricing',
        pageSummary: 'Comparing pricing tiers and requesting a demo for the enterprise package.',
        extractedSignals: ['pricing', 'demo'],
      },
      knowledgeEngine: { facts: ['implementation timeline', 'decision committee'] },
    },
  },
  {
    name: 'pricing with decision product page',
    input: {
      visitorIntent: { primaryIntent: 'Pricing', confidence: 0.92 },
      conversationStage: 'decision',
      businessIntelligence: {
        industry: 'SaaS',
        businessType: 'saas',
        pricingModel: '$199 per month',
        trustSignals: ['case studies', 'customer testimonials'],
      },
      websiteScanner: {
        pageType: 'product',
        pageSummary: 'Product page with feature details and pricing mention.',
        extractedSignals: ['product', 'pricing'],
      },
      knowledgeEngine: { facts: ['pricing comparisons', 'service tiers'] },
    },
  },
];
for (const c of cases) {
  const result = buildSalesPlaybook(c.input);
  console.log(c.name);
  console.log(JSON.stringify({ stage: result.readiness.stage, cta: result.cta.id, nextStep: result.nextStep, pricingReady: result.readiness.pricingReady }, null, 2));
}
