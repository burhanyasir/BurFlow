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
      '{"brandTone": "one of: Professional, Friendly, Casual, Trustworthy, or a short custom tone", "primaryCtas": ["array of 1-5 call-to-action phrases found verbatim or near-verbatim on the page, e.g. Get Started"], "confidenceScore": 0.0-1.0}',
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
      return { brandTone: parsed.brandTone, primaryCtas: ctas, confidenceScore: confidence };
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
    return { brandTone: tone, primaryCtas: ctas, confidenceScore };
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
}
