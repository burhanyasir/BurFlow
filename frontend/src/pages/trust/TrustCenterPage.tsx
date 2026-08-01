import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

interface TrustCard {
  title: string;
  description: string;
  href: string;
  icon: string;
}

const CARDS: TrustCard[] = [
  {
    title: 'Security',
    description: 'SOC 2, encryption at rest and in transit, access controls, and tenant isolation architecture.',
    href: '/trust/security',
    icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  },
  {
    title: 'Compliance',
    description: 'SOC 2 Type II, GDPR compliance, and transparent data processing documentation.',
    href: '/trust/compliance',
    icon: 'M9 12l2 2 4-5M7.86 2h8.28C18 2 19 3 19 4.14v15.72c0 1.14-1 2.14-2.14 2.14H7.86C6.72 22 6 21 6 19.86V4.14C6 3 7 2 8.14 2z',
  },
  {
    title: 'Privacy',
    description: 'Data handling practices, retention policies, and your rights regarding personal information.',
    href: '/trust/privacy',
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  },
  {
    title: 'Uptime',
    description: 'Service availability commitment, SLA guarantees, real-time status, and maintenance windows.',
    href: '/trust/uptime',
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  },
  {
    title: 'Subprocessors',
    description: 'Third-party vendors we engage, their purpose, location, and our vetting process.',
    href: '/trust/subprocessors',
    icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
  },
  {
    title: 'DPA',
    description: 'Data Processing Agreement terms, how to request a signed copy, and scope of coverage.',
    href: '/trust/dpa',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    title: 'Responsible AI',
    description: 'Our commitment to safe, transparent, and ethical AI — no hallucinations, full traceability.',
    href: '/trust/responsible-ai',
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    title: 'Grounded Answers',
    description: 'How our platform delivers answers verified against your knowledge sources with citations.',
    href: '/trust/grounded-answers',
    icon: 'M9 12l2 2 4-5m6 3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
];

function TrustCard({ card, index }: { card: TrustCard; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      <Link
        to={card.href}
        className={cn(
          'block p-6 md:p-8 rounded-xl transition-all duration-300',
          'hover:border-[rgba(201,79,114,0.3)] hover:translate-y-[-3px]'
        )}
        style={{
          background: 'rgba(18,18,24,0.65)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl mb-5"
          style={{ background: 'rgba(138,21,56,0.4)', border: '1px solid rgba(201,79,114,0.4)' }}
        >
          <svg className="h-5 w-5" style={{ color: '#E8A0B4' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={card.icon} />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight">{card.title}</h3>
        <p className="mt-2 text-sm text-white/70 leading-relaxed">{card.description}</p>
        <span className="inline-block mt-4 text-sm font-semibold" style={{ color: '#C94F72' }}>
          Learn more &rarr;
        </span>
      </Link>
    </motion.div>
  );
}

export default function TrustCenterPage() {
  return (
    <div className="min-h-screen" style={{ background: '#08080A' }}>
      <div className="relative pt-24 pb-14 text-center max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono mb-6"
            style={{
              background: 'rgba(18,18,24,0.65)',
              backdropFilter: 'blur(28px)',
              borderColor: 'rgba(255,255,255,0.1)',
              color: '#E8A0B4',
            }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: '#1F9D6B' }} />
            <span>TRUST CENTER</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
            Enterprise security and compliance.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
            Your data's privacy and integrity are the foundation of our platform.
          </p>
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CARDS.map((card, i) => (
            <TrustCard key={card.title} card={card} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}