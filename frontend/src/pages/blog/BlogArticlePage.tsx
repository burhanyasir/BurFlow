import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { Seo } from '../../components/seo/Seo';

interface BlogArticle {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  author: string;
  authorTitle: string;
  date: string;
  readingTime: string;
}

const articles: BlogArticle[] = [
  {
    slug: 'confidence-guarded-ai-responses',
    title: 'Introducing Confidence-Guarded AI Responses',
    category: 'Product',
    excerpt: 'How we built token-by-token confidence scoring that prevents low-quality answers from reaching your customers — and what it means for your support team.',
    content: `Every AI support platform claims to deliver accurate answers. But accuracy isn't binary — it's a spectrum. A response can start strong and veer into uncertainty mid-sentence. Traditional systems evaluate confidence at the response level, if at all. That leaves a dangerous blind spot.

We built Confidence-Guarded AI Responses to solve this at the token level. Every token the model generates passes through a real-time confidence scorer that evaluates semantic alignment against grounded sources. If confidence drops below configurable thresholds, the system intervenes — surfacing a citation, requesting clarification, or escalating to a human.

The architecture is straightforward: a lightweight scorer runs alongside the generation loop, consuming hidden-state embeddings and cross-attention weights. Within 8–12ms of overhead per response, we gain per-token confidence signals that drive guardrails without degrading latency.

For support teams, this means no more "hallucinated" policy quotes, no more confident-sounding but wrong answers. Your customers get responses that are either correct or explicitly flagged as uncertain — with a clear path to resolution.

We open-sourced the scoring core at github.com/conversationengine/confidence-guard. The integration guide covers the three deployment modes: inline (same-process), sidecar (local network), and remote (API gateway).`,
    author: 'Product Team',
    authorTitle: 'Product Team, Conversation Engine',
    date: 'July 15, 2026',
    readingTime: '6 min read',
  },
  {
    slug: 'grounding-eliminates-hallucinations',
    title: 'How Grounding Eliminates Hallucinations in AI Support',
    category: 'Engineering',
    excerpt: 'A deep dive into the grounding architecture that ties every response to verifiable sources — eliminating hallucinations at the protocol level.',
    content: `Hallucinations are the #1 barrier to production AI support. Models generate fluent text that sounds correct but isn't. Traditional retrieval-augmented generation (RAG) helps, but it doesn't guarantee fidelity — the model can still ignore retrieved context.

Our grounding architecture takes a different approach. Instead of treating retrieved documents as hints, we encode them as hard constraints. The generation process is guided by a grounding verifier that cross-references each claim against source material in real time.

The pipeline has three stages: retrieval, constraint encoding, and verified generation. Retrieval identifies the top-k relevant chunks from the knowledge base. Constraint encoding converts these into structured fact triples that the verifier understands. Verified generation runs the model with active constraint enforcement — if a generated token would produce a claim unsupported by the triples, the verifier suppresses it and the model must either cite a source or rephrase.

Benchmarks show a 99.7% reduction in hallucinated claims across 10,000 test queries. False negatives (correct answers blocked) sit at 0.3%. We consider this production-ready for any support domain with a maintained knowledge base.

The full grounding specification is available in our documentation. Implementation requires Python 3.11+ and integrates with any OpenAI-compatible chat endpoint.`,
    author: 'Engineering Team',
    authorTitle: 'Engineering Team, Conversation Engine',
    date: 'July 10, 2026',
    readingTime: '8 min read',
  },
  {
    slug: 'soc-2-compliance',
    title: 'SOC 2 Compliance: What It Means for Our Customers',
    category: 'Security',
    excerpt: 'We completed our SOC 2 Type II audit. Here is what the certification covers, how it protects your data, and why it matters for AI-powered support.',
    content: `Security is the foundation of trusted AI. We are proud to announce that Conversation Engine has completed its SOC 2 Type II audit with zero exceptions.

SOC 2 Type II evaluates the effectiveness of controls over a sustained period — six months in our case. The audit covered five trust service criteria: security, availability, processing integrity, confidentiality, and privacy. We opted for the full set rather than the narrower "security only" baseline.

What this means for your organization: every AI response your customers see is generated within an audited control environment. Data at rest is encrypted with AES-256 using tenant-isolated keys. Data in transit uses TLS 1.3 with mandatory mutual authentication. Access to the inference pipeline is logged, monitored, and gated by role-based policies reviewed quarterly.

We also publish our SOC 2 report under NDA for enterprise customers. The report covers 187 individual controls across infrastructure, application, data, and organizational domains.

SOC 2 compliance is part of a broader trust program that includes GDPR readiness, ISO 27001 certification in progress for Q4 2026, and a dedicated Trust Center at trust.conversationengine.com.`,
    author: 'Security Team',
    authorTitle: 'Security Team, Conversation Engine',
    date: 'July 5, 2026',
    readingTime: '5 min read',
  },
  {
    slug: 'state-of-ai-support-2026',
    title: 'The State of AI Customer Support in 2026',
    category: 'Company',
    excerpt: 'An analysis of where the AI support industry stands mid-year — adoption rates, emerging patterns, and the growing demand for grounded, verifiable answers.',
    content: `Mid-2026 marks a pivotal moment for AI-powered customer support. Adoption has crossed 45% of mid-market companies, up from 22% in 2024. But the conversation has shifted — from "should we use AI?" to "how do we trust AI?"

Three trends define the current landscape.

First, the grounding imperative. Early adopters who deployed ungrounded chatbots in 2024 are now replacing them with grounded alternatives. The cost of hallucinated answers — lost customers, compliance risk, brand damage — has proven too high. Grounded AI support is no longer a differentiator; it is table stakes.

Second, the human-AI hybrid model is winning. Pure automation (no human in the loop) peaked at 30% of deployments in 2025 and is declining. The most effective support teams use AI as a force multiplier — handling routine queries with grounded confidence scoring while escalating nuanced cases with full context to human agents.

Third, compliance is driving procurement. SOC 2, GDPR, and HIPAA compliance are now mandatory requirements in 70% of enterprise RFPs for AI support platforms. The market is consolidating around vendors who can prove audit readiness.

At Conversation Engine, we built for this reality from day one. Every feature — from token-level confidence scoring to tenant-isolated encryption — is designed to make compliance a side effect of good engineering.`,
    author: 'CEO',
    authorTitle: 'CEO, Conversation Engine',
    date: 'June 28, 2026',
    readingTime: '10 min read',
  },
  {
    slug: 'knowledge-base-optimization',
    title: 'A Guide to Knowledge Base Optimization',
    category: 'Product',
    excerpt: 'Best practices for structuring your knowledge base so your AI assistant surfaces the right answer every time — with less maintenance overhead.',
    content: `Your knowledge base is the single largest determinant of AI support quality. A well-structured KB produces accurate, grounded responses. A neglected KB produces hallucinations, frustrated customers, and escalations.

Here are the optimization principles we have developed working with 200+ production deployments.

Principle 1: Atomicity. Each KB article should cover exactly one concept. An article about "refund policy" should not also cover "shipping times." Atomic articles improve retrieval precision and make confidence scoring more reliable.

Principle 2: Structured metadata. Tag every article with intent categories (e.g., billing, troubleshooting, account), audience segments, and associated product versions. The grounding verifier uses metadata to weight sources — metadata-rich KBs show 34% higher first-response accuracy.

Principle 3: Regular freshness audits. Set up automated checks that flag articles older than 90 days for review. Stale content is the leading cause of grounded-but-wrong answers where the model correctly cites an outdated policy.

Principle 4: Synonym enrichment. Add common alternative phrasings to article titles. If your official term is "termination," but customers say "cancellation" or "closing account," add those as aliases. This lifts retrieval recall by 22% on average.

We built KB optimization tools directly into the Conversation Engine dashboard — freshness scoring, coverage maps, and synonym suggestions are available in the Knowledge section.`,
    author: 'Product Team',
    authorTitle: 'Product Team, Conversation Engine',
    date: 'June 20, 2026',
    readingTime: '7 min read',
  },
  {
    slug: 'tenant-isolation',
    title: 'Tenant Isolation: How We Keep Your Data Private',
    category: 'Engineering',
    excerpt: 'A look at the multi-tenant architecture powering Conversation Engine — row-level security, encrypted silos, and strict isolation boundaries.',
    content: `Multi-tenant SaaS platforms face a fundamental challenge: how do you share infrastructure for efficiency while guaranteeing that tenant A never accesses tenant B's data?

Our isolation architecture solves this with three layers.

Layer 1 — Row-level security (RLS). Every database query includes a tenant ID filter enforced at the query planner level. Not in application code — in the database itself. Even a misconfigured application cannot leak cross-tenant data because the RLS policy is attached to the table schema.

Layer 2 — Encrypted tenant silos. Each tenant's knowledge base is encrypted with a unique key stored in a hardware-backed key management system. Inference requests decrypt content in-memory only for the duration of generation, with strict memory fencing.

Layer 3 — Audit logging. Every data access — read, write, or inference — is logged with tenant ID, user ID, resource type, and operation timestamp. Logs are immutable and retained for 12 months. Automated anomaly detection alerts on patterns that suggest cross-tenant access attempts.

We also offer dedicated tenant isolation (physical infrastructure) for enterprise customers with regulatory requirements. This is managed via the same control plane but provisions separate compute clusters, databases, and key hierarchies.

The isolation model is documented in our SOC 2 report and available for architecture review under NDA.`,
    author: 'Engineering Team',
    authorTitle: 'Engineering Team, Conversation Engine',
    date: 'June 12, 2026',
    readingTime: '6 min read',
  },
];

