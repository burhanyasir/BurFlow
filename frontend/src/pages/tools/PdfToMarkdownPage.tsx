import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ConverterTool from '../../components/tools/ConverterTool';

const tool = getToolBySlug('pdf-to-markdown')!;

export default function PdfToMarkdownPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Convert your PDF document to clean, structured Markdown — fast, free, and entirely in your browser."
    >
      <ConverterTool
        tool={tool}
        accept=".pdf,application/pdf"
        allowPaste={false}
        allowSample={false}
        note={
          <p className="text-xs text-[var(--color-neutral-400)]">
            Text is extracted locally from the PDF using its embedded text streams — nothing is uploaded. Scanned
            (image-based) PDFs can&apos;t be read this way; for those, paste the text instead or use{' '}
            <a href="/signup" className="font-semibold text-[var(--color-accent-600)]">BurFlow Free</a>.
          </p>
        }
      />
    </GenericToolWrapper>
  );
}