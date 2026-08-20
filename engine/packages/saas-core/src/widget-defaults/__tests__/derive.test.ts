import { describe, it, expect } from 'vitest';
import { deriveWidgetDefaults, detectBusinessType, detectTopics, buildStarterOptions, buildSuggestedActions } from '../derive';

describe('detectBusinessType', () => {
  it('detects an e-commerce store', () => {
    const text = 'We sell headphones for $129 with free shipping. Our return policy is 30 days. Add to cart and checkout in minutes.';
    expect(detectBusinessType(text)).toBe('ecommerce');
  });

  it('detects a dental clinic', () => {
    const text = 'Routine cleaning and checkup for $95. We accept Delta Dental PPO insurance. Book an appointment with our hygienist.';
    expect(detectBusinessType(text)).toBe('healthcare');
  });

  it('detects a restaurant', () => {
    const text = 'Our menu features fresh pasta and wood-fired pizza. Make a reservation for dinner, or try our weekend brunch.';
    expect(detectBusinessType(text)).toBe('restaurant');
  });

  it('detects SaaS', () => {
    const text = 'Sign up for the platform and integrate via API. Pricing plans start at $49 per month with a 14-day free trial.';
    expect(detectBusinessType(text)).toBe('saas');
  });

  it('returns undefined for neutral content', () => {
    expect(detectBusinessType('Welcome to our website. Thanks for visiting.')).toBeUndefined();
  });
});

describe('detectTopics', () => {
  it('finds shipping, returns and pricing topics', () => {
    const topics = detectTopics('Orders ship within 24 hours. Returns are free within 30 days. Prices start at $49.');
    expect(topics).toContain('shipping');
    expect(topics).toContain('returns');
    expect(topics).toContain('pricing');
  });
});

describe('deriveWidgetDefaults', () => {
  it('derives e-commerce starters and actions from store content', () => {
    const chunks = [
      { content: 'Aurora Wireless Headphones — $129 with free shipping.', metadata: {} },
      { content: '30-day no-questions-asked return policy.', metadata: {} },
      { content: 'Orders placed before 3pm ship the same day.', metadata: {} },
    ];
    const derived = deriveWidgetDefaults(chunks);
    expect(derived.businessType).toBe('ecommerce');
    expect(derived.starterOptions.length).toBe(4);
    expect(derived.starterOptions).toContain('How fast is shipping?');
    expect(derived.starterOptions).toContain('What is your return policy?');
    expect(derived.suggestedActions[0].payload).toBe(derived.starterOptions[0]);
    expect(derived.suggestedActions[0].variant).toBe('primary');
    expect(derived.suggestedActions.length).toBeGreaterThanOrEqual(2);
  });

  it('derives healthcare starters from dental content', () => {
    const chunks = [
      { content: 'A standard cleaning and checkup is $95 for a 45-minute appointment.', metadata: {} },
      { content: 'We accept Delta Dental, Cigna, MetLife and Aetna PPO plans.', metadata: {} },
      { content: 'Open Monday to Friday, 8am–6pm. Book online or call us.', metadata: {} },
    ];
    const derived = deriveWidgetDefaults(chunks);
    expect(derived.businessType).toBe('healthcare');
    expect(derived.starterOptions).toContain('How do I book an appointment?');
    expect(derived.starterOptions).toContain('Do you accept insurance?');
  });

  it('falls back to generic starters when content is neutral', () => {
    const derived = deriveWidgetDefaults([{ content: 'Welcome to our website.', metadata: {} }]);
    expect(derived.businessType).toBeUndefined();
    expect(derived.starterOptions.length).toBe(4);
    expect(derived.suggestedActions.length).toBeGreaterThanOrEqual(2);
  });

  it('adapts an unknown business with detected topics (florist with delivery)', () => {
    const derived = deriveWidgetDefaults([
      { content: 'Same-day delivery across the city. Orders before 2pm ship today. Returns accepted within 7 days.', metadata: {} },
    ]);
    expect(derived.starterOptions).toContain('How fast is shipping?');
    expect(derived.starterOptions).toContain('What is your return policy?');
  });
});

describe('buildStarterOptions / buildSuggestedActions', () => {
  it('caps starters at 4 and keeps them distinct', () => {
    const starters = buildStarterOptions('ecommerce', ['shipping', 'returns', 'pricing', 'products', 'contact']);
    expect(starters.length).toBe(4);
    expect(new Set(starters).size).toBe(4);
  });

  it('builds at most 3 suggested actions with payloads tied to starters', () => {
    const starters = buildStarterOptions('healthcare', ['booking', 'insurance']);
    const actions = buildSuggestedActions('healthcare', starters);
    expect(actions.length).toBeLessThanOrEqual(3);
    expect(actions.length).toBeGreaterThanOrEqual(1);
    for (const action of actions) {
      expect(starters).toContain(action.payload);
    }
  });
});