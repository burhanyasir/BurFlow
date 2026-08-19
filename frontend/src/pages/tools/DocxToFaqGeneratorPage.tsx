import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import FaqSourceTool from '../../components/tools/FaqSourceTool';

const tool = getToolBySlug('docx-to-faq-generator')!;

export default function DocxToFaqGeneratorPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Upload a Word document and instantly generate a clean FAQ from its content — local, fast, and free."
    >
      <FaqSourceTool
        tool={tool}
        accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        note={
          <p className="text-xs text-[var(--color-neutral-400)]">
            Upload a .docx file (user guide, onboarding doc, product brief…) and the generator reads its text locally
            in your browser and builds the question set — nothing is uploaded.
          </p>
        }
      />
    </GenericToolWrapper>
  );
}