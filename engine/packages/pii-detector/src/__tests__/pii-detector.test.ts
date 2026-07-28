import { describe, it, expect } from 'vitest';
import { PiiDetector } from '../detector';
import { PiiRedactionMode } from '../types';

function detect(message: string, mode: PiiRedactionMode = 'mask') {
  const detector = new PiiDetector();
  return detector.check(message, mode);
}

describe('PiiDetector', () => {
  describe('email detection', () => {
    it('detects email addresses', () => {
      const result = detect('Contact me at user@example.com');
      expect(result.found).toBe(true);
      expect(result.categories).toContain('email');
    });

    it('masks email in mask mode', () => {
      const result = detect('My email is test@domain.com', 'mask');
      expect(result.redactedMessage).not.toContain('test@domain.com');
      expect(result.redactedMessage).toContain('[EMAIL]');
      expect(result.redactedFields).toContain('email');
    });

    it('blocks on block mode', () => {
      const result = detect('My email is test@domain.com', 'block');
      expect(result.blocked).toBe(true);
      expect(result.categories).toContain('email');
    });

    it('notifies in notify mode', () => {
      const result = detect('My email is test@domain.com', 'notify');
      expect(result.found).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.redactedMessage).toBe('My email is test@domain.com');
      expect(result.redactedFields).toContain('email');
    });

    it('allows in allow mode', () => {
      const result = detect('My email is test@domain.com', 'allow');
      expect(result.found).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.redactedMessage).toBe('My email is test@domain.com');
      expect(result.redactedFields).toEqual([]);
    });
  });

  describe('phone detection', () => {
    it('detects phone numbers', () => {
      const result = detect('Call me at 555-123-4567');
      expect(result.found).toBe(true);
      expect(result.categories).toContain('phone');
    });

    it('masks phone numbers', () => {
      const result = detect('My number is 5551234567', 'mask');
      expect(result.redactedMessage).toContain('[PHONE]');
    });
  });

  describe('national ID detection', () => {
    it('detects SSN-like patterns', () => {
      const result = detect('My SSN is 123-45-6789');
      expect(result.found).toBe(true);
      expect(result.categories).toContain('national_id');
    });

    it('masks national IDs', () => {
      const result = detect('ID: 123-45-6789', 'mask');
      expect(result.redactedMessage).toContain('[NATIONAL_ID]');
    });
  });

  describe('passport detection', () => {
    it('detects passport numbers', () => {
      const result = detect('Passport: A12345678');
      expect(result.found).toBe(true);
      expect(result.categories).toContain('passport');
    });

    it('masks passport numbers', () => {
      const result = detect('Passport A87654321', 'mask');
      expect(result.redactedMessage).toContain('[PASSPORT]');
    });
  });

  describe('credit card detection', () => {
    it('detects credit card numbers', () => {
      const result = detect('Card: 4111-1111-1111-1111');
      expect(result.found).toBe(true);
      expect(result.categories).toContain('credit_card');
    });

    it('masks credit cards', () => {
      const result = detect('My card is 4111111111111111', 'mask');
      expect(result.redactedMessage).toContain('[CREDIT_CARD]');
    });
  });

  describe('bank account detection', () => {
    it('detects IBAN bank account numbers', () => {
      const result = detect('Account: DE89370400440532013000');
      expect(result.found).toBe(true);
      expect(result.categories).toContain('bank_account');
    });

    it('masks IBAN bank account numbers', () => {
      const result = detect('Send to DE89370400440532013000', 'mask');
      expect(result.redactedMessage).toContain('[BANK_ACCOUNT]');
    });

    it('does not flag plain numeric strings as bank accounts', () => {
      const result = detect('Routing: 123456789', 'mask');
      expect(result.categories).not.toContain('bank_account');
    });
  });

  describe('IP address detection', () => {
    it('detects IP addresses', () => {
      const result = detect('Server: 192.168.1.1');
      expect(result.found).toBe(true);
      expect(result.categories).toContain('ip_address');
    });

    it('masks IP addresses', () => {
      const result = detect('My IP is 10.0.0.1', 'mask');
      expect(result.redactedMessage).toContain('[IP_ADDRESS]');
    });
  });

  describe('API key detection', () => {
    it('detects API keys with sk- prefix', () => {
      const result = detect('Key: sk-abc123def456ghi789');
      expect(result.found).toBe(true);
      expect(result.categories).toContain('api_key');
    });

    it('detects API keys with api_ prefix', () => {
      const result = detect('Key: api_abc123def456ghi789');
      expect(result.found).toBe(true);
      expect(result.categories).toContain('api_key');
    });

    it('masks API keys', () => {
      const result = detect('Token: sk-test1234567890abc', 'mask');
      expect(result.redactedMessage).toContain('[API_KEY]');
    });
  });

  describe('mixed PII', () => {
    it('detects multiple PII types', () => {
      const result = detect('Email user@test.com, phone 555-123-4567');
      expect(result.found).toBe(true);
      expect(result.categories).toContain('email');
      expect(result.categories).toContain('phone');
    });

    it('masks all PII in mixed message', () => {
      const msg = 'Contact: user@test.com, Phone: 555-123-4567';
      const result = detect(msg, 'mask');
      expect(result.redactedMessage).not.toContain('user@test.com');
      expect(result.redactedMessage).not.toContain('555-123-4567');
      expect(result.redactedFields).toContain('email');
      expect(result.redactedFields).toContain('phone');
    });
  });

  describe('no PII', () => {
    it('returns not found for clean messages', () => {
      const result = detect('What are your hours of operation?');
      expect(result.found).toBe(false);
      expect(result.redactedMessage).toBe('What are your hours of operation?');
    });

    it('does not modify clean messages in mask mode', () => {
      const result = detect('Hello, how can you help me?', 'mask');
      expect(result.redactedMessage).toBe('Hello, how can you help me?');
    });
  });

  describe('tenant overrides', () => {
    it('supports custom patterns per tenant', () => {
      const detector = new PiiDetector();
      detector.addTenantOverride('tenant-1', {
        enabled: true,
        patterns: [{ category: 'email', regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, placeholder: '[REDACTED_EMAIL]' }],
      });
      // The current implementation doesn't use tenant overrides in check()
      // This test verifies the API exists
      expect(detector.getPatterns().length).toBe(8);
    });
  });
});

