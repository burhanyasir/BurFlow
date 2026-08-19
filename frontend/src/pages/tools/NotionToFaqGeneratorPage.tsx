import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import FaqSourceTool from '../../components/tools/FaqSourceTool';

const tool = getToolBySlug('notion-to-faq-generator')!;

export default function NotionToFaqGeneratorPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Generate an instant FAQ from any public Notion page — paste the link and get questions in seconds."
    >
      <FaqSourceTool
        tool={tool}
        urlLabel="Notion page URL"
        urlPlaceholder="https://your-workspace.notion.site/page-id"
        note={
          <p className="text-xs text-[var(--color-neutral-400)]">
            The page must be shared with “Anyone with the link”. If Notion blocks cross-origin browser access, paste
            the page text instead — it always works and never leaves your machine.
          </p>
        }
      />
    </GenericToolWrapper>
  );
}