const relatedArticles = [
  {
    slug: 'state-of-ai-support-2026',
    title: 'The State of AI Customer Support in 2026',
    category: 'Company',
    excerpt: 'An analysis of where the AI support industry stands mid-year.',
    author: 'CEO',
    date: 'June 28, 2026',
    readingTime: '10 min read',
  },
  {
    slug: 'soc-2-compliance',
    title: 'SOC 2 Compliance: What It Means for Our Customers',
    category: 'Security',
    excerpt: 'We completed our SOC 2 Type II audit.',
    author: 'Security Team',
    date: 'July 5, 2026',
    readingTime: '5 min read',
  },
  {
    slug: 'knowledge-base-optimization',
    title: 'A Guide to Knowledge Base Optimization',
    category: 'Product',
    excerpt: 'Best practices for structuring your knowledge base.',
    author: 'Product Team',
    date: 'June 20, 2026',
    readingTime: '7 min read',
  },
];

function AuthorAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('');
  return (
    <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 bg-[rgba(168,36,75,0.2)] text-[#C94F72] border border-[rgba(168,36,75,0.2)]">
      {initials}
    </div>
  );
}

function CategoryBadge({ label }: { label: string }) {
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[rgba(168,36,75,0.15)] text-[#C94F72] border border-[rgba(168,36,75,0.25)]">
      {label}
    </span>
  );
}

