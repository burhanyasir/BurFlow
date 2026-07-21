import { PageSection } from '../../components/ui/PageSection';

const principles = [
  {
    title: 'Factual Integrity',
    description: 'Answers grounded solely in verified knowledge sources.'
  },
  {
    title: 'Total Sovereignty',
    description: 'Your brand, your domain, and your customer data remain yours.'
  },
  {
    title: 'Operational Clarity',
    description: 'Simple onboarding, transparent pricing, and predictable scaling.'
  }
];

export default function AboutPage() {
  return (
    <PageSection
      title="Democratizing Precision AI Support for Modern Businesses."
      size="lg"
      className="pt-20 md:pt-28"
    >
      <div className="max-w-3xl mx-auto">
        <p className="text-lg text-[#5F6570] leading-relaxed mb-12">
          Conversation Engine provides organizations with immediate, automated customer assistance powered exclusively by their proprietary knowledge. We believe customer service automation should be trustworthy, accurate, and completely aligned with your brand identity.
        </p>

        <h3 className="text-xl font-semibold text-[#0B0C10] mb-6">Core Principles</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {principles.map(p => (
            <div key={p.title} className="p-6 rounded-xl border border-[#D0D5DD] bg-[#F8F9FA]">
              <h4 className="font-semibold text-[#0B0C10] mb-2">{p.title}</h4>
              <p className="text-sm text-[#5F6570] leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </PageSection>
  );
}
