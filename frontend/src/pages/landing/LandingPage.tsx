import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Container } from '../../layouts/Container';
import { GroundingMotif } from '../../components/effects/GroundingMotif';
import { LiveDemoWidget } from './LiveDemoWidget';
import { TrustSection } from './TrustSection';
import { PricingCard, type PricingTier } from '../../components/ui/PricingCard';
import { cn } from '../../utils/cn';

const fadeUp = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' } };

function SectionDivider() {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="w-12 h-px bg-[var(--color-neutral-200)]" />
    </div>
  );
}

const previewTiers: PricingTier[] = [
  { name: 'Free', price: '$0', period: '/ mo', variant: 'free', features: ['100 conversations / mo', '5 documents', '1 knowledge base', '1 team member'], cta: 'Get Started', ctaVariant: 'ghost' },
  { name: 'Starter', price: '$29', period: '/ mo', variant: 'starter', features: ['3,000 conversations / mo', '50 documents', '5 knowledge bases', '5 team members'], cta: 'Start free', ctaVariant: 'secondary' },
  { name: 'Pro', price: '$49', period: '/ mo', variant: 'professional', popular: true, features: ['10,000 conversations / mo', '200 documents', '20 knowledge bases', '20 team members'], cta: 'Start free', ctaVariant: 'primary' },
  { name: 'Advanced', price: '$99', period: '/ mo', variant: 'enterprise', features: ['25,000 conversations / mo', '1,000 documents', '50 knowledge bases', '50 team members'], cta: 'Contact Sales', ctaVariant: 'primary' }
];

const howItWorksSteps = [
  { title: 'Upload your docs', description: 'Drop in your docs, FAQs, or knowledge base files.' },
  { title: 'Grounding indexes them', description: 'Every answer is grounded against your source material.' },
  { title: 'Verified answers', description: 'Precise, sourced responses \u2014 or an honest fallback.' },
  { title: 'Live on your site', description: 'One script tag. Visitors get answers in minutes.' }
];

function ScrollIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.4, duration: 0.6 }}
      className="hidden lg:flex flex-col items-center gap-2 mt-12"
    >
      <span className="text-[10px] text-[var(--color-neutral-300)] tracking-[0.2em] uppercase font-medium">Scroll</span>
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="w-5 h-8 rounded-full border border-[var(--color-neutral-200)] flex items-start justify-center p-1"
      >
        <motion.div className="w-1 h-2 rounded-full bg-[var(--color-accent-600)]" />
      </motion.div>
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <div>

      {/* \u00a78.2 \u2014 Hero + Grounding Motif */}
      <section className="relative overflow-hidden pt-24 pb-16 md:pt-36 md:pb-20">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-[50vh] lg:min-h-[60vh]">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-accent-200)]/40 text-[var(--color-accent-700)] mb-8 border border-[var(--color-accent-200)]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-600)]" />
                Grounded AI Support
              </motion.div>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-[var(--color-neutral-900)] leading-[1.1]">
                Every answer is already in{' '}
                <span className="whitespace-nowrap">your&nbsp;docs.</span>{' '}
                <span className="text-[var(--color-accent-600)]">Now it talks.</span>
              </h1>
              <p className="mt-7 text-lg md:text-xl text-[var(--color-neutral-500)] leading-relaxed max-w-lg">
                Turns your docs into instant, accurate answers. Nothing improvised, everything sourced.
              </p>
              <p className="mt-4 text-sm text-[var(--color-neutral-400)]">
                Deploys in under 10 minutes. No credit card required.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-start gap-4">
                <Link to="/signup">
                  <Button size="lg" glow arrow>
                    Start free
                  </Button>
                </Link>
                <a href="#demo" className="inline-flex items-center h-12 px-4 text-sm font-medium text-[var(--color-neutral-500)] hover:text-[var(--color-accent-600)] transition-colors group">
                  See it answer a real question
                  <svg className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
                  </svg>
                </a>
              </div>
              <ScrollIndicator />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              className="relative"
            >
              <GroundingMotif className="w-full h-[400px] sm:h-[450px] md:h-[520px]" />
            </motion.div>
          </div>
        </Container>
      </section>

      {/* \u00a78.3 \u2014 Credibility */}
      <section className="py-12 overflow-hidden">
        <Container>
          <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
              <div className="flex items-center gap-3 text-sm text-[var(--color-neutral-500)]">
                <svg className="w-4 h-4 text-[var(--color-accent-600)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>No training on your data</span>
              </div>
              <div className="hidden md:block w-px h-4 bg-[var(--color-neutral-200)]" />
              <div className="flex items-center gap-3 text-sm text-[var(--color-neutral-500)]">
                <svg className="w-4 h-4 text-[var(--color-accent-600)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Live in under 10 minutes</span>
              </div>
              <div className="hidden md:block w-px h-4 bg-[var(--color-neutral-200)]" />
              <div className="flex items-center gap-3 text-sm text-[var(--color-neutral-500)]">
                <svg className="w-4 h-4 text-[var(--color-accent-600)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Sourced answers, never improvised</span>
              </div>
            </div>
            <p className="text-center text-xs text-[var(--color-neutral-400)] mt-5 italic">
              Built by engineers who got tired of writing the same FAQ answer forty times a week.
            </p>
          </motion.div>
        </Container>
      </section>

      {/* \u00a78.4 \u2014 Problem framing */}
      <section className="py-20 md:py-28 overflow-hidden">
        <Container>
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-neutral-900)] tracking-tight">
              The difference between guessing and knowing.
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] p-6 opacity-50"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-neutral-300)]" />
                <span className="text-xs font-semibold text-[var(--color-neutral-400)] uppercase tracking-wider">Generic chatbot</span>
              </div>
              <p className="text-sm text-[var(--color-neutral-500)] italic leading-relaxed">
                &ldquo;I&apos;m not sure about that. Let me connect you with a human agent who can help with your question.&rdquo;
              </p>
            </motion.div>
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-2xl border border-[var(--color-accent-200)] bg-[var(--color-neutral-0)] p-6 shadow-[0_4px_20px_-4px_rgba(0,98,72,0.1)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--color-accent-400)] via-[var(--color-accent-600)] to-[var(--color-accent-400)]" />
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-600)]" />
                <span className="text-xs font-semibold text-[var(--color-accent-600)] uppercase tracking-wider">Conversation Engine</span>
              </div>
              <p className="text-sm text-[var(--color-neutral-900)] leading-relaxed mb-4">
                &ldquo;Items must be returned within 30 days of delivery in original condition. Refunds are processed within 5\u20137 business days.&rdquo;
              </p>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium bg-[var(--color-accent-200)]/30 text-[var(--color-accent-700)] border border-[var(--color-accent-200)]">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                  Refund Policy \u2014 p.2
                </span>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      <SectionDivider />

      {/* Product Dashboard Preview */}
      <section className="py-16 md:py-20 overflow-hidden">
        <Container>
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-neutral-900)] tracking-tight">
              See the product in action.
            </h2>
            <p className="mt-3 text-base text-[var(--color-neutral-500)] max-w-lg mx-auto">
              A real dashboard. Real documentation. Real grounded answers.
            </p>
          </motion.div>
          <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }} className="max-w-4xl mx-auto">
            <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden">
              {/* Dashboard header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-neutral-200)] bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[var(--color-accent-600)] flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10l10 5 10-5V7l-10-5z"/></svg>
                  </div>
                  <span className="text-sm font-semibold text-[var(--color-neutral-900)]">Conversation Engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[var(--color-neutral-100)] flex items-center justify-center">
                    <span className="text-[10px] font-medium text-[var(--color-neutral-500)]">JD</span>
                  </div>
                </div>
              </div>
              {/* Dashboard body */}
              <div className="flex min-h-[320px]">
                {/* Sidebar */}
                <div className="hidden md:flex flex-col w-48 border-r border-[var(--color-neutral-200)] bg-white p-3 gap-1">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--color-accent-200)]/20 text-[var(--color-accent-700)] text-xs font-medium">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                    Conversations
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-50)]">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
                    Knowledge Base
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-50)]">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                    </svg>
                    Settings
                  </div>
                </div>
                {/* Main content */}
                <div className="flex-1 p-5 space-y-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white p-3">
                      <p className="text-[10px] text-[var(--color-neutral-400)] uppercase tracking-wider mb-1">Answers Today</p>
                      <p className="text-lg font-bold text-[var(--color-neutral-900)]">1,247</p>
                    </div>
                    <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white p-3">
                      <p className="text-[10px] text-[var(--color-neutral-400)] uppercase tracking-wider mb-1">Confidence</p>
                      <p className="text-lg font-bold text-[var(--color-success-500)]">96%</p>
                    </div>
                    <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white p-3">
                      <p className="text-[10px] text-[var(--color-neutral-400)] uppercase tracking-wider mb-1">Avg Response</p>
                      <p className="text-lg font-bold text-[var(--color-neutral-900)]">1.1s</p>
                    </div>
                  </div>
                  {/* Recent conversation */}
                  <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white p-4">
                    <p className="text-[10px] font-semibold text-[var(--color-neutral-400)] uppercase tracking-wider mb-3">Recent Conversation</p>
                    <div className="space-y-2.5">
                      <div className="flex justify-end">
                        <div className="px-3 py-1.5 rounded-xl rounded-br-md bg-[var(--color-accent-600)] text-white text-[11px] max-w-[70%]">
                          What is your return policy?
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="px-3 py-2 rounded-xl rounded-bl-md bg-white border border-[var(--color-neutral-200)] text-[11px] text-[var(--color-neutral-700)] max-w-[80%] shadow-sm">
                          Items must be returned within 30 days of delivery in original condition. Refunds are processed within 5\u20137 business days.
                          <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-[var(--color-neutral-200)]">
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-[var(--color-accent-200)]/30 text-[var(--color-accent-700)] border border-[var(--color-accent-200)]">
                              Refund Policy \u2014 p.2
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </Container>
      </section>

      <SectionDivider />

      {/* \u00a78.5 \u2014 Live Product Demo */}
      <section id="demo" className="py-20 md:py-28 bg-[var(--color-neutral-50)]/50">
        <Container>
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-neutral-900)] tracking-tight">
              Try it yourself.
            </h2>
            <p className="mt-3 text-base text-[var(--color-neutral-500)] max-w-lg mx-auto">
              Ask a question and watch the grounding in real time. Every answer is sourced from real documentation.
            </p>
          </motion.div>
          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.15 }}>
            <LiveDemoWidget />
          </motion.div>
        </Container>
      </section>

      {/* \u00a78.6 \u2014 How it works */}
      <section className="py-20 md:py-28 overflow-hidden">
        <Container>
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-neutral-900)] tracking-tight">
              From docs to answers.
            </h2>
          </motion.div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {howItWorksSteps.map((item, i) => (
              <motion.div
                key={item.title}
                {...fadeUp}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="relative"
              >
                <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] p-5 h-full">
                  {/* Step indicator */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold',
                      i < 3
                        ? 'bg-[var(--color-accent-200)]/40 text-[var(--color-accent-600)] border border-[var(--color-accent-200)]'
                        : 'bg-[var(--color-accent-600)] text-white'
                    )}>
                      {i + 1}
                    </div>
                    {i < 3 && (
                      <div className="flex-1 h-px bg-[var(--color-neutral-200)]" />
                    )}
                  </div>
                  {/* Mini visual */}
                  <div className="mb-3 h-14 rounded-lg bg-[var(--color-neutral-50)] border border-[var(--color-neutral-200)] flex items-center px-3 overflow-hidden">
                    {i === 0 && (
                      <div className="flex items-center gap-1.5 w-full">
                        <svg className="w-3 h-3 text-[var(--color-neutral-400)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span className="text-[11px] text-[var(--color-neutral-400)] truncate">Refund Policy, API Docs, FAQ...</span>
                      </div>
                    )}
                    {i === 1 && (
                      <div className="flex items-center gap-1.5 w-full">
                        <div className="w-2 h-2 rounded-full bg-[var(--color-accent-400)] animate-pulse" />
                        <span className="text-[11px] text-[var(--color-neutral-400)] truncate">Indexing 347 content fragments...</span>
                      </div>
                    )}
                    {i === 2 && (
                      <div className="flex items-center gap-1.5 w-full">
                        <svg className="w-3 h-3 text-[var(--color-success-500)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span className="text-[11px] text-[var(--color-neutral-500)] font-medium">Confidence: 97%</span>
                      </div>
                    )}
                    {i === 3 && (
                      <div className="flex items-center gap-1.5 w-full">
                        <span className="text-[11px] text-[var(--color-neutral-400)] font-mono truncate">&lt;script src="engine.js"&gt;</span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--color-neutral-900)] mb-1">{item.title}</h3>
                  <p className="text-xs text-[var(--color-neutral-500)] leading-relaxed">{item.description}</p>
                </div>
                {/* Connector arrow (desktop only) */}
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                    <svg className="w-5 h-5 text-[var(--color-neutral-300)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      <SectionDivider />

      {/* Architecture Diagram */}
      <section className="py-16 md:py-20 overflow-hidden">
        <Container>
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-neutral-900)] tracking-tight">
              How Conversation Engine works.
            </h2>
            <p className="mt-3 text-base text-[var(--color-neutral-500)] max-w-lg mx-auto">
              Four stages. Zero hallucination. Every answer traced to its source.
            </p>
          </motion.div>
          <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }} className="max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-0">
              {/* Stage 1: Documentation */}
              <div className="flex-1 rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] p-5 text-center relative">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-neutral-100)] flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-[var(--color-neutral-500)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-neutral-900)] mb-1">Documentation</h3>
                <p className="text-[11px] text-[var(--color-neutral-500)]">Your docs, FAQs, knowledge base</p>
                {/* Arrow (desktop) */}
                <div className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                  <svg className="w-6 h-6 text-[var(--color-neutral-300)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
                {/* Arrow (mobile) */}
                <div className="md:hidden flex justify-center py-1">
                  <svg className="w-5 h-5 text-[var(--color-neutral-300)] rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>

              {/* Stage 2: Grounding Engine */}
              <div className="flex-1 rounded-2xl border border-[var(--color-accent-200)] bg-[var(--color-neutral-0)] p-5 text-center relative shadow-[0_2px_12px_-4px_rgba(0,98,72,0.08)]">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-200)]/40 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-[var(--color-accent-600)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-neutral-900)] mb-1">Grounding Engine</h3>
                <p className="text-[11px] text-[var(--color-neutral-500)]">Semantic search + retrieval</p>
                {/* Arrow (desktop) */}
                <div className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                  <svg className="w-6 h-6 text-[var(--color-neutral-300)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
                {/* Arrow (mobile) */}
                <div className="md:hidden flex justify-center py-1">
                  <svg className="w-5 h-5 text-[var(--color-neutral-300)] rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>

              {/* Stage 3: Verified Answer */}
              <div className="flex-1 rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] p-5 text-center relative">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-success-300)]/30 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-[var(--color-success-500)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-neutral-900)] mb-1">Verified Answer</h3>
                <p className="text-[11px] text-[var(--color-neutral-500)]">Confidence-scored response</p>
                {/* Arrow (desktop) */}
                <div className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                  <svg className="w-6 h-6 text-[var(--color-neutral-300)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
                {/* Arrow (mobile) */}
                <div className="md:hidden flex justify-center py-1">
                  <svg className="w-5 h-5 text-[var(--color-neutral-300)] rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>

              {/* Stage 4: Citation */}
              <div className="flex-1 rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] p-5 text-center">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-info-300)]/30 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-[var(--color-info-500)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-neutral-900)] mb-1">Citation</h3>
                <p className="text-[11px] text-[var(--color-neutral-500)]">Source linked to every answer</p>
              </div>
            </div>
          </motion.div>
        </Container>
      </section>

      <SectionDivider />

      {/* \u00a78.7 \u2014 Capability proof */}
      <section className="py-20 md:py-28 overflow-hidden">
        <Container>
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-neutral-900)] tracking-tight">
              What it actually does.
            </h2>
            <p className="mt-3 text-base text-[var(--color-neutral-500)] max-w-lg mx-auto">
              Not feature claims. Observable outcomes.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Mockup 1: Intent matching */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0 }}
              className="rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] overflow-hidden"
            >
              <div className="px-5 pt-5 pb-4">
                <h3 className="text-base font-semibold text-[var(--color-neutral-900)] mb-1">Understands intent, not just keywords</h3>
                <p className="text-sm text-[var(--color-neutral-500)] leading-relaxed">Finds the answer even when the visitor doesn&apos;t use your exact wording.</p>
              </div>
              <div className="mx-5 mb-5 rounded-xl border border-[var(--color-neutral-200)] bg-white overflow-hidden">
                <div className="px-3 py-2 border-b border-[var(--color-neutral-200)] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-neutral-200)]" />
                  <div className="w-2 h-2 rounded-full bg-[var(--color-neutral-200)]" />
                  <div className="w-2 h-2 rounded-full bg-[var(--color-neutral-200)]" />
                  <div className="flex-1 h-5 rounded-md bg-[var(--color-neutral-50)] border border-[var(--color-neutral-200)] ml-2 flex items-center px-2">
                    <span className="text-[10px] text-[var(--color-neutral-400)]">return stuff after 30 days</span>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex justify-end">
                    <div className="px-3 py-1.5 rounded-xl rounded-br-md bg-[var(--color-accent-600)] text-white text-[11px] max-w-[80%]">
                      return stuff after 30 days
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-xl rounded-bl-md bg-white border border-[var(--color-neutral-200)] text-[11px] text-[var(--color-neutral-700)] max-w-[85%] shadow-sm">
                      Items must be returned within 30 days...
                      <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-[var(--color-neutral-200)]">
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-[var(--color-accent-200)]/30 text-[var(--color-accent-700)] border border-[var(--color-accent-200)]">
                          Refund Policy
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Mockup 2: Response time + confidence */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] overflow-hidden"
            >
              <div className="px-5 pt-5 pb-4">
                <h3 className="text-base font-semibold text-[var(--color-neutral-900)] mb-1">Responds in under 2 seconds</h3>
                <p className="text-sm text-[var(--color-neutral-500)] leading-relaxed">A sourced, confidence-scored answer \u2014 not a link to a help center.</p>
              </div>
              <div className="mx-5 mb-5 rounded-xl border border-[var(--color-neutral-200)] bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[var(--color-neutral-500)]">Retrieval time</span>
                  <span className="text-[11px] font-bold text-[var(--color-success-500)] font-mono">1.2s</span>
                </div>
                <div className="h-px bg-[var(--color-neutral-200)]" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[var(--color-neutral-500)]">Confidence</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 rounded-full bg-[var(--color-neutral-100)] overflow-hidden">
                      <div className="w-[97%] h-full rounded-full bg-[var(--color-success-500)]" />
                    </div>
                    <span className="text-[11px] font-bold text-[var(--color-success-500)]">97%</span>
                  </div>
                </div>
                <div className="h-px bg-[var(--color-neutral-200)]" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[var(--color-neutral-500)]">Sources found</span>
                  <span className="text-[11px] font-bold text-[var(--color-neutral-700)]">3 fragments</span>
                </div>
              </div>
            </motion.div>

            {/* Mockup 3: Honest fallback */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.16 }}
              className="rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] overflow-hidden"
            >
              <div className="px-5 pt-5 pb-4">
                <h3 className="text-base font-semibold text-[var(--color-neutral-900)] mb-1">Zero hallucination by design</h3>
                <p className="text-sm text-[var(--color-neutral-500)] leading-relaxed">Falls back honestly when your docs don&apos;t cover the question.</p>
              </div>
              <div className="mx-5 mb-5 rounded-xl border border-[var(--color-neutral-200)] bg-white overflow-hidden">
                <div className="p-3 space-y-2">
                  <div className="flex justify-end">
                    <div className="px-3 py-1.5 rounded-xl rounded-br-md bg-[var(--color-accent-600)] text-white text-[11px] max-w-[80%]">
                      What is quantum computing?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-xl rounded-bl-md bg-[var(--color-neutral-50)] border border-[var(--color-neutral-200)] text-[11px] text-[var(--color-neutral-500)] max-w-[85%]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <svg className="w-3 h-3 text-[var(--color-warning-500)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span className="text-[10px] font-semibold text-[var(--color-warning-600)]">Honest fallback</span>
                      </div>
                      I don&apos;t have enough information to answer that accurately.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Mockup 4: Deploy speed */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.24 }}
              className="rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] overflow-hidden"
            >
              <div className="px-5 pt-5 pb-4">
                <h3 className="text-base font-semibold text-[var(--color-neutral-900)] mb-1">Deploys in 10 minutes</h3>
                <p className="text-sm text-[var(--color-neutral-500)] leading-relaxed">One script tag. No backend changes. No complex integration.</p>
              </div>
              <div className="mx-5 mb-5 rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-900)] p-4 font-mono">
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-error-500)]" />
                  <div className="w-2 h-2 rounded-full bg-[var(--color-warning-500)]" />
                  <div className="w-2 h-2 rounded-full bg-[var(--color-success-500)]" />
                  <span className="text-[10px] text-[var(--color-neutral-500)] ml-1">index.html</span>
                </div>
                <div className="text-[11px] leading-relaxed">
                  <span className="text-[var(--color-neutral-500)]">&lt;head&gt;</span><br />
                  <span className="text-[var(--color-neutral-500)]">  &lt;!-- </span>
                  <span className="text-[var(--color-accent-400)]">Conversation Engine</span>
                  <span className="text-[var(--color-neutral-500)]"> --&gt;</span><br />
                  <span className="text-[var(--color-neutral-500)]">  &lt;script </span>
                  <span className="text-[var(--color-info-300)]">src</span>
                  <span className="text-[var(--color-neutral-500)]">=</span>
                  <span className="text-[var(--color-success-300)]">&quot;...engine.js&quot;</span>
                  <span className="text-[var(--color-neutral-500)]">&gt;&lt;/script&gt;</span><br />
                  <span className="text-[var(--color-neutral-500)]">&lt;/head&gt;</span>
                </div>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      <SectionDivider />

      {/* \u00a78.8 \u2014 Trust strip */}
      <section className="py-20 md:py-28 overflow-hidden">
        <Container>
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
            <p className="text-xs font-semibold text-[var(--color-accent-600)] uppercase tracking-widest mb-3">Enterprise Infrastructure</p>
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-neutral-900)] tracking-tight">
              Built on facts, not promises.
            </h2>
          </motion.div>
          <TrustSection />
        </Container>
      </section>

      {/* \u00a78.10 \u2014 Pricing preview */}
      <section className="py-20 md:py-28 overflow-hidden">
        <Container>
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-neutral-900)] tracking-tight">
              Transparent pricing.
            </h2>
            <p className="mt-3 text-base text-[var(--color-neutral-500)]">
              Start free. Scale when you&apos;re ready.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch max-w-5xl mx-auto">
            {previewTiers.map((tier, i) => (
              <motion.div
                key={tier.name}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={tier.popular ? 'relative lg:-translate-y-2' : ''}
              >
                <PricingCard tier={tier} />
              </motion.div>
            ))}
          </div>
          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.4 }} className="text-center mt-10">
            <Link to="/pricing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)] transition-colors group">
              Compare all features
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </motion.div>
        </Container>
      </section>

      {/* \u00a78.11 \u2014 Final CTA */}
      <section className="py-20 md:py-28 overflow-hidden">
        <Container className="text-center">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-neutral-900)] tracking-tight">
              Stop writing the same answer twice.
            </h2>
            <p className="mt-4 text-lg text-[var(--color-neutral-500)] max-w-xl mx-auto">
              Deploys in under 10 minutes. No credit card required.
            </p>
            <div className="mt-10 max-w-lg mx-auto">
              <GroundingMotif className="w-full h-[240px] md:h-[300px]" />
            </div>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup">
                <Button size="lg" glow arrow>
                  Start free
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="secondary" size="lg" arrow>Talk to Sales</Button>
              </Link>
            </div>
          </motion.div>
        </Container>
      </section>

    </div>
  );
}
