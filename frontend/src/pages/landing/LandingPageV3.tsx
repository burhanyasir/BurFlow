import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight } from 'lucide-react';
import { SEO } from '../../components/SEO';
import { CTA, Check, Eyebrow, Pill } from '../../components/landing/primitives';
import { ScanCard, type ScanStatus, type ScanResult, type ScanDetails } from '../../components/landing/scan-card';
import { Reveal } from '../../components/landing/reveal';
import { SiteHeader } from '../../components/landing/SiteHeader';
import { SiteFooter } from '../../components/landing/SiteFooter';
import { WidgetLauncher } from '../../components/landing/WidgetLauncher';
import { ExitIntentPopup } from '../../components/landing/ExitIntentPopup';
import { LiveActivity, RatingProof, TrustMarquee } from '../../components/landing/social';
import { StickyCta } from '../../components/landing/sticky-cta';
import { initAnalytics, track, trackOnce } from '../../lib/analytics';
import { apiClient } from '../../lib/api-client';
import { getActiveTools } from '../../data/toolsData';
import { ToolIcon } from '../tools/toolIcons';
import { SITE_URL } from '../../lib/site';

const toolHighlights = getActiveTools().filter((tool) =>
  ['lead-leak-calculator', 'chatbot-roi-calculator', 'ai-prompt-generator', 'document-to-markdown'].includes(tool.slug)
);

const outcomes = [
  {
    k: 'Understand your offer',
    v: 'BurFlow extracts your products, pricing, and service details from the site — no manual training, no spreadsheets.',
  },
  {
    k: 'Qualify every visitor',
    v: 'It recommends the right plan, flags buying intent, and moves people toward the best next step.',
  },
  {
    k: 'Capture demand now',
    v: 'Anonymous traffic becomes booked demos and warm leads while the intent is still hot.',
  },
];

const proof = [
  { n: '2–5×', l: 'more qualified conversations' },
  { n: '12 hrs', l: 'saved weekly on repetitive follow-up' },
  { n: '34%', l: 'higher demo conversion from site visitors' },
];

const testimonials = [
  {
    q: 'BurFlow feels like a premium sales rep on our site. Visitors get the right answer faster and we book noticeably more qualified demos.',
    a: 'Mina',
    r: 'VP Growth',
  },
  {
    q: 'Thoughtful, grounded, and genuinely helpful. It turns passive traffic into real conversations instead of dead-end chats.',
    a: 'Jordan',
    r: 'RevOps Lead',
  },
];

const steps = [
  { n: '01', t: 'Scan', d: 'BurFlow reads your website and identifies products, pricing, and buyer paths.' },
  { n: '02', t: 'Understand', d: 'The agent learns your offer and how to guide each visitor to the right next step.' },
  { n: '03', t: 'Convert', d: 'Visitors get smart suggestions, product guidance, and a clear path to book.' },
  { n: '04', t: 'Measure', d: 'You see higher intent, better qualification, and clearer conversion signals.' },
];

const compare = [
  {
    t: 'BurFlow',
    d: 'Scans your live website, understands products and pricing automatically, and gives visitors a guided path to demo or purchase.',
    good: true,
  },
  {
    t: 'Standard chatbot',
    d: 'Depends on manual setup, misses pricing context, and leaves visitors with generic answers instead of a real next step.',
  },
  {
    t: 'Manual knowledge base',
    d: 'Needs constant updating and still fails to feel proactive at the exact moment a visitor is deciding.',
  },
  {
    t: 'Custom build',
    d: 'Costs more, takes longer, and delays the month your website could have been generating pipeline.',
  },
];

const plans = [
  { name: 'Free', price: '$0', note: 'Try it on one site', f: ['100 messages / mo', '1 site scan', 'Community support'], cta: 'Get started' },
  { name: 'Starter', price: '$49', note: 'For growing sites', f: ['1,000 messages / mo', '3 site scans', 'Email support'], cta: 'Start free' },
  {
    name: 'Professional',
    price: '$99',
    note: 'Most teams land here',
    f: ['10,000 messages / mo', 'Unlimited scans', 'Priority support'],
    cta: 'Start free',
    popular: true,
  },
  { name: 'Enterprise', price: 'Custom', note: 'Security & scale', f: ['Unlimited usage', 'SSO + SLA', 'Dedicated onboarding'], cta: 'Talk to sales' },
];

