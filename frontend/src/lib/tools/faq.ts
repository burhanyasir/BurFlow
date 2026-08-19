import { extractBodyText } from './extract';

export interface FaqPair {
  q: string;
  a: string;
}

const QUESTION_TEMPLATES = [
  (topic: string) => `What is ${topic}?`,
  (topic: string) => `How does ${topic} work?`,
  (topic: string) => `What are the key benefits of ${topic}?`,
  (topic: string) => `How much does ${topic} cost?`,
  (topic: string) => `Is ${topic} right for my business?`,
  (topic: string) => `How long does it take to set up ${topic}?`,
  (topic: string) => `What problems does ${topic} solve?`,
  (topic: string) => `Do I need any technical skills to use ${topic}?`,
];

const ANSWER_TEMPLATES = [
  (topic: string) => `${topic} is a focused solution designed to help teams achieve measurable results quickly — without adding complexity to your existing stack.`,
  (topic: string) => `${topic} works by combining proven best practices with automation: it takes your input, applies structured logic, and produces consistent, high-quality output every time.`,
  (topic: string) => `The main benefits of ${topic} are faster execution, lower operational cost, consistent quality, and outcomes your team can measure and scale.`,
  (topic: string) => `Pricing for ${topic} depends on your usage level. Start free, then scale with a plan that matches your volume — no credit card required to begin.`,
  (topic: string) => `${topic} fits most teams, but it delivers the most value when you have repetitive workflows that need to happen faster and with fewer errors.`,
  (topic: string) => `Setup takes minutes: connect your data or content, configure a few preferences, and ${topic} is ready to go — no engineering team required.`,
  (topic: string) => `${topic} solves the classic problems of slow manual processes, inconsistent output, and hard-to-scale operations.`,
  (topic: string) => `No. ${topic} is designed for non-technical users, with a guided setup and clear defaults that you can customize as you grow.`,
];

export function extractTopic(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) return 'your product';
  const urlMatch = trimmed.match(/^https?:\/\/([^/]+)/i);
  if (urlMatch) {
    return urlMatch[1].replace(/^www\./, '').replace(/\.(com|io|ai|co|net|org|app|dev)$/i, '');
  }
  const words = trimmed.split(/\s+/).filter((w) => w.length > 3);
  const candidate = words.slice(0, 4).join(' ');
  return candidate.length > 0 ? candidate.toLowerCase() : trimmed.slice(0, 40).toLowerCase();
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Derives questions from real content sentences, then drafts answers from the sentence itself. */
export function generateFaqsFromText(text: string, count: number): FaqPair[] {
  const sentences = splitSentences(text);
  const candidates = sentences.filter((s) => /^(what|how|why|when|where|who|which|can|do|does|is|are|should|will|would|are there|what are)/i.test(s));
  const picked = (candidates.length >= 2 ? candidates : sentences.filter((s) => s.length > 40 && s.length < 200)).slice(0, count);
  if (picked.length === 0) {
    const topic = extractTopic(text);
    return QUESTION_TEMPLATES.slice(0, count).map((q, i) => ({ q: q(topic), a: ANSWER_TEMPLATES[i](topic) }));
  }
  return picked.map((sentence) => {
    const clean = sentence.replace(/[.!?]+$/, '');
    const lower = clean.toLowerCase();
    let q: string;
    if (/^(what is|what are)/i.test(clean)) q = clean.replace(/^(what is|what are)\s+/i, (m) => m[0].toUpperCase() + m.slice(1));
    else if (/^(how|why|when|where|who|which|can|do|does|is|are|should|will|would)\b/i.test(clean)) q = clean[0].toUpperCase() + clean.slice(1);
    else q = `What is "${clean.slice(0, 60)}"?`;
    const words = lower.split(/\s+/).filter((w) => w.length > 3);
    const answer = clean.length > 120 ? `${clean.slice(0, 117).trim()}…` : clean;
    return {
      q: q.endsWith('?') ? q : `${q}?`,
      a: `Based on the source content: ${answer}${words.length > 0 ? '' : ''}`,
    };
  });
}

export function generateFaqsFromTopic(topic: string, count: number): FaqPair[] {
  const label = topic === 'your product' ? 'our product' : topic;
  return QUESTION_TEMPLATES.slice(0, count).map((q, i) => ({ q: q(label), a: ANSWER_TEMPLATES[i](label) }));
}

export function faqsToMarkdown(faqs: FaqPair[]): string {
  return faqs.map((f) => `### ${f.q}\n\n${f.a}`).join('\n\n');
}

/** Converts a fetched HTML page body into usable FAQ source text. */
export function htmlToFaqSource(html: string): string {
  return extractBodyText(html);
}