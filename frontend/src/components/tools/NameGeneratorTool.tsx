import { useState, type FormEvent } from 'react';
import { Copy, RefreshCw, Sparkles } from 'lucide-react';
import type { ToolDefinition } from '../../data/toolsData';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';
import { generateNames } from '../../lib/tools/names';

interface NameGeneratorToolProps {
  tool: ToolDefinition;
  kind: 'chatbot' | 'brand';
  seedLabel: string;
  seedPlaceholder: string;
  resultLabel: string;
}

export default function NameGeneratorTool({ tool, kind, seedLabel, seedPlaceholder, resultLabel }: NameGeneratorToolProps) {
  const { addToast } = useToast();
  const [seed, setSeed] = useState('');
  const [count, setCount] = useState(12);
  const [names, setNames] = useState<string[]>([]);

  const generate = () => {
    const list = generateNames(seed, kind, count);
    setNames(list);
    track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'generate_names', count: list.length, seed: seed || 'none' });
  };

  const handleGenerate = (e: FormEvent) => {
    e.preventDefault();
    generate();
    addToast(`Generated ${names.length || count} names`, 'success');
  };

  const handleCopy = async () => {
    if (names.length === 0) return;
    try {
      await navigator.clipboard.writeText(names.join('\n'));
      track('tool_result_copied', { tool_id: tool.slug, category: tool.category, result: 'names' });
      addToast('Names copied to clipboard', 'success');
    } catch {
      addToast('Could not copy. Please copy manually.', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      {/* Inputs */}
      <div>
        <form onSubmit={handleGenerate} className="space-y-5">
          <div>
            <label htmlFor="name-seed" className="text-sm font-semibold text-[var(--color-neutral-900)]">
              {seedLabel}
            </label>
            <input
              id="name-seed"
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder={seedPlaceholder}
              className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
            />
            <p className="mt-1.5 text-xs text-[var(--color-neutral-400)]">Optional — a seed word makes the suggestions more relevant.</p>
          </div>
          <div>
            <label htmlFor="name-count" className="text-sm font-semibold text-[var(--color-neutral-900)]">
              Number of names: {count}
            </label>
            <input
              id="name-count"
              type="range"
              min={4}
              max={24}
              step={2}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-3 w-full cursor-pointer"
              style={{ accentColor: 'var(--color-accent-600)' }}
              aria-label="Number of names to generate"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Generate names
            </button>
            {names.length > 0 && (
              <button
                type="button"
                onClick={generate}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-5 py-3 text-sm font-semibold text-[var(--color-neutral-600)] transition-colors hover:border-[var(--color-accent-600)]/40 hover:text-[var(--color-accent-700)]"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Shuffle
              </button>
            )}
          </div>
        </form>
        <p className="mt-5 text-xs text-[var(--color-neutral-400)]">
          Names are generated locally in your browser from curated word banks.
        </p>
      </div>

      {/* Output */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-neutral-900)]">{resultLabel}</h2>
          <button
            type="button"
            onClick={handleCopy}
            disabled={names.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-neutral-200)] px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-600)] transition-colors hover:border-[var(--color-accent-600)]/40 hover:text-[var(--color-accent-700)] disabled:opacity-50"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copy
          </button>
        </div>
        <div className="mt-3 min-h-[18rem] rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-5">
          {names.length === 0 ? (
            <p className="text-sm text-[var(--color-neutral-400)]">
              Your {resultLabel.toLowerCase()} will appear here. Enter a seed (optional) and click “Generate names”.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {names.map((name, i) => (
                <li key={name} className="rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm font-semibold text-[var(--color-neutral-800)]">
                  <span className="mr-2 text-xs font-bold text-[var(--color-accent-600)]">{String(i + 1).padStart(2, '0')}</span>
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}