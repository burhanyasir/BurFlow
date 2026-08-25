import { PersonaType, PersonaDetectionResult } from './types';

export interface PersonaDetectionInput {
  message: string;
  history?: string[];
  previousPersona?: PersonaType;
  previousConfidence?: number;
  turnCount?: number;
}

const PERSONA_PATTERNS: Array<{
  persona: PersonaType;
  patterns: RegExp;
  confidence: number;
  reasoning: string;
}> = [
  {
    persona: 'enterprise',
    patterns: /soc\s?2|soc2|saml|sso|hipaa|gdpr|procurement|msa|purchase order|net-30|net 30|vpc|data residency|security review|questionnaire|dedicated tam|sla|50,000|500,000|1,000,000|enterprise plan|enterprise tier|custom plan|annual contract|volume discount|compliance audit|penetration test/i,
    confidence: 0.92,
    reasoning: 'Detected enterprise security, compliance, or procurement criteria.',
  },
  {
    persona: 'developer',
    patterns: /\b(api|sdk|webhook|rest endpoint|graphql|curl|endpoint|rate limit|cors|head tag|embed code|npm|yarn|package|github|gitlab|repo|typescript|javascript|python|node\.?js|react|vue|angular|next\.?js|express|fastify|docker|kubernetes|terraform|ci\/cd|pipeline)\b/i,
    confidence: 0.88,
    reasoning: 'Detected technical/developer vocabulary (API, SDK, webhooks, code).',
  },
  {
    persona: 'agency',
    patterns: /agency|white label|white-label|client accounts|reseller|reselling|sub-billing|partner program|affiliate|multi-tenant|manage.*clients|client.*manage/i,
    confidence: 0.88,
    reasoning: 'Detected agency or reseller terms (white label, client accounts, affiliate).',
  },
  {
    persona: 'ecommerce',
    patterns: /shopify|woocommerce|magento|bigcommerce|cart|checkout|shipping|returns|refunds|sizing|store|orders|order tracking|black friday|product catalog|inventory|sku|fulfillment/i,
    confidence: 0.86,
    reasoning: 'Detected e-commerce keywords (Shopify, cart, checkout, returns, store).',
  },
  {
    persona: 'support_manager',
    patterns: /support team|support reps|csat|nps|zendesk|freshdesk|ticket.*volume|ticket.*deflect|resolution rate|agent burnout|first response time|handle time|escalation.*volume|agent.*capacity/i,
    confidence: 0.87,
    reasoning: 'Detected customer support operations terms (Zendesk, deflection, agent handoff).',
  },
  {
    persona: 'startup',
    patterns: /\b(saas|founder|co-founder|startup|early.stage|seed|pre-seed|mrr|arr|product hunt|investor|pricing tiers|deflect|micro-saas|bootstrapped|yc|y combinator)\b/i,
    confidence: 0.84,
    reasoning: 'Detected SaaS founder business metrics (SaaS, startup, MRR, ARR, ROI).',
  },
  {
    persona: 'small_business',
    patterns: /small business|bakery|plumber|local business|my website|no code|wordpress|non-technical|solo|part-time|freelancer|side hustle|sole proprietor|mom and pop/i,
    confidence: 0.82,
    reasoning: 'Detected small business owner or local service provider terms.',
  },
  {
    persona: 'existing_customer',
    patterns: /my account|my dashboard|current plan|upgrade my|billing setting|login issue|my subscription|my usage|my team|our account/i,
    confidence: 0.85,
    reasoning: 'Detected active customer account or dashboard management.',
  },
];

export function detectPersona(input: PersonaDetectionInput | string): PersonaDetectionResult {
  const message = typeof input === 'string' ? input : input.message;
  const history = typeof input === 'string' ? [] : (input.history || []);
  const previousPersona = typeof input === 'string' ? undefined : input.previousPersona;
  const previousConfidence = typeof input === 'string' ? 0 : (input.previousConfidence || 0);
  const turnCount = typeof input === 'string' ? 0 : (input.turnCount || 0);

  const recentHistory = history.slice(-3);
  const text = (message + ' ' + recentHistory.join(' ')).toLowerCase();

  for (const { persona, patterns, confidence, reasoning } of PERSONA_PATTERNS) {
    if (patterns.test(text)) {
      if (persona === previousPersona && confidence <= previousConfidence) {
        return {
          persona,
          confidence: Math.min(confidence, previousConfidence + 0.05),
          reasoning: `Reinforced: ${reasoning}`,
        };
      }
      return { persona, confidence, reasoning };
    }
  }

  if (previousPersona && previousPersona !== 'unknown') {
    const decayedConfidence = Math.max(0.15, previousConfidence - (turnCount > 5 ? 0.03 * (turnCount - 5) : 0));
    if (decayedConfidence >= 0.3) {
      return {
        persona: previousPersona,
        confidence: decayedConfidence,
        reasoning: 'Retained previous persona (decaying).',
      };
    }
  }

  return {
    persona: 'unknown',
    confidence: 0.3,
    reasoning: 'Insufficient persona keywords matched.',
  };
}
