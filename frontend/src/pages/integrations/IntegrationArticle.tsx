import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEO } from '../../components/SEO';

interface IntegrationData {
  name: string;
  icon: string;
  description: string;
  benefits: string[];
  setupSteps: string[];
  useCases: Array<{ title: string; description: string }>;
  faqs: Array<{ q: string; a: string }>;
}

const integrations: Record<string, IntegrationData> = {
  hubspot: {
    name: 'HubSpot',
    icon: '\u{1F7E0}',
    description: 'Connect BurFlow to HubSpot to automatically sync leads, update contact properties, and trigger workflows when visitors qualify.',
    benefits: [
      'Auto-create HubSpot contacts from qualified leads',
      'Sync lead score and buying intent to HubSpot properties',
      'Trigger HubSpot workflows on demo bookings',
      'Keep your CRM data fresh without manual entry',
    ],
    setupSteps: [
      'Go to Settings \u2192 Integrations in BurFlow',
      'Click "Connect HubSpot" and authorize the connection',
      'Map BurFlow lead fields to HubSpot contact properties',
      'Enable auto-sync for real-time lead updates',
    ],
    useCases: [
      { title: 'SaaS Lead Routing', description: "When BurFlow qualifies a visitor as sales-qualified, automatically create a HubSpot deal and assign it to the right sales rep." },
      { title: 'Demo Follow-up', description: "When a visitor books a demo through BurFlow, trigger a HubSpot workflow that sends confirmation emails and pre-demo materials." },
      { title: 'Lead Scoring Sync', description: "Push BurFlow's AI-driven lead scores to HubSpot so your sales team sees qualification data alongside their existing CRM data." },
    ],
    faqs: [
      { q: 'Does the HubSpot integration require a paid HubSpot plan?', a: "No. The integration works with HubSpot's free CRM. You only need a paid plan if you want to use HubSpot's marketing automation features." },
      { q: 'How often does data sync between BurFlow and HubSpot?', a: "Data syncs in real-time. When a lead qualifies in BurFlow, it appears in HubSpot within seconds." },
      { q: 'Can I choose which leads get synced to HubSpot?', a: "Yes. You can filter by lead score, buying intent, or qualification status. Only leads that meet your criteria get synced." },
    ],
  },
  salesforce: {
    name: 'Salesforce',
    icon: '\u2601\uFE0F',
    description: 'Push qualified leads from BurFlow into Salesforce and keep your sales pipeline updated automatically.',
    benefits: [
      'Create Salesforce leads or contacts from BurFlow conversations',
      'Update lead status and score in real-time',
      'Trigger Salesforce flows on demo bookings',
      'Sync conversation history to lead records',
    ],
    setupSteps: [
      'Create a Connected App in Salesforce (one-time setup)',
      'Enter your Salesforce credentials in BurFlow Settings',
      'Map BurFlow fields to Salesforce lead/contact fields',
      'Enable the integration and test with a sample lead',
    ],
    useCases: [
      { title: 'Enterprise Lead Capture', description: "Enterprise visitors get qualified by BurFlow and automatically appear in Salesforce with full conversation context and intent signals." },
      { title: 'Pipeline Automation', description: "When BurFlow detects high buying intent, create an Opportunity in Salesforce and notify the account owner via Slack." },
    ],
    faqs: [
      { q: 'Does this work with Salesforce Lightning?', a: "Yes. The integration supports both Salesforce Classic and Lightning editions." },
      { q: 'Can I map custom fields?', a: "Yes. You can map any BurFlow lead property to any Salesforce field, including custom fields." },
    ],
  },
  slack: {
    name: 'Slack',
    icon: '\u{1F4AC}',
    description: 'Get instant notifications in Slack when a visitor qualifies, books a demo, or asks a question that needs human attention.',
    benefits: [
      'Real-time notifications for qualified leads',
      'Demo booking alerts in your sales channel',
      'Human handover notifications for support teams',
      'Daily summary of conversation activity',
    ],
    setupSteps: [
      'Create a Slack webhook in your workspace settings',
      'Paste the webhook URL in BurFlow Settings \u2192 Notifications',
      'Choose which events trigger notifications',
      'Select the channel for each notification type',
    ],
    useCases: [
      { title: 'Sales Team Alerts', description: "When a visitor qualifies as sales-qualified on your pricing page, your sales team gets a Slack message with the lead details and conversation summary." },
      { title: 'Support Escalation', description: "When a visitor asks a question BurFlow cannot answer, the support team gets notified in Slack with the full conversation context." },
    ],
    faqs: [
      { q: 'Can I customize the notification format?', a: "Yes. You can customize which fields appear in the notification and add custom context like team tags or priority levels." },
      { q: 'Does this work with Slack channels?', a: "Yes. You can send notifications to any Slack channel or DM." },
    ],
  },
  zapier: {
    name: 'Zapier',
    icon: '\u26A1',
    description: 'Connect BurFlow to 5,000+ apps with no-code automations. Trigger actions when leads qualify, book demos, or ask specific questions.',
    benefits: [
      'Connect to 5,000+ apps without writing code',
      'Trigger automations on lead qualification',
      'Sync data to Google Sheets, Notion, Airtable, and more',
      'Build custom workflows in minutes',
    ],
    setupSteps: [
      'Create a Zapier account (free tier works)',
      'Search for "BurFlow" in Zapier app directory',
      'Choose a trigger (e.g., "New Qualified Lead")',
      'Connect your BurFlow account with your API key',
      'Set up the action (e.g., "Create Google Sheet row")',
    ],
    useCases: [
      { title: 'Lead Logging', description: "Every qualified lead automatically gets logged to a Google Sheet for tracking and reporting." },
      { title: 'CRM Sync', description: "When a lead qualifies, create a contact in any CRM \u2014 HubSpot, Pipedrive, Freshsales, or custom databases." },
    ],
    faqs: [
      { q: 'Do I need a paid Zapier plan?', a: "No. Zapier's free plan includes 100 tasks/month, which is enough for most startups." },
      { q: 'What triggers are available?', a: 'Triggers include: New Lead, Lead Qualified, Demo Booked, Conversation Started, and Custom Events.' },
    ],
  },
  intercom: {
    name: 'Intercom',
    icon: '\u{1F535}',
    description: 'Use BurFlow for top-of-funnel qualification and hand off qualified conversations to Intercom for ongoing support.',
    benefits: [
      'Seamless handoff from BurFlow to Intercom',
      'Qualified leads get tagged in Intercom',
      'Conversation history transfers automatically',
      'Best of both worlds: AI qualification + human support',
    ],
    setupSteps: [
      'Get your Intercom API token from Settings \u2192 Intercom',
      'Enter the token in BurFlow Settings \u2192 Integrations',
      'Configure handoff rules (e.g., hand off after 3 questions)',
      'Test with a sample conversation',
    ],
    useCases: [
      { title: 'Hybrid Support Model', description: "BurFlow handles initial qualification and common questions, then hands off complex issues to your support team in Intercom." },
      { title: 'Lead-to-Support Pipeline', description: "Qualified leads get passed to Intercom with full context, so your team can follow up without asking the visitor to repeat themselves." },
    ],
    faqs: [
      { q: 'Does this replace Intercom?', a: "No. BurFlow handles top-of-funnel qualification and demo booking. Intercom handles ongoing support and customer communication." },
      { q: 'Can I customize when the handoff happens?', a: "Yes. You can set rules based on conversation length, topic, buying intent, or visitor behavior." },
    ],
  },
  calendly: {
    name: 'Calendly',
    icon: '\u{1F4C5}',
    description: 'Let visitors book demos directly through your Calendly link inside the BurFlow chat widget.',
    benefits: [
      'Embed Calendly booking inside the chat widget',
      'Auto-fill visitor info from the conversation',
      'Sync booking data back to BurFlow leads',
      'No double-booking or scheduling conflicts',
    ],
    setupSteps: [
      'Copy your Calendly booking link',
      'Paste it in BurFlow Settings \u2192 Booking \u2192 Calendly URL',
      'Enable the "Book a Demo" button in the chat widget',
      'Test by starting a conversation and clicking the booking button',
    ],
    useCases: [
      { title: 'Instant Demo Booking', description: "When a visitor expresses interest, BurFlow shows a Calendly embed right in the chat. No redirect, no form, no friction." },
      { title: 'Meeting Scheduling', description: "For sales calls, let visitors pick a time that works for them without leaving the conversation." },
    ],
    faqs: [
      { q: 'Does this require a paid Calendly plan?', a: "No. Calendly's free plan works with BurFlow. Paid plans add features like team scheduling and integrations." },
      { q: 'Can I use a different scheduling tool?', a: "Yes. Any scheduling tool with a booking link (SavvyCal, Cal.com, TidyCal) works by pasting the URL in BurFlow settings." },
    ],
  },
};

