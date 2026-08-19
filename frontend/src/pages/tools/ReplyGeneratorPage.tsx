import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import TextGeneratorTool from '../../components/tools/TextGeneratorTool';
import { REPLY_GENERATOR } from '../../lib/tools/textgen';

const tool = getToolBySlug('reply-generator')!;

export default function ReplyGeneratorPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Never stare at a blank reply box again — generate 3 polished, on-brand responses in seconds."
    >
      <TextGeneratorTool
        tool={tool}
        template={REPLY_GENERATOR}
        resultLabel="Draft replies"
      />
    </GenericToolWrapper>
  );
}