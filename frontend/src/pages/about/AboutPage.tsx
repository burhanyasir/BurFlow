import { motion } from 'framer-motion';
import { PageSection } from '../../components/ui/PageSection';

const principles = [
  { title: 'Factual Integrity', description: 'Answers grounded solely in verified knowledge sources.', icon: 'check' },
  { title: 'Total Sovereignty', description: 'Your brand, your domain, and your customer data remain yours.', icon: 'shield' },
  { title: 'Operational Clarity', description: 'Simple onboarding, transparent pricing, and predictable scaling.', icon: 'zap' }
];

const icons: Record<string, React.ReactNode> = {
  check: <svg className="h-6 w-6 text-[var(--color-accent-600)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  shield: <svg className="h-6 w-6 text-[var(--color-accent-600)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  zap: <svg className="h-6 w-6 text-[var(--color-accent-600)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 4 14 12 14 11 22 20 10 12 10 13 2" /></svg>
};

export default function AboutPage() {
  return (
    <div>
      <PageSection
        title="Democratizing Precision AI Support for Modern Businesses."
        size="lg"
        className="pt-20 md:pt-28"
        containerClassName="max-w-4xl"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="bg-[var(--color-neutral-0)] shadow-sm border border-[var(--color-neutral-200)] rounded-2xl p-8 md:p-12 mb-12 shadow-sm hover:shadow-md transition-shadow duration-300">
            <p className="text-lg md:text-xl text-[var(--color-neutral-500)] leading-relaxed">
              Conversation Engine provides organizations with immediate, automated customer assistance powered exclusively by their proprietary knowledge. We believe customer service automation should be trustworthy, accurate, and completely aligned with your brand identity.
            </p>
          </div>

          <h3 className="text-xl font-semibold text-[var(--color-neutral-900)] mb-6 text-center">Core Principles</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {principles.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-[var(--color-neutral-0)] shadow-sm border border-[var(--color-neutral-200)] rounded-xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--color-accent-200)] to-[var(--color-accent-200)] flex items-center justify-center mb-4 shadow-sm">
                  {icons[p.icon]}
                </div>
                <h4 className="font-semibold text-[var(--color-neutral-900)] mb-2">{p.title}</h4>
                <p className="text-sm text-[var(--color-neutral-500)] leading-relaxed">{p.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </PageSection>
    </div>
  );
}
