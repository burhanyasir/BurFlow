import { useMemo, useState, type FormEvent } from 'react';
import { Copy, Sparkles } from 'lucide-react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../utils/cn';

const tool = getToolBySlug('ai-prompt-generator')!;

type FrameworkId = 'ape' | 'race' | 'create' | 'spark';

interface FrameworkInfo {
  id: FrameworkId;
  name: string;
  expansion: string;
}

const FRAMEWORKS: FrameworkInfo[] = [
  { id: 'ape', name: 'APE', expansion: 'Action · Purpose · Expectation' },
  { id: 'race', name: 'RACE', expansion: 'Role · Action · Context · Execution' },
  { id: 'create', name: 'CREATE', expansion: 'Context · Request · Examples · Action · Transform · Evaluate' },
  { id: 'spark', name: 'SPARK', expansion: 'Scenario · Purpose · Audience · Requirements · Keep' },
];

const TONES = ['Professional', 'Friendly', 'Persuasive', 'Concise', 'Authoritative', 'Casual'];

function buildPrompt(framework: FrameworkId, task: string, audience: string, tone: string): string {
  const audienceLine = audience.trim() || 'the intended audience';
  const toneLine = tone.toLowerCase();
  switch (framework) {
    case 'ape':
      return `ACTION\n${task.trim() || '[Describe the specific action you want performed]'}\n\nPURPOSE\nExplain the outcome this action should achieve — the problem it solves or the value it delivers.\n\nEXPECTATION\nDeliver the result in a ${toneLine} tone, tailored to ${audienceLine}. Include exactly what is required so it can be used immediately.`;
    case 'race':
      return `ROLE\nAct as an experienced professional who specializes in serving ${audienceLine}.\n\nACTION\n${task.trim() || '[Describe the action or task to perform]'}\n\nCONTEXT\nYou are helping ${audienceLine}. Use a ${toneLine} tone, draw on best practices, and stay focused on their goals.\n\nEXECUTION\nComplete the action step by step. Format the output so it is ready to use, and state any assumptions you made.`;
    case 'create':
      return `CONTEXT\nThis prompt is for ${audienceLine}. The desired tone is ${toneLine}.\n\nREQUEST\n${task.trim() || '[Describe your request clearly and specifically]'}\n\nEXAMPLES\nInclude 2–3 concrete examples that illustrate the expected quality and style of the output.\n\nACTION\nWork through the request in logical steps before producing the final version.\n\nTRANSFORM\nReturn the result in a clean, structured format — headings, bullets, and short paragraphs as appropriate.\n\nEVALUATE\nReview the output against the request: Is it accurate, complete, and tailored to ${audienceLine}? Fix any gaps before presenting it.`;
    case 'spark':
      return `SCENARIO\nSet the scene: ${task.trim() || '[Describe the situation this prompt is about]'}\n\nPURPOSE\nState clearly why this output matters and what the audience should take away from it.\n\nAUDIENCE\nTailor the response for ${audienceLine}.\n\nREQUIREMENTS\n- Use a ${toneLine} tone\n- Keep sentences short and direct\n- Structure the answer with headings or bullets\n- Avoid jargon unless it is defined\n\nKEEP IT\nDeliver a focused, high-quality result that requires no follow-up.`;
  }
}

export default function AiPromptGeneratorPage() {
  const { addToast } = useToast();
  const [framework, setFramework] = useState<FrameworkId>('ape');
  const [task, setTask] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('Professional');

  const prompt = useMemo(() => buildPrompt(framework, task, audience, tone), [framework, task, audience, tone]);
  const wordCount = useMemo(() => prompt.split(/\s+/).filter(Boolean).length, [prompt]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      track('tool_result_copied', { tool_id: tool.slug, category: tool.category, result: 'prompt', framework });
      addToast('Prompt copied to clipboard', 'success');
    } catch {
      addToast('Could not copy. Please copy manually.', 'error');
    }
  };

  const handleGenerate = (e: FormEvent) => {
    e.preventDefault();
    track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'generate_prompt', framework });
    addToast('Your prompt is ready below — copy it into any AI tool', 'success');
  };

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Create high-quality AI prompts with proven frameworks — APE, RACE, CREATE, and SPARK — for ChatGPT, Claude, and any AI model."
    >
      <form onSubmit={handleGenerate} className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-6">
          <div>
            <span className="text-sm font-semibold text-[var(--color-neutral-900)]">Prompt framework</span>
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
            <label htmlFor="pg-task" className="text-sm font-semibold text-[var(--color-neutral-900)]">
              Goal / Task
            </label>
            <textarea
              id="pg-task"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. Write a 3-email sequence to re-engage SaaS trial users who didn't convert"
              rows={4}
              className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
            />
          </div>

          <div>
            <label htmlFor="pg-audience" className="text-sm font-semibold text-[var(--color-neutral-900)]">
              Target audience
            </label>
            <input
              id="pg-audience"
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. SaaS founders with less than 50 employees"
              className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
            />
          </div>

          <div>
            <label htmlFor="pg-tone" className="text-sm font-semibold text-[var(--color-neutral-900)]">
              Tone of voice
            </label>
            <select
              id="pg-tone"
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
            Generate prompt
          </button>
        </div>

        {/* Output */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-neutral-900)]">Prompt preview</h2>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-neutral-200)] px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-600)] transition-colors hover:border-[var(--color-accent-600)]/40 hover:text-[var(--color-accent-700)]"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Copy Prompt
            </button>
          </div>
          <div className="mt-3 min-h-[20rem] rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-5">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--color-neutral-700)]">{prompt}</pre>
          </div>
          <p className="mt-2 text-xs text-[var(--color-neutral-400)]">
            {wordCount} words · {prompt.length} characters — updates as you type
          </p>
        </div>
      </form>
    </GenericToolWrapper>
  );
}