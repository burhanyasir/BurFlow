import { describe, it, expect } from 'vitest';
import {
  DefaultKnowledgeBaseProvider,
  fuzzyResolveTopic,
  simpleStem,
} from '../knowledge-base-provider';
import { processConversationBrain } from '../conversation-brain';
import { ConversationIntelligenceMemory } from '../conversation-intelligence-types';

const emptyMemory: ConversationIntelligenceMemory = {
  turns: [],
  persona: 'unknown',
  funnelStage: 'greeting',
  buyingIntentDetected: false,
  objections: [],
  qualificationState: { questionsAskedCount: 0, completed: false },
  repeatedPhraseCount: 0,
  topics: [],
};

const provider = new DefaultKnowledgeBaseProvider();
const TENANT = 'test-tenant';

describe('simpleStem', () => {
  it('strips plural -s', async () => {
    expect(simpleStem('features')).toBe('feature');
    expect(simpleStem('prices')).toBe('price');
  });

  it('strips -ing', async () => {
    expect(simpleStem('pricing')).toBe('pric');
    expect(simpleStem('onboarding')).toBe('onboard');
  });

  it('converts -tion to -te', async () => {
    expect(simpleStem('integration')).toBe('integrate');
  });

  it('strips -ed', async () => {
    expect(simpleStem('integrated')).toBe('integrat');
  });

  it('strips -ly', async () => {
    expect(simpleStem('quickly')).toBe('quick');
  });

  it('handles short words', async () => {
    expect(simpleStem('api')).toBe('api');
    expect(simpleStem('sso')).toBe('sso');
  });
});

describe('fuzzyResolveTopic', () => {
  it('matches "data protection" to security topic', async () => {
    const result = fuzzyResolveTopic('data protection', [
      'features', 'pricing', 'integrations', 'security', 'api', 'trial',
      'comparison', 'walkthrough', 'roi', 'soc2', 'sso', 'onboarding', 'developer', 'demo',
    ] as any);
    expect(result).toBe('security');
  });

  it('matches "single sign on" to sso topic', async () => {
    const result = fuzzyResolveTopic('single sign on', [
      'features', 'pricing', 'integrations', 'security', 'api', 'trial',
      'comparison', 'walkthrough', 'roi', 'soc2', 'sso', 'onboarding', 'developer', 'demo',
    ] as any);
    expect(result).toBe('sso');
  });

  it('matches "embed" to integrations topic', async () => {
    const result = fuzzyResolveTopic('embed code in my site', [
      'features', 'pricing', 'integrations', 'security', 'api', 'trial',
      'comparison', 'walkthrough', 'roi', 'soc2', 'sso', 'onboarding', 'developer', 'demo',
    ] as any);
    expect(result).toBe('integrations');
  });

  it('matches "webhook endpoint" to api topic', async () => {
    const result = fuzzyResolveTopic('webhook endpoint setup', [
      'features', 'pricing', 'integrations', 'security', 'api', 'trial',
      'comparison', 'walkthrough', 'roi', 'soc2', 'sso', 'onboarding', 'developer', 'demo',
    ] as any);
    expect(result).toBe('api');
  });

  it('returns null for unrelated query', async () => {
    const result = fuzzyResolveTopic('qwerty asdfgh zxcvbn', [
      'features', 'pricing', 'integrations', 'security', 'api', 'trial',
      'comparison', 'walkthrough', 'roi', 'soc2', 'sso', 'onboarding', 'developer', 'demo',
    ] as any);
    expect(result).toBeNull();
  });
});

describe('DefaultKnowledgeBaseProvider.resolveTopic', () => {
  it('resolves "data protection" to security', async () => {
    const result = provider.resolveTopic('data protection', TENANT);
    expect(result).toBe('security');
  });

  it('resolves "single sign on" to sso', async () => {
    const result = provider.resolveTopic('single sign on', TENANT);
    expect(result).toBe('sso');
  });

  it('returns null for gibberish', async () => {
    const result = provider.resolveTopic('asdfgh', TENANT);
    expect(result).toBeNull();
  });
});

describe('Live path: processConversationBrain with resolveTopic', () => {
  it('returns security content for "data protection" (regex miss, resolveTopic hit)', async () => {
    const result = await processConversationBrain({
      message: 'data protection',
      responseText: '',
      legacyMemory: emptyMemory,
      tenantId: TENANT,
      knowledgeBaseProvider: provider,
    });
    expect(result.responseText).toBeTruthy();
    expect(result.responseText).not.toBe('');
    expect(result.responseText.length).toBeGreaterThan(20);
  });

  it('returns sso content for "single sign on" via resolveTopic', async () => {
    const result = await processConversationBrain({
      message: 'single sign on',
      responseText: '',
      legacyMemory: emptyMemory,
      tenantId: TENANT,
      knowledgeBaseProvider: provider,
    });
    expect(result.responseText).toBeTruthy();
    expect(result.responseText.length).toBeGreaterThan(20);
  });

  it('returns api content for "webhook endpoint" via resolveTopic', async () => {
    const result = await processConversationBrain({
      message: 'webhook endpoint',
      responseText: '',
      legacyMemory: emptyMemory,
      tenantId: TENANT,
      knowledgeBaseProvider: provider,
    });
    expect(result.responseText).toBeTruthy();
    expect(result.responseText.length).toBeGreaterThan(20);
  });

  it('returns meaningful response for "embed code" (resolveTopic to integrations)', async () => {
    const result = await processConversationBrain({
      message: 'embed code',
      responseText: '',
      legacyMemory: emptyMemory,
      tenantId: TENANT,
      knowledgeBaseProvider: provider,
    });
    expect(result.responseText).toBeTruthy();
    expect(result.responseText.length).toBeGreaterThan(20);
  });

  it('produces different responses for different resolved topics', async () => {
    const securityResult = await processConversationBrain({
      message: 'data protection',
      responseText: '',
      legacyMemory: emptyMemory,
      tenantId: TENANT,
      knowledgeBaseProvider: provider,
    });
    const ssoResult = await processConversationBrain({
      message: 'single sign on',
      responseText: '',
      legacyMemory: emptyMemory,
      tenantId: TENANT,
      knowledgeBaseProvider: provider,
    });
    expect(securityResult.responseText).not.toBe(ssoResult.responseText);
  });
});
