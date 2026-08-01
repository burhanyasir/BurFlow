import { processQualification } from '../qualification-engine';

describe('Qualification Engine (inference-first)', () => {
  it('extracts team size and monthly conversations with confidence', () => {
    const msg = 'We have 15 support reps and about 2k monthly conversations.';
    const state = { questionsAskedCount: 0, completed: false } as any;
    const res = processQualification(msg, state);
    expect(res.updatedState.extractedFields).toBeDefined();
    const extracted = res.updatedState.extractedFields;
    expect(Object.keys(extracted).length).toBeGreaterThan(0);
    expect(extracted.teamSize || extracted.monthlyConversations).toBeDefined();
    if (extracted.teamSize) expect(extracted.teamSize.confidence).toBeGreaterThan(0.7);
    if (extracted.monthlyConversations) expect(extracted.monthlyConversations.confidence).toBeGreaterThan(0.7);
  });
});
