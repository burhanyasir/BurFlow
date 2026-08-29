import { describe, it, expect } from 'vitest';
import { executePipeline, stateManager } from '../orchestrator';

describe('pipeline suggestedOptions', () => {
  it('forwards brain suggestedOptions on the rapport/greeting path', async () => {
    const sessionId = `opt-${Date.now()}`;
    const result = await executePipeline({
      message: 'Hi',
      sessionId,
      tenantId: 'dental-tenant',
      brainFunction: async () => ({
        responseText: 'Welcome to Bright Smile.',
        suggestedOptions: ['Book Appointment', 'View Pricing', 'Contact Team'],
        quickReplies: [],
        uiState: { buttons: [], suggestedActions: [] },
        extractedLead: null,
      }),
    });
    expect(result.isRapportHandled).toBe(true);
    expect(result.suggestedOptions).toEqual(['Book Appointment', 'View Pricing', 'Contact Team']);
    stateManager.delete?.(sessionId);
  });

  it('forwards brain suggestedOptions on the standard answer path', async () => {
    const sessionId = `opt-ans-${Date.now()}`;
    const result = await executePipeline({
      message: 'What dental services do you offer?',
      sessionId,
      tenantId: 'dental-tenant',
      brainFunction: async () => ({
        responseText: 'We offer cleanings, Invisalign, and emergency care.',
        suggestedOptions: ['Book Appointment', 'Emergency Care'],
        quickReplies: [],
        uiState: { buttons: [], suggestedActions: [] },
        ciResult: { isFallback: false },
        extractedLead: null,
      }),
    });
    expect(result.suggestedOptions).toEqual(['Book Appointment', 'Emergency Care']);
  });
});
