import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import TextGeneratorTool from '../../components/tools/TextGeneratorTool';
import { BLOG_TITLE_GENERATOR } from '../../lib/tools/textgen';

const tool = getToolBySlug('blog-title-generator')!;

export default function BlogTitleGeneratorPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Generate click-worthy blog titles in seconds — pick an angle and get 3 strong options instantly."
    >
      <TextGeneratorTool
        tool={tool}
        template={BLOG_TITLE_GENERATOR}
        resultLabel="Blog titles"
      />
    </GenericToolWrapper>
  );
}