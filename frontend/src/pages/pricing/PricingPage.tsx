import { useState } from 'react';
import { motion } from 'framer-motion';
import { PageSection } from '../../components/ui/PageSection';
import { PricingCard, type PricingTier } from '../../components/ui/PricingCard';
import { cn } from '../../utils/cn';
import { ParticleField } from '../../components/effects/ParticleField';
import '../../styles/effects.css';

const monthlyTiers: PricingTier[] = [
  { name: 'Free', price: '$0', period: '/ mo', variant: 'free', features: ['100 messages / mo', '1 Knowledge Base', '10 Documents', 'Community Support'], cta: 'Get Started', ctaVariant: 'ghost' },
  { name: 'Starter', price: '$29', period: '/ mo', variant: 'starter', features: ['1,000 messages / mo', '3 Knowledge Bases', '100 Documents', 'Email Support'], cta: 'Start Free Trial', ctaVariant: 'secondary' },
  { name: 'Professional', price: '$99', period: '/ mo', variant: 'professional', popular: true, features: ['10,000 messages / mo', '10 Knowledge Bases', '500 Documents', 'Priority Support + Analytics'], cta: 'Start Free Trial', ctaVariant: 'primary' },
  { name: 'Enterprise', price: 'Custom', variant: 'enterprise', features: ['Unlimited messages', 'Unlimited Knowledge Bases', 'Unlimited Documents', 'Dedicated SLA & SSO'], cta: 'Contact Sales', ctaVariant: 'primary' }
];

const annualTiers: PricingTier[] = monthlyTiers.map(t => {
  if (t.price === 'Custom' || t.price === '$0') return t;
  const monthly = parseInt(t.price.replace('$', ''));
  const annual = Math.round(monthly * 12 * 0.8);
  return { ...t, price: `$${annual}`, period: '/ yr' };
});

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <div className="ambient-gradient" aria-hidden="true" />
      <ParticleField />
      <PageSection
        title="Transparent Plans for Growing Operations."
        description="Scale seamlessly from your first website visitor to millions of monthly conversations."
        size="lg"
        className="pt-20 md:pt-28 relative z-10"
      >
        <div className="flex items-center justify-center gap-3 mb-12">
          <span id="billing-label-monthly" className={cn('text-sm font-medium transition-colors select-none', !annual ? 'text-[#0B0C10]' : 'text-[#5F6570]')}>Monthly Billing</span>
          <button
            type="button"
            role="switch"
            aria-checked={annual}
            aria-label="Toggle between monthly and annual billing"
            aria-labelledby="billing-label-monthly billing-label-annual"
            onClick={() => setAnnual(p => !p)}
            className={cn(
              'relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] focus-visible:ring-offset-2',
              annual ? 'bg-[#5865F2] shadow-md' : 'bg-[#D0D5DD]'
            )}
          >
            <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300', annual ? 'translate-x-6' : 'translate-x-1')} />
          </button>
          <span id="billing-label-annual" className={cn('text-sm font-medium transition-colors select-none', annual ? 'text-[#0B0C10]' : 'text-[#5F6570]')}>
            Annual Billing <span className="text-[#5865F2] font-semibold relative">
              (Save 20%)
              <span className="absolute -inset-0.5 rounded bg-[#E8EAFF]/60 -z-10" aria-hidden="true" />
            </span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {(annual ? annualTiers : monthlyTiers).map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={tier.popular ? 'relative lg:-translate-y-2' : ''}
            >
              {tier.popular && (
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#5865F2]/20 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
              )}
              <PricingCard tier={tier} />
            </motion.div>
          ))}
        </div>
      </PageSection>
    </>
  );
}
