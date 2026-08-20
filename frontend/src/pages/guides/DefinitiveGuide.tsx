import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEO } from '../../components/SEO';
import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '../../lib/site';

const sections = [
  {
    id: 'what-are-ai-sales-agents',
    title: 'What Are AI Sales Agents?',
    content: `AI sales agents are autonomous software that engage website visitors, understand your products and pricing, qualify buying intent, and guide visitors toward booking a demo or making a purchase — without human intervention.

Unlike traditional chatbots that rely on pre-programmed scripts, AI sales agents use large language models (LLMs) to:
- Understand natural language questions about your business
- Extract product information directly from your website
- Detect buying intent signals (pricing inquiries, feature comparisons, urgency)
- Recommend the right plan or product based on visitor needs
- Book demos and capture lead information automatically

The key difference from standard chatbots: AI sales agents are grounded in your actual website content. They don't hallucinate answers — they pull from your product pages, pricing, FAQs, and documentation to give accurate, site-specific responses.`,
  },
  {
    id: 'how-they-work',
    title: 'How AI Sales Agents Work',
    content: `AI sales agents follow a 4-step process:

**1. Website Scanning**
The agent crawls your website and extracts key information: product names, pricing tiers, features, services, FAQs, and buyer intent signals. This happens automatically — no manual knowledge base setup required.

**2. Visitor Qualification**
When a visitor opens the chat, the agent detects their buying intent (low/medium/high) based on:
- Which pages they visited (pricing page = high intent)
- What questions they ask ("how much does it cost?" = high intent)
- How they interact with the conversation (engaged vs casual)

**3. Guided Conversation**
The agent provides grounded, accurate answers to visitor questions. It recommends the right product or plan, handles objections, and moves the conversation toward a clear next step.

**4. Lead Capture & Demo Booking**
The agent captures email, company info, and booking details. Qualified leads get routed to your sales team with full conversation context.`,
  },
  {
    id: 'benefits',
    title: 'Benefits of AI Sales Agents',
    content: `**For conversion rates:**
- 2-5x increase in qualified conversations vs static forms
- 15-30% conversion rate from engaged visitors (vs 2-5% for forms)
- Same-session demo bookings instead of multi-day follow-up

**For sales teams:**
- Only qualified leads reach human reps
- Full conversation context and buying intent score
- No more "what does your product do?" calls

**For support teams:**
- 40% reduction in repetitive question handling
- AI handles Tier-1 questions automatically
- Human agents focus on complex issues

**For marketing:**
- Captures leads that would have bounced
- Email addresses from visitors who never fill out forms
- Conversation data reveals what visitors actually care about`,
  },
  {
    id: 'vs-chatbots',
    title: 'AI Sales Agents vs Traditional Chatbots',
    content: `| Feature | Traditional Chatbot | AI Sales Agent |
|---------|-------------------|----------------|
| Knowledge source | Manual training | Auto-extracted from website |
| Product awareness | Basic FAQ matching | Full product/pricing understanding |
| Qualification | None or rule-based | AI-driven buying intent detection |
| Conversation quality | Scripted responses | Natural, grounded dialogue |
| Demo booking | Usually separate | Built-in calendar integration |
| Setup time | Days to weeks | Under 10 minutes |
| Pricing awareness | Manual config | Automatic from pricing pages |
| Objection handling | Generic | Context-aware with proof points |

The fundamental difference: chatbots answer questions, AI sales agents convert visitors.`,
  },
  {
    id: 'implementation',
    title: 'How to Implement AI Sales Agents',
    content: `Implementing an AI sales agent takes three steps:

**Step 1: Connect Your Website**
Provide your website URL. The agent scans your pages, extracts products, pricing, and services. This takes 1-2 minutes.

**Step 2: Add the Widget**
Copy one line of code and paste it into your website's <head> tag. The chat widget appears on every page.

**Step 3: Configure Qualification Rules**
Set which pages trigger high-intent engagement (pricing, demo request) and how leads get routed to your team.

Total time: Under 10 minutes. No engineering required.`,
  },
  {
    id: 'choosing',
    title: 'How to Choose an AI Sales Agent',
    content: `When evaluating AI sales agents, look for:

**1. Auto-extraction vs manual training**
The best agents scan your website automatically. Avoid tools that require you to manually build and maintain a knowledge base.

**2. Grounded responses**
Responses should cite sources from your website. This prevents hallucinations and builds visitor trust.

**3. Buying intent detection**
The agent should detect high-intent signals (pricing questions, competitor comparisons) and adjust its approach accordingly.

**4. Integration ecosystem**
Check for native integrations with your CRM (HubSpot, Salesforce), scheduling tools (Calendly), and communication channels (Slack).

**5. Pricing model**
Look for usage-based pricing that scales with your traffic. Avoid per-seat pricing that punishes growth.`,
  },
  {
    id: 'pricing',
    title: 'AI Sales Agent Pricing',
    content: `AI sales agent pricing varies widely:

- **Free tiers**: Most tools offer a free tier for small sites (100-500 messages/month)
- **Starter plans**: $29-$99/month for growing sites (1,000-10,000 messages/month)
- **Professional plans**: $99-$299/month for scaling teams (10,000-50,000 messages/month)
- **Enterprise**: $500+/month with custom volume, SSO, and dedicated support

**Cost per qualified lead**: $5-$50 depending on traffic volume and plan
**ROI**: Most teams see 3-10x return within the first quarter

BurFlow specifically offers:
- Free: $0/mo (100 messages, 1 site scan)
- Starter: $49/mo (1,000 messages, 3 scans)
- Professional: $99/mo (10,000 messages, unlimited scans)
- Enterprise: Custom pricing`,
  },
];

