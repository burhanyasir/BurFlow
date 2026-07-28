export interface PaddlePlanConfig {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  paddlePriceId: string;
  paddleProductId: string;
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

export interface PlanLimits {
  conversations: number;
  documents: number;
  knowledgeBases: number;
  teamMembers: number;
  apiCalls: number;
  storageMb: number;
  widgets: number;
  analytics: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
}

export const PADDLE_PLANS: Record<string, PaddlePlanConfig> = {
  free: {
    id: 'free', name: 'Free', price: 0, currency: 'USD', interval: 'month',
    paddlePriceId: '', paddleProductId: '',
    features: ['100 conversations/month', '5 documents', '1 knowledge base', '1 team member', 'Basic analytics'],
    limits: { conversations: 100, documents: 5, knowledgeBases: 1, teamMembers: 1, apiCalls: 500, storageMb: 50, widgets: 1 },
  },
  starter: {
    id: 'starter', name: 'Starter', price: 29, currency: 'USD', interval: 'month',
    paddlePriceId: process.env.PADDLE_PRICE_STARTER_MONTHLY || '', paddleProductId: '',
    features: ['1,000 conversations/month', '50 documents', '5 knowledge bases', '5 team members', 'Full analytics', 'Email support'],
    limits: { conversations: 1000, documents: 50, knowledgeBases: 5, teamMembers: 5, apiCalls: 5000, storageMb: 500, widgets: 3 },
  },
  professional: {
    id: 'professional', name: 'Professional', price: 99, currency: 'USD', interval: 'month',
    paddlePriceId: process.env.PADDLE_PRICE_PROFESSIONAL_MONTHLY || '', paddleProductId: '',
    features: ['5,000 conversations/month', '200 documents', '20 knowledge bases', '20 team members', 'Advanced analytics', 'Custom branding', 'Priority support'],
    limits: { conversations: 5000, documents: 200, knowledgeBases: 20, teamMembers: 20, apiCalls: 25000, storageMb: 2000, widgets: 10 },
  },
  enterprise: {
    id: 'enterprise', name: 'Enterprise', price: 299, currency: 'USD', interval: 'month',
    paddlePriceId: process.env.PADDLE_PRICE_ENTERPRISE_MONTHLY || '', paddleProductId: '',
    features: ['Unlimited conversations', 'Unlimited documents', 'Unlimited knowledge bases', 'Unlimited team members', 'Enterprise analytics', 'White-label branding', 'Dedicated support', 'SSO', 'SLA'],
    limits: { conversations: 999999, documents: 999999, knowledgeBases: 999, teamMembers: 999, apiCalls: 999999, storageMb: 50000, widgets: 999 },
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  const p = PADDLE_PLANS[plan];
  if (!p) return PADDLE_PLANS.free.limits as PlanLimits;
  return {
    ...p.limits,
    analytics: plan !== 'free',
    customBranding: plan === 'professional' || plan === 'enterprise',
    prioritySupport: plan === 'professional' || plan === 'enterprise',
  };
}
