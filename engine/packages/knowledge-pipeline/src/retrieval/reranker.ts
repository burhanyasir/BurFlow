import { VectorSearchResult } from '../types';
import { Reranker } from '../interfaces';

const RELEVANCE_THRESHOLD = 0.25;
const MIN_TERM_MATCH_RATIO = 0.2;

export class CrossEncoderReranker implements Reranker {
  async rerank(query: string, results: VectorSearchResult[], topK: number): Promise<VectorSearchResult[]> {
    const scored = results.map(r => ({
      ...r,
      originalScore: r.score,
      score: this.computeRelevance(query, r.content, r.score),
    }));

    scored.sort((a, b) => b.score - a.score);

    // Keep valid results even when the query is generic or the text does not contain
    // every query term. The score is still used to rank and threshold the final list.
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const filtered = queryTerms.length > 0
      ? scored.filter(r => {
          const contentLower = r.content.toLowerCase();
          const matches = queryTerms.filter(t => contentLower.includes(t)).length;
          const matchRatio = matches / queryTerms.length;
          return matchRatio >= MIN_TERM_MATCH_RATIO || r.originalScore >= RELEVANCE_THRESHOLD;
        })
      : scored;

    // Apply relevance threshold filter
    const thresholded = filtered.filter(r => r.score >= RELEVANCE_THRESHOLD);

    return thresholded
      .map(({ originalScore, ...result }) => result as VectorSearchResult)
      .slice(0, topK);
  }

  private computeRelevance(query: string, content: string, vectorScore: number): number {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const contentLower = content.toLowerCase();
    let termMatches = 0;
    for (const term of queryTerms) {
      if (contentLower.includes(term)) termMatches++;
    }
    const termRatio = queryTerms.length > 0 ? termMatches / queryTerms.length : 0;
    return vectorScore * 0.6 + termRatio * 0.4;
  }
}

export class PassThroughReranker implements Reranker {
  async rerank(_query: string, results: VectorSearchResult[], topK: number): Promise<VectorSearchResult[]> {
    return results.slice(0, topK);
  }
}
