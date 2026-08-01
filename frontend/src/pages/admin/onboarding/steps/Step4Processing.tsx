import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';


interface Props {
  knowledge: { files: Array<{ name: string; status: string }>; websites: string[]; faqs: string };
  processing: { sourceIds: string[]; completedIds: string[]; statuses: Record<string, string>; error: string | null };
  onCheckStatus: () => Promise<{ completed: boolean; statuses: Record<string, string> }>;
}

const STAGES = [
  { key: 'uploaded', label: 'Uploaded', desc: 'Files received by server' },
  { key: 'parsing', label: 'Parsing', desc: 'Extracting text content' },
  { key: 'chunking', label: 'Chunking', desc: 'Splitting into searchable pieces' },
  { key: 'embedding', label: 'Embedding', desc: 'Generating AI embeddings' },
  { key: 'indexing', label: 'Indexing', desc: 'Building search index' },
  { key: 'ready', label: 'Ready', desc: 'Ready for questions' },
];

function getStageIndex(status: string): number {
  const order = ['pending', 'uploaded', 'parsing', 'chunking', 'embedding', 'indexing', 'ready', 'published', 'error'];
  const idx = order.indexOf(status);
  return idx >= 0 ? idx : 0;
}

export function Step4Processing({ knowledge, processing, onCheckStatus }: Props) {
  const [checking, setChecking] = useState(false);
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!started) return;
    const timer = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [started]);

  const poll = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    try {
      await onCheckStatus();
    } catch {}
    setChecking(false);
  }, [checking, onCheckStatus]);

  useEffect(() => {
    if (!started) return;
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [started, poll]);

  const allReady = (() => {
    const vals = Object.values(processing.statuses);
    return vals.length > 0 && vals.every(s => s === 'ready' || s === 'published');
  })();

  const hasContent = knowledge.files.length > 0 || knowledge.websites.length > 0 || knowledge.faqs.trim().length > 0;

  if (!hasContent) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto py-4 text-center">
        <div className="w-16 h-16 bg-[var(--color-neutral-100)] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[var(--color-neutral-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[var(--color-neutral-900)] mb-2">No Content to Process</h2>
        <p className="text-sm text-[var(--color-neutral-500)]">Go back and add knowledge sources first (files, website URLs, or FAQs).</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto py-4">
      <h2 className="text-2xl font-bold text-[var(--color-neutral-900)] mb-2">Processing Knowledge</h2>
      <p className="text-sm text-[var(--color-neutral-500)] mb-8">We're indexing your content so the AI can answer customer questions accurately.</p>

      {!started && !allReady && (
        <div className="text-center py-8">
          <button
            onClick={() => { setStarted(true); poll(); }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-accent-600)] text-white font-semibold hover:bg-[var(--color-accent-700)] transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Start Processing
          </button>
          <p className="text-xs text-[var(--color-neutral-400)] mt-3">Click to begin indexing your knowledge sources.</p>
        </div>
      )}

      {(started || allReady) && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-neutral-500)]">
              {allReady ? 'All sources processed' : `Processing… ${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')} elapsed`}
            </span>
            {!allReady && (
              <button onClick={poll} disabled={checking} className="text-xs text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)]">
                {checking ? 'Checking…' : 'Refresh'}
              </button>
            )}
          </div>

          <div className="space-y-4">
            {STAGES.map((stage, i) => {
              const allAtOrPast = Object.values(processing.statuses).length > 0 &&
                Object.values(processing.statuses).every(s => getStageIndex(s) >= i);
              const someAt = Object.values(processing.statuses).some(s => getStageIndex(s) === i);
              const isComplete = allAtOrPast && !someAt;

              return (
                <div key={stage.key} className={`flex items-center gap-4 p-3 rounded-lg ${isComplete ? 'bg-[var(--color-success-50)]' : someAt ? 'bg-[var(--color-accent-50)]' : 'bg-[var(--color-neutral-50)]'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isComplete ? 'bg-[var(--color-success-100)] text-[var(--color-success-600)]' : someAt ? 'bg-[var(--color-accent-100)] text-[var(--color-accent-600)]' : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-400)]'}`}>
                    {isComplete ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isComplete ? 'text-[var(--color-success-700)]' : someAt ? 'text-[var(--color-accent-700)]' : 'text-[var(--color-neutral-400)]'}`}>{stage.label}</p>
                    <p className="text-xs text-[var(--color-neutral-400)]">{stage.desc}</p>
                  </div>
                  {someAt && (
                    <div className="w-5 h-5 rounded-full border-2 border-[var(--color-accent-400)] border-t-transparent animate-spin" />
                  )}
                </div>
              );
            })}
          </div>

          {processing.error && (
            <div className="p-3 rounded-lg bg-[var(--color-error-50)] border border-[var(--color-error-100)] text-sm text-[var(--color-error-700)]">
              {processing.error}
            </div>
          )}

          {allReady && (
            <div className="p-4 rounded-xl bg-[var(--color-success-50)] border border-[var(--color-success-100)] text-center">
              <p className="text-sm font-semibold text-[var(--color-success-700)]">✓ All content indexed and ready</p>
              <p className="text-xs text-[var(--color-success-600)] mt-1">Your chatbot can now answer questions from {knowledge.files.length} file(s), {knowledge.websites.length} website(s), and {knowledge.faqs ? 'FAQs' : 'no FAQs'}.</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
