import { describe, it, expect } from 'vitest';
import { runSalesConversionBenchmark } from '../sales-conversion-evaluation-harness';

describe('sales conversion evaluation harness', () => {
  it('runs the benchmark and returns a report path with metrics', async () => {
    const result = await runSalesConversionBenchmark();

    expect(result.reportPath).toContain('SALES_CONVERSION_FINAL_BENCHMARK.md');
    expect(result.freezeReportPath).toContain('SALES_CONVERSION_FREEZE_REPORT.md');
    expect(result.outcomes.length).toBeGreaterThan(0);
    expect(result.metrics).toHaveProperty('accuracy');
    expect(result.metrics).toHaveProperty('perIndustryAccuracy');
  });
});
