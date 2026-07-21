import { motion } from 'framer-motion';
import { PageSection } from '../../components/ui/PageSection';
import { ParticleField } from '../../components/effects/ParticleField';
import '../../styles/effects.css';

const features = [
  { title: 'Knowledge-Aware Intelligence', description: 'Answers are ground-referenced strictly against your verified documentation, file uploads, and web content. Zero guesswork, zero off-topic responses.', icon: 'brain' },
  { title: '10-Minute Embed Deployment', description: 'Integration requires zero complex engineering. Copy a single snippet into your site header to go live immediately.', icon: 'zap' },
  { title: 'Pure White-Label Architecture', description: 'Maintain total brand integrity. Customize colors, logos, typography, widget positioning, and custom domain endpoints effortlessly.', icon: 'eye' },
  { title: 'Multi-Tenant Workspace Control', description: 'Manage multiple client environments or brand portfolios from a unified dashboard with granular team roles and access controls.', icon: 'layers' },
  { title: 'Real-Time Analytics & Operational Insights', description: 'Track conversation volume, token usage, user query trends, and knowledge coverage in real time.', icon: 'chart' },
  { title: 'Data Sovereignty & Security', description: 'Your data remains entirely yours. Enterprise-grade isolation ensures customer information is never trained into public models.', icon: 'shield' }
];

const icons: Record<string, JSX.Element> = {
  brain: <svg className="h-8 w-8 text-[#5865F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4z" /><path d="M20 12a8 8 0 01-16 0" /><path d="M12 22v-4" /><path d="M8 14h8" /></svg>,
  zap: <svg className="h-8 w-8 text-[#5865F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 4 14 12 14 11 22 20 10 12 10 13 2" /></svg>,
  eye: <svg className="h-8 w-8 text-[#5865F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  layers: <svg className="h-8 w-8 text-[#5865F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>,
  chart: <svg className="h-8 w-8 text-[#5865F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
  shield: <svg className="h-8 w-8 text-[#5865F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
};

export default function FeaturesPage() {
  return (
    <div className="page-content">
      <div className="ambient-gradient" aria-hidden="true" />
      <ParticleField />
      <PageSection
        title="Enterprise AI Infrastructure Built for Uncompromising Brands."
        size="lg"
        className="pt-20 md:pt-28"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card rounded-xl p-6 md:p-8 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E8EAFF] to-[#D0D5FF] flex items-center justify-center mb-5 shadow-sm">
                {icons[f.icon]}
              </div>
              <h3 className="text-lg font-semibold text-[#0B0C10] mb-3">{f.title}</h3>
              <p className="text-sm text-[#5F6570] leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </PageSection>
    </div>
  );
}
