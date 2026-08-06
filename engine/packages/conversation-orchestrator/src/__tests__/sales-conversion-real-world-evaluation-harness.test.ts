import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import { runSalesConversionRealWorldBenchmark } from '../sales-conversion-real-world-evaluation-harness';

describe('sales conversion real-world evaluation harness', () => {
  it('runs the real-world benchmark and returns metrics and report paths', async () => {
    const result = await runSalesConversionRealWorldBenchmark();

    expect(result.reportPath).toContain('SALES_CONVERSION_REAL_WORLD_BENCHMARK.md');
    expect(result.freezeReportPath).toContain('SALES_CONVERSION_REAL_WORLD_FREEZE_REPORT.md');
    expect(result.outcomes.length).toBeGreaterThanOrEqual(100);
    expect(result.metrics).toHaveProperty('accuracy');
    expect(result.metrics).toHaveProperty('perIndustryAccuracy');
    expect(result.syntheticMetrics).toHaveProperty('accuracy');
    expect(result.syntheticComparison).toHaveProperty('deltaAccuracy');

    const reportContent = await fs.readFile(result.reportPath, 'utf8');
    expect(reportContent).toContain('## Ranked failure modes');
    expect(reportContent).toContain('Failure categories:');
  });
});
