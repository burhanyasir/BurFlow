import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'What Are Grounded Answers?',
    body: 'A grounded answer is a response that is directly traceable to a verified source document. Unlike traditional chatbots that generate answers from a neural network\'s internal knowledge, grounded answers are constructed exclusively from content the customer has uploaded — PDFs, help articles, FAQs, product documentation, or structured data. Every claim in a grounded answer can be verified against its source.',
  },
  {
    title: 'How Citations Work',
    body: 'When the widget delivers an answer, it can optionally display inline citations linking to the specific source document and section used. Citations include the document title and a direct excerpt of the relevant passage. This allows both end users and human operators to independently verify the accuracy of every response.',
  },
  {
    title: 'Confidence Scoring',
    body: 'Each answer is assigned a confidence score from 0 to 100, reflecting the strength of the match between the user\'s query and the knowledge base. The score considers semantic similarity, source relevance, and fragment completeness. Workspace owners set a confidence threshold — typically 70% — and any response below that threshold is treated as low confidence.',
  },
  {
    title: 'What Happens When Confidence Is Low',
    body: 'When confidence falls below the configured threshold, the system does not guess or generate speculative content. Instead, it responds with a clarifying question to help the user refine their query. If the user\'s need remains unmet after clarification, the conversation is escalated to a human operator with full context.',
  },
  {
    title: 'Human Handoff Process',
    body: 'Escalated conversations are routed to the human support queue with complete context: the conversation history, the user\'s original query, the sources that were retrieved (and their confidence scores), and the clarifying questions already attempted. This ensures operators can pick up the conversation without asking the user to repeat themselves.',
  },
  {
    title: 'Benefits Over Traditional Chatbots',
    body: 'Traditional chatbots often produce plausible-sounding but incorrect answers. Grounded answers eliminate this risk by anchoring every response in verified sources. Benefits include: zero hallucination risk, full auditability of every answer, consistent brand-aligned responses, simplified compliance (every answer is a known document), and faster resolution through accurate, targeted responses.',
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

export default function GroundedAnswersPage() {
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
          <span style={{ color: '#A1A1AA' }}>Grounded Answers</span>
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Grounded Answers
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/70 max-w-2xl leading-relaxed">
            How we ensure every answer is accurate, auditable, and anchored to verified knowledge.
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