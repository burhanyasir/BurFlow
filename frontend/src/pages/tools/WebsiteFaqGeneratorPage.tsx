import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import FaqSourceTool from '../../components/tools/FaqSourceTool';

const tool = getToolBySlug('website-faq-generator')!;

export default function WebsiteFaqGeneratorPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Generate a complete FAQ for your website from your product description — questions your visitors are actually asking."
    >
      <FaqSourceTool
        tool={tool}
        maxUrls={3}
        urlLabel="Website URL"
        urlPlaceholder="https://yourwebsite.com"
        note={
          <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-4 text-xs leading-relaxed text-[var(--color-neutral-500)]">
            <p>
              Add up to 3 pages of your site (home, pricing, FAQ, support…). The generator extracts the content and
              builds questions around what visitors ask at each stage: what it is, how it works, pricing, setup, and
              support. When a URL is blocked, it falls back to a topic-based question set from your domain name.
            </p>
          </div>
        }
      />
    </GenericToolWrapper>
  );
}