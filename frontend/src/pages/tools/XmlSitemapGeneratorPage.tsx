import { useState, type FormEvent } from 'react';
import { FileUp, Sparkles } from 'lucide-react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ToolOutputPanel from '../../components/tools/ToolOutputPanel';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';
import { buildSitemapFromUrls } from '../../lib/tools/sitemap';

const tool = getToolBySlug('xml-sitemap-generator')!;

const SAMPLE_URLS = `https://example.com/
https://example.com/about
https://example.com/features
https://example.com/pricing
https://example.com/blog`;

export default function XmlSitemapGeneratorPage() {
  const { addToast } = useToast();
  const [urls, setUrls] = useState('');
  const [changefreq, setChangefreq] = useState('weekly');
  const [priority, setPriority] = useState('0.8');
  const [lastmod, setLastmod] = useState('');
  const [output, setOutput] = useState('');

  const handleGenerate = (e: FormEvent) => {
    e.preventDefault();
    const list = urls.split(/\r?\n/).map((u) => u.trim()).filter(Boolean);
    if (list.length === 0) {
      addToast('Add at least one URL', 'error');
      return;
    }
    const invalid = list.filter((u) => {
      try { new URL(u); return false; } catch { return true; }
    });
    if (invalid.length > 0) {
      addToast(`Invalid URL(s): ${invalid.slice(0, 2).join(', ')}${invalid.length > 2 ? '…' : ''}`, 'error');
      return;
    }
    setOutput(buildSitemapFromUrls(list, { changefreq, priority, lastmod: lastmod || undefined }));
    track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'generate_sitemap', count: list.length });
    addToast(`Generated sitemap with ${list.length} URLs`, 'success');
  };

  const inputCls = 'w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition';

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Generate a valid XML sitemap from your URLs in seconds — ready to submit to Google Search Console."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <form onSubmit={handleGenerate} className="space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="xsg-urls" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                  Your URLs (one per line)
                </label>
                <button
                  type="button"
                  onClick={() => setUrls(SAMPLE_URLS)}
                  className="text-xs font-semibold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)]"
                >
                  Load sample
                </button>
              </div>
              <textarea
                id="xsg-urls"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder={'https://example.com/\nhttps://example.com/about'}
                rows={8}
                spellCheck={false}
                className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 font-mono text-xs leading-relaxed text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="xsg-cf" className="text-sm font-semibold text-[var(--color-neutral-900)]">Change frequency</label>
                <select
                  id="xsg-cf"
                  value={changefreq}
                  onChange={(e) => setChangefreq(e.target.value)}
                  className={`mt-2 ${inputCls}`}
                >
                  {['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="xsg-pr" className="text-sm font-semibold text-[var(--color-neutral-900)]">Priority</label>
                <select
                  id="xsg-pr"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className={`mt-2 ${inputCls}`}
                >
                  {['1.0', '0.9', '0.8', '0.7', '0.6', '0.5', '0.4', '0.3', '0.2', '0.1'].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="xsg-lm" className="text-sm font-semibold text-[var(--color-neutral-900)]">Last modified</label>
                <input
                  id="xsg-lm"
                  type="date"
                  value={lastmod}
                  onChange={(e) => setLastmod(e.target.value)}
                  className={`mt-2 ${inputCls}`}
                />
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Generate sitemap
            </button>
          </form>
          <p className="mt-5 text-xs text-[var(--color-neutral-400)]">
            <FileUp className="mr-1 inline h-3 w-3" aria-hidden="true" />
            Save the output as <span className="font-semibold">sitemap.xml</span> and upload it to your site root, then submit it in Google Search Console.
          </p>
        </div>
        <ToolOutputPanel
          tool={tool}
          title="Generated sitemap.xml"
          value={output}
          emptyText="Your sitemap.xml will appear here. Add URLs above and click “Generate sitemap”."
          resultLabel="Sitemap XML"
        />
      </div>
    </GenericToolWrapper>
  );
}