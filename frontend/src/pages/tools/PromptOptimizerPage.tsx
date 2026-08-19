import { useMemo, useState, type FormEvent } from 'react';
import { Copy, Mail, Sparkles } from 'lucide-react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import LeadCaptureModal from '../../components/LeadCaptureModal';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../utils/cn';
import { FRAMEWORKS, TONES, optimizePrompt, type FrameworkId } from '../../lib/tools/prompt';

const tool = getToolBySlug('prompt-optimizer')!;

export default function PromptOptimizerPage() {
  const { addToast } = useToast();
  const [framework, setFramework] = useState<FrameworkId>('ape');
  const [existing, setExisting] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('Professional');
  const [showLeadModal, setShowLeadModal] = useState(false);

  const prompt = useMemo(() => optimizePrompt(framework, existing, audience, tone), [framework, existing, audience, tone]);
  const wordCount = useMemo(() => prompt.split(/\s+/).filter(Boolean).length, [prompt]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      track('tool_result_copied', { tool_id: tool.slug, category: tool.category, result: 'optimized_prompt', framework });
      addToast('Optimized prompt copied to clipboard', 'success');
    } catch {
      addToast('Could not copy. Please copy manually.', 'error');
    }
  };

  const handleOptimize = (e: FormEvent) => {
    e.preventDefault();
    track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'optimize_prompt', framework });
    addToast('Your optimized prompt is ready below', 'success');
  };

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Paste any prompt and get it rewritten with a proven framework — APE, RACE, CREATE, or SPARK — to get better AI answers."
    >
      <form onSubmit={handleOptimize} className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-6">
          <div>
            <span className="text-sm font-semibold text-[var(--color-neutral-900)]">Target framework</span>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Choose a prompt framework">
              {FRAMEWORKS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={framework === f.id}
                  onClick={() => setFramework(f.id)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)]',
                    framework === f.id
                      ? 'border-[var(--color-accent-600)] bg-[var(--color-accent-600)] text-white shadow-sm'
                      : 'border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] text-[var(--color-neutral-600)] hover:border-[var(--color-accent-600)]/40'
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--color-neutral-400)]">
              {FRAMEWORKS.find((f) => f.id === framework)?.expansion}
            </p>
          </div>

          <div>
            <label htmlFor="po-existing" className="text-sm font-semibold text-[var(--color-neutral-900)]">
              Your existing prompt
            </label>
            <textarea
              id="po-existing"
              value={existing}
              onChange={(e) => setExisting(e.target.value)}
              placeholder="e.g. Write a sales email for my product"
              rows={5}
              className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
            />
          </div>

          <div>
            <label htmlFor="po-audience" className="text-sm font-semibold text-[var(--color-neutral-900)]">
              Target audience
            </label>
            <input
              id="po-audience"
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. B2B SaaS founders"
              className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
            />
          </div>

          <div>
            <label htmlFor="po-tone" className="text-sm font-semibold text-[var(--color-neutral-900)]">
              Tone of voice
            </label>
            <select
              id="po-tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
            >
              {TONES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Optimize prompt
          </button>
        </div>

        {/* Output */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[var(--color-neutral-900)]">Optimized prompt</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  track('tool_cta_click', { tool_id: tool.slug, location: 'lead_capture_button' });
                  setShowLeadModal(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-neutral-200)] px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-600)] transition-colors hover:border-[var(--color-accent-600)]/40 hover:text-[var(--color-accent-700)]"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                Email me this prompt
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-neutral-200)] px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-600)] transition-colors hover:border-[var(--color-accent-600)]/40 hover:text-[var(--color-accent-700)]"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copy Prompt
              </button>
            </div>
          </div>
          <div className="mt-3 min-h-[20rem] rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-5">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--color-neutral-700)]">{prompt}</pre>
          </div>
          <p className="mt-2 text-xs text-[var(--color-neutral-400)]">
            {wordCount} words · {prompt.length} characters — updates as you type
          </p>
        </div>
      </form>
      <LeadCaptureModal
        open={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        toolSlug={tool.slug}
        toolName={tool.name}
        resultType="prompt"
        resultSummary={`Optimized ${FRAMEWORKS.find((f) => f.id === framework)?.name} prompt for ${audience.trim() || 'general audience'} (${tone} tone):\n\n${prompt}`}
      />
    </GenericToolWrapper>
  );
}