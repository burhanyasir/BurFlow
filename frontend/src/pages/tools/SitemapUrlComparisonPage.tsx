import { useState, type FormEvent } from 'react';
import { GitCompareArrows } from 'lucide-react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ToolOutputPanel from '../../components/tools/ToolOutputPanel';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';
import { compareSitemaps, parseSitemapXml } from '../../lib/tools/sitemap';

const tool = getToolBySlug('sitemap-url-comparison')!;

export default function SitemapUrlComparisonPage() {
  const { addToast } = useToast();
  const [xmlA, setXmlA] = useState('');
  const [xmlB, setXmlB] = useState('');
  const [output, setOutput] = useState('');

  const handleCompare = (e: FormEvent) => {
    e.preventDefault();
    const a = parseSitemapXml(xmlA);
    const b = parseSitemapXml(xmlB);
    if (a.error || b.error) {
      addToast(a.error ?? b.error ?? 'Both sitemaps must be valid XML', 'error');
      return;
    }
    const diff = compareSitemaps(xmlA, xmlB);
    const lines = [
      `Comparison: ${a.entries.length} URLs (A) vs ${b.entries.length} URLs (B)`,
      '',
      `Added in B (${diff.added.length})`,
      ...(diff.added.length > 0 ? diff.added.map((u) => `+ ${u}`) : ['- (none)']),
      '',
      `Removed from B (${diff.removed.length})`,
      ...(diff.removed.length > 0 ? diff.removed.map((u) => `- ${u}`) : ['- (none)']),
      '',
      `Unchanged (${diff.unchanged.length})`,
    ];
    setOutput(lines.join('\n'));
    track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'compare_sitemaps', added: diff.added.length, removed: diff.removed.length });
    addToast(`Compared: +${diff.added.length} added, -${diff.removed.length} removed`, 'success');
  };

  const textarea = (id: string, value: string, set: (v: string) => void) => (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-[var(--color-neutral-900)]">
        {id === 'sc-a' ? 'Sitemap A (current)' : 'Sitemap B (new)'}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder="Paste sitemap XML…"
        rows={10}
        spellCheck={false}
        className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 font-mono text-xs leading-relaxed text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
      />
    </div>
  );

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Compare two sitemaps and see exactly which URLs were added, removed, or unchanged."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <form onSubmit={handleCompare} className="space-y-4">
            {textarea('sc-a', xmlA, setXmlA)}
            {textarea('sc-b', xmlB, setXmlB)}
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]"
            >
              <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
              Compare sitemaps
            </button>
          </form>
          <p className="mt-5 text-xs text-[var(--color-neutral-400)]">
            Perfect for tracking content changes after a site migration or CMS switch.
          </p>
        </div>
        <ToolOutputPanel
          tool={tool}
          title="Comparison result"
          value={output}
          emptyText="The comparison will appear here. Paste two sitemaps and click “Compare sitemaps”."
          resultLabel="Comparison"
        />
      </div>
    </GenericToolWrapper>
  );
}