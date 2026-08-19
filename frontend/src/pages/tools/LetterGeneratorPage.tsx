import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import TextGeneratorTool from '../../components/tools/TextGeneratorTool';
import { LETTER_GENERATOR } from '../../lib/tools/textgen';

const tool = getToolBySlug('letter-generator')!;

export default function LetterGeneratorPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Write any letter in minutes — cover letters, business letters, and personal letters with the right structure."
    >
      <TextGeneratorTool
        tool={tool}
        template={LETTER_GENERATOR}
        resultLabel="Letter"
      />
    </GenericToolWrapper>
  );
}