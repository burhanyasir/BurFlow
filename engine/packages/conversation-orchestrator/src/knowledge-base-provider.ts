import { DiscernedTopic } from './conversation-memory';

export interface KnowledgeEntry {
  answer: string;
  sources?: string[];
}

export interface KnowledgeBaseProvider {
  getTopicResponse(topic: DiscernedTopic, tenantId: string, depth: number): KnowledgeEntry | null;
  getAvailableTopics(tenantId: string): DiscernedTopic[];
  resolveTopic?(rawQuery: string, tenantId: string): DiscernedTopic | null;
  getBusinessKnowledge?(tenantId: string): string;
  /** Vector search: embed query, cosine top-k over tenant chunks, return relevant text. */
  getRelevantKnowledge?(query: string, tenantId: string): string | Promise<string>;
}

export function simpleStem(word: string): string {
  const w = word.toLowerCase();
  if (w.length < 4) return w;
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('ves')) return w.slice(0, -3) + 'f';
  if (/[^aeiou](ss|sh|ch|x|z)es$/.test(w) && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  if (w.endsWith('ing')) {
    const base = w.slice(0, -3);
    if (base.length >= 3) return base;
    return base + 'e';
  }
  if (w.endsWith('ied') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('ed') && !w.endsWith('eed') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('tion')) return w.slice(0, -4) + 'te';
  if (w.endsWith('ment')) return w.slice(0, -4);
  if (w.endsWith('ness')) return w.slice(0, -4);
  if (w.endsWith('ly')) return w.slice(0, -2);
  if (w.endsWith('er') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('or') && w.length > 4) return w.slice(0, -2);
  return w;
}

const TOPIC_KEYWORDS: Record<DiscernedTopic, string[]> = {
  features: ['feature', 'capabilit', 'product', 'platform', 'what do you do', 'functionality'],
  pricing: ['price', 'pricing', 'cost', 'plan', 'tier', 'how much', 'subscription', 'overage'],
  integrations: ['integrat', 'zendesk', 'intercom', 'slack', 'widget', 'embed', 'plugin'],
  security: ['security', 'compliance', 'soc2', 'gdpr', 'hipaa', 'encrypt', 'privacy', 'data'],
  api: ['api', 'sdk', 'developer', 'code', 'webhook', 'rest', 'endpoint'],
  trial: ['trial', 'free', 'sandbox', 'get started'],
  comparison: ['compare', 'versus', 'competitor', 'alternative', 'difference'],
  walkthrough: ['walkthrough', 'how it work', 'pipeline', 'architecture', 'technical overview'],
  roi: ['roi', 'revenue', 'save money', 'payback', 'deflection'],
  soc2: ['soc', 'soc2', 'audit'],
  sso: ['sso', 'saml', 'okta', 'active directory', 'azure ad', 'sign on', 'single sign'],
  onboarding: ['setup', 'onboard', 'deploy', 'install', 'getting started', '10 minute'],
  developer: ['developer', 'dev', 'engineering', 'code', 'build'],
  demo: ['demo', 'schedule', 'see it'],
};

