import { motion } from 'framer-motion';

const OVERVIEW = [
  { num: 1, title: 'Create Workspace', desc: 'Set up your BurFlow workspace', time: '1 min' },
  { num: 2, title: 'Scan Website', desc: 'Start with your website as the primary knowledge source', time: '3 min' },
  { num: 3, title: 'Optional Documents', desc: 'Add supporting files only when you need extra depth', time: '2 min' },
  { num: 4, title: 'Customize Widget', desc: 'Tune the agent’s look and sales prompts', time: '2 min' },
  { num: 5, title: 'Install & Verify', desc: 'Place the widget on your site', time: '2 min' },
  { num: 6, title: 'Test & Go Live', desc: 'Try a sales conversation and launch', time: '1 min' },
];

export function Step1Welcome({ onStart }: { onStart: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto text-center py-8">
      <div className="mb-8">
        <div className="w-20 h-20 bg-[var(--color-accent-100)] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-[var(--color-accent-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-[var(--color-neutral-900)] mb-3">Set up your BurFlow agent in minutes</h1>
        <p className="text-lg text-[var(--color-neutral-500)] mb-8">We’ll guide you from website scan to a live widget that feels helpful, grounded, and ready to convert visitors.</p>
      </div>

      <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] p-6 mb-8 text-left">
        <div className="grid gap-3 sm:grid-cols-3 mb-5">
          {[
            ['Start with your website', 'BurFlow learns your products, pricing, and services from your public pages first.'],
            ['Add support context', 'Optional documents help improve answers when you want deeper coverage.'],
            ['Go live with confidence', 'Customize the widget and verify it before you launch.'],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-xl bg-white p-3 border border-[var(--color-neutral-200)]">
              <p className="text-sm font-semibold text-[var(--color-neutral-900)]">{title}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--color-neutral-500)]">{desc}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {OVERVIEW.map(item => (
            <div key={item.num} className="flex items-center gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-[var(--color-accent-100)] text-[var(--color-accent-700)] flex items-center justify-center text-xs font-bold shrink-0">{item.num}</span>
              <div className="flex-1 min-w-0">
                <span className="text-[var(--color-neutral-700)]">{item.title}</span>
                <span className="text-xs text-[var(--color-neutral-400)] ml-2">{item.desc}</span>
              </div>
              <span className="text-xs text-[var(--color-neutral-400)] shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--color-neutral-400)] mt-4 text-center">Estimated total: <strong>~5 minutes</strong> · Progress auto-saved · You can leave and return anytime</p>
      </div>

      <div className="bg-[var(--color-accent-50)] border border-[var(--color-accent-100)] rounded-xl p-4 mb-8 text-left">
        <p className="text-sm text-[var(--color-accent-700)]">
          <strong>What matters most:</strong> start with your website, keep the experience simple, and let the widget guide visitors toward the next best action.
        </p>
      </div>

      <button
        onClick={onStart}
        className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-[var(--color-accent-600)] text-white font-semibold hover:bg-[var(--color-accent-700)] transition-colors shadow-sm"
      >
        Get Started
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
      </button>
    </motion.div>
  );
}
