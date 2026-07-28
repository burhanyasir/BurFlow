import { PersonaTemplate, PersonaType, ScenarioType, PersonaScenario } from './types';

const BASE_SCENARIOS: Record<ScenarioType, Omit<PersonaScenario, 'initialTopics' | 'expectedTopics' | 'minimumQualFields' | 'redFlags' | 'successCriteria'>> = {
  curious: {
    label: 'Curious Customer',
    userGoal: 'Explore capabilities and understand if the product fits their needs',
    description: 'Open-minded prospect gathering information. Asks broad questions, follows tangents, needs guided exploration.',
  },
  skeptical: {
    label: 'Skeptical Customer',
    userGoal: 'Validate claims and test for weaknesses before committing',
    description: 'Doubtful prospect who challenges claims. Needs proof points, case studies, and concrete evidence.',
  },
  price_sensitive: {
    label: 'Price-Sensitive Customer',
    userGoal: 'Find the most cost-effective solution for their budget',
    description: 'Cost-focused prospect comparing value. Concerned about ROI, hidden fees, and overpaying.',
  },
  technical: {
    label: 'Technical Customer',
    userGoal: 'Evaluate technical architecture, APIs, and integration capabilities',
    description: 'Engineering-minded prospect digging into technical details. Wants SDK examples, API docs, architecture specs.',
  },
  ready_for_trial: {
    label: 'Ready for Trial',
    userGoal: 'Start a trial or demo as quickly as possible',
    description: 'High-intent prospect ready to evaluate. Needs minimal friction to start trial or schedule demo.',
  },
};

export function createPersonaTemplate(persona: PersonaType): PersonaTemplate {
  const base = BASE_SCENARIOS;
  const personaInfo = PERSONA_METADATA[persona];
  return {
    name: persona,
    label: personaInfo.label,
    description: personaInfo.description,
    scenarios: {
      curious: { ...base.curious, ...personaInfo.curious },
      skeptical: { ...base.skeptical, ...personaInfo.skeptical },
      price_sensitive: { ...base.price_sensitive, ...personaInfo.price_sensitive },
      technical: { ...base.technical, ...personaInfo.technical },
      ready_for_trial: { ...base.ready_for_trial, ...personaInfo.ready_for_trial },
    },
  };
}

const COMMON_EXPECTED: string[] = ['features', 'pricing'];
const COMMON_QUAL: string[] = ['companySize', 'industry', 'monthlyConversations'];
const COMMON_RED_FLAGS: string[] = [
  'Pricing presented without business context',
  'Plan recommended without enough qualification data',
  'Feature explanation without memory reference',
];

type PersonaScenarioOverride = Pick<PersonaScenario, 'initialTopics' | 'expectedTopics' | 'minimumQualFields' | 'redFlags' | 'successCriteria'>;

interface PersonaMetadata {
  label: string;
  description: string;
  curious: PersonaScenarioOverride;
  skeptical: PersonaScenarioOverride;
  price_sensitive: PersonaScenarioOverride;
  technical: PersonaScenarioOverride;
  ready_for_trial: PersonaScenarioOverride;
}

