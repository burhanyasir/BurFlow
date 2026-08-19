import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ConverterTool from '../../components/tools/ConverterTool';

const tool = getToolBySlug('paste-to-markdown')!;

export default function PasteToMarkdownPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Convert any pasted text to clean, structured Markdown — auto-detects HTML, CSV, JSON, and XML too."
    >
      <ConverterTool
        tool={tool}
        allowSample={false}
        placeholder="Paste any text here — URLs become links, paragraphs become clean Markdown…"
        resultLabel="Markdown"
      />
    </GenericToolWrapper>
  );
}