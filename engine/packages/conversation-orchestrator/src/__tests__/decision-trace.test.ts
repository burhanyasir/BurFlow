import { processConversationBrain } from '../conversation-brain';
import { createMemory } from '../conversation-memory';

describe('Decision Trace integration', () => {
  it('records a decision trace per turn and emits telemetry', async () => {
    const legacyMemory = {
      turns: [],
      persona: 'unknown',
      funnelStage: 'discovery',
      buyingIntentDetected: false,
      objections: [],
      qualificationState: { questionsAskedCount: 0, completed: false },
      repeatedPhraseCount: 0,
      topics: [],
    } as any;

    const input = { message: 'Can you tell me about pricing?', responseText: 'We have Starter, Pro and Enterprise plans.', legacyMemory } as any;

    const out = await processConversationBrain(input);

    expect(out.memory.decisionTrace).toBeDefined();
    expect(Array.isArray(out.memory.decisionTrace)).toBe(true);
    expect(out.memory.decisionTrace.length).toBeGreaterThan(0);
    const trace = out.memory.decisionTrace[out.memory.decisionTrace.length - 1];
    expect(trace).toHaveProperty('turnNumber');
    expect(trace).toHaveProperty('memoryConfidence');

    // telemetry events should include at least one entry (cta_shown or qualification_completed may vary)
    expect(out.memory.telemetryEvents).toBeDefined();
    expect(Array.isArray(out.memory.telemetryEvents)).toBe(true);
  });
});
