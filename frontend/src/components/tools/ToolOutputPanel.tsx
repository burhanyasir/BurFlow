import { Copy } from 'lucide-react';
import type { ToolDefinition } from '../../data/toolsData';
import { track } from '../../lib/analytics';
import { useToast } from '../ui/Toast';

interface ToolOutputPanelProps {
  tool: ToolDefinition;
  title: string;
  value: string;
  emptyText: string;
  resultLabel?: string;
  mono?: boolean;
  footer?: string;
}

export default function ToolOutputPanel({ tool, title, value, emptyText, resultLabel = 'Output', mono = true, footer }: ToolOutputPanelProps) {
  const { addToast } = useToast();

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      track('tool_result_copied', { tool_id: tool.slug, category: tool.category, result: resultLabel });
      addToast(`${resultLabel} copied to clipboard`, 'success');
    } catch {
      addToast('Could not copy. Please copy manually.', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-neutral-900)]">{title}</h2>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!value}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-neutral-200)] px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-600)] transition-colors hover:border-[var(--color-accent-600)]/40 hover:text-[var(--color-accent-700)] disabled:opacity-50"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          Copy
        </button>
      </div>
      <div className="mt-3 min-h-[18rem] rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-5">
        {value ? (
          <pre className={`whitespace-pre-wrap leading-relaxed text-[var(--color-neutral-700)] ${mono ? 'font-mono text-xs' : 'font-sans text-sm'}`}>{value}</pre>
        ) : (
          <p className="text-sm text-[var(--color-neutral-400)]">{emptyText}</p>
        )}
      </div>
      {footer && <p className="mt-2 text-xs text-[var(--color-neutral-400)]">{footer}</p>}
    </div>
  );
}