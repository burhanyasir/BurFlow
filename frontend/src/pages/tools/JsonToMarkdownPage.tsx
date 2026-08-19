import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ConverterTool from '../../components/tools/ConverterTool';

const tool = getToolBySlug('json-to-markdown')!;

export default function JsonToMarkdownPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Convert your JSON data to well-formatted, readable Markdown — arrays of objects become tables."
    >
      <ConverterTool
        tool={tool}
        accept=".json,application/json"
        acceptFormats={['json']}
        placeholder="Paste JSON here…"
        sampleFormat="json"
      />
    </GenericToolWrapper>
  );
}