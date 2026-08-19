import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Container } from '../../layouts/Container';
import { TrustSection } from './TrustSection';
import { PricingCard, type PricingTier } from '../../components/ui/PricingCard';
import { cn } from '../../utils/cn';

// Tokenless bootstrap: the widget exchanges the public tenant id for a fresh
// token at runtime (GET /api/widget/public-token). Override via
// VITE_WIDGET_TENANT_ID in .env.development; `burflow-saas` is the seeded
// SaaS demo tenant.
const DEV_WIDGET_TENANT_ID = import.meta.env.DEV ? 'burflow-saas' : undefined;
const WIDGET_TENANT_ID = (import.meta.env.VITE_WIDGET_TENANT_ID as string | undefined) || DEV_WIDGET_TENANT_ID;
const WIDGET_CDN = import.meta.env.VITE_WIDGET_CDN_URL || '/widget/widget.js';
const WIDGET_API_URL = import.meta.env.VITE_API_URL || '';

const fadeUp = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' } };

const proofItems = [
  'No training required on your data',
  'Live in under 10 minutes',
  'Sales conversations, not generic replies',
  'Built for demo booking and lead qualification',
];

const trustBadges = [
  'Website-grounded answers',
  'Fast rollout',
  '24/7 lead handling',
];

const roiStats = [
  { value: '2-5x', label: 'more qualified conversations' },
  { value: '12 hrs', label: 'saved weekly on repetitive follow-up' },
  { value: '34%', label: 'higher demo conversion from site visitors' },
];

const socialProof = [
  {
    quote: 'BurFlow feels like a premium sales rep on our site. Visitors get the right answer faster and we see more qualified demos.',
    author: 'Mina, VP Growth',
  },
  {
    quote: 'The widget is thoughtful, grounded, and helpful. It turns passive traffic into real conversations instead of dead-end chats.',
    author: 'Jordan, RevOps Lead',
  },
];

const comparisonItems = [
  {
    title: 'BurFlow',
    description: 'Scans your live website, understands products and pricing automatically, and gives visitors a guided path to demo or purchase.',
    accent: 'bg-[var(--color-accent-50)] border-[var(--color-accent-200)]',
  },
  {
    title: 'Standard chatbot',
    description: 'Depends on manual setup, often misses pricing context, and leaves visitors with generic answers instead of a real next step.',
    accent: 'bg-[var(--color-neutral-50)] border-[var(--color-neutral-200)]',
  },
  {
    title: 'Manual knowledge base',
    description: 'Needs constant updating and still fails to feel proactive, helpful, or decisive at the exact moment visitors need it.',
    accent: 'bg-[var(--color-neutral-50)] border-[var(--color-neutral-200)]',
  },
  {
    title: 'Custom build',
    description: 'Costs more, takes longer, and delays the moment your website can start turning anonymous traffic into real pipeline.',
    accent: 'bg-[var(--color-neutral-50)] border-[var(--color-neutral-200)]',
  },
];

const faqItems = [
  {
    question: 'How long does setup take?',
    answer: 'Most teams are live in under 10 minutes. Start with a website scan, add the widget snippet, and let BurFlow begin guiding visitors right away.',
  },
  {
    question: 'What does BurFlow learn from my site?',
    answer: 'BurFlow reads your product pages, pricing, services, and FAQs so it can recommend the right offer, answer common objections, and qualify visitors.',
  },
  {
    question: 'Do I need documents?',
    answer: 'No. Your website is the primary source. Documents are optional and only needed when you want additional context or richer answers.',
  },
  {
    question: 'Will visitors see the widget immediately?',
    answer: 'Yes. Once installed, the widget is live and ready to help visitors book demos, compare options, and ask better questions the same day.',
  },
];

const previewTiers: PricingTier[] = [
  { name: 'Free', price: '$0', period: '/ mo', variant: 'free', features: ['100 messages / mo', '1 site scan', 'Community support'], cta: 'Get Started', ctaVariant: 'ghost' },
  { name: 'Starter', price: '$49', period: '/ mo', variant: 'starter', features: ['1,000 messages / mo', '3 site scans', 'Email support'], cta: 'Start free', ctaVariant: 'secondary' },
  { name: 'Professional', price: '$99', period: '/ mo', variant: 'professional', popular: true, features: ['10,000 messages / mo', 'Unlimited scans', 'Priority support'], cta: 'Start free', ctaVariant: 'primary' },
  { name: 'Enterprise', price: 'Custom', variant: 'enterprise', features: ['Unlimited usage', 'SSO + SLA', 'Dedicated onboarding'], cta: 'Talk to Sales', ctaVariant: 'primary' },
];

