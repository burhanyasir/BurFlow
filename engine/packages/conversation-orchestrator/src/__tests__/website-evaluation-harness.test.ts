import { inferBusinessProfileFromContent, scoreWebsiteEvaluation } from '../website-evaluation-harness';

describe('website evaluation harness', () => {
  it('derives pricing and service signals from SaaS content', () => {
    const profile = inferBusinessProfileFromContent(
      'Our SaaS platform starts at $49 per month and includes onboarding, analytics, and support for growing teams.',
      'SaaS',
    );

    expect(profile.industry).toBe('SaaS');
    expect(profile.products).toEqual(expect.arrayContaining(['analytics', 'onboarding']));
    expect(profile.pricingModel).toContain('$49');
    expect(profile.services).toEqual(expect.arrayContaining(['support']));
  });

  it('scores a strong pricing page highly', () => {
    const result = scoreWebsiteEvaluation({
      title: 'Pricing',
      url: 'https://example.com/pricing',
      industry: 'SaaS',
      expectedIntent: 'Pricing',
      pageText: 'Pricing starts at $49 per month for the starter plan and includes support, analytics, and enterprise add-ons.',
      pageTitle: 'Pricing',
    });

    expect(result.pricingScore).toBeGreaterThan(0.7);
    expect(result.overallScore).toBeGreaterThan(7.5);
    expect(result.summary).toContain('pricing');
  });
});
