import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface Subprocessor {
  name: string;
  purpose: string;
  location: string;
  dataProcessed: string;
}

const SUBPROCESSORS: Subprocessor[] = [
  {
    name: 'Paddle',
    purpose: 'Payment processing and subscription management',
    location: 'United Kingdom',
    dataProcessed: 'Billing information, payment records, invoice data',
  },
  {
    name: 'SendGrid (Twilio)',
    purpose: 'Email delivery for notifications and marketing',
    location: 'United States',
    dataProcessed: 'Email addresses, delivery metadata',
  },
  {
    name: 'OpenAI',
    purpose: 'Embedding generation for knowledge retrieval',
    location: 'United States',
    dataProcessed: 'Text snippets sent for embedding (not stored or trained on)',
  },
  {
    name: 'Cloudflare',
    purpose: 'CDN, DDoS protection, and DNS',
    location: 'Global (edge network)',
    dataProcessed: 'Request metadata, IP addresses (temporary)',
  },
  {
    name: 'AWS (Amazon Web Services)',
    purpose: 'Cloud infrastructure â€” compute, storage, database',
    location: 'United States (us-east-1)',
    dataProcessed: 'All customer data at rest',
  },
];

function SubprocessorRow({ sp, index }: { sp: Subprocessor; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
    >
      <div
        className="p-6 rounded-xl"
        style={{
          background: 'rgba(18,18,24,0.65)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <h3 className="text-lg font-bold text-white mb-2">{sp.name}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B76' }}>Purpose</span>
            <p className="mt-1 text-white/70">{sp.purpose}</p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B76' }}>Location</span>
            <p className="mt-1 text-white/70">{sp.location}</p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B76' }}>Data Processed</span>
            <p className="mt-1 text-white/70">{sp.dataProcessed}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function SubprocessorsPage() {
  return (
    <div className="min-h-screen" style={{ background: '#08080A' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24">
        <motion.nav
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm mb-10"
          style={{ color: '#6B6B76' }}
        >
          <Link to="/trust" className="hover:text-white transition-colors">
            Trust Center
          </Link>
          <span>&rarr;</span>
          <span style={{ color: '#A1A1AA' }}>Subprocessors</span>
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Subprocessors
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/70 max-w-2xl leading-relaxed">
            Third-party vendors engaged to deliver the BurFlow platform. We vet every subprocessor for security and compliance before engagement.
          </p>
        </motion.div>

        <div className="space-y-4 mb-12">
          {SUBPROCESSORS.map((sp, i) => (
            <SubprocessorRow key={sp.name} sp={sp} index={i} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.4 }}
        >
          <div
            className="p-6 md:p-8 rounded-xl"
            style={{
              background: 'rgba(18,18,24,0.65)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <h3 className="text-lg font-bold text-white mb-3">Subprocessor Vetting and Notification</h3>
            <p className="text-sm text-white/70 leading-relaxed">
              All subprocessors undergo a security review before engagement, including review of their SOC 2 reports, penetration test results, and data protection agreements. Each subprocessor is contractually bound to process data only as instructed by BurFlow and to maintain equivalent security standards.
              Customers will be notified via email at least 30 days before any new subprocessor is engaged. Customers who object to a new subprocessor may terminate their agreement without penalty.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}