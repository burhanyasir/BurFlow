export const LOCALES = [
  'bg','hr','cs','da','nl','en','et','fi','fr','de',
  'el','hu','ga','it','lv','lt','mt','pl','pt','ro',
  'sk','sl','es','sv'
] as const;

export type Locale = typeof LOCALES[number];

export type TranslationKey =
  | 'bubble.label'
  | 'bubble.aria'
  | 'header.subtitle'
  | 'header.close'
  | 'input.send'
  | 'input.footer'
  | 'preopen.status'
  | 'preopen.prompt'
  | 'preopen.escape'
  | 'handoff.instruction'
  | 'handoff.email_placeholder'
  | 'handoff.submit'
  | 'handoff.success'
  | 'handoff.error'
  | 'handoff.network_error'
  | 'takeover.banner_title'
  | 'takeover.banner_desc'
  | 'typing.thinking'
  | 'agent.label'
  | 'error.unavailable'
  | 'error.stream'
  | 'welcome.title'
  | 'welcome.meta'
  | 'welcome.recommended'
  | 'welcome.card_desc_quiz'
  | 'welcome.card_desc_tour'
  | 'welcome.card_desc_booking'
  | 'welcome.escape'
  | 'welcome.choose_path'
  | 'welcome.continue_hint'
  | 'greeting.hospitality'
  | 'greeting.default'
  | 'guidance.title'
  | 'guidance.low_confidence'
  | 'guidance.medium_confidence'
  | 'guidance.default_summary'
  | 'continuity.pricing_to_service'
  | 'continuity.service_to_pricing'
  | 'continuity.faq_to_contact'
  | 'continuity.default'
  | 'card.pricing_title'
  | 'card.pricing_desc'
  | 'card.products_title'
  | 'card.products_desc'
  | 'card.faq_title'
  | 'card.faq_desc'
  | 'card.about_title'
  | 'card.about_desc'
  | 'card.service_title'
  | 'card.service_desc'
  | 'card.grounding_pricing'
  | 'card.grounding_products'
  | 'card.grounding_faq'
  | 'card.grounding_about'
  | 'card.grounding_service'
  | 'card.popular_badge'
  | 'card.products_badge'
  | 'card.faq_badge'
  | 'card.contact_badge'
  | 'card.recommended_badge'
  | 'cta.book_demo'
  | 'cta.compare_plans'
  | 'cta.contact_sales'
  | 'cta.view_details'
  | 'cta.best_solution'
  | 'cta.talk_to_sales'
  | 'cta.common_questions'
  | 'cta.enterprise_pricing'
  | 'cta.roi_fit'
  | 'cta.compare_products'
  | 'cta.implementation_time'
  | 'cta.customer_stories'
  | 'cta.leave_message'
  | 'cta.book_15min'
  | 'placeholder.ecommerce_0'
  | 'placeholder.ecommerce_1'
  | 'placeholder.ecommerce_2'
  | 'placeholder.ecommerce_3'
  | 'placeholder.clinic_0'
  | 'placeholder.clinic_1'
  | 'placeholder.clinic_2'
  | 'placeholder.clinic_3'
  | 'placeholder.default_0'
  | 'placeholder.default_1'
  | 'placeholder.default_2'
  | 'placeholder.default_3'
  | 'starter.ecommerce_0'
  | 'starter.ecommerce_1'
  | 'starter.ecommerce_2'
  | 'starter.clinic_0'
  | 'starter.clinic_1'
  | 'starter.clinic_2'
  | 'starter.default_0'
  | 'starter.default_1'
  | 'starter.default_2'
  | 'suggested.compare_plans'
  | 'suggested.best_fit'
  | 'suggested.book_demo'
  | 'suggested.talk_to_sales'
  | 'suggested.common_questions'
  | 'suggested.enterprise_pricing'
  | 'suggested.roi_fit'
  | 'suggested.compare_products'
  | 'suggested.implementation_time'
  | 'suggested.customer_stories'
  | 'human.request'
  | 'human.success'
  | 'human.failure'
  | 'human.network_error'
  | 'unknown.fallback_pricing'
  | 'unknown.fallback_faq'
  | 'unknown.fallback_service'
  | 'unknown.fallback_default'
  | 'unknown.low'
  | 'unknown.medium'
  | 'trust.high_pricing'
  | 'trust.high_services'
  | 'trust.high_faq'
  | 'trust.high_about'
  | 'trust.high_default'
  | 'trust.mid'
  | 'trust.low';

