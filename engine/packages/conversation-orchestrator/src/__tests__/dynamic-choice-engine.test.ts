import { generateChoices } from '../dynamic-choice-engine';
import { createMemory } from '../conversation-memory';

describe('Dynamic Choice Engine', () => {
  it('generates relevant pricing choices', () => {
    const mem = createMemory();
    mem.lastResponseText = 'Here are our pricing tiers.';
    const choices = generateChoices({ memory: mem, currentTopic: 'pricing', buyingIntentScore: 0.6 });
    expect(choices.length).toBeGreaterThanOrEqual(3);
    const ids = choices.map(c => c.id);
    expect(ids).toContain('compare_plans');
  });

  it('does not repeat rejected CTAs', () => {
    const mem = createMemory();
    mem.rejectedCTAs = ['compare_plans'];
    const choices = generateChoices({ memory: mem, currentTopic: 'pricing' });
    const ids = choices.map(c => c.id);
    expect(ids).not.toContain('compare_plans');
  });
});
