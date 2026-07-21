import { motion } from 'framer-motion';
import { PageSection } from '../../components/ui/PageSection';
import { Accordion } from '../../components/ui/Accordion';
import type { AccordionItem } from '../../components/ui/Accordion';
import { ParticleField } from '../../components/effects/ParticleField';
import '../../styles/effects.css';

const faqItems: AccordionItem[] = [
  { id: 'hallucination', trigger: 'How does Conversation Engine prevent incorrect or hallucinated answers?', content: 'Conversation Engine restricts responses strictly to the contents of your published Knowledge Bases. If a visitor inquiry falls outside your source material, the widget returns a custom offline fallback response rather than generating speculative answers.' },
  { id: 'setup-time', trigger: 'How fast can we set up and launch?', content: 'Most teams deploy in under 10 minutes. Simply create a workspace, upload your existing PDF, text, or FAQ files, customize your widget colors, and paste the embed script on your site.' },
  { id: 'branding', trigger: 'Can we remove all Conversation Engine branding?', content: 'Yes. Professional and Enterprise tiers include complete white-label customization. You can adjust theme colors, upload custom icons, modify messaging, and disable platform attribution completely.' },
  { id: 'overage', trigger: 'What happens if our message volume exceeds our monthly allocation?', content: 'We track your usage transparently. You will receive automatic usage warnings at 80% and 100% capacity. You can upgrade your tier instantly from your dashboard without service disruption.' }
];

export default function FAQPage() {
  return (
    <div className="page-content">
      <div className="ambient-gradient" aria-hidden="true" />
      <ParticleField />
      <PageSection
        title="Frequently Asked Questions"
        size="md"
        className="pt-20 md:pt-28"
        containerClassName="max-w-2xl"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Accordion items={faqItems} />
        </motion.div>
      </PageSection>
    </div>
  );
}
