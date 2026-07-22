import { motion } from 'framer-motion';

const fadeUp = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-50px' } };

const trustSignals = [
  {
    category: 'Grounding',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Grounded responses',
    description: 'Every answer is sourced from your documentation. No hallucination, no guessing.'
  },
  {
    category: 'Security',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    title: 'Your data stays yours',
    description: 'Customer information is never used to train public models. Enterprise-grade isolation.'
  },
  {
    category: 'Reliability',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: 'Deploy in under 10 minutes',
    description: 'Copy a single script tag. No complex engineering. Go live immediately.'
  },
  {
    category: 'Privacy',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
      </svg>
    ),
    title: 'Multi-tenant, audit-ready',
    description: 'Manage multiple workspaces. Granular roles. SOC 2 and GDPR compliant.'
  }
];

export function TrustSection() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {trustSignals.map((signal, i) => (
        <motion.div
          key={signal.title}
          {...fadeUp}
          transition={{ duration: 0.4, delay: i * 0.08 }}
          className="flex flex-col p-6 rounded-2xl bg-[var(--color-neutral-0)] border border-[var(--color-neutral-200)] shadow-sm hover:shadow-md transition-shadow duration-300"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-accent-200)]/40 flex items-center justify-center text-[var(--color-accent-600)]">
              {signal.icon}
            </div>
            <span className="text-[10px] font-semibold text-[var(--color-neutral-400)] uppercase tracking-wider">{signal.category}</span>
          </div>
          <h3 className="text-sm font-semibold text-[var(--color-neutral-900)] mb-2">{signal.title}</h3>
          <p className="text-xs leading-relaxed text-[var(--color-neutral-500)]">{signal.description}</p>
        </motion.div>
      ))}
    </div>
  );
}
