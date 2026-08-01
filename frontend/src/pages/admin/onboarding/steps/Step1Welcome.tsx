import { motion } from 'framer-motion';

const OVERVIEW = [
  { num: 1, title: 'Create Workspace', desc: 'Set up your company workspace', time: '1 min' },
  { num: 2, title: 'Add Knowledge', desc: 'Upload docs, add websites, or paste FAQs', time: '3 min' },
  { num: 3, title: 'Processing', desc: 'We index your content for the AI', time: '2 min' },
  { num: 4, title: 'Customize Widget', desc: 'Pick colors, position, and messages', time: '2 min' },
  { num: 5, title: 'Install & Verify', desc: 'Add the widget to your website', time: '2 min' },
  { num: 6, title: 'Test & Go Live', desc: 'Chat with your bot and launch', time: '1 min' },
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
        <h1 className="text-3xl font-bold text-[var(--color-neutral-900)] mb-3">Welcome to Conversation Engine</h1>
        <p className="text-lg text-[var(--color-neutral-500)] mb-8">Get your AI customer support chatbot live in under 10 minutes. We'll guide you through every step.</p>
      </div>

      <div className="bg-[var(--color-neutral-50)] rounded-xl p-6 mb-8 text-left">
        <h3 className="font-semibold text-[var(--color-neutral-900)] mb-4">Setup Overview</h3>
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
        <p className="text-xs text-[var(--color-neutral-400)] mt-4 text-center">Estimated total: <strong>~10 minutes</strong> · Progress auto-saved · You can leave and return anytime</p>
      </div>

      <div className="bg-[var(--color-warning-50)] border border-[var(--color-warning-100)] rounded-xl p-4 mb-8 text-left">
        <p className="text-xs text-[var(--color-warning-700)]">
          <strong>Before you start:</strong> Have your company name, website URL, and any support documents (FAQ, product guides, knowledge base) ready. You'll need access to your website's HTML to install the chatbot widget.
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
