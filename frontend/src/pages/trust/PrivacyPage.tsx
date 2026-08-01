import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'What Data We Collect',
    body: 'We collect only the data necessary to provide and improve our service. This includes: (1) Account data — name, email address, company name, and billing information provided during registration. (2) Conversation data — messages, responses, and metadata exchanged through the widget, strictly within the customer\'s workspace. (3) Usage data — aggregated metrics about feature usage, response volumes, and performance benchmarks that do not identify individual users.',
  },
  {
    title: 'How Data Is Used',
    body: 'Conversation data is used solely to deliver responses, improve response quality within a workspace, and provide analytics to the account holder. We never use customer conversation data to train or improve AI models outside the customer\'s workspace. Usage data is used to operate, maintain, and improve the platform.',
  },
  {
    title: 'Data Retention',
    body: 'Conversation data is retained for the duration of the customer\'s subscription plus 90 days following termination, after which it is securely deleted. Account data is retained for the duration of the business relationship plus seven years for tax and legal compliance. Customers can request earlier deletion at any time.',
  },
  {
    title: 'Data Deletion',
    body: 'Workspace owners can delete their workspace and associated data at any time through dashboard settings. Upon deletion, all conversation data, knowledge bases, and configuration are permanently removed from primary and backup systems within 30 days. Contact privacy@conversationengine.com for assistance.',
  },
  {
    title: 'No Training on Customer Data',
    body: 'Conversation Engine does not train large language models or any public AI models on customer data. Our platform uses deterministic template-based responses and retrieval-augmented generation grounded exclusively in each customer\'s uploaded knowledge base. Your data remains yours.',
  },
  {
    title: 'Cookie Usage',
    body: 'We use essential cookies for authentication and session management, analytics cookies to understand platform usage patterns, and functional cookies to remember preferences. Third-party cookies are used only for payment processing (Paddle) and error monitoring. You can manage cookie preferences through your browser settings.',
  },
  {
    title: 'Third-Party Data Sharing',
    body: 'We share data only with subprocessors necessary to deliver the service: Paddle (payment processing), SendGrid (email delivery), OpenAI (embedding generation), Cloudflare (CDN), and AWS (infrastructure). All subprocessors are contractually bound to data protection standards equivalent to our own. We do not sell personal data.',
  },
  {
    title: 'Contact for Privacy Questions',
    body: 'For privacy-related inquiries, data subject requests, or questions about this policy, contact our Data Protection Officer at privacy@conversationengine.com. We respond to all requests within 30 days.',
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

export default function PrivacyPage() {
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
          <span style={{ color: '#A1A1AA' }}>Privacy</span>
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Privacy Policy
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/70 max-w-2xl leading-relaxed">
            How we handle, protect, and respect your data — and your customers' data.
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