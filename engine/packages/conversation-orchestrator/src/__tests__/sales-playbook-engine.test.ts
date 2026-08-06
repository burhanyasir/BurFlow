import { buildSalesPlaybook } from '../sales-playbook-engine';

describe('sales playbook engine', () => {
  it('recommends a pricing-first strategy for SaaS pricing pages', () => {
    const strategy = buildSalesPlaybook({
      visitorIntent: {
        primaryIntent: 'Pricing',
        confidence: 0.94,
        supportingEvidence: ['pricing page', 'plans'],
        recommendedNextAction: 'Compare plans',
      },
      businessIntelligence: {
        industry: 'SaaS',
        businessType: 'saas',
        pricingModel: '$49 per month',
        trustSignals: ['SOC 2', '4.9/5 reviews', '10 years in business'],
        products: ['CRM'],
      },
      websiteScanner: {
        pageType: 'pricing',
        pageSummary: 'Flexible pricing with starter, professional, and enterprise plans.',
        extractedSignals: ['pricing', 'demo', 'contact sales'],
      },
      knowledgeEngine: {
        facts: ['pricing plans', 'support included'],
      },
      conversationStage: 'pricing',
    });

    expect(strategy.pricingStrategy).toBe('recommend_plan');
    expect(strategy.cta.label).toContain('Compare Plans');
    expect(strategy.recommendationStrategy).toBe('compare_options');
    expect(strategy.trustSignals).toEqual(expect.arrayContaining(['SOC 2', '4.9/5 reviews']));
  });

  it('selects a trust-forward contact path for healthcare traffic', () => {
    const strategy = buildSalesPlaybook({
      visitorIntent: {
        primaryIntent: 'General Information',
        confidence: 0.82,
        supportingEvidence: ['clinic overview', 'contact info'],
        recommendedNextAction: 'Contact',
      },
      businessIntelligence: {
        industry: 'Healthcare',
        businessType: 'healthcare',
        trustSignals: ['HIPAA compliant', 'board-certified care team'],
      },
      websiteScanner: {
        pageType: 'contact',
        pageSummary: 'Contact page with appointment booking and location details.',
        extractedSignals: ['contact'],
      },
      knowledgeEngine: {
        facts: ['same-day appointments available'],
      },
      conversationStage: 'decision',
      planGoal: 'advance_funnel',
    });

    expect(strategy.pricingStrategy).toBe('request_contact');
    expect(strategy.cta.label).toContain('Contact Sales');
    expect(strategy.trustSignals).toEqual(expect.arrayContaining(['HIPAA compliant']));
    expect(strategy.industryTemplate).toBe('Healthcare');
  });

  it('prefers continue_education and contact-sales for broad research awareness cases', () => {
    const strategy = buildSalesPlaybook({
      visitorIntent: {
        primaryIntent: 'General Information',
        confidence: 0.55,
        supportingEvidence: ['industry overview'],
        recommendedNextAction: 'Learn more',
      },
      businessIntelligence: {
        industry: 'Professional services',
        businessType: 'consulting',
        pricingModel: 'service pricing',
        trustSignals: ['industry recognition', 'partner credentials'],
      },
      websiteScanner: {
        pageType: 'product',
        pageSummary: 'Exploring consulting services and expertise.',
        extractedSignals: ['research'],
      },
      knowledgeEngine: {
        facts: ['award-winning consultancy'],
      },
      conversationStage: 'awareness',
      planGoal: 'advance_funnel',
    });

    expect(strategy.nextStep).toBe('continue_education');
    expect(strategy.cta.id).toBe('contact-sales');
    expect(strategy.readiness.stage).toBe('Awareness');
  });

  it('does not advance to pricing when pricing readiness is absent during consideration', () => {
    const strategy = buildSalesPlaybook({
      visitorIntent: {
        primaryIntent: 'General Information',
        confidence: 0.55,
        supportingEvidence: ['comparing service offerings'],
        recommendedNextAction: 'Learn more',
      },
      businessIntelligence: {
        industry: 'Healthcare',
        businessType: 'healthcare',
        pricingModel: 'custom quote',
        trustSignals: ['HIPAA compliant', 'board-certified care team'],
      },
      websiteScanner: {
        pageType: 'product',
        pageSummary: 'Researching healthcare service providers and capabilities.',
        extractedSignals: ['service overview'],
      },
      knowledgeEngine: {
        facts: ['provider network', 'clinical outcomes'],
      },
      conversationStage: 'consideration',
      planGoal: 'advance_funnel',
    });

    expect(strategy.nextStep).toBe('continue_education');
    expect(strategy.cta.id).toBe('contact-sales');
    expect(strategy.pricingStrategy).toBe('summarize_pricing');
  });
});
