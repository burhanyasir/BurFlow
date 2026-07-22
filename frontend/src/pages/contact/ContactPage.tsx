import { motion } from 'framer-motion';
import { PageSection } from '../../components/ui/PageSection';
import { ContactForm } from '../../components/ui/ContactForm';

export default function ContactPage() {
  return (
    <>
      <PageSection
        title="Get in Touch with Our Team"
        description="Have questions regarding enterprise options, custom SLAs, or system architecture? We are here to assist."
        size="md"
        className="pt-20 md:pt-28"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-xl mx-auto bg-[var(--color-neutral-0)] shadow-sm border border-[var(--color-neutral-200)] rounded-2xl p-6 md:p-10 shadow-sm hover:shadow-md transition-shadow duration-300"
        >
          <ContactForm />
        </motion.div>
      </PageSection>
    </>
  );
}
