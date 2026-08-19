import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import FaqSourceTool from '../../components/tools/FaqSourceTool';

const tool = getToolBySlug('pdf-to-faq-generator')!;

export default function PdfToFaqGeneratorPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Upload a PDF and instantly generate a clean FAQ from its content — no typing, no AI account needed."
    >
      <FaqSourceTool
        tool={tool}
        accept=".pdf,application/pdf"
        note={
          <p className="text-xs text-[var(--color-neutral-400)]">
            Upload a PDF (whitepaper, manual, report, proposal…) and the generator reads its text locally and builds
            questions your readers will ask. Text-based PDFs work best; scanned images aren&apos;t readable this way.
          </p>
        }
      />
    </GenericToolWrapper>
  );
}