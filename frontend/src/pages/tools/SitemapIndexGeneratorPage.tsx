import { useState, type FormEvent } from 'react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ToolOutputPanel from '../../components/tools/ToolOutputPanel';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';
import { buildSitemapIndex } from '../../lib/tools/sitemap';

const tool = getToolBySlug('sitemap-index-generator')!;

const SAMPLE = `https://example.com/sitemap-pages.xml
https://example.com/sitemap-blog.xml
https://example.com/sitemap-products.xml`;

export default function SitemapIndexGeneratorPage() {
  const { addToast } = useToast();
  const [urls, setUrls] = useState('');
  const [output, setOutput] = useState('');

  const handleGenerate = (e: FormEvent) => {
    e.preventDefault();
    const list = urls.split(/\r?\n/).map((u) => u.trim()).filter(Boolean);
    if (list.length === 0) {
      addToast('Add at least one sitemap URL', 'error');
      return;
    }
    const invalid = list.filter((u) => {
      try { new URL(u); return false; } catch { return true; }
    });
    if (invalid.length > 0) {
      addToast(`Invalid URL(s): ${invalid.slice(0, 2).join(', ')}${invalid.length > 2 ? '…' : ''}`, 'error');
      return;
    }
    setOutput(buildSitemapIndex(list));
    track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'generate_index', count: list.length });
    addToast(`Generated sitemap index with ${list.length} entries`, 'success');
  };

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Generate a sitemap index file that references all your individual sitemaps — the standard for large sites."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="sig-urls" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                  Sitemap URLs (one per line)
                </label>
                <button
                  type="button"
                  onClick={() => setUrls(SAMPLE)}
                  className="text-xs font-semibold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)]"
                >
                  Load sample
                </button>
              </div>
              <textarea
                id="sig-urls"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder={'https://example.com/sitemap-pages.xml\nhttps://example.com/sitemap-blog.xml'}
                rows={8}
                spellCheck={false}
                className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 font-mono text-xs leading-relaxed text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]"
            >
              Generate index
            </button>
          </form>
          <p className="mt-5 text-xs text-[var(--color-neutral-400)]">
            The index gets today&apos;s date as <span className="font-semibold">lastmod</span>. Submit only the index
            file to Google Search Console.
          </p>
        </div>
        <ToolOutputPanel
          tool={tool}
          title="sitemap_index.xml"
          value={output}
          emptyText="Your sitemap index will appear here. Add sitemap URLs above and click “Generate index”."
          resultLabel="Sitemap index"
        />
      </div>
    </GenericToolWrapper>
  );
}