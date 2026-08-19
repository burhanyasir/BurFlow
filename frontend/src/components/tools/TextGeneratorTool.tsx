import { useState, type FormEvent, type ReactNode } from 'react';
import { Copy, Sparkles } from 'lucide-react';
import type { ToolDefinition } from '../../data/toolsData';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';
import type { GeneratorTemplate } from '../../lib/tools/textgen';

interface TextGeneratorToolProps {
  tool: ToolDefinition;
  template: GeneratorTemplate;
  resultLabel?: string;
  note?: ReactNode;
}

export default function TextGeneratorTool({ tool, template, resultLabel = 'Generated text', note }: TextGeneratorToolProps) {
  const { addToast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [outputs, setOutputs] = useState<string[]>([]);

  const setValue = (id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleGenerate = (e: FormEvent) => {
    e.preventDefault();
    const missing = template.fields.find((f) => f.required && !values[f.id]?.trim());
    if (missing) {
      addToast(`Please fill in: ${missing.label}`, 'error');
      return;
    }
    const generated = template.build(values);
    setOutputs(generated);
    track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'generate', count: generated.length });
    addToast(`Generated ${generated.length} ${generated.length === 1 ? 'option' : 'options'}`, 'success');
  };

  const handleCopy = async () => {
    if (outputs.length === 0) return;
    try {
      await navigator.clipboard.writeText(outputs.join('\n\n---\n\n'));
      track('tool_result_copied', { tool_id: tool.slug, category: tool.category, result: 'generated' });
      addToast(`${resultLabel} copied to clipboard`, 'success');
    } catch {
      addToast('Could not copy. Please copy manually.', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      {/* Inputs */}
      <div>
        <form onSubmit={handleGenerate} className="space-y-5">
          {template.fields.map((field) => (
            <div key={field.id}>
              <label htmlFor={`gen-${field.id}`} className="text-sm font-semibold text-[var(--color-neutral-900)]">
                {field.label}
              </label>
              {field.type === 'select' ? (
                <select
                  id={`gen-${field.id}`}
                  value={values[field.id] ?? field.options?.[0] ?? ''}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
                >
                  {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  id={`gen-${field.id}`}
                  value={values[field.id] ?? ''}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
                />
              ) : (
                <input
                  id={`gen-${field.id}`}
                  type="text"
                  value={values[field.id] ?? ''}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
                />
              )}
            </div>
          ))}
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Generate
          </button>
        </form>
        {note ?? (
          <p className="mt-5 text-xs text-[var(--color-neutral-400)]">
            Generated locally in your browser — nothing is sent to a server.
          </p>
        )}
      </div>

      {/* Output */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-neutral-900)]">{resultLabel}</h2>
          <button
            type="button"
            onClick={handleCopy}
            disabled={outputs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-neutral-200)] px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-600)] transition-colors hover:border-[var(--color-accent-600)]/40 hover:text-[var(--color-accent-700)] disabled:opacity-50"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copy all
          </button>
        </div>
        <div className="mt-3 min-h-[18rem] space-y-4 rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-5">
          {outputs.length === 0 ? (
            <p className="text-sm text-[var(--color-neutral-400)]">
              Your generated {resultLabel.toLowerCase()} will appear here.
            </p>
          ) : (
            outputs.map((out, i) => (
              <div key={i} className="rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[var(--color-accent-700)]">Option {i + 1}</p>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--color-neutral-700)]">{out}</pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}