const en: Record<string, string> = {
  'bubble.label': 'Chat with us',
  'bubble.aria': 'Open chat',
  'header.subtitle': 'AI assistant · Online',
  'header.close': 'Close chat',
  'input.send': 'Send message',
  'input.footer': 'Answers from this website · Powered by <b>BurFlow</b>',
  'preopen.status': 'Online now',
  'preopen.prompt': 'Not sure where to start? Pick a quick path below.',
  'preopen.escape': 'Ask something else →',
  'handoff.instruction': "Leave your email and we'll reach out shortly.",
  'handoff.email_placeholder': 'you@company.com',
  'handoff.submit': 'Send',
  'handoff.success': '✓ Request sent. Someone will email you within a few hours.',
  'handoff.error': 'Something went wrong. Please try again.',
  'handoff.network_error': 'Network error. Please try again.',
  'takeover.banner_title': 'Human agent joined',
  'takeover.banner_desc': 'A real person is now assisting this conversation. Replies will come from them shortly.',
  'typing.thinking': ' Thinking…',
  'agent.label': 'Agent',
  'error.unavailable': "I'm here to help, but the assistant is temporarily unavailable. Please try again in a moment.",
  'error.stream': 'Connection error. Please try again.',
  'welcome.title': 'HOW CAN I HELP?',
  'welcome.meta': 'Pick a topic or type your question',
  'welcome.recommended': 'Recommended',
  'welcome.card_desc_quiz': '3 quick questions',
  'welcome.card_desc_tour': 'A 60-second product tour',
  'welcome.card_desc_booking': 'Choose a convenient time',
  'welcome.escape': 'Already a customer? Get support →',
  'welcome.choose_path': '\n\nChoose a quick path, or ask anything below.',
  'welcome.continue_hint': ' Based on what you asked earlier, I can continue from there.',
  'greeting.hospitality': 'How can I help with {company}?',
  'greeting.default': 'Hi! What brings you here today?',
  'guidance.title': "I don't want to overstate what I know",
  'guidance.low_confidence': "I couldn't confidently determine that from this website. If you want, I can help by connecting you with a specialist: Contact Sales, Book Demo, or leave a message.",
  'guidance.medium_confidence': "I didn't find enough detail from this website. I can still help you with Contact Sales, Book Demo, or a message.",
  'guidance.default_summary': 'Recommended next step for this conversation.',
  'continuity.pricing_to_service': 'Since you were looking at pricing earlier, I can compare that with the available service options.',
  'continuity.service_to_pricing': 'Since you were looking at services earlier, I can connect that to the pricing information.',
  'continuity.faq_to_contact': 'Since you were reviewing FAQs earlier, I can point you to the right contact path next.',
  'continuity.default': 'I can continue from what you were looking at earlier.',
  'card.pricing_title': 'Best-fit plan for {company}',
  'card.pricing_desc': 'Compare available plans and find the right fit for your needs.',
  'card.products_title': 'Products for {company}',
  'card.products_desc': 'Explore the products and solutions available.',
  'card.faq_title': 'FAQ for {company}',
  'card.faq_desc': 'Find answers to commonly asked questions.',
  'card.about_title': 'About {company}',
  'card.about_desc': 'Learn more about the business and team.',
  'card.service_title': '{service}',
  'card.service_desc': 'Learn more about this service offering.',
  'card.grounding_pricing': 'Based on the website profile and available offer details.',
  'card.grounding_products': 'Grounded in the product and service details available on the website.',
  'card.grounding_faq': 'Grounded in the FAQ details available on the website.',
  'card.grounding_about': 'Grounded in the business details available on the website.',
  'card.grounding_service': 'Grounded in the service details available on the website.',
  'card.popular_badge': 'Popular',
  'card.products_badge': 'Products',
  'card.faq_badge': 'FAQ',
  'card.contact_badge': 'Contact',
  'card.recommended_badge': 'Recommended',
  'cta.book_demo': 'Book Demo',
  'cta.compare_plans': 'Compare Plans',
  'cta.contact_sales': 'Contact Sales',
  'cta.view_details': 'View Details',
  'cta.best_solution': 'Best Solution',
  'cta.talk_to_sales': 'Talk to Sales',
  'cta.common_questions': 'Common Questions',
  'cta.enterprise_pricing': 'Enterprise Pricing',
  'cta.roi_fit': 'ROI Fit',
  'cta.compare_products': 'Compare Products',
  'cta.implementation_time': 'Implementation Time',
  'cta.customer_stories': 'Customer Stories',
  'cta.leave_message': 'Leave a Message',
  'cta.book_15min': 'Book 15-Min Demo',
  'placeholder.ecommerce_0': 'What products do you offer?',
  'placeholder.ecommerce_1': 'How fast is delivery?',
  'placeholder.ecommerce_2': 'What is your return policy?',
  'placeholder.ecommerce_3': 'Do you have this in stock?',
  'placeholder.clinic_0': 'What services do you offer?',
  'placeholder.clinic_1': 'How do I book an appointment?',
  'placeholder.clinic_2': 'What are your hours?',
  'placeholder.clinic_3': 'Do you accept insurance?',
  'placeholder.default_0': 'Ask about pricing...',
  'placeholder.default_1': 'How does it work?',
  'placeholder.default_2': 'Book a demo...',
  'placeholder.default_3': 'What products do you offer?',
  'starter.ecommerce_0': 'Find the right product',
  'starter.ecommerce_1': 'How fast is delivery?',
  'starter.ecommerce_2': 'What is your return policy?',
  'starter.clinic_0': 'Book an appointment',
  'starter.clinic_1': 'What services do you offer?',
  'starter.clinic_2': 'What are your hours?',
  'starter.default_0': 'How can you help me?',
  'starter.default_1': 'What do you offer?',
  'starter.default_2': 'Talk to a person',
  'suggested.compare_plans': 'Compare Plans',
  'suggested.best_fit': 'Best Fit',
  'suggested.book_demo': 'Book 15-Min Demo',
  'suggested.talk_to_sales': 'Talk to Sales',
  'suggested.common_questions': 'Common Questions',
  'suggested.enterprise_pricing': 'Enterprise Pricing',
  'suggested.roi_fit': 'ROI Fit',
  'suggested.compare_products': 'Compare Products',
  'suggested.implementation_time': 'Implementation Time',
  'suggested.customer_stories': 'Customer Stories',
  'human.request': "I'd like to talk to a human agent, please.",
  'human.success': 'A team member has been notified and will join this conversation shortly. Please wait a moment.',
  'human.failure': "I wasn't able to reach a human agent right now. Please try again later or email us at support.",
  'human.network_error': 'Connection error. Please try again.',
  'unknown.fallback_pricing': 'pricing details',
  'unknown.fallback_faq': 'faq details',
  'unknown.fallback_service': 'service details',
  'unknown.fallback_default': 'the requested information',
  'unknown.low': "I couldn't confidently determine {topic} from this website. If you want, I can help by connecting you with a specialist: Contact Sales, Book Demo, or leave a message.",
  'unknown.medium': "I didn't find enough detail on {topic} from this website. I can still help you with Contact Sales, Book Demo, or a message.",
  'trust.high_pricing': 'According to the pricing page',
  'trust.high_services': 'According to the services page',
  'trust.high_faq': 'According to the FAQ page',
  'trust.high_about': 'According to the about page',
  'trust.high_default': 'According to the available information',
  'trust.mid': 'Based on the available information',
  'trust.low': "I couldn't confidently determine that from this website.",
};

const translations: Record<string, Record<string, string>> = { en };

export function t(key: string, locale?: string): string {
  const lang = detectLocale(locale);
  const catalog = translations[lang] || translations.en;
  return catalog[key] || translations.en[key] || key;
}

export function detectLocale(configLocale?: string): string {
  if (configLocale && LOCALES.includes(configLocale as Locale)) {
    return configLocale;
  }
  if (typeof navigator !== 'undefined') {
    const nav = navigator.language?.slice(0, 2);
    if (nav && LOCALES.includes(nav as Locale)) return nav;
  }
  return 'en';
}
