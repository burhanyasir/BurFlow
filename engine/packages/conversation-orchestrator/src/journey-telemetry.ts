export type JourneyTelemetryEventType =
  | 'journey_entry'
  | 'journey_completion'
  | 'journey_abandonment'
  | 'journey_switching'
  | 'journey_duration'
  | 'journey_conversion'
  | 'route_confidence'
  | 'module_usage';

export interface JourneyTelemetryEvent {
  type: JourneyTelemetryEventType;
  journeyId?: string;
  journeyName?: string;
  sessionId?: string;
  fromJourney?: string;
  toJourney?: string;
  stage?: string;
  module?: string;
  confidence?: number;
  durationMs?: number;
  completed?: boolean;
  converted?: boolean;
  reason?: string;
  timestamp: number;
}

export interface JourneyTelemetrySnapshot {
  totalEvents: number;
  byType: Record<string, number>;
  byJourney: Record<string, number>;
  lastEvent?: JourneyTelemetryEvent;
}

export class JourneyTelemetry {
  private events: JourneyTelemetryEvent[] = [];
  private max = 10000;

  record(event: JourneyTelemetryEvent) {
    this.events.push(event);
    if (this.events.length > this.max) this.events = this.events.slice(-this.max);
  }

  recordJourneyEntry(journeyId: string, journeyName?: string, sessionId?: string, stage?: string, reason?: string) {
    this.record({ type: 'journey_entry', journeyId, journeyName, sessionId, stage, reason, timestamp: Date.now() });
  }

  recordJourneyCompletion(journeyId: string, journeyName?: string, sessionId?: string, stage?: string, durationMs?: number, converted?: boolean) {
    this.record({ type: 'journey_completion', journeyId, journeyName, sessionId, stage, durationMs, converted, timestamp: Date.now() });
  }

  recordJourneyAbandonment(journeyId: string, journeyName?: string, sessionId?: string, stage?: string, durationMs?: number) {
    this.record({ type: 'journey_abandonment', journeyId, journeyName, sessionId, stage, durationMs, timestamp: Date.now() });
  }

  recordJourneySwitch(fromJourney: string, toJourney: string, sessionId?: string, stage?: string, reason?: string) {
    this.record({ type: 'journey_switching', fromJourney, toJourney, sessionId, stage, reason, timestamp: Date.now() });
  }

  recordJourneyDuration(journeyId: string, durationMs: number, sessionId?: string, journeyName?: string) {
    this.record({ type: 'journey_duration', journeyId, journeyName, sessionId, durationMs, timestamp: Date.now() });
  }

  recordJourneyConversion(journeyId: string, journeyName?: string, sessionId?: string, converted = true) {
    this.record({ type: 'journey_conversion', journeyId, journeyName, sessionId, converted, timestamp: Date.now() });
  }

  recordRouteConfidence(journeyId: string, stage: string, confidence: number, sessionId?: string) {
    this.record({ type: 'route_confidence', journeyId, stage, confidence, sessionId, timestamp: Date.now() });
  }

  recordModuleUsage(module: string, journeyId: string, sessionId?: string, confidence?: number, stage?: string) {
    this.record({ type: 'module_usage', module, journeyId, sessionId, confidence, stage, timestamp: Date.now() });
  }

  snapshot(): JourneyTelemetrySnapshot {
    const byType: Record<string, number> = {};
    const byJourney: Record<string, number> = {};

    for (const event of this.events) {
      byType[event.type] = (byType[event.type] ?? 0) + 1;
      if (event.journeyId) {
        byJourney[event.journeyId] = (byJourney[event.journeyId] ?? 0) + 1;
      }
    }

    return {
      totalEvents: this.events.length,
      byType,
      byJourney,
      lastEvent: this.events[this.events.length - 1],
    };
  }

  recent(count = 50) { return this.events.slice(-count); }

  reset() { this.events = []; }
}

export const journeyTelemetry = new JourneyTelemetry();
