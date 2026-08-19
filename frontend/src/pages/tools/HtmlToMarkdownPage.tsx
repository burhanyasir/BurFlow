import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ConverterTool from '../../components/tools/ConverterTool';

const tool = getToolBySlug('html-to-markdown')!;

export default function HtmlToMarkdownPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Convert your HTML file to clean, structured Markdown — links, lists, headings, and tables preserved."
    >
      <ConverterTool
        tool={tool}
        accept=".html,.htm,text/html"
        acceptFormats={['html']}
        placeholder="Paste HTML here…"
        sampleFormat="html"
      />
    </GenericToolWrapper>
  );
}