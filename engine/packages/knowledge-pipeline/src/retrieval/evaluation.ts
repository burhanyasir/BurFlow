import { RetrievalResult, EvaluationResult } from '../types';
import { Evaluator } from '../interfaces';

export class RetrievalEvaluator implements Evaluator {
  async evaluate(query: string, relevantChunkIds: string[], results: RetrievalResult): Promise<EvaluationResult> {
    const retrievedIds = results.chunks.map(c => c.chunkId);
    const retrievedSet = new Set(retrievedIds);
    const relevantSet = new Set(relevantChunkIds);

    const truePositives = retrievedIds.filter(id => relevantSet.has(id)).length;
    const falsePositives = retrievedIds.filter(id => !relevantSet.has(id)).length;
    const falseNegatives = relevantChunkIds.filter(id => !retrievedSet.has(id)).length;

    const recallAtK = relevantChunkIds.length > 0 ? truePositives / relevantChunkIds.length : 0;
    const precisionAtK = retrievedIds.length > 0 ? truePositives / retrievedIds.length : 0;

    const mrr = this.computeMRR(retrievedIds, relevantSet);
    const ndcgAtK = this.computeNDCG(retrievedIds, relevantSet);

    const hitRate = truePositives > 0 ? 1 : 0;

    const emptyRetrieval = retrievedIds.length === 0 ? 1 : 0;
    const emptyRetrievalRate = emptyRetrieval;

    const duplicates = retrievedIds.length - new Set(retrievedIds).size;
    const duplicateChunkRatio = retrievedIds.length > 0 ? duplicates / retrievedIds.length : 0;

    return {
      recallAtK,
      precisionAtK,
      mrr,
      ndcgAtK,
      hitRate,
      retrievalLatencyMs: results.retrievalTimeMs,
      duplicateChunkRatio,
      emptyRetrievalRate,
    };
  }

  private computeMRR(retrievedIds: string[], relevantSet: Set<string>): number {
    for (let i = 0; i < retrievedIds.length; i++) {
      if (relevantSet.has(retrievedIds[i])) return 1 / (i + 1);
    }
    return 0;
  }

  private computeNDCG(retrievedIds: string[], relevantSet: Set<string>): number {
    let dcg = 0;
    let idcg = 0;

    for (let i = 0; i < retrievedIds.length; i++) {
      const rel = relevantSet.has(retrievedIds[i]) ? 1 : 0;
      dcg += rel / Math.log2(i + 2);
    }

    const numRelevant = relevantSet.size;
    for (let i = 0; i < Math.min(retrievedIds.length, numRelevant); i++) {
      idcg += 1 / Math.log2(i + 2);
    }

    return idcg > 0 ? dcg / idcg : 0;
  }
}
