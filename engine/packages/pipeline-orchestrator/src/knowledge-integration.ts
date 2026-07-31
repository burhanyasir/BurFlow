import { TurnContext } from '@conversation-engine/core-types';
import { KnowledgeRetriever } from '@conversation-engine/knowledge-pipeline';
import { createLogger } from '@conversation-engine/logger';

const logger = createLogger('knowledge-integration');

const GREETING_PATTERN = /^(hi|hello|hey|good morning|good afternoon|good evening|greetings|thanks|thank you)\b/i;
const MIN_CONFIDENCE_FLOOR = 0.5;

export async function enrichContextWithKnowledge(
  context: TurnContext,
  retriever: KnowledgeRetriever,
  tenantId: string,
): Promise<void> {
  try {
    const msg = (context.message || '').trim();

    if (!msg) {
      (context as any).isGreeting = false;
      (context as any).knowledgeResults = [];
      (context as any).knowledgeCitations = [];
      (context as any).knowledgeEvidenceConfidence = 0;
      (context as any).knowledgeLowConfidence = false;
      logger.info('Empty message received, skipping knowledge retrieval');
      return;
    }

    // Bypass RAG for greetings
    if (GREETING_PATTERN.test(msg) && msg.split(/\s+/).length < 6) {
      (context as any).isGreeting = true;
      (context as any).knowledgeResults = [];
      (context as any).knowledgeCitations = [];
      logger.info({ message: msg }, 'Greeting detected, skipping knowledge retrieval');
      return;
    }

    const startTime = performance.now();

    const results = await retriever.retrieve({
      query: context.message,
      tenantId,
      topK: 5,
      threshold: 0.35,
      useHybridSearch: true,
      useReranker: true,
    });

    if (results.chunks.length > 0) {
      const topScore = results.chunks[0].score;

      // RAG guardrail: if top result is below confidence floor, mark as low confidence
      const baselineConfidence = Math.min(1, Math.max(0, topScore));
      (context as any).knowledgeEvidenceConfidence = baselineConfidence;
      if (topScore < MIN_CONFIDENCE_FLOOR) {
        (context as any).knowledgeLowConfidence = true;
        (context as any).knowledgeResults = results.chunks.map(c => ({
          title: (c.metadata as any)?.title || (c.metadata as any)?.originalName || 'Knowledge',
          content: c.content,
          source: (c.metadata as any)?.sectionPath
            ? `${(c.metadata as any)?.originalName || 'Document'} (Section ${(c.metadata as any)?.sectionPath})`
            : (c.metadata as any)?.originalName || undefined,
          documentId: c.documentId,
          score: c.score,
          confidence: c.confidence || 0,
          sourceType: (c.metadata as any)?.sourceType || undefined,
        }));
        (context as any).knowledgeCitations = results.chunks.map(c => ({
          documentId: c.documentId,
          documentTitle: (c.metadata as any)?.title || (c.metadata as any)?.originalName || 'Knowledge',
          sectionPath: (c.metadata as any)?.sectionPath || '',
          snippet: c.content.slice(0, 200),
          score: c.score,
          confidence: c.confidence || 0,
          sourceType: (c.metadata as any)?.sourceType || 'text',
        }));

        logger.warn({ topScore, baselineConfidence, chunkCount: results.chunks.length, retrievalTimeMs: Math.round(performance.now() - startTime) }, 'Low confidence knowledge retrieval, guardrail activated');
        return;
      }

      const knowledgeResults = results.chunks.map(c => ({
        title: (c.metadata as any)?.title || (c.metadata as any)?.originalName || 'Knowledge',
        content: c.content,
        source: (c.metadata as any)?.sectionPath
          ? `${(c.metadata as any)?.originalName || 'Document'} (Section ${(c.metadata as any)?.sectionPath})`
          : (c.metadata as any)?.originalName || undefined,
        documentId: c.documentId,
        score: c.score,
        confidence: c.confidence || 0,
        sourceType: (c.metadata as any)?.sourceType || undefined,
      }));

      (context as any).knowledgeResults = knowledgeResults;
      (context as any).knowledgeCitations = results.chunks.map(c => ({
        documentId: c.documentId,
        documentTitle: (c.metadata as any)?.title || (c.metadata as any)?.originalName || 'Knowledge',
        sectionPath: (c.metadata as any)?.sectionPath || '',
        snippet: c.content.slice(0, 200),
        score: c.score,
        confidence: c.confidence || 0,
        sourceType: (c.metadata as any)?.sourceType || 'text',
      }));

      logger.info({ topScore, chunkCount: results.chunks.length, retrievalTimeMs: Math.round(performance.now() - startTime) }, 'Knowledge context enriched');
    } else {
      // No chunks found above threshold — mark as no knowledge
      (context as any).knowledgeLowConfidence = false;
      (context as any).knowledgeEvidenceConfidence = 0;
      (context as any).knowledgeResults = [];
      (context as any).knowledgeCitations = [];
      logger.info({ retrievalTimeMs: Math.round(performance.now() - startTime) }, 'No relevant knowledge found');
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Knowledge retrieval failed, continuing without knowledge context');
  }
}
