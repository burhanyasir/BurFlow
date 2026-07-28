import { PatternSet, TripWireResult, SafetyCategory } from './types';

export class TripWireEngine {
  private readonly patternSet: PatternSet;
  private readonly compiled: Map<SafetyCategory, { pattern: string; isSingleWord: boolean }[]>;

  constructor(patternSet: PatternSet) {
    this.patternSet = patternSet;
    Object.freeze(this.patternSet.patterns);
    Object.freeze(this.patternSet);

    this.compiled = new Map();
    for (const entry of patternSet.patterns) {
      const compiledPatterns = entry.patterns.map((p) => {
        const lower = p.toLowerCase();
        return { pattern: lower, isSingleWord: !lower.includes(' ') && !lower.includes('-') };
      });
      this.compiled.set(entry.category, compiledPatterns);
    }
  }

  check(message: string): TripWireResult {
    const normalized = message.toLowerCase();

    for (const [category, entries] of this.compiled) {
      for (const { pattern, isSingleWord } of entries) {
        let found: boolean;
        if (isSingleWord) {
          const regex = new RegExp(`\\b${escapeRegExp(pattern)}\\b`);
          found = regex.test(normalized);
        } else {
          found = normalized.includes(pattern);
        }

        if (found) {
          return {
            matched: true,
            category,
            matchedPattern: pattern,
            version: this.patternSet.version,
          };
        }
      }
    }

    return { matched: false, version: this.patternSet.version };
  }

  getVersion(): number {
    return this.patternSet.version;
  }

  getPatternSet(): Readonly<PatternSet> {
    return this.patternSet;
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
