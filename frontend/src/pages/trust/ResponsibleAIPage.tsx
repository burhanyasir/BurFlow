import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'Deterministic, Template-Based Engine',
    body: 'BurFlow does not rely on free-form large language model generation. Our core engine uses deterministic conversation flows built from expert-authored templates. Every response is constructed from predefined, reviewed, and tested templates — eliminating the risk of hallucination or fabricated information.',
  },
  {
    title: 'Grounding in Verified Knowledge',
    body: 'All answers are grounded exclusively in the customer\'s uploaded knowledge sources — PDFs, FAQs, help articles, and structured data. The retrieval system searches only within these approved documents. No external web content or unverified data is used to generate responses.',
  },
  {
    title: 'Confidence Scoring and Guardrails',
    body: 'Every generated response includes a confidence score based on the relevance of the source material and the match strength. Workspace owners configure a confidence threshold. Responses below this threshold are blocked and replaced with a clarifying question or a human handoff — never a guess.',
  },
  {
    title: 'Human Oversight and Escalation',
    body: 'When confidence is low or the conversation reaches a defined boundary, the system seamlessly escalates to a human operator. Operators receive full context, including the conversation history and the specific sources the engine considered, enabling informed and timely responses.',
  },
  {
    title: 'No Training on Customer Data',
    body: 'Customer data — conversations, knowledge bases, and account information — is never used to train public AI models or improve models outside the customer\'s workspace. Each workspace operates as an isolated environment with its own knowledge base and configuration.',
  },
  {
    title: 'Transparency in AI Responses',
    body: 'When the widget delivers an answer, it can optionally display citations showing the specific source document and section used. This gives end users and operators the ability to verify every response against its original source material.',
  },
  {
    title: 'Bias Mitigation',
    body: 'Our template-based approach inherently avoids the biases that can emerge in large language models. Templates are reviewed by human experts and tested against diverse inputs. We continuously monitor for edge cases and refine templates to ensure fair, consistent treatment across all user interactions.',
  },
  {
    title: 'Continuous Monitoring',
    body: 'We monitor response quality, confidence distributions, escalation rates, and user satisfaction metrics. Our team reviews flagged conversations and uses insights to improve templates and knowledge retrieval. This ensures ongoing alignment with safety and quality standards.',
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

export default function ResponsibleAIPage() {
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
          <span style={{ color: '#A1A1AA' }}>Responsible AI</span>
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Responsible AI
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/70 max-w-2xl leading-relaxed">
            Safe, transparent, and trustworthy AI — built on principles of accountability and human oversight.
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