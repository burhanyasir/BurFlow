import {
  KnowledgeBaseProvider,
  KnowledgeEntry,
  DefaultKnowledgeBaseProvider,
  DiscernedTopic,
  fuzzyResolveTopic,
} from '@conversation-engine/conversation-orchestrator';
import { TopicResponseTemplateRepository } from '@conversation-engine/saas-core';
import type { SqlDatabase } from '@conversation-engine/saas-core';

/** Cosine similarity between two vectors. */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** Deserialize float32 array from Buffer (little-endian). */
function deserializeEmbedding(buf: Buffer): number[] {
  const floats = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  return Array.from(floats);
}

export class DbKnowledgeBaseProvider implements KnowledgeBaseProvider {
  private fallback: KnowledgeBaseProvider;
  private crawledChunksCache = new Map<string, { text: string; ts: number }>();
  private vectorCache = new Map<string, { chunks: Array<{ content: string; embedding: number[]; title: string }>; ts: number }>();
  private CACHE_TTL = 60_000;
  /** Hard cap on knowledge text injected into the LLM prompt (~2-3k tokens). */
  private static KNOWLEDGE_CHAR_BUDGET = 10_000;
  /** Max chunks to inject when using vector search (much smaller than dump-all). */
  private static VECTOR_TOP_K = 6;
  /** Minimum cosine similarity threshold — below this, don't inject. */
  private static VECTOR_MIN_SCORE = 0.25;

  constructor(
    private repo: TopicResponseTemplateRepository,
    private db?: SqlDatabase,
    fallback?: KnowledgeBaseProvider,
    private pgDb?: SqlDatabase,
  ) {
    this.fallback = fallback || new DefaultKnowledgeBaseProvider();
  }

  /** Truncate assembled text to the char budget, clipping on a chunk boundary. */
  private truncateToBudget(parts: string[], tenantId: string): string {
    const budget = DbKnowledgeBaseProvider.KNOWLEDGE_CHAR_BUDGET;
    let total = 0;
    const kept: string[] = [];
    for (const part of parts) {
      const partLen = part.length + (kept.length > 0 ? 2 : 0); // +2 for \n\n separator
      if (total + partLen > budget) {
        console.log(`[KnowledgeLookup] tenantId=${tenantId} — clipped at ${kept.length}/${parts.length} chunks (${total} chars)`);
        break;
      }
      kept.push(part);
      total += partLen;
    }
    return kept.join('\n\n');
  }

  getTopicResponse(topic: DiscernedTopic, tenantId: string, depth: number): KnowledgeEntry | null {
    const rows = this.repo.findByTenantTopic(tenantId, topic);
    const row = rows.find(r => r.depth === depth);
    if (row) {
      return { answer: row.answer, sources: JSON.parse(row.sources || '[]') };
    }
    return this.fallback.getTopicResponse(topic, tenantId, depth);
  }

  getAvailableTopics(tenantId: string): DiscernedTopic[] {
    const dbTopics = this.repo.findByTenant(tenantId).map(r => r.topic as DiscernedTopic);
    const defaultTopics = this.fallback.getAvailableTopics(tenantId);
    return Array.from(new Set([...dbTopics, ...defaultTopics])) as DiscernedTopic[];
  }

  resolveTopic(rawQuery: string, tenantId: string): DiscernedTopic | null {
    const available = this.getAvailableTopics(tenantId);
    return fuzzyResolveTopic(rawQuery, available);
  }

  getBusinessKnowledge(tenantId: string): string {
    if (!this.db) {
      console.log(`[KnowledgeLookup] No DB configured — returning empty for tenant ${tenantId}`);
      return '';
    }
    const cached = this.crawledChunksCache.get(tenantId);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      console.log(`[KnowledgeLookup] Cache hit for tenant ${tenantId} (${cached.text.length} chars)`);
      return cached.text;
    }

    // C4: Postgres is the primary source of truth (survives Render deploys)
    if (this.pgDb) {
      try {
        const pgRows = this.pgDb.prepare(
          `SELECT kc.content, kc.metadata FROM kb_chunks kc
           WHERE kc.tenant_id = ? AND kc.content IS NOT NULL AND LENGTH(kc.content) > 0
           ORDER BY kc.created_at DESC LIMIT 50`
        ).all(tenantId) as Array<{ content: string; metadata: string }>;
        console.log(`[KnowledgeLookup] tenantId=${tenantId} — found ${pgRows.length} chunks in PostgreSQL kb_chunks`);
        if (pgRows.length > 0) {
          const parts = pgRows.map(r => {
            let title = '';
            try { title = JSON.parse(r.metadata || '{}').title || ''; } catch {}
            return title ? `[${title}] ${r.content}` : r.content;
          });
          const text = this.truncateToBudget(parts, tenantId);
          console.log(`[KnowledgeLookup] tenantId=${tenantId} — assembled ${text.length} chars from PostgreSQL kb_chunks`);
          this.crawledChunksCache.set(tenantId, { text, ts: Date.now() });
          return text;
        }
      } catch (err) {
        console.error(`[KnowledgeLookup] PostgreSQL kb_chunks lookup error for tenant ${tenantId}:`, err);
      }
    }

