import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'What Is a DPA?',
    body: 'A Data Processing Agreement (DPA) is a legally binding contract that defines how a data processor handles personal data on behalf of a data controller. Under GDPR Article 28, a DPA is required whenever a processor handles personal data of EU residents. Our DPA ensures that both parties understand their obligations regarding data protection, security, and confidentiality.',
  },
  {
    title: 'How to Request a Signed DPA',
    body: 'A pre-signed DPA is available to all customers upon request. Enterprise customers receive a signed DPA as part of their onboarding. To request a DPA, email dpa@conversationengine.com with your company name and workspace ID. We typically return a fully signed copy within three business days.',
  },
  {
    title: 'Data Processing Scope',
    body: 'The DPA covers all personal data processed through the BurFlow platform, including customer support conversation data, account registration information, and knowledge base content. Processing purposes are limited to delivering AI-powered support responses, analytics, and platform operations as documented in the agreement.',
  },
  {
    title: 'Security Measures',
    body: 'The DPA details our technical and organizational security measures: AES-256 encryption at rest, TLS 1.3 in transit, RBAC access controls, quarterly access reviews, regular penetration testing, employee security training, and incident response procedures aligned with NIST guidelines.',
  },
  {
    title: 'Data Subject Rights',
    body: 'BurFlow assists customers in fulfilling data subject access requests (DSARs), including rights to access, rectification, erasure, portability, and restriction of processing. We respond to data subject requests initiated through the customer within 30 days.',
  },
  {
    title: 'Subprocessor List',
    body: 'The DPA includes a complete list of authorized subprocessors. Customers are notified at least 30 days before any engagement of a new subprocessor. The current subprocessor list is available at /trust/subprocessors.',
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

export default function DpaPage() {
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
          <span style={{ color: '#A1A1AA' }}>DPA</span>
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Data Processing Agreement
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/70 max-w-2xl leading-relaxed">
            Our commitment to GDPR-compliant data processing and transparency.
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