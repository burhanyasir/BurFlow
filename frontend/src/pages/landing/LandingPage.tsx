import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Container } from '../../layouts/Container';
import { PageSection } from '../../components/ui/PageSection';
import { ParticleField } from '../../components/effects/ParticleField';
import { WidgetPreview } from '../../components/effects/WidgetPreview';
import '../../styles/effects.css';

const KnowledgeCore = lazy(() => import('../../components/effects/KnowledgeCore').then(m => ({ default: m.KnowledgeCore })));

const fadeUp = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-50px' } };

const features = [
  { title: 'Knowledge-Aware Intelligence', description: 'Answers are ground-referenced strictly against your verified documentation, file uploads, and web content. Zero guesswork, zero off-topic responses.', icon: 'brain' },
  { title: '10-Minute Embed Deployment', description: 'Integration requires zero complex engineering. Copy a single snippet into your site header to go live immediately.', icon: 'zap' },
  { title: 'Pure White-Label Architecture', description: 'Maintain total brand integrity. Customize colors, logos, typography, widget positioning, and custom domain endpoints effortlessly.', icon: 'eye' }
];

const trustItems = [
  { title: 'Enterprise Security', description: 'Your data remains entirely yours. Enterprise-grade isolation ensures customer information is never trained into public models.', icon: 'shield' },
  { title: 'White-Label', description: 'Maintain total brand integrity with custom colors, logos, typography, and custom domain endpoints.', icon: 'eye' },
  { title: 'Multi-Tenant', description: 'Manage multiple client environments or brand portfolios from a unified dashboard with granular team roles.', icon: 'layers' },
  { title: 'Analytics', description: 'Track conversation volume, token usage, user query trends, and knowledge coverage in real time.', icon: 'chart' },
  { title: 'Knowledge Accuracy', description: 'Answers are ground-referenced strictly against your verified documentation. Zero guesswork, zero off-topic responses.', icon: 'brain' }
];

const featureIcons: Record<string, JSX.Element> = {
  brain: <svg className="h-6 w-6 text-[#5865F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4z" /><path d="M20 12a8 8 0 01-16 0" /><path d="M12 22v-4" /><path d="M8 14h8" /></svg>,
  zap: <svg className="h-6 w-6 text-[#5865F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 4 14 12 14 11 22 20 10 12 10 13 2" /></svg>,
  eye: <svg className="h-6 w-6 text-[#5865F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  shield: <svg className="h-6 w-6 text-[#5865F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  layers: <svg className="h-6 w-6 text-[#5865F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>,
  chart: <svg className="h-6 w-6 text-[#5865F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
};

export default function LandingPage() {
  return (
    <div className="page-content">
      <div className="ambient-gradient" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />
      <ParticleField />

      <section className="relative overflow-hidden pt-16 pb-12 md:pt-24 md:pb-20">
        <div className="hero-glow" style={{ top: '10%', left: '50%', transform: 'translateX(-50%)' }} aria-hidden="true" />
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[50vh] lg:min-h-[70vh]">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[#E8EAFF] text-[#3B45A0] mb-6"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#5865F2]" />
                AI-Powered Customer Support
              </motion.div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[#0B0C10] leading-[1.08]">
                Instant Support Driven by{' '}
                <span className="bg-gradient-to-r from-[#5865F2] to-[#00F0FF] bg-clip-text text-transparent">Your Knowledge Base.</span>
              </h1>
              <p className="mt-6 text-lg md:text-xl text-[#5F6570] leading-relaxed max-w-xl">
                Deploy a fully white-labeled, intelligent chat assistant in under 10 minutes. Deliver precise, real-time answers drawn directly from your documentation without hallucination risks.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-start gap-4">
                <Link to="/signup">
                  <Button size="lg" className="shadow-xl shadow-[#5865F2]/20 hover:shadow-[#5865F2]/30 transition-shadow">
                    Start Free Trial
                  </Button>
                </Link>
                <Link to="/features">
                  <Button variant="secondary" size="lg">Explore Capabilities</Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              className="relative h-[300px] sm:h-[350px] md:h-[500px]"
            >
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-2 border-[#5865F2] border-t-transparent animate-spin" />
                </div>
              }>
                <KnowledgeCore className="absolute inset-0" />
              </Suspense>
            </motion.div>
          </div>
        </Container>
      </section>

      <PageSection align="center" size="lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="glass-card rounded-xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#E8EAFF] to-[#D0D5FF] flex items-center justify-center mb-4 shadow-sm">
                {featureIcons[f.icon]}
              </div>
              <h3 className="text-lg font-semibold text-[#0B0C10] mb-2">{f.title}</h3>
              <p className="text-sm text-[#5F6570] leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </PageSection>

      <PageSection
        title="Enterprise AI Infrastructure Built for Uncompromising Brands."
        size="lg"
      >
        <div className="max-w-3xl mx-auto">
          <WidgetPreview />
        </div>
        <div className="mt-10 text-center">
          <p className="text-sm text-[#5F6570] mb-4">Try the interactive widget customizer</p>
          <div className="flex items-center justify-center gap-2 text-xs text-[#A0A5B0]">
            <span>Click theme colors to switch</span>
            <span className="w-1 h-1 rounded-full bg-[#D0D5DD]" />
            <span>Toggle chat preview</span>
            <span className="w-1 h-1 rounded-full bg-[#D0D5DD]" />
            <span>Simulate fallback response</span>
          </div>
        </div>
      </PageSection>

      <section className="py-16 md:py-24 overflow-hidden">
        <Container>
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-[#0B0C10] tracking-tight">
              Built for Enterprise Demands
            </h2>
            <p className="mt-3 text-base text-[#5F6570] max-w-lg mx-auto">
              Every feature designed for security, scale, and brand integrity.
            </p>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {trustItems.map((item, i) => (
              <motion.div
                key={item.title}
                {...fadeUp}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="glass-card rounded-xl p-5 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#E8EAFF] to-[#D0D5FF] flex items-center justify-center mx-auto mb-3 shadow-sm">
                  {featureIcons[item.icon]}
                </div>
                <h3 className="text-sm font-semibold text-[#0B0C10] mb-1.5">{item.title}</h3>
                <p className="text-xs text-[#5F6570] leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-24 bg-gradient-to-b from-transparent via-[#F0F3FF]/50 to-transparent">
        <Container className="text-center">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
            <h2 className="text-2xl md:text-3xl font-bold text-[#0B0C10] tracking-tight">
              Ready to Transform Your Customer Support?
            </h2>
            <p className="mt-4 text-lg text-[#5F6570] max-w-xl mx-auto">
              Join teams that trust Conversation Engine for precise, brand-aligned customer assistance.
            </p>
            <div className="mt-8">
              <Link to="/signup">
                <Button size="lg" className="shadow-xl shadow-[#5865F2]/20 hover:shadow-[#5865F2]/30 transition-shadow">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </motion.div>
        </Container>
      </section>
    </div>
  );
}
