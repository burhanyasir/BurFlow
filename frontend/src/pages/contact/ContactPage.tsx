import { PageSection } from '../../components/ui/PageSection';
import { ContactForm } from '../../components/ui/ContactForm';

export default function ContactPage() {
  return (
    <PageSection
      title="Get in Touch with Our Team"
      description="Have questions regarding enterprise options, custom SLAs, or system architecture? We are here to assist."
      size="md"
      className="pt-20 md:pt-28"
    >
      <div className="max-w-xl mx-auto">
        <ContactForm />
      </div>
    </PageSection>
  );
}