    // Fallback: SQLite knowledge_snapshots (warm cache — wiped on Render deploys)
    try {
      const rows = this.db.prepare(
        `SELECT chunk_data FROM knowledge_snapshots WHERE tenant_id = ? ORDER BY published_at DESC LIMIT 10`
      ).all(tenantId) as Array<{ chunk_data: string }>;
      console.log(`[KnowledgeLookup] tenantId=${tenantId} — found ${rows.length} snapshot rows in SQLite (fallback)`);
      if (rows.length > 0) {
        const allChunks = rows.flatMap(r => {
          try { return JSON.parse(r.chunk_data || '[]'); } catch { return []; }
        });
        console.log(`[KnowledgeLookup] tenantId=${tenantId} — parsed ${allChunks.length} total chunks from SQLite`);
        if (allChunks.length > 0) {
          const parts = allChunks.map(chunk => {
            const title = chunk.title || chunk.metadata?.title || chunk.documentId || chunk.document_id || '';
            return title ? `[${title}] ${chunk.content}` : chunk.content;
          });
          const text = this.truncateToBudget(parts, tenantId);
          console.log(`[KnowledgeLookup] tenantId=${tenantId} — assembled ${text.length} chars from SQLite snapshots`);
          this.crawledChunksCache.set(tenantId, { text, ts: Date.now() });
          return text;
        }
      }
    } catch (err) {
      console.error(`[KnowledgeLookup] SQLite snapshot lookup error for tenant ${tenantId}:`, err);
    }

    console.log(`[KnowledgeLookup] tenantId=${tenantId} — no knowledge found in any source`);
    return '';
  }

  /** Load all chunks with embeddings from PG for vector search. */
  private loadVectorChunks(tenantId: string): Array<{ content: string; embedding: number[]; title: string }> {
    const cached = this.vectorCache.get(tenantId);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) return cached.chunks;

    if (!this.pgDb) return [];

    try {
      const rows = this.pgDb.prepare(
        `SELECT kc.content, kc.embedding, kc.metadata FROM kb_chunks kc
         WHERE kc.tenant_id = ? AND kc.content IS NOT NULL AND LENGTH(kc.content) > 0
         AND kc.embedding IS NOT NULL AND LENGTH(kc.embedding) > 0
         ORDER BY kc.created_at DESC LIMIT 200`
      ).all(tenantId) as Array<{ content: string; embedding: Buffer; metadata: string }>;

      const chunks = rows.map(r => {
        let title = '';
        try { title = JSON.parse(r.metadata || '{}').title || ''; } catch {}
        return {
          content: r.content,
          embedding: deserializeEmbedding(r.embedding),
          title,
        };
      });

      this.vectorCache.set(tenantId, { chunks, ts: Date.now() });
      return chunks;
    } catch (err) {
      console.error(`[VectorSearch] PG chunk load error for tenant ${tenantId}:`, err);
      return [];
    }
  }

  /** Embed the user query via OpenRouter/OpenAI embedding API. */
  private async embedQuery(query: string): Promise<number[] | null> {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    const apiUrl = process.env.OPENROUTER_API_KEY
      ? 'https://openrouter.ai/api/v1/embeddings'
      : 'https://api.openai.com/v1/embeddings';

    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'openai/text-embedding-3-small',
          input: query.slice(0, 8000), // embedding model input limit
        }),
      });

      if (!resp.ok) {
        console.error(`[VectorSearch] Embedding API error: ${resp.status}`);
        return null;
      }

      const data = await resp.json() as any;
      return data.data?.[0]?.embedding || null;
    } catch (err) {
      console.error(`[VectorSearch] Embedding API call failed:`, err);
      return null;
    }
  }

  /**
   * Vector search: embed query → cosine top-k over tenant chunks → inject relevant text.
   * Returns empty string if vector search unavailable; caller falls back to getBusinessKnowledge.
   */
  async getRelevantKnowledge(query: string, tenantId: string): Promise<string> {
    const chunks = this.loadVectorChunks(tenantId);
    if (chunks.length === 0) {
      console.log(`[VectorSearch] No vector chunks for tenant ${tenantId} — falling back to dump`);
      return '';
    }

    const queryEmbedding = await this.embedQuery(query);
    if (!queryEmbedding) {
      console.log(`[VectorSearch] Embedding failed — falling back to dump for tenant ${tenantId}`);
      return '';
    }

    // Score and rank
    const scored = chunks
      .map(c => ({
        ...c,
        score: cosineSimilarity(queryEmbedding, c.embedding),
      }))
      .filter(c => c.score >= DbKnowledgeBaseProvider.VECTOR_MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, DbKnowledgeBaseProvider.VECTOR_TOP_K);

    if (scored.length === 0) {
      console.log(`[VectorSearch] No chunks above threshold for tenant ${tenantId} (best: ${chunks.map(c => cosineSimilarity(queryEmbedding, c.embedding)).sort((a, b) => b - a)[0]?.toFixed(3) || 'N/A'})`);
      return '';
    }

    console.log(`[VectorSearch] tenant=${tenantId} — top ${scored.length} chunks: ${scored.map(c => `[${c.score.toFixed(3)}] ${c.title || c.content.slice(0, 40)}`).join(', ')}`);

    const parts = scored.map(c => {
      return c.title ? `[${c.title}] ${c.content}` : c.content;
    });
    return this.truncateToBudget(parts, tenantId);
  }
}
