import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import FaqSourceTool from '../../components/tools/FaqSourceTool';

const tool = getToolBySlug('google-docs-to-faq-generator')!;

export default function GoogleDocsToFaqGeneratorPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Generate an instant FAQ from any public Google Doc — paste the link and get questions in seconds."
    >
      <FaqSourceTool
        tool={tool}
        urlLabel="Google Docs URL"
        urlPlaceholder="https://docs.google.com/document/d/…"
        note={
          <p className="text-xs text-[var(--color-neutral-400)]">
            The document must be shared with “Anyone with the link can view”. If Google blocks cross-origin browser
            access, paste the document text instead — it always works and never leaves your machine.
          </p>
        }
      />
    </GenericToolWrapper>
  );
}