const DEFAULT_TEMPLATES: Record<DiscernedTopic, string[]> = {
  features: [
    'That depends on your specific needs — what matters most to your team?',
    'There are several capabilities worth highlighting. What area should I focus on?',
    'The key features vary by use case. What problem are you trying to solve?',
    'Let me narrow it down — what is the top priority for your situation?',
    'There is a lot to cover. Which part of the product are you most interested in?',
  ],
  pricing: [
    'Pricing depends on team size and usage. How many people would use it?',
    'The main pricing factor is volume. Can you share how many conversations you handle monthly?',
    'I can point you toward the right tier once I know a bit more about your setup.',
    'Pricing scales with your team. What is your current team size?',
    'There are a few tiers. Let me ask a couple questions to narrow it down.',
  ],
  security: [
    'What specific compliance requirements does your organization have?',
    'We cover the standard frameworks. Which certifications matter most for you?',
    'Security requirements vary by industry. What standards do you need to meet?',
    'I can address specific security concerns. What is your top priority?',
    'There are several layers to our security posture. What area should I cover first?',
  ],
  integrations: [
    'What tools does your team currently use?',
    'I can check compatibility. Which systems do you need to connect?',
    'There are several integration options. What is in your current stack?',
    'Which platforms are most important for your workflow?',
    'Let me see what fits. What are the key tools you rely on?',
  ],
  api: [
    'What are you looking to build or connect?',
    'I can point you to the right resources. What is your use case?',
    'The API covers a wide range of scenarios. What are you working on?',
    'What technical requirements do you have in mind?',
    'There are multiple ways to integrate. What approach are you considering?',
  ],
  roi: [
    'What metrics or outcomes are most important to your business?',
    'ROI varies by use case. What would success look like for you?',
    'I can help you think through the value. What is your current setup?',
    'The impact depends on your volume and processes. Can you share more about your situation?',
    'What results are you hoping to achieve?',
  ],
  soc2: [
    'What specific compliance standards does your organization need?',
    'Which certifications are you looking for?',
    'I can address compliance details. What requirements do you need to meet?',
    'What audit or compliance framework applies to your business?',
    'Let me know which standards matter most for your vendor review.',
  ],
  sso: [
    'What identity provider does your team use?',
    'I can walk through the SSO options. What authentication system are you on?',
    'Which SSO provider are you looking to integrate with?',
    'What is your current authentication setup?',
    'There are several SSO methods supported. Which one do you need?',
  ],
  walkthrough: [
    'What aspect of the product are you most interested in?',
    'I can walk through any part. Which area should I cover?',
    'What do you want to understand better?',
    'There are several things worth seeing. What is most relevant to you?',
    'Which part of the workflow would you like me to explain?',
  ],
  comparison: [
    'What criteria matter most for your decision?',
    'I can help you evaluate options. What factors are you comparing?',
    'What is most important to you in this comparison?',
    'Which aspects are you weighing?',
    'Let me know what you are comparing and I will focus on the key differences.',
  ],
  demo: [
    'What is the best way to reach you for scheduling?',
    'When works best for a walkthrough?',
    'I can set that up. What details should I pass along to the team?',
    'What time works best for a personalized demo?',
    'Who should we contact to schedule?',
  ],
  trial: [
    'What would you like to explore first?',
    'I can point you in the right direction. What is your main goal?',
    'Getting started takes a few minutes. What should I help you with first?',
    'What is the most important thing to try out?',
    'I can guide you through the first steps. Where would you like to start?',
  ],
  onboarding: [
    'What aspect of setup do you need help with?',
    'I can walk through the key steps. What is your current situation?',
    'Which part of the onboarding process should I focus on?',
    'What setup questions do you have?',
    'There are a few key steps. Which one do you want to tackle first?',
  ],
  developer: [
    'What are you building or integrating?',
    'I can point you to technical resources. What is your use case?',
    'What platform or system are you working with?',
    'Which development area do you need help with?',
    'There are several integration approaches. What are you considering?',
  ],
};

export function fuzzyResolveTopic(rawQuery: string, availableTopics: DiscernedTopic[]): DiscernedTopic | null {
  const lower = rawQuery.toLowerCase();
  const queryTokens = lower.split(/\s+/).filter(t => t.length > 0);
  const stemmedTokens = queryTokens.map(simpleStem);

  let bestTopic: DiscernedTopic | null = null;
  let bestScore = 0;

  for (const topic of availableTopics) {
    const keywords = TOPIC_KEYWORDS[topic];
    if (!keywords) continue;
      const score = keywords.filter(kw => {
        if (kw.includes(' ')) return lower.includes(kw);
        const stemKw = simpleStem(kw);
        return stemmedTokens.some(st =>
          st.length >= 3 && stemKw.length >= 3
            ? st.includes(stemKw) || stemKw.includes(st)
            : st === stemKw
        );
      }).length;
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  return bestScore > 0 ? bestTopic : null;
}

export class DefaultKnowledgeBaseProvider implements KnowledgeBaseProvider {
  getTopicResponse(topic: DiscernedTopic, _tenantId: string, depth: number): KnowledgeEntry | null {
    const templates = DEFAULT_TEMPLATES[topic];
    if (!templates || depth >= templates.length) return null;
    return { answer: templates[depth] };
  }

  getAvailableTopics(_tenantId: string): DiscernedTopic[] {
    return Object.keys(DEFAULT_TEMPLATES) as DiscernedTopic[];
  }

  resolveTopic(rawQuery: string, _tenantId: string): DiscernedTopic | null {
    return fuzzyResolveTopic(rawQuery, this.getAvailableTopics(_tenantId));
  }
}
