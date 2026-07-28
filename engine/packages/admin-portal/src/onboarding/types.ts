export type OnboardingStepId =
  | 'workspace'
  | 'business_type'
  | 'website'
  | 'brand_color'
  | 'logo'
  | 'knowledge_source'
  | 'widget_install'
  | 'test_chatbot';

export interface OnboardingProgress {
  tenantId: string;
  completedSteps: OnboardingStepId[];
  currentStep: OnboardingStepId | null;
  businessType?: string;
  primaryWebsite?: string;
  demoDataLoaded: boolean;
  widgetInstalled: boolean;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface WizardStep {
  id: OnboardingStepId;
  label: string;
  description: string;
}

export const ONBOARDING_STEPS: WizardStep[] = [
  { id: 'workspace', label: 'Workspace Name', description: 'Name your workspace' },
  { id: 'business_type', label: 'Business Type', description: 'Tell us about your business' },
  { id: 'website', label: 'Primary Website', description: 'Your website URL' },
  { id: 'brand_color', label: 'Brand Color', description: 'Choose your brand color' },
  { id: 'logo', label: 'Logo', description: 'Upload your logo' },
  { id: 'knowledge_source', label: 'Knowledge Source', description: 'Add your first knowledge' },
  { id: 'widget_install', label: 'Widget Installation', description: 'Install the chat widget' },
  { id: 'test_chatbot', label: 'Test Chatbot', description: 'Test your chatbot' },
];

export const ONBOARDING_STEP_LABELS: Record<OnboardingStepId, string> = {
  workspace: 'Create Workspace',
  business_type: 'Set Business Type',
  website: 'Add Website',
  brand_color: 'Choose Brand Color',
  logo: 'Upload Logo',
  knowledge_source: 'Upload Knowledge',
  widget_install: 'Install Widget',
  test_chatbot: 'Test Chatbot',
};
