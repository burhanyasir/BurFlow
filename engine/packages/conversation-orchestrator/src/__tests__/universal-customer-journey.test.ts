import { describe, expect, it } from 'vitest';

import {
  buildModuleRouting,
  buildSmartChoices,
  createDefaultBusinessProfile,
  detectCustomerJourneyStage,
  detectMultiIntents,
  detectVisitorIntent,
  evaluateJourneySwitch,
  getJourneyTemplateForProfile,
  JourneyTemplateRegistry,
  routeWithConfidence,
} from '../universal-customer-journey';
import { JourneyTelemetry } from '../journey-telemetry';

describe('Universal customer journey engine', () => {
  it('detects sale intent and SaaS qualification flow from discovery language', () => {
    const profile = createDefaultBusinessProfile({ businessType: 'saas', industry: 'SaaS' });
    const intent = detectVisitorIntent('We need a CRM that supports pipeline automation and budget is under 5k a month');
    const stage = detectCustomerJourneyStage('We need a CRM that supports pipeline automation and budget is under 5k a month', profile);

    expect(intent.intent).toBe('buy');
    expect(stage.stage).toBe('Qualification');
    expect(stage.confidence).toBeGreaterThan(0.4);
  });

  it('detects booking intent and dental journey stage', () => {
    const profile = createDefaultBusinessProfile({ businessType: 'dental', industry: 'Dental Clinics' });
    const intent = detectVisitorIntent('I need a dental appointment for a new patient and I want to ask about insurance coverage');
    const stage = detectCustomerJourneyStage('I need a dental appointment for a new patient and I want to ask about insurance coverage', profile);

    expect(intent.intent).toBe('appointment');
    expect(stage.stage).toBe('Insurance');
    expect(stage.confidence).toBeGreaterThan(0.4);
  });

  it('builds a relevant Shopify choice set without duplicates', () => {
    const profile = createDefaultBusinessProfile({ businessType: 'shopify', industry: 'Shopify / Ecommerce' });
    const choices = buildSmartChoices(profile, 'buy', 'checkout', ['View collection']);

    expect(choices.length).toBeGreaterThanOrEqual(3);
    expect(choices.length).toBeLessThanOrEqual(6);
    const texts = choices.map((choice) => choice.text);
    expect(new Set(texts).size).toBe(texts.length);
    expect(texts).toEqual(expect.arrayContaining(['Shipping info', 'Checkout help', 'Compare products']));
  });

  it('routes multiple business-aware modules based on intent and stage', () => {
    const profile = createDefaultBusinessProfile({ businessType: 'saas', industry: 'SaaS' });
    const route = buildModuleRouting(profile, 'buy', 'demo');

    expect(route[0].primary).toBe(true);
    expect(route.map((item) => item.module)).toContain('sales');
    expect(route.map((item) => item.module)).toContain('lead_qualification');
  });

  it('detects multiple intents in one message and ranks them by confidence', () => {
    const profile = createDefaultBusinessProfile({ businessType: 'saas', industry: 'SaaS' });
    const result = detectMultiIntents('I need pricing and security details before a demo, and I want to compare the API integrations');

    expect(result.intents.length).toBeGreaterThanOrEqual(2);
    expect(result.primaryIntent).toBe('buy');
    expect(result.intents[0].confidence).toBeGreaterThan(result.intents[1].confidence);
    expect(result.intents.map((entry) => entry.intent)).toContain('compare');
    expect(result.blended || result.requiresClarification === false).toBe(true);
    expect(detectVisitorIntent('I need pricing and security details before a demo', profile).intent).toBe('buy');
  });

  it('supports dynamic journey switching while preserving context', () => {
    const profile = createDefaultBusinessProfile({ businessType: 'saas', industry: 'SaaS' });
    const switchResult = evaluateJourneySwitch('sales', 'demo', 'Actually, I need support and billing help instead', profile);

    expect(switchResult.switching).toBe(true);
    expect(switchResult.preserveContext).toBe(true);
    expect(switchResult.toJourney).toBe('support');
    expect(switchResult.preservedStage).toBe('demo');
  });

  it('routes using confidence-weighted blended modules when confidence is similar', () => {
    const profile = createDefaultBusinessProfile({ businessType: 'saas', industry: 'SaaS' });
    const route = routeWithConfidence(profile, [{ intent: 'buy', confidence: 0.72 }, { intent: 'support', confidence: 0.68 }], 'qualification');

    expect(route.decisions.length).toBeGreaterThan(1);
    expect(route.decisions[0].module).toBe('sales');
    expect(route.blended).toBe(true);
    expect(route.requiresClarification).toBe(false);
  });

  it('tracks journey telemetry and module usage for production analytics', () => {
    const telemetry = new JourneyTelemetry();
    telemetry.recordJourneyEntry('journey-1', 'saas-demo', 'session-1', 'qualification');
    telemetry.recordRouteConfidence('journey-1', 'qualification', 0.81, 'session-1');
    telemetry.recordModuleUsage('sales', 'journey-1', 'session-1', 0.81, 'qualification');
    telemetry.recordJourneyCompletion('journey-1', 'saas-demo', 'session-1', 'purchase', 180000, true);

    const snapshot = telemetry.snapshot();
    expect(snapshot.byType.journey_entry).toBe(1);
    expect(snapshot.byType.route_confidence).toBe(1);
    expect(snapshot.byType.module_usage).toBe(1);
    expect(snapshot.byType.journey_completion).toBe(1);
    expect(snapshot.byJourney['journey-1']).toBeGreaterThanOrEqual(4);
  });

  it('exposes product-specific journey templates for admin management', () => {
    const registry = new JourneyTemplateRegistry();
    const template = registry.getByBusinessType('hotel');
    const generic = getJourneyTemplateForProfile(createDefaultBusinessProfile({ businessType: 'generic' }));

    expect(template?.industry).toBe('Hotels');
    expect(generic.stages.some((stage) => stage.name === 'Decision')).toBe(true);

    const saved = registry.save({
      id: 'custom-shopify',
      businessType: 'shopify',
      industry: 'Shopify',
      name: 'Custom Shopify flow',
      stages: [{ id: 'compare', name: 'Compare', description: 'Compare products', keywords: ['compare'] }],
      ctas: ['Compare products'],
      enabled: true,
    });

    expect(registry.getById('custom-shopify')).toEqual(saved);
  });
});
