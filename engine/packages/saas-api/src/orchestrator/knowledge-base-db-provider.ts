import {
  KnowledgeBaseProvider,
  KnowledgeEntry,
  DefaultKnowledgeBaseProvider,
  DiscernedTopic,
  fuzzyResolveTopic,
} from '@conversation-engine/conversation-orchestrator';
import { TopicResponseTemplateRepository } from '@conversation-engine/saas-core';
import type { SqlDatabase } from '@conversation-engine/saas-core';

export class DbKnowledgeBaseProvider implements KnowledgeBaseProvider {
  private fallback: KnowledgeBaseProvider;
  private crawledChunksCache = new Map<string, { text: string; ts: number }>();
  private CACHE_TTL = 60_000;
  /** Hard cap on knowledge text injected into the LLM prompt (~2-3k tokens). */
  private static KNOWLEDGE_CHAR_BUDGET = 10_000;

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

    // Source 1: SQLite knowledge_snapshots (pipeline store)
    try {
      const rows = this.db.prepare(
        `SELECT chunk_data FROM knowledge_snapshots WHERE tenant_id = ? ORDER BY published_at DESC LIMIT 10`
      ).all(tenantId) as Array<{ chunk_data: string }>;
      console.log(`[KnowledgeLookup] tenantId=${tenantId} — found ${rows.length} snapshot rows in SQLite`);
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

    // Source 2: PostgreSQL kb_chunks (persistent — survives Render deploys)
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

    console.log(`[KnowledgeLookup] tenantId=${tenantId} — no knowledge found in any source`);
    return '';
  }
}
