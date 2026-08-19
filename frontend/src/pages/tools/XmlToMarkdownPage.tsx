import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ConverterTool from '../../components/tools/ConverterTool';

const tool = getToolBySlug('xml-to-markdown')!;

export default function XmlToMarkdownPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Upload any XML document and convert it to readable Markdown instantly — perfect for data transformation and documentation."
    >
      <ConverterTool
        tool={tool}
        accept=".xml,application/xml,text/xml"
        acceptFormats={['xml']}
        placeholder="Paste XML here…"
        sampleFormat="xml"
      />
    </GenericToolWrapper>
  );
}