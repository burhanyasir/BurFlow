import { useState, type FormEvent } from 'react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ToolOutputPanel from '../../components/tools/ToolOutputPanel';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';
import { buildRobotsTxt } from '../../lib/tools/sitemap';

const tool = getToolBySlug('sitemap-robots-generator')!;

export default function SitemapRobotsGeneratorPage() {
  const { addToast } = useToast();
  const [userAgents, setUserAgents] = useState('*');
  const [allow, setAllow] = useState('/');
  const [disallow, setDisallow] = useState('');
  const [sitemap, setSitemap] = useState('');
  const [crawlDelay, setCrawlDelay] = useState('');
  const [output, setOutput] = useState('');

  const handleGenerate = (e: FormEvent) => {
    e.preventDefault();
    const agents = userAgents.split(',').map((a) => a.trim()).filter(Boolean);
    const allowList = allow.split(/\r?\n/).map((a) => a.trim()).filter(Boolean);
    const disallowList = disallow.split(/\r?\n/).map((a) => a.trim()).filter(Boolean);
    const sitemaps = sitemap.split(/\r?\n/).map((a) => a.trim()).filter(Boolean);
    if (sitemaps.some((s) => { try { new URL(s); return false; } catch { return true; } })) {
      addToast('Sitemap entries must be valid URLs', 'error');
      return;
    }
    setOutput(buildRobotsTxt({
      userAgents: agents,
      allow: allowList,
      disallow: disallowList,
      sitemapUrls: sitemaps,
      crawlDelay: crawlDelay ? Number(crawlDelay) : undefined,
    }));
    track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'generate_robots' });
    addToast('robots.txt generated', 'success');
  };

  const inputCls = 'w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition';

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Generate a correct robots.txt in seconds — user agents, allow/disallow rules, crawl delay, and sitemap references."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label htmlFor="rg-agents" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                User agents <span className="font-normal text-[var(--color-neutral-400)]">(comma-separated)</span>
              </label>
              <input
                id="rg-agents"
                type="text"
                value={userAgents}
                onChange={(e) => setUserAgents(e.target.value)}
                placeholder="*  or  Googlebot, Bingbot"
                className={`mt-2 ${inputCls}`}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="rg-allow" className="text-sm font-semibold text-[var(--color-neutral-900)]">Allow paths</label>
                <textarea
                  id="rg-allow"
                  value={allow}
                  onChange={(e) => setAllow(e.target.value)}
                  placeholder={'/\n/public'}
                  rows={4}
                  spellCheck={false}
                  className={`mt-2 ${inputCls}`}
                />
              </div>
              <div>
                <label htmlFor="rg-disallow" className="text-sm font-semibold text-[var(--color-neutral-900)]">Disallow paths</label>
                <textarea
                  id="rg-disallow"
                  value={disallow}
                  onChange={(e) => setDisallow(e.target.value)}
                  placeholder={'/admin\n/private'}
                  rows={4}
                  spellCheck={false}
                  className={`mt-2 ${inputCls}`}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="rg-sitemap" className="text-sm font-semibold text-[var(--color-neutral-900)]">Sitemap URLs</label>
                <textarea
                  id="rg-sitemap"
                  value={sitemap}
                  onChange={(e) => setSitemap(e.target.value)}
                  placeholder={'https://example.com/sitemap.xml'}
                  rows={4}
                  spellCheck={false}
                  className={`mt-2 ${inputCls}`}
                />
              </div>
              <div>
                <label htmlFor="rg-delay" className="text-sm font-semibold text-[var(--color-neutral-900)]">Crawl delay (seconds, optional)</label>
                <input
                  id="rg-delay"
                  type="number"
                  min={1}
                  max={60}
                  value={crawlDelay}
                  onChange={(e) => setCrawlDelay(e.target.value)}
                  placeholder="e.g. 10"
                  className={`mt-2 ${inputCls}`}
                />
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]"
            >
              Generate robots.txt
            </button>
          </form>
          <p className="mt-5 text-xs text-[var(--color-neutral-400)]">
            Save the output as <span className="font-semibold">robots.txt</span> in your site root. It applies to
            search engines within 24 hours of publishing.
          </p>
        </div>
        <ToolOutputPanel
          tool={tool}
          title="robots.txt"
          value={output}
          emptyText="Your robots.txt will appear here. Configure the rules and click “Generate robots.txt”."
          resultLabel="robots.txt"
        />
      </div>
    </GenericToolWrapper>
  );
}