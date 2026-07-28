import {
  KnowledgeBaseProvider,
  KnowledgeEntry,
  DefaultKnowledgeBaseProvider,
  DiscernedTopic,
} from '@conversation-engine/conversation-orchestrator';
import { TopicResponseTemplateRepository } from '@conversation-engine/saas-core';

export class DbKnowledgeBaseProvider implements KnowledgeBaseProvider {
  private fallback: KnowledgeBaseProvider;

  constructor(
    private repo: TopicResponseTemplateRepository,
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
    const dbTopics = this.repo.findByTenant(tenantId).map(r => r.topic);
    const defaultTopics = this.fallback.getAvailableTopics(tenantId);
    return [...new Set([...dbTopics, ...defaultTopics])];
  }
}
