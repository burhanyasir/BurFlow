import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import TextGeneratorTool from '../../components/tools/TextGeneratorTool';
import { CUSTOMER_SERVICE_SCRIPT_GENERATOR } from '../../lib/tools/textgen';

const tool = getToolBySlug('customer-service-script-generator')!;

export default function CustomerServiceScriptGeneratorPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Turn any support situation into a calm, structured customer service script — de-escalate, resolve, and close."
    >
      <TextGeneratorTool
        tool={tool}
        template={CUSTOMER_SERVICE_SCRIPT_GENERATOR}
        resultLabel="Service scripts"
      />
    </GenericToolWrapper>
  );
}