export default function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = articles.find((a) => a.slug === slug) ?? articles[0];

  return (
    <div className="bg-[#08080A] min-h-screen">
      <Seo title={article.title} description={article.excerpt} path={`/blog/${article.slug}`} />
      {/* ── BACK LINK ─────────────────────────────────────── */}
      <div className="mx-auto px-4 md:px-8 pt-28 md:pt-36" style={{ maxWidth: 800 }}>
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#6B6B76] hover:text-[#F5F5F7] transition-colors duration-200"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Blog
          </Link>
        </motion.div>
      </div>

      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="mx-auto px-4 md:px-8 pt-8 pb-10" style={{ maxWidth: 800 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <CategoryBadge label={article.category} />
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-[#F5F5F7] leading-tight">
            {article.title}
          </h1>
          <p className="mt-4 text-base md:text-lg text-[#6B6B76] leading-relaxed">
            {article.excerpt}
          </p>
          <div className="mt-6 flex items-center gap-4 text-sm text-[#6B6B76]">
            <div className="flex items-center gap-3">
              <AuthorAvatar name={article.author} />
              <div>
                <p className="font-medium text-[#A1A1AA]">{article.author}</p>
                <p className="text-xs">{article.authorTitle}</p>
              </div>
            </div>
            <span className="ml-auto flex items-center gap-2 text-xs">
              <span>{article.date}</span>
              <span className="w-1 h-1 rounded-full bg-[#6B6B76]" />
              <span>{article.readingTime}</span>
            </span>
          </div>
        </motion.div>
      </section>

      {/* ── DIVIDER ───────────────────────────────────────── */}
      <div className="mx-auto px-4 md:px-8" style={{ maxWidth: 800 }}>
        <div className="border-t border-[rgba(255,255,255,0.06)]" />
      </div>

      {/* ── CONTENT ───────────────────────────────────────── */}
      <article className="mx-auto px-4 md:px-8 py-10" style={{ maxWidth: 800 }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="prose prose-sm prose-invert max-w-none"
          style={{ color: '#C4C4CF' }}
        >
          {article.content.split('\n\n').map((paragraph, i) => (
            <p key={i} className="mb-6 leading-[1.8] text-[15px] text-[#C4C4CF]">
              {paragraph}
            </p>
          ))}
        </motion.div>

        {/* ── SOCIAL SHARE ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="mt-12 pt-8 border-t border-[rgba(255,255,255,0.06)]"
        >
          <p className="text-sm font-medium text-[#6B6B76] mb-4">Share this article</p>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[rgba(255,255,255,0.04)] text-[#A1A1AA] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[#F5F5F7] transition-all duration-200">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.23H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Twitter
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[rgba(255,255,255,0.04)] text-[#A1A1AA] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[#F5F5F7] transition-all duration-200">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              LinkedIn
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[rgba(255,255,255,0.04)] text-[#A1A1AA] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[#F5F5F7] transition-all duration-200">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Copy link
            </button>
          </div>
        </motion.div>
      </article>

      {/* ── RELATED ARTICLES ──────────────────────────────── */}
      <section className="mx-auto px-4 md:px-8 pb-24" style={{ maxWidth: 1200 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-xl font-bold text-[#F5F5F7] mb-8">
            Related Articles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedArticles.map((item) => (
              <Link
                key={item.slug}
                to={`/blog/${item.slug}`}
                className={cn(
                  'group flex flex-col rounded-xl p-5 transition-all duration-300',
                  'bg-[rgba(18,18,24,0.65)] backdrop-blur-[28px] border border-[rgba(255,255,255,0.08)]',
                  'hover:border-[rgba(255,255,255,0.14)] hover:bg-[rgba(18,18,24,0.75)]'
                )}
              >
                <span className="px-2.5 py-0.5 self-start rounded-full text-[11px] font-medium bg-[rgba(168,36,75,0.15)] text-[#C94F72] border border-[rgba(168,36,75,0.25)]">
                  {item.category}
                </span>
                <h3 className="mt-3 text-base font-semibold leading-snug text-[#F5F5F7] group-hover:text-[#C94F72] transition-colors duration-200">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-[#6B6B76] line-clamp-2">
                  {item.excerpt}
                </p>
                <div className="mt-auto pt-4 flex items-center gap-2 text-xs text-[#6B6B76]">
                  <AuthorAvatar name={item.author} />
                  <span className="font-medium text-[#A1A1AA]">{item.author}</span>
                  <span className="ml-auto">{item.readingTime}</span>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </section>
    </div>
  );
}