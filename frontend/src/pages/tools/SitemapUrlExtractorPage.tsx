import { useState, type FormEvent } from 'react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ToolOutputPanel from '../../components/tools/ToolOutputPanel';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';
import { extractUrls, parseSitemapXml } from '../../lib/tools/sitemap';

const tool = getToolBySlug('sitemap-url-extractor')!;

export default function SitemapUrlExtractorPage() {
  const { addToast } = useToast();
  const [xml, setXml] = useState('');
  const [output, setOutput] = useState('');

  const handleExtract = (e: FormEvent) => {
    e.preventDefault();
    if (xml.trim().length === 0) {
      addToast('Paste a sitemap XML first', 'error');
      return;
    }
    const parsed = parseSitemapXml(xml);
    if (parsed.error) {
      addToast(parsed.error, 'error');
      return;
    }
    const urls = extractUrls(xml);
    setOutput(urls.join('\n'));
    track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'extract_urls', count: urls.length });
    addToast(`Extracted ${urls.length} URLs`, 'success');
  };

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Extract every URL from any sitemap.xml — paste the file content and get a clean list in seconds."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <form onSubmit={handleExtract} className="space-y-4">
            <div>
              <label htmlFor="sue-xml" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                Sitemap XML
              </label>
              <textarea
                id="sue-xml"
                value={xml}
                onChange={(e) => setXml(e.target.value)}
                placeholder={'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://example.com/</loc></url>\n  …'}
                rows={12}
                spellCheck={false}
                className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 font-mono text-xs leading-relaxed text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]"
            >
              Extract URLs
            </button>
          </form>
          <p className="mt-5 text-xs text-[var(--color-neutral-400)]">
            Works with both URL sitemaps and sitemap index files (child sitemap locations are listed).
          </p>
        </div>
        <ToolOutputPanel
          tool={tool}
          title="Extracted URLs"
          value={output}
          emptyText="The extracted URL list will appear here. Paste a sitemap and click “Extract URLs”."
          resultLabel="URL list"
        />
      </div>
    </GenericToolWrapper>
  );
}