import { BrandIntelligence } from '../types';

export interface BrandExtractorOptions {
  llm?: (prompt: string) => Promise<string>;
}

const CTA_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: 'Sign Up', pattern: /\bsign\s*up\b|\bregister\b|\bcreate (a )?free account\b|\bcreate (an )?account\b/gi },
  { label: 'Get Started', pattern: /\bget started\b|\bstart now\b|\bstart today\b|\bget started free\b/gi },
  { label: 'Free Trial', pattern: /\bfree trial\b|\btry free\b|\btry for free\b|\btry it free\b/gi },
  { label: 'Book a Demo', pattern: /\bbook (a )?demo\b|\brequest a demo\b|\bschedule (a )?demo\b|\bschedule a call\b|\brequest a walkthrough\b/gi },
  { label: 'Contact Us', pattern: /\bcontact us\b|\bcontact sales\b|\breach out\b|\bspeak with (a|our) team\b|\bget in touch\b/gi },
  { label: 'Buy Now', pattern: /\bbuy now\b|\bshop now\b|\bget it now\b|\border now\b|\bbuy today\b/gi },
  { label: 'Learn More', pattern: /\blearn more\b|\bdiscover more\b|\bexplore (our|the)\b|\bfind out more\b/gi },
  { label: 'Download', pattern: /\bdownload (the|our|now)?\b|\bget the (app|guide|whitepaper|ebook|report)\b/gi },
  { label: 'Get a Quote', pattern: /\bget a quote\b|\brequest (a )?quote\b|\bask for pricing\b|\bsee pricing\b/gi },
  { label: 'Start a Project', pattern: /\bstart a project\b|\bstart your project\b|\bbegin your project\b|\bkick (off|start)\b/gi },
];

