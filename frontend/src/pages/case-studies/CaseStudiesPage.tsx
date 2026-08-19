import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEO } from '../../components/SEO';
import { Helmet } from 'react-helmet-async';

const caseStudies = [
  {
    slug: 'saas-startup-3x-demo-bookings',
    company: 'CloudMetrics',
    industry: 'SaaS Analytics',
    metric: '3x',
    metricLabel: 'more demo bookings',
    title: 'How CloudMetrics 3x-ed Demo Bookings in 2 Weeks',
    excerpt: 'A B2B SaaS startup replaced their static demo form with BurFlow and saw demo bookings triple within two weeks of launch.',
    results: [
      { label: 'Demo bookings', before: '12/mo', after: '38/mo' },
      { label: 'Conversion rate', before: '1.8%', after: '5.2%' },
      { label: 'Time to first demo', before: '3 days', after: 'Same session' },
    ],
    quote: 'BurFlow understood our pricing tiers better than our sales team. Visitors get the right answer instantly and book before they even think about leaving.',
    author: 'Sarah Chen',
    role: 'Head of Growth',
  },
  {
    slug: 'agency-reduced-support-40-percent',
    company: 'NorthStar Digital',
    industry: 'Digital Agency',
    metric: '40%',
    metricLabel: 'support cost reduction',
    title: 'NorthStar Digital Cut Support Costs by 40% With AI Qualification',
    excerpt: 'A 25-person agency was drowning in repetitive prospect questions. BurFlow handles initial qualification and common questions automatically.',
    results: [
      { label: 'Support hours/week', before: '35h', after: '21h' },
      { label: 'Qualified leads/month', before: '8', after: '24' },
      { label: 'Cost per lead', before: '$120', after: '$35' },
    ],
    quote: 'Our team spends time on real conversations instead of answering "what services do you offer?" for the hundredth time. BurFlow handles the top of the funnel so we can focus on closing.',
    author: 'Marcus Rodriguez',
    role: 'Agency Director',
  },
  {
    slug: 'ecommerce-52-percent-more-leads',
    company: 'StyleHub',
    industry: 'Ecommerce',
    metric: '52%',
    metricLabel: 'more qualified leads',
    title: 'StyleHub Captured 52% More Qualified Leads From Product Pages',
    excerpt: 'An online fashion retailer added BurFlow to product pages and captured buying intent signals that forms never revealed.',
    results: [
      { label: 'Qualified leads/month', before: '45', after: '68' },
      { label: 'Average order value', before: '$89', after: '$112' },
      { label: 'Cart abandonment recovery', before: '0%', after: '18%' },
    ],
    quote: 'The AI understood our sizing guides and could recommend products. Visitors who engaged with BurFlow spent 25% more on average.',
    author: 'Emily Watson',
    role: 'Ecommerce Manager',
  },
];

export default function CaseStudiesPage() {
  return (
    <>
      <SEO
        title="Customer Case Studies | How Teams Convert More Visitors With BurFlow"
        description="See real results from teams using BurFlow to convert website visitors into qualified leads. 3x demo bookings, 40% cost reduction, 52% more leads."
        canonicalPath="/case-studies"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'BurFlow Customer Case Studies',
          description: 'Real results from teams using BurFlow to convert website visitors into qualified pipeline.',
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: caseStudies.map((cs, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'Article',
                headline: cs.title,
                description: cs.excerpt,
                author: { '@type': 'Person', name: cs.author },
              },
            })),
          },
        })}</script>
      </Helmet>
      <div className="mx-auto max-w-4xl px-6 pt-24 pb-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--color-neutral-900)] md:text-5xl">
            Customer Case Studies
          </h1>
          <p className="mt-4 text-lg text-[var(--color-neutral-500)]">
            Real results from teams that replaced dead-end forms with AI-guided conversion.
          </p>

          <div className="mt-12 space-y-8">
            {caseStudies.map((cs, i) => (
              <motion.article
                key={cs.slug}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-8"
              >
                <div className="flex items-start gap-6">
                  <div className="shrink-0 rounded-2xl bg-[var(--color-accent-600)]/10 p-6 text-center">
                    <p className="text-3xl font-bold text-[var(--color-accent-600)]">{cs.metric}</p>
                    <p className="mt-1 text-xs text-[var(--color-neutral-500)]">{cs.metricLabel}</p>
                  </div>
                  <div>
                    <span className="inline-block rounded-full bg-[var(--color-neutral-100)] px-3 py-0.5 text-xs font-medium text-[var(--color-neutral-600)]">
                      {cs.industry}
                    </span>
                    <h2 className="mt-2 text-2xl font-bold text-[var(--color-neutral-900)]">{cs.title}</h2>
                    <p className="mt-2 text-[var(--color-neutral-500)]">{cs.excerpt}</p>
                  </div>
                </div>

                {/* Results grid */}
                <div className="mt-6 grid grid-cols-3 gap-4">
                  {cs.results.map(r => (
                    <div key={r.label} className="rounded-xl bg-[var(--color-neutral-50)] p-4 text-center">
                      <p className="text-xs font-medium text-[var(--color-neutral-400)]">{r.label}</p>
                      <p className="mt-1 text-sm text-[var(--color-neutral-400)] line-through">{r.before}</p>
                      <p className="text-lg font-bold text-[var(--color-accent-600)]">{r.after}</p>
                    </div>
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="mt-6 rounded-xl border-l-4 border-[var(--color-accent-600)]/30 bg-[var(--color-accent-600)]/5 p-6">
                  <p className="text-[var(--color-neutral-700)] italic">"{cs.quote}"</p>
                  <figcaption className="mt-3 text-sm">
                    <span className="font-semibold text-[var(--color-neutral-900)]">{cs.author}</span>
                    <span className="text-[var(--color-neutral-400)]"> · {cs.role}, {cs.company}</span>
                  </figcaption>
                </blockquote>
              </motion.article>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-14 rounded-2xl bg-[var(--color-accent-600)] p-8 text-center">
            <h2 className="text-2xl font-bold text-white">Ready to be our next success story?</h2>
            <p className="mt-2 text-white/80">Start free. See results in your first week.</p>
            <Link
              to="/signup"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-[var(--color-accent-600)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              Get started free
            </Link>
          </div>
        </motion.div>
      </div>
    </>
  );
}
