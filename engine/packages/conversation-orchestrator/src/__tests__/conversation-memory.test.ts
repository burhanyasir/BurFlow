import { describe, it, expect } from 'vitest';
import { createMemory, upsertQualificationField, getQualificationConfidence, shouldAskQualificationMemory, markQuestionAnswered, recordObjectionMemory, updateTrust } from '../conversation-memory';

describe('Conversation Memory - Sales CRM behavior', () => {
  it('creates memory with sales fields', () => {
    const mem = createMemory();
    expect(mem.qualificationFields).toBeDefined();
    expect(mem.trustHistory).toBeDefined();
    expect(typeof mem.memoryConfidence).toBe('number');
    expect(typeof mem.momentumScore).toBe('number');
  });

  it('upserts qualification field and returns confidence', () => {
    const mem = createMemory({ turnCount: 1 });
    upsertQualificationField(mem, 'budget', '$10k', 0.7, 1);
    expect(getQualificationConfidence(mem, 'budget')).toBeCloseTo(0.7);
    upsertQualificationField(mem, 'budget', '$10k', 0.6, 2);
    // confidence should take the max
    expect(getQualificationConfidence(mem, 'budget')).toBeCloseTo(0.7);
  });

  it('should not ask qualification too early or when confidence is high', () => {
    const mem = createMemory({ turnCount: 1 });
    upsertQualificationField(mem, 'budget', '$10k', 0.8, 1);
    expect(shouldAskQualificationMemory(mem, 'budget')).toBe(false);
    // low confidence but early turns
    const mem2 = createMemory({ turnCount: 1 });
    upsertQualificationField(mem2, 'budget', undefined, 0.2, 1);
    expect(shouldAskQualificationMemory(mem2, 'budget')).toBe(false);
    // now later turn
    const mem3 = createMemory({ turnCount: 3 });
    upsertQualificationField(mem3, 'budget', undefined, 0.2, 3);
    expect(shouldAskQualificationMemory(mem3, 'budget')).toBe(true);
  });

  it('marks question answered and prevents repeat asks', () => {
    const mem = createMemory({ turnCount: 4 });
    markQuestionAnswered(mem, 'budget');
    expect(shouldAskQualificationMemory(mem, 'budget')).toBe(false);
  });

  it('records objections into sales signals', () => {
    const mem = createMemory({ turnCount: 2 });
    recordObjectionMemory(mem, 'price', 'too expensive');
    expect(mem.salesSignals.objections).toContain('price');
    expect(mem.salesSignals.painPoints).toContain('too expensive');
  });

  it('updates trust history and current trust level', () => {
    const mem = createMemory({ turnCount: 5 });
    updateTrust(mem, 'low', 'asked about SOC2');
    expect(mem.trustHistory.length).toBeGreaterThan(0);
    expect(mem.trustLevel).toBe('low');
  });
});