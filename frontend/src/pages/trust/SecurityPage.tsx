import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'SOC 2 Compliance',
    body: 'Conversation Engine undergoes annual SOC 2 Type II audits conducted by an independent third-party auditor. Our SOC 2 report covers the Trust Services Criteria for security, availability, and confidentiality. Customers under NDA can request the latest report from their account team or by contacting security@conversationengine.com.',
  },
  {
    title: 'Encryption at Rest and in Transit',
    body: 'All customer data is encrypted at rest using AES-256 encryption. Data is stored in isolated, encrypted volumes with automatic key rotation. All network traffic is encrypted in transit using TLS 1.3, ensuring data is protected between end users, our APIs, and underlying infrastructure providers.',
  },
  {
    title: 'Access Controls and Authentication',
    body: 'Access to production systems is restricted to authorized personnel through role-based access control (RBAC). Multi-factor authentication (MFA) is required for all team members with access to sensitive systems. Access is reviewed quarterly and revoked immediately upon employee offboarding.',
  },
  {
    title: 'Tenant Isolation',
    body: 'Each customer workspace operates in a logically isolated environment. Knowledge bases, conversation data, and configuration are strictly partitioned at the application layer. This ensures no customer can access another customer\'s data, even in the event of a misconfiguration.',
  },
  {
    title: 'Security Audits',
    body: 'In addition to our annual SOC 2 audit, we conduct quarterly internal security reviews, annual penetration tests by external firms, and continuous vulnerability scanning across our infrastructure. Findings are triaged and remediated based on severity.',
  },
  {
    title: 'Incident Response',
    body: 'We maintain a documented incident response plan aligned with NIST guidelines. The process includes detection, containment, eradication, recovery, and post-incident review. Critical incidents are escalated within 15 minutes and communicated to affected customers within 24 hours.',
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

export default function SecurityPage() {
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
          <span style={{ color: '#A1A1AA' }}>Security</span>
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Security
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/70 max-w-2xl leading-relaxed">
            We design and operate our platform with security as a foundational requirement, not an afterthought.
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