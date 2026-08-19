import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Copy, Globe, Wand2 } from 'lucide-react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';

const tool = getToolBySlug('webpage-to-markdown')!;

function buildSampleMarkdown(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    return `# ${host}${path || ' — Homepage'}

> Converted with BurFlow Webpage to Markdown — demo output. Full conversion preserves images, links, and tables.

## Introduction

This is a demo conversion of ${url}.

When you convert a real webpage, the main content is extracted here — headings, paragraphs, lists, and links — with boilerplate (navigation, footers, cookie banners) removed.

## Key sections

- [About us](${url}/about)
- [Features](${url}/features)
- [Pricing](${url}/pricing)
- [Contact](${url}/contact)

## Why convert to Markdown?

| Use case | Benefit |
| --- | --- |
| Documentation | Version-controlled, diff-friendly docs |
| Knowledge bases | LLM-ready content for AI assistants |
| Migration | Portable content for any site platform |
| Archiving | Clean, durable plain-text records |

> **Note:** Some sites block cross-origin requests. For full site-wide conversion with AI cleanup, [try BurFlow Free](/signup).
`;
  } catch {
    return `# Untitled

> Enter a valid URL (e.g. https://example.com) to see a demo conversion.`;
  }
}

export default function WebpageToMarkdownPage() {
  const { addToast } = useToast();
  const [url, setUrl] = useState('');
  const [output, setOutput] = useState('');

  const handleConvert = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!/^https?:\/\/.+\..+/.test(trimmed)) {
      addToast('Please enter a valid URL starting with http:// or https://', 'error');
      return;
    }
    track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'convert_webpage', url: trimmed });
    setOutput(buildSampleMarkdown(trimmed));
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      track('tool_result_copied', { tool_id: tool.slug, category: tool.category, result: 'markdown' });
      addToast('Markdown copied to clipboard', 'success');
    } catch {
      addToast('Could not copy. Please copy manually.', 'error');
    }
  };

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Enter any webpage URL and convert it to clean, structured Markdown — perfect for documentation, content migration, and archiving."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Input */}
        <div>
          <form onSubmit={handleConvert} className="space-y-5">
            <div>
              <label htmlFor="md-url" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                Webpage URL
              </label>
              <div className="relative mt-2">
                <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-neutral-400)]" aria-hidden="true" />
                <input
                  id="md-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] py-3 pl-10 pr-4 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
                />
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]"
            >
              <Wand2 className="h-4 w-4" aria-hidden="true" />
              Convert to Markdown
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-4 text-xs leading-relaxed text-[var(--color-neutral-500)]">
            <p>
              This is an instant demo conversion generated in your browser. For full site-wide extraction
              with AI cleanup — including Notion, Google Docs, PDF, and DOCX —{' '}
              <Link
                to="/signup"
                onClick={() => track('tool_cta_click', { tool_id: tool.slug, location: 'sidebar_note' })}
                className="font-semibold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)]"
              >
                try BurFlow Free
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Output */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-neutral-900)]">Markdown output</h2>
            {output && (
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
            {output ? (
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--color-neutral-700)]">{output}</pre>
            ) : (
              <p className="text-sm text-[var(--color-neutral-400)]">
                Your Markdown will appear here. Enter a URL above and click “Convert to Markdown”.
              </p>
            )}
          </div>
        </div>
      </div>
    </GenericToolWrapper>
  );
}