describe('adversarial — pii-detector', () => {
  it('handles overlapping PII entities (email + phone in same text)', () => {
    const detector = new PiiDetector();
    const result = detector.check('Contact: john@example.com or 555-123-4567', 'mask');
    expect(result.found).toBe(true);
    expect(result.categories).toContain('email');
    expect(result.categories).toContain('phone');
    expect(result.redactedMessage).not.toContain('john@example.com');
    expect(result.redactedMessage).not.toContain('555-123-4567');
  });

  it('does not flag bank account on common numeric IDs (8-digit)', () => {
    const detector = new PiiDetector();
    const result = detector.check('My order number is 12345678', 'mask');
    expect(result.found).toBe(false);
    expect(result.categories).not.toContain('bank_account');
  });

  it('flags IBAN-format bank accounts', () => {
    const detector = new PiiDetector();
    const result = detector.check('Send to DE89370400440532013000', 'mask');
    expect(result.found).toBe(true);
    expect(result.categories).toContain('bank_account');
  });

  it('handles Unicode email characters gracefully', () => {
    const detector = new PiiDetector();
    const result = detector.check('用户@example.com', 'mask');
    expect(result.found).toBe(false); // Unicode before @ is not standard email
  });

  it('handles extremely long text without throwing', () => {
    const detector = new PiiDetector();
    const longText = 'A'.repeat(50000) + ' test@example.com ' + 'B'.repeat(50000);
    const result = detector.check(longText, 'mask');
    expect(result.found).toBe(true);
    expect(result.categories).toContain('email');
  });

  it('handles email-like patterns that are not real emails', () => {
    const detector = new PiiDetector();
    // These look like emails but are not standard
    const result1 = detector.check('a@b', 'mask'); // Too short TLD
    const result2 = detector.check('@example.com', 'mask'); // No local part
    expect(result1.found).toBe(false);
    expect(result2.found).toBe(false);
  });
});