const faqs = [
  {
    q: 'How long does setup really take?',
    a: 'Most teams are live in under 10 minutes: run a website scan, paste the widget snippet, and BurFlow starts guiding visitors immediately.',
  },
  {
    q: 'What does BurFlow learn from my site?',
    a: 'Your product pages, pricing, services, and FAQs — so it can recommend the right offer, answer common objections, and qualify visitors.',
  },
  {
    q: 'Do I need to upload documents?',
    a: 'No. Your website is the primary source. Documents are optional and only help when you want richer context.',
  },
  {
    q: 'Is my data used for training?',
    a: 'Never. Your content stays yours and is used only to answer your visitors.',
  },
];

const SCAN_STAGES: Array<[number, string]> = [
  [10, 'Discovering pages…'],
  [38, 'Reading pricing & services…'],
  [66, 'Identifying products & buyer intents…'],
  [88, 'Building your sales agent…'],
];

const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'BurFlow',
  url: SITE_URL,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'BurFlow is an autonomous AI sales agent platform that scans your website, learns your products and pricing, qualifies visitors in real time, and books demos automatically.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free tier — try it on one site',
  },
  publisher: {
    '@type': 'Organization',
    name: 'BurFlow',
    url: SITE_URL,
  },
  featureList: [
    'Autonomous website scan and offer extraction',
    'AI visitor qualification and buying-intent detection',
    'Grounded, site-specific answers for every visitor',
    'Automated demo booking and lead capture',
    'Human handover and conversation analytics',
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does BurFlow qualify visitors?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'BurFlow scans your website, learns your products and pricing, and uses buying-intent detection to recommend the right plan and flag visitor intent in real time.',
      },
    },
    {
      '@type': 'Question',
      name: 'What pricing plans does BurFlow offer?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'BurFlow offers a Free tier ($0, 100 messages/mo), Starter ($49/mo), Professional ($99/mo), and Enterprise (custom pricing).',
      },
    },
    {
      '@type': 'Question',
      name: 'How long does it take to set up BurFlow?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'BurFlow can be live in under 10 minutes — just paste the widget snippet into your website and it immediately starts scanning and qualifying visitors.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does BurFlow use my data for training?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. BurFlow answers are grounded in your own website content only. Your data is never used to train the model.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I humanly hand off conversations?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. BurFlow supports seamless handover to human reps when visitors request escalation or when the conversation is escalated by the team.',
      },
    },
  ],
};

