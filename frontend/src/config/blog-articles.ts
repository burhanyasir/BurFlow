export interface BlogArticle {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  publishDate: string;
  schema?: Record<string, unknown>;
}

export const blogArticles: BlogArticle[] = [
  // ── Buyer-intent keywords ──────────────────────────────────────────────
  {
    slug: 'best-ai-sales-agent-for-saas-2026',
    title: 'Best AI Sales Agent for SaaS in 2026: How to Turn Website Traffic Into Pipeline',
    excerpt:
      'Compare the top AI sales agents for SaaS companies. Learn how autonomous agents qualify visitors, book demos, and replace dead-end chatbots — without manual setup.',
    category: 'Comparison',
    readTime: '8 min',
    publishDate: '2026-08-18',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Best AI Sales Agent for SaaS in 2026',
      description: 'Compare the top AI sales agents for SaaS companies and learn how autonomous agents qualify visitors and book demos.',
      datePublished: '2026-08-18',
      author: { '@type': 'Organization', name: 'BurFlow' },
      publisher: { '@type': 'Organization', name: 'BurFlow' },
    },
  },
  {
    slug: 'ai-chatbot-vs-ai-sales-agent',
    title: 'AI Chatbot vs AI Sales Agent: Why Chatbots Lose Visitors at the Moment of Decision',
    excerpt:
      'Standard chatbots answer questions but never qualify, recommend, or book. Here\'s why sales agents outperform chatbots on every metric that matters.',
    category: 'Education',
    readTime: '6 min',
    publishDate: '2026-08-15',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'AI Chatbot vs AI Sales Agent',
      datePublished: '2026-08-15',
      author: { '@type': 'Organization', name: 'BurFlow' },
    },
  },
  {
    slug: 'how-to-convert-website-visitors-into-demos',
    title: 'How to Convert Website Visitors Into Demos: The Complete Guide',
    excerpt:
      'Stop losing high-intent visitors to dead-end forms. Learn the exact playbook for turning anonymous traffic into booked demos with AI-guided qualification.',
    category: 'Guide',
    readTime: '12 min',
    publishDate: '2026-08-12',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'How to Convert Website Visitors Into Demos',
      datePublished: '2026-08-12',
      author: { '@type': 'Organization', name: 'BurFlow' },
    },
  },
  {
    slug: 'automated-lead-qualification-website',
    title: 'Automated Lead Qualification on Your Website: No Forms, No Manual Work',
    excerpt:
      'Traditional lead qualification requires forms, CRMs, and human follow-up. AI agents can qualify visitors in real time using buying-intent signals — here\'s how.',
    category: 'Guide',
    readTime: '9 min',
    publishDate: '2026-08-10',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Automated Lead Qualification on Your Website',
      datePublished: '2026-08-10',
      author: { '@type': 'Organization', name: 'BurFlow' },
    },
  },
  {
    slug: 'why-your-chatbot-is-leaving-money-on-the-table',
    title: 'Why Your Chatbot Is Leaving Money on the Table (And What to Do Instead)',
    excerpt:
      'Your chatbot answers questions but never closes. It doesn\'t understand pricing, can\'t qualify intent, and leaves visitors without a next step. Here\'s the fix.',
    category: 'Education',
    readTime: '7 min',
    publishDate: '2026-08-08',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Why Your Chatbot Is Leaving Money on the Table',
      datePublished: '2026-08-08',
      author: { '@type': 'Organization', name: 'BurFlow' },
    },
  },
  // ── Long-tail buyer keywords ────────────────────────────────────────────
  {
    slug: 'how-to-qualify-leads-with-ai-chatbot',
    title: 'How to Qualify Leads With an AI Chatbot (Step-by-Step)',
    excerpt:
      'Stop wasting sales time on unqualified traffic. Learn how AI chatbots can score buying intent, collect key info, and route only warm leads to your team.',
    category: 'Guide',
    readTime: '10 min',
    publishDate: '2026-08-16',
  },
  {
    slug: 'best-chatbot-for-saas-pricing-page',
    title: 'Best Chatbot for SaaS Pricing Pages: Qualify Visitors Automatically',
    excerpt:
      'Your pricing page gets traffic but no conversions. Here\'s how the right AI chatbot qualifies visitors, answers pricing questions, and books demos from your pricing page.',
    category: 'Guide',
    readTime: '7 min',
    publishDate: '2026-08-14',
  },
  {
    slug: 'reduce-customer-support-costs-with-ai',
    title: 'How to Reduce Customer Support Costs by 40% With AI',
    excerpt:
      'Support teams are drowning in repetitive tickets. AI sales agents can handle Tier-1 questions, qualify leads, and reduce support costs — here\'s the playbook.',
    category: 'Guide',
    readTime: '8 min',
    publishDate: '2026-08-11',
  },
  {
    slug: 'automate-demo-bookings-from-website',
    title: 'Automate Demo Bookings From Your Website (No Forms Required)',
    excerpt:
      'Forms convert at 2-5%. AI-guided conversations convert at 15-30%. Here\'s how to replace your demo form with an intelligent booking flow.',
    category: 'Guide',
    readTime: '6 min',
    publishDate: '2026-08-07',
  },
  {
    slug: 'ai-sales-agent-vs-traditional-chatbot',
    title: 'AI Sales Agent vs Traditional Chatbot: What\'s the Difference?',
    excerpt:
      'Not all chatbots are equal. Learn the key differences between basic chatbots and AI sales agents that actually convert visitors into customers.',
    category: 'Education',
    readTime: '5 min',
    publishDate: '2026-08-04',
  },
  // ── Product deep-dives ─────────────────────────────────────────────────
  {
    slug: 'confidence-guarded-ai-responses',
    title: 'Confidence-Guarded AI Responses',
    excerpt:
      'How we built token-by-token confidence scoring that prevents low-quality answers from reaching your customers.',
    category: 'Engineering',
    readTime: '5 min',
    publishDate: '2026-08-05',
  },
  {
    slug: 'grounding-eliminates-hallucinations',
    title: 'How Grounding Eliminates Hallucinations',
    excerpt:
      'A deep dive into the grounding architecture that ties every response to verifiable sources.',
    category: 'Engineering',
    readTime: '6 min',
    publishDate: '2026-08-01',
  },
];

/** Get articles grouped by category */
export function getBlogByCategory(): Record<string, BlogArticle[]> {
  const grouped: Record<string, BlogArticle[]> = {};
  for (const article of blogArticles) {
    if (!grouped[article.category]) grouped[article.category] = [];
    grouped[article.category].push(article);
  }
  return grouped;
}

/** Get a single article by slug */
export function getBlogArticle(slug: string): BlogArticle | undefined {
  return blogArticles.find((a) => a.slug === slug);
}

/** Get recent articles (sorted by publishDate desc) */
export function getRecentArticles(count = 5): BlogArticle[] {
  return [...blogArticles].sort((a, b) => b.publishDate.localeCompare(a.publishDate)).slice(0, count);
}
