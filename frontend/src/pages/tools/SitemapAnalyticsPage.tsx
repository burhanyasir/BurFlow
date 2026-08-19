import { useState, type FormEvent } from 'react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ToolOutputPanel from '../../components/tools/ToolOutputPanel';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';
import { analyzeSitemap, parseSitemapXml } from '../../lib/tools/sitemap';

const tool = getToolBySlug('sitemap-analytics')!;

export default function SitemapAnalyticsPage() {
  const { addToast } = useToast();
  const [xml, setXml] = useState('');
  const [output, setOutput] = useState('');

  const handleAnalyze = (e: FormEvent) => {
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
    const a = analyzeSitemap(xml);
    const fmt = (rec: Record<string, number>) => Object.entries(rec).sort((x, y) => y[1] - x[1]).map(([k, v]) => `- ${k}: ${v}`).join('\n') || '- (none)';
    const lines = [
      `# Sitemap analytics`,
      '',
      `**Total URLs:** ${a.total}`,
      '',
      '## URLs by extension',
      fmt(a.byExtension),
      '',
      '## URLs by URL depth',
      fmt(a.byDepth),
      '',
      '## Changefreq distribution',
      fmt(a.changefreqCounts),
      '',
      '## Priority distribution',
      fmt(a.priorityCounts),
      '',
      '## Recommendations',
      ...a.recommendations.map((r) => `- ${r}`),
    ];
    setOutput(lines.join('\n'));
    track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'analyze_sitemap', count: a.total });
    addToast(`Analyzed ${a.total} URLs`, 'success');
  };

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Get deep analytics on any sitemap — URL depth, file types, changefreq, priorities, and SEO recommendations."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label htmlFor="sa-xml" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                Sitemap XML
              </label>
              <textarea
                id="sa-xml"
                value={xml}
                onChange={(e) => setXml(e.target.value)}
                placeholder="Paste sitemap XML…"
                rows={12}
                spellCheck={false}
                className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 font-mono text-xs leading-relaxed text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]"
            >
              Analyze sitemap
            </button>
          </form>
          <p className="mt-5 text-xs text-[var(--color-neutral-400)]">
            All analysis runs locally in your browser — paste any sitemap, no sign-up needed.
          </p>
        </div>
        <ToolOutputPanel
          tool={tool}
          title="Analytics report"
          value={output}
          emptyText="Your analytics report will appear here. Paste a sitemap and click “Analyze sitemap”."
          resultLabel="Analytics report"
          mono={false}
        />
      </div>
    </GenericToolWrapper>
  );
}