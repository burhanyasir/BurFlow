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
    'I would be happy to help with that. Could you tell me more about what you are looking for? That way I can give you the most relevant information.',
    'Great question. Let me share what I know, and if you need more detail I can connect you with our team directly.',
    'I want to make sure I give you the most accurate answer. Could you clarify what specific features or services you are interested in?',
    'That is a great topic. I can help point you in the right direction — what is the most important thing for your situation?',
    'Let me find the best answer for you. In the meantime, is there anything specific about our services you would like to know?',
  ],
  pricing: [
    'I would love to help with pricing. To give you the most accurate information, could you tell me a bit about what you are looking for and how many people would be using it?',
    'Pricing depends on the specific needs of your business. Could you share a bit more about your situation so I can point you in the right direction?',
    'I want to make sure I give you the right numbers. Let me connect you with someone who can provide a tailored quote based on your requirements.',
    'For the most accurate pricing, it is best to speak with our team directly. They can put together a proposal that fits your specific needs.',
    'Pricing varies based on the scope of what you need. Would you like me to help you get in touch with our sales team for a custom quote?',
  ],
  security: [
    'Security is very important to us. We take data protection seriously and follow industry best practices. Could you tell me what specific security requirements you have?',
    'We maintain strong security standards across our platform. If you have specific compliance needs, I can connect you with our team to discuss them in detail.',
    'Data security and privacy are top priorities. Let me know what specific concerns you have and I will do my best to address them.',
    'We follow industry-standard security practices. For detailed compliance documentation, our team can provide everything you need.',
    'I can help with security questions. What specific aspects of data protection are most important for your business?',
  ],
  integrations: [
    'We support a range of integrations to connect with the tools you already use. What systems are you currently working with?',
    'Integration is a key part of our platform. Could you tell me what tools or software you would like to connect?',
    'We offer integrations with many popular platforms. Let me know what you are currently using and I can check compatibility.',
    'Connecting your existing tools is straightforward. What specific integrations are most important for your workflow?',
    'Our platform is designed to work with the tools you already have. What systems would you like to integrate?',
  ],
  api: [
    'We provide API access for custom integrations and development. What are you looking to build or connect?',
    'API access is available for developers who need custom integrations. Could you tell me more about your technical requirements?',
    'For API and development questions, I can help point you in the right direction. What are you looking to build?',
    'Our API supports a wide range of use cases. What specific integration or custom development are you working on?',
    'I can help with API questions. What technical requirements do you have in mind?',
  ],
  roi: [
    'Many of our customers see significant returns on their investment. Could you tell me more about your current setup so I can give you a more specific answer?',
    'ROI depends on many factors unique to your business. I would love to help you understand the potential value. What is most important to you?',
    'We have seen strong results across different industries. Let me learn more about your situation to give you the most relevant information.',
    'The return on investment varies by use case. Could you share what you are hoping to achieve so I can provide more targeted information?',
    'I can help you think through the potential ROI. What metrics or outcomes are most important for your business?',
  ],
  soc2: [
    'Compliance and security certifications are important. We follow industry standards for data protection. Do you have specific compliance requirements I can help with?',
    'We maintain strong compliance standards. If you need specific documentation, our team can provide it. What certifications are you looking for?',
    'For compliance-related questions, I can connect you with the right team. What specific standards or requirements do you need to meet?',
    'We take compliance seriously and work to meet industry standards. What specific requirements does your organization have?',
    'I can help with compliance questions. What specific standards or certifications are you looking for?',
  ],
  sso: [
    'Single sign-on and authentication options are available. What identity provider or authentication system does your team use?',
    'SSO integration is supported for enterprise customers. Could you tell me more about your team\'s authentication needs?',
    'We support various authentication methods. What is your current setup and I can help determine the best approach?',
    'For authentication and SSO questions, our team can provide detailed guidance. What systems are you currently using?',
    'I can help with SSO and authentication questions. What identity provider does your organization use?',
  ],
  walkthrough: [
    'I would be happy to walk you through how things work. What aspect are you most interested in learning about?',
    'Let me give you an overview. What part of our services would you like to understand better?',
    'I can walk you through the key features. What is most important for your business to understand?',
    'Great question about how things work. Let me explain the basics — what specific area would you like to focus on?',
    'I am here to help you understand how everything works. What would you like to know more about?',
  ],
  comparison: [
    'I can help you compare options. What specific factors are most important for your decision?',
    'Choosing the right solution depends on your unique needs. Could you tell me what you are comparing and what matters most?',
    'Every business has different requirements. I can help you think through the key differences. What is most important to you?',
    'I would be happy to help you evaluate your options. What criteria are you using to compare?',
    'Let me help you think through this. What specific aspects are you looking to compare?',
  ],
  demo: [
    'I would love to set you up with a demo. Could you share your contact information so our team can reach out?',
    'A personalized demo is a great way to see everything in action. When would be a good time for our team to connect with you?',
    'I can help arrange a demo for you. What is the best way to get in touch?',
    'Let me connect you with our team for a personalized walkthrough. What details can you share so they can prepare?',
    'A demo is the best way to see how everything works for your specific needs. Shall I have someone reach out to schedule?',
  ],
  trial: [
    'I can help you get started with a trial. Let me connect you with the right team to set that up.',
    'Getting started is easy. I can point you in the right direction to begin exploring our services.',
    'I would be happy to help you get started. What would you like to learn more about first?',
    'Starting is simple — I can guide you through the process. What are you most interested in trying?',
    'Let me help you take the first step. What information would be most helpful to get started?',
  ],
  onboarding: [
    'Getting started is straightforward. I can walk you through the key steps to get up and running.',
    'Onboarding is designed to be quick and easy. What specific setup questions can I help with?',
    'I can help you get set up. What aspect of the onboarding process would you like to understand better?',
    'Let me guide you through getting started. What is the most important thing to set up first for your business?',
    'I am here to help you get started smoothly. What questions do you have about the setup process?',
  ],
  developer: [
    'I can help with technical questions. What specific development or integration are you working on?',
    'For developer-related questions, I am happy to help. What technical requirements do you have?',
    'I can point you in the right direction for technical resources. What are you building or integrating?',
    'Development and integration support is available. What specific technical needs can I help with?',
    'Let me help with your technical questions. What platform or system are you working with?',
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
