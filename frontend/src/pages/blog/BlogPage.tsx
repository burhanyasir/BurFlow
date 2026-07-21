import { motion } from 'framer-motion';
import { PageSection } from '../../components/ui/PageSection';
import { EmptyState } from '../../components/ui/EmptyState';
import { ParticleField } from '../../components/effects/ParticleField';
import '../../styles/effects.css';

export default function BlogPage() {
  return (
    <div className="page-content">
      <div className="ambient-gradient" aria-hidden="true" />
      <ParticleField />
      <PageSection className="pt-20 md:pt-28" containerClassName="max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <EmptyState
            icon={
              <svg className="h-12 w-12 text-[#5865F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /><line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            }
            title="Coming Soon"
            description="Our blog is under construction. Check back for product updates, engineering deep dives, and industry insights."
            size="lg"
          />
        </motion.div>
      </PageSection>
    </div>
  );
}
