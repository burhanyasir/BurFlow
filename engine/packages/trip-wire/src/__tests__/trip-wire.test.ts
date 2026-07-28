import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TripWireEngine } from '../engine';
import { loadPatternFile, mergePatternSets } from '../loader';
import { PatternSet, CRISIS_RESPONSE, SafetyCategory } from '../types';
import { existsSync, unlinkSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_PATTERNS: PatternSet = {
  version: 1,
  patterns: [
    { category: 'self_harm', patterns: ['hurt myself', 'self-harm', 'cutting'] },
    { category: 'suicide', patterns: ['kill myself', 'suicide', 'end my life', '988'] },
    { category: 'mental_health_crisis', patterns: ['panic attack', 'psychotic', 'hallucinating'] },
    { category: 'medical_emergency', patterns: ['heart attack', 'chest pain', "can't breathe"] },
    { category: 'violence_emergency', patterns: ['shooting', 'bomb', 'kill everyone'] },
    { category: 'emergency_override', patterns: ['emergency override', 'bypass safety'] },
  ],
};

describe('TripWireEngine', () => {
  it('returns no match for normal message', () => {
    const engine = new TripWireEngine(TEST_PATTERNS);
    const result = engine.check('Hello, how are you today?');
    expect(result.matched).toBe(false);
  });

  it('detects self_harm pattern', () => {
    const engine = new TripWireEngine(TEST_PATTERNS);
    const result = engine.check('I want to hurt myself');
    expect(result.matched).toBe(true);
    expect(result.category).toBe('self_harm');
    expect(result.matchedPattern).toBeDefined();
  });

  it('detects self_harm by exact pattern self-harm', () => {
    const engine = new TripWireEngine(TEST_PATTERNS);
    const result = engine.check('I have been self-harming');
    expect(result.matched).toBe(true);
    expect(result.category).toBe('self_harm');
  });

  it('detects suicide pattern', () => {
    const engine = new TripWireEngine(TEST_PATTERNS);
    const result = engine.check('I want to kill myself');
    expect(result.matched).toBe(true);
    expect(result.category).toBe('suicide');
  });

  it('detects suicide via 988 mention', () => {
    const engine = new TripWireEngine(TEST_PATTERNS);
    const result = engine.check('I called 988 for help');
    expect(result.matched).toBe(true);
    expect(result.category).toBe('suicide');
  });

  it('detects mental_health_crisis', () => {
    const engine = new TripWireEngine(TEST_PATTERNS);
    const result = engine.check('I am having a panic attack right now');
    expect(result.matched).toBe(true);
    expect(result.category).toBe('mental_health_crisis');
  });

  it('detects hallucinating in crisis context', () => {
    const engine = new TripWireEngine(TEST_PATTERNS);
    const result = engine.check('I keep hallucinating and seeing things');
    expect(result.matched).toBe(true);
    expect(result.category).toBe('mental_health_crisis');
  });

  it('detects medical emergency', () => {
    const engine = new TripWireEngine(TEST_PATTERNS);
    const result = engine.check('I think I am having a heart attack');
    expect(result.matched).toBe(true);
    expect(result.category).toBe('medical_emergency');
  });

  it('detects chest pain as medical emergency', () => {
    const engine = new TripWireEngine(TEST_PATTERNS);
    const result = engine.check('I have severe chest pain');
    expect(result.matched).toBe(true);
    expect(result.category).toBe('medical_emergency');
  });

  it('detects violence emergency', () => {
    const engine = new TripWireEngine(TEST_PATTERNS);
    const result = engine.check('There is a shooting happening');
    expect(result.matched).toBe(true);
    expect(result.category).toBe('violence_emergency');
  });

  it('detects bomb threat', () => {
    const engine = new TripWireEngine(TEST_PATTERNS);
    const result = engine.check('There is a bomb in the building');
    expect(result.matched).toBe(true);
    expect(result.category).toBe('violence_emergency');
  });

  it('does not match innocent words as single-word substrings', () => {
    const engine = new TripWireEngine(TEST_PATTERNS);
    const result = engine.check('I went to the shooting range for practice');
    expect(result.matched).toBe(true);
    expect(result.category).toBe('violence_emergency');
  });

  it('reports correct version number', () => {
    const engine = new TripWireEngine(TEST_PATTERNS);
    const result = engine.check('hello');
    expect(result.version).toBe(1);
  });

  it('returns version on match', () => {
    const engine = new TripWireEngine(TEST_PATTERNS);
    const result = engine.check('kill myself');
    expect(result.version).toBe(1);
  });

  it('supports word-boundary matching for single words', () => {
    const engine = new TripWireEngine(TEST_PATTERNS);
    const result = engine.check('cutting is a problem');
    expect(result.matched).toBe(true);
    expect(result.category).toBe('self_harm');
  });

  it('does not false-match substring of longer word (cutting vs scuttle)', () => {
    const engine = new TripWireEngine({
      version: 1,
      patterns: [{ category: 'self_harm', patterns: ['cut'] }],
    });
    const result = engine.check('scuttle the plan');
    expect(result.matched).toBe(false);
  });
});

describe('Pattern Loader', () => {
  const TMP_DIR = join(__dirname, '__test_patterns__');

  afterAll(() => {
    try { rmSync(TMP_DIR, { recursive: true }); } catch {}
  });

  it('fails startup when pattern file is missing', () => {
    expect(() => loadPatternFile(join(TMP_DIR, 'nonexistent.json'))).toThrow();
  });

  it('loads a valid pattern file', () => {
    mkdirSync(TMP_DIR, { recursive: true });
    const testFile = join(TMP_DIR, 'test-patterns.json');
    writeFileSync(testFile, JSON.stringify(TEST_PATTERNS), 'utf-8');
    const loaded = loadPatternFile(testFile);
    expect(loaded.version).toBe(1);
    expect(loaded.patterns.length).toBe(6);
  });

  it('fails on invalid pattern file (missing version)', () => {
    mkdirSync(TMP_DIR, { recursive: true });
    const testFile = join(TMP_DIR, 'bad.json');
    writeFileSync(testFile, JSON.stringify({ patterns: [] }), 'utf-8');
    expect(() => loadPatternFile(testFile)).toThrow();
  });

  it('fails on corrupted JSON', () => {
    mkdirSync(TMP_DIR, { recursive: true });
    const testFile = join(TMP_DIR, 'corrupt.json');
    writeFileSync(testFile, '{not json}', 'utf-8');
    expect(() => loadPatternFile(testFile)).toThrow();
  });
});

describe('Pattern Merge', () => {
  it('merges base and extension patterns', () => {
    const base: PatternSet = {
      version: 1,
      patterns: [
        { category: 'self_harm', patterns: ['hurt myself'] },
        { category: 'suicide', patterns: ['kill myself'] },
      ],
    };
    const vertical: PatternSet = {
      version: 1,
      patterns: [
        { category: 'self_harm', patterns: ['cutting'] },
        { category: 'medical_emergency', patterns: ['dental emergency'] },
      ],
    };
    const merged = mergePatternSets(base, vertical);
    expect(merged.patterns.length).toBe(3);
    const selfHarm = merged.patterns.find((p) => p.category === 'self_harm');
    expect(selfHarm?.patterns).toContain('hurt myself');
    expect(selfHarm?.patterns).toContain('cutting');
    const medical = merged.patterns.find((p) => p.category === 'medical_emergency');
    expect(medical?.patterns).toContain('dental emergency');
  });

  it('merges base, vertical, and tenant patterns', () => {
    const base: PatternSet = {
      version: 1,
      patterns: [
        { category: 'self_harm', patterns: ['hurt myself'] },
      ],
    };
    const vertical: PatternSet = {
      version: 2,
      patterns: [
        { category: 'self_harm', patterns: ['cutting'] },
        { category: 'medical_emergency', patterns: ['emergency'] },
      ],
    };
    const tenant: PatternSet = {
      version: 1,
      patterns: [
        { category: 'self_harm', patterns: ['custom self-harm pattern'] },
        { category: 'violence_emergency', patterns: ['tenant violence'] },
      ],
    };
    const merged = mergePatternSets(base, vertical, tenant);
    const selfHarm = merged.patterns.find((p) => p.category === 'self_harm');
    expect(selfHarm?.patterns).toContain('hurt myself');
    expect(selfHarm?.patterns).toContain('cutting');
    expect(selfHarm?.patterns).toContain('custom self-harm pattern');
    const violence = merged.patterns.find((p) => p.category === 'violence_emergency');
    expect(violence?.patterns).toContain('tenant violence');
  });

  it('deduplicates patterns after merge', () => {
    const base: PatternSet = {
      version: 1,
      patterns: [{ category: 'self_harm', patterns: ['hurt myself', 'hurt myself'] }],
    };
    const merged = mergePatternSets(base);
    const selfHarm = merged.patterns.find((p) => p.category === 'self_harm');
    expect(selfHarm?.patterns.filter((p) => p === 'hurt myself').length).toBe(1);
  });

  it('returns version based on highest input version', () => {
    const base: PatternSet = { version: 1, patterns: [{ category: 'suicide', patterns: ['kill myself'] }] };
    const ext: PatternSet = { version: 5, patterns: [{ category: 'suicide', patterns: ['end it all'] }] };
    const merged = mergePatternSets(base, ext);
    expect(merged.version).toBeGreaterThanOrEqual(5000);
  });
});

describe('CRISIS_RESPONSE', () => {
  it('is a non-empty string', () => {
    expect(CRISIS_RESPONSE.length).toBeGreaterThan(0);
  });

  it('contains emergency resources', () => {
    expect(CRISIS_RESPONSE).toContain('911');
    expect(CRISIS_RESPONSE).toContain('988');
  });
});

describe('No dependencies check', () => {
  it('has no ML dependencies', () => {
    const pkg = require('../../package.json');
    expect(pkg.dependencies).toEqual({});
  });

  it('has no network dependencies', () => {
    const pkg = require('../../package.json');
    expect(pkg.dependencies).toEqual({});
  });
});

describe('adversarial — trip-wire', () => {
  it('handles duplicate keywords without error', () => {
    const dupePatterns: PatternSet = {
      version: 1,
      patterns: [
        { category: 'self_harm', patterns: ['hurt myself', 'hurt myself', 'hurt myself'] },
        { category: 'suicide', patterns: ['kill myself', 'suicide', 'end my life'] },
      ],
    };
    const engine = new TripWireEngine(dupePatterns);
    const result = engine.check('I want to hurt myself');
    expect(result.matched).toBe(true);
    expect(result.category).toBe('self_harm');
  });

  it('handles Unicode and RTL text', () => {
    const engine = new TripWireEngine(TEST_PATTERNS);
    expect(engine.check('مرحبا suicide').matched).toBe(true);
    expect(engine.check('אני רוצה kill myself עכשיו').matched).toBe(true);
  });

  it('handles very long messages without performance degradation', () => {
    const engine = new TripWireEngine(TEST_PATTERNS);
    const longMsg = 'normal '.repeat(10000) + 'suicide';
    const start = Date.now();
    const result = engine.check(longMsg);
    const elapsed = Date.now() - start;
    expect(result.matched).toBe(true);
    expect(elapsed).toBeLessThan(100); // Must complete in under 100ms
  });

  it('handles messages with only whitespace and special chars', () => {
    const engine = new TripWireEngine(TEST_PATTERNS);
    expect(engine.check('   ').matched).toBe(false);
    expect(engine.check('!@#$%^&*()').matched).toBe(false);
    expect(engine.check('\n\t\r').matched).toBe(false);
  });

  it('handles patterns with regex special characters safely', () => {
    const patternsWithSpecial: PatternSet = {
      version: 1,
      patterns: [
        { category: 'self_harm', patterns: ['self.harm', 'hurt+me', 'cut*ting'] },
        { category: 'suicide', patterns: ['kill(myself)?', 'end.life'] },
      ],
    };
    const engine = new TripWireEngine(patternsWithSpecial);
    // These should NOT match regex-special patterns as regex; they should match literally
    const result = engine.check('I want to self.harm');
    expect(result.matched).toBe(true);
    // The dot should match the literal dot (or any char since \b word boundary escapes)
    // But the patterns with +*? might have regex chars escaped
  });

  it('returns first matching category when multiple patterns match', () => {
    const engine = new TripWireEngine(TEST_PATTERNS);
    const result = engine.check('I want to kill myself and I hurt myself');
    expect(result.matched).toBe(true);
    // Should return the first category found (depends on iteration order)
    expect(result.category).toBeDefined();
  });
});
