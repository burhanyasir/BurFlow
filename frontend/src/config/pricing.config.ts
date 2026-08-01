export interface PricingTier {
  id: string;
  name: string;
  badge?: string;
  priceMonthly: number | string;
  priceAnnually?: number | string;
  unit: string;
  description: string;
  features: string[];
  ctaText: string;
  ctaHref: string;
  isPopular?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    badge: 'Founders',
    priceMonthly: 49,
    priceAnnually: 39,
    unit: '/ month',
    description: 'For growing businesses validating grounded AI customer support.',
    features: [
      'Up to 5,000 grounded responses / mo',
      'Mandatory citation verification',
      'Shopify, Notion, PDF & FAQ sync',
      'Basic support quality analytics',
      'Standard email support',
    ],
    ctaText: 'Start Free Trial',
    ctaHref: '/signup?plan=starter',
    isPopular: false,
  },
  {
    id: 'business',
    name: 'Business',
    badge: 'Most Popular',
    priceMonthly: 199,
    priceAnnually: 159,
    unit: '/ month',
    description: 'For established brands requiring confidence scoring and human handoff.',
    features: [
      'Up to 25,000 grounded responses / mo',
      'Custom confidence threshold guardrails',
      'Automated human operator handoff',
      'Stateful conversation memory',
      'Priority email & Slack support',
      'Dedicated onboarding specialist',
    ],
    ctaText: 'Start Business Trial',
    ctaHref: '/signup?plan=business',
    isPopular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badge: 'Custom SLA',
    priceMonthly: 'Custom',
    priceAnnually: 'Custom',
    unit: '',
    description: 'For high-volume organizations requiring SOC2 compliance and SLA guarantees.',
    features: [
      'Unlimited conversation volume',
      'Custom knowledge vector deployment',
      'SOC 2 & GDPR audit compliance logs',
      'Custom CRM & helpdesk integrations',
      '99.9% uptime SLA guarantee',
      'Dedicated account executive',
    ],
    ctaText: 'Contact Sales',
    ctaHref: '/contact?inquiry=enterprise',
    isPopular: false,
  },
];

export const PRICING_FAQS = [
  {
    question: 'How does the 14-day free trial work?',
    answer: 'You get full access to the Business plan for 14 days. No credit card is required to start. Connect your knowledge base and test live answers immediately.',
  },
  {
    question: 'What happens when confidence is low?',
    answer: 'The system evaluates confidence token-by-token. If confidence falls below your set threshold, the assistant asks a clarifying question or seamlessly hands off the conversation to human support staff.',
  },
  {
    question: 'Can I change or upgrade my plan later?',
    answer: 'Yes. You can upgrade, downgrade, or cancel your subscription at any time directly from your account billing dashboard.',
  },
  {
    question: 'Does Conversation Engine work with our existing helpdesk?',
    answer: 'Yes. It integrates with existing documentation, websites, Zendesk, Help Scout, Shopify, and custom REST APIs.',
  },
];
