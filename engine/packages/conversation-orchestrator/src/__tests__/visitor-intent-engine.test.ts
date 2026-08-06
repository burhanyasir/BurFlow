import { describe, it, expect } from 'vitest';
import { detectVisitorIntent, VisitorIntentEngineInput } from '../visitor-intent-engine';

function makeInput(overrides: Partial<VisitorIntentEngineInput> = {}): VisitorIntentEngineInput {
  return {
    landingPage: 'https://burflow.example/',
    currentUrl: 'https://burflow.example/pricing',
    referrer: 'https://www.google.com/search?q=ai+website+sales+agent',
    pageContent: 'AI website sales agent for agencies and SaaS teams. View pricing and book a demo.',
    userQuestion: 'How much does the starter plan cost?',
    businessProfile: {
      businessType: 'saas',
      industry: 'SaaS',
      products: ['BurFlow AI Sales Agent'],
      services: ['Website scanning', 'Sales automation'],
      policies: [],
      goals: ['Increase conversion'],
      brandTone: 'professional',
      supportedCTAs: ['book_demo', 'pricing', 'contact_sales'],
    },
    knowledgeEngineFacts: ['Pricing starts at $29/month', 'Product includes website scanning'],
    ...overrides,
  };
}

describe('VisitorIntentEngine', () => {
  it('detects pricing intent from URL, page content, and user question', () => {
    const result = detectVisitorIntent(makeInput());

    expect(result.primaryIntent).toBe('Pricing');
    expect(result.secondaryIntent).toMatch(/Product Research|General Information/);
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    expect(result.supportingEvidence.length).toBeGreaterThan(0);
    expect(result.recommendedNextAction).toMatch(/pricing|quote|demo/i);
  });

  it('detects buying intent when the visitor expresses purchase readiness', () => {
    const result = detectVisitorIntent(makeInput({
      userQuestion: 'I am ready to buy the professional plan today',
      currentUrl: 'https://burflow.example/checkout',
      pageContent: 'Starter, Professional and Enterprise plans',
    }));

    expect(result.primaryIntent).toBe('Buying');
    expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    expect(result.supportingEvidence.some(e => /ready to buy|professional plan|checkout/i.test(e))).toBe(true);
    expect(result.recommendedNextAction).toMatch(/book|quote|contact/i);
  });

  it('detects product research intent from product page exploration', () => {
    const result = detectVisitorIntent(makeInput({
      userQuestion: 'What does the AI website sales agent do?',
      currentUrl: 'https://burflow.example/product',
      pageContent: 'BurFlow AI Website Sales Agent scans a website and helps qualify and convert visitors.',
      knowledgeEngineFacts: ['Website scanner ingests content', 'Conversation engine qualifies visitors'],
    }));

    expect(result.primaryIntent).toBe('Product Research');
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    expect(result.supportingEvidence.some(e => /product|agent|website sales/i.test(e))).toBe(true);
    expect(result.recommendedNextAction).toMatch(/compare|demo|pricing/i);
  });

  it('detects support intent from help and troubleshooting cues', () => {
    const result = detectVisitorIntent(makeInput({
      userQuestion: 'I need help troubleshooting the setup',
      currentUrl: 'https://burflow.example/support',
      pageContent: 'Troubleshooting guide and documentation for onboarding.',
    }));

    expect(result.primaryIntent).toBe('Support');
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    expect(result.supportingEvidence.some(e => /support|help|troubleshooting/i.test(e))).toBe(true);
    expect(result.recommendedNextAction).toMatch(/support|docs|contact/i);
  });

  it('detects comparison intent from competitive or plan comparison wording', () => {
    const result = detectVisitorIntent(makeInput({
      userQuestion: 'How is this different from the starter plan and the enterprise plan?',
      currentUrl: 'https://burflow.example/compare',
      pageContent: 'Compare pricing plans and choose the right fit.',
    }));

    expect(result.primaryIntent).toBe('Comparison');
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    expect(result.supportingEvidence.some(e => /compare|starter|enterprise/i.test(e))).toBe(true);
    expect(result.recommendedNextAction).toMatch(/compare|pricing|demo/i);
  });

  it('detects booking intent from schedule or call requests', () => {
    const result = detectVisitorIntent(makeInput({
      userQuestion: 'Can we book a demo for next week?',
      currentUrl: 'https://burflow.example/demo',
      pageContent: 'Schedule a walkthrough with our sales team.',
    }));

    expect(result.primaryIntent).toBe('Booking');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.supportingEvidence.some(e => /book|demo|schedule/i.test(e))).toBe(true);
    expect(result.recommendedNextAction).toMatch(/book|demo|schedule/i);
  });

  it('detects contact intent from direct contact requests', () => {
    const result = detectVisitorIntent(makeInput({
      userQuestion: 'Can someone contact me?',
      currentUrl: 'https://burflow.example/contact',
      pageContent: 'Reach out to our team.',
    }));

    expect(result.primaryIntent).toBe('Contact');
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    expect(result.supportingEvidence.some(e => /contact|reach out|team/i.test(e))).toBe(true);
    expect(result.recommendedNextAction).toMatch(/contact|sales|form/i);
  });

  it('detects careers intent from jobs and hiring language', () => {
    const result = detectVisitorIntent(makeInput({
      userQuestion: 'Are there open roles on the AI team?',
      currentUrl: 'https://burflow.example/careers',
      pageContent: 'Join our engineering and customer success teams.',
    }));

    expect(result.primaryIntent).toBe('Careers');
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    expect(result.supportingEvidence.some(e => /career|jobs|hiring|roles/i.test(e))).toBe(true);
    expect(result.recommendedNextAction).toMatch(/careers|jobs|contact/i);
  });

  it('treats service-led pages as product research rather than general information', () => {
    const result = detectVisitorIntent(makeInput({
      userQuestion: '',
      currentUrl: 'https://burflow.example/services',
      pageContent: 'About our agency. We design growth strategies, digital products, and customer experiences for ambitious teams. Explore our services, industries, and case studies.',
      knowledgeEngineFacts: ['Service-led offerings'],
    }));

    expect(result.primaryIntent).toBe('Product Research');
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('falls back to general information when signals are weak and non-commercial', () => {
    const result = detectVisitorIntent(makeInput({
      userQuestion: 'What is BurFlow?',
      currentUrl: 'https://burflow.example/',
      pageContent: 'BurFlow is an AI website sales agent.',
      knowledgeEngineFacts: ['BurFlow helps convert website visitors'],
    }));

    expect(result.primaryIntent).toBe('General Information');
    expect(result.confidence).toBeGreaterThanOrEqual(0.4);
    expect(result.supportingEvidence.length).toBeGreaterThan(0);
    expect(result.recommendedNextAction).toMatch(/learn|explore|pricing|demo/i);
  });

  it('treats education admissions as buying intent', () => {
    const result = detectVisitorIntent(makeInput({
      userQuestion: '',
      currentUrl: 'https://burflow.example/admissions',
      pageContent: 'Apply now for admission to our program. Review tuition and scholarship options.',
      businessProfile: {
        businessType: 'education',
        industry: 'Education',
      },
    }));

    expect(result.primaryIntent).toBe('Buying');
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('treats nonprofit donation pages as buying intent', () => {
    const result = detectVisitorIntent(makeInput({
      userQuestion: '',
      currentUrl: 'https://burflow.example/donate',
      pageContent: 'Please donate to support our mission and help families in need.',
      businessProfile: {
        businessType: 'nonprofit',
        industry: 'Nonprofits',
      },
    }));

    expect(result.primaryIntent).toBe('Buying');
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('uses ecommerce context to treat product-led homepages as product research', () => {
    const result = detectVisitorIntent(makeInput({
      userQuestion: '',
      currentUrl: 'https://burflow.example/',
      pageContent: 'Shop the latest products, collections, and deals from our store.',
      businessProfile: {
        businessType: 'ecommerce',
        industry: 'Ecommerce',
      },
    }));

    expect(result.primaryIntent).toBe('Product Research');
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('uses healthcare homepage context to prefer general information for broad health sites', () => {
    const result = detectVisitorIntent(makeInput({
      userQuestion: '',
      currentUrl: 'https://healthcare.example/',
      pageContent: 'Expert care, patient resources, and health information for your family. Find locations, providers, and support services.',
      businessProfile: {
        businessType: 'healthcare',
        industry: 'Healthcare',
      },
    }));

    expect(result.primaryIntent).toBe('General Information');
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('uses healthcare product pages to treat clinical information as product research rather than booking', () => {
    const result = detectVisitorIntent(makeInput({
      userQuestion: '',
      currentUrl: 'https://healthcare.example/tests-procedures',
      pageContent: 'Learn about medical tests and procedures, symptoms, and preparation. Request an appointment when you are ready.',
      pageType: 'product',
      businessProfile: {
        businessType: 'healthcare',
        industry: 'Healthcare',
      },
    }));

    expect(result.primaryIntent).toBe('Product Research');
    expect(result.secondaryIntent).toBe('Booking');
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('uses healthcare location and contact pages to prefer contact intent and avoid booking', () => {
    const result = detectVisitorIntent(makeInput({
      userQuestion: '',
      currentUrl: 'https://healthcare.example/locations',
      pageContent: 'Find a location near you, directions, phone numbers, and hours. Contact our clinic for more details.',
      pageType: 'contact',
      businessProfile: {
        businessType: 'healthcare',
        industry: 'Healthcare',
      },
    }));

    expect(result.primaryIntent).toBe('Contact');
    expect(result.secondaryIntent).not.toBe('Booking');
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('uses industry context to treat healthcare appointments as buying-oriented intent', () => {
    const result = detectVisitorIntent(makeInput({
      userQuestion: 'I need to book an appointment for a consultation',
      currentUrl: 'https://burflow.example/appointment',
      pageContent: 'Book an appointment with our clinic for a consultation and insurance review.',
      businessProfile: {
        businessType: 'healthcare',
        industry: 'Healthcare',
        products: ['Consultation'],
        services: ['Appointments'],
        policies: [],
        goals: ['Increase appointments'],
        brandTone: 'professional',
        supportedCTAs: ['book_appointment', 'contact'],
      },
      knowledgeEngineFacts: ['Appointment booking', 'Insurance coverage questions'],
    }));

    expect(result.primaryIntent).toBe('Buying');
    expect(result.intentDistribution.Buying).toBeGreaterThan(result.intentDistribution['General Information']);
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('uses manufacturing page signals to prefer product research and contact on industrial websites', () => {
    const result = detectVisitorIntent(makeInput({
      userQuestion: '',
      currentUrl: 'https://burflow.example/industrial-machinery',
      pageContent: 'Explore our manufacturing equipment, industrial systems, and engineered solutions. Request a quote for precision machining and automation.',
      businessProfile: {
        businessType: 'manufacturing',
        industry: 'Industrial Manufacturing',
      },
    }));

    expect(result.primaryIntent).toBe('Product Research');
    expect(result.intentDistribution.Contact).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('uses construction about pages to prefer general information on contractor websites', () => {
    const result = detectVisitorIntent(makeInput({
      userQuestion: '',
      currentUrl: 'https://burflow.example/about-us',
      pageContent: 'Our construction firm delivers commercial and residential projects. Learn about our history, values, and leadership team.',
      pageType: 'about',
      businessProfile: {
        businessType: 'construction',
        industry: 'Construction Services',
      },
    }));

    expect(result.primaryIntent).toBe('General Information');
    expect(result.intentDistribution['Product Research']).toBeLessThan(result.intentDistribution['General Information']);
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('returns an intent distribution instead of a single-score decision', () => {
    const result = detectVisitorIntent(makeInput({
      userQuestion: 'I want to compare pricing and see what features are included',
      currentUrl: 'https://burflow.example/product',
      pageContent: 'Compare our plans, features, and pricing before you sign up.',
    }));

    expect(result.intentDistribution).toBeDefined();
    expect(result.intentDistribution.Pricing).toBeGreaterThan(0);
    expect(result.intentDistribution['Product Research']).toBeGreaterThan(0);
    expect(result.intentDistribution.Buying).toBeGreaterThanOrEqual(0);
  });
});
