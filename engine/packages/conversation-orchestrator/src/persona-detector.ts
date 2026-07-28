import { PersonaType, PersonaDetectionResult } from './types';

export function detectPersona(
  message: string,
  history: string[] = [],
  previousPersona?: PersonaType
): PersonaDetectionResult {
  const text = (message + ' ' + history.join(' ')).toLowerCase();

  // 1. Developer
  if (
    /api|sdk|webhook|code|script|react|github|dev|curl|endpoint|json|rate limit|cors|head tag|embed/i.test(text)
  ) {
    return {
      persona: 'developer',
      confidence: 0.9,
      reasoning: 'Detected technical/developer vocabulary (API, SDK, webhooks, code).'
    };
  }

  // 2. Enterprise
  if (
    /soc 2|soc2|saml|sso|hipaa|gdpr|procurement|msa|purchase order|net-30|net 30|vpc|data residency|security review|questionnaire|dedicated tam|sla|50,000|500,000/i.test(text)
  ) {
    return {
      persona: 'enterprise',
      confidence: 0.92,
      reasoning: 'Detected enterprise security, compliance, or procurement criteria.'
    };
  }

  // 3. Digital Agency
  if (
    /agency|white label|white-label|client|clients|reseller|reselling|sub-billing|partner program|affiliate|multi-tenant/i.test(text)
  ) {
    return {
      persona: 'agency',
      confidence: 0.88,
      reasoning: 'Detected agency or reseller terms (white label, client accounts, affiliate).'
    };
  }

  // 4. E-Commerce
  if (
    /shopify|woocommerce|cart|checkout|shipping|returns|refunds|sizing|store|orders|order tracking|black friday/i.test(text)
  ) {
    return {
      persona: 'ecommerce',
      confidence: 0.86,
      reasoning: 'Detected e-commerce keywords (Shopify, cart, checkout, returns, store).'
    };
  }

  // 5. Support Operations Manager
  if (
    /support team|support reps|csat|zendesk|intercom|freshdesk|ticket|tickets|deflection|resolution rate|agent burnout|handoff|human agent/i.test(text)
  ) {
    return {
      persona: 'support_manager',
      confidence: 0.87,
      reasoning: 'Detected customer support operations terms (Zendesk, deflection, agent handoff).'
    };
  }

  // 6. SaaS Startup / Founder
  if (
    /saas|founder|startup|mrr|arr|product hunt|seed|investor|pricing tiers|deflect|micro-saas|roi/i.test(text)
  ) {
    return {
      persona: 'startup',
      confidence: 0.84,
      reasoning: 'Detected SaaS founder business metrics (SaaS, startup, MRR, ARR, ROI).'
    };
  }

  // 7. Small Business
  if (
    /small business|bakery|plumber|local|my website|no code|wordpress|non-technical|solo|part-time/i.test(text)
  ) {
    return {
      persona: 'small_business',
      confidence: 0.82,
      reasoning: 'Detected small business owner or local service provider terms.'
    };
  }

  // 8. Existing Customer
  if (
    /my account|my dashboard|current plan|upgrade my|billing setting|login issue/i.test(text)
  ) {
    return {
      persona: 'existing_customer',
      confidence: 0.85,
      reasoning: 'Detected active customer account or dashboard management.'
    };
  }

  // Fallback to previous persona or unknown
  if (previousPersona && previousPersona !== 'unknown') {
    return {
      persona: previousPersona,
      confidence: 0.6,
      reasoning: 'Retained previous persona from session memory.'
    };
  }

  return {
    persona: 'unknown',
    confidence: 0.3,
    reasoning: 'Insufficient persona keywords matched.'
  };
}
