import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { SEO } from '../../components/SEO';

const alternatives = [
  {
    slug: 'intercom',
    name: 'Intercom',
    category: 'Support-first platform',
    whySwitch: 'Intercom requires manual bot builder setup and starts at $39/seat/mo. BurFlow auto-scans your site and works in 10 minutes.',
    burflowWins: ['Auto-extracts product knowledge', 'Built-in demo booking', 'Free tier available'],
  },
  {
    slug: 'drift',
    name: 'Drift (Salesloft)',
    category: 'Enterprise conversational marketing',
    whySwitch: 'Drift costs $2,500+/mo and needs weeks of implementation. BurFlow is live in minutes at a fraction of the cost.',
    burflowWins: ['No enterprise contract', 'AI-driven qualification', 'Under 10 minute setup'],
  },
  {
    slug: 'hubspot-chatbot',
    name: 'HubSpot Chatbot',
    category: 'CRM-embedded chat',
    whySwitch: 'HubSpot chatbot only knows what you manually train. BurFlow reads your entire website automatically.',
    burflowWins: ['Full website understanding', 'Buying intent detection', 'No HubSpot dependency'],
  },
  {
    slug: 'tidio',
    name: 'Tidio',
    category: 'Live chat for SMBs',
    whySwitch: 'Tidio handles basic chat but cannot understand your products or qualify leads. BurFlow does both.',
    burflowWins: ['Product-aware conversations', 'Automated lead qualification', 'Demo capture built-in'],
  },
  {
    slug: 'zendesk',
    name: 'Zendesk',
    category: 'Help desk with chatbot',
    whySwitch: 'Zendesk is a help desk first, sales tool second. BurFlow focuses purely on converting visitors.',
    burflowWins: ['Sales-first design', 'Proactive engagement', 'Pricing page optimization'],
  },
  {
    slug: 'custom-build',
    name: 'Building your own',
    category: 'Custom AI chat development',
    whySwitch: 'Custom builds cost $50K+ and take months. BurFlow delivers the same outcome in 10 minutes for $0-$99/mo.',
    burflowWins: ['No engineering required', 'Zero maintenance', 'Instant updates'],
  },
];

const whoThisIsFor = [
  { q: 'SaaS companies', a: 'Qualify trial signups, book demos, and reduce churn with proactive engagement on your pricing page.' },
  { q: 'Ecommerce stores', a: 'Recommend products, answer sizing/shipping questions, and capture leads from product pages.' },
  { q: 'Agencies', a: 'White-label the widget for clients. Qualify inbound leads and book discovery calls automatically.' },
  { q: 'B2B services', a: 'Replace contact forms with guided conversations. Qualify leads by budget, timeline, and fit.' },
];

