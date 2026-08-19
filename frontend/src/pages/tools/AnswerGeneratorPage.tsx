import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import TextGeneratorTool from '../../components/tools/TextGeneratorTool';
import { ANSWER_GENERATOR } from '../../lib/tools/textgen';

const tool = getToolBySlug('answer-generator')!;

export default function AnswerGeneratorPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Get a clear, well-structured answer to any question — quick, balanced, or detailed."
    >
      <TextGeneratorTool
        tool={tool}
        template={ANSWER_GENERATOR}
        resultLabel="Answer"
      />
    </GenericToolWrapper>
  );
}