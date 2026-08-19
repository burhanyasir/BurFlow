import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import FaqSourceTool from '../../components/tools/FaqSourceTool';

const tool = getToolBySlug('html-to-faq-generator')!;

export default function HtmlToFaqGeneratorPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Paste an HTML page or upload an .html file and instantly generate a clean FAQ from its content."
    >
      <FaqSourceTool
        tool={tool}
        accept=".html,.htm,text/html"
        note={
          <p className="text-xs text-[var(--color-neutral-400)]">
            Paste the source of any HTML page (or upload the file) — headings, paragraphs, and lists are read and
            turned into the questions your readers will ask.
          </p>
        }
      />
    </GenericToolWrapper>
  );
}