import {
  PADDLE_TIERS, PADDLE_TIERS_BY_ID, getTierById,
  PADDLE_TRIAL_DAYS,
} from '../config/paddle-plans';

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

export const PADDLE_TRIAL_DAYS_CONFIG = PADDLE_TRIAL_DAYS;

/**
 * Flat map of every plan id (new + legacy aliases) to its monthly price
 * config — kept for callers that index plans by id (e.g. quota middleware).
 */
export const PADDLE_PLANS: Record<string, PaddlePlanConfig> = {
  free: {
    id: 'free', name: 'Free', price: 0, currency: 'USD', interval: 'month',
    paddlePriceId: '', paddleProductId: '',
    features: ['100 conversations/month', '5 documents', '1 knowledge base', '1 team member', 'Basic analytics'],
    limits: { conversations: 100, documents: 5, knowledgeBases: 1, teamMembers: 1, apiCalls: 500, storageMb: 50, widgets: 1 },
  },
  ...Object.fromEntries(
    PADDLE_TIERS.map(t => [
      t.id,
      {
        id: t.id, name: t.name, price: t.monthly.price, currency: 'USD', interval: 'month',
        paddlePriceId: t.monthly.paddlePriceId, paddleProductId: t.paddleProductId,
        features: t.features, limits: t.limits,
      } satisfies PaddlePlanConfig,
    ]),
  ),
  // Legacy plan ids — same limits as their modern counterparts.
  professional: aliasPlan('pro', 'professional'),
  enterprise: aliasPlan('advanced', 'enterprise'),
};

function aliasPlan(source: string, id: string): PaddlePlanConfig {
  const t = PADDLE_TIERS_BY_ID[source];
  return {
    id, name: t.name, price: t.monthly.price, currency: 'USD', interval: 'month',
    paddlePriceId: t.monthly.paddlePriceId, paddleProductId: t.paddleProductId,
    features: t.features, limits: t.limits,
  };
}

export function getPlanLimits(plan: string): PlanLimits {
  const tier = getTierById(plan);
  const limits = tier ? tier.limits : PADDLE_PLANS.free.limits;
  const paid = tier !== null;
  return {
    ...limits,
    analytics: paid,
    customBranding: tier?.id === 'pro' || tier?.id === 'advanced',
    prioritySupport: tier?.id === 'pro' || tier?.id === 'advanced',
  };
}