export default function DefinitiveGuide() {
  return (
    <>
      <SEO
        title="The Complete Guide to AI Sales Agents (2026): How They Work, Benefits, Pricing"
        description="Everything you need to know about AI sales agents: what they are, how they work, how they compare to chatbots, pricing, and how to choose the right one for your business."
        canonicalPath="/guides/ai-sales-agents"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: 'The Complete Guide to AI Sales Agents (2026)',
          description: 'Everything you need to know about AI sales agents: what they are, how they work, benefits, pricing, and how to choose the right one.',
          datePublished: '2026-08-18',
          author: { '@type': 'Organization', name: 'BurFlow' },
          publisher: { '@type': 'Organization', name: 'BurFlow' },
          mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/guides/ai-sales-agents` },
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'What is an AI sales agent?',
              acceptedAnswer: { '@type': 'Answer', text: 'An AI sales agent is autonomous software that engages website visitors, understands your products and pricing, qualifies buying intent, and guides visitors toward booking a demo — without human intervention.' },
            },
            {
              '@type': 'Question',
              name: 'How much does an AI sales agent cost?',
              acceptedAnswer: { '@type': 'Answer', text: 'Most AI sales agents offer free tiers for small sites ($0/mo), starter plans ($29-$99/mo), and enterprise plans ($500+/mo). BurFlow starts free and scales to $99/mo for most teams.' },
            },
            {
              '@type': 'Question',
              name: 'How do AI sales agents differ from chatbots?',
              acceptedAnswer: { '@type': 'Answer', text: 'Chatbots rely on manual training and scripted responses. AI sales agents automatically scan your website, understand your products, detect buying intent, and have natural conversations that convert visitors into leads.' },
            },
            {
              '@type': 'Question',
              name: 'How long does it take to set up an AI sales agent?',
              acceptedAnswer: { '@type': 'Answer', text: 'Most AI sales agents can be set up in under 10 minutes. You provide your website URL, the agent scans your content, and you add one line of code to your site.' },
            },
            {
              '@type': 'Question',
              name: 'What ROI can I expect from an AI sales agent?',
              acceptedAnswer: { '@type': 'Answer', text: 'Most teams see 2-5x more qualified conversations, 40% reduction in support costs, and 15-30% conversion rates from engaged visitors. ROI typically ranges from 300-1000% within the first quarter.' },
            },
          ],
        })}</script>
      </Helmet>
      <div className="mx-auto max-w-3xl px-6 pt-24 pb-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--color-neutral-900)] md:text-5xl">
            The Complete Guide to AI Sales Agents
          </h1>
          <p className="mt-4 text-lg text-[var(--color-neutral-500)]">
            Everything you need to know about AI sales agents: what they are, how they work, benefits, pricing, and how to choose the right one.
          </p>
          <p className="mt-2 text-sm text-[var(--color-neutral-400)]">
            Last updated: August 2026 · 12 min read
          </p>

          {/* Table of contents */}
          <nav className="mt-10 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-neutral-400)]">Contents</h2>
            <ul className="mt-3 space-y-2">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex items-center gap-3 text-[var(--color-neutral-700)] hover:text-[var(--color-accent-600)] transition-colors">
                    <span className="text-xs text-[var(--color-neutral-400)]">{i + 1}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Guide content */}
          <div className="mt-12 space-y-16">
            {sections.map((section) => (
              <section key={section.id} id={section.id}>
                <h2 className="text-3xl font-bold text-[var(--color-neutral-900)]">{section.title}</h2>
                <div className="mt-6 space-y-4 text-[var(--color-neutral-700)] leading-relaxed">
                  {section.content.split('\n\n').map((para, j) => {
                    if (para.startsWith('|')) {
                      // Render as table
                      const rows = para.split('\n').filter(r => !r.match(/^\|[-\s|]+\|$/));
                      const headers = rows[0]?.split('|').filter(Boolean).map(h => h.trim()) || [];
                      const body = rows.slice(1).map(r => r.split('|').filter(Boolean).map(c => c.trim()));
                      return (
                        <div key={j} className="overflow-x-auto my-6 rounded-xl border border-[var(--color-neutral-200)]">
                          <table className="w-full text-sm">
                            <thead className="bg-[var(--color-neutral-50)]">
                              <tr>{headers.map((h, k) => <th key={k} className="px-4 py-2 text-left font-semibold text-[var(--color-neutral-900)]">{h}</th>)}</tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-neutral-100)]">
                              {body.map((row, k) => <tr key={k}>{row.map((cell, l) => <td key={l} className="px-4 py-2">{cell}</td>)}</tr>)}
                            </tbody>
                          </table>
                        </div>
                      );
                    }
                    if (para.startsWith('**') && para.includes(':**\n')) {
                      const [title, ...items] = para.split('\n');
                      return (
                        <div key={j} className="my-4">
                          <h3 className="font-semibold text-[var(--color-neutral-900)]">{title.replace(/\*\*/g, '')}</h3>
                          <ul className="mt-2 space-y-1">
                            {items.map((item, k) => <li key={k} className="ml-4">{item}</li>)}
                          </ul>
                        </div>
                      );
                    }
                    return <p key={j} dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />;
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-16 rounded-2xl bg-[var(--color-accent-600)] p-8 text-center">
            <h2 className="text-2xl font-bold text-white">Ready to try an AI sales agent?</h2>
            <p className="mt-2 text-white/80">Scan your website for free and see how BurFlow would convert your visitors.</p>
            <Link
              to="/"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-[var(--color-accent-600)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              Scan my website free
            </Link>
          </div>
        </motion.div>
      </div>
    </>
  );
}
