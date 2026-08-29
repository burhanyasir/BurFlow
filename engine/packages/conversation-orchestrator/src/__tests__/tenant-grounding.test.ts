import { describe, it, expect } from 'vitest';
import {
  OUT_OF_KNOWLEDGE_REPLY,
  buildGroundedSystemPrompt,
  fallbackSuggestedOptions,
  replaceUngroundedPlatformSpeech,
  resolveTenantIdentity,
  sanitizeSuggestedOptions,
} from '../tenant-grounding';

describe('resolveTenantIdentity', () => {
  it('uses scraped company name and domain from the business profile', () => {
    const identity = resolveTenantIdentity({
      companyName: 'Bright Smile Dental',
      domain: 'brightsmile.example',
    });
    expect(identity.name).toBe('Bright Smile Dental');
    expect(identity.domain).toBe('brightsmile.example');
  });

  it('falls back to website host when company name is missing', () => {
    const identity = resolveTenantIdentity({ website: 'https://oakandiron.plumbing/services' });
    expect(identity.name).toBe('oakandiron.plumbing');
    expect(identity.domain).toBe('oakandiron.plumbing');
  });
});

describe('buildGroundedSystemPrompt', () => {
  const knowledge = 'Bright Smile Dental offers cleanings, Invisalign, and emergency care. Book online.';

  it('defines the persona from the imported website brand, not BurFlow', () => {
    const prompt = buildGroundedSystemPrompt({
      businessProfile: { companyName: 'Bright Smile Dental', domain: 'brightsmile.example', primary_goal: 'appointment_booking', top_offers: ['New patient exam $99'] },
      businessContext: knowledge,
    });

    expect(prompt).toContain('You are an AI assistant for Bright Smile Dental');
    expect(prompt).toMatch(/MUST ONLY answer using the provided website knowledge base/i);
    expect(prompt).toContain('NEVER mention BurFlow, BurFlow platform features, or SaaS pricing ($29/$49/$99)');
    expect(prompt).toContain(OUT_OF_KNOWLEDGE_REPLY);
    expect(prompt).not.toMatch(/BurFlow sales representative/i);
    expect(prompt).not.toMatch(/workflow automation platform/i);
    expect(prompt).toMatch(/suggestedOptions/);
    expect(prompt).toMatch(/Book Appointment|View Pricing|Contact Team/);
    expect(prompt).not.toMatch(/Start BurFlow Trial|Demo AI Agent/);
  });
});

describe('sanitizeSuggestedOptions', () => {
  it('drops generic BurFlow platform chips', () => {
    expect(sanitizeSuggestedOptions([
      'Book Appointment',
      'Start BurFlow Trial',
      'Demo AI Agent',
      'View Pricing',
      'Contact Team',
    ])).toEqual(['Book Appointment', 'View Pricing', 'Contact Team']);
  });
});

describe('fallbackSuggestedOptions', () => {
  it('uses tenant offerings and CTA labels instead of BurFlow defaults', () => {
    const opts = fallbackSuggestedOptions({
      cta: { label: 'Book Appointment', link: '/book' },
      top_offers: ['Teeth Whitening'],
      button_catalog: [{ id: '1', label: 'View Pricing', payload: 'pricing' }],
    });
    expect(opts.length).toBeGreaterThanOrEqual(2);
    expect(opts.length).toBeLessThanOrEqual(3);
    expect(opts.join(' ')).not.toMatch(/BurFlow|Demo AI Agent/i);
    expect(opts).toContain('Book Appointment');
  });
});

describe('replaceUngroundedPlatformSpeech', () => {
  it('replaces BurFlow / SaaS-price leaks when the tenant knowledge does not contain them', () => {
    const leaked = 'BurFlow Starter is $49/mo and Professional is $99/mo.';
    expect(replaceUngroundedPlatformSpeech(leaked, 'We offer dental cleanings and Invisalign.')).toBe(OUT_OF_KNOWLEDGE_REPLY);
  });

  it('keeps tenant prices that actually appear in the knowledge base', () => {
    const kb = 'New patient exam $99. Whitening from $49.';
    const reply = 'Our new patient exam is $99 and whitening starts at $49.';
    expect(replaceUngroundedPlatformSpeech(reply, kb)).toBe(reply);
  });
});
