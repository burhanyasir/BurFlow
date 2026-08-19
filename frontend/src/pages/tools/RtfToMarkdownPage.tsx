import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ConverterTool from '../../components/tools/ConverterTool';

const tool = getToolBySlug('rtf-to-markdown')!;

export default function RtfToMarkdownPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Convert your RTF document to clean, structured Markdown — fast, free, and private."
    >
      <ConverterTool
        tool={tool}
        accept=".rtf,application/rtf"
        acceptFormats={['rtf']}
        placeholder="Paste RTF source here… (or upload a .rtf file)"
        allowSample={false}
      />
    </GenericToolWrapper>
  );
}