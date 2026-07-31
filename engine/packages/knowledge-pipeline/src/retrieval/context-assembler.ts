import { VectorSearchResult, ContextAssemblyResult, EvidenceCitation } from '../types';
import { ContextAssembler } from '../interfaces';

export class DefaultContextAssembler implements ContextAssembler {
  async assemble(
    results: VectorSearchResult[],
    tokenBudget: number,
    documents: Map<string, { title: string; sourceType: string }>,
  ): Promise<ContextAssemblyResult> {
    const seen = new Set<string>();
    const unique: VectorSearchResult[] = [];

    for (const r of results) {
      if (!seen.has(r.chunkId)) {
        seen.add(r.chunkId);
        unique.push(r);
      }
    }

    unique.sort((a, b) => {
      const posA = (a.metadata as any)?.position ?? 0;
      const posB = (b.metadata as any)?.position ?? 0;
      return posA - posB;
    });

    const selected: VectorSearchResult[] = [];
    let totalTokens = 0;
    const citations: EvidenceCitation[] = [];

    for (const r of unique) {
      const tokens = Math.ceil(r.content.length / 4);
      if (totalTokens + tokens > tokenBudget) break;

      selected.push(r);
      totalTokens += tokens;

      const docInfo = documents.get(r.documentId) || { title: r.documentId, sourceType: 'text' as const };
      const score = r.score;
      const confidence = Math.min(1, Math.max(0, score));
      const sourceStrength = typeof (r.metadata as any)?.sourceStrength === 'number' ? (r.metadata as any).sourceStrength : undefined;
      citations.push({
        chunkId: r.chunkId,
        documentId: r.documentId,
        documentTitle: docInfo.title,
        sourceType: docInfo.sourceType as any,
        sectionPath: (r.metadata as any)?.sectionPath || '',
        snippet: r.content.slice(0, 200),
        score,
        confidence,
        sourceStrength,
      });
    }

    const context = selected.map((r, i) => {
      const meta = r.metadata as any;
      const source = meta?.originalName || r.documentId;
      const section = meta?.sectionPath ? ` (Section ${meta.sectionPath})` : '';
      return `[Source ${i + 1}: ${source}${section}]\n${r.content}`;
    }).join('\n\n');

    return { context, chunks: selected, tokenCount: totalTokens, citations };
  }
}
