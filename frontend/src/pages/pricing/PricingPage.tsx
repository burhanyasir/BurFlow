import { useState } from 'react';
import { motion } from 'framer-motion';
import { SEO } from '../../components/SEO';
import { PageSection } from '../../components/ui/PageSection';
import { PricingCard, type PricingTier } from '../../components/ui/PricingCard';
import { cn } from '../../utils/cn';
import { SITE_URL } from '../../lib/site';
import { storage } from '../../lib/storage';

const monthlyTiers: PricingTier[] = [
  { name: 'Free', price: '$0', period: '/ mo', variant: 'free', features: ['100 conversations / mo', '5 documents', '1 knowledge base', '1 team member'], cta: 'Get Started', ctaVariant: 'ghost' },
  { name: 'Starter', price: '$29', period: '/ mo', variant: 'starter', features: ['3,000 conversations / mo', '50 documents', '5 knowledge bases', '5 team members', 'Email support'], cta: 'Start Free Trial', ctaVariant: 'secondary' },
  { name: 'Pro', price: '$49', period: '/ mo', variant: 'professional', popular: true, features: ['10,000 conversations / mo', '200 documents', '20 knowledge bases', '20 team members', 'Advanced analytics', 'Custom branding', 'Priority support'], cta: 'Start Free Trial', ctaVariant: 'primary' },
  { name: 'Advanced', price: '$99', period: '/ mo', variant: 'enterprise', features: ['25,000 conversations / mo', '1,000 documents', '50 knowledge bases', '50 team members', 'White-label branding', 'Dedicated support', 'SSO & SLA'], cta: 'Contact Sales', ctaVariant: 'primary' }
];

const annualTiers: PricingTier[] = monthlyTiers.map(t => {
  if (t.price === 'Custom' || t.price === '$0') return t;
  const monthly = parseInt(t.price.replace('$', ''));
  const annual = Math.round(monthly * 12 * 0.83);
  return { ...t, price: `$${annual}`, period: '/ yr' };
});

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [requestResult, setRequestResult] = useState<{ plan: string; message: string } | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const handleRequestPlan = async (plan: string) => {
    if (plan === 'free') {
      window.location.href = '/signup';
      return;
    }

    if (!storage.getToken()) {
      window.location.href = '/login';
      return;
    }

    setRequesting(plan);
    setRequestError(null);
    setRequestResult(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/billing/requests/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storage.getToken()}`,
        },
        body: JSON.stringify({
          plan,
          billingPeriod: annual ? 'annual' : 'monthly',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setRequestResult({ plan, message: data.message || 'Plan request submitted! The owner will review it shortly.' });
      } else {
        setRequestError(data.error || 'Failed to submit request');
      }
    } catch {
      setRequestError('Network error. Please try again.');
    } finally {
      setRequesting(null);
    }
  };

  return (
    <>
      <SEO
        title="Pricing | BurFlow"
        description="Simple, transparent pricing that scales from your first website visitor to millions of monthly conversations. Start free — no credit card required."
        canonicalPath="/pricing"
        schema={`{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"${SITE_URL}"},{"@type":"ListItem","position":2,"name":"Pricing","item":"${SITE_URL}/pricing"}]}`}
      />
      <PageSection
        title="Transparent Plans for Growing Operations."
        description="Scale seamlessly from your first website visitor to millions of monthly conversations."
        size="lg"
        titleAs="h1"
        className="pt-20 md:pt-28 relative z-10"
      >
        {/* Request result / error banner */}
        {requestResult && (
          <div className="mx-auto max-w-xl mb-8 rounded-2xl border border-[var(--color-accent-600)]/30 bg-[var(--color-accent-50)] px-6 py-4 text-center">
            <p className="text-sm font-medium text-[var(--color-accent-700)]">
              ✅ {requestResult.message}
            </p>
            <p className="mt-1 text-xs text-[var(--color-neutral-500)]">
              We'll activate your <strong>{requestResult.plan}</strong> plan once reviewed. Check back in your dashboard.
            </p>
          </div>
        )}
        {requestError && (
          <div className="mx-auto max-w-xl mb-8 rounded-2xl border border-red-300/30 bg-red-50 px-6 py-4 text-center">
            <p className="text-sm font-medium text-red-700">{requestError}</p>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 mb-12">
          <span id="billing-label-monthly" className={cn('text-sm font-medium transition-colors select-none', !annual ? 'text-[var(--color-neutral-900)]' : 'text-[var(--color-neutral-500)]')}>Monthly Billing</span>
          <button
            type="button"
            role="switch"
            aria-checked={annual}
            aria-label="Toggle between monthly and annual billing"
            aria-labelledby="billing-label-monthly billing-label-annual"
            onClick={() => setAnnual(p => !p)}
            className={cn(
              'relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] focus-visible:ring-offset-2',
              annual ? 'bg-[var(--color-accent-600)] shadow-md' : 'bg-[var(--color-neutral-200)]'
            )}
          >
            <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300', annual ? 'translate-x-6' : 'translate-x-1')} />
          </button>
          <span id="billing-label-annual" className={cn('text-sm font-medium transition-colors select-none', annual ? 'text-[var(--color-neutral-900)]' : 'text-[var(--color-neutral-500)]')}>
            Annual Billing <span className="text-[var(--color-accent-600)] font-semibold relative">
              (Save 17%)
              <span className="absolute -inset-0.5 rounded bg-[var(--color-accent-200)]/60 -z-10" aria-hidden="true" />
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
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[var(--color-accent-600)]/20 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
              )}
              <PricingCard
                tier={{
                  ...tier,
                  cta: requesting === (tier.variant === 'free' ? 'free' : tier.name.toLowerCase())
                    ? 'Submitting...'
                    : tier.cta,
                }}
                onCtaClick={handleRequestPlan}
              />
            </motion.div>
          ))}
        </div>
      </PageSection>
    </>
  );
}
