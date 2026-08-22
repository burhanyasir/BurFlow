export interface StripePlanConfig {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  stripePriceId: string;
  features: string[];
  limits: {
    conversations: number;
    documents: number;
    knowledgeBases: number;
    teamMembers: number;
    apiCalls: number;
    storageMb: number;
    widgets: number;
  };
}

export interface PlanConfig {
  id: string;
  name: string;
  conversationLimit: number;
  documentsLimit: number;
  knowledgeBasesLimit: number;
  teamMembersLimit: number;
  apiCallsLimit: number;
  storageMbLimit: number;
  widgetsLimit: number;
  analytics: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
}

export const UNLIMITED_THRESHOLD = 999999;

export const STRIPE_PLANS: Record<string, StripePlanConfig> = {
  free: {
    id: 'free', name: 'Free', price: 0, currency: 'USD', interval: 'month',
    stripePriceId: '',
    features: ['100 conversations/month', '5 documents', '1 knowledge base', '1 team member', 'Basic analytics'],
    limits: { conversations: 100, documents: 5, knowledgeBases: 1, teamMembers: 1, apiCalls: 500, storageMb: 50, widgets: 1 },
  },
  starter: {
    id: 'starter', name: 'Starter', price: 29, currency: 'USD', interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    features: ['1,000 conversations/month', '50 documents', '5 knowledge bases', '5 team members', 'Full analytics', 'Email support'],
    limits: { conversations: 3000, documents: 50, knowledgeBases: 5, teamMembers: 5, apiCalls: 5000, storageMb: 500, widgets: 3 },
  },
  professional: {
    id: 'professional', name: 'Professional', price: 49, currency: 'USD', interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || '',
    features: ['10,000 conversations/month', '200 documents', '20 knowledge bases', '20 team members', 'Advanced analytics', 'Custom branding', 'Priority support'],
    limits: { conversations: 10000, documents: 200, knowledgeBases: 20, teamMembers: 20, apiCalls: 25000, storageMb: 2000, widgets: 10 },
  },
  enterprise: {
    id: 'enterprise', name: 'Enterprise', price: 299, currency: 'USD', interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
    features: ['Unlimited conversations', 'Unlimited documents', 'Unlimited knowledge bases', 'Unlimited team members', 'Enterprise analytics', 'White-label branding', 'Dedicated support', 'SSO', 'SLA'],
    limits: { conversations: UNLIMITED_THRESHOLD, documents: UNLIMITED_THRESHOLD, knowledgeBases: 999, teamMembers: 999, apiCalls: UNLIMITED_THRESHOLD, storageMb: 50000, widgets: 999 },
  },
  // Modern Paddle catalog tiers (legacy 'professional'/'enterprise' kept above)
  pro: {
    id: 'pro', name: 'Pro', price: 49, currency: 'USD', interval: 'month',
    stripePriceId: '',
    features: ['10,000 conversations/month', '200 documents', '20 knowledge bases', '20 team members', 'Advanced analytics', 'Custom branding', 'Priority support'],
    limits: { conversations: 10000, documents: 200, knowledgeBases: 20, teamMembers: 20, apiCalls: 25000, storageMb: 2000, widgets: 10 },
  },
  advanced: {
    id: 'advanced', name: 'Advanced', price: 99, currency: 'USD', interval: 'month',
    stripePriceId: '',
    features: ['25,000 conversations/month', '1,000 documents', '50 knowledge bases', '50 team members', 'Enterprise analytics', 'White-label branding', 'Dedicated support', 'SSO', 'SLA'],
    limits: { conversations: 25000, documents: 1000, knowledgeBases: 50, teamMembers: 50, apiCalls: 250000, storageMb: 10000, widgets: 50 },
  },
};

export function getPlanConfig(plan: string): PlanConfig {
  const p = STRIPE_PLANS[plan];
  if (!p) return getPlanConfig('free');
  return {
    id: p.id,
    name: p.name,
    conversationLimit: p.limits.conversations,
    documentsLimit: p.limits.documents,
    knowledgeBasesLimit: p.limits.knowledgeBases,
    teamMembersLimit: p.limits.teamMembers,
    apiCallsLimit: p.limits.apiCalls,
    storageMbLimit: p.limits.storageMb,
    widgetsLimit: p.limits.widgets,
    analytics: plan !== 'free',
    customBranding: ['professional', 'enterprise', 'pro', 'advanced'].includes(plan),
    prioritySupport: ['professional', 'enterprise', 'pro', 'advanced'].includes(plan),
  };
}

export function isUnlimited(limit: number): boolean {
  return limit >= UNLIMITED_THRESHOLD;
}

export function findPlanByPriceId(priceId: string): string | null {
  if (!priceId) return null;
  for (const [planId, config] of Object.entries(STRIPE_PLANS)) {
    if (config.stripePriceId && config.stripePriceId === priceId) return planId;
  }
  return null;
}
