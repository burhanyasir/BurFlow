import { buildSalesPlaybook } from '../sales-playbook-engine';

describe('pricing gate regressions', () => {
  it('Explicit pricing page: decision stage with pricing intent -> pricingReady true and review allowed', () => {
    const strategy = buildSalesPlaybook({
      visitorIntent: { primaryIntent: 'Pricing', confidence: 0.9 },
      businessIntelligence: { industry: 'SaaS', pricingModel: '$999' },
      websiteScanner: { pageType: 'pricing', pageSummary: 'Plans and pricing tiers' },
      knowledgeEngine: { facts: [] },
      conversationStage: 'decision',
    });

    expect(strategy.readiness.pricingReady).toBe(true);
    expect(strategy.nextStep).not.toBe('continue_education');
    expect(['review_pricing', 'recommend_trial', 'schedule_demo', 'contact_sales']).toContain(strategy.nextStep);
  });

  it('Pricing page but research stage -> pricingReady false and continue_education preferred', () => {
    const strategy = buildSalesPlaybook({
      visitorIntent: { primaryIntent: 'General Information', confidence: 0.5 },
      businessIntelligence: { industry: 'SaaS' },
      websiteScanner: { pageType: 'pricing', pageSummary: 'Looking at pricing options for exploration' },
      knowledgeEngine: { facts: [] },
      conversationStage: 'awareness',
    });

    expect(strategy.readiness.pricingReady).toBe(false);
    expect(strategy.nextStep).toBe('continue_education');
    expect(strategy.cta.id).not.toBe('compare-plans');
  });

  it('Consultative enterprise buyer (no pricing signals) -> contact-sales and continue_education, no compare-plans', () => {
    const strategy = buildSalesPlaybook({
      visitorIntent: { primaryIntent: 'General Information', confidence: 0.6 },
      businessIntelligence: { industry: 'Healthcare', trustSignals: ['HIPAA'] },
      websiteScanner: { pageType: 'product', pageSummary: 'Exploring services and capabilities' },
      knowledgeEngine: { facts: [] },
      conversationStage: 'consideration',
    });

    expect(strategy.cta.id).toBe('contact-sales');
    expect(strategy.nextStep).toBe('continue_education');
    expect(strategy.cta.id).not.toBe('compare-plans');
  });

  it('Consultative buyer with explicit pricing intent -> pricingReady true and review_pricing allowed', () => {
    const strategy = buildSalesPlaybook({
      visitorIntent: { primaryIntent: 'Pricing', confidence: 0.92 },
      businessIntelligence: { industry: 'Healthcare', trustSignals: ['HIPAA', 'Board Certified'] },
      websiteScanner: { pageType: 'pricing', pageSummary: 'Pricing and plans; enterprise options' },
      knowledgeEngine: { facts: [] },
      conversationStage: 'decision',
    });

    expect(strategy.readiness.pricingReady).toBe(true);
    expect(strategy.nextStep).toBe('review_pricing');
    // CTA may be compare-plans or contact-sales depending on consultative score
    expect(['compare-plans', 'contact-sales']).toContain(strategy.cta.id);
  });

  it('Missing qualification -> ask_qualification before pricing', () => {
    const strategy = buildSalesPlaybook({
      visitorIntent: { primaryIntent: 'Pricing', confidence: 0.85 },
      businessIntelligence: { industry: 'SaaS' },
        websiteScanner: { pageType: 'product', pageSummary: 'Product overview, general information' },
      knowledgeEngine: { facts: [] },
      conversationStage: 'pricing',
    });

    expect(strategy.nextStep).toBe('ask_qualification');
  });

  it('Fully qualified buyer -> no ask_qualification and pricing flow continues', () => {
    const strategy = buildSalesPlaybook({
      visitorIntent: { primaryIntent: 'Pricing', confidence: 0.95 },
      businessIntelligence: { industry: 'SaaS', pricingModel: '$2000' },
      websiteScanner: { pageType: 'pricing', pageSummary: 'Pricing; decision maker involved; timeline: within 30 days' },
      knowledgeEngine: { facts: ['decision maker', 'within 30 days'] },
      conversationStage: 'decision',
    });

    expect(strategy.nextStep).not.toBe('ask_qualification');
    expect(['review_pricing', 'recommend_trial', 'schedule_demo', 'contact_sales']).toContain(strategy.nextStep);
  });
});
