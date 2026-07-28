import { describe, it, expect } from 'vitest';
import { orchestrateTurn } from '../orchestrator';

describe('orchestrateTurn', () => {
  describe('Grounded Knowledge Retrieval', () => {
    it('matches by exact key substring', () => {
      const result = orchestrateTurn({ message: 'Tell me about your return policy' });
      expect(result.responseText).toContain('30 days');
      expect(result.isFallback).toBe(false);
    });

    it('matches by all key words present', () => {
      const result = orchestrateTurn({ message: 'How does grounding engine work' });
      expect(result.responseText).toContain('4-stage grounding pipeline');
      expect(result.isFallback).toBe(false);
    });

    it('returns fallback for unrelated queries', () => {
      const result = orchestrateTurn({ message: 'What is the weather today' });
      expect(result.isFallback).toBe(true);
      expect(result.responseText).toContain("couldn't find this");
    });

    it('pricing query triggers qualification before knowledge retrieval', () => {
      const result = orchestrateTurn({ message: 'pricing' });
      expect(result.responseText).toContain('recommend the best plan');
      expect(result.isFallback).toBe(false);
    });

    it('matches "pricing" to "pricing tiers" via stem overlap when already qualified', () => {
      const result = orchestrateTurn({
        message: 'pricing',
        sessionMemory: { qualification: { questionsAskedCount: 2, completed: false } }
      });
      expect(result.responseText).toContain('Free tier');
      expect(result.isFallback).toBe(false);
    });

    it('matches "pricing tiers" (user query) to "pricing tiers" key via stem overlap', () => {
      const result = orchestrateTurn({
        message: 'pricing tiers options',
        sessionMemory: { qualification: { questionsAskedCount: 2, completed: false } }
      });
      // "pricing tiers options" doesn't match key exactly but stem-overlap works
      // routing is 'pricing' domain with keywords that include 'pricing'
      expect(result.responseText).toContain('Free tier');
      expect(result.isFallback).toBe(false);
    });

    it('matches "tiers" alone to "pricing tiers" via stem overlap', () => {
      const result = orchestrateTurn({
        message: 'tiers',
        sessionMemory: { qualification: { questionsAskedCount: 2, completed: false } }
      });
      // "tiers" stems to "tier", matching key token "tier"
      // routing is 'general' but stemMatch = 1/2 >= threshold and routing guard is bypassed
      // because keyTokens.length = 2 and stemMatchCount = 1 < 2, so routingOverlap is required
      // routing is 'general' with kw = ['tiers'], key="pricing tiers".includes('tiers')? Yes!
      expect(result.responseText).toContain('Free tier');
      expect(result.isFallback).toBe(false);
    });

    it('matches "returns" to "return policy" via stem overlap', () => {
      const result = orchestrateTurn({ message: 'How do returns work' });
      expect(result.responseText).toContain('30 days');
      expect(result.isFallback).toBe(false);
    });

    it('matches "integration" to "integrate widget" via stem overlap', () => {
      const result = orchestrateTurn({ message: 'How does integration work' });
      expect(result.responseText).toContain('embed snippet');
      expect(result.isFallback).toBe(false);
    });

    it('matches "white labeling" to "white label" via stem overlap', () => {
      const result = orchestrateTurn({ message: 'Do you support white labeling' });
      expect(result.responseText).toContain('branding');
      expect(result.isFallback).toBe(false);
    });

    it('preserves existing routing keyword overlap', () => {
      const result = orchestrateTurn({ message: 'analytics dashboard' });
      expect(result.responseText).toContain('Professional');
      expect(result.isFallback).toBe(false);
    });

    it('still returns fallback for completely unrelated terms after fuzzy match', () => {
      const result = orchestrateTurn({ message: 'qwerty asdfgh zxcvbn' });
      expect(result.isFallback).toBe(true);
    });

    it('single word "analytics" exact matches correctly', () => {
      const result = orchestrateTurn({ message: 'analytics' });
      expect(result.responseText).toContain('Professional');
      expect(result.isFallback).toBe(false);
    });
  });
});
