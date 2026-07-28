import { TenantConfig } from '@conversation-engine/core-types';
import { PiiDetector } from '@conversation-engine/pii-detector';
import { GroundingResult, GroundingFailureType } from './types';

export class GroundingVerifier {
  constructor(private readonly piiDetector?: PiiDetector) {}

  verify(response: string, config: TenantConfig | undefined, signal: AbortSignal): GroundingResult {
    if (signal.aborted) {
      return { passed: true, failures: [], fallbackUsed: true };
    }

    if (!config) {
      return { passed: true, failures: [], fallbackUsed: false };
    }

    const failures: GroundingFailureType[] = [];

    if (this.hasEntityMismatch(response, config)) {
      failures.push('entity_mismatch');
    }

    if (this.hasPiiLeakage(response, config)) {
      failures.push('pii_leakage');
    }

    if (this.hasActionReferenceMismatch(response)) {
      failures.push('action_reference_mismatch');
    }

    if (this.hasConfigHallucination(response, config)) {
      failures.push('config_hallucination');
    }

    return {
      passed: failures.length === 0,
      failures,
      fallbackUsed: failures.length > 0,
    };
  }

  private hasEntityMismatch(response: string, config: TenantConfig): boolean {
    const lower = response.toLowerCase();

    // Price reasonableness check: flag prices over $10,000
    const priceRegex = /\$[\d,]+(?:\.\d{2})?/g;
    const prices = lower.match(priceRegex);
    if (prices) {
      for (const price of prices) {
        const val = parseFloat(price.replace(/[$,]/g, ''));
        if (val > 10000) return true;
      }
    }

    // Language support check: if response mentions a specific language not in supported list
    const KNOWN_LANGUAGES = ['english', 'spanish', 'french', 'german', 'chinese', 'japanese', 'korean', 'portuguese', 'italian', 'dutch', 'russian', 'arabic', 'hindi', 'bengali', 'turkish', 'vietnamese', 'polish', 'thai', 'swedish', 'danish', 'finnish', 'norwegian', 'czech', 'romanian', 'hungarian', 'ukrainian', 'hebrew', 'indonesian', 'malay', 'tagalog'];
    const lowerWords = lower.split(/\s+/);
    const mentionedLang = KNOWN_LANGUAGES.find(lang => lowerWords.includes(lang));
    if (mentionedLang) {
      const supported = config.supportedLanguages.map(l => l.toLowerCase());
      if (supported.length > 0 && !supported.includes(mentionedLang)) {
        return true;
      }
    }

    // Time reference check: if response mentions unreasonable hour ranges
    const hourRegex = /\b(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)\b/g;
    let hourMatch;
    while ((hourMatch = hourRegex.exec(response)) !== null) {
      const hour = parseInt(hourMatch[1], 10);
      const period = hourMatch[3].toUpperCase();
      if ((period === 'AM' && (hour < 5 || hour > 11)) ||
          (period === 'PM' && hour >= 10)) {
        return true;
      }
    }

    return false;
  }

  private hasPiiLeakage(response: string, config: TenantConfig): boolean {
    if (!this.piiDetector || !config.safety.piiRedactionEnabled) return false;
    const mode = config.safety.piiRedactionMode;
    // Only flag PII as a grounding failure in 'block' mode.
    // 'mask' and 'notify' modes handle PII gracefully without replacing the response.
    if (mode === 'allow' || mode === 'mask' || mode === 'notify') return false;
    const result = this.piiDetector.check(response, mode);
    return result.found;
  }

  private hasActionReferenceMismatch(response: string): boolean {
    const actionPatterns = /\b(?:click\s+(?:here|this|the|on)|submit\s+(?:this|the)|register\s+(?:now|here|for)|buy\s+(?:now|this)|purchase\s+(?:now|this))\b/gi;
    return actionPatterns.test(response);
  }

  private hasConfigHallucination(response: string, config: TenantConfig): boolean {
    const lower = response.toLowerCase();

    // Check for feature references that don't exist in config
    if (lower.includes('quality scoring') || lower.includes('quality score')) {
      if (!config.featureFlags.qualityScoringEnabled) return true;
    }
    if (lower.includes('analytics') && !lower.includes('analytics team') && !lower.includes('analytics tools')) {
      if (!config.featureFlags.analyticsEnabled) return true;
    }

    // Check for model hallucination: response mentions an LLM model not in config
    const modelPatterns: Array<{ pattern: string; model: string }> = [
      { pattern: 'gpt-4', model: 'gpt-4' },
      { pattern: 'gpt-3.5', model: 'gpt-3.5' },
      { pattern: 'claude', model: 'claude' },
      { pattern: 'llama', model: 'llama' },
    ];
    for (const entry of modelPatterns) {
      if (lower.includes(entry.pattern) && !config.llm.model.toLowerCase().includes(entry.model)) {
        return true;
      }
    }

    return false;
  }
}
