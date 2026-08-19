import { useState, type FormEvent } from 'react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ToolOutputPanel from '../../components/tools/ToolOutputPanel';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';
import { analyzeSitemap, parseSitemapXml } from '../../lib/tools/sitemap';

const tool = getToolBySlug('sitemap-frequency-analyzer')!;

export default function SitemapFrequencyAnalyzerPage() {
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
    const freq = Object.entries(a.changefreqCounts).sort((x, y) => y[1] - x[1]);
    const prio = Object.entries(a.priorityCounts).sort((x, y) => y[1] - x[1]);
    const lines = [
      '# Changefreq & priority analysis',
      '',
      `**Total URLs:** ${a.total}`,
      '',
      '## Changefreq distribution',
      ...(freq.length > 0 ? freq.map(([k, v]) => `- ${k}: ${v} (${Math.round((v / a.total) * 100)}%)`) : ['- (none set)']),
      '',
      '## Priority distribution',
      ...(prio.length > 0 ? prio.map(([k, v]) => `- ${k}: ${v} (${Math.round((v / a.total) * 100)}%)`) : ['- (none set)']),
      '',
      '## Recommendations',
      ...a.recommendations.map((r) => `- ${r}`),
    ];
    setOutput(lines.join('\n'));
    track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'analyze_frequency', count: a.total });
    addToast(`Analyzed changefreq and priority of ${a.total} URLs`, 'success');
  };

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Analyze how often your site pages change — see the changefreq and priority distribution across all URLs."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label htmlFor="sfa-xml" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                Sitemap XML
              </label>
              <textarea
                id="sfa-xml"
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
              Analyze frequency
            </button>
          </form>
          <p className="mt-5 text-xs text-[var(--color-neutral-400)]">
            Knowing your real update frequency helps Google crawl smarter — pages that change daily should say{" "}
            <span className="font-semibold">daily</span>, not <span className="font-semibold">yearly</span>.
          </p>
        </div>
        <ToolOutputPanel
          tool={tool}
          title="Frequency analysis"
          value={output}
          emptyText="Your frequency analysis will appear here. Paste a sitemap and click “Analyze frequency”."
          resultLabel="Frequency analysis"
          mono={false}
        />
      </div>
    </GenericToolWrapper>
  );
}