import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEO } from '../../components/SEO';

interface ComparisonData {
  title: string;
  description: string;
  competitor: string;
  competitorDescription: string;
  burflowAdvantage: string;
  keyDifferences: Array<{ feature: string; burflow: string; competitor: string; winner: 'burflow' | 'competitor' | 'tie' }>;
  faqs: Array<{ q: string; a: string }>;
  verdict: string;
}

const comparisons: Record<string, ComparisonData> = {
  'burflow-vs-intercom': {
    title: 'BurFlow vs Intercom: Which AI Sales Tool Converts Better?',
    description:
      'Intercom is a support-first platform with chatbot add-ons. BurFlow is a sales-first agent that scans your site, qualifies intent, and books demos — without manual setup.',
    competitor: 'Intercom',
    competitorDescription:
      'Intercom is a comprehensive customer messaging platform with live chat, bots, and help desk features. It excels at support but requires significant configuration for sales use cases.',
    burflowAdvantage:
      'BurFlow automatically extracts your products, pricing, and services from your website. No manual training, no knowledge base setup. It starts converting visitors from day one.',
    keyDifferences: [
      { feature: 'Setup time', burflow: 'Under 10 minutes (website scan)', competitor: 'Days to weeks (manual bot builder)', winner: 'burflow' },
      { feature: 'Product knowledge', burflow: 'Auto-extracted from your site', competitor: 'Manual training required', winner: 'burflow' },
      { feature: 'Pricing awareness', burflow: 'Automatic (reads your pricing pages)', competitor: 'Manual setup per plan', winner: 'burflow' },
      { feature: 'Lead qualification', burflow: 'AI-driven buying intent detection', competitor: 'Form-based or rule-based', winner: 'burflow' },
      { feature: 'Demo booking', burflow: 'Built-in calendar integration', competitor: 'Requires third-party tools', winner: 'burflow' },
      { feature: 'Live chat support', burflow: 'Included', competitor: 'Included (strength)', winner: 'tie' },
      { feature: 'Help desk', burflow: 'Not included', competitor: 'Full help desk suite (strength)', winner: 'competitor' },
      { feature: 'Pricing', burflow: 'From $0/mo (free tier)', competitor: 'From $39/seat/mo', winner: 'burflow' },
    ],
    faqs: [
      {
        q: 'Can BurFlow replace Intercom entirely?',
        a: 'If your primary need is sales conversion and lead qualification, BurFlow can replace Intercom\'s bot features. For comprehensive help desk and support workflows, you may still want a dedicated support tool.',
      },
      {
        q: 'Does BurFlow integrate with Intercom?',
        a: 'BurFlow works standalone but can complement Intercom. Many teams use BurFlow for top-of-funnel qualification and hand off to Intercom for ongoing support.',
      },
      {
        q: 'How does pricing compare?',
        a: 'BurFlow starts at $0/mo for 100 messages. Intercom starts at $39/seat/mo. For a 5-person team, Intercom costs $195/mo minimum. BurFlow\'s Starter plan is $49/mo total.',
      },
    ],
    verdict:
      'Choose BurFlow if you want autonomous sales conversion with zero setup. Choose Intercom if you need a full support platform with live chat and help desk.',
  },
  'burflow-vs-drift': {
    title: 'BurFlow vs Drift (Salesloft): Speed-to-Value Showdown',
    description:
      'Drift pioneered conversational marketing but requires heavy configuration and enterprise pricing. BurFlow auto-extracts your offer from your website and works in under 10 minutes.',
    competitor: 'Drift (Salesloft)',
    competitorDescription:
      'Drift is an enterprise-grade conversational marketing platform acquired by Salesloft. It offers sophisticated routing, scheduling, and CRM integration but requires significant implementation.',
    burflowAdvantage:
      'Drift needs playbooks, routing rules, and manual knowledge base setup. BurFlow scans your website, learns your offer automatically, and starts converting — no playbooks needed.',
    keyDifferences: [
      { feature: 'Implementation', burflow: 'Website scan + 1 snippet', competitor: 'Enterprise implementation (weeks)', winner: 'burflow' },
      { feature: 'AI training', burflow: 'Automatic (site scraping)', competitor: 'Manual playbook creation', winner: 'burflow' },
      { feature: 'Enterprise features', burflow: 'Growing', competitor: 'Mature (routing, CRM, ABM)', winner: 'competitor' },
      { feature: 'Pricing', burflow: 'From $0/mo', competitor: 'Enterprise pricing ($2,500+/mo)', winner: 'burflow' },
      { feature: 'Buying intent detection', burflow: 'AI-powered', competitor: 'Rule-based signals', winner: 'burflow' },
      { feature: 'CRM integration', burflow: 'Basic (API)', competitor: 'Deep (Salesforce, HubSpot)', winner: 'competitor' },
    ],
    faqs: [
      {
        q: 'Is Drift better for enterprise?',
        a: 'Drift offers more enterprise features like advanced routing, ABM integration, and Salesforce sync. BurFlow is better for teams that want fast deployment and autonomous qualification without enterprise overhead.',
      },
      {
        q: 'How much does Drift cost vs BurFlow?',
        a: 'Drift typically costs $2,500+/mo for enterprise. BurFlow starts free and scales to $99/mo. For most SMBs and mid-market, BurFlow delivers better ROI.',
      },
    ],
    verdict:
      'Choose BurFlow for fast, autonomous conversion without enterprise overhead. Choose Drift if you need deep CRM integration and enterprise routing.',
  },
  'burflow-vs-hubspot-chatbot': {
    title: 'BurFlow vs HubSpot Chatbot: Standalone vs Ecosystem',
    description:
      'HubSpot\'s chatbot lives inside its CRM ecosystem. BurFlow works standalone, understands your pricing, and qualifies visitors based on buying intent — not form fills.',
    competitor: 'HubSpot Chatbot',
    competitorDescription:
      'HubSpot offers a free chatbot as part of its CRM platform. It handles basic conversations and can book meetings, but requires HubSpot CRM and manual bot flow setup.',
    burflowAdvantage:
      'HubSpot\'s chatbot only knows what you manually train it. BurFlow scans your entire website — products, pricing, FAQs, case studies — and uses that knowledge to guide visitors.',
    keyDifferences: [
      { feature: 'Knowledge source', burflow: 'Full website scan', competitor: 'Manual training only', winner: 'burflow' },
      { feature: 'Pricing awareness', burflow: 'Automatic', competitor: 'Manual setup', winner: 'burflow' },
      { feature: 'CRM integration', burflow: 'API-based', competitor: 'Native (if using HubSpot)', winner: 'competitor' },
      { feature: 'Free tier', burflow: '100 messages/mo', competitor: 'Unlimited (if using HubSpot)', winner: 'tie' },
      { feature: 'Buying intent', burflow: 'AI-powered detection', competitor: 'Not available', winner: 'burflow' },
      { feature: 'Setup time', burflow: 'Under 10 minutes', competitor: '30+ minutes (bot flows)', winner: 'burflow' },
    ],
    faqs: [
      {
        q: 'Can I use BurFlow with HubSpot CRM?',
        a: 'Yes. BurFlow works standalone but can send leads to HubSpot via API. Many teams use BurFlow for qualification and HubSpot for CRM management.',
      },
      {
        q: 'Is HubSpot chatbot free?',
        a: 'HubSpot offers a free chatbot in its free CRM tier. However, it requires manual training and doesn\'t auto-extract knowledge from your website like BurFlow.',
      },
    ],
    verdict:
      'Choose BurFlow for autonomous qualification and product-aware conversations. Choose HubSpot if you\'re already in the HubSpot ecosystem and need basic chat.',
  },
  'burflow-vs-tidio': {
    title: 'BurFlow vs Tidio: Product-Aware vs Basic Chat',
    description:
      'Tidio is a live chat widget with basic AI. BurFlow goes further: it scans your site, recommends products, detects buying intent, and captures demos — all automatically.',
    competitor: 'Tidio',
    competitorDescription:
      'Tidio is a popular live chat and chatbot platform for SMBs. It offers basic AI responses, live chat, and email integration at affordable prices.',
    burflowAdvantage:
      'Tidio handles basic chat but doesn\'t understand your products or pricing. BurFlow reads your website, knows your offer, and guides visitors toward conversion.',
    keyDifferences: [
      { feature: 'AI depth', burflow: 'Site-grounded, product-aware', competitor: 'Basic FAQ matching', winner: 'burflow' },
      { feature: 'Demo booking', burflow: 'Built-in', competitor: 'Not available', winner: 'burflow' },
      { feature: 'Pricing', burflow: 'From $0/mo', competitor: 'From $29/mo', winner: 'burflow' },
      { feature: 'Ease of setup', burflow: 'Website scan', competitor: 'Widget install + manual config', winner: 'burflow' },
      { feature: 'Live chat', burflow: 'AI-first (human fallback)', competitor: 'Live chat first', winner: 'tie' },
      { feature: 'Email integration', burflow: 'Basic', competitor: 'Included', winner: 'competitor' },
    ],
    faqs: [
      {
        q: 'Is Tidio cheaper than BurFlow?',
        a: 'Tidio starts at $29/mo. BurFlow has a free tier (100 messages) and Starter at $49/mo. For basic chat, Tidio may be cheaper. For sales conversion, BurFlow delivers more value.',
      },
    ],
    verdict:
      'Choose BurFlow for autonomous sales conversion and product-aware guidance. Choose Tidio for affordable live chat with basic automation.',
  },
  'burflow-vs-custom-build': {
    title: 'BurFlow vs Custom AI Chat Build: Build vs Buy',
    description:
      'Custom AI chat requires ML engineers, prompt tuning, knowledge-base maintenance, and ongoing costs. BurFlow handles all of that with a website scan and one snippet.',
    competitor: 'Custom AI Chat Build',
    competitorDescription:
      'Building your own AI chatbot means hiring ML engineers, selecting an LLM, building a knowledge base, and maintaining the system. It offers full control but at significant cost.',
    burflowAdvantage:
      'A custom build costs $50K-$200K+ in engineering time and months of development. BurFlow delivers the same outcome in 10 minutes for $0-$99/mo.',
    keyDifferences: [
      { feature: 'Time to launch', burflow: '10 minutes', competitor: '3-6 months', winner: 'burflow' },
      { feature: 'Upfront cost', burflow: '$0', competitor: '$50K-$200K+', winner: 'burflow' },
      { feature: 'Ongoing maintenance', burflow: 'Included', competitor: 'Your team', winner: 'burflow' },
      { feature: 'Customization', burflow: 'Configurable (themes, responses)', competitor: 'Unlimited (you own the code)', winner: 'competitor' },
      { feature: 'LLM updates', burflow: 'Automatic', competitor: 'Manual upgrade', winner: 'burflow' },
      { feature: 'Data ownership', burflow: 'Yours (we never train on it)', competitor: 'Yours (you control everything)', winner: 'tie' },
    ],
    faqs: [
      {
        q: 'When should I build custom instead of using BurFlow?',
        a: 'If you have a unique use case that BurFlow can\'t handle (e.g., complex multi-step workflows, proprietary data processing), building custom may make sense. For most sales conversion needs, BurFlow is faster and cheaper.',
      },
      {
        q: 'Does BurFlow train on my data?',
        a: 'Never. Your website content is used only to answer your visitors. It is not used to train any models.',
      },
    ],
    verdict:
      'Choose BurFlow for fast, affordable conversion. Build custom only if you have unique requirements that off-the-shelf tools can\'t address.',
  },
};

