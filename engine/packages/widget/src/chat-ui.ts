import { WidgetConfig, ChatMessage, ConversationUIState, SmartButton } from './types';
import { streamChat } from './stream-client';
import { t } from './i18n';

export interface RecommendationCard {
  type: 'product_recommendation' | 'service_recommendation';
  title: string;
  description: string;
  benefits: string[];
  badge?: string;
  primaryCta: SmartButton;
  secondaryCta?: SmartButton;
  icon?: string;
  groundingNote?: string;
  source?: { label: string; url?: string; kind: string };
  trustNote?: string;
}

interface BusinessContextLike {
  companyName?: string;
  industry?: string;
  businessType?: string;
  products?: string[];
  services?: string[];
  pricingModel?: string;
  valuePropositions?: string[];
  targetAudience?: string[];
  faqs?: string[];
  contactDetails?: string[];
  trustSignals?: string[];
  brandTone?: string;
  sourceUrls?: Record<string, string>;
}

export function buildBusinessProfileFromWidgetConfig(config: Partial<WidgetConfig> = {}): BusinessContextLike {
  // The stored business_profile JSON uses snake_case keys (e.g. business_type),
  // while the widget's internal profile uses camelCase — accept both.
  const persisted = (config.businessProfile || {}) as Record<string, unknown>;
  const pick = (camel: string, snake: string): unknown => persisted[camel] ?? persisted[snake];
  const titleText = (config.title || '').toLowerCase();
  const greetingText = (config.greeting || '').toLowerCase();
  const hasSalesLanguage = titleText.includes('sales') || greetingText.includes('demo') || greetingText.includes('plan') || greetingText.includes('pricing');
  const suggestedActions = (config.suggestedActions || []).map((action) => action.label.toLowerCase());
  const hasDemoAction = suggestedActions.some((label) => label.includes('demo'));
  const hasPricingAction = suggestedActions.some((label) => label.includes('plan') || label.includes('pricing'));

  const base: BusinessContextLike = {
    companyName: (pick('companyName', 'company_name') as string | undefined) || config.companyName || 'this business',
    industry: (pick('industry', 'industry') as string | undefined) || (hasSalesLanguage ? 'SaaS' : undefined),
    businessType: (pick('businessType', 'business_type') as string | undefined) || (hasSalesLanguage ? 'saas' : undefined),
    products: ((pick('products', 'products') as string[] | undefined) || ['product guidance', hasDemoAction ? 'demo qualification' : 'core offering'].filter(Boolean)) as string[],
    services: ((pick('services', 'services') as string[] | undefined) || ['guided recommendations', hasDemoAction ? 'demo booking support' : 'support'].filter(Boolean)) as string[],
    pricingModel: (pick('pricingModel', 'pricing_model') as string | undefined) || (hasPricingAction ? 'guided plans' : 'flexible options'),
    valuePropositions: ((pick('valuePropositions', 'value_propositions') as string[] | undefined) || [hasDemoAction ? 'clear next steps' : 'clear guidance', 'fast, trustworthy responses']) as string[],
    targetAudience: ((pick('targetAudience', 'target_audience') as string[] | undefined) || ['prospective buyers', 'website visitors']) as string[],
    faqs: ((pick('faqs', 'faqs') as string[] | undefined) || ['How does this work?', 'What should I do next?']) as string[],
    contactDetails: ((pick('contactDetails', 'contact_details') as string[] | undefined) || ['sales contact']) as string[],
    trustSignals: ((pick('trustSignals', 'trust_signals') as string[] | undefined) || ['website-guided guidance', 'transparent next steps']) as string[],
    brandTone: (pick('brandTone', 'brand_tone') as string | undefined) || 'confident and helpful',
    sourceUrls: (pick('sourceUrls', 'source_urls') as Record<string, string> | undefined) || (config.companyName ? { pricing: '#', services: '#', faq: '#', about: '#' } : undefined),
  };

  return base;
}

export function buildSourceAttribution(topic: string, profile: BusinessContextLike = {}): { label: string; url?: string; kind: string } | null {
  const normalized = (topic || '').toLowerCase();
  const kind = normalized.includes('pricing') ? 'pricing'
    : normalized.includes('service') || normalized.includes('support') ? 'services'
    : normalized.includes('faq') || normalized.includes('question') ? 'faq'
    : normalized.includes('about') || normalized.includes('contact') || normalized.includes('trust') ? 'about'
    : null;

  if (!kind) return null;
  const url = profile.sourceUrls?.[kind];
  return { label: `📄 ${kind.charAt(0).toUpperCase() + kind.slice(1)}`, url, kind };
}

export function buildTrustNote(topic: string, confidence?: number, locale?: string): string {
  const normalized = (topic || '').toLowerCase();
  const key = normalized.includes('pricing') ? 'trust.high_pricing'
    : normalized.includes('service') || normalized.includes('support') ? 'trust.high_services'
    : normalized.includes('faq') || normalized.includes('question') ? 'trust.high_faq'
    : normalized.includes('about') || normalized.includes('contact') || normalized.includes('trust') ? 'trust.high_about'
    : 'trust.high_default';

  if (typeof confidence === 'number' && confidence >= 0.75) {
    return `${t(key, locale)}...`;
  }
  if (typeof confidence === 'number' && confidence >= 0.45) {
    return `${t('trust.mid', locale)}...`;
  }
  return t('trust.low', locale);
}

export function buildUnknownResponseGuide(topic: string, confidence?: number, locale?: string): string {
  const normalized = (topic || '').toLowerCase();
  const fallbackKey = normalized.includes('pricing') ? 'unknown.fallback_pricing'
    : normalized.includes('faq') || normalized.includes('question') ? 'unknown.fallback_faq'
    : normalized.includes('service') || normalized.includes('support') ? 'unknown.fallback_service'
    : 'unknown.fallback_default';
  const fallback = t(fallbackKey, locale);

  if (typeof confidence === 'number' && confidence < 0.45) {
    return t('unknown.low', locale).replace('{topic}', fallback);
  }

  return t('unknown.medium', locale).replace('{topic}', fallback);
}

export function buildContinuityCue(previousMessages: Array<{ role?: string; content?: string }>, newMessage: string, locale?: string): string {
  const prior = previousMessages.filter((message) => message.role === 'user' && typeof message.content === 'string').map((message) => message.content?.toLowerCase() || '').join(' ');
  const normalized = newMessage.toLowerCase();
  if (prior.includes('pricing') && normalized.includes('service')) {
    return t('continuity.pricing_to_service', locale);
  }
  if (prior.includes('service') && normalized.includes('pricing')) {
    return t('continuity.service_to_pricing', locale);
  }
  if (prior.includes('faq') && normalized.includes('contact')) {
    return t('continuity.faq_to_contact', locale);
  }
  return t('continuity.default', locale);
}

export function buildBusinessGreeting(profile: BusinessContextLike = {}, locale?: string): string {
  const industryLabel = profile.industry || profile.businessType || '';
  if (/restaurant|food|cafe|hotel|hospitality/i.test(industryLabel)) {
    return t('greeting.hospitality', locale).replace('{company}', profile.companyName || 'this business');
  }
  return t('greeting.default', locale);
}

export function buildRecommendationCardFromMessage(message: string, profile: BusinessContextLike = {}, locale?: string): RecommendationCard | null {
  const normalized = message.toLowerCase();
  const companyName = profile.companyName || 'this business';

  if (normalized.includes('pricing') || normalized.includes('plan') || normalized.includes('compare')) {
    const productName = profile.products?.[0] || 'the main offering';
    const pricingHint = profile.pricingModel || 'simple options';
    return {
      type: 'product_recommendation',
      title: t('card.pricing_title', locale).replace('{company}', companyName),
      description: t('card.pricing_desc', locale),
      benefits: [
        profile.valuePropositions?.[0] || 'Clear business value',
        profile.targetAudience?.[0] || 'Built for the right audience',
        profile.trustSignals?.[0] || 'Grounded in the website profile',
      ],
      badge: profile.industry ? `${profile.industry}` : t('card.popular_badge', locale),
      icon: '📦',
      groundingNote: t('card.grounding_pricing', locale),
      source: buildSourceAttribution('pricing', profile) ?? undefined,
      trustNote: buildTrustNote('pricing', 0.8, locale),
      primaryCta: { id: 'card-book-demo', label: t('cta.book_demo', locale), action: 'send_text', payload: 'I want to book a demo', variant: 'primary' },
      secondaryCta: { id: 'card-compare-plans', label: t('cta.compare_plans', locale), action: 'send_text', payload: 'Compare plans and pricing', variant: 'secondary' },
    };
  }

  if (normalized.includes('product') || normalized.includes('offer') || normalized.includes('service') || normalized.includes('what do you offer')) {
    const productName = profile.products?.[0] || profile.services?.[0] || 'the main offering';
    return {
      type: 'service_recommendation',
      title: t('card.products_title', locale).replace('{company}', companyName),
      description: t('card.products_desc', locale),
      benefits: [
        productName,
        profile.valuePropositions?.[0] || 'Clear business value',
        profile.trustSignals?.[0] || 'Backed by the website context',
      ],
      badge: t('card.products_badge', locale),
      icon: '📦',
      groundingNote: t('card.grounding_products', locale),
      source: buildSourceAttribution('services', profile) ?? undefined,
      trustNote: buildTrustNote('services', 0.7, locale),
      primaryCta: { id: 'card-book-demo', label: t('cta.book_demo', locale), action: 'send_text', payload: 'I want to book a demo', variant: 'primary' },
      secondaryCta: { id: 'card-contact-sales', label: t('cta.contact_sales', locale), action: 'send_text', payload: 'Connect me with sales', variant: 'secondary' },
    };
  }

  if (normalized.includes('faq') || normalized.includes('question') || normalized.includes('common')) {
    return {
      type: 'service_recommendation',
      title: t('card.faq_title', locale).replace('{company}', companyName),
      description: t('card.faq_desc', locale),
      benefits: [
        profile.faqs?.[0] || 'Answers to common questions',
        profile.contactDetails?.[0] || 'Direct next-step contact',
        profile.trustSignals?.[0] || 'Backed by the website context',
      ],
      badge: t('card.faq_badge', locale),
      icon: '❓',
      groundingNote: t('card.grounding_faq', locale),
      source: buildSourceAttribution('faq', profile) ?? undefined,
      trustNote: buildTrustNote('faq', 0.72, locale),
      primaryCta: { id: 'card-contact-sales', label: t('cta.contact_sales', locale), action: 'send_text', payload: 'Connect me with sales', variant: 'primary' },
      secondaryCta: { id: 'card-book-demo', label: t('cta.book_demo', locale), action: 'send_text', payload: 'I want to book a demo', variant: 'secondary' },
    };
  }

  if (normalized.includes('contact') || normalized.includes('trust') || normalized.includes('about') || normalized.includes('who')) {
    return {
      type: 'service_recommendation',
      title: t('card.about_title', locale).replace('{company}', companyName),
      description: t('card.about_desc', locale),
      benefits: [
        profile.valuePropositions?.[0] || 'Outcome-focused delivery',
        profile.contactDetails?.[0] || 'Direct next-step contact',
        profile.trustSignals?.[0] || 'Backed by the website context',
      ],
      badge: t('card.contact_badge', locale),
      icon: '🤝',
      groundingNote: t('card.grounding_about', locale),
      source: buildSourceAttribution('about', profile) ?? undefined,
      trustNote: buildTrustNote('about', 0.68, locale),
      primaryCta: { id: 'card-talk-sales', label: t('cta.contact_sales', locale), action: 'send_text', payload: 'Connect me with sales', variant: 'primary' },
      secondaryCta: { id: 'card-view-details', label: t('cta.view_details', locale), action: 'send_text', payload: 'Tell me about your services', variant: 'secondary' },
    };
  }

  if (normalized.includes('service') || normalized.includes('support') || normalized.includes('implementation')) {
    const serviceName = profile.services?.[0] || 'the main service';
    return {
      type: 'service_recommendation',
      title: t('card.service_title', locale).replace('{service}', serviceName),
      description: t('card.service_desc', locale),
      benefits: [
        profile.valuePropositions?.[0] || 'Outcome-focused delivery',
        profile.contactDetails?.[0] || 'Direct next-step contact',
        profile.trustSignals?.[0] || 'Backed by the website context',
      ],
      badge: t('card.recommended_badge', locale),
      icon: '🧭',
      groundingNote: t('card.grounding_service', locale),
      source: buildSourceAttribution('services', profile) ?? undefined,
      trustNote: buildTrustNote('services', 0.7, locale),
      primaryCta: { id: 'card-talk-sales', label: t('cta.contact_sales', locale), action: 'send_text', payload: 'Connect me with sales', variant: 'primary' },
      secondaryCta: { id: 'card-view-details', label: t('cta.view_details', locale), action: 'send_text', payload: 'Tell me about your services', variant: 'secondary' },
    };
  }

  return null;
}

