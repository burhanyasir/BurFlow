import { DocumentDomainRoute } from './types';

export function routeQuery(message: string): DocumentDomainRoute {
  const text = message.toLowerCase();

  // 1. Security & Compliance
  if (/soc 2|soc2|hipaa|gdpr|data privacy|encryption|llm training|train on data|vpc|data residency|security review|dpa/i.test(text)) {
    return {
      targetDomain: 'security',
      searchKeywords: ['security', 'soc 2', 'gdpr', 'data privacy', 'training policy', 'encryption', 'isolation'],
      relevanceScore: 0.95
    };
  }

  // 2. Analytics & Deflection Metrics
  if (/analytics|dashboard|deflection|resolution rate|unanswered questions|doc gaps|reports|metrics|stats/i.test(text)) {
    return {
      targetDomain: 'analytics',
      searchKeywords: ['analytics', 'dashboard', 'deflection rate', 'answer confidence', 'knowledge gaps', 'reporting'],
      relevanceScore: 0.92
    };
  }

  // 3. Developer API & Integration
  if (/api|sdk|webhook|code|script|head tag|embed|event|onmessage|onfallback|rest api|cors|openapi|react|wordpress|shopify/i.test(text)) {
    return {
      targetDomain: 'developer_api',
      searchKeywords: ['developer', 'api', 'sdk', 'webhooks', 'embed snippet', 'quick start', 'events', 'integration'],
      relevanceScore: 0.94
    };
  }

  // 4. Customization & White-Labeling
  if (/custom branding|white label|white-label|logo removal|brand palette|custom css|theme|avatar|styling/i.test(text)) {
    return {
      targetDomain: 'customization',
      searchKeywords: ['customization', 'white label', 'branding', 'theme editor', 'custom CSS', 'logo removal'],
      relevanceScore: 0.9
    };
  }

  // 5. Pricing & Billing
  if (/pric(?:e|ing|es)|cost|plans|tiers|starter|professional|enterprise|free trial|overages|monthly|annual|discount|refund|po|net-30/i.test(text)) {
    return {
      targetDomain: 'pricing',
      searchKeywords: ['pricing overview', 'plans', 'free trial', 'starter', 'professional', 'enterprise', 'annual discount'],
      relevanceScore: 0.95
    };
  }

  // 6. Quick Start & Setup
  if (/setup|install|how long|deploy|getting started|quick start|time to live/i.test(text)) {
    return {
      targetDomain: 'quick_start',
      searchKeywords: ['quick start', 'integration guide', '10 minutes', 'embed snippet', 'setup'],
      relevanceScore: 0.88
    };
  }

  return {
    targetDomain: 'general',
    searchKeywords: [text],
    relevanceScore: 0.5
  };
}
