import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Globe, Wand2 } from 'lucide-react';
import type { ToolDefinition } from '../../data/toolsData';
import { track } from '../../lib/analytics';
import { useToast } from '../ui/Toast';
import { textToMarkdown } from '../../lib/tools/markdown';
import { fetchUrlText } from '../../lib/tools/extract';

interface UrlToMarkdownToolProps {
  tool: ToolDefinition;
  placeholder: string;
  urlLabel: string;
  note: ReactNode;
  buildDemo: (url: string) => string;
}

export default function UrlToMarkdownTool({ tool, placeholder, urlLabel, note, buildDemo }: UrlToMarkdownToolProps) {
  const { addToast } = useToast();
  const [url, setUrl] = useState('');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);

  const handleConvert = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!/^https?:\/\/.+\..+/.test(trimmed)) {
      addToast('Please enter a valid URL starting with http:// or https://', 'error');
      return;
    }
    track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'convert_url', url: trimmed });
    setBusy(true);
    try {
      const fetched = await fetchUrlText(trimmed);
      if (fetched) {
        setOutput(textToMarkdown(fetched.trim()));
        setLive(true);
        addToast('Converted the live page content', 'success');
      } else {
        setOutput(buildDemo(trimmed));
        setLive(false);
        addToast('Could not fetch the page (cross-origin blocked) — showing a demo conversion', 'error');
      }
    } finally {
      setBusy(false);
    }
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
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      {/* Input */}
      <div>
        <form onSubmit={handleConvert} className="space-y-5">
          <div>
            <label htmlFor="url-md-source" className="text-sm font-semibold text-[var(--color-neutral-900)]">
              {urlLabel}
            </label>
            <div className="relative mt-2">
              <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-neutral-400)]" aria-hidden="true" />
              <input
                id="url-md-source"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] py-3 pl-10 pr-4 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
              />
            </div>
            <p className="mt-1.5 text-xs text-[var(--color-neutral-400)]">
              The page must be publicly shareable (Notion: “Share → Anyone with the link”; Docs: “Anyone with the link can view”).
            </p>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)] disabled:opacity-60"
          >
            <Wand2 className="h-4 w-4" aria-hidden="true" />
            {busy ? 'Fetching page…' : 'Convert to Markdown'}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-4 text-xs leading-relaxed text-[var(--color-neutral-500)]">
          {note}
          <p className="mt-2">
            For full site-wide extraction with AI cleanup — including every page, PDF, and DOCX —{' '}
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
            <>
              {!live && (
                <p className="mb-3 rounded-lg border border-[var(--color-warning-600)]/30 bg-[var(--color-warning-600)]/10 px-3 py-2 text-xs font-semibold text-[var(--color-warning-600)]">
                  Demo conversion — the site blocked browser fetching. Paste the page content instead, or use BurFlow
                  Free for full extraction.
                </p>
              )}
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--color-neutral-700)]">{output}</pre>
            </>
          ) : (
            <p className="text-sm text-[var(--color-neutral-400)]">
              Your Markdown will appear here. Enter a {urlLabel.toLowerCase()} above and click “Convert to Markdown”.
            </p>
          )}
        </div>
        <p className="mt-2 text-xs text-[var(--color-neutral-400)]">
          {output.length.toLocaleString()} characters · {output.length > 0 ? output.split('\n').length : 0} lines
        </p>
      </div>
    </div>
  );
}