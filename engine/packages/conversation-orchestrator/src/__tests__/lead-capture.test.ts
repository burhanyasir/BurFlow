import { describe, it, expect } from 'vitest';
import { processConversationBrain } from '../conversation-brain';
import { ConversationIntelligenceMemory } from '../conversation-intelligence-types';

function makeLegacyMemory(overrides?: Partial<ConversationIntelligenceMemory>): ConversationIntelligenceMemory {
  return {
    turns: [],
    persona: 'unknown',
    funnelStage: 'greeting',
    buyingIntentDetected: false,
    objections: [],
    qualificationState: { questionsAskedCount: 0, completed: false },
    repeatedPhraseCount: 0,
    topics: [],
    ...overrides,
  };
}

describe('Lead capture in conversation brain', () => {
  it('extracts email from visitor message', async () => {
    const result = await processConversationBrain({
      message: 'My email is alice@example.com, please send me more info',
      responseText: '',
      legacyMemory: makeLegacyMemory(),
    });
    expect(result.extractedLead).toBeTruthy();
    expect(result.extractedLead!.email).toBe('alice@example.com');
  });

  it('extracts phone from visitor message', async () => {
    const result = await processConversationBrain({
      message: 'You can reach me at 555-123-4567',
      responseText: '',
      legacyMemory: makeLegacyMemory(),
    });
    expect(result.extractedLead!.phone).toBe('555-123-4567');
  });

  it('extracts name from visitor message', async () => {
    const result = await processConversationBrain({
      message: 'Hi, my name is Sarah Johnson and I want to learn more',
      responseText: '',
      legacyMemory: makeLegacyMemory(),
    });
    expect(result.extractedLead!.name).toBe('Sarah Johnson');
  });

  it('extracts company from visitor message', async () => {
    const result = await processConversationBrain({
      message: 'I work at Acme Corporation and we need a solution',
      responseText: '',
      legacyMemory: makeLegacyMemory(),
    });
    expect(result.extractedLead!.company).toBe('Acme Corporation');
  });

  it('extracts multiple fields from one message', async () => {
    const result = await processConversationBrain({
      message: 'My name is Priya Patel, email priya@corp.io, I work at Nexus Labs',
      responseText: '',
      legacyMemory: makeLegacyMemory(),
    });
    expect(result.extractedLead!.email).toBe('priya@corp.io');
    expect(result.extractedLead!.name).toBe('Priya Patel');
    expect(result.extractedLead!.company).toBe('Nexus Labs');
  });

  it('returns empty extractedLead for a plain question', async () => {
    const result = await processConversationBrain({
      message: 'What is your pricing for the pro plan?',
      responseText: '',
      legacyMemory: makeLegacyMemory(),
    });
    expect(result.extractedLead).toBeTruthy();
    expect(Object.keys(result.extractedLead!).length).toBe(0);
  });

  it('does not misidentify random numbers or words as lead data', async () => {
    const result = await processConversationBrain({
      message: 'The product is great and works in 2026 with our team',
      responseText: '',
      legacyMemory: makeLegacyMemory(),
    });
    expect(result.extractedLead!.email).toBeUndefined();
    expect(result.extractedLead!.phone).toBeUndefined();
    expect(result.extractedLead!.name).toBeUndefined();
  });

  it('keeps the brain fully functional alongside lead extraction', async () => {
    const result = await processConversationBrain({
      message: 'I am John Smith and my email is john@smith.com',
      responseText: '',
      legacyMemory: makeLegacyMemory(),
    });
    expect(result.responseText).toBeTruthy();
    expect(result.legacyMemory).toBeTruthy();
    expect(result.plan).toBeTruthy();
    expect(result.validation).toBeTruthy();
    expect(result.extractedLead!.email).toBe('john@smith.com');
    expect(result.extractedLead!.name).toBe('John Smith');
  });
});