export default function IntegrationArticle() {
  const { slug } = useParams<{ slug: string }>();
  const data = slug ? integrations[slug] : undefined;

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Integration not found</h1>
          <Link to="/integrations" className="mt-4 inline-block text-[var(--color-accent-600)]">
            \u2190 Back to integrations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={`${data.name} Integration | BurFlow + ${data.name}`}
        description={`Connect BurFlow to ${data.name} to sync leads, automate follow-ups, and trigger workflows. Set up in minutes.`}
        canonicalPath={`/integrations/${slug}`}
      />
      <article className="mx-auto max-w-3xl px-6 pt-24 pb-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Link to="/integrations" className="text-sm text-[var(--color-neutral-400)] hover:text-[var(--color-accent-600)]">
            \u2190 All integrations
          </Link>

          <div className="mt-6 flex items-center gap-4">
            <span className="text-5xl">{data.icon}</span>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[var(--color-neutral-900)]">
                BurFlow + {data.name}
              </h1>
              <p className="mt-2 text-lg text-[var(--color-neutral-500)]">{data.description}</p>
            </div>
          </div>

          {/* Benefits */}
          <h2 className="mt-12 text-2xl font-bold text-[var(--color-neutral-900)]">Why connect {data.name}?</h2>
          <ul className="mt-6 space-y-3">
            {data.benefits.map((benefit) => (
              <li key={benefit} className="flex gap-3 text-[var(--color-neutral-700)]">
                <svg className="mt-1 h-5 w-5 shrink-0 text-[var(--color-accent-600)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          {/* Setup steps */}
          <h2 className="mt-12 text-2xl font-bold text-[var(--color-neutral-900)]">How to set up</h2>
          <ol className="mt-6 space-y-4">
            {data.setupSteps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-600)] text-sm font-bold text-white">
                  {i + 1}
                </span>
                <span className="pt-1 text-[var(--color-neutral-700)]">{step}</span>
              </li>
            ))}
          </ol>

          {/* Use cases */}
          <h2 className="mt-12 text-2xl font-bold text-[var(--color-neutral-900)]">Use cases</h2>
          <div className="mt-6 space-y-4">
            {data.useCases.map((uc) => (
              <div key={uc.title} className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-6">
                <h3 className="font-semibold text-[var(--color-neutral-900)]">{uc.title}</h3>
                <p className="mt-2 text-[var(--color-neutral-500)]">{uc.description}</p>
              </div>
            ))}
          </div>

          {/* FAQs */}
          <h2 className="mt-12 text-2xl font-bold text-[var(--color-neutral-900)]">Frequently Asked Questions</h2>
          <div className="mt-6 divide-y divide-[var(--color-neutral-200)] border-y border-[var(--color-neutral-200)]">
            {data.faqs.map((faq) => (
              <details key={faq.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-semibold text-[var(--color-neutral-900)]">
                  {faq.q}
                  <span className="text-[var(--color-accent-600)] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[var(--color-neutral-600)]">{faq.a}</p>
              </details>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-14 rounded-2xl bg-[var(--color-accent-600)] p-8 text-center">
            <h2 className="text-2xl font-bold text-white">Try BurFlow with {data.name}</h2>
            <p className="mt-2 text-white/80">Set up in minutes. Free to start.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/signup"
                className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-[var(--color-accent-600)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                Get started free
              </Link>
              <Link
                to="/"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/30 px-6 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                Scan my website
              </Link>
            </div>
          </div>
        </motion.div>
      </article>
    </>
  );
}
