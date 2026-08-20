import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'SOC 2 Type II',
    body: 'BurFlow is audited annually against SOC 2 Type II criteria. This certification verifies that our controls for security, availability, and confidentiality are not only properly designed but also operating effectively over a sustained period. Type II certification goes beyond a point-in-time audit — it validates our operational discipline over months of continuous monitoring.',
  },
  {
    title: 'GDPR Compliance',
    body: 'We comply with the General Data Protection Regulation (GDPR) for all users in the European Economic Area. This includes lawful data processing, data subject access requests (DSARs), the right to erasure, data portability, and breach notification within 72 hours. We act as a data processor for customer conversation data and as a data controller for account information.',
  },
  {
    title: 'Data Processing Transparency',
    body: 'Our Data Processing Agreement (DPA) clearly defines the scope, nature, and purpose of data processing. We maintain a current subprocessor list and notify customers of any changes. Data is processed only in accordance with documented instructions from our customers.',
  },
  {
    title: 'Compliance Documentation',
    body: 'Customers can request our SOC 2 Type II report, penetration test results, and compliance documentation by signing a standard NDA. These documents are provided through a secure portal to authorized personnel. Contact compliance@conversationengine.com to initiate a request.',
  },
  {
    title: 'Regional Data Residency',
    body: 'Data is processed and stored in the US (us-east-1) by default. For Enterprise customers, data residency in the EU (eu-west-1) is available upon request. We ensure that all subprocessors are contractually bound to maintain equivalent data protection standards.',
  },
];

function Section({ title, body, index }: { title: string; body: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <div
        className="p-6 md:p-8 rounded-xl"
        style={{
          background: 'rgba(18,18,24,0.65)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
        <p className="text-sm text-white/70 leading-relaxed">{body}</p>
      </div>
    </motion.div>
  );
}

export default function CompliancePage() {
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
          <span style={{ color: '#A1A1AA' }}>Compliance</span>
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Compliance
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/70 max-w-2xl leading-relaxed">
            Certifications, standards, and regulatory alignment that underpin our commitment to data protection.
          </p>
        </motion.div>

        <div className="space-y-5">
          {sections.map((s, i) => (
            <Section key={s.title} title={s.title} body={s.body} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}