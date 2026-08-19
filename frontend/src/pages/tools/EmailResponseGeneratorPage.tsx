import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import TextGeneratorTool from '../../components/tools/TextGeneratorTool';
import { EMAIL_RESPONSE_GENERATOR } from '../../lib/tools/textgen';

const tool = getToolBySlug('email-response-generator')!;

export default function EmailResponseGeneratorPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Respond to any email in seconds — professional, warm, direct, or apologetic, ready to send."
    >
      <TextGeneratorTool
        tool={tool}
        template={EMAIL_RESPONSE_GENERATOR}
        resultLabel="Email drafts"
      />
    </GenericToolWrapper>
  );
}