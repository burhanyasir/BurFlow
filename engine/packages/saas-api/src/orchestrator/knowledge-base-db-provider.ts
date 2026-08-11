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

  constructor(
    private repo: TopicResponseTemplateRepository,
    private db?: SqlDatabase,
    fallback?: KnowledgeBaseProvider,
  ) {
    this.fallback = fallback || new DefaultKnowledgeBaseProvider();
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
    if (!this.db) return '';
    const cached = this.crawledChunksCache.get(tenantId);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) return cached.text;

    try {
      const rows = this.db.prepare(
        `SELECT chunk_data FROM knowledge_snapshots WHERE tenant_id = ? ORDER BY published_at DESC LIMIT 10`
      ).all(tenantId) as Array<{ chunk_data: string }>;
      if (!rows.length) return '';

      // Each chunk_data is a JSON array of chunks
      const allChunks = rows.flatMap(r => {
        try { return JSON.parse(r.chunk_data || '[]'); } catch { return []; }
      });
      if (!allChunks.length) return '';

      const parts = allChunks.map(chunk => {
        const title = chunk.title || chunk.document_id || '';
        return title ? `[${title}] ${chunk.content}` : chunk.content;
      });
      const text = parts.join('\n\n');
      this.crawledChunksCache.set(tenantId, { text, ts: Date.now() });
      return text;
    } catch {
      return '';
    }
  }
}
