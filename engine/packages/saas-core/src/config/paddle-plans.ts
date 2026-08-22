/**
 * Paddle product catalog — canonical billing configuration for BurFlow.
 *
 * Prices are stored in the LOWEST denomination string Paddle uses (USD minor
 * units: $10.00 => "1000"), exactly as required by the Paddle sandbox catalog.
 * Product/price IDs are read from environment variables (see .env.example);
 * the provisioning script `engine/scripts/provision-paddle-catalog.js` creates
 * the matching catalog in Paddle Sandbox and prints the IDs to paste into env.
 */

export interface PaddleCountryPriceOverride {
  /** ISO 3166-1 alpha-2 country code, e.g. 'GB' */
  countryCode: string;
  /** ISO 4217 currency code, e.g. 'GBP' */
  currencyCode: string;
  /** Price in the lowest denomination of the override currency, e.g. '800' = £8.00 */
  unitPrice: string;
}

export interface PaddlePriceConfig {
  interval: 'month' | 'year';
  /** USD price in minor units, e.g. '1000' = $10.00 */
  amount: string;
  /** USD price in dollars for display, e.g. 10 */
  price: number;
  /** Paddle price ID (from env; populated after provisioning) */
  paddlePriceId: string;
  /** Free trial length in days (7-day trial on all paid prices) */
  trialDays: number;
  /** Country-specific price overrides (GBP/EUR/AUD) */
  countryOverrides: PaddleCountryPriceOverride[];
}

export interface PaddleTierConfig {
  id: string;
  name: string;
  description: string;
  features: string[];
  /** Paddle product ID (from env; populated after provisioning) */
  paddleProductId: string;
  monthly: PaddlePriceConfig;
  yearly: PaddlePriceConfig;
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

/** 7-day free trial applies to every paid price in the catalog. */
export const PADDLE_TRIAL_DAYS = 7;

const env = (key: string): string => process.env[key] || '';

const gbp = (unitPrice: string): PaddleCountryPriceOverride[] => [{ countryCode: 'GB', currencyCode: 'GBP', unitPrice }];
const eur = (unitPrice: string): PaddleCountryPriceOverride[] => [{ countryCode: 'IE', currencyCode: 'EUR', unitPrice }];
const aud = (unitPrice: string): PaddleCountryPriceOverride[] => [{ countryCode: 'AU', currencyCode: 'AUD', unitPrice }];

export const PADDLE_TIERS: PaddleTierConfig[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'For small teams getting started with AI support.',
    features: [
      '3,000 conversations/month',
      '50 documents',
      '5 knowledge bases',
      '5 team members',
      'Full analytics',
      'Email support',
    ],
    paddleProductId: env('PADDLE_PRODUCT_STARTER'),
    monthly: {
      interval: 'month',
      amount: '2900',
      price: 29,
      paddlePriceId: env('PADDLE_PRICE_STARTER_MONTHLY'),
      trialDays: PADDLE_TRIAL_DAYS,
      countryOverrides: [...gbp('3920'), ...eur('4410'), ...aud('7350')],
    },
    yearly: {
      interval: 'year',
      amount: '27800',
      price: 278,
      paddlePriceId: env('PADDLE_PRICE_STARTER_YEARLY'),
      trialDays: PADDLE_TRIAL_DAYS,
      countryOverrides: [...gbp('37600'), ...eur('42300'), ...aud('70500')],
    },
    limits: { conversations: 3000, documents: 50, knowledgeBases: 5, teamMembers: 5, apiCalls: 5000, storageMb: 500, widgets: 3 },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing teams that need advanced analytics and more volume.',
    features: [
      '10,000 conversations/month',
      '200 documents',
      '20 knowledge bases',
      '20 team members',
      'Advanced analytics',
      'Custom branding',
      'Priority support',
    ],
    paddleProductId: env('PADDLE_PRODUCT_PRO'),
    monthly: {
      interval: 'month',
      amount: '4900',
      price: 49,
      paddlePriceId: env('PADDLE_PRICE_PRO_MONTHLY'),
      trialDays: PADDLE_TRIAL_DAYS,
      countryOverrides: [...gbp('7920'), ...eur('8910'), ...aud('14850')],
    },
    yearly: {
      interval: 'year',
      amount: '47000',
      price: 470,
      paddlePriceId: env('PADDLE_PRICE_PRO_YEARLY'),
      trialDays: PADDLE_TRIAL_DAYS,
      countryOverrides: [...gbp('76000'), ...eur('85500'), ...aud('142500')],
    },
    limits: { conversations: 10000, documents: 200, knowledgeBases: 20, teamMembers: 20, apiCalls: 25000, storageMb: 2000, widgets: 10 },
  },
  {
    id: 'advanced',
    name: 'Advanced',
    description: 'For high-volume operations that need scale and white-labeling.',
    features: [
      '25,000 conversations/month',
      '1,000 documents',
      '50 knowledge bases',
      '50 team members',
      'Enterprise analytics',
      'White-label branding',
      'Dedicated support',
      'SSO & SLA',
    ],
    paddleProductId: env('PADDLE_PRODUCT_ADVANCED'),
    monthly: {
      interval: 'month',
      amount: '9900',
      price: 99,
      paddlePriceId: env('PADDLE_PRICE_ADVANCED_MONTHLY'),
      trialDays: PADDLE_TRIAL_DAYS,
      countryOverrides: [...gbp('9500'), ...eur('11000'), ...aud('18000')],
    },
    yearly: {
      interval: 'year',
      amount: '95000',
      price: 950,
      paddlePriceId: env('PADDLE_PRICE_ADVANCED_YEARLY'),
      trialDays: PADDLE_TRIAL_DAYS,
      countryOverrides: [...gbp('95000'), ...eur('110000'), ...aud('180000')],
    },
    limits: { conversations: 25000, documents: 1000, knowledgeBases: 50, teamMembers: 50, apiCalls: 250000, storageMb: 10000, widgets: 50 },
  },
];

export const PADDLE_TIERS_BY_ID: Record<string, PaddleTierConfig> = Object.fromEntries(
  PADDLE_TIERS.map(t => [t.id, t]),
);

/**
 * Legacy plan ids kept for existing subscription rows. They resolve to the
 * same tier config so quotas and limits keep working for old data.
 */
const LEGACY_PLAN_ALIASES: Record<string, string> = {
  professional: 'pro',
  enterprise: 'advanced',
};

export function getTierById(planId: string): PaddleTierConfig | null {
  if (PADDLE_TIERS_BY_ID[planId]) return PADDLE_TIERS_BY_ID[planId];
  const alias = LEGACY_PLAN_ALIASES[planId];
  return alias ? PADDLE_TIERS_BY_ID[alias] : null;
}

/** Resolve the plan id (new or legacy) that owns a Paddle price ID. */
export function findPlanByPaddlePriceId(priceId: string): string | null {
  if (!priceId) return null;
  for (const tier of PADDLE_TIERS) {
    if (tier.monthly.paddlePriceId === priceId) return tier.id;
    if (tier.yearly.paddlePriceId === priceId) return tier.id;
  }
  return null;
}

export function getTierPriceId(planId: string, interval: 'month' | 'year'): string {
  const tier = getTierById(planId);
  if (!tier) return '';
  return interval === 'year' ? tier.yearly.paddlePriceId : tier.monthly.paddlePriceId;
}
