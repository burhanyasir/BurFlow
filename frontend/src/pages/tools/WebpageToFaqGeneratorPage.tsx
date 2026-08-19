import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import FaqSourceTool from '../../components/tools/FaqSourceTool';

const tool = getToolBySlug('webpage-to-faq-generator')!;

export default function WebpageToFaqGeneratorPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Turn any webpage into a ready-to-publish FAQ — paste a URL or the page text and get questions in seconds."
    >
      <FaqSourceTool
        tool={tool}
        urlLabel="Webpage URL"
        urlPlaceholder="https://example.com/article"
      />
    </GenericToolWrapper>
  );
}