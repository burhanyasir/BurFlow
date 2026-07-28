// ─── In-Memory Metrics ────────────────────────────────────────
// Simple counters and histograms for production observability.
// No external dependencies. Can be replaced with Prometheus/OpenTelemetry later.

interface HistogramBuckets {
  boundaries: number[];
  counts: number[];
  sum: number;
  count: number;
  min: number;
  max: number;
}

export class Metrics {
  private counters = new Map<string, number>();
  private histograms = new Map<string, HistogramBuckets>();

  private static DEFAULT_BOUNDARIES = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

  increment(name: string, value = 1): void {
    this.counters.set(name, (this.counters.get(name) || 0) + value);
  }

  decrement(name: string, value = 1): void {
    this.counters.set(name, (this.counters.get(name) || 0) - value);
  }

  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  record(name: string, valueMs: number, boundaries?: number[]): void {
    const bounds = boundaries || Metrics.DEFAULT_BOUNDARIES;
    let hist = this.histograms.get(name);
    if (!hist) {
      hist = {
        boundaries: bounds,
        counts: new Array(bounds.length + 1).fill(0),
        sum: 0,
        count: 0,
        min: Infinity,
        max: -Infinity,
      };
      this.histograms.set(name, hist);
    }

    hist.sum += valueMs;
    hist.count += 1;
    if (valueMs < hist.min) hist.min = valueMs;
    if (valueMs > hist.max) hist.max = valueMs;

    let bucketIdx = bounds.length;
    for (let i = 0; i < bounds.length; i++) {
      if (valueMs <= bounds[i]) {
        bucketIdx = i;
        break;
      }
    }
    hist.counts[bucketIdx] += 1;
  }

  getHistogram(name: string): { count: number; sum: number; min: number; max: number; avg: number; p50: number; p95: number; p99: number } | undefined {
    const hist = this.histograms.get(name);
    if (!hist || hist.count === 0) return undefined;
    return {
      count: hist.count,
      sum: hist.sum,
      min: hist.min,
      max: hist.max,
      avg: Math.round(hist.sum / hist.count),
      p50: this.percentile(hist, 0.5),
      p95: this.percentile(hist, 0.95),
      p99: this.percentile(hist, 0.99),
    };
  }

  private percentile(hist: HistogramBuckets, p: number): number {
    const target = Math.ceil(hist.count * p);
    let cumulative = 0;
    for (let i = 0; i < hist.counts.length; i++) {
      cumulative += hist.counts[i];
      if (cumulative >= target) {
        return i < hist.boundaries.length ? hist.boundaries[i] : hist.boundaries[hist.boundaries.length - 1];
      }
    }
    return hist.boundaries[hist.boundaries.length - 1];
  }

  getAll(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [name, value] of this.counters) {
      result[name] = { type: 'counter', value };
    }
    for (const [name] of this.histograms) {
      result[name] = { type: 'histogram', ...this.getHistogram(name) };
    }
    return result;
  }

  reset(): void {
    this.counters.clear();
    this.histograms.clear();
  }
}

export const metrics = new Metrics();
