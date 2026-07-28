import { readFileSync, existsSync } from 'fs';
import { PatternSet, TripWirePattern, SafetyCategory } from './types';

export function loadPatternFile(filePath: string): PatternSet {
  if (!existsSync(filePath)) {
    throw new Error(`Trip-wire pattern file not found: ${filePath}`);
  }
  const raw = readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);
  validatePatternSet(parsed);
  return parsed as PatternSet;
}

export function mergePatternSets(base: PatternSet, ...extensions: PatternSet[]): PatternSet {
  const mergedMap = new Map<SafetyCategory, string[]>();

  for (const entry of base.patterns) {
    mergedMap.set(entry.category, [...entry.patterns]);
  }

  for (const ext of extensions) {
    for (const entry of ext.patterns) {
      const existing = mergedMap.get(entry.category) || [];
      mergedMap.set(entry.category, [...existing, ...entry.patterns]);
    }
  }

  const mergedPatterns: TripWirePattern[] = [];
  for (const [category, patterns] of mergedMap) {
    mergedPatterns.push({ category, patterns: [...new Set(patterns)] });
  }

  const maxVersion = Math.max(base.version, ...extensions.map((e) => e.version));

  return { version: maxVersion * 1000 + Date.now() % 1000, patterns: mergedPatterns };
}

function validatePatternSet(ps: any): void {
  if (!ps || typeof ps.version !== 'number') {
    throw new Error('Invalid pattern set: missing or invalid version');
  }
  if (!Array.isArray(ps.patterns)) {
    throw new Error('Invalid pattern set: patterns must be an array');
  }
  for (const entry of ps.patterns) {
    if (!entry.category || !Array.isArray(entry.patterns)) {
      throw new Error(`Invalid pattern entry: ${JSON.stringify(entry)}`);
    }
  }
}
