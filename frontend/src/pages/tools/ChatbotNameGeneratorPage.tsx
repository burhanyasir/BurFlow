import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import NameGeneratorTool from '../../components/tools/NameGeneratorTool';

const tool = getToolBySlug('chatbot-name-generator')!;

export default function ChatbotNameGeneratorPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Generate catchy, brandable names for your AI chatbot in seconds — powered by curated word banks."
    >
      <NameGeneratorTool
        tool={tool}
        kind="chatbot"
        seedLabel="Business name or seed word"
        seedPlaceholder="e.g. your brand, industry, or a keyword"
        resultLabel="Chatbot name ideas"
      />
    </GenericToolWrapper>
  );
}