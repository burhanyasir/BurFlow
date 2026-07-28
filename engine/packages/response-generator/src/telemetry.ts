import { TelemetryEvent, TelemetryCollector, TelemetrySnapshot } from './types';

export class Telemetry implements TelemetryCollector {
  private events: TelemetryEvent[] = [];
  private maxEvents: number;

  constructor(maxEvents = 10000) {
    this.maxEvents = maxEvents;
  }

  record(event: TelemetryEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  snapshot(): TelemetrySnapshot {
    const total = this.events.length;
    if (total === 0) return { totalRequests: 0, totalTokens: 0, totalCost: 0, avgLatencyMs: 0, errorRate: 0, cacheHitRate: 0, providerBreakdown: {} };

    const successes = this.events.filter(e => e.success).length;
    const cached = this.events.filter(e => e.cached).length;
    const totalTokens = this.events.reduce((s, e) => s + e.totalTokens, 0);
    const totalCost = this.events.reduce((s, e) => s + e.estimatedCost, 0);
    const avgLatencyMs = Math.round(this.events.reduce((s, e) => s + e.latencyMs, 0) / total);

    const providerBreakdown: Record<string, number> = {};
    for (const e of this.events) {
      providerBreakdown[e.provider] = (providerBreakdown[e.provider] || 0) + 1;
    }

    return {
      totalRequests: total,
      totalTokens,
      totalCost: Math.round(totalCost * 100000) / 100000,
      avgLatencyMs,
      errorRate: total > 0 ? Math.round((1 - successes / total) * 10000) / 100 : 0,
      cacheHitRate: total > 0 ? Math.round((cached / total) * 10000) / 100 : 0,
      providerBreakdown,
    };
  }

  recent(count = 20): TelemetryEvent[] {
    return this.events.slice(-count);
  }
}

const COST_TABLE: Record<string, Record<string, { input: number; output: number } | undefined>> = {
  openai: {
    'gpt-4o-mini': { input: 0.0015, output: 0.006 },
    'gpt-4o': { input: 0.01, output: 0.03 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
  },
  anthropic: {
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  },
  openrouter: {},
  local: {},
};

const DEFAULT_COST_RATES = { input: 0.002, output: 0.008 };

export function estimateCost(provider: string, model: string, promptTokens: number, completionTokens: number): number {
  const rates = COST_TABLE[provider]?.[model] || DEFAULT_COST_RATES;
  return (promptTokens / 1000) * rates.input + (completionTokens / 1000) * rates.output;
}
