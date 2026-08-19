import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEO } from '../../components/SEO';

const integrations = [
  {
    slug: 'hubspot',
    name: 'HubSpot',
    description: 'Sync leads, contacts, and deal stages between BurFlow and HubSpot CRM automatically.',
    category: 'CRM',
    icon: '🟠',
  },
  {
    slug: 'salesforce',
    name: 'Salesforce',
    description: 'Push qualified leads directly into Salesforce and trigger follow-up workflows.',
    category: 'CRM',
    icon: '☁️',
  },
  {
    slug: 'slack',
    name: 'Slack',
    description: 'Get real-time notifications when a visitor qualifies or books a demo.',
    category: 'Notifications',
    icon: '💬',
  },
  {
    slug: 'zapier',
    name: 'Zapier',
    description: 'Connect BurFlow to 5,000+ apps with no-code workflows and automations.',
    category: 'Automation',
    icon: '⚡',
  },
  {
    slug: 'intercom',
    name: 'Intercom',
    description: 'Hand off qualified conversations from BurFlow to Intercom for ongoing support.',
    category: 'Support',
    icon: '🔵',
  },
  {
    slug: 'calendly',
    name: 'Calendly',
    description: 'Let visitors book demos directly through your Calendly link inside the chat.',
    category: 'Scheduling',
    icon: '📅',
  },
];

export default function IntegrationsHub() {
  return (
    <>
      <SEO
        title="Integrations | BurFlow Connects to Your Favorite Tools"
        description="Connect BurFlow to HubSpot, Salesforce, Slack, Zapier, and more. Automate lead routing, notifications, and follow-ups with your existing stack."
        canonicalPath="/integrations"
      />
      <div className="mx-auto max-w-4xl px-6 pt-24 pb-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--color-neutral-900)] md:text-5xl">
            Integrations
          </h1>
          <p className="mt-4 text-lg text-[var(--color-neutral-500)]">
            BurFlow works with the tools you already use. Connect once, automate everything.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration, i) => (
              <motion.div
                key={integration.slug}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <Link
                  to={`/integrations/${integration.slug}`}
                  className="block rounded-2xl border border-[var(--color-neutral-200)] bg-white p-6 shadow-sm transition hover:border-[var(--color-accent-600)] hover:shadow-md"
                >
                  <span className="text-3xl">{integration.icon}</span>
                  <span className="ml-3 inline-block rounded-full bg-[var(--color-neutral-100)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-neutral-600)]">
                    {integration.category}
                  </span>
                  <h2 className="mt-3 text-lg font-semibold text-[var(--color-neutral-900)]">
                    {integration.name}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--color-neutral-500)]">
                    {integration.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent-600)]">
                    Learn more →
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mt-14 rounded-2xl border border-[var(--color-neutral-200)] bg-gradient-to-br from-[var(--color-accent-600)]/5 to-white p-8 text-center">
            <h2 className="text-2xl font-bold text-[var(--color-neutral-900)]">
              Don't see your tool?
            </h2>
            <p className="mt-3 text-[var(--color-neutral-500)]">
              BurFlow has a REST API and webhooks. Build a custom integration in minutes.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/docs/api"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-accent-600)] px-6 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                View API docs
              </Link>
              <Link
                to="/"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--color-neutral-200)] bg-white px-6 text-sm font-semibold text-[var(--color-neutral-900)] transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                Try BurFlow free
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
