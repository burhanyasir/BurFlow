import { useState } from 'react';
import { motion } from 'framer-motion';
import { PageSection } from '../../components/ui/PageSection';
import { PricingCard, type PricingTier } from '../../components/ui/PricingCard';
import { cn } from '../../utils/cn';

const monthlyTiers: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    period: '/ mo',
    variant: 'free',
    features: [
      '100 messages / mo',
      '1 Knowledge Base',
      '10 Documents',
      'Community Support'
    ],
    cta: 'Get Started',
    ctaVariant: 'ghost'
  },
  {
    name: 'Starter',
    price: '$29',
    period: '/ mo',
    variant: 'starter',
    features: [
      '1,000 messages / mo',
      '3 Knowledge Bases',
      '100 Documents',
      'Email Support'
    ],
    cta: 'Start Free Trial',
    ctaVariant: 'secondary'
  },
  {
    name: 'Professional',
    price: '$99',
    period: '/ mo',
    variant: 'professional',
    popular: true,
    features: [
      '10,000 messages / mo',
      '10 Knowledge Bases',
      '500 Documents',
      'Priority Support + Analytics'
    ],
    cta: 'Start Free Trial',
    ctaVariant: 'primary'
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    variant: 'enterprise',
    features: [
      'Unlimited messages',
      'Unlimited Knowledge Bases',
      'Unlimited Documents',
      'Dedicated SLA & SSO'
    ],
    cta: 'Contact Sales',
    ctaVariant: 'primary'
  }
];

const annualTiers: PricingTier[] = monthlyTiers.map(t => {
  if (t.price === 'Custom' || t.price === '$0') return t;
  const monthly = parseInt(t.price.replace('$', ''));
  const annual = Math.round(monthly * 12 * 0.8);
  return {
    ...t,
    price: `$${annual}`,
    period: '/ yr'
  };
});

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <PageSection
      title="Transparent Plans for Growing Operations."
      description="Scale seamlessly from your first website visitor to millions of monthly conversations."
      size="lg"
      className="pt-20 md:pt-28"
    >
      <div className="flex items-center justify-center gap-3 mb-10">
        <span className={cn('text-sm font-medium transition-colors', !annual ? 'text-[#0B0C10]' : 'text-[#5F6570]')}>Monthly Billing</span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          aria-label="Toggle annual billing"
          onClick={() => setAnnual(p => !p)}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] focus-visible:ring-offset-2',
            annual ? 'bg-[#5865F2]' : 'bg-[#D0D5DD]'
          )}
        >
          <span className={cn('inline-block h-4 w-4 rounded-full bg-white transition-transform', annual ? 'translate-x-6' : 'translate-x-1')} />
        </button>
        <span className={cn('text-sm font-medium transition-colors', annual ? 'text-[#0B0C10]' : 'text-[#5F6570]')}>
          Annual Billing <span className="text-[#5865F2] font-semibold">(Save 20%)</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {(annual ? annualTiers : monthlyTiers).map((tier, i) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <PricingCard tier={tier} />
          </motion.div>
        ))}
      </div>
    </PageSection>
  );
}
