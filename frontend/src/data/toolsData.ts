import { SITE_URL } from '../lib/site';

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
  live({
    slug: 'conversation-analysis',
    name: 'AI Chatbot Conversation Analysis',
    shortDescription: 'Analyze chatbot conversations with AI to uncover knowledge gaps, intent patterns, and actionable improvements.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'messages-square',
    route: '/tools/conversation-analysis',
    seo: {
      title: 'AI Chatbot Conversation Analysis | BurFlow',
      description: 'Analyze chatbot conversations to uncover knowledge gaps, unanswered questions, and intent patterns. Free, no sign-up.',
    },
    faqs: [
      { q: 'What does conversation analysis find?', a: 'It detects unanswered visitor questions (knowledge gaps), repeated high-intent topics, greeting and closing handling, and average message lengths.' },
      { q: 'What format should the log be in?', a: 'One message per line, prefixed with "Visitor:" or "Agent:" — "User:", "Customer:", "Bot:", and "Support:" work too.' },
    ],
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
  live({
    slug: 'prompt-optimizer',
    name: 'AI Prompt Optimizer',
    shortDescription: 'Transform existing prompts into powerful, framework-based instructions that produce clearer, more effective output.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'wand-2',
    route: '/tools/prompt-optimizer',
    seo: {
      title: 'AI Prompt Optimizer | BurFlow',
      description: 'Rewrite any prompt with proven frameworks — APE, RACE, CREATE, SPARK — for clearer, more effective AI output. Free, no sign-up.',
    },
    faqs: [
      { q: 'What does the prompt optimizer do?', a: 'It rewrites your existing prompt into a chosen framework (APE, RACE, CREATE, or SPARK), adding role, context, expectations, and evaluation steps.' },
      { q: 'Will my prompt intent be preserved?', a: 'Yes — your original instruction becomes the core action, wrapped in structure that makes the AI follow it more reliably.' },
    ],
  }),
  live({
    slug: 'chat-text-data',
    name: 'AI Chat with Your Text Data',
    shortDescription: 'Paste any plain text and chat with AI to ask questions, get summaries, or extract insights instantly.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'type',
    route: '/tools/chat-text-data',
    seo: {
      title: 'AI Chat with Your Text Data | BurFlow',
      description: 'Paste any text and chat with it — ask questions, get summaries, FAQs, and action items instantly. Free, no sign-up.',
    },
    faqs: [
      { q: 'What can I chat with?', a: 'Any plain text — articles, notes, transcripts, meeting summaries, or reports. Analysis runs locally in your browser.' },
      { q: 'Is there a question limit?', a: 'No — unlimited questions, no sign-up. The text never leaves your machine.' },
      { q: 'What can I ask about the text?', a: 'Anything — or tap a quick action to generate an executive summary, extract key FAQs, or list action items.' },
      { q: 'Is my data stored anywhere?', a: 'No. Everything is processed locally in your browser and nothing is sent to a server.' },
    ],
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
  live({
    slug: 'chat-document-data',
    name: 'AI Chat with Your Document & Data',
    shortDescription: 'Upload any document and chat with AI to ask questions, get summaries, or extract insights instantly.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'file-text',
    route: '/tools/chat-document-data',
    seo: {
      title: 'AI Chat with Your Document & Data | BurFlow',
      description: 'Upload any document — TXT, MD, HTML, DOCX, RTF, CSV — and chat with it. Instant summaries and answers, all in your browser.',
    },
    faqs: [
      { q: 'Which document formats are supported?', a: 'TXT, Markdown, HTML, CSV, JSON, XML, RTF, and DOCX. The file is read locally and never uploaded.' },
      { q: 'What can I ask about the document?', a: 'Anything — a quick action button also generates an executive summary, key FAQs, and action items.' },
      { q: 'How does the chat work?', a: 'The document text is indexed in your browser and every answer is generated locally against that content — unlimited questions.' },
      { q: 'Is the analysis really local?', a: 'Yes — your document never leaves your machine.' },
    ],
  }),
  live({
    slug: 'chat-pdf-data',
    name: 'AI Chat with Your PDF Document & Data',
    shortDescription: 'Upload any PDF and chat with AI to ask questions, get short summaries, or extract insights instantly.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'file-text',
    route: '/tools/chat-pdf-data',
    seo: {
      title: 'AI Chat with Your PDF Document & Data | BurFlow',
      description: 'Upload a PDF and chat with it — summaries, answers, FAQs, and action items instantly. Private, local, free.',
    },
    faqs: [
      { q: 'Are scanned PDFs supported?', a: 'Text-based PDFs are extracted locally. Image-only (scanned) PDFs need OCR, which this browser tool does not perform.' },
      { q: 'Does the PDF leave my machine?', a: 'No — the file is read and analyzed entirely in your browser.' },
      { q: 'How is the AI answer generated?', a: 'The PDF text is analyzed locally with rule-based AI — summaries, FAQs, and action items are extracted from the actual content of your document.' },
      { q: 'Can I ask unlimited questions?', a: 'Yes — unlimited questions with no sign-up.' },
    ],
  }),
  live({
    slug: 'chat-word-data',
    name: 'AI Chat with Your Word Document & Data',
    shortDescription: 'Upload any Word document and chat with AI to ask questions, get short summaries, or extract insights instantly.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'file-text',
    route: '/tools/chat-word-data',
    seo: {
      title: 'AI Chat with Your Word Document & Data | BurFlow',
      description: 'Upload a Word document and chat with it — summaries, answers, and insights instantly. Private, local, free.',
    },
    faqs: [
      { q: 'Which Word formats are supported?', a: '.docx files are unpacked and read locally; legacy .doc binary files are not supported.' },
      { q: 'How accurate are the answers?', a: 'Answers are generated from your document text locally — accurate for questions answered directly by the content.' },
      { q: 'Does the document leave my machine?', a: 'No — the .docx file is read and analyzed entirely in your browser.' },
      { q: 'What can I ask?', a: 'Anything about the document — plus one-click quick actions for summaries, key FAQs, and action items.' },
    ],
  }),
  live({
    slug: 'reply-generator',
    name: 'AI Reply Generator',
    shortDescription: 'Generate thoughtful, contextually appropriate replies for social media, emails, texts, and professional communication.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'mail',
    route: '/tools/reply-generator',
    seo: {
      title: 'AI Reply Generator | BurFlow',
      description: 'Generate polished replies for emails, LinkedIn, Twitter, texts, and reviews in seconds. Free, no sign-up.',
    },
    faqs: [
      { q: 'What channels are supported?', a: 'Email, LinkedIn, Twitter/X, text messages, Slack, and review responses — pick a channel and tone for tailored drafts.' },
      { q: 'Can I use the drafts commercially?', a: 'Yes — generated replies are yours to edit and send anywhere.' },
    ],
  }),
  live({
    slug: 'answer-generator',
    name: 'AI Answer Generator',
    shortDescription: 'Get quick, accurate answers to any query — for research, problem-solving, or satisfying curiosity.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'text-quote',
    route: '/tools/answer-generator',
    seo: {
      title: 'AI Answer Generator | BurFlow',
      description: 'Get clear, structured answers to any question — quick, balanced, or detailed. Free, no sign-up.',
    },
    faqs: [
      { q: 'What depth options are available?', a: 'Quick (2–3 sentences), Balanced (one paragraph), or Detailed with a practical example.' },
      { q: 'Is the answer generator free?', a: 'Yes — free with no sign-up and no usage limits.' },
    ],
  }),
  live({
    slug: 'email-response-generator',
    name: 'AI Email Response Generator',
    shortDescription: 'Craft personalized, professional email replies in seconds and save hours every week.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'copy',
    route: '/tools/email-response-generator',
    seo: {
      title: 'AI Email Response Generator | BurFlow',
      description: 'Craft professional email replies in seconds — warm, direct, or apologetic, ready to send. Free, no sign-up.',
    },
    faqs: [
      { q: 'Who is this for?', a: 'Anyone who writes email replies regularly — customer support, sales, recruiting, and general business correspondence.' },
      { q: 'Can I edit the drafts?', a: 'Yes — treat them as a starting point and tailor them to your voice before sending.' },
    ],
  }),
  live({
    slug: 'letter-generator',
    name: 'AI Letter Generator',
    shortDescription: 'Effortlessly create polished, professional letters for any occasion in just a few clicks.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'pen-line',
    route: '/tools/letter-generator',
    seo: {
      title: 'AI Letter Generator | BurFlow',
      description: 'Write professional letters — cover letters, business letters, and more — in minutes. Free, no sign-up.',
    },
    faqs: [
      { q: 'What kinds of letters can I generate?', a: 'Cover letters, business letters, formal correspondence, and personal letters — describe the purpose and add key details.' },
      { q: 'Is there a charge?', a: 'No — completely free with no sign-up.' },
    ],
  }),
  live({
    slug: 'blog-title-generator',
    name: 'AI Blog Title Generator',
    shortDescription: 'Craft compelling, SEO-friendly blog titles that boost click-through rates and engagement.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'sparkles',
    route: '/tools/blog-title-generator',
    seo: {
      title: 'AI Blog Title Generator | BurFlow',
      description: 'Generate click-worthy, SEO-friendly blog titles — how-to, listicle, comparison, and more. Free, no sign-up.',
    },
    faqs: [
      { q: 'What angles are available?', a: 'How-to, Listicle, Problem/Solution, Data-driven, and Comparison — each produces 3 titles per run.' },
      { q: 'Are the titles SEO-ready?', a: 'They follow proven headline formulas. Add your primary keyword to the topic line for maximum SEO impact.' },
    ],
  }),
  live({
    slug: 'chatbot-name-generator',
    name: 'AI Chatbot Name Generator',
    shortDescription: 'Create the perfect, brand-aligned name for your AI assistant with creative suggestions.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'bot',
    route: '/tools/chatbot-name-generator',
    seo: {
      title: 'AI Chatbot Name Generator | BurFlow',
      description: 'Generate catchy, brandable chatbot names in seconds — powered by curated word banks. Free, no sign-up.',
    },
    faqs: [
      { q: 'How does the generator work?', a: 'It combines curated prefixes, cores, and suffixes with your optional seed word to produce short, brandable names.' },
      { q: 'Can I use the names commercially?', a: 'Yes — generated names are yours to use, though you should check domain and trademark availability.' },
    ],
  }),
  live({
    slug: 'saas-brand-name-generator',
    name: 'AI SaaS Brand Name Generator',
    shortDescription: 'Discover ideal, domain-friendly names for your SaaS business and launch with confidence.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'case-sensitive',
    route: '/tools/saas-brand-name-generator',
    seo: {
      title: 'AI SaaS Brand Name Generator | BurFlow',
      description: 'Generate modern, brandable SaaS company names in seconds — short, memorable, and ready for the .com.',
    },
    faqs: [
      { q: 'What makes a good SaaS name?', a: 'Short (under 12 characters when possible), easy to spell, and available as a .com. The generator favors these patterns.' },
      { q: 'Do you check domain availability?', a: 'No — the generator produces candidates. Check availability at your registrar of choice.' },
    ],
  }),
  live({
    slug: 'email-signature-generator',
    name: 'Email Signature Generator',
    shortDescription: 'Design professional email signatures with logos, social links, and contact info in minutes.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'mail',
    route: '/tools/email-signature-generator',
    seo: {
      title: 'Email Signature Generator | BurFlow',
      description: 'Create a professional HTML email signature in seconds — pick colors, preview live, copy. Free, no sign-up.',
    },
    faqs: [
      { q: 'How do I install the signature?', a: 'Gmail: Settings → Signature. Outlook: Settings → Mail → Signature. Copy the HTML version with formatting for best results.' },
      { q: 'Which email clients support HTML signatures?', a: 'Gmail, Outlook, Apple Mail, and most desktop clients. Some mobile clients only show plain text.' },
    ],
  }),
  live({
    slug: 'website-faq-generator',
    name: 'Website FAQ Generator',
    shortDescription: 'Scrape up to 5 websites and generate relevant, SEO-boosting questions and answers.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'globe',
    route: '/tools/website-faq-generator',
    seo: {
      title: 'Website FAQ Generator | BurFlow',
      description: 'Generate a complete FAQ for your website from up to 3 page URLs — questions your visitors are actually asking.',
    },
    faqs: [
      { q: 'How many pages can I use as sources?', a: 'Up to 3 URLs. The generator combines them into one question set covering what, how, pricing, setup, and support.' },
      { q: 'What if a URL is blocked?', a: 'The generator falls back to a topic-based question set derived from your domain name.' },
    ],
  }),
  live({
    slug: 'customer-service-script-generator',
    name: 'Customer Service Script Generator',
    shortDescription: 'Generate professional customer service scripts for training, common situations, and consistent quality.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'message-square-quote',
    route: '/tools/customer-service-script-generator',
    seo: {
      title: 'Customer Service Script Generator | BurFlow',
      description: 'Turn any support situation into a structured customer service script — de-escalate, resolve, close. Free.',
    },
    faqs: [
      { q: 'What does a script include?', a: 'An opening, information-gathering, resolution framing, prevention note, and closing — adapted to live chat, phone, email, or social.' },
      { q: 'Are the scripts ready to use?', a: 'Yes — they follow proven de-escalation and resolution patterns, ready to adapt to your brand voice.' },
    ],
  }),
  live({
    slug: 'pdf-to-faq-generator',
    name: 'PDF to FAQ Generator',
    shortDescription: 'Upload any PDF and generate comprehensive FAQs for documentation and support materials.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'file-text',
    route: '/tools/pdf-to-faq-generator',
    seo: {
      title: 'PDF to FAQ Generator | BurFlow',
      description: 'Upload a PDF and instantly generate a clean FAQ from its content — local, fast, free.',
    },
    faqs: [
      { q: 'Which PDFs work best?', a: 'Text-based PDFs — manuals, reports, and whitepapers. Scanned (image-only) PDFs cannot be read in the browser.' },
      { q: 'Does the PDF leave my machine?', a: 'No — everything is extracted and analyzed locally.' },
    ],
  }),
  live({
    slug: 'webpage-to-faq-generator',
    name: 'Webpage to FAQ Generator',
    shortDescription: 'Extract content from any webpage URL and generate relevant questions and answers.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'globe',
    route: '/tools/webpage-to-faq-generator',
    seo: {
      title: 'Webpage to FAQ Generator | BurFlow',
      description: 'Turn any webpage into a ready-to-publish FAQ — paste a URL or the page text and get questions in seconds.',
    },
    faqs: [
      { q: 'How does it extract the page content?', a: 'The URL is fetched in your browser; if the site blocks cross-origin access, pasting the page text always works instead.' },
      { q: 'Can I publish the FAQs?', a: 'Yes — the output is ready to publish, and pairs well with FAQPage structured data for SEO.' },
    ],
  }),
  live({
    slug: 'docx-to-faq-generator',
    name: 'DOCX to FAQ Generator',
    shortDescription: 'Upload any Word document and generate relevant FAQs for documentation and support.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'file-text',
    route: '/tools/docx-to-faq-generator',
    seo: {
      title: 'DOCX to FAQ Generator | BurFlow',
      description: 'Upload a Word document and instantly generate a clean FAQ from its content — local, fast, free.',
    },
    faqs: [
      { q: 'Which files are supported?', a: '.docx files are read locally in the browser; legacy .doc binary files are not supported.' },
      { q: 'Is the document uploaded?', a: 'No — it is unpacked and analyzed entirely in your browser.' },
    ],
  }),
  live({
    slug: 'html-to-faq-generator',
    name: 'HTML to FAQ Generator',
    shortDescription: 'Upload HTML files and generate relevant FAQs for web content documentation.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'code',
    route: '/tools/html-to-faq-generator',
    seo: {
      title: 'HTML to FAQ Generator | BurFlow',
      description: 'Paste an HTML page or upload an .html file and instantly generate a clean FAQ from its content.',
    },
    faqs: [
      { q: 'How do I use it?', a: 'Paste page source HTML or upload an .html file — headings, paragraphs, and lists are converted into question sets.' },
      { q: 'Is it free?', a: 'Yes — free with no sign-up and no usage limits.' },
    ],
  }),
  live({
    slug: 'google-docs-to-faq-generator',
    name: 'Google Docs to FAQ Generator',
    shortDescription: 'Enter any public Google Docs page and generate relevant FAQs for documentation and support.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'file-text',
    route: '/tools/google-docs-to-faq-generator',
    seo: {
      title: 'Google Docs to FAQ Generator | BurFlow',
      description: 'Generate an instant FAQ from any public Google Doc — paste the link and get questions in seconds.',
    },
    faqs: [
      { q: 'Does the document need to be public?', a: 'Yes — set sharing to "Anyone with the link can view". If Google blocks browser fetching, paste the text instead.' },
      { q: 'Is my document stored?', a: 'No — processing happens in your browser.' },
    ],
  }),
  live({
    slug: 'notion-to-faq-generator',
    name: 'Notion to FAQ Generator',
    shortDescription: 'Enter any public Notion page and generate relevant FAQs for documentation and support.',
    category: 'ai-generators',
    badges: ['Free'],
    icon: 'library',
    route: '/tools/notion-to-faq-generator',
    seo: {
      title: 'Notion to FAQ Generator | BurFlow',
      description: 'Generate an instant FAQ from any public Notion page — paste the link and get questions in seconds.',
    },
    faqs: [
      { q: 'Does the Notion page need to be public?', a: 'Yes — share with "Anyone with the link". If Notion blocks browser fetching, paste the page text instead.' },
      { q: 'Is this free?', a: 'Yes — free with no sign-up and no usage limits.' },
    ],
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
  live({
    slug: 'pdf-to-markdown',
    name: 'Convert PDF to Markdown',
    shortDescription: 'Convert your PDF document to Markdown. Fast, free, no sign-up required.',
    category: 'markdown',
    badges: ['Free', 'Popular'],
    icon: 'file-text',
    route: '/tools/pdf-to-markdown',
    seo: {
      title: 'PDF to Markdown Converter | BurFlow',
      description: 'Convert PDF documents to clean, structured Markdown — fast, free, and entirely in your browser. No sign-up.',
    },
    faqs: [
      { q: 'How is the PDF converted?', a: 'Text is extracted locally from the PDF\'s embedded text streams and converted to Markdown. Nothing is uploaded.' },
      { q: 'Can scanned PDFs be converted?', a: 'No — image-based (scanned) PDFs need OCR, which this browser tool does not perform. Paste the text instead.' },
      { q: 'Is PDF to Markdown conversion free?', a: 'Yes — completely free with unlimited conversions and no sign-up. All processing happens in your browser.' },
      { q: 'What can I do with the converted Markdown?', a: 'Use it for documentation, content migration, AI training data, or publishing to Markdown-based platforms like GitHub, Notion, or Obsidian.' },
    ],
  }),
  live({
    slug: 'csv-to-markdown',
    name: 'Convert CSV to Markdown',
    shortDescription: 'Convert your CSV file to a clean, formatted Markdown table. Fast and free.',
    category: 'markdown',
    badges: ['Free'],
    icon: 'table',
    route: '/tools/csv-to-markdown',
    seo: {
      title: 'CSV to Markdown Converter | BurFlow',
      description: 'Convert CSV files to clean, GitHub-style Markdown tables — instantly and free. No sign-up.',
    },
    faqs: [
      { q: 'What happens to my CSV data?', a: 'It is converted locally in your browser and never uploaded.' },
      { q: 'Are quoted fields and commas handled?', a: 'Yes — the parser respects double-quoted fields, embedded commas, and newlines.' },
      { q: 'Can I convert CSV to a Markdown table for GitHub?', a: 'Yes — the output uses GitHub-flavored Markdown table syntax with a header row and aligned columns, ready to paste into README files.' },
      { q: 'Does it handle large CSV files?', a: 'Yes — files are processed locally in your browser, so even files with hundreds of thousands of rows work, though very large files may take a moment.' },
    ],
  }),
  live({
    slug: 'json-to-markdown',
    name: 'Convert JSON to Markdown',
    shortDescription: 'Convert your JSON file to well-formatted, readable Markdown. Fast and free.',
    category: 'markdown',
    badges: ['Free'],
    icon: 'braces',
    route: '/tools/json-to-markdown',
    seo: {
      title: 'JSON to Markdown Converter | BurFlow',
      description: 'Convert JSON data to well-formatted, readable Markdown — arrays of objects become tables. Free, no sign-up.',
    },
    faqs: [
      { q: 'How does the conversion work?', a: 'Arrays of objects become Markdown tables; other structures become nested headings and lists, with indentation preserved.' },
      { q: 'Is my JSON uploaded?', a: 'No — conversion happens locally in your browser.' },
      { q: 'Why would I convert JSON to Markdown?', a: 'For readable API documentation, changelogs, or turning JSON datasets into shareable tables inside docs and wikis.' },
      { q: 'Does it handle nested JSON?', a: 'Yes — nested objects and arrays become headings and indented lists, while flat arrays of objects become tables.' },
    ],
  }),
  live({
    slug: 'docx-to-markdown',
    name: 'Convert DOCX to Markdown',
    shortDescription: 'Convert your Word document to clean, structured Markdown. Fast and free.',
    category: 'markdown',
    badges: ['Free'],
    icon: 'file-code-2',
    route: '/tools/docx-to-markdown',
    seo: {
      title: 'DOCX to Markdown Converter | BurFlow',
      description: 'Convert Word documents to clean, structured Markdown — headings, lists, and paragraphs preserved. Free, no sign-up.',
    },
    faqs: [
      { q: 'How does DOCX conversion work?', a: 'The .docx file is unpacked in your browser (it is a ZIP of XML) and the document text is converted to Markdown.' },
      { q: 'Does the file leave my machine?', a: 'No — it never leaves your browser.' },
      { q: 'Which Word versions are supported?', a: 'Any modern .docx file (Word 2007 and later). The tool reads the document XML directly — no Office installation is needed.' },
      { q: 'What happens to images and tables?', a: 'Tables convert to Markdown tables; embedded images are not extracted, only the text content.' },
    ],
  }),
  live({
    slug: 'rtf-to-markdown',
    name: 'Convert RTF to Markdown',
    shortDescription: 'Convert your RTF document to clean, structured Markdown. Fast and free.',
    category: 'markdown',
    badges: ['Free'],
    icon: 'file-input',
    route: '/tools/rtf-to-markdown',
    seo: {
      title: 'RTF to Markdown Converter | BurFlow',
      description: 'Convert RTF documents to clean, structured Markdown — fast, free, and private. No sign-up.',
    },
    faqs: [
      { q: 'What is RTF?', a: 'Rich Text Format — a legacy word-processing format still used by many desktop editors and email clients.' },
      { q: 'How accurate is the conversion?', a: 'Bold, italics, headings, and paragraph structure are preserved; advanced formatting like embedded images is dropped.' },
      { q: 'Why convert RTF to Markdown?', a: 'To modernize legacy documents — Markdown works natively with GitHub, Notion, Obsidian, and most developer documentation tools.' },
      { q: 'Is the RTF converter free?', a: 'Yes — free with no sign-up, and nothing leaves your browser.' },
    ],
  }),
  live({
    slug: 'html-to-markdown',
    name: 'Convert HTML to Markdown',
    shortDescription: 'Convert your HTML file to clean, structured Markdown. Fast and free.',
    category: 'markdown',
    badges: ['Free'],
    icon: 'code',
    route: '/tools/html-to-markdown',
    seo: {
      title: 'HTML to Markdown Converter | BurFlow',
      description: 'Convert HTML files to clean, structured Markdown — links, lists, headings, and tables preserved. Free.',
    },
    faqs: [
      { q: 'What HTML elements are supported?', a: 'Headings, paragraphs, links, lists, tables, blockquotes, code blocks, and inline formatting.' },
      { q: 'Is the conversion local?', a: 'Yes — everything happens in your browser. Nothing is uploaded.' },
      { q: 'Can I convert an entire webpage to Markdown?', a: 'Paste the page\'s HTML source here, or use the URL-based converters for public Notion pages and Google Docs.' },
      { q: 'How are images in the HTML handled?', a: 'They become standard Markdown image references (![alt text](src)) when a source URL is present.' },
    ],
  }),
  live({
    slug: 'paste-to-markdown',
    name: 'Convert Paste to Markdown',
    shortDescription: 'Convert any pasted text to clean, structured Markdown. Fast and free.',
    category: 'markdown',
    badges: ['Free'],
    icon: 'clipboard-list',
    route: '/tools/paste-to-markdown',
    seo: {
      title: 'Paste to Markdown Converter | BurFlow',
      description: 'Convert any pasted text to clean, structured Markdown — auto-detects HTML, CSV, JSON, and XML. Free.',
    },
    faqs: [
      { q: 'What can I paste?', a: 'Anything — plain text, HTML, CSV, JSON, or XML. The format is detected automatically.' },
      { q: 'Is there a size limit?', a: 'No hard limit — very large documents may slow the browser slightly.' },
      { q: 'Does it preserve code?', a: 'Yes — fenced code blocks and inline code are kept intact when detected.' },
      { q: 'Is the paste converter really free?', a: 'Yes — free forever with no sign-up. All processing happens locally in your browser.' },
    ],
  }),
  live({
    slug: 'notion-to-markdown',
    name: 'Convert Notion to Markdown',
    shortDescription: 'Enter any public Notion page URL and convert it to Markdown instantly.',
    category: 'markdown',
    badges: ['Free'],
    icon: 'library',
    route: '/tools/notion-to-markdown',
    seo: {
      title: 'Notion to Markdown Converter | BurFlow',
      description: 'Convert any public Notion page to clean, structured Markdown — headings, lists, callouts, code blocks. Free.',
    },
    faqs: [
      { q: 'Does the page need to be public?', a: 'Yes — share it with "Anyone with the link" first. If Notion blocks browser fetching, a demo conversion is shown.' },
      { q: 'Is the conversion free?', a: 'Yes — free with no sign-up.' },
      { q: 'What Notion content converts?', a: 'Headings, paragraphs, bullet and numbered lists, to-dos, quotes, callouts, and code blocks.' },
      { q: 'Why does a demo conversion sometimes appear?', a: 'Some pages block browser-side fetching. When that happens, a representative demo conversion is shown so you can preview the output format.' },
    ],
  }),
  live({
    slug: 'google-docs-to-markdown',
    name: 'Convert Google Docs to Markdown',
    shortDescription: 'Enter any public Google Docs URL and convert it to Markdown instantly. Free, no sign-up.',
    category: 'markdown',
    badges: ['Free'],
    icon: 'file-text',
    route: '/tools/google-docs-to-markdown',
    seo: {
      title: 'Google Docs to Markdown Converter | BurFlow',
      description: 'Convert any public Google Doc to clean, structured Markdown — headings, tables, and lists preserved. Free.',
    },
    faqs: [
      { q: 'Does the document need to be public?', a: 'Yes — set sharing to "Anyone with the link can view". If Google blocks browser fetching, a demo conversion is shown.' },
      { q: 'Are tables and lists preserved?', a: 'Yes — headings, lists, and tables convert to standard Markdown.' },
      { q: 'Can I convert a shared Google Doc without downloading?', a: 'Yes — paste the share link and the converter reads the published content directly, no download or export needed.' },
      { q: 'Is there a sign-up?', a: 'No sign-up, no uploads — the conversion happens in your browser.' },
    ],
  }),
  live({
    slug: 'xml-to-markdown',
    name: 'Convert XML to Markdown',
    shortDescription: 'Upload any XML document and convert it to Markdown instantly for data transformation and documentation.',
    category: 'markdown',
    badges: ['Free'],
    icon: 'file-json',
    route: '/tools/xml-to-markdown',
    seo: {
      title: 'XML to Markdown Converter | BurFlow',
      description: 'Convert XML documents to readable Markdown instantly — data transformation and documentation. Free, no sign-up.',
    },
    faqs: [
      { q: 'How does XML convert to Markdown?', a: 'Nested elements become headings and lists, attributes become metadata lines, and repeated elements become tables.' },
      { q: 'Is my XML uploaded?', a: 'No — conversion happens locally in your browser.' },
      { q: 'Does it handle XML attributes?', a: 'Yes — attributes are preserved as metadata lines under each element.' },
      { q: 'Why convert XML to Markdown?', a: 'For readable data documentation, API payload examples, or turning XML exports into shareable docs.' },
    ],
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
  live({
    slug: 'sitemap-finder',
    name: 'Sitemap Finder & Checker',
    shortDescription: 'Find and validate all sitemaps on any website instantly. Perfect for SEO audits and website analysis.',
    category: 'seo-sitemaps',
    badges: ['Free', 'Popular'],
    icon: 'search',
    route: '/tools/sitemap-finder',
    seo: {
      title: 'Sitemap Finder & Checker | BurFlow',
      description: 'Find the sitemap of any website — checks the 7 most common sitemap locations automatically. Free, no sign-up.',
    },
    faqs: [
      { q: 'Which locations are checked?', a: '/sitemap.xml, /sitemap_index.xml, /sitemap-index.xml, /sitemap1.xml, /sitemap/, /sitemaps/sitemap.xml, and /wp-sitemap.xml.' },
      { q: 'Why might a sitemap not be found?', a: 'The site may use a custom location, or it may block cross-origin browser requests — the checker reports "blocked" in that case.' },
    ],
  }),
  live({
    slug: 'xml-sitemap-generator',
    name: 'XML Sitemap Generator',
    shortDescription: 'Generate a comprehensive XML sitemap for your website instantly, with customizable priority and changefreq.',
    category: 'seo-sitemaps',
    badges: ['Free', 'Popular'],
    icon: 'file-output',
    route: '/tools/xml-sitemap-generator',
    seo: {
      title: 'XML Sitemap Generator | BurFlow',
      description: 'Generate a valid XML sitemap from your URLs in seconds — ready to submit to Google Search Console. Free.',
    },
    faqs: [
      { q: 'How do I use the generated sitemap?', a: 'Save the output as sitemap.xml, upload it to your site root, and submit it in Google Search Console.' },
      { q: 'What options can I set?', a: 'Change frequency (always to never), priority (0.1–1.0), and last-modified date — applied to all URLs.' },
    ],
  }),
  live({
    slug: 'sitemap-url-extractor',
    name: 'Sitemap URL Extractor',
    shortDescription: 'Extract all URLs from any website’s sitemap.xml — perfect for SEO analysis and content auditing.',
    category: 'seo-sitemaps',
    badges: ['Free'],
    icon: 'link',
    route: '/tools/sitemap-url-extractor',
    seo: {
      title: 'Sitemap URL Extractor | BurFlow',
      description: 'Extract every URL from any sitemap.xml — paste the file content and get a clean list in seconds. Free.',
    },
    faqs: [
      { q: 'Does it work with sitemap indexes?', a: 'Yes — for index files, the child sitemap locations are extracted and listed.' },
      { q: 'Is my sitemap uploaded?', a: 'No — extraction happens locally in your browser.' },
    ],
  }),
  live({
    slug: 'sitemap-url-comparison',
    name: 'Sitemap URLs Comparison Tool',
    shortDescription: 'Compare two XML sitemaps to find added, removed, or unchanged URLs between versions.',
    category: 'seo-sitemaps',
    badges: ['Free'],
    icon: 'git-compare',
    route: '/tools/sitemap-url-comparison',
    seo: {
      title: 'Sitemap URLs Comparison Tool | BurFlow',
      description: 'Compare two sitemaps and see exactly which URLs were added, removed, or unchanged. Free, no sign-up.',
    },
    faqs: [
      { q: 'What does the comparison show?', a: 'A diff of URLs: added in the new sitemap, removed, and unchanged — perfect for tracking site migrations.' },
      { q: 'Does it compare metadata too?', a: 'No — it compares URL sets only, which is what matters for content tracking.' },
    ],
  }),
  live({
    slug: 'sitemap-split-merger',
    name: 'Sitemap Split/Merger Tool',
    shortDescription: 'Split large sitemaps into chunks or merge multiple sitemaps — with automatic index files and 50,000 URL handling.',
    category: 'seo-sitemaps',
    badges: ['Free'],
    icon: 'merge',
    route: '/tools/sitemap-split-merger',
    seo: {
      title: 'Sitemap Split/Merger Tool | BurFlow',
      description: 'Split large sitemaps into chunks or merge sitemaps into one — with the 50,000 URL limit handled. Free.',
    },
    faqs: [
      { q: 'Why split a sitemap?', a: 'Google caps sitemaps at 50,000 URLs and 50MB — larger sites must split into multiple files.' },
      { q: 'Are lastmod and priority preserved when splitting?', a: 'Yes — each chunk keeps the original lastmod and priority values from the source file.' },
    ],
  }),
  live({
    slug: 'sitemap-analytics',
    name: 'Sitemap Analytics & Insights Tool',
    shortDescription: 'Get comprehensive sitemap analytics — URL patterns, depth analysis, file types, and SEO recommendations with charts.',
    category: 'seo-sitemaps',
    badges: ['Free'],
    icon: 'pie-chart',
    route: '/tools/sitemap-analytics',
    seo: {
      title: 'Sitemap Analytics & Insights Tool | BurFlow',
      description: 'Get deep analytics on any sitemap — URL depth, file types, changefreq, priorities, and SEO recommendations. Free.',
    },
    faqs: [
      { q: 'What metrics are reported?', a: 'Total URLs, distribution by extension and URL depth, changefreq and priority distributions, plus actionable recommendations.' },
      { q: 'Is this free?', a: 'Yes — all analytics run locally in your browser with no sign-up.' },
    ],
  }),
  live({
    slug: 'sitemap-index-generator',
    name: 'Sitemap Index Generator',
    shortDescription: 'Generate XML sitemap index files from multiple sitemap URLs with automatic validation and lastmod dates.',
    category: 'seo-sitemaps',
    badges: ['Free'],
    icon: 'folder-tree',
    route: '/tools/sitemap-index-generator',
    seo: {
      title: 'Sitemap Index Generator | BurFlow',
      description: 'Generate a sitemap index file referencing all your individual sitemaps — the standard for large sites. Free.',
    },
    faqs: [
      { q: 'What is a sitemap index?', a: 'A sitemapindex XML file that lists your individual sitemaps — required when you have more than one sitemap file.' },
      { q: 'How is lastmod set?', a: 'Each entry gets today\'s date automatically, so you can submit the index right away.' },
    ],
  }),
  live({
    slug: 'sitemap-robots-generator',
    name: 'Sitemap to Robots.txt Generator',
    shortDescription: 'Generate robots.txt files with sitemap references, user agents, allow/disallow paths, and crawl delays.',
    category: 'seo-sitemaps',
    badges: ['Free'],
    icon: 'cog',
    route: '/tools/sitemap-robots-generator',
    seo: {
      title: 'Sitemap to Robots.txt Generator | BurFlow',
      description: 'Generate a correct robots.txt in seconds — user agents, allow/disallow rules, crawl delay, sitemap refs. Free.',
    },
    faqs: [
      { q: 'What does robots.txt do?', a: 'It tells search engine crawlers which parts of your site they may and may not crawl, and points them to your sitemap.' },
      { q: 'Where do I put the file?', a: 'In your site root — https://example.com/robots.txt. Most crawlers pick up changes within 24 hours.' },
    ],
  }),
  live({
    slug: 'sitemap-frequency-analyzer',
    name: 'Sitemap Frequency Analyzer',
    shortDescription: 'Analyze changefreq and priority values with distribution charts, recommendations, and SEO performance insights.',
    category: 'seo-sitemaps',
    badges: ['Free'],
    icon: 'scan-line',
    route: '/tools/sitemap-frequency-analyzer',
    seo: {
      title: 'Sitemap Frequency Analyzer | BurFlow',
      description: 'Analyze how often your site pages change — changefreq and priority distribution across all URLs. Free.',
    },
    faqs: [
      { q: 'Why does changefreq matter?', a: 'Accurate changefreq helps Google schedule crawls — pages that change daily should say "daily", not "yearly".' },
      { q: 'What does the report include?', a: 'The distribution of changefreq and priority values across your URLs, with percentage shares and recommendations.' },
    ],
  }),
  live({
    slug: 'website-url-extractor',
    name: 'Website URL Extractor',
    shortDescription: 'Crawl and extract all URLs from any website for site mapping, content auditing, and comprehensive SEO analysis.',
    category: 'seo-sitemaps',
    badges: ['Free'],
    icon: 'globe',
    route: '/tools/website-url-extractor',
    seo: {
      title: 'Website URL Extractor | BurFlow',
      description: 'Extract all internal URLs from a website\'s homepage — great for building a sitemap or auditing a site. Free.',
    },
    faqs: [
      { q: 'How are URLs extracted?', a: 'The homepage is fetched in your browser and internal links are collected. Blocked sites fall back to a demo crawl of typical URLs.' },
      { q: 'Does it crawl the whole site?', a: 'The free tool reads the homepage. For full site-wide crawling with AI cleanup, BurFlow Free handles entire sites.' },
    ],
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
      item: `${SITE_URL}${item.path}`,
    })),
  });
}

export function buildWebApplicationSchema(tool: ToolDefinition): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.name,
    description: tool.shortDescription,
    url: `${SITE_URL}${tool.route ?? `/tools/${tool.slug}`}`,
    applicationCategory: 'BusinessApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    provider: {
      '@type': 'Organization',
      name: 'BurFlow',
      url: SITE_URL,
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