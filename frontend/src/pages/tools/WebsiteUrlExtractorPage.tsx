import { useState, type FormEvent } from 'react';
import { Globe, ScanSearch } from 'lucide-react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ToolOutputPanel from '../../components/tools/ToolOutputPanel';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';
import { demoCrawl } from '../../lib/tools/sitemap';
import { extractBodyText, fetchUrlText } from '../../lib/tools/extract';

const tool = getToolBySlug('website-url-extractor')!;

export default function WebsiteUrlExtractorPage() {
  const { addToast } = useToast();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState('');

  const handleExtract = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!/^https?:\/\/.+\..+/.test(trimmed)) {
      addToast('Please enter a valid website URL starting with http:// or https://', 'error');
      return;
    }
    const origin = trimmed.replace(/\/+$/, '');
    setBusy(true);
    try {
      const fetched = await fetchUrlText(origin);
      const urls = new Set<string>();
      let demo = false;
      if (fetched) {
        const html = extractBodyText(fetched);
        const linkRe = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
        const match = html.matchAll(linkRe);
        let m = match.next();
        while (!m.done) {
          const href = m.value[1];
          try {
            const abs = new URL(href, origin);
            if (abs.origin === new URL(origin).origin) urls.add(abs.pathname === '/' ? origin + '/' : abs.href);
          } catch { /* skip invalid */ }
          m = match.next();
        }
      }
      const list = Array.from(urls);
      if (list.length === 0) {
        demo = true;
        list.push(...demoCrawl(origin));
      }
      setOutput(`${demo ? 'Demo crawl — the site blocked browser fetching, showing typical URLs instead.\n\n' : `Found ${list.length} internal links on the homepage:\n\n`}${list.map((u) => `- ${u}`).join('\n')}`);
      track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'extract_website_urls', count: list.length, demo });
      addToast(demo ? 'Showing demo URLs (site blocked fetching)' : `Extracted ${list.length} URLs`, demo ? 'error' : 'success');
    } finally {
      setBusy(false);
    }
  };

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Extract all internal URLs from a website's homepage — great for building a sitemap or auditing a site."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <form onSubmit={handleExtract} className="space-y-5">
            <div>
              <label htmlFor="wue-url" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                Website URL
              </label>
              <div className="relative mt-2">
                <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-neutral-400)]" aria-hidden="true" />
                <input
                  id="wue-url"
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
              <ScanSearch className="h-4 w-4" aria-hidden="true" />
              {busy ? 'Scanning homepage…' : 'Extract URLs'}
            </button>
          </form>
          <p className="mt-5 text-xs text-[var(--color-neutral-400)]">
            Extracts internal links from the homepage directly in your browser. Sites that block cross-origin
            requests fall back to a demo crawl — for full site-wide crawling with AI cleanup,{' '}
            <a href="/signup" className="font-semibold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)]">try BurFlow Free</a>.
          </p>
        </div>
        <ToolOutputPanel
          tool={tool}
          title="Extracted URLs"
          value={output}
          emptyText="The extracted URL list will appear here. Enter a website above and click “Extract URLs”."
          resultLabel="URL list"
        />
      </div>
    </GenericToolWrapper>
  );
}