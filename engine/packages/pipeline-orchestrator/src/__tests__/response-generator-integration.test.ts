import { describe, it, expect } from 'vitest';
import { buildGeneratorInput } from '../response-generator-integration';
import type { TurnContext } from '@conversation-engine/core-types';

describe('Response generator integration', () => {
  it('passes knowledge citations and confidence through generator input', () => {
    const context = {
      message: 'Tell me about security',
      conversationHistory: [{ role: 'user', content: 'Tell me about security.' }],
      sessionState: { data: {} },
      tenantConfig: { llm: { model: 'test', temperature: 0.7, maxTokens: 512 } },
      intent: { intent: 'security_question' },
      knowledgeResults: [
        { title: 'Security', content: 'We encrypt data.', source: 'Security Guide', documentId: 'doc1', score: 0.88, confidence: 0.88, sourceType: 'text' },
      ],
      knowledgeCitations: [
        { documentId: 'doc1', documentTitle: 'Security Guide', sectionPath: '1', snippet: 'We encrypt data.', score: 0.88, confidence: 0.88, sourceType: 'text' },
      ],
      knowledgeEvidenceConfidence: 0.88,
      knowledgeLowConfidence: false,
    } as unknown as TurnContext;

    const input = buildGeneratorInput(context);
    expect(input).not.toBeNull();
    expect(input?.knowledgeResults[0].documentId).toBe('doc1');
    expect(input?.knowledgeResults[0].confidence).toBe(0.88);
    expect(input?.knowledgeCitations?.[0].documentTitle).toBe('Security Guide');
    expect(input?.knowledgeEvidenceConfidence).toBe(0.88);
    expect(input?.knowledgeLowConfidence).toBe(false);
  });
});
