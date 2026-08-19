import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ConverterTool from '../../components/tools/ConverterTool';

const tool = getToolBySlug('csv-to-markdown')!;

export default function CsvToMarkdownPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Convert your CSV file to a clean, GitHub-style Markdown table — instantly and free."
    >
      <ConverterTool
        tool={tool}
        accept=".csv,text/csv"
        acceptFormats={['csv']}
        placeholder="Paste CSV data here…"
        sampleFormat="csv"
      />
    </GenericToolWrapper>
  );
}