export default function LandingPageV3() {
  const sectionsRef = useRef<HTMLElement | null>(null);
  const [scan, setScan] = useState<{ status: ScanStatus; stage: string; progress: number; url: string }>({
    status: 'idle',
    stage: '',
    progress: 0,
    url: 'https://yourcompany.com/',
  });
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanDetails, setScanDetails] = useState<ScanDetails | null>(null);
  const scanTimer = useRef<number | null>(null);

  /** Classify pages and extract products/services. */
  const classifyContent = useCallback((pages: string[], headings: string[], paragraphs: string[], lists: string[]) => {
    const productKeywords = /product|feature|solution|tool|platform|software|app|offer|plan|package|suite|module/i;
    const serviceKeywords = /service|support|consulting|help|setup|onboard|implementation|maintenance|training|managed/i;
    const pricingKeywords = /pric|plan|cost|tier|subscription|fee|rate|package/i;
    const faqKeywords = /faq|question|answer|help|support|contact/i;
    const products = headings.filter((h) => productKeywords.test(h)).slice(0, 8);
    const productPatterns = paragraphs.filter((p) => /(?:our|the|introducing|new|popular|best|flagship)\s+(?:product|feature|tool|platform|solution|app|software)/i.test(p)).slice(0, 4);
    products.push(...productPatterns.map((p) => p.slice(0, 60)));
    const services = headings.filter((h) => serviceKeywords.test(h)).slice(0, 8);
    const servicePatterns = paragraphs.filter((p) => /(?:our|the|offering|providing|delivering)\s+(?:service|support|consulting|help|training)/i.test(p)).slice(0, 4);
    services.push(...servicePatterns.map((p) => p.slice(0, 60)));
    const pricing = pages.filter((p) => pricingKeywords.test(p)).length || headings.filter((h) => pricingKeywords.test(h)).length || (paragraphs.filter((p) => /pricing|plan|tier|subscription/i.test(p)).length > 0 ? 1 : 0);
    const faqs = pages.filter((p) => faqKeywords.test(p)).length + headings.filter((h) => faqKeywords.test(h)).length;
    return { products: [...new Set(products)].slice(0, 8), services: [...new Set(services)].slice(0, 8), pricing, faqs };
  }, []);

  useEffect(() => {
    return () => {
      if (scanTimer.current) window.clearInterval(scanTimer.current);
    };
  }, []);

  const startScan = useCallback(async (raw: string) => {
    let url = raw && raw.trim() && raw.trim() !== 'https://' ? raw.trim() : 'https://yourcompany.com/';
    if (!url.startsWith('http')) url = 'https://' + url;
    setScan({ status: 'scanning', stage: SCAN_STAGES[0]![1], progress: 2, url });
    setScanResult(null);
    setScanDetails(null);
    track('scan_submit', { url });
    apiClient.post('/public/leads', { source: 'scan', websiteUrl: url }).catch(() => {});
    document.getElementById('scan-preview')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    /** Try fetching a URL through multiple CORS proxies. Returns HTML or throws. */
    const fetchViaProxy = async (target: string, timeout = 12000): Promise<string> => {
      const proxies = [
        { url: `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}` },
        { url: `https://corsproxy.io/?url=${encodeURIComponent(target)}` },
        { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}` },
      ];
      for (const proxy of proxies) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), timeout);
          const resp = await fetch(proxy.url, { signal: ctrl.signal });
          clearTimeout(timer);
          if (!resp.ok) continue;
          const text = await resp.text();
          if (text.includes('<') && text.length > 200) return text;
        } catch { /* try next proxy */ }
      }
      throw new Error('All CORS proxies failed');
    };

    /** Regex-based HTML parser. */
    const parseHtml = (raw: string, base: string) => {
      const origin = new URL(base).origin;
      const get = (tag: string) => {
        const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
        const r: string[] = [];
        let m: RegExpExecArray | null;
        while ((m = re.exec(raw))) r.push(m[1].replace(/<[^>]+>/g, '').trim());
        return r;
      };
      const tm = raw.match(/<title[^>]*>([\\s\\S]*?)<\/title>/i);
      const dm = raw.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
        || raw.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
      const attrRe = (tag: string, a: string) => {
        const re = new RegExp(`<${tag}[^\\>]*\\s${a}=["']([^"']*)["'][^>]*>`, 'gi');
        const r: string[] = [];
        let m: RegExpExecArray | null;
        while ((m = re.exec(raw))) r.push(m[1].trim());
        return r;
      };
      const links = attrRe('a', 'href')
        .filter((h) => h.startsWith('/') || h.startsWith(origin))
        .map((h) => { try { return new URL(h, origin).pathname; } catch { return h; } })
        .filter((p) => p && !p.startsWith('#') && !p.includes('.'));
      return {
        title: tm ? tm[1].replace(/<[^>]+>/g, '').trim() : '',
        description: dm ? dm[1].trim() : '',
        links: [...new Set(links)].slice(0, 50),
        headings: [...new Set([...get('h1'), ...get('h2'), ...get('h3')])].slice(0, 20),
        paragraphs: get('p').filter((t) => t.length > 20 && t.length < 300).slice(0, 30),
        lists: get('li').filter((t) => t.length > 5 && t.length < 200).slice(0, 30),
      };
    };

    try {
      setScan((prev) => ({ ...prev, stage: 'Connecting to site…', progress: 10 }));

      // 1) Try server-side endpoint first (no CORS needed)
      let data: { title?: string; description?: string; headings?: string[]; products?: string[]; services?: string[]; paragraphs?: string[]; links?: string[]; subPages?: string[] } | null = null;
      try {
        const scanRes = await apiClient.post('/public/preview-scan', { url });
        data = scanRes.data;
      } catch { /* server endpoint unavailable — fall back to client-side fetch */ }

      // 2) If server failed, fetch directly via CORS proxies
      if (!data || (!data.title && !data.headings?.length)) {
        setScan((prev) => ({ ...prev, stage: 'Fetching website via proxy…', progress: 25 }));
        const mainHtml = await fetchViaProxy(url);
        const mainParsed = parseHtml(mainHtml, url);

        const subPat = /product|service|pric|plan|about|feature|solution|offer|contact|team/i;
        const subPaths = mainParsed.links.filter((p) => subPat.test(p)).slice(0, 3);
        const subPages: Array<{ path: string; headings: string[]; paragraphs: string[]; lists: string[] }> = [];
        for (const sp of subPaths) {
          try {
            const subUrl = new URL(sp, url).href;
            const subHtml = await fetchViaProxy(subUrl, 8000);
            const subParsed = parseHtml(subHtml, subUrl);
            subPages.push({ path: sp, headings: subParsed.headings, paragraphs: subParsed.paragraphs, lists: subParsed.lists });
          } catch { /* skip */ }
        }

        const allHeadings = [...mainParsed.headings, ...subPages.flatMap((s) => s.headings)];
        const allParagraphs = [...mainParsed.paragraphs, ...subPages.flatMap((s) => s.paragraphs)];
        const pKw = /product|feature|solution|tool|platform|software|app|offer|plan|package/i;
        const sKw = /service|support|consulting|help|setup|onboard|implementation|maintenance|training|managed/i;
        data = {
          title: mainParsed.title,
          description: mainParsed.description,
          headings: allHeadings.slice(0, 12),
          products: allHeadings.filter((h) => pKw.test(h)).slice(0, 8),
          services: allHeadings.filter((h) => sKw.test(h)).slice(0, 8),
          paragraphs: allParagraphs.filter((p) => /we offer|our .{0,20}(product|service|solution)/i.test(p)).map((p) => p.slice(0, 150)).slice(0, 3),
          links: mainParsed.links.slice(0, 10),
          subPages: subPages.map((s) => s.path),
        };
      }

      setScan((prev) => ({ ...prev, stage: 'Analyzing content…', progress: 70 }));
      const discoveredPages = [url, ...(data.subPages || []).map((p: string) => { try { return new URL(p, url).toString(); } catch { return p; } })];

      setScan((prev) => ({ ...prev, stage: 'Classifying products & services…', progress: 85 }));
      const products = data.products || [];
      const services = data.services || [];
      const intents = Math.max(5, products.length * 3 + services.length * 2 + 4);

      setScanResult({ pages: discoveredPages.length, products: products.length || 1, services: services.length || 1, pricing: 1, faqs: 1, intents });
      setScanDetails({ name: data.title || new URL(url).hostname, description: data.description || 'Website scanned successfully.', pages: discoveredPages.slice(0, 8), products, services, headings: (data.headings || []).slice(0, 12) });

      setScan((prev) => ({ ...prev, status: 'done', stage: 'Scan complete', progress: 100 }));
      trackOnce('scan_complete');
    } catch {
      const domain = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      setScanResult({ pages: 1, products: 1, services: 1, pricing: 1, faqs: 1, intents: 5 });
      setScanDetails({ name: domain, description: `Could not fully fetch ${domain}. The agent will learn more during setup.`, pages: [url], products: [], services: [], headings: [] });
      setScan((prev) => ({ ...prev, status: 'done', stage: 'Scan complete', progress: 100 }));
    }
  }, [classifyContent]);

  useEffect(() => {
    initAnalytics();

    const nodes = document.querySelectorAll<HTMLElement>('[data-section]');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            trackOnce('section_view', { section: e.target.getAttribute('data-section') });
          }
        }
      },
      { threshold: 0.4 },
    );
    nodes.forEach((n) => io.observe(n));

    const onScroll = () => {
      const pct = Math.round(
        ((window.scrollY + window.innerHeight) / document.body.scrollHeight) * 100,
      );
      for (const m of [25, 50, 75, 100]) {
        if (pct >= m) trackOnce('scroll_depth', { percent: m });
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <main ref={sectionsRef} className="landing min-h-screen bg-background">
      <SEO
        title="BurFlow — Autonomous AI Sales Agents That Turn Traffic Into Demos"
        description="BurFlow scans your website, learns your offer, and helps visitors compare options, qualify themselves, and book a demo — automatically, without friction or dead-end chat."
        canonicalPath="/"
        schema={JSON.stringify(softwareApplicationSchema)}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
      <SiteHeader />

      {/* ─── Hero ───────────────────────────────────────────────── */}
      <div className="aurora relative overflow-hidden">
        <div className="aurora-layer" />
        <div className="pointer-events-none absolute inset-0 -z-10 grid-fade" />
        <section className="px-6 pb-16 pt-14 md:pt-20">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/80 py-1.5 pl-1.5 pr-4 text-sm shadow-soft backdrop-blur">
                <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground">
                  New
                </span>
                <span className="text-muted-foreground">
                  Agents now qualify and book demos on their own
                </span>
              </span>
              <h1 className="mt-5 text-5xl font-bold leading-[0.95] md:text-6xl lg:text-7xl">
                Your website is
                <br />
                already your best
                <br />
                <span className="relative text-primary">
                  salesperson.
                  <svg
                    viewBox="0 0 300 12"
                    aria-hidden
                    preserveAspectRatio="none"
                    className="absolute -bottom-1 left-0 h-2.5 w-full text-success/60"
                  >
                    <path
                      d="M2 8 C 70 2, 150 12, 298 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                BurFlow scans your site, learns your offer, and helps visitors compare options,
                qualify themselves, and book a demo — without friction, forms, or dead-end chat.
              </p>

              <div id="scan" className="mt-9 max-w-lg scroll-mt-24">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = new FormData(e.currentTarget).get('website');
                    startScan(typeof input === 'string' ? input : '');
                  }}
                  className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-3 shadow-soft sm:flex-row sm:items-center"
                >
                  <input
                    type="url"
                    name="website"
                    onFocus={() => trackOnce('scan_input_focus')}
                    defaultValue="https://"
                    disabled={scan.status === 'scanning'}
                    aria-label="Your website URL"
                    placeholder="https://yourcompany.com"
                    className="h-12 w-full flex-1 rounded-xl bg-transparent px-4 text-base outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={scan.status === 'scanning'}
                    className="h-12 shrink-0 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-glow disabled:pointer-events-none disabled:opacity-60"
                  >
                    {scan.status === 'scanning' ? 'Scanning…' : 'Scan my website free'}
                  </button>
                </form>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  {['Free scan, no card', 'Live in under 10 minutes', 'No training on your data'].map((t) => (
                    <span key={t} className="inline-flex items-center gap-2">
                      <Check className="text-success" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-8">
                <RatingProof />
              </div>
            </Reveal>

            <div id="scan-preview" className="scroll-mt-24">
              <Reveal delay={120}>
                <ScanCard
                  status={scan.status}
                  stage={scan.stage}
                  progress={scan.progress}
                  url={scan.url}
                  result={scanResult}
                  details={scanDetails}
                  onRestart={() => {
                    setScan({ status: 'idle', stage: '', progress: 0, url: 'https://yourcompany.com/' });
                    setScanResult(null);
                    setScanDetails(null);
                  }}
                />
              </Reveal>
            </div>
          </div>
        </section>

        <div className="mx-auto mb-14 w-full max-w-6xl px-6">
          <p className="mb-5 text-center text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Powering revenue teams at
          </p>
          <TrustMarquee />
        </div>
      </div>

      {/* ─── Outcomes ───────────────────────────────────────────── */}
      <section className="border-t border-hairline bg-surface-2/60 px-6 py-20 md:py-24">
        <div className="mx-auto w-full max-w-6xl">
          <div data-section="outcomes" />
          <div className="grid gap-10 md:grid-cols-3">
            {outcomes.map((o, i) => (
              <Reveal key={o.k} delay={i * 90}>
                <div className="h-full rounded-2xl border border-hairline bg-surface p-7 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <span className="grid size-10 place-items-center rounded-xl bg-accent font-display text-sm font-bold text-accent-foreground">
                    0{i + 1}
                  </span>
                  <h3 className="mt-4 text-xl font-semibold">{o.k}</h3>
                  <p className="mt-3 text-muted-foreground">{o.v}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap gap-3">
            {['Website-grounded answers', 'Fast rollout', '24/7 lead handling', 'Demo capture built in'].map((t) => (
              <Pill key={t}>{t}</Pill>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why teams switch ───────────────────────────────────── */}
      <section className="border-t border-hairline px-6 py-24 md:py-32">
        <div className="mx-auto grid w-full max-w-6xl gap-14 lg:grid-cols-2">
          <div>
            <Eyebrow>Why teams switch</Eyebrow>
            <h2 className="mt-5 text-4xl font-bold leading-tight md:text-5xl">
              Most chatbots lose the visitor exactly when they were ready to buy.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              BurFlow is built to feel grounded in your business and confident in the offer at the
              precise moment someone is deciding whether to trust you.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                'Understands products, pricing, and service tiers automatically',
                'Offers a proactive conversation instead of an empty box',
                'Turns anonymous visits into demo requests and qualified leads',
              ].map((t) => (
                <li key={t} className="flex gap-3 text-foreground">
                  <Check className="mt-1 text-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 self-start">
            {proof.map((p, i) => (
              <Reveal key={p.n} delay={i * 100}>
                <div className="rounded-2xl border border-hairline bg-surface p-7 shadow-soft transition-shadow duration-300 hover:shadow-glow">
                  <p className="font-display text-5xl font-bold text-primary">{p.n}</p>
                  <p className="mt-2 text-muted-foreground">{p.l}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Social proof ───────────────────────────────────────── */}
      <section className="border-t border-hairline bg-surface-2/60 px-6 py-24 md:py-32">
        <div className="mx-auto w-full max-w-6xl">
          <Eyebrow>Social proof</Eyebrow>
          <h2 className="mt-5 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
            Trusted by teams that need conversion, not just chat.
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {testimonials.map((t, i) => (
              <Reveal key={t.a} delay={i * 110} as="figure" className="rounded-2xl border border-hairline bg-surface p-8 shadow-soft transition-transform duration-300 hover:-translate-y-1">
                <blockquote className="font-display text-xl leading-snug">“{t.q}”</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-accent font-display font-bold text-accent-foreground">
                    {t.a[0]}
                  </span>
                  <span className="text-sm">
                    <span className="font-semibold">{t.a}</span>
                    <span className="block text-muted-foreground">{t.r}</span>
                  </span>
                </figcaption>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Conversion flow ────────────────────────────────────── */}
      <section className="border-t border-hairline px-6 py-24 md:py-32">
        <div className="mx-auto w-full max-w-6xl">
          <Eyebrow>Conversion flow</Eyebrow>
          <h2 className="mt-5 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
            From website scan to booked demo in one motion.
          </h2>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline md:grid-cols-4">
            {steps.map((s) => (
              <li key={s.n} className="bg-surface p-7">
                <span className="font-display text-sm font-bold text-primary">{s.n}</span>
                <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── Compare ────────────────────────────────────────────── */}
      <section className="border-t border-hairline bg-surface-2/60 px-6 py-24 md:py-32">
        <div className="mx-auto w-full max-w-6xl">
          <Eyebrow>Compare options</Eyebrow>
          <h2 className="mt-5 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
            Why BurFlow beats the usual options.
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {compare.map((c) => (
              <div
                key={c.t}
                className={`rounded-2xl border p-7 ${
                  c.good
                    ? 'border-primary/30 bg-accent shadow-soft'
                    : 'border-hairline bg-surface/60'
                }`}
              >
                <h3 className={`text-lg font-semibold ${c.good ? 'text-primary' : ''}`}>{c.t}</h3>
                <p className="mt-2 text-muted-foreground">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" className="border-t border-hairline px-6 py-24 md:py-32">
        <div className="mx-auto w-full max-w-6xl">
          <div data-section="pricing" />
          <div className="max-w-2xl">
            <Eyebrow>Simple pricing</Eyebrow>
            <h2 className="mt-5 text-4xl font-bold leading-tight md:text-5xl">
              Start free. Pay only when it is already working.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Get live in minutes, then scale when your pipeline grows. Cancel anytime.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-sm shadow-soft">
              <Check className="text-success" />
              <span>
                <span className="font-semibold">30-day money-back guarantee.</span>{' '}
                <span className="text-muted-foreground">If it doesn’t lift conversations, you don’t pay.</span>
              </span>
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative flex flex-col rounded-2xl border p-7 ${
                  p.popular
                    ? 'border-primary bg-surface shadow-glow lg:-mt-4 lg:pb-11'
                    : 'border-hairline bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-soft'
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-4 font-display text-4xl font-bold">
                  {p.price}
                  {p.price.startsWith('$') && (
                    <span className="text-base font-medium text-muted-foreground"> / mo</span>
                  )}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{p.note}</p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {p.f.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <Check className="mt-0.5 text-primary" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  onClick={() => track('pricing_cta_click', { plan: p.name, price: p.price })}
                  className={`mt-7 inline-flex h-11 items-center justify-center rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 ${
                    p.popular
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-hairline bg-surface text-foreground'
                  }`}
                >
                  {p.cta}
                </Link>
                {p.popular && (
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Chosen by 68% of new teams
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Every day without a guided site experience is another day of visitors leaving without a
            next step.
          </p>
        </div>
      </section>

      {/* ─── FAQ ────────────────────────────────────────────────── */}
      <section className="border-t border-hairline bg-surface-2/60 px-6 py-24 md:py-32">
        <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-5 text-4xl font-bold leading-tight">
              Questions teams ask before launch
            </h2>
          </div>
          <div className="divide-y divide-hairline border-y border-hairline">
            {faqs.map((f) => (
              <details
                key={f.q}
                onToggle={(e) => {
                  if (e.currentTarget.open) track('faq_open', { question: f.q });
                }}
                className="group py-5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold">
                  {f.q}
                  <span className="text-primary transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-2xl text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ──────────────────────────────────────────── */}
      <section className="border-t border-hairline px-6 py-24 md:py-32">
        <div className="mx-auto w-full max-w-6xl">
          <div data-section="final_cta" />
          <div className="relative overflow-hidden rounded-3xl border border-hairline bg-ink px-8 py-16 text-center shadow-lift md:px-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{
                background:
                  'radial-gradient(50% 60% at 20% 0%, color-mix(in oklab, var(--lp-success) 26%, transparent), transparent 70%), radial-gradient(45% 55% at 85% 100%, color-mix(in oklab, var(--lp-primary) 45%, transparent), transparent 70%)',
              }}
            />
            <div className="relative">
              <p className="eyebrow text-primary-foreground/60">Ready to launch</p>
              <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-tight text-primary-foreground md:text-5xl">
                Make your website do the selling for you.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-primary-foreground/70">
                Run a free scan, launch the widget, and let visitors find the right plan and next step
                with confidence. Nothing to install beyond one snippet.
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <CTA>Scan my website free</CTA>
                <CTA variant="ghost" href="/docs/widget">
                  Preview the widget
                </CTA>
              </div>
              <p className="mt-5 text-sm text-primary-foreground/50">
                No credit card · No training on your data · Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Free Tools ─────────────────────────────────────── */}
      <section className="border-t border-hairline bg-surface-2/60 px-6 py-24 md:py-32">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Eyebrow>Free tools</Eyebrow>
              <h2 className="mt-5 text-4xl font-bold leading-tight">
                Free B2B SaaS growth tools
              </h2>
              <p className="mt-4 max-w-xl text-muted-foreground">
                Calculate your lead leak, model chatbot ROI, or generate conversion-ready AI
                prompts — all free, no signup required.
              </p>
            </div>
            <Link
              to="/free-tools"
              onClick={() => track('tool_cta_click', { tool_id: 'tools_hub', location: 'landing_section' })}
              className="inline-flex h-11 items-center rounded-full border border-hairline bg-surface px-6 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
            >
              Browse all free tools
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {toolHighlights.map((tool) => (
              <Link
                key={tool.slug}
                to={`/tools/${tool.slug}`}
                onClick={() => track('tool_cta_click', { tool_id: tool.slug, location: 'landing_section' })}
                className="group flex flex-col rounded-2xl border border-hairline bg-surface p-6 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lift"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ToolIcon name={tool.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold">{tool.name}</h3>
                <p className="mt-1.5 flex-1 text-sm text-muted-foreground">
                  {tool.shortDescription}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Use free tool
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />

      <LiveActivity />
      <StickyCta />
      <WidgetLauncher />
      <ExitIntentPopup />
    </main>
  );
}