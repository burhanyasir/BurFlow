import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Container } from '../../layouts/Container';
import { PageSection } from '../../components/ui/PageSection';

const features = [
  {
    title: 'Knowledge-Aware Intelligence',
    description: 'Answers are ground-referenced strictly against your verified documentation, file uploads, and web content. Zero guesswork, zero off-topic responses.',
    icon: 'brain'
  },
  {
    title: '10-Minute Embed Deployment',
    description: 'Integration requires zero complex engineering. Copy a single snippet into your site header to go live immediately.',
    icon: 'zap'
  },
  {
    title: 'Pure White-Label Architecture',
    description: 'Maintain total brand integrity. Customize colors, logos, typography, widget positioning, and custom domain endpoints effortlessly.',
    icon: 'eye'
  }
];

const featureIcons: Record<string, JSX.Element> = {
  brain: (
    <svg className="h-6 w-6 text-[#5865F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4z" /><path d="M20 12a8 8 0 01-16 0" /><path d="M12 22v-4" /><path d="M8 14h8" />
    </svg>
  ),
  zap: (
    <svg className="h-6 w-6 text-[#5865F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 4 14 12 14 11 22 20 10 12 10 13 2" />
    </svg>
  ),
  eye: (
    <svg className="h-6 w-6 text-[#5865F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  )
};

export default function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F0F3FF] via-white to-white pointer-events-none" />
        <Container className="relative">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="max-w-3xl mx-auto text-center"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[#0B0C10] leading-[1.1]">
              Instant Support Driven by Your Knowledge Base.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-[#5F6570] leading-relaxed max-w-2xl mx-auto">
              Deploy a fully white-labeled, intelligent chat assistant in under 10 minutes. Deliver precise, real-time answers drawn directly from your documentation without hallucination risks.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup">
                <Button size="lg">Start Free Trial</Button>
              </Link>
              <Link to="/features">
                <Button variant="secondary" size="lg">Explore Capabilities</Button>
              </Link>
            </div>
          </motion.div>
        </Container>
      </section>

      <PageSection align="center" size="lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-6 rounded-xl border border-[#D0D5DD] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-lg bg-[#E8EAFF] flex items-center justify-center mb-4">
                {featureIcons[f.icon]}
              </div>
              <h3 className="text-lg font-semibold text-[#0B0C10] mb-2">{f.title}</h3>
              <p className="text-sm text-[#5F6570] leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </PageSection>

      <section className="py-16 md:py-24 bg-gradient-to-b from-white to-[#F0F3FF]">
        <Container className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#0B0C10] tracking-tight">
            Ready to Transform Your Customer Support?
          </h2>
          <p className="mt-4 text-lg text-[#5F6570] max-w-xl mx-auto">
            Join teams that trust Conversation Engine for precise, brand-aligned customer assistance.
          </p>
          <div className="mt-8">
            <Link to="/signup">
              <Button size="lg">Start Free Trial</Button>
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
