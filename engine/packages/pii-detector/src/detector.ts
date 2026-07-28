import { PiiPattern, PiiCategory, PiiDetectionResult, PiiRedactionMode } from './types';

const PATTERNS: PiiPattern[] = [
  { category: 'email', regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, placeholder: '[EMAIL]' },
  { category: 'phone', regex: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, placeholder: '[PHONE]' },
  { category: 'national_id', regex: /\b\d{3}-\d{2}-\d{4}\b/g, placeholder: '[NATIONAL_ID]' },
  { category: 'passport', regex: /\b[A-Z]\d{8}\b/g, placeholder: '[PASSPORT]' },
  { category: 'credit_card', regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, placeholder: '[CREDIT_CARD]' },
  { category: 'bank_account', regex: /\b[A-Z]{2}\d{2}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4,30}\b/g, placeholder: '[BANK_ACCOUNT]' },
  { category: 'ip_address', regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, placeholder: '[IP_ADDRESS]' },
  { category: 'api_key', regex: /\b(?:sk|pk|api|key)[_-][a-zA-Z0-9]{16,}\b/gi, placeholder: '[API_KEY]' },
];

export class PiiDetector {
  private readonly patterns: PiiPattern[];
  private readonly tenantOverrides: Map<string, { enabled: boolean; patterns: PiiPattern[] }>;

  constructor(patterns?: PiiPattern[]) {
    this.patterns = patterns || PATTERNS;
    this.tenantOverrides = new Map();
  }

  check(message: string, mode: PiiRedactionMode, tenantId?: string): PiiDetectionResult {
    let patterns = this.patterns;
    if (tenantId) {
      const override = this.tenantOverrides.get(tenantId);
      if (override) {
        if (!override.enabled) {
          return { found: false, categories: [], redactedMessage: message, redactedFields: [], redactionMode: mode, blocked: false };
        }
        patterns = override.patterns;
      }
    }
    const foundCategories = new Set<PiiCategory>();
    const redactedFields = new Set<PiiCategory>();
    let redactedMessage = message;
    let blocked = false;

    for (const pattern of patterns) {
      const regex = new RegExp(pattern.regex.source, 'g');
      const matches = message.match(regex);
      if (matches) {
        foundCategories.add(pattern.category);

        switch (mode) {
          case 'block':
            blocked = true;
            break;
          case 'mask':
            redactedMessage = redactedMessage.replace(regex, pattern.placeholder);
            redactedFields.add(pattern.category);
            break;
          case 'notify':
            // Detect and log but don't modify
            redactedFields.add(pattern.category);
            break;
          case 'allow':
            // Detect but no action
            break;
        }
      }
    }

    return {
      found: foundCategories.size > 0,
      categories: Array.from(foundCategories),
      redactedMessage,
      redactedFields: Array.from(redactedFields),
      redactionMode: mode,
      blocked,
    };
  }

  addTenantOverride(tenantId: string, overrides: { enabled: boolean; patterns: PiiPattern[] }): void {
    this.tenantOverrides.set(tenantId, overrides);
  }

  getPatterns(): PiiPattern[] {
    return [...this.patterns];
  }
}
