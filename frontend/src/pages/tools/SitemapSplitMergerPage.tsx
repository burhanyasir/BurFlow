import { useState, type FormEvent } from 'react';
import { Scissors, Combine } from 'lucide-react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ToolOutputPanel from '../../components/tools/ToolOutputPanel';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';
import { mergeSitemaps, parseSitemapXml, splitSitemap } from '../../lib/tools/sitemap';

const tool = getToolBySlug('sitemap-split-merger')!;

export default function SitemapSplitMergerPage() {
  const { addToast } = useToast();
  const [mode, setMode] = useState<'split' | 'merge'>('split');
  const [xml, setXml] = useState('');
  const [chunkSize, setChunkSize] = useState(500);
  const [output, setOutput] = useState('');

  const handleRun = (e: FormEvent) => {
    e.preventDefault();
    if (xml.trim().length === 0) {
      addToast('Paste sitemap XML first', 'error');
      return;
    }
    const parsed = parseSitemapXml(xml);
    if (parsed.error) {
      addToast(parsed.error, 'error');
      return;
    }
    if (mode === 'split') {
      const chunks = splitSitemap(xml, chunkSize);
      setOutput(chunks.map((c) => `### ${c.name} (${c.content.match(/<loc>/g)?.length ?? 0} URLs)\n\n${c.content}`).join('\n\n'));
      track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'split_sitemap', chunks: chunks.length });
      addToast(`Split into ${chunks.length} sitemap file${chunks.length > 1 ? 's' : ''}`, 'success');
    } else {
      const merged = mergeSitemaps([xml]);
      setOutput(merged);
      track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'merge_sitemap' });
      addToast(`Merged into one sitemap with ${parsed.entries.length} URLs`, 'success');
    }
  };

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Split a large sitemap into smaller chunks (under the 50,000 URL limit) or merge sitemaps into one."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <form onSubmit={handleRun} className="space-y-4">
            <div className="flex gap-1 rounded-xl border border-[var(--color-neutral-200)] p-1" role="tablist" aria-label="Split or merge">
              {(['split', 'merge'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${mode === m ? 'bg-[var(--color-accent-600)] text-white' : 'text-[var(--color-neutral-600)] hover:text-[var(--color-accent-700)]'}`}
                >
                  {m === 'split' ? <Scissors className="mr-1.5 inline h-4 w-4" aria-hidden="true" /> : <Combine className="mr-1.5 inline h-4 w-4" aria-hidden="true" />}
                  {m === 'split' ? 'Split' : 'Merge'}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="ssm-xml" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                Sitemap XML
              </label>
              <textarea
                id="ssm-xml"
                value={xml}
                onChange={(e) => setXml(e.target.value)}
                placeholder="Paste sitemap XML…"
                rows={10}
                spellCheck={false}
                className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 font-mono text-xs leading-relaxed text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
              />
            </div>

            {mode === 'split' && (
              <div>
                <label htmlFor="ssm-chunk" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                  URLs per chunk: {chunkSize}
                </label>
                <input
                  id="ssm-chunk"
                  type="range"
                  min={100}
                  max={5000}
                  step={100}
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                  className="mt-3 w-full cursor-pointer"
                  style={{ accentColor: 'var(--color-accent-600)' }}
                  aria-label="URLs per chunk"
                />
              </div>
            )}

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]"
            >
              {mode === 'split' ? 'Split sitemap' : 'Merge sitemap'}
            </button>
          </form>
          <p className="mt-5 text-xs text-[var(--color-neutral-400)]">
            In split mode, each chunk is written as a separate file with the original lastmod and priority preserved.
          </p>
        </div>
        <ToolOutputPanel
          tool={tool}
          title="Result"
          value={output}
          emptyText={`Your ${mode === 'split' ? 'split chunks' : 'merged sitemap'} will appear here.`}
          resultLabel="Sitemap result"
        />
      </div>
    </GenericToolWrapper>
  );
}