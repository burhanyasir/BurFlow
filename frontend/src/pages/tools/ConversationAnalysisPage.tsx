import { useState, type FormEvent } from 'react';
import { Copy, FileText, Sparkles } from 'lucide-react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';
import { analyzeConversation, buildConversationReport, parseConversationLog, type ConversationTurn } from '../../lib/tools/conversation';

const tool = getToolBySlug('conversation-analysis')!;

const SAMPLE_LOG = `Visitor: Hi! How does your pricing work?
Agent: Hi! Plans start at $29/mo for the Starter plan.
Visitor: Do you have a free trial?
Agent: Yes, you get a 14-day free trial on every plan.
Visitor: And what happens after the trial ends?
Visitor: Can I cancel anytime?
Agent: After the trial you pick a plan — you can cancel anytime from the dashboard.
Visitor: Great, thanks!`;

export default function ConversationAnalysisPage() {
  const { addToast } = useToast();
  const [log, setLog] = useState('');
  const [report, setReport] = useState('');
  const [turns, setTurns] = useState<ConversationTurn[]>([]);

  const handleAnalyze = (e: FormEvent) => {
    e.preventDefault();
    if (log.trim().length < 20) {
      addToast('Paste a conversation log first (format: "Visitor: …" / "Agent: …")', 'error');
      return;
    }
    const parsed = parseConversationLog(log);
    const stats = analyzeConversation(parsed);
    setTurns(parsed);
    setReport(buildConversationReport(stats));
    track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'analyze_conversation', turns: parsed.length });
    addToast('Analysis complete', 'success');
  };

  const handleCopy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      track('tool_result_copied', { tool_id: tool.slug, category: tool.category, result: 'analysis_report' });
      addToast('Report copied to clipboard', 'success');
    } catch {
      addToast('Could not copy. Please copy manually.', 'error');
    }
  };

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Paste any chatbot conversation and get an instant quality report — unanswered questions, repeated topics, and improvement tips."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Input */}
        <div>
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="conv-log" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                  Conversation log
                </label>
                <button
                  type="button"
                  onClick={() => setLog(SAMPLE_LOG)}
                  className="text-xs font-semibold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)]"
                >
                  Load sample
                </button>
              </div>
              <textarea
                id="conv-log"
                value={log}
                onChange={(e) => setLog(e.target.value)}
                placeholder={'Visitor: Hi! How does pricing work?\nAgent: Hi! Plans start at $29/mo…'}
                rows={12}
                spellCheck={false}
                className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 font-mono text-xs leading-relaxed text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
              />
              <p className="mt-1.5 text-xs text-[var(--color-neutral-400)]">
                One line per message, prefixed with <span className="font-semibold">Visitor:</span> or <span className="font-semibold">Agent:</span>. Works with “User:”, “Customer:”, “Bot:”, “Support:” too.
              </p>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Analyze conversation
            </button>
          </form>
        </div>

        {/* Output */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-neutral-900)]">Analysis report</h2>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!report}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-neutral-200)] px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-600)] transition-colors hover:border-[var(--color-accent-600)]/40 hover:text-[var(--color-accent-700)] disabled:opacity-50"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Copy report
            </button>
          </div>
          <div className="mt-3 min-h-[18rem] rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-5">
            {report ? (
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--color-neutral-700)]">{report}</pre>
            ) : (
              <p className="text-sm text-[var(--color-neutral-400)]">
                Your analysis report will appear here. Paste a conversation log above and click “Analyze conversation”.
              </p>
            )}
          </div>
          {turns.length > 0 && (
            <p className="mt-2 text-xs text-[var(--color-neutral-400)]">
              <FileText className="mr-1 inline h-3 w-3" aria-hidden="true" />
              {turns.length} turns parsed locally — nothing is uploaded.
            </p>
          )}
        </div>
      </div>
    </GenericToolWrapper>
  );
}