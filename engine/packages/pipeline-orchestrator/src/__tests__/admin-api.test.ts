import { describe, it, expect, beforeEach } from 'vitest';
import { buildAdminAnalyticsReport } from '../admin-api';
import { buttonTelemetry } from '@conversation-engine/conversation-orchestrator';
import type { SessionRecord } from '@conversation-engine/session-store';

function makeSession(state: Record<string, unknown>): SessionRecord {
  return {
    sessionId: 's1',
    tenantId: 't1',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    stateMachine: 'default',
    sequenceCounter: 1,
    state: JSON.stringify(state),
  } as SessionRecord;
}

describe('Admin analytics report', () => {
  beforeEach(() => {
    buttonTelemetry.reset();
  });

  it('aggregates stage, temperature, trust, and goal metrics', () => {
    buttonTelemetry.recordShown('btn-demo', 'Book Demo', 'sales', 's1', 1);
    buttonTelemetry.recordClicked('btn-demo', 'Book Demo', 'sales', 's1', 1);
    buttonTelemetry.recordConversionAfterClick('btn-demo', 'Book Demo', 'sales', 's1', 1);

    const report = buildAdminAnalyticsReport([
      makeSession({
        conversationIntel: {
          turns: [{ message: 'Hi', response: 'Hello', polarity: 0, frustration: 0, urgency: 0, timestamp: Date.now() }],
          persona: 'ceo',
          funnelStage: 'decision',
          currentStage: 'decision',
          customerTemperature: 'hot',
          trustLevel: 'high',
          buyingIntentDetected: true,
          objections: ['pricing'],
          qualificationState: { completed: true },
          repeatedPhraseCount: 0,
          topics: ['pricing'],
          goalsAchieved: ['schedule_demo', 'close_trial'],
          leadScore: 85,
          conversationScore: 90,
          knowledgeEvidenceConfidence: 0.82,
        },
      }),
    ]);

    expect(report.totalSessions).toBe(1);
    expect(report.stageDistribution).toEqual([{ stage: 'decision', count: 1, percentage: 100 }]);
    expect(report.temperatureDistribution).toEqual([{ temperature: 'hot', count: 1, percentage: 100 }]);
    expect(report.trustDistribution).toEqual([{ trust: 'high', count: 1, percentage: 100 }]);
    expect(report.demoBookings).toBe(1);
    expect(report.trialStarts).toBe(1);
    expect(report.purchases).toBe(0);
    expect(report.conversionRate).toBe(0);
    expect(report.avgLeadScore).toBe(85);
    expect(report.avgConversationScore).toBe(90);
    expect(report.avgKnowledgeConfidence).toBeCloseTo(0.82, 2);
    expect(report.topCtaClicks[0].buttonId).toBe('btn-demo');
    expect(report.topCtaClicks[0].ctr).toBe(100);
    expect(report.topCtaClicks[0].conversionAfterClick).toBe(100);
  });
});
