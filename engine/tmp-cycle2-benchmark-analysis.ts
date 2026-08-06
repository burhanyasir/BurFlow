import { runSalesConversionBenchmark } from './packages/conversation-orchestrator/src/sales-conversion-evaluation-harness.ts';
import { runSalesConversionRealWorldBenchmark } from './packages/conversation-orchestrator/src/sales-conversion-real-world-evaluation-harness.ts';

async function summarize() {
  const synthetic = await runSalesConversionBenchmark();
  const real = await runSalesConversionRealWorldBenchmark();
  const failureCounts = real.outcomes.flatMap(o => o.failureCategories).reduce((acc, cat) => {
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const confusion = {
    nextStep: real.metrics.confusionMatrix.nextStep,
    ctaId: real.metrics.confusionMatrix.ctaId,
  };
  console.log(JSON.stringify({
    synthetic: {
      accuracy: synthetic.metrics.accuracy,
      aspectAccuracy: synthetic.metrics.aspectAccuracy,
      binaryMetrics: synthetic.metrics.binaryMetrics,
    },
    real: {
      accuracy: real.metrics.accuracy,
      aspectAccuracy: real.metrics.aspectAccuracy,
      binaryMetrics: real.metrics.binaryMetrics,
      confusion,
      failureCounts,
    },
  }, null, 2));
}

summarize().catch((error) => {
  console.error(error);
  process.exit(1);
});
