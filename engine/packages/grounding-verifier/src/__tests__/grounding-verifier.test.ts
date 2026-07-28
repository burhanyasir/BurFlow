import { describe, it, expect, beforeEach } from 'vitest';
import { GroundingVerifier } from '../verifier';
import { PiiDetector } from '@conversation-engine/pii-detector';
import { TenantConfig } from '@conversation-engine/core-types';

const BASE_CONFIG: TenantConfig = {
  tenantId: 'test-tenant',
  configVersion: 1,
  llm: { model: 'gpt-4o', temperature: 0.7, maxTokens: 1024, systemPrompt: 'You are a helpful assistant.' },
  safety: { contentFilterThreshold: 'moderate', piiRedactionEnabled: true, piiRedactionMode: 'mask' },
  rateLimits: { messagesPerMinute: 10, messagesPerHour: 100, concurrentSessions: 5 },
  session: { ttlMinutes: 60, gracePeriodDays: 7, legalHoldDays: 90 },
  fallbackResponse: 'I apologize, but I am unable to process this request at this time.',
  supportedLanguages: ['en', 'es', 'fr'],
  featureFlags: { qualityScoringEnabled: false, analyticsEnabled: false },
};

describe('GroundingVerifier', () => {
  let verifier: GroundingVerifier;
  let piiDetector: PiiDetector;

  beforeEach(() => {
    piiDetector = new PiiDetector();
    verifier = new GroundingVerifier(piiDetector);
  });

  describe('entity verification', () => {
    it('passes safe response', () => {
      const result = verifier.verify('Thank you for your inquiry. We will get back to you shortly.', BASE_CONFIG, new AbortController().signal);
      expect(result.passed).toBe(true);
      expect(result.failures).toEqual([]);
    });

    it('flags unreasonable prices over $10,000', () => {
      const result = verifier.verify('The total cost will be $15,000.', BASE_CONFIG, new AbortController().signal);
      expect(result.passed).toBe(false);
      expect(result.failures).toContain('entity_mismatch');
    });

    it('passes reasonable prices', () => {
      const result = verifier.verify('The total cost will be $49.99.', BASE_CONFIG, new AbortController().signal);
      expect(result.passed).toBe(true);
    });

    it('flags unsupported language references', () => {
      const result = verifier.verify('We can help you in German.', BASE_CONFIG, new AbortController().signal);
      expect(result.passed).toBe(false);
      expect(result.failures).toContain('entity_mismatch');
    });

    it('passes supported language references', () => {
      const result = verifier.verify('Podemos ayudarte en español.', BASE_CONFIG, new AbortController().signal);
      expect(result.passed).toBe(true);
    });

    it('flags unreasonable late-night times', () => {
      const result = verifier.verify('Our support team is available at 3:00 AM.', BASE_CONFIG, new AbortController().signal);
      expect(result.passed).toBe(false);
      expect(result.failures).toContain('entity_mismatch');
    });

    it('passes reasonable business hours', () => {
      const result = verifier.verify('Our support team is available at 9:00 AM.', BASE_CONFIG, new AbortController().signal);
      expect(result.passed).toBe(true);
    });
  });

  describe('PII leakage', () => {
    it('detects PII leakage in response', () => {
      const result = verifier.verify('Contact me at john@example.com for more details.', BASE_CONFIG, new AbortController().signal);
      expect(result.passed).toBe(false);
      expect(result.failures).toContain('pii_leakage');
    });

    it('passes clean response without PII', () => {
      const result = verifier.verify('Thank you for your question. Our team will assist you.', BASE_CONFIG, new AbortController().signal);
      expect(result.passed).toBe(true);
    });

    it('skips PII check when redaction is disabled', () => {
      const config = { ...BASE_CONFIG, safety: { ...BASE_CONFIG.safety, piiRedactionEnabled: false } };
      const result = verifier.verify('Contact me at john@example.com', config, new AbortController().signal);
      expect(result.passed).toBe(true);
    });

    it('skips PII check in allow mode', () => {
      const config = { ...BASE_CONFIG, safety: { ...BASE_CONFIG.safety, piiRedactionMode: 'allow' as const } };
      const result = verifier.verify('Contact me at john@example.com', config, new AbortController().signal);
      expect(result.passed).toBe(true);
    });

    it('returns verifier without PII detector for no-pii mode', () => {
      const noPiiVerifier = new GroundingVerifier();
      const result = noPiiVerifier.verify('Contact me at john@example.com', BASE_CONFIG, new AbortController().signal);
      expect(result.passed).toBe(true);
    });
  });

  describe('config hallucination', () => {
    it('detects hallucinated quality scoring feature', () => {
      const result = verifier.verify('Your quality score is 85 out of 100.', BASE_CONFIG, new AbortController().signal);
      expect(result.passed).toBe(false);
      expect(result.failures).toContain('config_hallucination');
    });

    it('detects hallucinated analytics feature', () => {
      const result = verifier.verify('Your analytics dashboard is available.', BASE_CONFIG, new AbortController().signal);
      expect(result.passed).toBe(false);
      expect(result.failures).toContain('config_hallucination');
    });

    it('passes when quality scoring is enabled', () => {
      const config = { ...BASE_CONFIG, featureFlags: { ...BASE_CONFIG.featureFlags, qualityScoringEnabled: true } };
      const result = verifier.verify('Your quality score is 85.', config, new AbortController().signal);
      expect(result.passed).toBe(true);
    });

    it('detects hallucinated model name', () => {
      const result = verifier.verify('I am powered by Claude 3.5 Sonnet.', BASE_CONFIG, new AbortController().signal);
      expect(result.passed).toBe(false);
      expect(result.failures).toContain('config_hallucination');
    });

    it('passes when model name matches config', () => {
      const config = { ...BASE_CONFIG, llm: { ...BASE_CONFIG.llm, model: 'claude-3-5-sonnet' } };
      const result = verifier.verify('I am powered by Claude.', config, new AbortController().signal);
      expect(result.passed).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles empty response', () => {
      const result = verifier.verify('', BASE_CONFIG, new AbortController().signal);
      expect(result.passed).toBe(true);
    });

    it('handles missing tenant config gracefully', () => {
      const result = verifier.verify('Some response', undefined, new AbortController().signal);
      expect(result.passed).toBe(true);
    });

    it('reports multiple failure types', () => {
      const result = verifier.verify(
        'The total is $50,000. Contact john@example.com for analytics.',
        BASE_CONFIG,
        new AbortController().signal,
      );
      expect(result.passed).toBe(false);
      expect(result.failures.length).toBeGreaterThanOrEqual(2);
    });

    it('sets fallbackUsed when failures exist', () => {
      const result = verifier.verify('The total cost will be $15,000.', BASE_CONFIG, new AbortController().signal);
      expect(result.fallbackUsed).toBe(true);
    });

    it('handles aborted signal', () => {
      const controller = new AbortController();
      controller.abort();
      const result = verifier.verify('Some response', BASE_CONFIG, controller.signal);
      expect(result.passed).toBe(true);
      expect(result.fallbackUsed).toBe(true);
    });
  });
});
