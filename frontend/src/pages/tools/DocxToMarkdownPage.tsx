import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ConverterTool from '../../components/tools/ConverterTool';

const tool = getToolBySlug('docx-to-markdown')!;

export default function DocxToMarkdownPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Convert your Word document to clean, structured Markdown — headings, lists, and paragraphs preserved."
    >
      <ConverterTool
        tool={tool}
        accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        allowPaste={false}
        allowSample={false}
        note={
          <p className="text-xs text-[var(--color-neutral-400)]">
            The .docx file is unpacked and read locally in your browser — it never leaves your machine.
          </p>
        }
      />
    </GenericToolWrapper>
  );
}