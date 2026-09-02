import { describe, expect, it } from 'vitest';
import {
  buildBusinessGreeting,
  buildBusinessProfileFromWidgetConfig,
  buildRecommendationCardFromMessage,
  buildSourceAttribution,
  buildTrustNote,
  buildUnknownResponseGuide,
  buildContinuityCue,
  deriveSuggestedActions,
} from '../chat-ui';

describe('deriveSuggestedActions', () => {
  it('returns pricing-oriented actions for pricing questions', () => {
    const actions = deriveSuggestedActions('I want to compare pricing and plans', []);
    expect(actions.some((action) => action.label === 'Compare Plans')).toBe(true);
    expect(actions.some((action) => action.label === 'Book 15-Min Demo')).toBe(true);
  });

  it('offers a stronger demo CTA for demo-intent messages', () => {
    const actions = deriveSuggestedActions('I want to book a demo for my team', []);
    expect(actions.some((action) => action.label === 'Book 15-Min Demo')).toBe(true);
    expect(actions.some((action) => action.label === 'Compare Plans')).toBe(true);
  });

  it('builds a premium recommendation card for pricing and demo intent', () => {
    const card = buildRecommendationCardFromMessage('I want to compare plans and book a demo');
    expect(card?.type).toBe('product_recommendation');
    expect(card?.title.toLowerCase()).toContain('plan');
    expect(card?.benefits.length).toBeGreaterThanOrEqual(3);
    expect(card?.primaryCta.label).toBe('Book Demo');
  });

  it('builds a concise greeting', () => {
    const greeting = buildBusinessGreeting({ companyName: 'Northstar Labs', industry: 'SaaS', businessType: 'saas', products: ['AI onboarding', 'Revenue analytics'] });
    expect(greeting).toBeTruthy();
  });

  it('maps snake_case business_profile keys (as stored in the DB) to camelCase', () => {
    const profile = buildBusinessProfileFromWidgetConfig({
      companyName: 'MTH Medical Store',
      businessProfile: {
        business_type: 'ecommerce',
        company_name: 'MTH Medical Store',
        pricing_model: 'per-order',
        target_audience: ['shoppers'],
      } as unknown as Record<string, unknown>,
    });
    expect(profile.businessType).toBe('ecommerce');
    expect(profile.companyName).toBe('MTH Medical Store');
    expect(profile.pricingModel).toBe('per-order');
    expect(profile.targetAudience).toEqual(['shoppers']);
  });

  it('derives a sales-oriented profile from widget config and suggested actions', () => {
    const profile = buildBusinessProfileFromWidgetConfig({
      companyName: 'Northstar Labs',
      title: 'Northstar Labs Sales Agent',
      subtitle: 'AI website sales assistant',
      greeting: 'Hi! I can help you compare products and book a demo.',
      suggestedActions: [
        { id: 'pricing', label: 'Compare Plans', action: 'send_text', payload: 'Compare plans and pricing' },
        { id: 'demo', label: 'Book Demo', action: 'send_text', payload: 'I want to book a demo' },
      ],
    });
    expect(profile.companyName).toBe('Northstar Labs');
    expect(profile.industry).toBe('SaaS');
    expect(profile.products).toContain('product guidance');
    expect(profile.trustSignals).toContain('website-guided guidance');
    expect(profile.valuePropositions).toContain('clear next steps');
  });

  it('uses a persisted business profile when available', () => {
    const profile = buildBusinessProfileFromWidgetConfig({
      greeting: 'Hi! I can help you compare products and book a demo.',
      businessProfile: {
        companyName: 'Northstar Labs',
        industry: 'SaaS',
        businessType: 'saas',
        products: ['AI onboarding'],
        services: ['Implementation support'],
        pricingModel: 'annual plans',
        valuePropositions: ['Fast deployment'],
        targetAudience: ['ops leaders'],
        trustSignals: ['SOC 2 ready'],
        faqs: ['How long does setup take?'],
        contactDetails: ['hello@northstar.com'],
      } as any,
    });
    expect(profile.companyName).toBe('Northstar Labs');
    expect(profile.industry).toBe('SaaS');
    expect(profile.products).toContain('AI onboarding');
    expect(profile.valuePropositions).toContain('Fast deployment');
  });

  it('returns a concise greeting regardless of profile depth', () => {
    const greeting = buildBusinessGreeting({
      companyName: 'Northstar Labs',
      industry: 'SaaS',
      businessType: 'saas',
      products: ['AI onboarding'],
      faqs: ['How long does setup take?'],
      contactDetails: ['hello@northstar.com'],
    });
    expect(greeting).toBeTruthy();
  });

  it('builds a faq-oriented recommendation card from the website context', () => {
    const card = buildRecommendationCardFromMessage('What are the most common questions?', {
      companyName: 'Northstar Labs',
      faqs: ['How long does setup take?'],
      contactDetails: ['hello@northstar.com'],
      trustSignals: ['SOC 2 ready'],
    });
    expect(card?.type).toBe('service_recommendation');
    expect(card?.title.toLowerCase()).toContain('faq');
    expect(card?.groundingNote?.toLowerCase()).toContain('faq');
  });

  it('builds a product-oriented recommendation card for product questions', () => {
    const card = buildRecommendationCardFromMessage('What products do you offer?', {
      companyName: 'Northstar Labs',
      products: ['AI onboarding', 'Revenue analytics'],
      valuePropositions: ['Fast deployment'],
      trustSignals: ['SOC 2 ready'],
    });
    expect(card?.type).toBe('service_recommendation');
    expect(card?.title.toLowerCase()).toContain('product');
    expect(card?.primaryCta.label).toBe('Book Demo');
  });

  it('adds source attribution for scanned-page content', () => {
    const source = buildSourceAttribution('pricing', { sourceUrls: { pricing: 'https://example.com/pricing' } });
    expect(source?.label).toBe('📄 Pricing');
    expect(source?.url).toBe('https://example.com/pricing');
  });

  it('uses confidence-based phrasing for trust-sensitive answers', () => {
    const note = buildTrustNote('pricing', 0.83);
    expect(note).toContain('According to the pricing page');
  });

  it('offers a safe fallback when information is not confidently available', () => {
    const guide = buildUnknownResponseGuide('faq', 0.22);
    expect(guide).toContain('couldn\'t confidently determine');
    expect(guide).toContain('Contact Sales');
  });

  it('creates a natural continuity cue from earlier questions', () => {
    const cue = buildContinuityCue([{ role: 'user', content: 'What about pricing?' } as any], 'Can you tell me about services?');
    expect(cue).toContain('pricing');
  });

  it('adapts greetings, recommendations, and CTAs across major industries', () => {
    const cases = [
      {
        name: 'SaaS',
        profile: { companyName: 'Northstar Labs', industry: 'SaaS', businessType: 'saas', products: ['AI onboarding'], pricingModel: 'annual plans', valuePropositions: ['Fast deployment'], targetAudience: ['ops leaders'], faqs: ['How long does setup take?'], contactDetails: ['hello@northstar.com'], trustSignals: ['SOC 2 ready'], sourceUrls: { pricing: 'https://northstar.example/pricing' } },
        expectedGreeting: 'brings you here',
        expectedCardTitle: 'best-fit plan',
        expectedCta: 'Book Demo',
      },
      {
        name: 'E-commerce',
        profile: { companyName: 'BrightCart', industry: 'E-commerce', businessType: 'retail', products: ['Commerce platform'], pricingModel: 'tiered pricing', valuePropositions: ['Faster conversion'], targetAudience: ['store owners'], faqs: ['Do you support returns?'], contactDetails: ['sales@brightcart.com'], trustSignals: ['Trusted by merchants'], sourceUrls: { services: 'https://brightcart.example/services' } },
        expectedGreeting: 'brings you here',
        expectedCardTitle: 'faq',
        expectedCta: 'Contact Sales',
      },
      {
        name: 'Healthcare',
        profile: { companyName: 'CareBridge', industry: 'Healthcare', businessType: 'care', products: ['Patient support'], pricingModel: 'custom quotes', valuePropositions: ['Compliance-ready workflows'], targetAudience: ['care teams'], faqs: ['Is it HIPAA ready?'], contactDetails: ['support@carebridge.com'], trustSignals: ['HIPAA aware'], sourceUrls: { about: 'https://carebridge.example/about' } },
        expectedGreeting: 'brings you here',
        expectedCardTitle: 'about',
        expectedCta: 'Contact Sales',
      },
      {
        name: 'Law Firm',
        profile: { companyName: 'Harbor Legal', industry: 'Law Firm', businessType: 'legal', products: ['Case management'], pricingModel: 'custom plans', valuePropositions: ['Secure collaboration'], targetAudience: ['law firms'], faqs: ['What about onboarding?'], contactDetails: ['hello@harborlegal.com'], trustSignals: ['Confidential handling'], sourceUrls: { faq: 'https://harborlegal.example/faq' } },
        expectedGreeting: 'brings you here',
        expectedCardTitle: 'faq',
        expectedCta: 'Contact Sales',
      },
      {
        name: 'Restaurant',
        profile: { companyName: 'Maple Table', industry: 'Restaurant', businessType: 'hospitality', products: ['Reservation tools'], pricingModel: 'monthly subscription', valuePropositions: ['Smarter reservations'], targetAudience: ['restaurant owners'], faqs: ['Can I add multiple locations?'], contactDetails: ['team@mapletable.com'], trustSignals: ['Used by local restaurants'], sourceUrls: { pricing: 'https://mapletable.example/pricing' } },
        expectedGreeting: 'maple table',
        expectedCardTitle: 'plan',
        expectedCta: 'Book Demo',
      },
      {
        name: 'Real Estate',
        profile: { companyName: 'Northline Realty', industry: 'Real Estate', businessType: 'real estate', products: ['Listing automation'], pricingModel: 'flexible tiers', valuePropositions: ['Faster follow-up'], targetAudience: ['agents'], faqs: ['Do you support MLS?'], contactDetails: ['agents@northline.com'], trustSignals: ['Built for brokers'], sourceUrls: { about: 'https://northline.example/about' } },
        expectedGreeting: 'brings you here',
        expectedCardTitle: 'about',
        expectedCta: 'Contact Sales',
      },
    ];

    cases.forEach(({ name, profile, expectedGreeting, expectedCardTitle, expectedCta }) => {
      const greeting = buildBusinessGreeting(profile);
      const card = buildRecommendationCardFromMessage(expectedCardTitle === 'about' ? 'Tell me about the company' : expectedCardTitle === 'faq' ? 'What are the most common questions?' : 'I want to compare pricing and plans', profile);
      const source = buildSourceAttribution(expectedCardTitle === 'about' ? 'about' : expectedCardTitle === 'faq' ? 'faq' : 'pricing', profile);
      expect(greeting.toLowerCase()).toContain(expectedGreeting);
      expect(card?.title.toLowerCase()).toContain(expectedCardTitle);
      expect(card?.primaryCta.label).toBe(expectedCta);
      expect(source?.label).toBeTruthy();
    });
  });

  it('avoids repeating previously shown actions', () => {
    const actions = deriveSuggestedActions('Tell me about your services', [
      { id: 'services', label: 'Services', action: 'send_text', payload: 'Tell me about your services' },
    ]);
    expect(actions.some((action) => action.label === 'Services')).toBe(false);
  });
});