export function deriveSuggestedActions(message: string, previousActions: SmartButton[] = [], locale?: string): SmartButton[] {
  const normalized = message.toLowerCase();
  const seen = new Set(previousActions.map((action) => action.label.toLowerCase()));

  const baseActions: SmartButton[] = [
    { id: 'compare-plans', label: t('suggested.compare_plans', locale), action: 'send_text', payload: 'Compare plans and pricing', variant: 'primary', category: 'plans' },
    { id: 'best-solution', label: t('suggested.best_fit', locale), action: 'send_text', payload: 'Recommend the best fit for my needs', variant: 'secondary', category: 'guidance' },
    { id: 'book-demo', label: t('suggested.book_demo', locale), action: 'send_text', payload: 'I want to book a demo', variant: 'primary', category: 'demo' },
    { id: 'talk-sales', label: t('suggested.talk_to_sales', locale), action: 'send_text', payload: 'Connect me with sales', variant: 'secondary', category: 'sales' },
    { id: 'faq', label: t('suggested.common_questions', locale), action: 'send_text', payload: 'What are the most common questions?', variant: 'secondary', category: 'faq' },
  ];

  if (normalized.includes('price') || normalized.includes('pricing') || normalized.includes('plan')) {
    const pricingActions = [
      { id: 'compare-plans', label: t('suggested.compare_plans', locale), action: 'send_text', payload: 'Compare plans and pricing', variant: 'primary', category: 'plans' },
      { id: 'enterprise-pricing', label: t('suggested.enterprise_pricing', locale), action: 'send_text', payload: 'Show enterprise pricing', variant: 'secondary', category: 'plans' },
      { id: 'roi-calculator', label: t('suggested.roi_fit', locale), action: 'send_text', payload: 'Help me calculate ROI', variant: 'secondary', category: 'guidance' },
      { id: 'book-demo', label: t('suggested.book_demo', locale), action: 'send_text', payload: 'I want to book a demo', variant: 'primary', category: 'demo' },
    ] as SmartButton[];
    return pricingActions.filter((action) => !seen.has(action.label.toLowerCase()));
  }

  if (normalized.includes('product') || normalized.includes('service') || normalized.includes('offer')) {
    const offerActions = [
      { id: 'compare-products', label: t('suggested.compare_products', locale), action: 'send_text', payload: 'Compare the main products', variant: 'secondary' },
      { id: 'implementation', label: t('suggested.implementation_time', locale), action: 'send_text', payload: 'What is the implementation timeline?', variant: 'secondary' },
      { id: 'customer-stories', label: t('suggested.customer_stories', locale), action: 'send_text', payload: 'Show customer stories', variant: 'secondary' },
      { id: 'talk-sales', label: t('suggested.talk_to_sales', locale), action: 'send_text', payload: 'Connect me with sales', variant: 'secondary' },
    ] as SmartButton[];
    return offerActions.filter((action) => !seen.has(action.label.toLowerCase()));
  }

  if (normalized.includes('demo') || normalized.includes('book') || normalized.includes('schedule')) {
    return [
      { id: 'schedule-call', label: t('suggested.book_demo', locale), action: 'send_text' as const, payload: 'Schedule a call', variant: 'primary' as const, category: 'demo' },
      { id: 'contact-sales', label: t('suggested.talk_to_sales', locale), action: 'send_text' as const, payload: 'Connect me with sales', variant: 'secondary' as const, category: 'sales' },
      { id: 'faq', label: t('suggested.common_questions', locale), action: 'send_text' as const, payload: 'What are the most common questions?', variant: 'secondary' as const, category: 'faq' },
      { id: 'compare-plans', label: t('suggested.compare_plans', locale), action: 'send_text' as const, payload: 'Compare plans and pricing', variant: 'secondary' as const, category: 'plans' },
    ].filter((action) => !seen.has(action.label.toLowerCase())) as SmartButton[];
  }

  return baseActions.filter((action) => !seen.has(action.label.toLowerCase())).slice(0, 4);
}

const DEFAULT_CONFIG: Required<Omit<WidgetConfig, 'tenantId' | 'apiKey' | 'widgetToken' | 'sessionId' | 'businessProfile'>> & { tenantId?: string; apiKey?: string; widgetToken?: string; sessionId?: string; businessProfile?: Record<string, unknown> } = {
  apiUrl: '',
  tenantId: undefined as any,
  apiKey: undefined as any,
  sessionId: undefined as any,
  widgetToken: undefined as any,
  title: 'Chat Assistant',
  subtitle: '',
  primaryColor: '#006248',
  accentColor: '#006248',
  avatarUrl: undefined as any,
  greeting: '',
  greetingText: undefined as any,
  position: 'bottom-right',
  widgetPosition: undefined as any,
  theme: 'light',
  themeMode: undefined as any,
  companyName: '',
  launcherText: '',
  logoUrl: undefined as any,
  autoOpen: false,
  autoOpenDelay: 3,
  customCss: '',
  starterOptions: [],
  suggestedActions: [],
  locale: 'en',
};

let messageIdCounter = 0;
function nextId(): string {
  return `msg-${Date.now()}-${++messageIdCounter}`;
}

export class ChatWidget {
  private config: typeof DEFAULT_CONFIG;
  private messages: ChatMessage[] = [];
  private businessProfile: BusinessContextLike = {};
  private isOpen = false;
  private widgetState: 'closed' | 'open' = 'closed';
  private isStreaming = false;
  private abortController: AbortController | null = null;
  private container: HTMLDivElement | null = null;
  private messagesEl: HTMLDivElement | null = null;
  private inputEl: HTMLTextAreaElement | null = null;
  private sendBtnEl: HTMLButtonElement | null = null;
  private bubbleEl: HTMLDivElement | null = null;
  private headerTitleEl: HTMLDivElement | null = null;
  private headerSubtitleEl: HTMLDivElement | null = null;
  private headerEl: HTMLDivElement | null = null;
  private unreadCount = 0;
  private actionPanel: HTMLDivElement | null = null;
  private uiState: ConversationUIState | null = null;
  private cta: Record<string, unknown> | null = null;
  private suggestedOptions: string[] = [];
  private quickReplies: any[] = [];
  private unreadBadge: HTMLSpanElement | null = null;
  private preOpenPanelEl: HTMLDivElement | null = null;
  private configLoadPromise: Promise<void> | null = null;
  private suggestionHistory: SmartButton[] = [];
  private preOpenDismissed = false;
  private handoffEl: HTMLDivElement | null = null;
  private handoffShown = false;
  private takeoverEl: HTMLDivElement | null = null;
  private takeoverShown = false;
  private placeholderInterval: ReturnType<typeof setInterval> | null = null;
  private autoOpenTimer: ReturnType<typeof setTimeout> | null = null;
  private autoOpenFired = false;
  private headerLogoEl: HTMLImageElement | null = null;
  private charCounterEl: HTMLDivElement | null = null;
  /** The primaryColor from the embed data-attribute — preserved over remote config. */
  private embedPrimaryColor: string | null = null;
  /** Long-lived SSE stream of takeover events (TAKEOVER_STARTED / OPERATOR_MESSAGE / TAKEOVER_ENDED). */
  private takeoverEventsController: AbortController | null = null;
  /** Polls GET /api/chat/history for operator messages during a human takeover. */
  private agentPollTimer: ReturnType<typeof setInterval> | null = null;
  private agentPollController: AbortController | null = null;
  private configPollTimer: ReturnType<typeof setInterval> | null = null;
  /** True only when the visitor explicitly clicked "Talk to a human" + confirmed dialog.
   *  Guards against the backend returning humanTakeover:true on a stale session or
   *  the SSE stream pushing TAKEOVER_STARTED for a session that was already in
   *  human_takeover state from a prior page load. */
  private humanTakeoverRequested = false;
  private lastAgentSeq = 0;
  private get placeholders(): string[] {
    const type = (this.businessProfile.businessType || '').toLowerCase();
    const locale = this.config.locale;
    if (/ecommerce|retail|store|shop|medical|pharma/.test(type)) {
      return [t('placeholder.ecommerce_0', locale), t('placeholder.ecommerce_1', locale), t('placeholder.ecommerce_2', locale), t('placeholder.ecommerce_3', locale)];
    }
    if (/clinic|dental|healthcare|hospital/.test(type)) {
      return [t('placeholder.clinic_0', locale), t('placeholder.clinic_1', locale), t('placeholder.clinic_2', locale), t('placeholder.clinic_3', locale)];
    }
    return [t('placeholder.default_0', locale), t('placeholder.default_1', locale), t('placeholder.default_2', locale), t('placeholder.default_3', locale)];
  }
  private boundDismissPreOpen = (e: Event) => {
    if (this.preOpenPanelEl && !this.preOpenPanelEl.contains(e.target as Node)) {
      this.dismissPreOpenPanel();
    }
  };

  constructor(config: WidgetConfig) {
    // Singleton guard: if another widget instance already exists on this page,
    // tear it down before mounting a fresh one.
    if (typeof window !== 'undefined') {
      const prev = (window as any).__BurFlowWidgetInstance as ChatWidget | undefined;
      if (prev && prev !== this) {
        prev.destroy();
      }
    }
    this.config = { ...DEFAULT_CONFIG, ...this.normalizeAliases(config) };
    // Resolve effective locale: data-lang > document.lang > browser > 'en'
    if (!this.config.locale || this.config.locale === 'en') {
      const docLang = typeof document !== 'undefined' ? document.documentElement?.lang?.slice(0, 2) : undefined;
      if (docLang && ['bg','hr','cs','da','nl','en','et','fi','fr','de','el','hu','ga','it','lv','lt','mt','pl','pt','ro','sk','sl','es','sv'].includes(docLang)) {
        this.config.locale = docLang;
      } else if (typeof navigator !== 'undefined') {
        const navLang = navigator.language?.slice(0, 2);
        if (navLang && ['bg','hr','cs','da','nl','en','et','fi','fr','de','el','hu','ga','it','lv','lt','mt','pl','pt','ro','sk','sl','es','sv'].includes(navLang)) {
          this.config.locale = navLang;
        }
      }
    }
    this.embedPrimaryColor = config.primaryColor || null;
    this.restoreSessionId();
    this.businessProfile = this.deriveBusinessProfileFromConfig();
  }

  private normalizeAliases(remote: Partial<WidgetConfig>): Partial<WidgetConfig> {
    const merged: Partial<WidgetConfig> = { ...remote };
    if (merged.themeMode !== undefined && merged.theme === undefined) merged.theme = merged.themeMode;
    if (merged.widgetPosition !== undefined && merged.position === undefined) {
      merged.position =
        merged.widgetPosition === 'right' ? 'bottom-right'
        : merged.widgetPosition === 'left' ? 'bottom-left'
        : merged.widgetPosition;
    }
    if (merged.greetingText !== undefined && merged.greeting === undefined) merged.greeting = merged.greetingText;
    return merged;
  }

