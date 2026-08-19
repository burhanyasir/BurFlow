export type ToolCategory = 'sales-roi' | 'ai-generators' | 'markdown' | 'seo-sitemaps';
export type ToolStatus = 'active' | 'coming-soon';
export type ToolBadge = 'Interactive' | 'Free' | 'Popular';

export interface ToolFaq {
  q: string;
  a: string;
}

export interface ToolSeo {
  title: string;
  description: string;
}

export interface ToolDefinition {
  slug: string;
  name: string;
  shortDescription: string;
  category: ToolCategory;
  badges: ToolBadge[];
  icon: string;
  status: ToolStatus;
  route?: string;
  seo?: ToolSeo;
  faqs?: ToolFaq[];
}

export const TOOL_CATEGORIES: Record<ToolCategory, { label: string; description: string }> = {
  'sales-roi': { label: 'Sales & ROI', description: 'Prove the value of AI in your funnel and support stack.' },
  'ai-generators': { label: 'AI Generators', description: 'Generate copy, FAQs, prompts, and answers in seconds.' },
  'markdown': { label: 'Markdown Converters', description: 'Convert documents, webpages, and pasted text to Markdown.' },
  'seo-sitemaps': { label: 'SEO & Sitemaps', description: 'Find, validate, generate, and analyze XML sitemaps.' },
};

export const TOOL_CATEGORY_ORDER: ToolCategory[] = ['sales-roi', 'ai-generators', 'markdown', 'seo-sitemaps'];

const live = (def: Omit<ToolDefinition, 'status'>): ToolDefinition => ({ ...def, status: 'active' });

const comingSoon = (def: Omit<ToolDefinition, 'status' | 'route' | 'seo' | 'faqs'>): ToolDefinition => ({
  ...def,
  status: 'coming-soon',
});