export default function AlternativesPage() {
  return (
    <>
      <SEO
        title="Best AI Chatbot Alternatives 2026: BurFlow vs Intercom, Drift, HubSpot & More"
        description="Looking for an AI chatbot that actually converts? Compare BurFlow to Intercom, Drift, HubSpot, Tidio, and custom builds. See pricing, features, and real differences."
        canonicalPath="/alternatives"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: alternatives.map(a => ({
            '@type': 'Question',
            name: `What is the best alternative to ${a.name} for AI sales?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `BurFlow is a top alternative to ${a.name}. ${a.whySwitch} BurFlow starts free and scales to $99/mo.`,
            },
          })),
        })}</script>
      </Helmet>
      <div className="mx-auto max-w-4xl px-6 pt-24 pb-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--color-neutral-900)] md:text-5xl">
            Best AI Chatbot Alternatives in 2026
          </h1>
          <p className="mt-4 text-lg text-[var(--color-neutral-500)]">
            Most chatbots answer questions. BurFlow converts visitors into qualified pipeline. Here's how it compares.
          </p>

          {/* Who this is for */}
          <div className="mt-12 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-8">
            <h2 className="text-xl font-bold text-[var(--color-neutral-900)]">Who is BurFlow for?</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {whoThisIsFor.map(item => (
                <div key={item.q} className="rounded-xl border border-[var(--color-neutral-100)] bg-[var(--color-neutral-50)] p-4">
                  <h3 className="font-semibold text-[var(--color-neutral-900)]">{item.q}</h3>
                  <p className="mt-1 text-sm text-[var(--color-neutral-500)]">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Alternatives list */}
          <div className="mt-12 space-y-6">
            {alternatives.map((alt, i) => (
              <motion.div
                key={alt.slug}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-8"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-block rounded-full bg-[var(--color-neutral-100)] px-3 py-0.5 text-xs font-medium text-[var(--color-neutral-600)]">
                      {alt.category}
                    </span>
                    <h2 className="mt-3 text-2xl font-bold text-[var(--color-neutral-900)]">
                      BurFlow vs {alt.name}
                    </h2>
                    <p className="mt-2 text-[var(--color-neutral-500)]">{alt.whySwitch}</p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  {alt.burflowWins.map(win => (
                    <span key={win} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-600)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-accent-600)]">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {win}
                    </span>
                  ))}
                </div>
                <Link
                  to={`/compare/burflow-vs-${alt.slug}`}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent-600)] hover:underline"
                >
                  Read full comparison →
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Pricing comparison */}
          <div className="mt-14 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-8">
            <h2 className="text-2xl font-bold text-[var(--color-neutral-900)]">Pricing comparison</h2>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--color-neutral-200)]">
                  <tr>
                    <th className="pb-3 font-semibold text-[var(--color-neutral-900)]">Tool</th>
                    <th className="pb-3 font-semibold text-[var(--color-neutral-900)]">Starting price</th>
                    <th className="pb-3 font-semibold text-[var(--color-neutral-900)]">AI setup</th>
                    <th className="pb-3 font-semibold text-[var(--color-neutral-900)]">Free tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-neutral-100)]">
                  <tr className="bg-[var(--color-accent-600)]/5">
                    <td className="py-3 font-semibold text-[var(--color-accent-600)]">BurFlow</td>
                    <td className="py-3">$0/mo</td>
                    <td className="py-3">Automatic (website scan)</td>
                    <td className="py-3">100 messages/mo</td>
                  </tr>
                  <tr><td className="py-3">Intercom</td><td className="py-3">$39/seat/mo</td><td className="py-3">Manual bot builder</td><td className="py-3">14-day trial</td></tr>
                  <tr><td className="py-3">Drift</td><td className="py-3">$2,500+/mo</td><td className="py-3">Enterprise implementation</td><td className="py-3">No</td></tr>
                  <tr><td className="py-3">HubSpot</td><td className="py-3">Free (basic)</td><td className="py-3">Manual training</td><td className="py-3">Yes (basic)</td></tr>
                  <tr><td className="py-3">Tidio</td><td className="py-3">$29/mo</td><td className="py-3">Basic FAQ matching</td><td className="py-3">Free tier</td></tr>
                  <tr><td className="py-3">Zendesk</td><td className="py-3">$55/agent/mo</td><td className="py-3">Manual setup</td><td className="py-3">14-day trial</td></tr>
                  <tr><td className="py-3">Custom build</td><td className="py-3">$50K-$200K+</td><td className="py-3">ML engineers required</td><td className="py-3">N/A</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-14 rounded-2xl bg-[var(--color-accent-600)] p-8 text-center">
            <h2 className="text-2xl font-bold text-white">Try the alternative that converts</h2>
            <p className="mt-2 text-white/80">Free scan. No card. Live in 10 minutes.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/" className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-[var(--color-accent-600)] transition-all hover:-translate-y-0.5 hover:shadow-lg">
                Scan my website free
              </Link>
              <Link to="/pricing" className="inline-flex h-11 items-center justify-center rounded-full border border-white/30 px-6 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-md">
                See pricing
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
