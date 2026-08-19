import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Copy, FileUp, Link2, Sparkles } from 'lucide-react';
import type { ToolDefinition } from '../../data/toolsData';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';
import { generateFaqsFromText, generateFaqsFromTopic, faqsToMarkdown, extractTopic, type FaqPair } from '../../lib/tools/faq';
import { extractTextFromFile, fetchUrlText } from '../../lib/tools/extract';

interface FaqSourceToolProps {
  tool: ToolDefinition;
  /** Max number of source URLs the tool accepts (1 by default). */
  maxUrls?: number;
  accept?: string;
  urlPlaceholder?: string;
  urlLabel?: string;
  note?: ReactNode;
}

export default function FaqSourceTool({ tool, maxUrls = 1, accept = '*', urlPlaceholder = 'https://example.com/page', urlLabel = 'Source URL', note }: FaqSourceToolProps) {
  const { addToast } = useToast();
  const [urls, setUrls] = useState<string[]>(maxUrls === 1 ? [''] : ['', '']);
  const [sourceText, setSourceText] = useState('');
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [faqs, setFaqs] = useState<FaqPair[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const setUrlAt = (index: number, value: string) => {
    setUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  };

  const generate = (text: string, label: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 20) {
      addToast('That source is too short to generate FAQs from — paste a longer section or use a topic phrase.', 'error');
      return;
    }
    const pairs = generateFaqsFromText(trimmed, count);
    setFaqs(pairs);
    track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'generate_faqs', count, source: label });
    addToast(`Generated ${pairs.length} FAQs`, 'success');
  };

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    const validUrls = urls.map((u) => u.trim()).filter(Boolean);
    const text = sourceText.trim();
    if (validUrls.length === 0 && text.length === 0) {
      addToast('Add a URL, paste text, or upload a file first', 'error');
      return;
    }
    if (text.length > 0) {
      generate(text, 'pasted text');
      return;
    }
    setBusy(true);
    try {
      let combined = '';
      for (const url of validUrls) {
        if (!/^https?:\/\/.+\..+/.test(url)) {
          addToast(`Invalid URL: ${url}`, 'error');
          continue;
        }
        const fetched = await fetchUrlText(url);
        if (fetched) combined += `${fetched}\n\n`;
        else addToast(`Could not fetch ${url} (cross-origin blocked) — using the domain as a topic instead.`, 'error');
      }
      if (combined.trim().length >= 20) {
        generate(combined, validUrls.join(', '));
      } else {
        const topic = extractTopic(validUrls.join(' '));
        const pairs = generateFaqsFromTopic(topic === 'your product' ? 'your product' : topic, count);
        setFaqs(pairs);
        track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'generate_faqs', count, source: 'topic_fallback' });
        addToast(`Used "${topic}" as the topic (the URL was blocked)`, 'success');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file: File) => {
    try {
      const { text } = await extractTextFromFile(file);
      setSourceText(text);
      generate(text, file.name);
      track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'generate_faqs', source: 'file', file_size: file.size });
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Could not read that file', 'error');
    }
  };

  const handleCopy = async () => {
    if (faqs.length === 0) return;
    try {
      await navigator.clipboard.writeText(faqsToMarkdown(faqs));
      track('tool_result_copied', { tool_id: tool.slug, category: tool.category, result: 'faqs' });
      addToast('FAQs copied to clipboard', 'success');
    } catch {
      addToast('Could not copy. Please copy manually.', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      {/* Input */}
      <div>
        <form onSubmit={handleGenerate} className="space-y-5">
          {urls.map((url, i) => (
            <div key={i}>
              <label htmlFor={`faq-url-${i}`} className="text-sm font-semibold text-[var(--color-neutral-900)]">
                {urlLabel} {maxUrls > 1 ? `#${i + 1}` : ''}
              </label>
              <div className="relative mt-2">
                <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-neutral-400)]" aria-hidden="true" />
                <input
                  id={`faq-url-${i}`}
                  type="url"
                  value={url}
                  onChange={(e) => setUrlAt(i, e.target.value)}
                  placeholder={urlPlaceholder}
                  className="w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] py-3 pl-10 pr-4 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
                />
              </div>
            </div>
          ))}
          {maxUrls > 1 && urls.length < maxUrls && (
            <button
              type="button"
              onClick={() => setUrls((prev) => [...prev, ''])}
              className="text-xs font-semibold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)]"
            >
              + Add another URL
            </button>
          )}

          <div>
            <label htmlFor="faq-text" className="text-sm font-semibold text-[var(--color-neutral-900)]">
              Or paste source text
            </label>
            <textarea
              id="faq-text"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Paste the article, documentation, or support content the FAQs should come from…"
              rows={7}
              className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-5 py-3 text-sm font-semibold text-[var(--color-neutral-600)] transition-colors hover:border-[var(--color-accent-600)]/40 hover:text-[var(--color-accent-700)]"
            >
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Upload a file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = '';
              }}
            />
            <div className="flex items-center gap-2">
              <label htmlFor="faq-count" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                {count} FAQs
              </label>
              <input
                id="faq-count"
                type="range"
                min={2}
                max={10}
                step={1}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-32 cursor-pointer"
                style={{ accentColor: 'var(--color-accent-600)' }}
                aria-label="Number of FAQs to generate"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)] disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {busy ? 'Fetching source…' : 'Generate FAQs'}
          </button>
        </form>

        {note ?? (
          <div className="mt-6 rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-4 text-xs leading-relaxed text-[var(--color-neutral-500)]">
            <p>
              Some websites block cross-origin requests from the browser — if a URL can&apos;t be fetched, the
              generator falls back to a topic-based question set. Pasting the source text always works, and never
              leaves your machine.
            </p>
          </div>
        )}
      </div>

      {/* Output */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-neutral-900)]">Generated FAQs</h2>
          <button
            type="button"
            onClick={handleCopy}
            disabled={faqs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-neutral-200)] px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-600)] transition-colors hover:border-[var(--color-accent-600)]/40 hover:text-[var(--color-accent-700)] disabled:opacity-50"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copy FAQs
          </button>
        </div>
        <div className="mt-3 min-h-[18rem] rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-5">
          {faqs.length === 0 ? (
            <p className="text-sm text-[var(--color-neutral-400)]">
              Your FAQ set will appear here. Add a source above and click “Generate FAQs”.
            </p>
          ) : (
            <div className="space-y-5">
              {faqs.map((f, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-[var(--color-neutral-900)]">{f.q}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-neutral-500)]">{f.a}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}