function WidgetHealthIndicator() {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle');
  const [config, setConfig] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV || !WIDGET_TENANT_ID || typeof document === 'undefined') return;
    const checkScript = () => setScriptLoaded(!!document.querySelector(`script[src^="${WIDGET_CDN}"]`));
    checkScript();
    const observer = new MutationObserver(checkScript);
    observer.observe(document.head, { childList: true });
    observer.observe(document.body, { childList: true });

    const loadConfig = async () => {
      setStatus('loading');
      try {
        // Tokenless: exchange the public tenant id for a short-lived token first.
        const tokenRes = await fetch(`/api/widget/public-token?tenantId=${encodeURIComponent(WIDGET_TENANT_ID)}`);
        if (!tokenRes.ok) throw new Error(`${tokenRes.status} ${tokenRes.statusText}`);
        const { token } = await tokenRes.json();
        if (!token) throw new Error('No token returned');
        const response = await fetch('/api/widget/config', { headers: { 'x-widget-token': token } });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        const payload = await response.json();
        setConfig(payload);
        setStatus('ok');
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch config');
        setStatus('fail');
      }
    };

    loadConfig();
    return () => observer.disconnect();
  }, []);

  if (!import.meta.env.DEV) return null;

  return (
    <div className="mt-6 rounded-2xl border border-[var(--color-slate-200)] bg-[var(--color-slate-50)] p-4 text-sm text-[var(--color-slate-700)] shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="font-semibold">Widget health</span>
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', {
          'bg-emerald-100 text-emerald-800': status === 'ok',
          'bg-amber-100 text-amber-800': status === 'loading',
          'bg-rose-100 text-rose-800': status === 'fail',
          'bg-slate-100 text-slate-600': status === 'idle',
        })}>{status}</span>
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-4"><span>Widget script loaded</span><span className={scriptLoaded ? 'text-emerald-600' : 'text-rose-600'}>{scriptLoaded ? 'Yes' : 'No'}</span></div>
        <div className="flex items-center justify-between gap-4"><span>Remote config fetched</span><span className={status === 'ok' ? 'text-emerald-600' : status === 'loading' ? 'text-amber-600' : 'text-rose-600'}>{status === 'ok' ? 'Yes' : status === 'loading' ? 'Checking…' : 'No'}</span></div>
        <div className="flex items-center justify-between gap-4"><span>Widget token valid</span><span className={status === 'ok' ? 'text-emerald-600' : 'text-rose-600'}>{status === 'ok' ? 'Yes' : 'Unknown'}</span></div>
        {config && (
          <div className="rounded-xl bg-white p-3 border border-[var(--color-slate-200)]">
            <div className="text-xs text-[var(--color-slate-500)] mb-2">Remote values</div>
            <div className="grid gap-1 text-[var(--color-slate-700)]">
              <div className="flex items-center justify-between"><span>Greeting</span><span>{String(config.greeting || '—')}</span></div>
              <div className="flex items-center justify-between"><span>Launcher</span><span>{String(config.launcherText || '—')}</span></div>
              <div className="flex items-center justify-between"><span>Primary color</span><span>{String(config.primaryColor || '—')}</span></div>
            </div>
          </div>
        )}
        {error && <div className="text-rose-700">{error}</div>}
      </div>
    </div>
  );
}

function WidgetEmbedLoader() {
  useEffect(() => {
    if (!WIDGET_TENANT_ID || typeof document === 'undefined') return;
    if (document.querySelector(`script[src^="${WIDGET_CDN}"]`)) return;

    const script = document.createElement('script');
    script.src = WIDGET_CDN;
    script.async = true;
    script.defer = true;
    // The widget's autoInit reads these attributes and bootstraps a fresh
    // token from /api/widget/public-token (same-origin when VITE_API_URL is
    // unset — the Vite dev proxy forwards /api to the SaaS API).
    script.setAttribute('data-tenant-id', WIDGET_TENANT_ID);
    if (WIDGET_API_URL) script.setAttribute('data-api-url', WIDGET_API_URL);
    script.setAttribute('data-position', 'bottom-right');
    script.setAttribute('data-primary-color', '#006248');
    script.setAttribute('data-greeting', '👋 Hey there! I know everything about this website\u2019s products and pricing. Ask me anything!');
    script.setAttribute('data-launcher-text', 'Try for free');

    document.body.appendChild(script);
    return () => script.remove();
  }, []);

  return (
    <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-8 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">
      <p className="text-base font-semibold text-[var(--color-neutral-900)]">Your live BurFlow widget is ready in the corner.</p>
      <p className="mt-2 text-sm text-[var(--color-neutral-500)]">Open the bubble to see the proactive sales flow with suggestion chips and guided next steps.</p>
      <WidgetHealthIndicator />
    </div>
  );
}

