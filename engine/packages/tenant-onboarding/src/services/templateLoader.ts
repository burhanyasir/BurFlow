// Dynamic access to universal-customer-journey to avoid hard dependency at package import time
export type TemplateBundle = {
  journeys: any;
  buttons: string[];
  widgetDefaults: any;
  recommendedAIModules: string[];
  knowledgeCategories: string[];
  installDefaults: any;
};

const commonWidgetDefaults = {
  position: 'bottom-right',
  theme: 'light',
  color: '#0066ff',
  welcome: 'Hi, how can we help?',
  language: 'en',
};

export function loadTemplate(businessType: string, overrides: any = {}): TemplateBundle {
  // attempt dynamic import of the universal journey engine, fallback to minimalist defaults
  let journeyTemplate: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ucj = require('../../conversation-orchestrator/src/universal-customer-journey');
    const profile = ucj.createDefaultBusinessProfile({ businessType: businessType as any });
    journeyTemplate = ucj.getJourneyTemplateForProfile(profile as any);
  } catch (e) {
    journeyTemplate = { ctas: [], stages: [] };
  }

  // Buttons heuristic from journey ctas
  const buttons = (journeyTemplate.ctas || []).slice(0, 6);

  // Recommended AI modules per business type
  const recommendedAIModules: Record<string, string[]> = {
    saas: ['lead_qualification', 'pricing_advisor', 'demo_scheduler'],
    shopify: ['ecommerce_assistant', 'order_tracking', 'shipping_helper'],
    dental: ['booking', 'insurance_helper', 'patient_triage'],
    healthcare: ['booking', 'eligibility_check', 'patient_triage'],
    legal: ['intake', 'document_helper'],
    agency: ['proposal_generator', 'case_studies'],
    restaurant: ['reservation', 'menu_assistant', 'order_support'],
    hotel: ['availability', 'booking_support'],
    education: ['course_finder', 'enrollment_helper'],
    real_estate: ['listing_helper', 'tour_scheduler'],
    manufacturing: ['quote_helper', 'spec_collector'],
    consulting: ['assessment', 'proposal_helper'],
    generic: ['faq', 'lead_qualification'],
  };

  const knowledgeCategoriesMap: Record<string, string[]> = {
    saas: ['API docs', 'Pricing', 'Tutorials'],
    shopify: ['Orders', 'Shipping', 'Returns'],
    dental: ['Insurance', 'Treatments', 'Patient FAQs'],
    healthcare: ['Eligibility', 'Conditions', 'Patient FAQs'],
    legal: ['Intake Forms', 'Practice Areas', 'FAQs'],
    agency: ['Case Studies', 'Services', 'Testimonials'],
    restaurant: ['Menu', 'Reservations', 'Dietary FAQs'],
    hotel: ['Rooms', 'Booking', 'Policies'],
    education: ['Programs', 'Admissions', 'Schedules'],
    real_estate: ['Listings', 'Tours', 'Financing'],
    manufacturing: ['Specs', 'Supply Chain', 'Support'],
    consulting: ['Offerings', 'Case Studies', 'Process'],
    generic: ['FAQ', 'Contact', 'Policies'],
  };

  const bundle: TemplateBundle = {
    journeys: journeyTemplate,
    buttons,
    widgetDefaults: { ...commonWidgetDefaults, ...(overrides.widget || {}) },
    recommendedAIModules: recommendedAIModules[businessType] || recommendedAIModules.generic,
    knowledgeCategories: knowledgeCategoriesMap[businessType] || knowledgeCategoriesMap.generic,
    installDefaults: {
      widgetSnippetTemplate: `<script>/* BurFlow widget loader for ${businessType} */</script>`,
      channels: ['website', 'shopify', 'wordpress', 'webflow', 'wix', 'squarespace', 'html', 'react', 'vue', 'angular', 'nextjs', 'nuxt', 'api'],
    },
  };

  return bundle;
}