const PERSONA_METADATA: Record<PersonaType, PersonaMetadata> = {
  shopify_merchant: {
    label: 'Shopify Merchant',
    description: 'Runs a Shopify store, needs customer service automation for shipping, returns, orders.',
    curious: {
      initialTopics: ['features', 'integrations'],
      expectedTopics: [...COMMON_EXPECTED, 'integrations', 'trial'],
      minimumQualFields: [...COMMON_QUAL, 'currentHelpdesk'],
      redFlags: [...COMMON_RED_FLAGS, 'No Shopify-specific integration mention'],
      successCriteria: ['Integration with Shopify explained', 'Conversation volume discussed', 'Plan recommendation makes sense for store size'],
    },
    skeptical: {
      initialTopics: ['features', 'security'],
      expectedTopics: [...COMMON_EXPECTED, 'security', 'integrations', 'roi'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'Objection not acknowledged', 'No case study or proof point provided'],
      successCriteria: ['Objections addressed with specific examples', 'Trust rebuilt after skepticism', 'Concrete ROI or case study shared'],
    },
    price_sensitive: {
      initialTopics: ['pricing'],
      expectedTopics: [...COMMON_EXPECTED, 'roi', 'trial'],
      minimumQualFields: [...COMMON_QUAL, 'budget'],
      redFlags: [...COMMON_RED_FLAGS, 'Budget not explored before presenting plans', 'Starter plan pushed without understanding volume'],
      successCriteria: ['Budget range collected', 'ROI scenario shared', 'Starter or Professional plan suggested appropriately'],
    },
    technical: {
      initialTopics: ['features', 'integrations'],
      expectedTopics: [...COMMON_EXPECTED, 'integrations', 'api', 'developer'],
      minimumQualFields: [...COMMON_QUAL, 'currentHelpdesk'],
      redFlags: [...COMMON_RED_FLAGS, 'No API or integration details provided'],
      successCriteria: ['Shopify API integration explained', 'Technical architecture questions answered', 'Developer docs or sandbox offered'],
    },
    ready_for_trial: {
      initialTopics: ['trial', 'features'],
      expectedTopics: [...COMMON_EXPECTED, 'trial', 'integrations'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'Trial setup friction', 'Unnecessary qualification before trial'],
      successCriteria: ['Trial started or demo booked within 3 turns', 'Unnecessary qualification avoided', 'Setup steps explained clearly'],
    },
  },
  saas_founder: {
    label: 'SaaS Founder',
    description: 'Runs a SaaS company, looking for support automation to scale customer service.',
    curious: {
      initialTopics: ['features', 'pricing'],
      expectedTopics: [...COMMON_EXPECTED, 'integrations', 'roi', 'trial'],
      minimumQualFields: [...COMMON_QUAL, 'useCase'],
      redFlags: [...COMMON_RED_FLAGS, 'No discussion of scaling or growth'],
      successCriteria: ['SaaS-specific use cases explored', 'Volume and team size discussed', 'Growth-oriented recommendation'],
    },
    skeptical: {
      initialTopics: ['security', 'features'],
      expectedTopics: [...COMMON_EXPECTED, 'security', 'integrations', 'roi', 'comparison'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'Competitor comparison not addressed', 'No trust signals'],
      successCriteria: ['Objections handled with data', 'Competitive positioning clear', 'Trust rebuilt'],
    },
    price_sensitive: {
      initialTopics: ['pricing'],
      expectedTopics: [...COMMON_EXPECTED, 'roi', 'trial'],
      minimumQualFields: [...COMMON_QUAL, 'budget'],
      redFlags: [...COMMON_RED_FLAGS, 'ROI not calculated', 'Pricing-only discussion without value'],
      successCriteria: ['ROI framework presented', 'Scalable pricing option shown', 'Starter option available'],
    },
    technical: {
      initialTopics: ['api', 'features'],
      expectedTopics: [...COMMON_EXPECTED, 'api', 'integrations', 'developer', 'security'],
      minimumQualFields: [...COMMON_QUAL, 'useCase'],
      redFlags: [...COMMON_RED_FLAGS, 'No API/SDK details'],
      successCriteria: ['API capabilities demonstrated', 'Integration with existing stack addressed', 'Developer resources shared'],
    },
    ready_for_trial: {
      initialTopics: ['trial', 'features'],
      expectedTopics: [...COMMON_EXPECTED, 'trial'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'Trial delayed by qualification'],
      successCriteria: ['Trial started quickly', 'Minimal qualification before access', 'Clear onboarding path'],
    },
  },
  enterprise_it_manager: {
    label: 'Enterprise IT Manager',
    description: 'Manages IT for a large organization, needs security, compliance, SSO, and scalability.',
    curious: {
      initialTopics: ['security', 'features'],
      expectedTopics: [...COMMON_EXPECTED, 'security', 'sso', 'soc2', 'integrations', 'api'],
      minimumQualFields: [...COMMON_QUAL, 'currentHelpdesk', 'decisionTimeline'],
      redFlags: [...COMMON_RED_FLAGS, 'No enterprise-specific security discussion', 'SOC 2 / compliance not mentioned'],
      successCriteria: ['Enterprise security requirements addressed', 'SSO/SAML explained', 'Compliance certifications mentioned'],
    },
    skeptical: {
      initialTopics: ['security', 'comparison'],
      expectedTopics: [...COMMON_EXPECTED, 'security', 'soc2', 'comparison', 'roi', 'integrations'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'Security concern dismissed without details', 'No competitor differentiation'],
      successCriteria: ['Security architecture explained in detail', 'Enterprise proof points shared', 'SLA and compliance addressed'],
    },
    price_sensitive: {
      initialTopics: ['pricing'],
      expectedTopics: [...COMMON_EXPECTED, 'roi', 'security', 'trial'],
      minimumQualFields: [...COMMON_QUAL, 'budget', 'decisionTimeline'],
      redFlags: [...COMMON_RED_FLAGS, 'Enterprise pricing not scoped', 'Volume discounts not mentioned'],
      successCriteria: ['Enterprise plan details provided', 'ROI modeled for large org', 'Volume pricing offered'],
    },
    technical: {
      initialTopics: ['security', 'api', 'integrations'],
      expectedTopics: [...COMMON_EXPECTED, 'security', 'sso', 'soc2', 'api', 'integrations', 'developer'],
      minimumQualFields: [...COMMON_QUAL, 'currentHelpdesk'],
      redFlags: [...COMMON_RED_FLAGS, 'No technical architecture details', 'SSO/SAML not explained'],
      successCriteria: ['Technical architecture walkthrough', 'SSO/SAML/SCIM explained', 'API capabilities demonstrated'],
    },
    ready_for_trial: {
      initialTopics: ['trial', 'demo'],
      expectedTopics: [...COMMON_EXPECTED, 'trial', 'demo', 'security'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'Enterprise demo not offered', 'Pilot process not explained'],
      successCriteria: ['Enterprise demo or pilot set up', 'Security review path explained', 'Implementation timeline shared'],
    },
  },
  healthcare_clinic: {
    label: 'Healthcare Clinic',
    description: 'Medical practice needing HIPAA-compliant patient communication automation.',
    curious: {
      initialTopics: ['features', 'security'],
      expectedTopics: [...COMMON_EXPECTED, 'security', 'integrations', 'trial'],
      minimumQualFields: [...COMMON_QUAL, 'currentHelpdesk'],
      redFlags: [...COMMON_RED_FLAGS, 'HIPAA not mentioned', 'No healthcare-specific use cases'],
      successCriteria: ['HIPAA compliance addressed', 'Patient communication use cases explored', 'Integration with EHR mentioned'],
    },
    skeptical: {
      initialTopics: ['security', 'pricing'],
      expectedTopics: [...COMMON_EXPECTED, 'security', 'roi', 'integrations', 'comparison'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'HIPAA concerns dismissed', 'No healthcare case studies'],
      successCriteria: ['HIPAA compliance documented', 'Healthcare-specific objections handled', 'Patient data handling explained'],
    },
    price_sensitive: {
      initialTopics: ['pricing'],
      expectedTopics: [...COMMON_EXPECTED, 'roi', 'security'],
      minimumQualFields: [...COMMON_QUAL, 'budget'],
      redFlags: [...COMMON_RED_FLAGS, 'HIPAA compliance not included in pricing discussion'],
      successCriteria: ['Budget-friendly plan offered', 'ROI for clinic volume explained', 'Compliance-pricing balance addressed'],
    },
    technical: {
      initialTopics: ['security', 'integrations'],
      expectedTopics: [...COMMON_EXPECTED, 'security', 'soc2', 'integrations', 'api'],
      minimumQualFields: [...COMMON_QUAL, 'currentHelpdesk'],
      redFlags: [...COMMON_RED_FLAGS, 'No EHR integration details', 'Data residency not discussed'],
      successCriteria: ['EHR/PMS integration explained', 'Data encryption details shared', 'Compliance certification walkthrough'],
    },
    ready_for_trial: {
      initialTopics: ['trial', 'features'],
      expectedTopics: [...COMMON_EXPECTED, 'trial', 'security'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'HIPAA compliance not verified before trial'],
      successCriteria: ['HIPAA-compliant trial setup', 'Quick onboarding path', 'Patient data migration explained'],
    },
  },
  law_firm: {
    label: 'Law Firm',
    description: 'Legal practice needing client intake automation with confidentiality guarantees.',
    curious: {
      initialTopics: ['features', 'security'],
      expectedTopics: [...COMMON_EXPECTED, 'security', 'integrations', 'trial'],
      minimumQualFields: [...COMMON_QUAL, 'currentHelpdesk'],
      redFlags: [...COMMON_RED_FLAGS, 'Confidentiality not addressed', 'No legal-specific use cases'],
      successCriteria: ['Attorney-client privilege discussed', 'Data confidentiality explained', 'Legal intake use cases covered'],
    },
    skeptical: {
      initialTopics: ['security', 'pricing'],
      expectedTopics: [...COMMON_EXPECTED, 'security', 'soc2', 'roi', 'integrations'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'Confidentiality concerns minimized', 'No legal industry examples'],
      successCriteria: ['Data security guarantees explained', 'Case management integration shown', 'Trust signals provided'],
    },
    price_sensitive: {
      initialTopics: ['pricing'],
      expectedTopics: [...COMMON_EXPECTED, 'roi', 'security'],
      minimumQualFields: [...COMMON_QUAL, 'budget'],
      redFlags: [...COMMON_RED_FLAGS, 'Security trade-off for lower price suggested'],
      successCriteria: ['Pricing proportional to firm size', 'ROI for billable hours discussed', 'Compliance within budget'],
    },
    technical: {
      initialTopics: ['security', 'integrations', 'api'],
      expectedTopics: [...COMMON_EXPECTED, 'security', 'api', 'integrations', 'sso'],
      minimumQualFields: [...COMMON_QUAL, 'currentHelpdesk'],
      redFlags: [...COMMON_RED_FLAGS, 'No technical compliance details'],
      successCriteria: ['Data encryption and access controls explained', 'Integration with case management system', 'Audit logging capabilities shown'],
    },
    ready_for_trial: {
      initialTopics: ['trial', 'features'],
      expectedTopics: [...COMMON_EXPECTED, 'trial', 'security'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'Client confidentiality not addressed before trial'],
      successCriteria: ['Confidentiality assured for trial data', 'Quick setup for practice management', 'Import process explained'],
    },
  },
  restaurant_owner: {
    label: 'Restaurant Owner',
    description: 'Restaurant operator needing automated reservation and customer inquiry handling.',
    curious: {
      initialTopics: ['features', 'pricing'],
      expectedTopics: [...COMMON_EXPECTED, 'integrations', 'trial'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'No restaurant-specific scenarios discussed'],
      successCriteria: ['Restaurant use cases addressed (reservations, menu, hours)', 'Volume-appropriate plan suggested', 'Integration with POS mentioned'],
    },
    skeptical: {
      initialTopics: ['pricing', 'features'],
      expectedTopics: [...COMMON_EXPECTED, 'roi', 'integrations'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'Objections about cost not addressed'],
      successCriteria: ['ROI for restaurant context shown', 'Objections about practicality handled', 'Industry examples shared'],
    },
    price_sensitive: {
      initialTopics: ['pricing'],
      expectedTopics: [...COMMON_EXPECTED, 'roi'],
      minimumQualFields: [...COMMON_QUAL, 'budget'],
      redFlags: [...COMMON_RED_FLAGS, 'Enterprise plan pushed to small restaurant'],
      successCriteria: ['Affordable plan presented', 'Value for specific restaurant volume shown', 'Starter option available'],
    },
    technical: {
      initialTopics: ['features', 'integrations'],
      expectedTopics: [...COMMON_EXPECTED, 'integrations', 'api'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'POS integration not discussed'],
      successCriteria: ['POS/menu platform integration covered', 'Setup ease demonstrated', 'Online ordering capability addressed'],
    },
    ready_for_trial: {
      initialTopics: ['trial', 'features'],
      expectedTopics: [...COMMON_EXPECTED, 'trial'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'Trial setup overcomplicated'],
      successCriteria: ['Trial started quickly', 'Restaurant-relevant onboarding', 'Menu import or setup assistance offered'],
    },
  },
  marketing_agency: {
    label: 'Marketing Agency',
    description: 'Digital agency managing multiple client accounts, needing white-label or multi-tenant capabilities.',
    curious: {
      initialTopics: ['features', 'pricing'],
      expectedTopics: [...COMMON_EXPECTED, 'integrations', 'trial'],
      minimumQualFields: [...COMMON_QUAL, 'useCase'],
      redFlags: [...COMMON_RED_FLAGS, 'No multi-tenant or white-label discussion'],
      successCriteria: ['Multi-tenant capabilities addressed', 'White-label options explored', 'Client management features shown'],
    },
    skeptical: {
      initialTopics: ['features', 'comparison'],
      expectedTopics: [...COMMON_EXPECTED, 'roi', 'integrations', 'comparison'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'Agency-specific needs not addressed'],
      successCriteria: ['Agency objections handled', 'Scalability for multiple clients shown', 'Integration ecosystem demonstrated'],
    },
    price_sensitive: {
      initialTopics: ['pricing'],
      expectedTopics: [...COMMON_EXPECTED, 'roi'],
      minimumQualFields: [...COMMON_QUAL, 'budget'],
      redFlags: [...COMMON_RED_FLAGS, 'Per-agent pricing not suitable for agency model'],
      successCriteria: ['Agency-friendly pricing discussed', 'Client pass-through billing addressed', 'Volume discounts offered'],
    },
    technical: {
      initialTopics: ['api', 'integrations'],
      expectedTopics: [...COMMON_EXPECTED, 'api', 'integrations', 'developer'],
      minimumQualFields: [...COMMON_QUAL, 'useCase'],
      redFlags: [...COMMON_RED_FLAGS, 'No API or white-label technical details'],
      successCriteria: ['White-label API explained', 'Multi-tenant architecture shown', 'Custom branding options covered'],
    },
    ready_for_trial: {
      initialTopics: ['trial', 'features'],
      expectedTopics: [...COMMON_EXPECTED, 'trial'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'Trial not scoped for agency use case'],
      successCriteria: ['Trial provisioned for agency context', 'Client setup process explained', 'Branding/white-label in trial'],
    },
  },
  ecommerce_store: {
    label: 'Ecommerce Store',
    description: 'Online retailer needing customer service automation for orders, shipping, and product questions.',
    curious: {
      initialTopics: ['features', 'pricing'],
      expectedTopics: [...COMMON_EXPECTED, 'integrations', 'trial'],
      minimumQualFields: [...COMMON_QUAL, 'monthlyConversations'],
      redFlags: [...COMMON_RED_FLAGS, 'No e-commerce specific scenarios'],
      successCriteria: ['Order management use cases addressed', 'Shipping/return automation discussed', 'Volume-based plan suggestion'],
    },
    skeptical: {
      initialTopics: ['pricing', 'features'],
      expectedTopics: [...COMMON_EXPECTED, 'roi', 'integrations', 'comparison'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'No competitor differentiation', 'ROI not quantified'],
      successCriteria: ['Cost savings quantified', 'Integration with store platform shown', 'Objections addressed with data'],
    },
    price_sensitive: {
      initialTopics: ['pricing'],
      expectedTopics: [...COMMON_EXPECTED, 'roi'],
      minimumQualFields: [...COMMON_QUAL, 'budget'],
      redFlags: [...COMMON_RED_FLAGS, 'No ROI calculation for order volume'],
      successCriteria: ['ROI based on order volume shown', 'Budget-friendly plan offered', 'Trial offered to prove value'],
    },
    technical: {
      initialTopics: ['integrations', 'features'],
      expectedTopics: [...COMMON_EXPECTED, 'integrations', 'api', 'developer'],
      minimumQualFields: [...COMMON_QUAL, 'currentHelpdesk'],
      redFlags: [...COMMON_RED_FLAGS, 'Platform-specific integration not discussed'],
      successCriteria: ['Platform integration (Shopify/WooCommerce) detailed', 'API capabilities shown', 'Product catalog sync explained'],
    },
    ready_for_trial: {
      initialTopics: ['trial', 'features'],
      expectedTopics: [...COMMON_EXPECTED, 'trial', 'integrations'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'Trial friction for e-commerce setup'],
      successCriteria: ['Trial started quickly', 'Store integration in trial included', 'Product import supported'],
    },
  },
  internal_kb_buyer: {
    label: 'Internal Knowledge Base Buyer',
    description: 'Company looking to index internal documentation for employee self-service.',
    curious: {
      initialTopics: ['features', 'security'],
      expectedTopics: [...COMMON_EXPECTED, 'security', 'integrations', 'trial'],
      minimumQualFields: [...COMMON_QUAL, 'useCase'],
      redFlags: [...COMMON_RED_FLAGS, 'No internal KB use case discussion'],
      successCriteria: ['Internal KB search capabilities explained', 'Document indexing process described', 'Access control addressed'],
    },
    skeptical: {
      initialTopics: ['security', 'pricing'],
      expectedTopics: [...COMMON_EXPECTED, 'security', 'roi', 'integrations'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'Search accuracy concerns dismissed'],
      successCriteria: ['Search accuracy demonstrated', 'Security for internal docs explained', 'Integration with existing tools shown'],
    },
    price_sensitive: {
      initialTopics: ['pricing'],
      expectedTopics: [...COMMON_EXPECTED, 'roi', 'features'],
      minimumQualFields: [...COMMON_QUAL, 'budget', 'monthlyConversations'],
      redFlags: [...COMMON_RED_FLAGS, 'ROI for internal use case not calculated'],
      successCriteria: ['Cost vs. employee time saved shown', 'Scalable pricing for team size', 'Free trial to validate accuracy'],
    },
    technical: {
      initialTopics: ['features', 'integrations', 'security'],
      expectedTopics: [...COMMON_EXPECTED, 'security', 'integrations', 'api', 'sso'],
      minimumQualFields: [...COMMON_QUAL, 'useCase'],
      redFlags: [...COMMON_RED_FLAGS, 'Document format support not addressed'],
      successCriteria: ['Document indexing pipeline explained', 'SSO/SAML for employee access shown', 'Search quality metrics provided'],
    },
    ready_for_trial: {
      initialTopics: ['trial', 'features'],
      expectedTopics: [...COMMON_EXPECTED, 'trial', 'integrations'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'Document import friction in trial'],
      successCriteria: ['Quick document import for trial', 'Search tested with sample docs', 'Setup within minutes'],
    },
  },
  api_developer: {
    label: 'API Developer',
    description: 'Developer evaluating the platform for embedding AI search into their own product.',
    curious: {
      initialTopics: ['api', 'features'],
      expectedTopics: [...COMMON_EXPECTED, 'api', 'developer', 'integrations', 'pricing'],
      minimumQualFields: [...COMMON_QUAL, 'useCase'],
      redFlags: [...COMMON_RED_FLAGS, 'No API documentation or SDK details'],
      successCriteria: ['API capabilities demonstrated', 'SDK availability confirmed', 'Pricing for API usage explained'],
    },
    skeptical: {
      initialTopics: ['api', 'pricing'],
      expectedTopics: [...COMMON_EXPECTED, 'api', 'developer', 'comparison', 'roi'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'API limitations not addressed honestly'],
      successCriteria: ['API limitations discussed transparently', 'Competitive API comparison addressed', 'Performance benchmarks shared'],
    },
    price_sensitive: {
      initialTopics: ['pricing'],
      expectedTopics: [...COMMON_EXPECTED, 'api', 'roi'],
      minimumQualFields: [...COMMON_QUAL, 'budget', 'monthlyConversations'],
      redFlags: [...COMMON_RED_FLAGS, 'API pricing not transparently shared'],
      successCriteria: ['API pricing model explained', 'Usage-based cost projections shared', 'Free tier or sandbox offered'],
    },
    technical: {
      initialTopics: ['api', 'features', 'integrations'],
      expectedTopics: [...COMMON_EXPECTED, 'api', 'developer', 'integrations', 'security'],
      minimumQualFields: [...COMMON_QUAL, 'useCase'],
      redFlags: [...COMMON_RED_FLAGS, 'No SDK examples or code snippets'],
      successCriteria: ['SDK examples in preferred language', 'API endpoint documentation reference', 'Authentication and rate limits covered'],
    },
    ready_for_trial: {
      initialTopics: ['trial', 'api'],
      expectedTopics: [...COMMON_EXPECTED, 'trial', 'api', 'developer'],
      minimumQualFields: [...COMMON_QUAL],
      redFlags: [...COMMON_RED_FLAGS, 'API key not provided for trial'],
      successCriteria: ['API key or sandbox access provided', 'Quick integration path demonstrated', 'Developer docs shared'],
    },
  },
};

export const ALL_PERSONAS: PersonaType[] = [
  'shopify_merchant', 'saas_founder', 'enterprise_it_manager',
  'healthcare_clinic', 'law_firm', 'restaurant_owner',
  'marketing_agency', 'ecommerce_store', 'internal_kb_buyer', 'api_developer',
];

export const ALL_SCENARIOS: ScenarioType[] = [
  'curious', 'skeptical', 'price_sensitive', 'technical', 'ready_for_trial',
];

export function generateEvaluationPlan(): Array<{ persona: PersonaType; scenario: ScenarioType; template: PersonaScenario }> {
  const plan: Array<{ persona: PersonaType; scenario: ScenarioType; template: PersonaScenario }> = [];
  for (const persona of ALL_PERSONAS) {
    for (const scenario of ALL_SCENARIOS) {
      const template = createPersonaTemplate(persona);
      plan.push({ persona, scenario, template: template.scenarios[scenario] });
    }
  }
  return plan;
}
