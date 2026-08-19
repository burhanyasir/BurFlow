import { motion } from 'framer-motion';

const sections = [
  {
    title: '1. Introduction and Acceptance',
    body: 'These Terms of Service ("Terms") govern your use of the BurFlow platform and services operated by BurFlow Inc. ("Company," "we," "us," or "our"). By accessing or using the service, you agree to be bound by these Terms. If you do not agree, do not access or use the service. These Terms apply to all visitors, users, and customers.',
  },
  {
    title: '2. Account Registration and Responsibilities',
    body: 'You must be at least 18 years old to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information during registration and to update it as needed. You must notify us immediately of any unauthorized use of your account.',
  },
  {
    title: '3. Subscription and Billing',
    body: 'Paid plans are billed in advance on a monthly or annual basis as selected during checkout. All fees are non-refundable except as explicitly stated in our refund policy. We may change pricing with 30 days\' notice. Enterprise customers are bound by the pricing terms in their signed order form. Late payments may result in service suspension.',
  },
  {
    title: '4. Service Description and Limitations',
    body: 'BurFlow provides grounded AI-powered support responses based on customer-uploaded knowledge sources. We strive for accuracy but the service depends on the quality and completeness of the knowledge base provided. We reserve the right to set reasonable usage limits and to suspend accounts that exceed fair use thresholds or that violate these Terms.',
  },
  {
    title: '5. Intellectual Property Rights',
    body: 'The BurFlow platform, including its software, templates, algorithms, and branding, is owned by the Company and protected by intellectual property laws. Customers retain all rights to their uploaded knowledge base content and conversation data. We do not claim ownership of customer data. These Terms do not grant any license to use our trademarks or branding without prior written consent.',
  },
  {
    title: '6. Data Privacy and Security',
    body: 'We process personal data in accordance with our Privacy Policy and Data Processing Agreement (DPA). We implement industry-standard security measures including encryption, access controls, and regular audits. We do not train AI models on customer data. Data handling practices are detailed at /trust/privacy.',
  },
  {
    title: '7. Limitation of Liability',
    body: 'To the maximum extent permitted by law, the Company shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service. Our total liability for any claim arising under these Terms shall not exceed the amount paid by you in the twelve months preceding the claim. The service is provided "as is" without warranty of uninterrupted or error-free operation.',
  },
  {
    title: '8. Termination',
    body: 'You may terminate your account at any time through the dashboard settings. We may suspend or terminate your access for violation of these Terms, with or without notice. Upon termination, your data will be retained for 90 days before permanent deletion, unless you request earlier deletion. Sections 5, 6, 7, and 9 survive termination.',
  },
  {
    title: '9. Governing Law',
    body: 'These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. Any disputes arising from these Terms shall be resolved exclusively in the state or federal courts located in Delaware. The United Nations Convention on Contracts for the International Sale of Goods does not apply.',
  },
  {
    title: '10. Contact Information',
    body: 'For questions about these Terms, contact us at legal@conversationengine.com or at: BurFlow Inc., 1000 N West Street, Suite 1200, Wilmington, DE 19801, United States.',
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
        <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{body}</p>
      </div>
    </motion.div>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: '#08080A' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Terms of Service
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/70 max-w-2xl leading-relaxed">
            The terms governing your use of the BurFlow platform.
          </p>
          <p className="mt-2 text-sm text-white/50">Last updated: July 28, 2026</p>
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