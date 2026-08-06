import { buildSalesPlaybook } from '../sales-playbook-engine';

describe('sales playbook architecture decoupling', () => {
  const pricingReadyEducationInput = {
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
    knowledgeEngine: {
      facts: ['implementation timeline', 'decision committee'],
    },
  } as const;

  it('changes to PricingInterest do not automatically change CTA when pricing eligibility remains the same', () => {
    const pricingIntent = buildSalesPlaybook({
      visitorIntent: { primaryIntent: 'Pricing', confidence: 0.92 },
      conversationStage: 'consideration',
      ...pricingReadyEducationInput,
    });

    const comparisonIntent = buildSalesPlaybook({
      visitorIntent: { primaryIntent: 'Comparison', confidence: 0.86 },
      conversationStage: 'consideration',
      ...pricingReadyEducationInput,
    });

    expect(pricingIntent.readiness.stage).toBe(comparisonIntent.readiness.stage);
    expect(pricingIntent.cta.id).toBe(comparisonIntent.cta.id);
    expect(pricingIntent.nextStep).toBe(comparisonIntent.nextStep);
  });

  it('changes to PricingInterest do not automatically change FunnelStage when signal context is constant', () => {
    const pricingIntent = buildSalesPlaybook({
      visitorIntent: { primaryIntent: 'Pricing', confidence: 0.9 },
      conversationStage: 'consideration',
      ...pricingReadyEducationInput,
    });

    const comparisonIntent = buildSalesPlaybook({
      visitorIntent: { primaryIntent: 'Comparison', confidence: 0.85 },
      conversationStage: 'consideration',
      ...pricingReadyEducationInput,
    });

    expect(pricingIntent.readiness.stage).toBe(comparisonIntent.readiness.stage);
    expect(pricingIntent.cta.id).toBe(comparisonIntent.cta.id);
    expect(pricingIntent.nextStep).toBe(comparisonIntent.nextStep);
  });

  it('keeps PricingReviewEligible independent from FunnelStage when Sales signals dominate', () => {
    const strategy = buildSalesPlaybook({
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
      knowledgeEngine: {
        facts: ['pricing comparisons', 'service tiers'],
      },
    });

    expect(strategy.readiness.pricingReady).toBe(true);
    expect(strategy.readiness.stage).toBe('Sales');
    expect(strategy.nextStep).toBe('contact_sales');
  });

  it('can produce the same nextStep with different CTA selections', () => {
    const researchContact = buildSalesPlaybook({
      visitorIntent: { primaryIntent: 'General Information', confidence: 0.6 },
      conversationStage: 'awareness',
      businessIntelligence: {
        industry: 'Healthcare',
        businessType: 'healthcare',
        trustSignals: ['HIPAA compliant'],
      },
      websiteScanner: {
        pageType: 'product',
        pageSummary: 'Researching clinical workflow solutions and compliance requirements.',
        extractedSignals: ['research'],
      },
      knowledgeEngine: {
        facts: ['privacy controls', 'security certifications'],
      },
    });

    const researchDemo = buildSalesPlaybook({
      visitorIntent: { primaryIntent: 'General Information', confidence: 0.6 },
      conversationStage: 'awareness',
      businessIntelligence: {
        industry: 'SaaS',
        businessType: 'saas',
        trustSignals: ['product-led growth'],
      },
      websiteScanner: {
        pageType: 'product',
        pageSummary: 'Researching product capabilities and asking for a short demo.',
        extractedSignals: ['research', 'demo'],
      },
      knowledgeEngine: {
        facts: ['API integration', 'fast onboarding'],
      },
    });

    expect(researchContact.nextStep).toBe('continue_education');
    expect(researchDemo.nextStep).toBe('continue_education');
    expect(researchContact.cta.id).not.toBe(researchDemo.cta.id);
  });
});
