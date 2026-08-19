import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import NameGeneratorTool from '../../components/tools/NameGeneratorTool';

const tool = getToolBySlug('saas-brand-name-generator')!;

export default function SaasBrandNameGeneratorPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Generate modern, brandable SaaS company names in seconds — short, memorable, and ready for the .com."
    >
      <NameGeneratorTool
        tool={tool}
        kind="brand"
        seedLabel="Seed word or industry"
        seedPlaceholder="e.g. analytics, hiring, payments…"
        resultLabel="Brand name ideas"
      />
    </GenericToolWrapper>
  );
}