const TONE_SIGNALS: { tone: string; keywords: RegExp }[] = [
  { tone: 'Professional', keywords: /\benterprise\b|\bsolution\b|\bplatform\b|\bcomprehensive\b|\bmanaged\b|\bsecure\b|\bscalable\b|\bexpertise\b|\bindustry-(leading|standard)\b|\bcompliance\b|\broi\b|\bservices\b|\bconsulting\b|\bstrategic\b|\binnovative\b|\breliable\b/gi },
  { tone: 'Friendly', keywords: /\bwe're here\b|\bwe are here\b|\bhappy to help\b|\bour team\b|\bwelcome\b|\bwe care\b|\bwe love\b|\bwe're excited\b|\bwe are excited\b|\byou're in good hands\b|\bhow can we help\b/gi },
  { tone: 'Casual', keywords: /\bhey\b|\bjust\b|\bawesome\b|\bquick(ly)?\b|\beasy\b|\bfun\b|\blove\b|\bchat\b|\bvibe\b|\bsuper\b|\bcool\b|\bgrab\b|\bsnag\b|\bno (strings|worries|risk)\b|\bon a budget\b/gi },
  { tone: 'Trustworthy', keywords: /\btrusted by\b|\btrusted\b|\bsecurity\b|\bprivacy\b|\bguarantee\b|\b100%?\b|\bmoney-back\b|\bssl\b|\bencryption\b|\bcertified\b|\bawards?\b|\btestimonials?\b|\breviews?\b/gi },
];

export class BrandExtractor {
  constructor(private options: BrandExtractorOptions = {}) {}

  buildPrompt(text: string): string {
    return [
      'You are a brand analyst. Analyze the website content below and return STRICT JSON with exactly this shape:',
      '{"brandTone": "one of: Professional, Friendly, Casual, Trustworthy, or a short custom tone", "primaryCtas": ["array of 1-5 call-to-action phrases found verbatim or near-verbatim on the page, e.g. Get Started"], "confidenceScore": 0.0-1.0, "primaryGoal": "the main business conversion goal inferred from CTAs and page content, e.g. book_demo, direct_checkout, appointment_booking, signup, contact_sales, download", "businessType": "inferred business category, e.g. saas, ecommerce, clinic, agency, education, marketplace, local_service", "topOffers": ["1-3 most prominent offers, promotions, or value propositions on the page, e.g. Free 14-day trial, 20% off first order, Free consultation"]}',
      'Return ONLY the JSON object. No markdown, no prose.',
      '',
      'CONTENT:',
      text.slice(0, 8000),
    ].join('\n');
  }

  parseLlmResponse(raw: string): BrandIntelligence | null {
    try {
      const cleaned = raw.replace(/```(json)?/gi, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]);
      if (typeof parsed.brandTone !== 'string') return null;
      const ctas = Array.isArray(parsed.primaryCtas)
        ? parsed.primaryCtas.filter((c: unknown) => typeof c === 'string').slice(0, 5)
        : [];
      const confidence = typeof parsed.confidenceScore === 'number'
        ? Math.max(0, Math.min(1, parsed.confidenceScore))
        : 0.5;
      const validGoals = ['book_demo', 'direct_checkout', 'appointment_booking', 'signup', 'contact_sales', 'download', 'product_recommendation', 'quote_request'];
      const primaryGoal = typeof parsed.primaryGoal === 'string' && validGoals.includes(parsed.primaryGoal) ? parsed.primaryGoal : undefined;
      const validTypes = ['saas', 'ecommerce', 'clinic', 'agency', 'education', 'marketplace', 'local_service'];
      const businessType = typeof parsed.businessType === 'string' && validTypes.includes(parsed.businessType) ? parsed.businessType : undefined;
      const topOffers = Array.isArray(parsed.topOffers)
        ? parsed.topOffers.filter((o: unknown) => typeof o === 'string').slice(0, 3)
        : [];
      return { brandTone: parsed.brandTone, primaryCtas: ctas, confidenceScore: confidence, primaryGoal, businessType, topOffers };
    } catch {
      return null;
    }
  }

  async extract(text: string): Promise<BrandIntelligence> {
    if (this.options.llm) {
      try {
        const raw = await this.options.llm(this.buildPrompt(text));
        const parsed = this.parseLlmResponse(raw);
        if (parsed) return parsed;
      } catch {
        // fall back to heuristics on LLM failure
      }
    }
    return this.heuristicExtract(text);
  }

  heuristicExtract(text: string): BrandIntelligence {
    const tone = this.detectTone(text);
    const ctas = this.detectCtas(text);
    let signalCount = 1;
    TONE_SIGNALS.forEach(s => { if (s.keywords.test(text)) signalCount += 1; });
    if (ctas.length > 0) signalCount += Math.min(ctas.length, 3);
    const confidenceScore = Math.min(0.95, 0.55 + signalCount * 0.08);
    const primaryGoal = this.detectPrimaryGoal(ctas);
    const businessType = this.detectBusinessType(text);
    const topOffers = this.detectTopOffers(text);
    return { brandTone: tone, primaryCtas: ctas, confidenceScore, primaryGoal, businessType, topOffers };
  }

  detectTone(text: string): string {
    let best = 'Professional';
    let bestScore = 0;
    for (const signal of TONE_SIGNALS) {
      const matches = text.match(signal.keywords);
      const score = matches ? matches.length : 0;
      if (score > bestScore) {
        bestScore = score;
        best = signal.tone;
      }
    }
    return best;
  }

  detectCtas(text: string): string[] {
    const found = new Set<string>();
    for (const cta of CTA_PATTERNS) {
      cta.pattern.lastIndex = 0;
      if (cta.pattern.test(text)) found.add(cta.label);
    }
    return Array.from(found);
  }

  detectPrimaryGoal(ctas: string[]): string | undefined {
    const ctaStr = ctas.join(' ').toLowerCase();
    if (/\bbuy now\b|\bshop now\b|\border now\b|\badd to cart\b/.test(ctaStr)) return 'direct_checkout';
    if (/\bbook (a )?demo\b|\bschedule (a )?demo\b/.test(ctaStr)) return 'book_demo';
    if (/\bappointment\b|\bschedule\b/.test(ctaStr)) return 'appointment_booking';
    if (/\bsign up\b|\bregister\b|\bcreate.*account\b/.test(ctaStr)) return 'signup';
    if (/\bcontact\b|\bget (in touch|a quote)\b/.test(ctaStr)) return 'contact_sales';
    if (/\bdownload\b/.test(ctaStr)) return 'download';
    return undefined;
  }

  detectBusinessType(text: string): string | undefined {
    const lower = text.toLowerCase();
    if (/\b(saa[sS]|software|platform|dashboard|api|integrat)\b/.test(lower)) return 'saas';
    if (/\b(ecommerce|e-commerce|shop|store|product|cart|checkout)\b/.test(lower)) return 'ecommerce';
    if (/\b(clinic|dental|medical|health|doctor|patient|appointment)\b/.test(lower)) return 'clinic';
    if (/\b(agency|marketing|creative|branding|consulting)\b/.test(lower)) return 'agency';
    if (/\b(course|learn|training|education|tutorial|academy)\b/.test(lower)) return 'education';
    if (/\b(marketplace|vendor|seller|listing)\b/.test(lower)) return 'marketplace';
    if (/\b(plumber|electrician|cleaning|repair|maintenance)\b/.test(lower)) return 'local_service';
    return undefined;
  }

  detectTopOffers(text: string): string[] {
    const offers: string[] = [];
    const patterns = [
      /(\d+%\s*off[^.!?]{0,60})/gi,
      /(free\s+(trial|consultation|demo|shipping|quote|assessment)[^.!?]{0,60})/gi,
      /(save\s+\$?\d+[^.!?]{0,60})/gi,
      /(limited[\s-]time[^.!?]{0,60})/gi,
    ];
    for (const p of patterns) {
      const matches = text.match(p);
      if (matches) {
        for (const m of matches.slice(0, 2)) {
          const clean = m.trim().slice(0, 80);
          if (clean.length > 5 && !offers.includes(clean)) offers.push(clean);
        }
      }
      if (offers.length >= 3) break;
    }
    return offers;
  }
}