export default function ComparisonArticle() {
  const { slug } = useParams<{ slug: string }>();
  const data = slug ? comparisons[slug] : undefined;

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Comparison not found</h1>
          <Link to="/compare" className="mt-4 inline-block text-[var(--color-accent-600)]">
            ← Back to comparisons
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={data.title}
        description={data.description}
        canonicalPath={`/compare/${slug}`}
      />
      <article className="mx-auto max-w-3xl px-6 pt-24 pb-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Link to="/compare" className="text-sm text-[var(--color-neutral-400)] hover:text-[var(--color-accent-600)]">
            ← All comparisons
          </Link>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-[var(--color-neutral-900)] md:text-5xl">
            {data.title}
          </h1>
          <p className="mt-4 text-lg text-[var(--color-neutral-500)]">{data.description}</p>

          {/* Verdict box */}
          <div className="mt-8 rounded-2xl border border-[var(--color-accent-600)]/20 bg-[var(--color-accent-600)]/5 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-accent-600)]">Verdict</h2>
            <p className="mt-2 text-[var(--color-neutral-700)]">{data.verdict}</p>
          </div>

          {/* Comparison table */}
          <h2 className="mt-12 text-2xl font-bold text-[var(--color-neutral-900)]">Feature Comparison</h2>
          <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-neutral-200)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-neutral-50)]">
                <tr>
                  <th className="px-4 py-3 font-semibold text-[var(--color-neutral-900)]">Feature</th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-accent-600)]">BurFlow</th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-neutral-600)]">{data.competitor}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-neutral-100)]">
                {data.keyDifferences.map((row) => (
                  <tr key={row.feature} className="hover:bg-[var(--color-neutral-50)]/50">
                    <td className="px-4 py-3 font-medium text-[var(--color-neutral-900)]">{row.feature}</td>
                    <td className="px-4 py-3 text-[var(--color-neutral-700)]">
                      <span className="flex items-center gap-1.5">
                        {row.winner === 'burflow' && <span className="text-[var(--color-accent-600)]">✓</span>}
                        {row.burflow}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-neutral-700)]">
                      <span className="flex items-center gap-1.5">
                        {row.winner === 'competitor' && <span className="text-[var(--color-accent-600)]">✓</span>}
                        {row.competitor}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Competitor section */}
          <h2 className="mt-12 text-2xl font-bold text-[var(--color-neutral-900)]">
            What is {data.competitor}?
          </h2>
          <p className="mt-3 text-[var(--color-neutral-600)]">{data.competitorDescription}</p>

          <h2 className="mt-8 text-2xl font-bold text-[var(--color-neutral-900)]">
            Why teams choose BurFlow instead
          </h2>
          <p className="mt-3 text-[var(--color-neutral-600)]">{data.burflowAdvantage}</p>

          {/* FAQs */}
          <h2 className="mt-12 text-2xl font-bold text-[var(--color-neutral-900)]">
            Frequently Asked Questions
          </h2>
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
            <h2 className="text-2xl font-bold text-white">Try BurFlow free</h2>
            <p className="mt-2 text-white/80">Scan your website and see how it compares — no card required.</p>
            <Link
              to="/"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-[var(--color-accent-600)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              Scan my website free
            </Link>
          </div>
        </motion.div>
      </article>
    </>
  );
}
