import { useState, type FormEvent } from 'react';
import { Globe, Search } from 'lucide-react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ToolOutputPanel from '../../components/tools/ToolOutputPanel';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';
import { findSitemap, sitemapCandidates } from '../../lib/tools/sitemap';

const tool = getToolBySlug('sitemap-finder')!;

export default function SitemapFinderPage() {
  const { addToast } = useToast();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState('');

  const handleFind = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!/^https?:\/\/.+\..+/.test(trimmed)) {
      addToast('Please enter a valid website URL starting with http:// or https://', 'error');
      return;
    }
    const origin = trimmed.replace(/\/+$/, '');
    setBusy(true);
    try {
      const results = await findSitemap(origin);
      const found = results.filter((r) => r.status === 'found');
      const lines = found.length > 0
        ? [`Sitemap found for ${origin}\n`, ...found.map((r) => `- ${r.url}`)]
        : [`No sitemap found for ${origin} at the usual locations:\n`, ...sitemapCandidates(origin).map((c) => `- ${c}`)];
      setOutput(lines.join('\n'));
      track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'find_sitemap', found: found.length });
      addToast(found.length > 0 ? `Found ${found.length} sitemap${found.length > 1 ? 's' : ''}` : 'No sitemap found at the usual locations', found.length > 0 ? 'success' : 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Find the sitemap of any website — checks the 7 most common sitemap locations automatically."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <form onSubmit={handleFind} className="space-y-5">
            <div>
              <label htmlFor="sf-url" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                Website URL
              </label>
              <div className="relative mt-2">
                <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-neutral-400)]" aria-hidden="true" />
                <input
                  id="sf-url"
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
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)] disabled:opacity-60"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              {busy ? 'Checking locations…' : 'Find sitemap'}
            </button>
          </form>
          <p className="mt-5 text-xs text-[var(--color-neutral-400)]">
            Checks <span className="font-semibold">/sitemap.xml</span>, <span className="font-semibold">/sitemap_index.xml</span>,
            <span className="font-semibold"> /sitemap1.xml</span>, <span className="font-semibold">/wp-sitemap.xml</span> and 3 more.
            Sites that block cross-origin requests will show as not found.
          </p>
        </div>
        <ToolOutputPanel
          tool={tool}
          title="Sitemap locations"
          value={output}
          emptyText="Found sitemap URLs will appear here. Enter a website above and click “Find sitemap”."
          resultLabel="Sitemap locations"
        />
      </div>
    </GenericToolWrapper>
  );
}