  private injectStyles(): void {
    if (document.getElementById('cw-widget-styles')) return;
    const style = document.createElement('style');
    style.id = 'cw-widget-styles';
    style.textContent = `
      @keyframes cw-blink { 0%,100%{opacity:1} 50%{opacity:0} }
      @keyframes cw-pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
      @keyframes cw-slide-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      @keyframes cw-slide-in { from{opacity:0;transform:translateX(20px) scale(0.95)} to{opacity:1;transform:translateX(0) scale(1)} }
      @keyframes cw-bubble-pulse { 0%,100%{box-shadow:0 8px 32px rgba(0,98,72,0.45),0 2px 8px rgba(0,0,0,0.1)} 50%{box-shadow:0 8px 40px rgba(0,98,72,0.6),0 2px 12px rgba(0,0,0,0.15)} }
      .cw-bubble { background:linear-gradient(135deg,var(--cw-primary-color,#006248) 0%,var(--cw-primary-color,#004d38) 100%); }
      .cw-send { background:linear-gradient(135deg,var(--cw-primary-color,#006248) 0%,var(--cw-primary-color,#004d38) 100%); }
      .cw-header { background: var(--burflow-header-bg, var(--cw-primary-color, #006248)) !important; }
      .cw-bubble:hover { transform:scale(1.05) !important; box-shadow:0 12px 40px color-mix(in srgb, var(--cw-primary-color,#006248) 55%, transparent) !important; }
      .cw-send:hover { transform:scale(1.05) !important; box-shadow:0 6px 24px color-mix(in srgb, var(--cw-primary-color,#006248) 40%, transparent) !important; }
      .cw-action-button:active { transform:scale(0.96) !important; box-shadow:none !important; }
      html.cw-widget-open .cw-bubble { display:none !important; visibility:hidden !important; opacity:0 !important; pointer-events:none !important; }
      html.cw-widget-open .cw-preopen-panel { display:none !important; visibility:hidden !important; opacity:0 !important; pointer-events:none !important; }
      .cw-bubble-hidden { display:none !important; visibility:hidden !important; opacity:0 !important; pointer-events:none !important; }
      .cw-container { display:none !important; flex-direction:column !important; overflow:hidden !important; }
      .cw-messages { flex:1 1 0 !important; min-height:0 !important; overflow-y:auto !important; }
      .cw-input-area { flex-shrink:0 !important; }
      .cw-action-panel { flex-shrink:0 !important; }
      .cw-takeover { flex-shrink:0 !important; }
      .cw-handoff { flex-shrink:0 !important; }
      .cw-input:focus { border-color:var(--cw-primary-color,#006248) !important; box-shadow:0 0 0 3px color-mix(in srgb, var(--cw-primary-color,#006248) 12%, transparent) !important; background:#fff !important; }
      .cw-preopen-panel { border:1.5px solid #E8F5E9 !important; box-shadow:0 20px 60px rgba(0,98,72,0.12),0 4px 20px rgba(0,0,0,0.06) !important; }
      .cw-preopen-pill { background:color-mix(in srgb, var(--cw-primary-color,#006248) 10%, white) !important; color:var(--cw-primary-color,#006248) !important; border:1px solid color-mix(in srgb, var(--cw-primary-color,#006248) 20%, white) !important; }
      .cw-preopen-pill:hover { background:var(--cw-primary-color,#006248) !important; color:#fff !important; }
      /* Assistant message row — stacked column so chips render below the bubble */
      .cw-message-assistant { display:flex !important; flex-direction:column !important; align-items:flex-start !important; width:100% !important; margin-bottom:12px; }
      .cw-message-assistant .cw-message-bubble { max-width:85%; align-self:flex-start; background-color:#f3f4f6; border-radius:12px; padding:10px 14px; }
      /* Quick Reply Container attached UNDER the message */
      .cw-message-chips { display:flex !important; flex-wrap:wrap !important; gap:6px !important; margin-top:8px !important; width:100% !important; justify-content:flex-start !important; }
      /* Individual Chip Styling */
      .cw-chip { display:inline-flex; align-items:center; padding:5px 10px; border-radius:14px; font-size:11px; font-weight:500; cursor:pointer; white-space:nowrap; border:1px solid #d1d5db; background-color:#ffffff; transition:all 0.2s ease; }
      .cw-chip-demo, .cw-chip-sales { background-color:var(--cw-primary-color,#006248); color:#fff; border-color:var(--cw-primary-color,#006248); }
      .cw-chip-pricing { background-color:#ecfdf5; border-color:#a7f3d0; color:#065f46; }
      .cw-chip-features, .cw-chip-support { background-color:#eff6ff; border-color:#bfdbfe; color:#1e40af; }
      .cw-chip-qualification { background-color:#fffbeb; border-color:#fde68a; color:#92400e; }
      .cw-chip-competitor { background-color:#faf5ff; border-color:#e9d5ff; color:#6b21a8; }
      .cw-chip-security { background-color:#ecfdf5; border-color:#a7f3d0; color:#065f46; }
      .cw-chip-followup { background-color:#f9fafb; border-color:#e5e7eb; color:#6b7280; }
      /* Welcome action cards */
      .cw-welcome-cards { display:flex; flex-direction:column; gap:6px; padding:2px 0 6px; }
      .cw-welcome-card { display:flex; align-items:center; gap:10px; padding:10px 12px; border:1.5px solid #E8ECF1; border-radius:12px; background:#fff; cursor:pointer; transition:all 0.2s cubic-bezier(0.16,1,0.3,1); text-align:left; font-family:inherit; width:100%; }
      .cw-welcome-card:hover { border-color:#A5D6A7; background:#F0FAF4; transform:translateY(-1px); box-shadow:0 4px 16px rgba(0,98,72,0.08); }
      .cw-welcome-card:active { transform:translateY(0); box-shadow:none; }
      .cw-welcome-card-icon { width:32px; height:32px; display:grid; place-items:center; border-radius:10px; background:color-mix(in srgb, var(--cw-primary-color,#006248) 10%, white); color:var(--cw-primary-color,#006248); flex-shrink:0; }
      .cw-welcome-card-icon svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
      .cw-welcome-card-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
      .cw-welcome-card-body b { font-size:13px; font-weight:600; color:#1F2937; letter-spacing:-0.01em; line-height:1.35; }
      .cw-welcome-card-body small { font-size:11px; color:#6B7280; line-height:1.35; white-space:normal; overflow:visible; }
      .cw-welcome-card-badge { display:inline-block; padding:2px 6px; border-radius:999px; background:color-mix(in srgb, var(--cw-primary-color,#006248) 10%, white); color:var(--cw-primary-color,#006248); font-size:9px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; margin-bottom:2px; width:fit-content; }
      .cw-welcome-card-arrow { width:16px; height:16px; flex-shrink:0; color:#9CA3AF; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; transition:transform 0.15s ease, color 0.15s ease; }
      .cw-welcome-card:hover .cw-welcome-card-arrow { transform:translateX(2px); color:#006248; }
      .cw-welcome-section { margin-top:12px; }
      .cw-welcome-section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
      .cw-welcome-section-title { font-size:10px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#374151; }
      .cw-welcome-section-meta { font-size:10px; color:#9CA3AF; }
      .cw-welcome-escape { display:block; width:100%; padding:6px 0; margin-top:4px; border:0; background:transparent; color:var(--cw-primary-color,#006248); font-size:12px; font-weight:600; font-family:inherit; cursor:pointer; text-align:center; border-radius:8px; transition:background 0.15s ease; }
      .cw-welcome-escape:hover { background:#F0FAF4; }
      .cw-welcome-icon { width:30px; height:30px; display:grid; place-items:center; border-radius:10px; background:color-mix(in srgb, var(--cw-primary-color,#006248) 10%, white); color:var(--cw-primary-color,#006248); margin-bottom:8px; }
      .cw-welcome-icon svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
      html[data-cw-theme='dark'] .cw-container { background:#111827 !important; }
      html[data-cw-theme='dark'] .cw-messages { background:#0F172A !important; }
      html[data-cw-theme='dark'] .cw-input-area { background:#111827 !important; border-top-color:#1F2937 !important; }
      html[data-cw-theme='dark'] .cw-action-panel { background:#0F172A !important; border-top-color:#1F2937 !important; }
      html[data-cw-theme='dark'] .cw-input { background:#1F2937 !important; border-color:#374151 !important; color:#F3F4F6 !important; }
      html[data-cw-theme='dark'] .cw-card { background:#1F2937 !important; border-color:#374151 !important; color:#E5E7EB !important; }
      html[data-cw-theme='dark'] .cw-msg-user { background:var(--cw-primary-color,#006248) !important; color:#fff !important; }
      html[data-cw-theme='dark'] .cw-bubble-label { color:#E5E7EB !important; }
      html[data-cw-theme='dark'] .cw-preopen-panel { background:#1F2937 !important; border-color:#374151 !important; }
      html[data-cw-theme='dark'] .cw-preopen-panel div { color:#E5E7EB !important; }
      html[data-cw-theme='dark'] .cw-highlight { background: rgba(255,255,255,0.1) !important; }
      html[data-cw-theme='dark'] .cw-welcome-card:hover { background: #2a2a2a; }
      html[data-cw-theme='dark'] .cw-welcome-card:focus { outline-color: #60a5fa; }
      html[data-cw-theme='dark'] .cw-msg-chip:hover { background: #3b3b3b; }
      html[data-cw-theme='dark'] .cw-msg-chip:focus { outline-color: #60a5fa; }
      html[data-cw-theme='dark'] .cw-typing { background: #2a2a2a; color: #d1d5db; }
      html[data-cw-theme='dark'] .cw-msg-agent { background: #1a3a2a; }
      html[data-cw-theme='dark'] .cw-takeover-banner { background: #1a3a2a; color: #d1d5db; }
      html[data-cw-theme='dark'] .cw-handoff-form input { background: #2a2a2a; color: #d1d5db; border-color: #4b5563; }
      html[data-cw-theme='dark'] .cw-chip { background: #2a2a2a; color: #d1d5db; border-color: #4b5563; }
      html[data-cw-theme='dark'] .cw-chip:hover { background: #3b3b3b; }
      html[data-cw-theme='dark'] .cw-message-bubble { color: #e5e7eb; }
      html[data-cw-theme='dark'] .cw-message-content a { color: #60a5fa; }
      html[data-cw-theme='dark'] .cw-msg-time { color: #6b7280; }
      @media (max-width:640px) {
        .cw-container { left:10px !important; right:10px !important; bottom:10px !important; width:auto !important; height:min(70dvh, 600px) !important; border-radius:20px !important; }
        .cw-container .cw-header { border-radius:20px 20px 0 0 !important; }
        .cw-bubble { bottom:16px !important; }
        .cw-preopen-panel { bottom:72px !important; left:auto !important; right:16px !important; max-width:264px !important; border-radius:14px !important; }
        .cw-preopen-pill { padding:8px 12px !important; font-size:12.5px !important; }
        .cw-header { padding:10px 12px !important; }
        .cw-header .cw-logo { width:28px !important; height:28px !important; }
        .cw-messages { padding:12px 12px !important; gap:10px !important; }
        .cw-input-area { padding:0 12px !important; }
        .cw-input { padding:8px 10px !important; font-size:13px !important; min-height:36px !important; border-radius:12px !important; }
        .cw-send { width:36px !important; height:36px !important; border-radius:12px !important; }
        .cw-action-panel { padding:8px 12px 6px !important; gap:8px !important; }
        .cw-welcome-card { padding:8px 10px !important; gap:8px !important; }
        .cw-welcome-card-icon { width:28px !important; height:28px !important; border-radius:9px !important; }
        .cw-welcome-card-body b { font-size:12.5px !important; }
        .cw-welcome-card-body small { font-size:11px !important; }
      }
      @media (hover: none) { .cw-msg-time { opacity: 0.6 !important; } }
    `;
    document.head.appendChild(style);
  }

  mount(): void {
    if (this.container) return;
    // Defense-in-depth: if another widget instance already appended a bubble or
    // chat window to the DOM, abort to prevent duplicate launchers/windows on
    // the same page.
    if (document.querySelector('.cw-bubble') || document.querySelector('.cw-container')) return;
    this.injectStyles();
    this.applyBrandingVars();
    this.createBubble();
    this.createChatWindow();
    this.loadMessages();
    if (this.config.widgetToken) {
      this.configLoadPromise = this.fetchRemoteConfig();
      this.startConfigPolling();
    }
    this.startAgentPolling();
    this.subscribeTakeoverEvents();
  }

  /**
   * Safely tear down this widget instance: remove all DOM nodes, cancel timers,
   * and clear the global singleton reference so a new instance can mount.
   */
  destroy(): void {
    this.unmount();
    if (typeof window !== 'undefined') {
      if ((window as any).__BurFlowWidgetInstance === this) {
        (window as any).__BurFlowWidgetInstance = null;
      }
      if ((window as any).__CURRENT_WIDGET === this) {
        (window as any).__CURRENT_WIDGET = null;
      }
    }
  }

  unmount(): void {
    this.abort();
    this.takeoverEventsController?.abort();
    this.takeoverEventsController = null;
    this.agentPollController?.abort();
    this.agentPollController = null;
    if (this.placeholderInterval) { clearInterval(this.placeholderInterval); this.placeholderInterval = null; }
    if (this.autoOpenTimer) { clearTimeout(this.autoOpenTimer); this.autoOpenTimer = null; }
    if (this.agentPollTimer) { clearInterval(this.agentPollTimer); this.agentPollTimer = null; }
    if (this.configPollTimer) { clearInterval(this.configPollTimer); this.configPollTimer = null; }
    this.container?.remove();
    this.bubbleEl?.remove();
    this.preOpenPanelEl?.remove();
    this.container = null;
    this.bubbleEl = null;
    this.preOpenPanelEl = null;
    this.messagesEl = null;
    this.inputEl = null;
    // Clear the global widget reference so a new instance can mount.
    if (typeof window !== 'undefined' && (window as any).__CURRENT_WIDGET === this) {
      (window as any).__CURRENT_WIDGET = null;
    }
    // Remove document-level click listener added by createPreOpenPanel
    document.removeEventListener('click', this.boundDismissPreOpen);
  }

  /**
   * Poll the chat history every 4s while the widget is alive. Only agent-sent
   * messages (sender='agent', sequence > lastAgentSeq) are appended, so AI
   * responses — which arrive synchronously over SSE — are never duplicated and
   * operator replies reach the visitor without them sending a new message.
   */
  private startAgentPolling(): void {
    if (this.agentPollTimer) return;
    this.agentPollController = new AbortController();
    const POLL_INTERVAL_MS = 4000;
    this.agentPollTimer = setInterval(() => { this.pollForAgentMessages(); }, POLL_INTERVAL_MS);
    this.pollForAgentMessages();
  }

  private startConfigPolling(): void {
    if (this.configPollTimer) return;
    const CONFIG_POLL_MS = 30000;
    this.configPollTimer = setInterval(() => { this.fetchRemoteConfig(); }, CONFIG_POLL_MS);
  }

