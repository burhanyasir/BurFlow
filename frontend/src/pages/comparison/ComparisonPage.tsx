import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEO } from '../../components/SEO';
import { PageSection } from '../../components/ui/PageSection';

const comparisons = [
  {
    slug: 'burflow-vs-intercom',
    title: 'BurFlow vs Intercom',
    description:
      'Intercom is a support-first platform with chatbot add-ons. BurFlow is a sales-first agent that scans your site, qualifies intent, and books demos — without manual setup.',
    winner: 'BurFlow for sales conversion',
  },
  {
    slug: 'burflow-vs-drift',
    title: 'BurFlow vs Drift (Salesloft)',
    description:
      'Drift pioneered conversational marketing but requires heavy configuration and enterprise pricing. BurFlow auto-extracts your offer from your website and works in under 10 minutes.',
    winner: 'BurFlow for speed-to-value',
  },
  {
    slug: 'burflow-vs-hubspot-chatbot',
    title: 'BurFlow vs HubSpot Chatbot',
    description:
      'HubSpot\'s chatbot lives inside its CRM ecosystem. BurFlow works standalone, understands your pricing, and qualifies visitors based on buying intent — not form fills.',
    winner: 'BurFlow for autonomous qualification',
  },
  {
    slug: 'burflow-vs-tidio',
    title: 'BurFlow vs Tidio',
    description:
      'Tidio is a live chat widget with basic AI. BurFlow goes further: it scans your site, recommends products, detects buying intent, and captures demos — all automatically.',
    winner: 'BurFlow for product-aware conversations',
  },
  {
    slug: 'burflow-vs-custom-build',
    title: 'BurFlow vs Building Your Own AI Chat',
    description:
      'Custom AI chat requires ML engineers, prompt tuning, knowledge-base maintenance, and ongoing costs. BurFlow handles all of that with a website scan and one snippet.',
    winner: 'BurFlow for ROI and time-to-launch',
  },
];

export default function ComparisonPage() {
  return (
    <>
      <SEO
        title="BurFlow vs Competitors: How BurFlow Compares to Intercom, Drift, HubSpot & More"
        description="See how BurFlow's autonomous AI sales agents compare to Intercom, Drift, HubSpot chatbot, Tidio, and building your own. Real differences, not marketing spin."
        canonicalPath="/compare"
      />
      <PageSection className="pt-20 md:pt-28" containerClassName="max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold tracking-tight text-[var(--color-neutral-900)] md:text-5xl">
            How BurFlow Compares
          </h1>
          <p className="mt-4 text-lg text-[var(--color-neutral-500)]">
            Honest comparisons with the tools teams usually evaluate before choosing BurFlow.
          </p>

          <div className="mt-10 space-y-4">
            {comparisons.map((comp, i) => (
              <motion.div
                key={comp.slug}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <Link
                  to={`/compare/${comp.slug}`}
                  className="block rounded-2xl border border-[var(--color-neutral-200)] bg-white p-6 shadow-sm transition hover:border-[var(--color-accent-600)] hover:shadow-md"
                >
                  <h2 className="text-xl font-semibold text-[var(--color-neutral-900)]">
                    {comp.title}
                  </h2>
                  <p className="mt-2 text-[var(--color-neutral-500)]">{comp.description}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="inline-flex items-center rounded-full bg-[var(--color-accent-600)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-accent-600)]">
                      {comp.winner}
                    </span>
                    <span className="text-sm font-medium text-[var(--color-accent-600)]">
                      Read full comparison →
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mt-14 rounded-2xl border border-[var(--color-neutral-200)] bg-gradient-to-br from-[var(--color-accent-600)]/5 to-white p-8 text-center">
            <h2 className="text-2xl font-bold text-[var(--color-neutral-900)]">
              Ready to see BurFlow in action?
            </h2>
            <p className="mt-3 text-[var(--color-neutral-500)]">
              Run a free scan on your website and see how BurFlow would guide your visitors.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-accent-600)] px-6 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                Scan my website free
              </Link>
              <Link
                to="/demo"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--color-neutral-200)] bg-white px-6 text-sm font-semibold text-[var(--color-neutral-900)] transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                Book a demo
              </Link>
            </div>
          </div>
        </motion.div>
      </PageSection>
    </>
  );
}