export const TOOLS: ToolDefinition[] = [
  /* ── Sales & ROI ─────────────────────────────────────────── */
  live({
    slug: 'lead-leak-calculator',
    name: 'SaaS Lead Leak Calculator',
    shortDescription: 'See how much qualified pipeline your website is leaking every month — and what BurFlow could recover.',
    category: 'sales-roi',
    badges: ['Interactive', 'Free', 'Popular'],
    icon: 'calculator',
    route: '/tools/lead-leak-calculator',
    seo: {
      title: 'SaaS Lead Leak Calculator | BurFlow',
      description: 'Calculate how much qualified SaaS pipeline your website leaks each month and estimate recovered revenue with AI lead capture — 15–34% lift benchmarks.',
    },
    faqs: [
      { q: 'How does the lead leak calculator work?', a: 'It compares your actual qualified lead volume against typical B2B SaaS visitor-to-lead benchmarks. The gap between the two is your monthly leak, which is converted into lost revenue using your average contract value (ACV).' },
      { q: 'What does "leaked revenue" mean?', a: 'Leaked revenue is the pipeline value of qualified leads your site should have generated — based on benchmark conversion rates — but never captured because visitors left without converting or qualifying.' },
      { q: 'Where do the 15–34% lift benchmarks come from?', a: 'They reflect the range of pipeline improvements observed when AI chat assistants qualify and capture leads in real time, compared with static forms and no-chat baselines.' },
      { q: 'Is my data stored?', a: 'No. Everything is calculated locally in your browser and never sent to our servers.' },
    ],
  }),
  live({
    slug: 'chatbot-roi-calculator',
    name: 'Chatbot ROI Calculator',
    shortDescription: 'Estimate your company’s potential savings with an AI-powered chat solution across your support and sales stack.',
    category: 'sales-roi',
    badges: ['Interactive', 'Free'],
    icon: 'zap',
    route: '/tools/chatbot-roi-calculator',
    seo: {
      title: 'Chatbot ROI Calculator | BurFlow',
      description: 'Estimate cost reductions from AI-powered chat for customer service and sales. Calculate monthly savings, annual ROI, and payback in minutes.',
    },
    faqs: [
      { q: 'What does the chatbot ROI calculator measure?', a: 'It estimates the fully-loaded cost of your current support workload and compares it against an AI chatbot that deflects a share of tickets, then subtracts the chatbot’s subscription cost.' },
      { q: 'What is a "deflected ticket"?', a: 'A ticket that the chatbot resolves end-to-end without a human agent, so it never reaches your support team.' },
      { q: 'What deflection rate should I use?', a: 'A conservative 20–30% for general chat, up to 40–60% for well-trained knowledge bases. The calculator defaults to 40% and lets you adjust.' },
      { q: 'Does the calculator include implementation costs?', a: 'No — it focuses on recurring operational savings. Implementation is typically one-time and, with BurFlow, takes under an hour.' },
    ],
  }),

  /* ── AI Generators ───────────────────────────────────────── */
  live({
    slug: 'faq-generator',
    name: 'AI FAQ Generator',
    shortDescription: 'Turn any topic, text, or URL into a comprehensive, SEO-ready FAQ in seconds.',
    category: 'ai-generators',
    badges: ['Free', 'Popular'],
    icon: 'list-checks',
    route: '/tools/faq-generator',
    seo: {
      title: 'AI FAQ Generator | BurFlow',
      description: 'Generate comprehensive, relevant question-and-answer sets from any topic or text to improve UX and boost SEO. Free, no sign-up required.',
    },
    faqs: [
      { q: 'What can the FAQ generator accept as input?', a: 'A topic phrase, pasted text, or a webpage URL. The generator extracts likely questions and drafts clear, concise answers.' },
      { q: 'Are generated FAQs SEO-ready?', a: 'Yes — the output follows the question-answer structure recommended by Google and can be wired to FAQPage structured data on your site.' },
      { q: 'Can I use the FAQs commercially?', a: 'Absolutely. The generated content is yours to publish anywhere.' },
      { q: 'Is this free?', a: 'The generator is completely free with no sign-up. For full AI-powered generation at scale, BurFlow plans start at $0.' },
    ],
  }),
  comingSoon({
    slug: 'conversation-analysis',
    name: 'AI Chatbot Conversation Analysis',
    shortDescription: 'Analyze chatbot conversations with AI to uncover knowledge gaps, intent patterns, and actionable improvements.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'messages-square',
  }),
  live({
    slug: 'ai-prompt-generator',
    name: 'Best AI Prompt Generator',
    shortDescription: 'Create high-quality AI prompts with proven frameworks like APE, RACE, CREATE, and SPARK for ChatGPT, Claude, and more.',
    category: 'ai-generators',
    badges: ['Free', 'Popular', 'Interactive'],
    icon: 'sparkles',
    route: '/tools/ai-prompt-generator',
    seo: {
      title: 'Best AI Prompt Generator | BurFlow',
      description: 'Create high-quality AI prompts with proven frameworks — APE, RACE, CREATE, and SPARK. Free, no sign-up required.',
    },
    faqs: [
      { q: 'What are prompt frameworks?', a: 'Prompt frameworks are structured templates — like APE, RACE, CREATE, and SPARK — that organize your instructions so AI models produce more consistent, higher-quality output.' },
      { q: 'Which framework should I choose?', a: 'Start with APE for simple tasks, RACE when you want a clear role and execution steps, CREATE for creative work with examples, and SPARK for scenarios where audience and tone matter most.' },
      { q: 'Can I use the generated prompts commercially?', a: 'Yes. Prompts you generate are yours to use anywhere — ChatGPT, Claude, or any other AI tool.' },
      { q: 'Is this free?', a: 'Yes — completely free with no sign-up. For AI that works on your own website 24/7, check out BurFlow.' },
    ],
  }),
  comingSoon({
    slug: 'prompt-optimizer',
    name: 'AI Prompt Optimizer',
    shortDescription: 'Transform existing prompts into powerful, framework-based instructions that produce clearer, more effective output.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'wand-2',
  }),
  comingSoon({
    slug: 'chat-text-data',
    name: 'AI Chat with Your Text Data',
    shortDescription: 'Paste any plain text and chat with AI to ask questions, get summaries, or extract insights instantly.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'type',
  }),
  live({
    slug: 'ai-chat-with-website',
    name: 'AI Chat with Your Website Data',
    shortDescription: 'Enter any webpage URL or paste text and chat with AI to ask questions, get executive summaries, extract FAQs, or list action items instantly.',
    category: 'ai-generators',
    badges: ['Free', 'Interactive'],
    icon: 'link',
    route: '/tools/ai-chat-with-website',
    seo: {
      title: 'AI Chat with Your Website Data | BurFlow',
      description: 'Enter any webpage URL or paste text and chat with AI — ask questions, generate executive summaries, extract FAQs, and list action items. Free, no sign-up.',
    },
    faqs: [
      { q: 'What can I chat with?', a: 'Any public webpage URL or a block of pasted text — reports, articles, transcripts, policy docs, and more.' },
      { q: 'What do the quick actions do?', a: '“Generate Executive Summary” distills the key points, “Extract Key FAQs” surfaces likely questions, and “List Action Items” pulls out actionable next steps from the text.' },
      { q: 'Is my data stored?', a: 'No. Text is analyzed locally in your browser and never leaves your machine.' },
      { q: 'What is the question limit?', a: 'Unlimited for this tool. For AI chat on your own website with your knowledge base, try BurFlow — free for 100 messages a month.' },
    ],
  }),
  comingSoon({
    slug: 'chat-document-data',
    name: 'AI Chat with Your Document & Data',
    shortDescription: 'Upload any document and chat with AI to ask questions, get summaries, or extract insights instantly.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'file-text',
  }),
  comingSoon({
    slug: 'chat-pdf-data',
    name: 'AI Chat with Your PDF Document & Data',
    shortDescription: 'Upload any PDF and chat with AI to ask questions, get short summaries, or extract insights instantly.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'file-text',
  }),
  comingSoon({
    slug: 'chat-word-data',
    name: 'AI Chat with Your Word Document & Data',
    shortDescription: 'Upload any Word document and chat with AI to ask questions, get short summaries, or extract insights instantly.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'file-text',
  }),
  comingSoon({
    slug: 'reply-generator',
    name: 'AI Reply Generator',
    shortDescription: 'Generate thoughtful, contextually appropriate replies for social media, emails, texts, and professional communication.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'mail',
  }),
  comingSoon({
    slug: 'answer-generator',
    name: 'AI Answer Generator',
    shortDescription: 'Get quick, accurate answers to any query — for research, problem-solving, or satisfying curiosity.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'text-quote',
  }),
  comingSoon({
    slug: 'email-response-generator',
    name: 'AI Email Response Generator',
    shortDescription: 'Craft personalized, professional email replies in seconds and save hours every week.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'copy',
  }),
  comingSoon({
    slug: 'letter-generator',
    name: 'AI Letter Generator',
    shortDescription: 'Effortlessly create polished, professional letters for any occasion in just a few clicks.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'pen-line',
  }),
  comingSoon({
    slug: 'blog-title-generator',
    name: 'AI Blog Title Generator',
    shortDescription: 'Craft compelling, SEO-friendly blog titles that boost click-through rates and engagement.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'sparkles',
  }),
  comingSoon({
    slug: 'chatbot-name-generator',
    name: 'AI Chatbot Name Generator',
    shortDescription: 'Create the perfect, brand-aligned name for your AI assistant with creative suggestions.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'bot',
  }),
  comingSoon({
    slug: 'saas-brand-name-generator',
    name: 'AI SaaS Brand Name Generator',
    shortDescription: 'Discover ideal, domain-friendly names for your SaaS business and launch with confidence.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'case-sensitive',
  }),
  comingSoon({
    slug: 'email-signature-generator',
    name: 'Email Signature Generator',
    shortDescription: 'Design professional email signatures with logos, social links, and contact info in minutes.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'mail',
  }),
  comingSoon({
    slug: 'website-faq-generator',
    name: 'Website FAQ Generator',
    shortDescription: 'Scrape up to 5 websites and generate relevant, SEO-boosting questions and answers.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'globe',
  }),
  comingSoon({
    slug: 'customer-service-script-generator',
    name: 'Customer Service Script Generator',
    shortDescription: 'Generate professional customer service scripts for training, common situations, and consistent quality.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'message-square-quote',
  }),
  comingSoon({
    slug: 'pdf-to-faq-generator',
    name: 'PDF to FAQ Generator',
    shortDescription: 'Upload any PDF and generate comprehensive FAQs for documentation and support materials.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'file-text',
  }),
  comingSoon({
    slug: 'webpage-to-faq-generator',
    name: 'Webpage to FAQ Generator',
    shortDescription: 'Extract content from any webpage URL and generate relevant questions and answers.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'globe',
  }),
  comingSoon({
    slug: 'docx-to-faq-generator',
    name: 'DOCX to FAQ Generator',
    shortDescription: 'Upload any Word document and generate relevant FAQs for documentation and support.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'file-text',
  }),
  comingSoon({
    slug: 'html-to-faq-generator',
    name: 'HTML to FAQ Generator',
    shortDescription: 'Upload HTML files and generate relevant FAQs for web content documentation.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'code',
  }),
  comingSoon({
    slug: 'google-docs-to-faq-generator',
    name: 'Google Docs to FAQ Generator',
    shortDescription: 'Enter any public Google Docs page and generate relevant FAQs for documentation and support.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'file-text',
  }),
  comingSoon({
    slug: 'notion-to-faq-generator',
    name: 'Notion to FAQ Generator',
    shortDescription: 'Enter any public Notion page and generate relevant FAQs for documentation and support.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'library',
  }),

  /* ── Markdown Converters ─────────────────────────────────── */
  live({
    slug: 'document-to-markdown',
    name: 'Document to Markdown Converter',
    shortDescription: 'Convert pasted HTML, plain text, or CSV — or an uploaded file — into clean, structured Markdown with a live preview.',
    category: 'markdown',
    badges: ['Free', 'Interactive'],
    icon: 'file-output',
    route: '/tools/document-to-markdown',
    seo: {
      title: 'Document to Markdown Converter | BurFlow',
      description: 'Convert HTML, text, or CSV — pasted or uploaded — into clean Markdown with a live preview and syntax highlighting. Free, no sign-up.',
    },
    faqs: [
      { q: 'What formats can I convert?', a: 'HTML, plain text, and CSV — paste them directly or upload a .html, .txt, .csv, or .md file. The converter detects the format automatically.' },
      { q: 'Is the conversion done locally?', a: 'Yes — everything happens in your browser. Your documents never leave your machine.' },
      { q: 'Does it preserve links and tables?', a: 'HTML links, lists, headings, and tables are converted to standard Markdown. CSV becomes a GitHub-style Markdown table.' },
      { q: 'Why convert documents to Markdown?', a: 'Markdown is ideal for documentation, LLM-ready knowledge bases, version-controlled content, and migrating between platforms.' },
    ],
  }),
  live({
    slug: 'webpage-to-markdown',
    name: 'Convert Webpage to Markdown',
    shortDescription: 'Enter any webpage URL and convert it to clean Markdown — perfect for documentation, migration, and archiving.',
    category: 'markdown',
    badges: ['Free', 'Interactive'],
    icon: 'globe',
    route: '/tools/webpage-to-markdown',
    seo: {
      title: 'Webpage to Markdown Converter | BurFlow',
      description: 'Convert any webpage URL to clean, structured Markdown instantly. Perfect for documentation, content migration, and archiving. Free, no sign-up.',
    },
    faqs: [
      { q: 'What can I convert to Markdown?', a: 'Any public webpage URL. The converter extracts the main content — headings, paragraphs, lists, links, and tables — and outputs clean Markdown.' },
      { q: 'Is the conversion free?', a: 'Yes. Conversion is free with no sign-up. Full site-wide migration and AI cleanup are available with BurFlow.' },
      { q: 'Will images and links be preserved?', a: 'Yes — images, links, and lists are kept in standard Markdown syntax so your content stays portable.' },
      { q: 'Why convert webpages to Markdown?', a: 'Markdown is ideal for documentation, LLM-ready knowledge bases, version-controlled content, and migrating to new site platforms.' },
    ],
  }),
  comingSoon({
    slug: 'pdf-to-markdown',
    name: 'Convert PDF to Markdown',
    shortDescription: 'Convert your PDF document to Markdown. Fast, free, no sign-up required.',
    category: 'markdown',
    badges: ['Free', 'Popular'],
    icon: 'file-text',
  }),
  comingSoon({
    slug: 'csv-to-markdown',
    name: 'Convert CSV to Markdown',
    shortDescription: 'Convert your CSV file to a clean, formatted Markdown table. Fast and free.',
    category: 'markdown',
    badges: ['Free'],
    icon: 'table',
  }),
  comingSoon({
    slug: 'json-to-markdown',
    name: 'Convert JSON to Markdown',
    shortDescription: 'Convert your JSON file to well-formatted, readable Markdown. Fast and free.',
    category: 'markdown',
    badges: ['Free'],
    icon: 'braces',
  }),
  comingSoon({
    slug: 'docx-to-markdown',
    name: 'Convert DOCX to Markdown',
    shortDescription: 'Convert your Word document to clean, structured Markdown. Fast and free.',
    category: 'markdown',
    badges: ['Free'],
    icon: 'file-code-2',
  }),
  comingSoon({
    slug: 'rtf-to-markdown',
    name: 'Convert RTF to Markdown',
    shortDescription: 'Convert your RTF document to clean, structured Markdown. Fast and free.',
    category: 'markdown',
    badges: ['Free'],
    icon: 'file-input',
  }),
  comingSoon({
    slug: 'html-to-markdown',
    name: 'Convert HTML to Markdown',
    shortDescription: 'Convert your HTML file to clean, structured Markdown. Fast and free.',
    category: 'markdown',
    badges: ['Free'],
    icon: 'code',
  }),
  comingSoon({
    slug: 'paste-to-markdown',
    name: 'Convert Paste to Markdown',
    shortDescription: 'Convert any pasted text to clean, structured Markdown. Fast and free.',
    category: 'markdown',
    badges: ['Free'],
    icon: 'clipboard-list',
  }),
  comingSoon({
    slug: 'notion-to-markdown',
    name: 'Convert Notion to Markdown',
    shortDescription: 'Enter any public Notion page URL and convert it to Markdown instantly.',
    category: 'markdown',
    badges: ['Free'],
    icon: 'library',
  }),
  comingSoon({
    slug: 'google-docs-to-markdown',
    name: 'Convert Google Docs to Markdown',
    shortDescription: 'Enter any public Google Docs URL and convert it to Markdown instantly. Free, no sign-up.',
    category: 'markdown',
    badges: ['Free'],
    icon: 'file-text',
  }),
  comingSoon({
    slug: 'xml-to-markdown',
    name: 'Convert XML to Markdown',
    shortDescription: 'Upload any XML document and convert it to Markdown instantly for data transformation and documentation.',
    category: 'markdown',
    badges: ['Free'],
    icon: 'file-json',
  }),

  /* ── SEO & Sitemaps ──────────────────────────────────────── */
  live({
    slug: 'sitemap-validator',
    name: 'Sitemap Validator',
    shortDescription: 'Validate your XML sitemap for errors, compliance, and SEO optimization — with a detailed report and performance score.',
    category: 'seo-sitemaps',
    badges: ['Free', 'Interactive', 'Popular'],
    icon: 'shield',
    route: '/tools/sitemap-validator',
    seo: {
      title: 'XML Sitemap Validator | BurFlow',
      description: 'Validate your XML sitemap for errors, compliance, and SEO optimization. Get detailed error reports, URL counts, and performance scoring. Free, no sign-up.',
    },
    faqs: [
      { q: 'What does the sitemap validator check?', a: 'Well-formed XML, the 50,000 URL limit, required <loc> tags, protocol consistency (http vs https), and best-practice fields like lastmod, changefreq, and priority.' },
      { q: 'What is a valid sitemap?', a: 'A valid sitemap is well-formed XML using the sitemap namespace with at most 50,000 URLs, each containing a resolvable <loc> entry.' },
      { q: 'Does the validator crawl my sitemap URLs?', a: 'The instant check validates structure and syntax locally in your browser. For full crawl validation of every URL, pair it with BurFlow’s site scanner.' },
      { q: 'Is my sitemap data stored?', a: 'No. Your XML is validated entirely in your browser and never leaves your machine.' },
    ],
  }),
  comingSoon({
    slug: 'sitemap-finder',
    name: 'Sitemap Finder & Checker',
    shortDescription: 'Find and validate all sitemaps on any website instantly. Perfect for SEO audits and website analysis.',
    category: 'seo-sitemaps',
    badges: ['Free', 'Popular'],
    icon: 'search',
  }),
  comingSoon({
    slug: 'xml-sitemap-generator',
    name: 'XML Sitemap Generator',
    shortDescription: 'Generate a comprehensive XML sitemap for your website instantly, with customizable priority and changefreq.',
    category: 'seo-sitemaps',
    badges: ['Free', 'Popular'],
    icon: 'file-output',
  }),
  comingSoon({
    slug: 'sitemap-url-extractor',
    name: 'Sitemap URL Extractor',
    shortDescription: 'Extract all URLs from any website’s sitemap.xml — perfect for SEO analysis and content auditing.',
    category: 'seo-sitemaps',
    badges: ['Free'],
    icon: 'link',
  }),
  comingSoon({
    slug: 'sitemap-url-comparison',
    name: 'Sitemap URLs Comparison Tool',
    shortDescription: 'Compare two XML sitemaps to find added, removed, or unchanged URLs between versions.',
    category: 'seo-sitemaps',
    badges: ['Free'],
    icon: 'git-compare',
  }),
  comingSoon({
    slug: 'sitemap-split-merger',
    name: 'Sitemap Split/Merger Tool',
    shortDescription: 'Split large sitemaps into chunks or merge multiple sitemaps — with automatic index files and 50,000 URL handling.',
    category: 'seo-sitemaps',
    badges: ['Free'],
    icon: 'merge',
  }),
  comingSoon({
    slug: 'sitemap-analytics',
    name: 'Sitemap Analytics & Insights Tool',
    shortDescription: 'Get comprehensive sitemap analytics — URL patterns, depth analysis, file types, and SEO recommendations with charts.',
    category: 'seo-sitemaps',
    badges: ['Free'],
    icon: 'pie-chart',
  }),
  comingSoon({
    slug: 'sitemap-index-generator',
    name: 'Sitemap Index Generator',
    shortDescription: 'Generate XML sitemap index files from multiple sitemap URLs with automatic validation and lastmod dates.',
    category: 'seo-sitemaps',
    badges: ['Free'],
    icon: 'folder-tree',
  }),
  comingSoon({
    slug: 'sitemap-robots-generator',
    name: 'Sitemap to Robots.txt Generator',
    shortDescription: 'Generate robots.txt files with sitemap references, user agents, allow/disallow paths, and crawl delays.',
    category: 'seo-sitemaps',
    badges: ['Free'],
    icon: 'cog',
  }),
  comingSoon({
    slug: 'sitemap-frequency-analyzer',
    name: 'Sitemap Frequency Analyzer',
    shortDescription: 'Analyze changefreq and priority values with distribution charts, recommendations, and SEO performance insights.',
    category: 'seo-sitemaps',
    badges: ['Free'],
    icon: 'scan-line',
  }),
  comingSoon({
    slug: 'website-url-extractor',
    name: 'Website URL Extractor',
    shortDescription: 'Crawl and extract all URLs from any website for site mapping, content auditing, and comprehensive SEO analysis.',
    category: 'seo-sitemaps',
    badges: ['Free'],
    icon: 'globe',
  }),
];

export const getToolBySlug = (slug: string): ToolDefinition | undefined => TOOLS.find((t) => t.slug === slug);

export const getActiveTools = (): ToolDefinition[] => TOOLS.filter((t) => t.status === 'active');

export const getRelatedTools = (tool: ToolDefinition, limit = 3): ToolDefinition[] =>
  TOOLS.filter((t) => t.slug !== tool.slug && t.category === tool.category).slice(0, limit);

export function buildBreadcrumbSchema(items: Array<{ name: string; path: string }>): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://burflow.vercel.app${item.path}`,
    })),
  });
}

export function buildWebApplicationSchema(tool: ToolDefinition): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.name,
    description: tool.shortDescription,
    url: `https://burflow.vercel.app${tool.route ?? `/tools/${tool.slug}`}`,
    applicationCategory: 'BusinessApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    provider: {
      '@type': 'Organization',
      name: 'BurFlow',
      url: 'https://burflow.vercel.app',
    },
  });
}

export function buildFaqSchema(faqs: ToolFaq[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  });
}