  /**
   * Subscribes to the session takeover event stream (SSE). This is the
   * real-time channel for TAKEOVER_STARTED / OPERATOR_MESSAGE / TAKEOVER_ENDED
   * — the 4s history poll remains as a fallback for browsers/connections that
   * cannot hold an SSE stream open.
   */
  private subscribeTakeoverEvents(): void {
    const sessionId = this.config.sessionId;
    const apiUrl = this.config.apiUrl;
    if (!sessionId) return;

    // Defensive: if fetch is unavailable or fails to return a promise, never
    // let subscription break widget mounting (a synchronous throw here would
    // propagate through mount() and could trigger the autoInit fallback path).
    try {
      this.takeoverEventsController?.abort();
    } catch {
      /* ignore */
    }
    this.takeoverEventsController = new AbortController();

    const headers: Record<string, string> = { Accept: 'text/event-stream' };
    if (this.config.tenantId) headers['x-tenant-id'] = this.config.tenantId;
    if (this.config.apiKey) headers['x-api-key'] = this.config.apiKey;
    if (this.config.widgetToken) headers['x-widget-token'] = this.config.widgetToken;

    const url = `${apiUrl}/api/chat/events?sessionId=${encodeURIComponent(sessionId)}`;
    Promise.resolve(fetch(url, { headers, signal: this.takeoverEventsController.signal }))
      .then(async (res) => {
        if (!res.ok || !res.body) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split('\n\n');
          buffer = frames.pop() || '';
          for (const frame of frames) {
            const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
            if (!dataLine) continue;
            const raw = dataLine.slice(5).trim();
            if (!raw) continue;
            try {
              this.handleTakeoverEvent(JSON.parse(raw));
            } catch {
              /* malformed frame — ignore */
            }
          }
        }
      })
      .catch(() => {
        // SSE is best-effort; the 4s poll covers failures.
      });
  }

  private handleTakeoverEvent(event: { type?: string; payload?: Record<string, unknown> }): void {
    switch (event.type) {
      case 'TAKEOVER_STARTED':
        if (this.humanTakeoverRequested) {
          this.showTakeoverBanner();
          this.hideStarterChips();
        }
        break;
      case 'OPERATOR_MESSAGE': {
        const payload = event.payload || {};
        const content = typeof payload.content === 'string' ? payload.content : '';
        const seq = typeof payload.sequenceNumber === 'number' ? payload.sequenceNumber : 0;
        if (!content) break;
        if (seq > this.lastAgentSeq) {
          this.lastAgentSeq = seq;
          this.addMessage({ role: 'assistant', content, sender: 'agent', sequenceNumber: seq });
          this.scrollToBottom();
          this.hideTypingIndicator();
        }
        break;
      }
      case 'TAKEOVER_ENDED':
        this.hideTakeoverBanner();
        break;
    }
  }

  private async pollForAgentMessages(): Promise<void> {
    const sessionId = this.config.sessionId;
    // Empty apiUrl means same-origin — relative /api/... URLs resolve against
    // the page origin (Vite proxy in dev, nginx in prod).
    const apiUrl = this.config.apiUrl;
    if (!sessionId) return;

    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (this.config.tenantId) headers['x-tenant-id'] = this.config.tenantId;
      if (this.config.apiKey) headers['x-api-key'] = this.config.apiKey;
      if (this.config.widgetToken) headers['x-widget-token'] = this.config.widgetToken;

      const url = `${apiUrl}/api/chat/history?sessionId=${encodeURIComponent(sessionId)}&after=${this.lastAgentSeq}`;
      const res = await fetch(url, { headers, signal: this.agentPollController?.signal });
      if (!res.ok) return;
      const data = await res.json();
      const incoming: Array<{ id: string; content: string; sequenceNumber: number; createdAt: string }> = data?.messages || [];
      for (const m of incoming) {
        if (!m || typeof m.content !== 'string') continue;
        this.lastAgentSeq = Math.max(this.lastAgentSeq, m.sequenceNumber || 0);
        this.addMessage({ role: 'assistant', content: m.content, sender: 'agent', sequenceNumber: m.sequenceNumber });
      }
      if (incoming.length > 0) {
        this.scrollToBottom();
        this.hideTypingIndicator();
      }
    } catch {
      // Silent — polling must never throw on the page.
    }
  }

  private applyBrandingVars(): void {
    if (typeof document === 'undefined') return;
    const primary = this.config.primaryColor || '#006248';
    const accent = (this.config as any).accentColor || primary;
    const headerBg = (this.config as any).effectiveHeaderBg || primary;
    document.documentElement.style.setProperty('--cw-primary-color', primary);
    document.documentElement.style.setProperty('--cw-accent-color', accent);
    document.documentElement.style.setProperty('--burflow-primary', primary);
    document.documentElement.style.setProperty('--burflow-header-bg', headerBg);

    let theme = this.config.theme || 'light';
    if (theme === 'auto') {
      try {
        theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
      } catch { theme = 'light'; }
    }
    document.documentElement.setAttribute('data-cw-theme', theme);

    let style = document.getElementById('cw-widget-custom') as HTMLStyleElement | null;
    const rawCss = this.config.customCss || '';
    // Sanitize CSS: strip dangerous patterns that could exfiltrate data or inject content
    const css = rawCss
      .replace(/url\s*\([^)]*\)/gi, 'url()')           // Block url() — data exfiltration vector
      .replace(/expression\s*\([^)]*\)/gi, '')           // Block IE expression()
      .replace(/@import\b[^;{]*/gi, '')                  // Block @import
      .replace(/behavior\s*:/gi, '')                      // Block IE behavior
      .replace(/javascript\s*:/gi, '')                    // Block javascript:
      .replace(/-moz-binding\s*:/gi, '');                 // Block Firefox XBL binding
    if (css.trim()) {
      if (!style) {
        style = document.createElement('style');
        style.id = 'cw-widget-custom';
        document.head.appendChild(style);
      }
      style.textContent = css;
    } else if (style) {
      style.remove();
    }
  }

  private createBubble(): void {
    const bubble = document.createElement('div');
    bubble.className = 'cw-bubble';
    bubble.setAttribute('role', 'button');
    bubble.setAttribute('aria-label', t('bubble.aria', this.config.locale));
    bubble.setAttribute('tabindex', '0');
    bubble.style.cssText = this.getBubbleStyles();

    const icon = document.createElement('div');
    icon.className = 'cw-bubble-icon';
    icon.innerHTML = this.getChatIconSvg();
    bubble.appendChild(icon);

    const label = document.createElement('span');
    label.className = 'cw-bubble-label';
    label.textContent = t('bubble.label', this.config.locale);
    bubble.appendChild(label);

    const badge = document.createElement('span');
    badge.className = 'cw-bubble-badge';
    badge.style.cssText = 'display:none;position:absolute;top:-4px;right:-4px;background:#EF4444;color:#fff;border-radius:50%;min-width:20px;height:20px;padding:0 4px;font-size:11px;display:flex;align-items:center;justify-content:center;font-weight:600;';
    bubble.appendChild(badge);
    this.unreadBadge = badge;

    bubble.addEventListener('click', () => this.toggle());
    bubble.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.toggle(); }
    });

    document.body.appendChild(bubble);
    this.bubbleEl = bubble;
    this.createPreOpenPanel();
  }

  private createPreOpenPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'cw-preopen-panel';
    const pos = this.config.position === 'bottom-left' ? 'left:80px;' : 'right:80px;';
    panel.style.cssText = `position:fixed;bottom:76px;${pos}z-index:999990;display:none;max-width:264px;animation:cw-slide-in 0.3s cubic-bezier(0.16,1,0.3,1);background:#fff;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(15,23,42,0.12),0 8px 32px rgba(0,0,0,0.06);`;

    const header = document.createElement('div');
    header.style.cssText = 'padding:12px 14px 8px;display:flex;align-items:center;gap:8px;';
    const brandMark = document.createElement('span');
    const bc = this.config.primaryColor || '#006248';
    brandMark.style.cssText = `width:22px;height:22px;display:grid;place-items:center;border-radius:7px;background:${bc};color:#fff;font-size:13px;font-weight:800;flex-shrink:0;`;
    brandMark.textContent = (this.config.companyName || 'C')[0].toUpperCase();
    header.appendChild(brandMark);
    const brandText = document.createElement('span');
    brandText.style.cssText = 'font-size:11.5px;font-weight:600;color:#111827;';
    brandText.textContent = this.config.companyName || 'Chat';
    header.appendChild(brandText);
    const statusDot = document.createElement('span');
    statusDot.style.cssText = 'font-size:10px;color:#6B7280;margin-left:auto;';
    statusDot.textContent = t('preopen.status', this.config.locale);
    header.appendChild(statusDot);
    panel.appendChild(header);

    const questionEl = document.createElement('div');
    questionEl.style.cssText = 'padding:0 14px 8px;font-size:12.5px;color:#374151;line-height:1.5;';
    questionEl.textContent = t('preopen.prompt', this.config.locale);
    panel.appendChild(questionEl);

    const optionsWrap = document.createElement('div');
    optionsWrap.className = 'cw-preopen-options';
    panel.appendChild(optionsWrap);

    const escapeLink = document.createElement('div');
    const ec = this.config.primaryColor || '#006248';
    escapeLink.style.cssText = `padding:6px 14px 12px;text-align:center;font-size:11.5px;color:${ec};font-weight:600;cursor:pointer;transition:background 0.15s ease;border-radius:0 0 14px 14px;`;
    escapeLink.textContent = t('preopen.escape', this.config.locale);
    escapeLink.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismissPreOpenPanel();
      if (!this.isOpen) this.toggle();
    });
    panel.appendChild(escapeLink);

    document.body.appendChild(panel);
    this.preOpenPanelEl = panel;
    this.renderPreOpenOptions();

    setTimeout(() => {
      if (!this.preOpenDismissed && !this.isOpen && panel.parentNode) {
        panel.style.display = 'block';
      }
    }, 2000);
    setTimeout(() => this.dismissPreOpenPanel(), 12000);
    document.addEventListener('click', this.boundDismissPreOpen);
  }

  private renderPreOpenOptions(): void {
    if (!this.preOpenPanelEl) return;
    const wrap = this.preOpenPanelEl.querySelector('.cw-preopen-options');
    if (!wrap) return;
    wrap.innerHTML = '';

    const options = this.config.starterOptions?.length
      ? this.config.starterOptions
      : this.defaultStarterOptions();

    options.forEach((text, i) => {
      const row = document.createElement('div');
      row.style.cssText = `padding:8px 14px;display:flex;align-items:center;gap:8px;${i < options.length - 1 ? 'border-bottom:1px solid #F3F4F6;' : ''}transition:all 0.18s ease;cursor:pointer;`;

      const pill = document.createElement('span');
      pill.className = 'cw-preopen-pill';
      const pc = this.config.primaryColor || '#006248';
      pill.style.cssText = `display:inline-flex;align-items:center;padding:6px 12px;border-radius:9px;background:${this.hexToRgba(pc, 0.1)};color:${pc};font-size:12.5px;font-weight:500;white-space:nowrap;border:1px solid ${this.hexToRgba(pc, 0.2)};transition:all 0.18s ease;line-height:1.3;flex:1;`;
      pill.textContent = text;
      row.appendChild(pill);

      const chevron = document.createElement('span');
      chevron.style.cssText = 'color:#9CA3AF;font-size:11px;flex-shrink:0;transition:transform 0.15s ease;';
      chevron.textContent = '›';
      row.appendChild(chevron);

      row.addEventListener('mouseenter', () => { row.style.background = '#F0FAF4'; pill.style.transform = 'translateX(3px)'; });
      row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; pill.style.transform = 'translateX(0)'; });
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dismissPreOpenPanel();
        if (!this.isOpen) this.toggle();
        setTimeout(() => {
          if (this.inputEl) { this.inputEl.value = text; this.send(); }
        }, 150);
      });
      wrap.appendChild(row);
    });
  }

  private showPreOpenPanel(): void {
    if (this.preOpenDismissed || this.isOpen || !this.preOpenPanelEl) return;
    this.preOpenPanelEl.style.setProperty('display', 'block');
    this.preOpenPanelEl.style.setProperty('visibility', 'visible');
    this.preOpenPanelEl.style.setProperty('pointer-events', 'auto');
    this.preOpenDismissed = true;
    setTimeout(() => this.dismissPreOpenPanel(), 12000);
  }

  private dismissPreOpenPanel(): void {
    if (this.preOpenPanelEl) {
      this.preOpenPanelEl.style.setProperty('display', 'none', 'important');
      this.preOpenPanelEl.style.setProperty('visibility', 'hidden', 'important');
      this.preOpenPanelEl.style.setProperty('pointer-events', 'none', 'important');
    }
  }

  private defaultStarterOptions(): string[] {
    const type = (this.businessProfile.businessType || '').toLowerCase();
    const locale = this.config.locale;
    if (/ecommerce|retail|store|shop/.test(type)) {
      return [t('starter.ecommerce_0', locale), t('starter.ecommerce_1', locale), t('starter.ecommerce_2', locale)];
    }
    if (/clinic|dental|healthcare|hospital|medical|pharma/.test(type)) {
      return [t('starter.clinic_0', locale), t('starter.clinic_1', locale), t('starter.clinic_2', locale)];
    }
    if (/agency|consulting|services/.test(type)) {
      return [t('starter.default_0', locale), t('starter.default_1', locale), t('starter.default_2', locale)];
    }
    return [t('starter.default_0', locale), t('starter.default_1', locale), t('starter.default_2', locale)];
  }

  private createChatWindow(): void {
    const container = document.createElement('div');
    container.className = 'cw-container';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-label', 'Chat');
    container.setAttribute('aria-modal', 'true');
    container.style.cssText = this.getContainerStyles();
    container.style.setProperty('display', 'none', 'important');

    container.appendChild(this.createHeader());
    this.messagesEl = this.createMessagesArea();
    container.appendChild(this.messagesEl);
    this.actionPanel = this.createActionPanel();
    container.appendChild(this.actionPanel);
    container.appendChild(this.createInputArea());
    this.takeoverEl = this.createTakeoverArea();
    container.appendChild(this.takeoverEl);
    this.handoffEl = this.createHandoffArea();
    container.appendChild(this.handoffEl);

    // Do NOT append to DOM yet — only attach when the widget opens.
    this.container = container;

    if (this.config.autoOpen) {
      const delayMs = Math.max(0, Math.min((this.config.autoOpenDelay ?? 3), 60)) * 1000;
      this.autoOpenTimer = setTimeout(() => {
        this.autoOpenTimer = null;
        if (!this.isOpen) this.toggle();
      }, delayMs);
    }
  }

  private createHeader(): HTMLDivElement {
    const header = document.createElement('div');
    header.className = 'cw-header';
    this.headerEl = header;
    const c = this.config.primaryColor || '#006248';
    const cLight = this.lightenHex(c, 0.2);
    const cDark = this.darkenHex(c, 0.3);
    header.style.cssText = `background:linear-gradient(135deg,${cDark} 0%,${c} 60%,${cLight} 100%);color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;border-radius:18px 18px 0 0;`;

    const info = document.createElement('div');
    info.style.cssText = 'display:flex;align-items:center;gap:9px;';
    const logoUrl = this.config.logoUrl || this.config.avatarUrl;
    if (logoUrl) {
      const logo = document.createElement('img');
      logo.className = 'cw-logo';
      logo.alt = this.config.companyName || 'Logo';
      logo.style.cssText = 'width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0;background:#fff;border:1px solid rgba(255,255,255,0.25);';
      logo.src = logoUrl;
      info.appendChild(logo);
      this.headerLogoEl = logo;
    }
    const dot = document.createElement('span');
    dot.style.cssText = 'width:7px;height:7px;border-radius:50%;background:#34D399;flex-shrink:0;box-shadow:0 0 8px rgba(52,211,153,0.5);';
    info.appendChild(dot);
    const textWrap = document.createElement('div');
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:600;font-size:14px;';
    title.textContent = this.config.title || this.config.companyName || '';
    this.headerTitleEl = title;
    textWrap.appendChild(title);
    const subtitle = document.createElement('div');
    subtitle.style.cssText = 'font-size:10.5px;opacity:0.75;margin-top:1px;';
    subtitle.textContent = this.config.subtitle || t('header.subtitle', this.config.locale);
    this.headerSubtitleEl = subtitle;
    textWrap.appendChild(subtitle);
    info.appendChild(textWrap);
    header.appendChild(info);

    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex;align-items:center;gap:2px;flex-shrink:0;';

    const restartBtn = document.createElement('button');
    restartBtn.className = 'cw-restart';
    restartBtn.setAttribute('aria-label', 'Restart conversation');
    restartBtn.style.cssText = 'background:none;border:none;color:#fff;cursor:pointer;padding:4px;border-radius:4px;font-size:16px;line-height:1;';
    restartBtn.innerHTML = '&#x21BB;';
    restartBtn.addEventListener('click', () => this.resetConversation());
    btnGroup.appendChild(restartBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'cw-close';
    closeBtn.setAttribute('aria-label', t('header.close', this.config.locale));
    closeBtn.style.cssText = 'background:none;border:none;color:#fff;cursor:pointer;padding:4px;border-radius:4px;font-size:18px;line-height:1;';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.toggle());
    btnGroup.appendChild(closeBtn);

    header.appendChild(btnGroup);

    return header;
  }

  private createMessagesArea(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'cw-messages';
    el.setAttribute('role', 'log');
    el.setAttribute('aria-label', 'Chat messages');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-relevant', 'additions');
    el.style.cssText = 'flex:1 1 0;min-height:0;overflow-y:auto;padding:18px 16px;display:flex;flex-direction:column;gap:12px;background:#F8F9FB;overscroll-behavior:contain;';
    return el;
  }

  private createActionPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'cw-action-panel';
    panel.style.cssText = 'padding:10px 16px 6px;display:none;flex-direction:column;gap:8px;border-top:1px solid #E5E7EB;background:#F3F4F6;flex-shrink:0;';
    return panel;
  }

  private createInputArea(): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'cw-input-area';
    wrapper.style.cssText = 'padding:0 16px 0;border-top:1px solid #E8ECF1;background:#fff;border-radius:0 0 18px 18px;flex-shrink:0;';

    const inputRow = document.createElement('div');
    inputRow.style.cssText = 'display:flex;gap:10px;align-items:flex-end;padding:12px 0 0;';

    const textarea = document.createElement('textarea');
    textarea.className = 'cw-input';
    textarea.placeholder = this.placeholders[0];
    textarea.rows = 1;
    textarea.style.cssText = 'flex:1;resize:none;border:1.5px solid #E0E4EB;border-radius:12px;padding:10px 12px;font-size:13.5px;font-family:inherit;outline:none;max-height:120px;min-height:40px;line-height:1.4;transition:border-color 0.15s ease,box-shadow 0.15s ease;background:#F8F9FB;';

    let phIdx = 0;
    this.placeholderInterval = setInterval(() => {
      if (document.activeElement !== textarea && !textarea.value) {
        phIdx = (phIdx + 1) % this.placeholders.length;
        textarea.placeholder = this.placeholders[phIdx];
      }
    }, 3000);
    textarea.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    });
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      this.updateCharCounter();
    });
    this.inputEl = textarea;

    const charCounter = document.createElement('div');
    charCounter.className = 'cw-char-counter';
    charCounter.style.cssText = 'font-size:10px;color:#9CA3AF;text-align:right;padding:2px 0 0;display:none;line-height:1.3;';
    this.charCounterEl = charCounter;

    const sendBtn = document.createElement('button');
    sendBtn.className = 'cw-send';
    sendBtn.setAttribute('aria-label', t('input.send', this.config.locale));
    const sc = this.config.primaryColor || '#006248';
    sendBtn.style.cssText = `background:linear-gradient(135deg,${sc} 0%,${this.darkenHex(sc, 0.2)} 100%);color:#fff;border:none;border-radius:12px;width:40px;height:40px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 16px ${this.hexToRgba(sc, 0.3)};transition:transform 0.15s ease,box-shadow 0.15s ease;`;
    sendBtn.innerHTML = this.getSendIconSvg();
    sendBtn.addEventListener('click', () => this.send());
    this.sendBtnEl = sendBtn;

    inputRow.appendChild(textarea);
    inputRow.appendChild(sendBtn);
    wrapper.appendChild(inputRow);
    wrapper.appendChild(charCounter);

    const footer = document.createElement('div');
    footer.style.cssText = 'padding:5px 0 8px;text-align:center;';
    footer.innerHTML = `<span style="font-size:10px;color:#9CA3AF;letter-spacing:0.02em;">${t('input.footer', this.config.locale).replace(/<b>/g, `<b style="color:${this.sanitizeColor(this.config.primaryColor)};">`)}</span>`;
    wrapper.appendChild(footer);

    return wrapper;
  }

  private createTakeoverArea(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'cw-takeover';
    el.style.cssText = 'display:none;padding:0 16px 12px;background:#E8F5E9;border-top:1px solid #C8E6C9;flex-shrink:0;';
    return el;
  }

  private showTakeoverBanner(): void {
    if (!this.takeoverEl || this.takeoverShown) return;
    this.takeoverShown = true;
    this.takeoverEl.style.display = 'block';
    this.takeoverEl.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border-radius:12px;background:#fff;border:1px solid #E0E7FF;">
        <span style="font-size:14px;flex-shrink:0;">👤</span>
        <div>
          <p style="margin:0;font-size:12px;font-weight:600;color:${this.sanitizeColor(this.config.primaryColor)};">${t('takeover.banner_title', this.config.locale)}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#6B7280;line-height:1.5;">${t('takeover.banner_desc', this.config.locale)}</p>
        </div>
      </div>`;
  }

  /** Hides the takeover banner when the agent releases control or disconnects. */
  private hideTakeoverBanner(): void {
    this.takeoverShown = false;
    if (this.takeoverEl) this.takeoverEl.style.display = 'none';
  }

  /** Removes the starter chips while a human agent is driving the session. */
  private hideStarterChips(): void {
    if (!this.messagesEl) return;
    this.messagesEl.querySelectorAll('.cw-starter-chips,.cw-welcome-cards,.cw-welcome-section,.cw-welcome-escape,.cw-welcome-icon').forEach((el) => el.remove());
  }

  private createHandoffArea(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'cw-handoff';
    el.style.cssText = 'padding:0 16px 12px;display:none;background:#fff;border-radius:0 0 20px 20px;flex-shrink:0;';
    return el;
  }

  private updateHandoffVisibility(): void {
    // Removed: "Talk to a human" link no longer shown automatically
  }

  private showHandoffForm(): void {
    if (!this.handoffEl) return;
    this.handoffShown = true;
    const inputStyle = 'border:1.5px solid #E0E4EB;border-radius:10px;padding:8px 12px;font-size:13px;font-family:inherit;outline:none;background:#F8F9FB;width:100%;box-sizing:border-box;';
    const labelStyle = 'font-size:11px;color:#6B7280;margin:0 0 4px;font-weight:500;';
    this.handoffEl.innerHTML = `
      <div style="padding:8px 0;">
        <p style="font-size:12px;color:#6B7280;margin:0 0 8px;">${t('handoff.instruction', this.config.locale)}</p>
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <input type="email" class="cw-handoff-email" placeholder="${t('handoff.email_placeholder', this.config.locale)}" style="flex:1;${inputStyle}" />
          <button class="cw-handoff-submit" style="background:linear-gradient(135deg,${this.sanitizeColor(this.config.primaryColor)} 0%,${this.darkenHex(this.sanitizeColor(this.config.primaryColor), 0.2)} 100%);color:#fff;border:none;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;">${t('handoff.submit', this.config.locale)}</button>
        </div>
        <div style="margin-bottom:8px;">
          <p style="${labelStyle}">Phone (optional)</p>
          <input type="tel" class="cw-handoff-phone" placeholder="${t('handoff.phone_placeholder', this.config.locale) || 'Phone number'}" style="${inputStyle}" />
        </div>
        <div>
          <p style="${labelStyle}">Message (optional)</p>
          <textarea class="cw-handoff-message" placeholder="${t('handoff.message_placeholder', this.config.locale) || 'Additional notes'}" rows="2" style="${inputStyle}resize:vertical;min-height:48px;"></textarea>
        </div>
      </div>`;
    this.handoffEl.querySelector('.cw-handoff-submit')?.addEventListener('click', () => this.submitHandoff());
    this.handoffEl.querySelector('.cw-handoff-email')?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') this.submitHandoff();
    });
    this.handoffEl.querySelector('.cw-handoff-phone')?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') this.submitHandoff();
    });
    this.handoffEl.querySelector('.cw-handoff-message')?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.submitHandoff(); }
    });
  }

  private async submitHandoff(): Promise<void> {
    if (!this.handoffEl) return;
    const emailInput = this.handoffEl.querySelector('.cw-handoff-email') as HTMLInputElement | null;
    const phoneInput = this.handoffEl.querySelector('.cw-handoff-phone') as HTMLInputElement | null;
    const messageInput = this.handoffEl.querySelector('.cw-handoff-message') as HTMLTextAreaElement | null;
    const email = emailInput?.value.trim();
    if (!email || !email.includes('@')) {
      if (emailInput) emailInput.style.borderColor = '#EF4444';
      return;
    }
    const phone = phoneInput?.value.trim() || undefined;
    const message = messageInput?.value.trim() || undefined;
    try {
      const res = await fetch(`${this.config.apiUrl}/api/widget/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(this.config.widgetToken ? { 'x-widget-token': this.config.widgetToken } : {}) },
        body: JSON.stringify({ sessionId: this.config.sessionId, visitorEmail: email, phone, message }),
      });
      if (res.ok) {
        this.handoffEl.innerHTML = `<p style="font-size:12px;color:#059669;padding:8px 0;">${t('handoff.success', this.config.locale)}</p>`;
      } else {
        this.handoffEl.innerHTML = `<p style="font-size:12px;color:#DC2626;padding:8px 0;">${t('handoff.error', this.config.locale)}</p>`;
      }
    } catch {
      this.handoffEl.innerHTML = `<p style="font-size:12px;color:#DC2626;padding:8px 0;">${t('handoff.network_error', this.config.locale)}</p>`;
    }
  }

  /**
   * Hard-DOM removal: physically remove every `.cw-bubble` and the
   * pre-open panel from the document so they cannot overlap the chat window.
   */
  private removeBubbleAndPanel(): void {
    document.querySelectorAll('.cw-bubble').forEach((el) => el.remove());
    if (this.bubbleEl?.parentNode) {
      this.bubbleEl.parentNode.removeChild(this.bubbleEl);
    }
  }

  /**
   * Re-create the bubble DOM node from scratch and append it to
   * document.body so it appears exactly as it did on first mount.
   */
  private reattachBubble(): void {
    if (!this.bubbleEl) return;
    if (this.bubbleEl.parentNode) return;
    this.bubbleEl.style.cssText = this.getBubbleStyles();
    document.body.appendChild(this.bubbleEl);
  }

  /** Enforce strict mutual exclusion between CLOSED / OPEN states. */
  private applyWidgetState(state: 'closed' | 'open'): void {
    this.widgetState = state;
    this.isOpen = state === 'open';
    document.documentElement.classList.toggle('cw-widget-open', this.isOpen);

    // --- bubble ---
    if (state === 'closed') {
      if (this.bubbleEl && !this.bubbleEl.parentNode) {
        this.bubbleEl.style.cssText = this.getBubbleStyles();
        document.body.appendChild(this.bubbleEl);
      } else if (this.bubbleEl) {
        this.bubbleEl.style.display = 'flex';
      }
    } else {
      if (this.bubbleEl?.parentNode) this.bubbleEl.parentNode.removeChild(this.bubbleEl);
    }

    // --- container ---
    if (this.container) {
      if (state === 'open') {
        if (!this.container.parentNode) document.body.appendChild(this.container);
        this.container.style.setProperty('display', 'flex', 'important');
        this.container.style.animation = 'cw-slide-up 0.35s cubic-bezier(0.16,1,0.3,1)';
      } else {
        this.container.style.setProperty('display', 'none', 'important');
        if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
      }
    }
  }

  close(): void {
    if (!this.isOpen) return;
    this.applyWidgetState('closed');
  }

  toggle(): void {
    if (this.isOpen) {
      this.applyWidgetState('closed');
      return;
    }
    this.applyWidgetState('open');
    if (!this.container) return;
    this.unreadCount = 0;
    this.updateBadge();
    this.inputEl?.focus();
    const isFirstOpen = this.messages.length === 0;
    if (isFirstOpen) {
      this.addMessage({ role: 'assistant', content: this.getWelcomeMessage() });
      this.renderInitialActions();
    }
    this.renderUiState();
    this.scrollToBottom();
  }

  send(): void {
    const text = this.inputEl?.value.trim();
    if (!text || this.isStreaming || text.length > 2000) return;

    this.inputEl!.value = '';
    this.inputEl!.style.height = 'auto';
    this.clearUiState();
    this.fadeOutStarterChips();
    this.addMessage({ role: 'user', content: text });
    this.streamResponse(text);
  }

  private fadeOutStarterChips(): void {
    if (!this.messagesEl) return;
    const targets = this.messagesEl.querySelectorAll('.cw-starter-chips,.cw-welcome-cards,.cw-welcome-section,.cw-welcome-escape,.cw-welcome-icon');
    if (!targets.length) return;
    targets.forEach((el) => {
      (el as HTMLElement).style.opacity = '0';
      (el as HTMLElement).style.transition = 'opacity 0.25s ease';
    });
    setTimeout(() => targets.forEach((el) => el.remove()), 250);
  }

  private sendStarterPrompt(text: string): void {
    if (!text || this.isStreaming) return;
    this.fadeOutStarterChips();
    this.clearUiState();
    this.addMessage({ role: 'user', content: text });
    this.streamResponse(text);
  }

  private async requestHumanAgent(): Promise<void> {
    if (this.isStreaming) return;
    this.isStreaming = true;
    this.humanTakeoverRequested = true;

    const msg = t('human.request', this.config.locale);
    this.addMessage({ role: 'user', content: msg });

    const assistantMsg = this.addMessage({ role: 'assistant', content: '', streaming: true });
    this.scrollToBottom();
    this.renderTypingIndicator();

    try {
      const apiUrl = this.config.apiUrl;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.config.tenantId) headers['x-tenant-id'] = this.config.tenantId;
      if (this.config.apiKey) headers['x-api-key'] = this.config.apiKey;
      if (this.config.widgetToken) headers['x-widget-token'] = this.config.widgetToken;

      const res = await fetch(`${apiUrl}/api/support/request-human`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: this.config.sessionId,
          tenantId: this.config.tenantId,
          message: msg,
        }),
        signal: this.abortController?.signal,
      });

      this.hideTypingIndicator();

      if (res.ok) {
        assistantMsg.content = t('human.success', this.config.locale);
        assistantMsg.streaming = false;
        this.updateMessageContent(assistantMsg);
      } else {
        console.warn(`[BurFlow Widget] Talk to Human failed: HTTP ${res.status}`);
        assistantMsg.content = t('human.failure', this.config.locale);
        assistantMsg.streaming = false;
        this.updateMessageContent(assistantMsg);
      }
    } catch (err: any) {
      console.warn('[BurFlow Widget] Talk to Human error:', err?.message || err);
      this.hideTypingIndicator();
      assistantMsg.content = t('human.network_error', this.config.locale);
      assistantMsg.streaming = false;
      this.updateMessageContent(assistantMsg);
    }

    this.scrollToBottom();
  }

  private async streamResponse(userMessage: string): Promise<void> {
    this.isStreaming = true;
    this.updateSendButton();

    const assistantMsg = this.addMessage({ role: 'assistant', content: '', streaming: true });
    this.scrollToBottom();
    this.renderTypingIndicator();

    this.abortController = new AbortController();

    await streamChat({
      apiUrl: this.config.apiUrl,
      tenantId: this.config.tenantId,
      apiKey: this.config.apiKey,
      widgetToken: this.config.widgetToken,
      sessionId: this.config.sessionId,
      message: userMessage,
      signal: this.abortController.signal,
      onToken: (delta) => {
        assistantMsg.content += delta;
        this.updateMessageContent(assistantMsg);
        this.scrollToBottom();
      },
      onDone: () => {},
      onUiState: (uiState, cta, suggestedOptions, quickReplies) => {
        this.uiState = uiState || this.uiState || null;
        this.cta = cta || this.cta || null;
        if (Array.isArray(suggestedOptions)) {
          this.suggestedOptions = suggestedOptions;
        }
        if (Array.isArray(quickReplies) && quickReplies.length > 0) {
          this.quickReplies = quickReplies;
        }
        this.renderUiState();
      },
      onHumanTakeover: () => {
        if (this.humanTakeoverRequested) {
          this.showTakeoverBanner();
          this.hideStarterChips();
        }
      },
      onComplete: (fullContent) => {
        if (fullContent) assistantMsg.content = fullContent;
        assistantMsg.streaming = false;
        this.updateMessageContent(assistantMsg);
        this.hideTypingIndicator();
        this.isStreaming = false;
        this.updateSendButton();
        this.scrollToBottom();

        // Render chips directly on the assistant message
        const msgEl = this.messagesEl?.querySelector(`[data-message-id="${assistantMsg.id}"]`) as HTMLDivElement;
        if (msgEl) {
          this.renderMessageChips(msgEl, this.quickReplies, this.suggestedOptions);
        }

        if (this.suggestedOptions.length > 0 || this.quickReplies.length > 0 || this.uiState || this.cta) {
          this.renderUiState();
        } else {
          this.clearUiState();
        }
      },
      onError: (error) => {
        assistantMsg.streaming = false;
        assistantMsg.content = assistantMsg.content || t('error.unavailable', this.config.locale);
        this.updateMessageContent(assistantMsg);
        this.hideTypingIndicator();
        this.isStreaming = false;
        this.updateSendButton();
        const lastUserMsg = [...this.messages].reverse().find((m) => m.role === 'user');
        if (lastUserMsg) {
          const msgEl = this.messagesEl?.querySelector(`[data-message-id="${assistantMsg.id}"]`) as HTMLDivElement;
          if (msgEl) {
            const tryAgainBtn = document.createElement('button');
            tryAgainBtn.className = 'cw-try-again';
            tryAgainBtn.textContent = 'Try again';
            tryAgainBtn.style.cssText = 'margin-top:8px;padding:4px 10px;border:1px solid #D1D5DB;border-radius:8px;background:#fff;color:#374151;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;transition:all 0.15s ease;';
            tryAgainBtn.addEventListener('mouseenter', () => { tryAgainBtn.style.background = '#F3F4F6'; });
            tryAgainBtn.addEventListener('mouseleave', () => { tryAgainBtn.style.background = '#fff'; });
            tryAgainBtn.addEventListener('click', () => {
              if (this.isStreaming) return;
              this.messages = this.messages.filter((m) => m.id !== assistantMsg.id);
              const el = this.messagesEl?.querySelector(`[data-message-id="${assistantMsg.id}"]`);
              el?.remove();
              if (this.inputEl) this.inputEl.value = lastUserMsg.content;
              this.send();
            });
            msgEl.appendChild(tryAgainBtn);
          }
        }
      },
    });

    // Safety net: always reset streaming state even if callbacks are missed
    if (this.isStreaming) {
      this.isStreaming = false;
      this.updateSendButton();
    }
  }

  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.isStreaming = false;
    this.updateSendButton();
  }

  resetConversation(): void {
    this.abort();
    this.messages = [];
    this.uiState = null;
    this.cta = null;
    this.suggestedOptions = [];
    this.quickReplies = [];
    this.suggestionHistory = [];
    this.humanTakeoverRequested = false;
    this.takeoverShown = false;
    this.handoffShown = false;
    if (this.messagesEl) {
      this.messagesEl.innerHTML = '';
    }
    if (this.takeoverEl) this.takeoverEl.style.display = 'none';
    if (this.handoffEl) this.handoffEl.style.display = 'none';
    this.clearUiState();
    this.config.sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const key = this.getSessionStorageKey();
    if (key) {
      try {
        const wrapped = JSON.stringify({ sessionId: this.config.sessionId, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
        window.localStorage.setItem(key, wrapped);
      } catch { /* ignore */ }
    }
    // Clear stored messages for the new session
    const msgKey = this.getMessageStorageKey();
    if (msgKey) {
      try { window.localStorage.removeItem(msgKey); } catch { /* ignore */ }
    }
    this.lastAgentSeq = 0;
    this.addMessage({ role: 'assistant', content: this.getWelcomeMessage() });
    this.renderInitialActions();
    this.scrollToBottom();
  }

  private addMessage(partial: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const msg: ChatMessage = {
      id: nextId(),
      timestamp: Date.now(),
      ...partial,
    };
    this.messages.push(msg);
    this.renderMessage(msg);
    this.saveMessages();
    if (msg.role === 'assistant' && !this.isOpen) {
      this.unreadCount++;
      this.updateBadge();
    }
    this.updateHandoffVisibility();
    return msg;
  }

  private renderMessage(msg: ChatMessage): void {
    if (!this.messagesEl) return;
    const el = document.createElement('div');
    el.className = `cw-message cw-message-${msg.role}`;
    el.setAttribute('data-message-id', msg.id);
    el.style.cssText = msg.role === 'user'
      ? 'display:flex;justify-content:flex-end;position:relative;'
      : 'display:flex;flex-direction:column;align-items:flex-start;width:100%;position:relative;';

    const bubble = document.createElement('div');
    bubble.className = 'cw-message-bubble';
    const isUser = msg.role === 'user';
    const isAgent = msg.sender === 'agent';
    const uc = this.config.primaryColor || '#006248';
    const bubbleStyle = isUser
      ? `background:linear-gradient(135deg,${uc} 0%,${this.darkenHex(uc, 0.2)} 100%);color:#fff;border-bottom-right-radius:6px;box-shadow:none;`
      : isAgent
        ? 'background:#E8F5E9;color:#1F2937;border:1px solid #C8E6C9;border-bottom-left-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.04);'
        : 'background:#F3F4F6;color:#1F2937;border-bottom-left-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.04);';
    bubble.style.cssText = `max-width:82%;padding:10px 14px;border-radius:16px;font-size:13.5px;line-height:1.55;word-wrap:break-word;${bubbleStyle}`;

    if (!isUser) {
      const icon = document.createElement('span');
      icon.style.cssText = 'margin-right:6px;opacity:0.6;font-size:12px;';
      icon.textContent = isAgent ? '👤' : '✨';
      bubble.appendChild(icon);
    }

    if (isAgent) {
      const label = document.createElement('div');
      label.className = 'cw-agent-label';
      label.textContent = t('agent.label', this.config.locale);
      label.style.cssText = `font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${this.config.primaryColor || '#006248'};margin-bottom:4px;`;
      bubble.appendChild(label);
    }

    const content = document.createElement('div');
    content.className = 'cw-message-content';
    if (isUser) {
      content.textContent = msg.content;
    } else {
      content.innerHTML = this.renderMarkdown(msg.content);
    }
    bubble.appendChild(content);

    if (msg.streaming) {
      const cursor = document.createElement('span');
      cursor.className = 'cw-cursor';
      cursor.style.cssText = 'display:inline-block;width:2px;height:14px;background:' + (isUser ? '#fff' : (this.config.primaryColor || '#006248')) + ';margin-left:2px;animation:cw-blink 1s step-end infinite;vertical-align:text-bottom;';
      bubble.appendChild(cursor);
    }

    el.appendChild(bubble);

    const ts = document.createElement('div');
    const locale = this.config.locale || navigator.language || 'en';
    const time = new Date(msg.timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    ts.textContent = time;
    ts.className = 'cw-msg-time';
    ts.style.cssText = `font-size:10px;color:#9CA3AF;margin-top:4px;opacity:0.5;transition:opacity 0.15s ease;${isUser ? 'text-align:right;padding-right:4px;' : 'text-align:left;padding-left:0;'}`;
    el.appendChild(ts);
    el.addEventListener('mouseenter', () => { ts.style.opacity = '1'; });
    el.addEventListener('mouseleave', () => { ts.style.opacity = '0.5'; });

    this.messagesEl.appendChild(el);
  }

  private renderMessageChips(msgEl: HTMLDivElement, chips: any[], options: string[]): void {
    msgEl.querySelectorAll('.cw-message-chips').forEach(el => el.remove());
    if (chips.length === 0 && options.length === 0) return;

    const container = document.createElement('div');
    container.className = 'cw-message-chips';
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', 'Suggested actions');
    container.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;width:100%;justify-content:flex-start;';

    const uc = this.config.primaryColor || '#006248';

    const getChipStyle = (category: string, variant: string): string => {
      const base = 'border-radius:16px;padding:6px 14px;font-size:12px;cursor:pointer;white-space:nowrap;transition:all .15s;font-weight:500;border:1px solid;display:inline-flex;align-items:center;gap:4px;';
      const catStyles: Record<string, string> = {
        demo: `background:${uc};color:#fff;border-color:${uc};`,
        pricing: 'background:#f0fdf4;color:#166534;border-color:#bbf7d0;',
        features: 'background:#f0f4ff;color:#374151;border-color:#d0d7e8;',
        escalation: 'background:#fef2f2;color:#991b1b;border-color:#fecaca;',
        qualification: 'background:#fffbeb;color:#92400e;border-color:#fde68a;',
        sales: `background:${uc};color:#fff;border-color:${uc};`,
        support: 'background:#f0f4ff;color:#374151;border-color:#d0d7e8;',
        competitor: 'background:#faf5ff;color:#6b21a8;border-color:#e9d5ff;',
        security: 'background:#f0fdf4;color:#166534;border-color:#bbf7d0;',
        followup: 'background:#f9fafb;color:#6b7280;border-color:#e5e7eb;',
      };
      const varStyles: Record<string, string> = {
        primary: `background:${uc};color:#fff;border-color:${uc};`,
        secondary: 'background:#f0f4ff;color:#374151;border-color:#d0d7e8;',
        outline: `background:transparent;color:${uc};border-color:${uc};`,
      };
      return base + (catStyles[category] || varStyles[variant] || varStyles.secondary);
    };

    const renderBtn = (label: string, category: string, variant: string, payload: string, action: string) => {
      const btn = document.createElement('button');
      btn.className = `cw-chip cw-chip-${category || 'default'}`;
      btn.textContent = label;
      btn.style.cssText = getChipStyle(category, variant);
      btn.addEventListener('mouseenter', () => { btn.style.transform = 'translateY(-1px)'; btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; btn.style.boxShadow = ''; });
      btn.addEventListener('click', () => {
        if (this.isStreaming) return;
        if (action === 'navigate' && payload && this.isSafeUrl(payload)) {
          window.open(payload, '_blank');
        } else {
          if (this.inputEl) this.inputEl.value = payload || label;
          this.clearUiState();
          this.send();
        }
      });
      container.appendChild(btn);
    };

    chips.slice(0, 5).forEach((chip: any) => {
      renderBtn(chip.label, chip.category || '', chip.variant || 'secondary', chip.payload || chip.label, chip.action || 'send_text');
    });

    if (chips.length === 0) {
      options.slice(0, 5).forEach((opt) => {
        renderBtn(opt, 'followup', 'secondary', opt, 'send_text');
      });
    }

    msgEl.appendChild(container);
  }

  private updateMessageContent(msg: ChatMessage): void {
    if (!this.messagesEl) return;
    const el = this.messagesEl.querySelector(`[data-message-id="${msg.id}"]`);
    if (!el) return;
    const contentEl = el.querySelector('.cw-message-content');
    if (contentEl) {
      if (msg.role === 'user') {
        contentEl.textContent = msg.content;
      } else {
        contentEl.innerHTML = this.renderMarkdown(msg.content);
      }
    }
    const cursor = el.querySelector('.cw-cursor');
    if (cursor && !msg.streaming) {
      cursor.remove();
    }
  }

  private scrollToBottom(): void {
    if (!this.messagesEl) return;
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private renderUiState(): void {
    if (!this.actionPanel) return;

    const buttonGroup = [
      ...(this.config.suggestedActions || []),
      ...(this.uiState?.buttons || []),
      ...(this.uiState?.suggestedActions || []),
    ];
    const hasActiveCard = Boolean(this.uiState?.activeCard);
    const hasCta = Boolean(this.cta && typeof this.cta === 'object' && typeof (this.cta as Record<string, unknown>).label === 'string');
    const hasButtons = buttonGroup.length > 0;
    const hasSuggestedOptions = this.suggestedOptions.length > 0;

    if (!hasActiveCard && !hasCta) {
      this.actionPanel.style.display = 'none';
      this.actionPanel.innerHTML = '';
      return;
    }

    this.actionPanel.innerHTML = '';
    this.actionPanel.style.display = 'flex';

    if (hasActiveCard) {
      const card = this.createActiveCard(this.uiState!.activeCard!);
      this.actionPanel.appendChild(card);
    }

    // Legacy grey chip buttons and suggested options are now disabled —
    // Smart Choices renders chips directly below assistant messages.

    if (hasCta) {
      const ctaButton = this.createCtaButton(this.cta as Record<string, unknown>);
      if (ctaButton) {
        this.actionPanel.appendChild(ctaButton);
      }
    }
  }

  private renderInitialActions(): void {
    this.suggestionHistory = [];
    if (!this.messagesEl) return;
    this.messagesEl.querySelectorAll('.cw-starter-chips,.cw-welcome-cards,.cw-welcome-section,.cw-welcome-escape,.cw-welcome-icon').forEach((el) => el.remove());

    const starters = this.config.starterOptions?.length
      ? this.config.starterOptions
      : this.defaultStarterOptions();

    // Find the first assistant message element (the welcome bubble)
    const firstAssistantEl = this.messagesEl.querySelector('.cw-message-assistant') as HTMLDivElement;
    if (!firstAssistantEl) return;

    // Build starter chips as SmartButtons
    const starterButtons: SmartButton[] = starters.map((text, i) => {
      const category = this.config.suggestedActions?.[i]?.category || (i === 0 ? 'guidance' : i === 1 ? 'demo' : 'plans');
      return {
        id: `starter-${i}`,
        label: text,
        action: 'send_text' as const,
        payload: text,
        variant: i === 0 ? 'primary' as const : 'secondary' as const,
        category,
      };
    });

    // Render chips below the welcome bubble
    this.renderMessageChips(firstAssistantEl, starterButtons, []);
    this.scrollToBottom();
  }

  private getContextualButtons(buttonGroup: SmartButton[]): SmartButton[] {
    const usedLabels = new Set(this.suggestionHistory.map((action) => action.label.toLowerCase()));
    const filtered = buttonGroup.filter((button) => !usedLabels.has(button.label.toLowerCase()));
    const nextActions = filtered.slice(0, 6);
    this.suggestionHistory = [...this.suggestionHistory, ...nextActions];
    return nextActions;
  }

  private clearUiState(): void {
    this.uiState = null;
    this.cta = null;
    this.suggestedOptions = [];
    this.quickReplies = [];
    if (this.actionPanel) {
      this.actionPanel.style.display = 'none';
      this.actionPanel.innerHTML = '';
    }
  }

  private createActiveCard(card: NonNullable<ConversationUIState['activeCard']>): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'cw-active-card';
    el.style.cssText = 'background:linear-gradient(135deg,#fff 0%,#f8fafc 100%);border:1px solid #E5E7EB;border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:8px;box-shadow:0 16px 40px rgba(15, 23, 42, 0.08);max-height:280px;overflow-y:auto;';

    const title = document.createElement('div');
    title.style.cssText = 'font-size:12.5px;font-weight:700;color:#111827;display:flex;justify-content:space-between;align-items:center;';
    const titleText = document.createElement('span');
    titleText.textContent = card.type.replace(/_/g, ' ').replace(/\b\w/g, (chr) => chr.toUpperCase());
    title.appendChild(titleText);
    const badge = document.createElement('span');
    badge.textContent = t('welcome.recommended', this.config.locale);
    title.appendChild(badge);
    el.appendChild(title);

    const body = document.createElement('div');
    body.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

    const data = card.data || {};
    const summary = document.createElement('div');
    summary.style.cssText = 'font-size:11.5px;color:#374151;line-height:1.5;';
    summary.textContent = this.getCardSummary(data);
    body.appendChild(summary);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';

    const cardActions = this.getCardActions(card.type, data);
    cardActions.forEach((button) => actions.appendChild(this.createActionButton(button)));
    body.appendChild(actions);
    el.appendChild(body);

    return el;
  }

  private createUnknownGuidanceCard(message: string): HTMLDivElement | null {
    const guide = buildUnknownResponseGuide(message, 0.3);
    if (!guide) return null;

    const el = document.createElement('div');
    el.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:12px;background:#FEF2F2;border:1px solid #FECACA;';

    const title = document.createElement('div');
    title.style.cssText = 'font-size:13px;font-weight:700;color:#991B1B;';
    title.textContent = t('guidance.title', this.config.locale);
    el.appendChild(title);

    const body = document.createElement('div');
    body.style.cssText = 'font-size:12px;color:#7F1D1D;line-height:1.5;';
    body.textContent = guide;
    el.appendChild(body);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
    const ctas: SmartButton[] = [
      { id: 'fallback-contact', label: t('cta.contact_sales', this.config.locale), action: 'send_text', payload: 'Connect me with sales', variant: 'primary' },
      { id: 'fallback-demo', label: t('cta.book_demo', this.config.locale), action: 'send_text', payload: 'I want to book a demo', variant: 'secondary' },
      { id: 'fallback-message', label: t('cta.leave_message', this.config.locale), action: 'send_text', payload: 'Leave a message', variant: 'secondary' },
    ];
    ctas.forEach((cta) => actions.appendChild(this.createActionButton(cta)));
    el.appendChild(actions);
    return el;
  }

  private getCardSummary(data: Record<string, unknown>): string {
    if (data.summary && typeof data.summary === 'string') return data.summary;
    if (data.title && typeof data.title === 'string') return data.title;
    if (data.description && typeof data.description === 'string') return data.description;
    if (data.name && typeof data.name === 'string') return data.name;
    return t('guidance.default_summary', this.config.locale);
  }

  private getCardActions(cardType: string, data: Record<string, unknown>): SmartButton[] {
    const base: SmartButton[] = [];
    if (cardType === 'pricing' || cardType === 'demo_booking') {
      base.push({ id: 'book-demo', label: t('cta.book_15min', this.config.locale), action: 'send_text', payload: 'I want to book a demo', variant: 'primary' });
      base.push({ id: 'compare-plans', label: t('cta.compare_plans', this.config.locale), action: 'send_text', payload: 'Compare plans and pricing', variant: 'secondary' });
    }
    if (cardType.includes('service') || cardType === 'trust_summary') {
      base.push({ id: 'talk-sales', label: t('cta.talk_to_sales', this.config.locale), action: 'send_text', payload: 'Connect me with sales', variant: 'secondary' });
    }
    if (base.length === 0) {
      base.push({ id: 'best-solution', label: t('cta.best_solution', this.config.locale), action: 'send_text', payload: 'Recommend the best fit for my needs', variant: 'secondary' });
    }
    return base;
  }

  private createActionButton(button: SmartButton): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cw-action-button';
    btn.textContent = button.label;
    btn.style.cssText = `padding:8px 12px;border-radius:999px;border:none;cursor:pointer;font-size:12.5px;transition:transform 0.15s ease, box-shadow 0.15s ease;${button.variant === 'primary' ? `background:${this.config.primaryColor || '#006248'};color:#fff;box-shadow:0 10px 20px rgba(0,98,72,0.16);` : 'background:#fff;color:#1F2937;border:1px solid #D1D5DB;'}`;
    if (button.category) {
      const iconMap: Record<string, string> = { demo: '🎯', plans: '💰', guidance: '🧠', sales: '🤝', faq: '❓', products: '📦' };
      btn.textContent = `${iconMap[button.category] || '•'} ${button.label}`;
    }
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-1px)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translateY(0)';
    });
    btn.addEventListener('click', () => this.handleActionButton(button));
    return btn;
  }

  private handleActionButton(button: SmartButton): void {
    switch (button.action) {
      case 'send_text':
      case 'select_choice':
        if (button.payload) {
          this.inputEl!.value = String(button.payload);
          this.send();
        }
        break;
      case 'navigate':
        if (this.isSafeUrl(button.payload)) window.open(button.payload, '_blank');
        break;
      case 'open_modal':
        if (button.payload && this.isSafeUrl(button.payload)) {
          window.open(button.payload, '_blank');
        }
        break;
      default:
        if (button.payload) {
          this.inputEl!.value = String(button.payload);
          this.send();
        }
        break;
    }
  }

  private renderTypingIndicator(): void {
    if (!this.actionPanel) return;
    this.actionPanel.innerHTML = '';
    this.actionPanel.style.display = 'flex';
    const indicator = document.createElement('div');
    indicator.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:999px;background:#F3F4F6;color:#4B5563;font-size:13px;';
    indicator.innerHTML = `<span style="display:inline-flex;gap:4px"><span style="width:6px;height:6px;border-radius:50%;background:#6B7280;animation: cw-pulse 1s ease-in-out infinite"></span><span style="width:6px;height:6px;border-radius:50%;background:#6B7280;animation: cw-pulse 1s ease-in-out infinite 0.15s"></span><span style="width:6px;height:6px;border-radius:50%;background:#6B7280;animation: cw-pulse 1s ease-in-out infinite 0.3s"></span></span> ${t('typing.thinking', this.config.locale)}`;
    this.actionPanel.appendChild(indicator);
  }

  private hideTypingIndicator(): void {
    if (!this.isStreaming) {
      this.renderUiState();
    }
  }

  private createCtaButton(cta: Record<string, unknown>): HTMLDivElement | null {
    const label = typeof cta.label === 'string' ? cta.label : undefined;
    const link = typeof cta.link === 'string' ? cta.link : undefined;
    if (!label || !link) return null;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;justify-content:center;';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.style.cssText = `width:100%;padding:10px 14px;border:none;border-radius:10px;background:${this.config.primaryColor || '#006248'};color:#fff;font-weight:700;cursor:pointer;font-size:13px;`;
    btn.addEventListener('click', () => { if (this.isSafeUrl(link)) window.open(link, '_blank'); });
    wrapper.appendChild(btn);
    return wrapper;
  }

  private updateSendButton(): void {
    if (!this.sendBtnEl) return;
    if (this.isStreaming) {
      this.sendBtnEl.innerHTML = `<span style="font-size:14px;line-height:1;">&#9632;</span>`;
      this.sendBtnEl.setAttribute('aria-label', 'Stop');
      this.sendBtnEl.disabled = false;
      this.sendBtnEl.style.opacity = '1';
      this.sendBtnEl.style.cursor = 'pointer';
      this.sendBtnEl.onclick = () => this.abort();
    } else {
      this.sendBtnEl.innerHTML = this.getSendIconSvg();
      this.sendBtnEl.setAttribute('aria-label', t('input.send', this.config.locale));
      const textLen = (this.inputEl?.value || '').length;
      this.sendBtnEl.disabled = textLen > 2000;
      this.sendBtnEl.style.opacity = textLen > 2000 ? '0.5' : '1';
      this.sendBtnEl.style.cursor = textLen > 2000 ? 'not-allowed' : 'pointer';
      this.sendBtnEl.onclick = () => this.send();
    }
  }

  private updateCharCounter(): void {
    if (!this.charCounterEl || !this.inputEl) return;
    const len = this.inputEl.value.length;
    if (len > 1500) {
      this.charCounterEl.style.display = 'block';
      this.charCounterEl.textContent = `${len}/2000`;
      this.charCounterEl.style.color = len > 2000 ? '#DC2626' : '#9CA3AF';
    } else {
      this.charCounterEl.style.display = 'none';
    }
    // Also update send button state
    if (this.sendBtnEl && !this.isStreaming) {
      this.sendBtnEl.disabled = len > 2000;
      this.sendBtnEl.style.opacity = len > 2000 ? '0.5' : '1';
      this.sendBtnEl.style.cursor = len > 2000 ? 'not-allowed' : 'pointer';
    }
  }

  private updateBadge(): void {
    if (!this.unreadBadge) return;
    if (this.unreadCount > 0) {
      this.unreadBadge.textContent = this.unreadCount > 9 ? '9+' : String(this.unreadCount);
      this.unreadBadge.style.display = 'flex';
    } else {
      this.unreadBadge.style.display = 'none';
    }
  }

  private renderMarkdown(text: string): string {
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    // Links: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#60a5fa;text-decoration:underline;">$1</a>');
    // Bare URLs — only match http(s) URLs already present after HTML escaping
    html = html.replace(/(?<!["'=])(https?:\/\/[^\s<>&]+)/g, (match) => {
      return `<a href="${match}" target="_blank" rel="noopener noreferrer" style="color:#60a5fa;text-decoration:underline;">${match}</a>`;
    });

    // Convert lines starting with - or * to list items
    const lines = html.split('\n');
    let inList = false;
    const processed: string[] = [];
    for (const line of lines) {
      const listMatch = line.match(/^[\-\*]\s+(.*)/);
      if (listMatch) {
        if (!inList) {
          processed.push('<ul style="margin:4px 0;padding-left:18px;list-style:disc;">');
          inList = true;
        }
        processed.push(`<li style="margin:2px 0;">${listMatch[1]}</li>`);
      } else {
        if (inList) {
          processed.push('</ul>');
          inList = false;
        }
        processed.push(line);
      }
    }
    if (inList) processed.push('</ul>');

    return processed.join('\n');
  }

  private getMessageStorageKey(): string | null {
    if (this.config.sessionId) return `cw_msgs_${this.config.sessionId}`;
    return null;
  }

  private saveMessages(): void {
    const key = this.getMessageStorageKey();
    if (!key) return;
    try {
      const toSave = this.messages.slice(-50).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        sender: m.sender,
      }));
      window.localStorage.setItem(key, JSON.stringify(toSave));
    } catch { /* ignore quota errors */ }
  }

  private loadMessages(): void {
    const key = this.getMessageStorageKey();
    if (!key) return;
    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      for (const m of parsed) {
        if (m && typeof m.content === 'string' && m.role) {
          const msg: ChatMessage = {
            id: m.id || nextId(),
            role: m.role,
            content: m.content,
            timestamp: m.timestamp || Date.now(),
            sender: m.sender,
          };
          this.messages.push(msg);
          this.renderMessage(msg);
        }
      }
      this.scrollToBottom();
    } catch { /* ignore parse errors */ }
  }

  private isSafeUrl(url: string | undefined | null): boolean {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) return false;
    try {
      const parsed = new URL(url, window.location.href);
      return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  private sanitizeColor(color: string | undefined | null): string {
    if (!color || typeof color !== 'string') return '#006248';
    const hex = color.replace('#', '');
    if (!/^[0-9a-fA-F]{3,8}$/.test(hex)) return '#006248';
    return '#' + hex.substring(0, 6);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private darkenHex(hex: string, factor: number): string {
    const h = hex.replace('#', '');
    const r = Math.round(parseInt(h.substring(0, 2), 16) * (1 - factor));
    const g = Math.round(parseInt(h.substring(2, 4), 16) * (1 - factor));
    const b = Math.round(parseInt(h.substring(4, 6), 16) * (1 - factor));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private lightenHex(hex: string, factor: number): string {
    const h = hex.replace('#', '');
    const r = Math.round(parseInt(h.substring(0, 2), 16) + (255 - parseInt(h.substring(0, 2), 16)) * factor);
    const g = Math.round(parseInt(h.substring(2, 4), 16) + (255 - parseInt(h.substring(2, 4), 16)) * factor);
    const b = Math.round(parseInt(h.substring(4, 6), 16) + (255 - parseInt(h.substring(4, 6), 16)) * factor);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private getBubbleStyles(): string {
    const pos = this.config.position === 'bottom-left' ? 'left:20px;' : 'right:20px;';
    const c = this.config.primaryColor || '#006248';
    const dark = this.darkenHex(c, 0.2);
    const vis = this.isOpen ? 'none' : 'flex';
    return `position:fixed;bottom:20px;${pos}height:48px;padding:0 18px;border-radius:24px;background:linear-gradient(135deg,${c} 0%,${dark} 100%);color:#fff;cursor:pointer;display:${vis};align-items:center;gap:9px;box-shadow:0 8px 32px ${this.hexToRgba(c, 0.45)},0 2px 8px rgba(0,0,0,0.1);z-index:999999;transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease;border:2px solid rgba(255,255,255,0.2);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13.5px;font-weight:600;letter-spacing:0.01em;white-space:nowrap;animation:cw-bubble-pulse 3s ease-in-out infinite;padding-bottom:env(safe-area-inset-bottom,0px);`;
  }

  private getContainerStyles(): string {
    const pos = this.config.position === 'bottom-left' ? 'left:20px;' : 'right:20px;';
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return `position:fixed;left:10px;right:10px;bottom:10px;width:auto;height:min(70dvh, 600px);background:var(--cw-bg-color,#FAFBFC);z-index:999998;flex-direction:column;overflow:hidden;border-radius:20px;box-shadow:0 24px 80px rgba(15, 23, 42, 0.25),0 0 0 1px rgba(0,0,0,0.04);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding-bottom:env(safe-area-inset-bottom,0px);`;
    }
    return `position:fixed;bottom:20px;${pos}width:380px;max-width:min(calc(100vw - 24px), 380px);height:min(640px, calc(100vh - 80px));background:var(--cw-bg-color,#FAFBFC);border-radius:18px;box-shadow:0 24px 80px rgba(15, 23, 42, 0.22),0 0 0 1px rgba(0,0,0,0.04);z-index:999998;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding-bottom:env(safe-area-inset-bottom,0px);`;
  }

  private getChatIconSvg(): string {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  }

  private getSendIconSvg(): string {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
  }

  private getSessionStorageKey(): string | null {
    if (this.config.tenantId) return `cw_session_${this.config.tenantId}`;
    if (this.config.widgetToken) return `cw_session_token_${this.config.widgetToken}`;
    return null;
  }

  private restoreSessionId(): void {
    if (this.config.sessionId) return;
    const key = this.getSessionStorageKey();
    if (!key) return;
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) {
        // Support both plain string (legacy) and JSON with expiry
        try {
          const parsed = JSON.parse(stored);
          if (parsed.sessionId && parsed.expiresAt && Date.now() < parsed.expiresAt) {
            this.config.sessionId = parsed.sessionId;
            return;
          }
          // Expired — generate new session
        } catch {
          // Legacy plain string — accept but set expiry going forward
          this.config.sessionId = stored;
          const wrapped = JSON.stringify({ sessionId: stored, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
          window.localStorage.setItem(key, wrapped);
          return;
        }
      }
    } catch {
      // localStorage unavailable
    }

    this.config.sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    try {
      const wrapped = JSON.stringify({ sessionId: this.config.sessionId, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
      window.localStorage.setItem(key, wrapped);
    } catch {
      // ignore write failures
    }
  }

  private deriveBusinessProfileFromConfig(): BusinessContextLike {
    return buildBusinessProfileFromWidgetConfig(this.config);
  }

  private getWelcomeMessage(): string {
    const locale = this.config.locale;
    const baseGreeting = buildBusinessGreeting(this.businessProfile, locale);
    const subtitle = this.messages.length === 0 ? t('welcome.choose_path', locale) : '';
    const continuityCue = this.messages.length > 0 ? ` ${buildContinuityCue(this.messages, this.messages[this.messages.length - 1]?.content || '', locale)}` : '';
    const contextHint = this.messages.length > 0 ? t('welcome.continue_hint', locale) : '';
    return `${baseGreeting}${subtitle}${contextHint}${continuityCue}`;
  }

  private updateHeaderText(): void {
    if (this.headerEl) {
      const c = this.config.primaryColor || '#006248';
      const cLight = this.lightenHex(c, 0.2);
      const cDark = this.darkenHex(c, 0.3);
      this.headerEl.style.background = `linear-gradient(135deg,${cDark} 0%,${c} 60%,${cLight} 100%)`;
    }
    if (this.headerTitleEl) {
      this.headerTitleEl.textContent = this.config.title || this.config.companyName || '';
    }
    if (this.headerSubtitleEl) {
      this.headerSubtitleEl.textContent = this.config.subtitle || '';
    }
    const logoUrl = this.config.logoUrl || this.config.avatarUrl;
    if (logoUrl) {
      if (!this.headerLogoEl) {
        const info = this.headerTitleEl?.parentElement;
        if (info) {
          const logo = document.createElement('img');
          logo.className = 'cw-logo';
          logo.alt = this.config.companyName || 'Logo';
          logo.style.cssText = 'width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0;background:#fff;border:1px solid rgba(255,255,255,0.25);';
          info.insertBefore(logo, info.firstChild);
          this.headerLogoEl = logo;
        }
      }
      if (this.headerLogoEl) this.headerLogoEl.src = logoUrl;
    } else if (this.headerLogoEl) {
      this.headerLogoEl.remove();
      this.headerLogoEl = null;
    }
  }

  private updateBubbleAndContainerStyles(): void {
    if (this.bubbleEl) {
      this.bubbleEl.style.cssText = this.getBubbleStyles();
      if (this.widgetState !== 'closed' && this.bubbleEl.parentNode) {
        this.bubbleEl.parentNode.removeChild(this.bubbleEl);
      } else if (this.widgetState === 'closed' && !this.bubbleEl.parentNode) {
        document.body.appendChild(this.bubbleEl);
      }
      if (this.config.launcherText) {
        this.bubbleEl.setAttribute('aria-label', this.config.launcherText);
        this.bubbleEl.title = this.config.launcherText;
      } else {
        this.bubbleEl.setAttribute('aria-label', t('bubble.aria', this.config.locale));
        this.bubbleEl.title = t('bubble.label', this.config.locale);
      }
    }
    if (this.container) {
      const currentDisplay = this.container.style.display || 'none';
      this.container.style.cssText = this.getContainerStyles();
      this.container.style.setProperty('display', currentDisplay, 'important');
    }
  }

  /**
   * Called by autoInit after the bubble is already visible. Applies the
   * background-fetched token and triggers remote config fetch so the widget
   * upgrades from embed-only styling to full server-driven configuration
   * (branding, greeting, starter options, theme, etc.).
   */
  fetchTokenInBackground(token: string, tenantId?: string): void {
    this.config.widgetToken = token;
    if (tenantId) this.config.tenantId = tenantId;
    // Fetch remote config now that we have a valid token.
    this.fetchRemoteConfig();
  }

  private async fetchRemoteConfig(): Promise<void> {
    if (!this.config.widgetToken) return;

    try {
      const url = `${this.config.apiUrl}/api/widget/config`;
      const configHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.config.widgetToken) configHeaders['x-widget-token'] = this.config.widgetToken;
      const response = await fetch(url, {
        headers: configHeaders,
      });
      if (!response.ok) {
        console.warn(`[BurFlow Widget] Config fetch failed: HTTP ${response.status} — tenant-specific options may not load.`);
        return;
      }
      const remoteConfig = await response.json();
      this.applyRemoteConfig(remoteConfig);
    } catch (err: any) {
      console.warn('[BurFlow Widget] Config fetch error:', err?.message || err, '— falling back to defaults. Check CORS / network.');
    }
  }

  private applyRemoteConfig(remote: Partial<WidgetConfig>): void {
    const merged = this.normalizeAliases(remote);
    const prevTheme = this.config.theme;
    const prevPosition = this.config.position;
    const prevPrimaryColor = this.config.primaryColor;
    const prevAccentColor = (this.config as any).accentColor;
    this.config = { ...this.config, ...merged };
    // Embed primaryColor takes priority — it's the explicit developer choice via data-primary-color attribute.
    // Server config is a fallback when no embed color is set.
    if (this.embedPrimaryColor) {
      this.config.primaryColor = this.embedPrimaryColor;
    }
    // Apply resolved theme colors from API
    const effectivePrimary = (remote as any).effectivePrimary || (remote as any).customPrimaryColor || merged.primaryColor || '#006248';
    const effectiveHeaderBg = (remote as any).effectiveHeaderBg || (remote as any).customHeaderBg || (remote as any).detectedHeaderBg || effectivePrimary;
    // Store for use in CSS
    this.config.primaryColor = effectivePrimary;
    (this.config as any).effectiveHeaderBg = effectiveHeaderBg;
    this.businessProfile = this.deriveBusinessProfileFromConfig();
    if (this.inputEl && this.placeholders.length) {
      this.inputEl.placeholder = this.placeholders[0];
    }
    this.applyBrandingVars();
    this.updateBubbleAndContainerStyles();
    this.updateHeaderText();

    // Re-apply theme if it changed (light/dark/auto)
    if (merged.theme && merged.theme !== prevTheme) {
      this.applyBrandingVars();
    }
    // Re-create container if position changed
    if (merged.position && merged.position !== prevPosition && this.container) {
      this.container.style.cssText = this.getContainerStyles();
    }
    // Re-render header/launcher if primaryColor or accentColor changed
    if ((merged.primaryColor && merged.primaryColor !== prevPrimaryColor) ||
        (merged.accentColor && merged.accentColor !== prevAccentColor)) {
      this.applyBrandingVars();
      this.updateBubbleAndContainerStyles();
      this.updateHeaderText();
    }

    if (this.config.launcherText && this.bubbleEl) {
      this.bubbleEl.setAttribute('aria-label', this.config.launcherText);
      this.bubbleEl.title = this.config.launcherText;
    } else if (this.bubbleEl) {
      this.bubbleEl.setAttribute('aria-label', t('bubble.aria', this.config.locale));
      this.bubbleEl.title = t('bubble.label', this.config.locale);
    }

    if (this.isOpen && this.messages.length === 0 && this.config.greeting) {
      this.addMessage({ role: 'assistant', content: this.config.greeting });
    }

    // If chat is open and has content, refresh the action panel UI state
    // to reflect any new suggestedActions or business profile changes
    if (this.isOpen && this.messages.length > 0) {
      this.clearUiState();
      this.renderUiState();
    }

    if (this.config.autoOpen && !this.isOpen && !this.autoOpenTimer && !this.autoOpenFired) {
      this.autoOpenFired = true;
      const delayMs = Math.max(0, Math.min((this.config.autoOpenDelay ?? 3), 60)) * 1000;
      this.autoOpenTimer = setTimeout(() => {
        this.autoOpenTimer = null;
        if (!this.isOpen) this.toggle();
      }, delayMs);
    }
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }
}