function openWidget() {
  if (typeof window === 'undefined') return;
  const widget = (window as any).__CURRENT_WIDGET;
  if (widget?.toggle) {
    widget.toggle();
    return;
  }
  const demoSection = document.getElementById('demo');
  demoSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function LandingPage() {
  const [siteUrl, setSiteUrl] = useState('https://acme.com');
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [scanStage, setScanStage] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanSummary, setScanSummary] = useState({ pages: 0, products: 0, services: 0, pricing: 0, faqs: 0, intents: 0, readyIn: '4 min' });
  const [scanDetails, setScanDetails] = useState<{ name: string; description: string; pages: string[]; products: string[]; services: string[] } | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (scanTimerRef.current) clearInterval(scanTimerRef.current); }, []);

  /** Fetch a page through a CORS proxy and parse its content. */
  async function fetchPage(url: string): Promise<string> {
    const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxy, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.text();
  }

  /** Extract structured info from HTML. */
  function parsePage(html: string, baseUrl: string): { title: string; description: string; links: string[]; headings: string[] } {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const title = doc.querySelector('title')?.textContent?.trim() || '';
    const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const origin = new URL(baseUrl).origin;
    const links = Array.from(doc.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href') || '')
      .filter((href) => href.startsWith('/') || href.startsWith(origin))
      .map((href) => { try { return new URL(href, origin).pathname; } catch { return href; } })
      .filter((p) => p && !p.startsWith('#') && !p.includes('.'));
    const headings = Array.from(doc.querySelectorAll('h1,h2,h3'))
      .map((h) => h.textContent?.trim() || '')
      .filter(Boolean);
    return { title, description, links: [...new Set(links)].slice(0, 50), headings: [...new Set(headings)].slice(0, 20) };
  }

  /** Classify pages and extract products/services from headings. */
  function classifyContent(pages: string[], headings: string[]): { products: string[]; services: string[]; pricing: number; faqs: number } {
    const productKeywords = /product|feature|solution|tool|platform|software|app/i;
    const serviceKeywords = /service|support|consulting|help|setup|onboard/i;
    const pricingKeywords = /pric|plan|cost|tier|subscription/i;
    const faqKeywords = /faq|question|answer|help|support/i;
    const products = headings.filter((h) => productKeywords.test(h)).slice(0, 8);
    const services = headings.filter((h) => serviceKeywords.test(h)).slice(0, 8);
    const pricing = pages.filter((p) => pricingKeywords.test(p)).length || headings.filter((h) => pricingKeywords.test(h)).length;
    const faqs = pages.filter((p) => faqKeywords.test(p)).length + headings.filter((h) => faqKeywords.test(h)).length;
    return { products, services, pricing, faqs };
  }

  const SCAN_STAGES: [number, string][] = [
    [0, 'Connecting to site…'],
    [10, 'Discovering pages…'],
    [25, 'Crawling content…'],
    [45, 'Analyzing products & services…'],
    [65, 'Reading pricing & plans…'],
    [80, 'Mapping buyer intents…'],
    [92, 'Building knowledge graph…'],
  ];

  const scanPreview = useMemo(() => {
    if (scanState === 'done') {
      return [
        { label: 'Pages scanned', value: `${scanSummary.pages}+` },
        { label: 'Products found', value: `${scanSummary.products}` },
        { label: 'Services found', value: `${scanSummary.services}` },
        { label: 'Pricing pages', value: `${scanSummary.pricing}` },
        { label: 'FAQs detected', value: `${scanSummary.faqs}` },
        { label: 'Buyer intents', value: `${scanSummary.intents}` },
      ];
    }
    return [
      { label: 'Pages scanned', value: '—' },
      { label: 'Products found', value: '—' },
      { label: 'Services found', value: '—' },
      { label: 'Pricing pages', value: '—' },
      { label: 'FAQs detected', value: '—' },
      { label: 'Buyer intents', value: '—' },
    ];
  }, [scanState, scanSummary]);

  const handleScanDemo = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!siteUrl || siteUrl === 'https://') return;
    let url = siteUrl.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    setScanState('scanning');
    setScanProgress(0);
    setScanStage(SCAN_STAGES[0]![1]);
    setScanDetails(null);

    let p = 0;
    if (scanTimerRef.current) clearInterval(scanTimerRef.current);

    // Start progress animation
    scanTimerRef.current = window.setInterval(() => {
      p = Math.min(p + 1.5 + Math.random() * 2.5, 85);
      const stage = [...SCAN_STAGES].reverse().find(([at]) => p >= at)?.[1] ?? SCAN_STAGES[0]![1];
      setScanProgress(p);
      setScanStage(stage);
    }, 150);

    try {
      // Fetch the actual website
      setScanStage('Connecting to site…');
      setScanProgress(5);
      const html = await fetchPage(url);

      setScanStage('Parsing content…');
      setScanProgress(35);
      const parsed = parsePage(html, url);

      // Try to discover sub-pages from links
      setScanStage('Discovering pages…');
      setScanProgress(55);
      const subPages = parsed.links.slice(0, 12);
      const discoveredPages: string[] = [url, ...subPages.map((p) => { try { return new URL(p, url).toString(); } catch { return p; } })];

      // Fetch a few key sub-pages for deeper analysis
      setScanStage('Analyzing products & services…');
      setScanProgress(70);
      const extraHeadings: string[] = [...parsed.headings];
      const pagesToFetch = subPages.filter((p) => /product|service|pricing|about|feature/i.test(p)).slice(0, 3);
      for (const page of pagesToFetch) {
        try {
          const pageUrl = new URL(page, url).toString();
          const pageHtml = await fetchPage(pageUrl);
          const pageParsed = parsePage(pageHtml, pageUrl);
          extraHeadings.push(...pageParsed.headings);
        } catch { /* skip failed pages */ }
      }

      setScanStage('Classifying content…');
      setScanProgress(88);
      const classified = classifyContent(parsed.links, extraHeadings);
      const intents = Math.max(5, classified.products.length * 3 + classified.services.length * 2 + classified.pricing * 2);

      setScanStage('Building knowledge graph…');
      setScanProgress(98);

      // Complete
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
      setScanProgress(100);
      setScanSummary({
        pages: discoveredPages.length,
        products: classified.products.length || 1,
        services: classified.services.length || 1,
        pricing: classified.pricing || 1,
        faqs: classified.faqs || 1,
        intents,
        readyIn: '4 min',
      });
      setScanDetails({
        name: parsed.title || new URL(url).hostname,
        description: parsed.description || 'No meta description found.',
        pages: discoveredPages.slice(0, 8),
        products: classified.products,
        services: classified.services,
      });
      setScanStage('Scan complete');
      setScanState('done');
    } catch (err) {
      // Fallback: show what we can from the homepage alone
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
      const domain = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      setScanProgress(100);
      setScanSummary({ pages: 1, products: 1, services: 1, pricing: 1, faqs: 1, intents: 5, readyIn: '4 min' });
      setScanDetails({ name: domain, description: 'Could not fully fetch the website. The agent will learn more during setup.', pages: [url], products: [], services: [] });
      setScanStage('Scan complete — limited data');
      setScanState('done');
    }
  };

  return (
    <div className="pb-24 md:pb-0">
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-20">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] gap-10 lg:gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-accent-200)] bg-[var(--color-accent-200)]/35 px-3.5 py-1.5 text-xs font-semibold text-[var(--color-accent-700)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-accent-600)]" />
                Premium AI Website Sales Agent
              </div>
              <h1 className="mt-6 text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-[var(--color-neutral-900)] leading-[1.03]">
                Turn your website into a premium AI sales agent.
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-[var(--color-neutral-600)] leading-8">
                BurFlow scans your website, understands your offer automatically, and helps visitors compare options, qualify themselves, and book a demo without friction.
              </p>

              <div className="mt-6 flex flex-wrap gap-2 text-sm text-[var(--color-neutral-600)]">
                <span className="rounded-full border border-[var(--color-neutral-200)] bg-white px-3 py-1.5 shadow-sm">Website scan</span>
                <span className="rounded-full border border-[var(--color-neutral-200)] bg-white px-3 py-1.5 shadow-sm">Business understanding</span>
                <span className="rounded-full border border-[var(--color-neutral-200)] bg-white px-3 py-1.5 shadow-sm">Demo capture</span>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3 max-w-xl text-sm text-[var(--color-neutral-600)]">
                <div className="rounded-3xl border border-[var(--color-neutral-200)] bg-white p-4 shadow-sm">
                  <p className="font-semibold text-[var(--color-neutral-900)]">Understand your offer</p>
                  <p className="mt-2 text-[var(--color-neutral-500)]">BurFlow extracts your products, pricing, and service details from the site without manual setup.</p>
                </div>
                <div className="rounded-3xl border border-[var(--color-neutral-200)] bg-white p-4 shadow-sm">
                  <p className="font-semibold text-[var(--color-neutral-900)]">Qualify visitors</p>
                  <p className="mt-2 text-[var(--color-neutral-500)]">It recommends the right plan, flags intent, and guides people toward the best next step.</p>
                </div>
                <div className="rounded-3xl border border-[var(--color-neutral-200)] bg-white p-4 shadow-sm">
                  <p className="font-semibold text-[var(--color-neutral-900)]">Capture demand</p>
                  <p className="mt-2 text-[var(--color-neutral-500)]">The widget helps turn anonymous traffic into booked demos and warm leads almost immediately.</p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {trustBadges.map((badge) => (
                  <span key={badge} className="inline-flex items-center rounded-full border border-[var(--color-neutral-200)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--color-neutral-700)] shadow-sm">
                    {badge}
                  </span>
                ))}
              </div>

              <form onSubmit={handleScanDemo} className="mt-8 rounded-3xl border border-[var(--color-neutral-200)] bg-white p-4 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.26)]">
                <label className="text-sm font-semibold text-[var(--color-neutral-700)]">Enter your website</label>
                <div className="mt-3 flex flex-col sm:flex-row gap-3">
                  <input
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    className="h-12 flex-1 rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] px-4 text-sm text-[var(--color-neutral-800)] outline-none focus:border-[var(--color-accent-400)] focus:ring-2 focus:ring-[var(--color-accent-200)]"
                    placeholder="https://yourcompany.com"
                  />
                  <button type="submit" disabled={scanState === 'scanning'} className="h-12 rounded-2xl bg-[var(--color-accent-600)] px-5 text-sm font-semibold text-white shadow-lg shadow-[rgba(99,102,241,0.18)] transition hover:bg-[var(--color-accent-700)] disabled:opacity-60 disabled:cursor-not-allowed">
                    {scanState === 'scanning' ? 'Scanning…' : scanState === 'done' ? 'Rescan' : 'Scan My Website'}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--color-neutral-500)]">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-neutral-100)] px-3 py-1">
                    <svg className="h-4 w-4 text-[var(--color-accent-600)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    No training on your data
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-neutral-100)] px-3 py-1">
                    <svg className="h-4 w-4 text-[var(--color-accent-600)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    Live in under 10 minutes
                  </span>
                </div>
              </form>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={openWidget} className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--color-accent-200)] bg-white px-5 text-sm font-semibold text-[var(--color-neutral-700)] transition hover:border-[var(--color-accent-300)] hover:text-[var(--color-accent-600)]">
                  Watch live demo
                </button>
                <Link to="/signup" className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--color-neutral-900)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--color-neutral-800)]">
                  Book a demo
                </Link>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.05 }} className="rounded-3xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] p-5 shadow-[0_30px_80px_-25px_rgba(0,0,0,0.2)]">
              <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-600)]">Live scan preview</p>
                    <p className="mt-1 text-lg font-semibold text-[var(--color-neutral-900)]">{siteUrl || 'Your website'}</p>
                  </div>
                  <div className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', scanState === 'done' ? 'bg-emerald-100 text-emerald-700' : scanState === 'scanning' ? 'bg-amber-100 text-amber-700' : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)]')}>
                    {scanState === 'done' ? 'Ready' : scanState === 'scanning' ? 'Scanning…' : 'Waiting'}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-[var(--color-neutral-50)] p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-neutral-500)]">{scanState === 'scanning' ? scanStage : scanState === 'done' ? 'Scan complete' : 'Waiting to scan'}</span>
                    <span className="font-semibold text-[var(--color-neutral-900)]">{scanState === 'done' ? '97% ready' : scanState === 'scanning' ? `${Math.round(scanProgress)}%` : '—'}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-[var(--color-neutral-200)]">
                    <div className={cn('h-2 rounded-full bg-[var(--color-accent-600)] transition-all duration-300')} style={{ width: scanState === 'done' ? '97%' : `${scanProgress}%` }} />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {scanPreview.map((item) => (
                      <div key={item.label} className="rounded-xl border border-[var(--color-neutral-200)] bg-white p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-neutral-400)]">{item.label}</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-neutral-900)]">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {scanState === 'done' && scanDetails && (
                  <div className="mt-4 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-600)]">What we found</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-neutral-900)]">{scanDetails.name}</p>
                    <p className="mt-1 text-xs text-[var(--color-neutral-500)] line-clamp-2">{scanDetails.description}</p>
                    {scanDetails.pages.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-neutral-400)]">Pages discovered</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {scanDetails.pages.map((p) => (
                            <span key={p} className="inline-block max-w-[140px] truncate rounded-md bg-[var(--color-neutral-100)] px-2 py-0.5 text-[11px] text-[var(--color-neutral-600)]" title={p}>{p.replace(/^https?:\/\/[^/]+/, '').split('/').filter(Boolean).slice(-2).join('/') || '/'}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(scanDetails.products.length > 0 || scanDetails.services.length > 0) && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {scanDetails.products.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-neutral-400)]">Products found</p>
                            <ul className="mt-1 space-y-0.5">
                              {scanDetails.products.map((p) => <li key={p} className="text-xs text-[var(--color-neutral-700)]">• {p}</li>)}
                            </ul>
                          </div>
                        )}
                        {scanDetails.services.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-neutral-400)]">Services found</p>
                            <ul className="mt-1 space-y-0.5">
                              {scanDetails.services.map((s) => <li key={s} className="text-xs text-[var(--color-neutral-700)]">• {s}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 rounded-2xl border border-[var(--color-accent-200)] bg-[var(--color-accent-50)] p-4 text-sm text-[var(--color-neutral-700)]">
                  <p className="font-semibold text-[var(--color-neutral-900)]">What your visitors will experience</p>
                  <ul className="mt-2 space-y-2">
                    <li>• A clear product recommendation path instead of a dead-end chatbot</li>
                    <li>• Helpful next-step prompts for pricing, demos, and support</li>
                    <li>• A more premium experience that feels like a real sales rep</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      <section className="py-4 md:py-6">
        <Container>
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] p-4 md:flex-row md:items-center md:justify-between">
            {proofItems.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-[var(--color-neutral-600)]">
                <svg className="h-4 w-4 text-[var(--color-accent-600)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-24">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-600)]">Why teams switch</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--color-neutral-900)]">The website becomes your best-performing salesperson.</h2>
              <p className="mt-4 text-lg text-[var(--color-neutral-600)] leading-8">
                Most chatbots feel generic. BurFlow is built to feel grounded in your business, confident in the offer, and useful at the exact moment a visitor is deciding whether to trust you.
              </p>
              <div className="mt-8 grid gap-4">
                {[
                  'Understands products, pricing, and service tiers automatically',
                  'Offers a confident, proactive conversation instead of an empty box',
                  'Helps turn anonymous visits into demo requests and qualified leads',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-4">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-100)] text-[var(--color-accent-700)]">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <p className="text-sm text-[var(--color-neutral-700)]">{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.08 }} className="grid gap-4 sm:grid-cols-3">
              {roiStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-5 shadow-sm">
                  <p className="text-2xl font-bold text-[var(--color-neutral-900)]">{stat.value}</p>
                  <p className="mt-2 text-sm text-[var(--color-neutral-600)]">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-24 bg-[var(--color-neutral-50)]/60">
        <Container>
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-600)]">Social proof</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--color-neutral-900)]">Trusted by teams that need conversion, not just chat.</h2>
          </motion.div>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {socialProof.map((item) => (
              <motion.div key={item.author} {...fadeUp} transition={{ duration: 0.5, delay: 0.05 }} className="rounded-3xl border border-[var(--color-neutral-200)] bg-white p-7 shadow-sm">
                <p className="text-lg leading-8 text-[var(--color-neutral-700)]">“{item.quote}”</p>
                <p className="mt-5 text-sm font-semibold text-[var(--color-neutral-900)]">{item.author}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      <section id="demo" className="py-16 md:py-24">
        <Container>
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-600)]">Live product preview</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--color-neutral-900)]">The same experience visitors see on your site.</h2>
            <p className="mt-4 text-lg text-[var(--color-neutral-600)]">The widget greets visitors confidently, offers smart suggestions, and guides them toward the next best action.</p>
          </motion.div>
          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.06 }} className="mt-10">
            {WIDGET_TENANT_ID ? <WidgetEmbedLoader /> : <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-10 text-center text-sm text-[var(--color-neutral-500)]">Widget tenant missing. Set <code>VITE_WIDGET_TENANT_ID</code> in local dev to preview the live widget.</div>}
          </motion.div>
        </Container>
      </section>

      <section className="py-16 md:py-24 overflow-hidden">
        <Container>
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-600)]">Conversion flow</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--color-neutral-900)]">From website scan to booked demo in one motion.</h2>
          </motion.div>
          <div className="mt-10 grid gap-6 lg:grid-cols-4">
            {[
              { title: 'Scan', description: 'BurFlow reads your website and identifies your products, pricing, and buyer paths.' },
              { title: 'Understand', description: 'The agent learns your offer and how to guide visitors to the right next step.' },
              { title: 'Convert', description: 'Visitors see smart suggestions, product guidance, and a clear path to book a demo.' },
              { title: 'Measure', description: 'You see higher intent, better qualification, and clearer conversion signals.' },
            ].map((step, index) => (
              <motion.div key={step.title} {...fadeUp} transition={{ duration: 0.4, delay: 0.05 * index }} className="rounded-3xl border border-[var(--color-neutral-200)] bg-white p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-100)] text-sm font-semibold text-[var(--color-accent-700)]">{index + 1}</div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-neutral-900)]">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--color-neutral-600)]">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-24 bg-[var(--color-neutral-50)]/60">
        <Container>
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-600)]">Compare options</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--color-neutral-900)]">Why BurFlow beats the usual options.</h2>
          </motion.div>
          <div className="mt-10 grid gap-6 lg:grid-cols-4">
            {comparisonItems.map((item, index) => (
              <motion.div key={item.title} {...fadeUp} transition={{ duration: 0.4, delay: 0.05 * index }} className={`rounded-3xl border p-6 shadow-sm ${item.accent}`}>
                <h3 className="text-lg font-semibold text-[var(--color-neutral-900)]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--color-neutral-600)]">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-24">
        <Container>
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-neutral-900)]">Simple pricing. Clear value.</h2>
            <p className="mt-3 text-lg text-[var(--color-neutral-600)]">Get live in minutes, then scale when your pipeline grows.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch max-w-6xl mx-auto">
            {previewTiers.map((tier, i) => (
              <motion.div key={tier.name} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.08 }} className={tier.popular ? 'relative lg:-translate-y-2' : ''}>
                <PricingCard tier={tier} />
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-24 bg-[var(--color-neutral-50)]/60">
        <Container>
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-600)]">FAQ</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--color-neutral-900)]">Questions most teams ask before launch</h2>
          </motion.div>
          <div className="mt-10 grid gap-6 lg:grid-cols-2 max-w-5xl mx-auto">
            {faqItems.map((item, index) => (
              <motion.div key={item.question} {...fadeUp} transition={{ duration: 0.4, delay: 0.05 * index }} className="rounded-3xl border border-[var(--color-neutral-200)] bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--color-neutral-900)]">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--color-neutral-600)]">{item.answer}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-24">
        <Container>
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="rounded-3xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-900)] px-6 py-10 md:px-8 md:py-12 text-center text-white shadow-[0_30px_80px_-25px_rgba(0,0,0,0.35)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent-300)]">Ready to launch</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Make your website do the selling for you.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--color-neutral-300)] leading-8">Start with a scan, launch the widget, and let visitors discover the right product, plan, or next step with confidence.</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup" className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--color-accent-600)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-700)]">
                Scan My Website
              </Link>
              <button type="button" onClick={openWidget} className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white transition hover:bg-white/20">
                Preview widget
              </button>
            </div>
          </motion.div>
        </Container>
      </section>
    </div>
  );
}
