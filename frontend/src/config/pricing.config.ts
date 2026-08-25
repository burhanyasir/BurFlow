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
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceAnnually: 0,
    unit: '/ month',
    description: 'Try BurFlow on one site with no commitment.',
    features: [
      '100 conversations / mo',
      '5 documents',
      '1 knowledge base',
      '1 team member',
      'Community support',
    ],
    ctaText: 'Get Started',
    ctaHref: '/signup',
    isPopular: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 29,
    priceAnnually: 24,
    unit: '/ month',
    description: 'For small teams launching AI-assisted support.',
    features: [
      '3,000 conversations / mo',
      '50 documents',
      '5 knowledge bases',
      '5 team members',
      'Email support',
    ],
    ctaText: 'Start Free Trial',
    ctaHref: '/signup?plan=starter',
    isPopular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    badge: 'Most Popular',
    priceMonthly: 49,
    priceAnnually: 39,
    unit: '/ month',
    description: 'For growing companies with real support volume.',
    features: [
      '10,000 conversations / mo',
      '200 documents',
      '20 knowledge bases',
      '20 team members',
      'Advanced analytics',
      'Priority support',
    ],
    ctaText: 'Start Free Trial',
    ctaHref: '/signup?plan=pro',
    isPopular: true,
  },
  {
    id: 'advanced',
    name: 'Advanced',
    badge: 'Enterprise',
    priceMonthly: 99,
    priceAnnually: 79,
    unit: '/ month',
    description: 'For regulated industries and enterprise deployments.',
    features: [
      '25,000 conversations / mo',
      '1,000 documents',
      '50 knowledge bases',
      '50 team members',
      'White-label branding',
      'SSO & SLA',
      'Dedicated support',
    ],
    ctaText: 'Contact Sales',
    ctaHref: '/contact?inquiry=enterprise',
    isPopular: false,
  },
];

export const PRICING_FAQS = [
  {
    question: 'How does the 14-day free trial work?',
    answer: 'You get full access to the Pro plan for 14 days. No credit card is required to start. Connect your knowledge base and test live answers immediately.',
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
    question: 'Does BurFlow work with our existing helpdesk?',
    answer: 'Yes. It integrates with existing documentation, websites, Zendesk, Help Scout, Shopify, and custom REST APIs.',
  },
];
