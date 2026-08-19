import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Copy, Sparkles } from 'lucide-react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import { useToast } from '../../components/ui/Toast';

const tool = getToolBySlug('faq-generator')!;

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

function extractTopic(input: string): string {
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

export default function FaqGeneratorPage() {
  const { addToast } = useToast();
  const [input, setInput] = useState('');
  const [count, setCount] = useState(5);
  const [generated, setGenerated] = useState<string[]>([]);

  const topic = useMemo(() => extractTopic(input), [input]);

  const handleGenerate = (e: FormEvent) => {
    e.preventDefault();
    const topicLabel = topic === 'your product' ? 'our product' : topic;
    const faqs = QUESTION_TEMPLATES.slice(0, count).map((q, i) => ({
      q: q(topicLabel),
      a: ANSWER_TEMPLATES[i](topicLabel),
    }));
    setGenerated(faqs.map((f) => `### ${f.q}\n\n${f.a}`));
  };

  const handleCopy = async () => {
    if (generated.length === 0) return;
    try {
      await navigator.clipboard.writeText(generated.join('\n\n'));
      addToast('FAQ copied to clipboard', 'success');
    } catch {
      addToast('Could not copy. Please copy manually.', 'error');
    }
  };

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Turn any topic, text, or website URL into a comprehensive, SEO-ready FAQ — instantly and free."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Input */}
        <div>
          <form onSubmit={handleGenerate} className="space-y-5">
            <div>
              <label htmlFor="faq-topic" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                Topic, text, or website URL
              </label>
              <textarea
                id="faq-topic"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. AI-powered chatbots for SaaS customer support — or paste a paragraph of your content / a webpage URL"
                rows={6}
                className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
              />
            </div>
            <div>
              <label htmlFor="faq-count" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                Number of FAQs
              </label>
              <input
                id="faq-count"
                type="range"
                min={2}
                max={8}
                step={1}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="mt-3 w-full cursor-pointer"
                style={{ accentColor: 'var(--color-accent-600)' }}
                aria-label="Number of FAQs to generate"
              />
              <p className="mt-1.5 text-xs text-[var(--color-neutral-400)]">{count} questions</p>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Generate FAQs
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-4 text-xs leading-relaxed text-[var(--color-neutral-500)]">
            <p>
              Need FAQs generated from your full website, PDFs, or docs at scale?{' '}
              <Link to="/signup" className="font-semibold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)]">
                BurFlow’s AI FAQ generator
              </Link>{' '}
              crawls up to 5 sources and outputs schema-ready FAQs automatically.
            </p>
          </div>
        </div>

        {/* Output */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-neutral-900)]">Generated FAQs</h2>
            {generated.length > 0 && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-neutral-200)] px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-600)] transition-colors hover:border-[var(--color-accent-600)]/40 hover:text-[var(--color-accent-700)]"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copy
              </button>
            )}
          </div>
          <div className="mt-3 min-h-[18rem] rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-5">
            {generated.length === 0 ? (
              <p className="text-sm text-[var(--color-neutral-400)]">
                Your FAQ set will appear here. Enter a topic above and click “Generate FAQs”.
              </p>
            ) : (
              <div className="space-y-5">
                {generated.map((faq) => (
                  <pre key={faq} className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--color-neutral-700)]">
                    {faq}
                  </pre>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </GenericToolWrapper>
  );
}