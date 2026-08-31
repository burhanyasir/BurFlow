import { WidgetConfig, ChatMessage, ConversationUIState, SmartButton } from './types';
import { streamChat } from './stream-client';

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

export function buildTrustNote(topic: string, confidence?: number): string {
  const normalized = (topic || '').toLowerCase();
  const label = normalized.includes('pricing') ? 'Pricing page'
    : normalized.includes('service') || normalized.includes('support') ? 'Services page'
    : normalized.includes('faq') || normalized.includes('question') ? 'FAQ page'
    : normalized.includes('about') || normalized.includes('contact') || normalized.includes('trust') ? 'About page'
    : 'the available information';

  if (typeof confidence === 'number' && confidence >= 0.75) {
    return `According to the ${label}...`;
  }
  if (typeof confidence === 'number' && confidence >= 0.45) {
    return 'Based on the available information...';
  }
  return "I couldn't confidently determine that from this website.";
}

export function buildUnknownResponseGuide(topic: string, confidence?: number): string {
  const normalized = (topic || '').toLowerCase();
  const fallback = normalized.includes('pricing') ? 'pricing details'
    : normalized.includes('faq') || normalized.includes('question') ? 'faq details'
    : normalized.includes('service') || normalized.includes('support') ? 'service details'
    : 'the requested information';

  if (typeof confidence === 'number' && confidence < 0.45) {
    return `I couldn't confidently determine ${fallback} from this website. If you want, I can help by connecting you with a specialist: Contact Sales, Book Demo, or leave a message.`;
  }

  return `I didn't find enough detail on ${fallback} from this website. I can still help you with Contact Sales, Book Demo, or a message.`;
}

export function buildContinuityCue(previousMessages: Array<{ role?: string; content?: string }>, newMessage: string): string {
  const prior = previousMessages.filter((message) => message.role === 'user' && typeof message.content === 'string').map((message) => message.content?.toLowerCase() || '').join(' ');
  const normalized = newMessage.toLowerCase();
  if (prior.includes('pricing') && normalized.includes('service')) {
    return 'Since you were looking at pricing earlier, I can compare that with the available service options.';
  }
  if (prior.includes('service') && normalized.includes('pricing')) {
    return 'Since you were looking at services earlier, I can connect that to the pricing information.';
  }
  if (prior.includes('faq') && normalized.includes('contact')) {
    return 'Since you were reviewing FAQs earlier, I can point you to the right contact path next.';
  }
  return 'I can continue from what you were looking at earlier.';
}

export function buildBusinessGreeting(profile: BusinessContextLike = {}): string {
  const industryLabel = profile.industry || profile.businessType || '';
  if (/restaurant|food|cafe|hotel|hospitality/i.test(industryLabel)) {
    return `How can I help with ${profile.companyName || 'this business'}?`;
  }
  return `Hi! What brings you here today?`;
}

export function buildRecommendationCardFromMessage(message: string, profile: BusinessContextLike = {}): RecommendationCard | null {
  const normalized = message.toLowerCase();

  if (normalized.includes('pricing') || normalized.includes('plan') || normalized.includes('compare')) {
    const productName = profile.products?.[0] || 'the main offering';
    const pricingHint = profile.pricingModel || 'simple options';
    return {
      type: 'product_recommendation',
      title: `Best-fit plan for ${profile.companyName || 'your team'}`,
      description: `A guided recommendation based on ${productName.toLowerCase()} and the available ${pricingHint.toLowerCase()} structure.`,
      benefits: [
        profile.valuePropositions?.[0] || 'Clear business value',
        profile.targetAudience?.[0] || 'Built for the right audience',
        profile.trustSignals?.[0] || 'Grounded in the website profile',
      ],
      badge: profile.industry ? `${profile.industry}` : 'Popular',
      icon: '📦',
      groundingNote: 'Based on the website profile and available offer details.',
      source: buildSourceAttribution('pricing', profile) ?? undefined,
      trustNote: buildTrustNote('pricing', 0.8),
      primaryCta: { id: 'card-book-demo', label: 'Book Demo', action: 'send_text', payload: 'I want to book a demo', variant: 'primary' },
      secondaryCta: { id: 'card-compare-plans', label: 'Compare Plans', action: 'send_text', payload: 'Compare plans and pricing', variant: 'secondary' },
    };
  }

  if (normalized.includes('product') || normalized.includes('offer') || normalized.includes('service') || normalized.includes('what do you offer')) {
    const companyName = profile.companyName || 'this business';
    const productName = profile.products?.[0] || profile.services?.[0] || 'the main offering';
    return {
      type: 'service_recommendation',
      title: `Products for ${companyName}`,
      description: `A guided overview of ${productName.toLowerCase()} and the best next step for understanding what ${companyName} offers.`,
      benefits: [
        productName,
        profile.valuePropositions?.[0] || 'Clear business value',
        profile.trustSignals?.[0] || 'Backed by the website context',
      ],
      badge: 'Products',
      icon: '📦',
      groundingNote: 'Grounded in the product and service details available on the website.',
      source: buildSourceAttribution('services', profile) ?? undefined,
      trustNote: buildTrustNote('services', 0.7),
      primaryCta: { id: 'card-book-demo', label: 'Book Demo', action: 'send_text', payload: 'I want to book a demo', variant: 'primary' },
      secondaryCta: { id: 'card-contact-sales', label: 'Contact Sales', action: 'send_text', payload: 'Connect me with sales', variant: 'secondary' },
    };
  }

  if (normalized.includes('faq') || normalized.includes('question') || normalized.includes('common')) {
    const companyName = profile.companyName || 'this business';
    return {
      type: 'service_recommendation',
      title: `FAQ for ${companyName}`,
      description: `A concise FAQ-style summary grounded in the details available about ${companyName}.`,
      benefits: [
        profile.faqs?.[0] || 'Answers to common questions',
        profile.contactDetails?.[0] || 'Direct next-step contact',
        profile.trustSignals?.[0] || 'Backed by the website context',
      ],
      badge: 'FAQ',
      icon: '❓',
      groundingNote: 'Grounded in the FAQ details available on the website.',
      source: buildSourceAttribution('faq', profile) ?? undefined,
      trustNote: buildTrustNote('faq', 0.72),
      primaryCta: { id: 'card-contact-sales', label: 'Contact Sales', action: 'send_text', payload: 'Connect me with sales', variant: 'primary' },
      secondaryCta: { id: 'card-book-demo', label: 'Book Demo', action: 'send_text', payload: 'I want to book a demo', variant: 'secondary' },
    };
  }

  if (normalized.includes('contact') || normalized.includes('trust') || normalized.includes('about') || normalized.includes('who')) {
    const companyName = profile.companyName || 'this business';
    return {
      type: 'service_recommendation',
      title: `About ${companyName}`,
      description: `A grounded overview that highlights the business context, contact path, and trust signals available on the website.`,
      benefits: [
        profile.valuePropositions?.[0] || 'Outcome-focused delivery',
        profile.contactDetails?.[0] || 'Direct next-step contact',
        profile.trustSignals?.[0] || 'Backed by the website context',
      ],
      badge: 'Contact',
      icon: '🤝',
      groundingNote: 'Grounded in the business details available on the website.',
      source: buildSourceAttribution('about', profile) ?? undefined,
      trustNote: buildTrustNote('about', 0.68),
      primaryCta: { id: 'card-talk-sales', label: 'Contact Sales', action: 'send_text', payload: 'Connect me with sales', variant: 'primary' },
      secondaryCta: { id: 'card-view-details', label: 'View Details', action: 'send_text', payload: 'Tell me about your services', variant: 'secondary' },
    };
  }

  if (normalized.includes('service') || normalized.includes('support') || normalized.includes('implementation')) {
    const serviceName = profile.services?.[0] || 'the main service';
    return {
      type: 'service_recommendation',
      title: `${serviceName}`,
      description: `A recommendation aligned to the service information available on the site and the business goals it supports.`,
      benefits: [
        profile.valuePropositions?.[0] || 'Outcome-focused delivery',
        profile.contactDetails?.[0] || 'Direct next-step contact',
        profile.trustSignals?.[0] || 'Backed by the website context',
      ],
      badge: 'Recommended',
      icon: '🧭',
      groundingNote: 'Grounded in the service details available on the website.',
      source: buildSourceAttribution('services', profile) ?? undefined,
      trustNote: buildTrustNote('services', 0.7),
      primaryCta: { id: 'card-talk-sales', label: 'Contact Sales', action: 'send_text', payload: 'Connect me with sales', variant: 'primary' },
      secondaryCta: { id: 'card-view-details', label: 'View Details', action: 'send_text', payload: 'Tell me about your services', variant: 'secondary' },
    };
  }

  return null;
}

export function deriveSuggestedActions(message: string, previousActions: SmartButton[] = []): SmartButton[] {
  const normalized = message.toLowerCase();
  const seen = new Set(previousActions.map((action) => action.label.toLowerCase()));

  const baseActions: SmartButton[] = [
    { id: 'compare-plans', label: 'Compare Plans', action: 'send_text', payload: 'Compare plans and pricing', variant: 'primary', category: 'plans' },
    { id: 'best-solution', label: 'Best Fit', action: 'send_text', payload: 'Recommend the best fit for my needs', variant: 'secondary', category: 'guidance' },
    { id: 'book-demo', label: 'Book 15-Min Demo', action: 'send_text', payload: 'I want to book a demo', variant: 'primary', category: 'demo' },
    { id: 'talk-sales', label: 'Talk to Sales', action: 'send_text', payload: 'Connect me with sales', variant: 'secondary', category: 'sales' },
    { id: 'faq', label: 'Common Questions', action: 'send_text', payload: 'What are the most common questions?', variant: 'secondary', category: 'faq' },
  ];

  if (normalized.includes('price') || normalized.includes('pricing') || normalized.includes('plan')) {
    const pricingActions = [
      { id: 'compare-plans', label: 'Compare Plans', action: 'send_text', payload: 'Compare plans and pricing', variant: 'primary', category: 'plans' },
      { id: 'enterprise-pricing', label: 'Enterprise Pricing', action: 'send_text', payload: 'Show enterprise pricing', variant: 'secondary', category: 'plans' },
      { id: 'roi-calculator', label: 'ROI Fit', action: 'send_text', payload: 'Help me calculate ROI', variant: 'secondary', category: 'guidance' },
      { id: 'book-demo', label: 'Book 15-Min Demo', action: 'send_text', payload: 'I want to book a demo', variant: 'primary', category: 'demo' },
    ] as SmartButton[];
    return pricingActions.filter((action) => !seen.has(action.label.toLowerCase()));
  }

  if (normalized.includes('product') || normalized.includes('service') || normalized.includes('offer')) {
    const offerActions = [
      { id: 'compare-products', label: 'Compare Products', action: 'send_text', payload: 'Compare the main products', variant: 'secondary' },
      { id: 'implementation', label: 'Implementation Time', action: 'send_text', payload: 'What is the implementation timeline?', variant: 'secondary' },
      { id: 'customer-stories', label: 'Customer Stories', action: 'send_text', payload: 'Show customer stories', variant: 'secondary' },
      { id: 'talk-sales', label: 'Talk to Sales', action: 'send_text', payload: 'Connect me with sales', variant: 'secondary' },
    ] as SmartButton[];
    return offerActions.filter((action) => !seen.has(action.label.toLowerCase()));
  }

  if (normalized.includes('demo') || normalized.includes('book') || normalized.includes('schedule')) {
    return [
      { id: 'schedule-call', label: 'Book 15-Min Demo', action: 'send_text' as const, payload: 'Schedule a call', variant: 'primary' as const, category: 'demo' },
      { id: 'contact-sales', label: 'Talk to Sales', action: 'send_text' as const, payload: 'Connect me with sales', variant: 'secondary' as const, category: 'sales' },
      { id: 'faq', label: 'Common Questions', action: 'send_text' as const, payload: 'What are the most common questions?', variant: 'secondary' as const, category: 'faq' },
      { id: 'compare-plans', label: 'Compare Plans', action: 'send_text' as const, payload: 'Compare plans and pricing', variant: 'secondary' as const, category: 'plans' },
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
  subtitle: 'AI assistant · Online',
  primaryColor: '#006248',
  accentColor: '#006248',
  avatarUrl: undefined as any,
  greeting: 'Hi! What brings you here today?',
  greetingText: undefined as any,
  position: 'bottom-right',
  widgetPosition: undefined as any,
  theme: 'light',
  themeMode: undefined as any,
  companyName: '',
  launcherText: 'Chat with us',
  logoUrl: undefined as any,
  autoOpen: false,
  autoOpenDelay: 3,
  customCss: '',
  starterOptions: [],
  suggestedActions: [],
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
  private isStreaming = false;
  private abortController: AbortController | null = null;
  private container: HTMLDivElement | null = null;
  private messagesEl: HTMLDivElement | null = null;
  private inputEl: HTMLTextAreaElement | null = null;
  private sendBtnEl: HTMLButtonElement | null = null;
  private bubbleEl: HTMLDivElement | null = null;
  private headerTitleEl: HTMLDivElement | null = null;
  private headerSubtitleEl: HTMLDivElement | null = null;
  private unreadCount = 0;
  private actionPanel: HTMLDivElement | null = null;
  private uiState: ConversationUIState | null = null;
  private cta: Record<string, unknown> | null = null;
  private suggestedOptions: string[] = [];
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
  private headerLogoEl: HTMLImageElement | null = null;
  /** The primaryColor from the embed data-attribute — preserved over remote config. */
  private embedPrimaryColor: string | null = null;
  /** Long-lived SSE stream of takeover events (TAKEOVER_STARTED / OPERATOR_MESSAGE / TAKEOVER_ENDED). */
  private takeoverEventsController: AbortController | null = null;
  /** Polls GET /api/chat/history for operator messages during a human takeover. */
  private agentPollTimer: ReturnType<typeof setInterval> | null = null;
  private configPollTimer: ReturnType<typeof setInterval> | null = null;
  private lastAgentSeq = 0;
  private get placeholders(): string[] {
    const type = (this.businessProfile.businessType || '').toLowerCase();
    if (/ecommerce|retail|store|shop|medical|pharma/.test(type)) {
      return ['What products do you offer?', 'How fast is delivery?', 'What is your return policy?', 'Do you have this in stock?'];
    }
    if (/clinic|dental|healthcare|hospital/.test(type)) {
      return ['What services do you offer?', 'How do I book an appointment?', 'What are your hours?', 'Do you accept insurance?'];
    }
    return ['Ask about pricing...', 'How does it work?', 'Book a demo...', 'What products do you offer?'];
  }
  private boundDismissPreOpen = (e: Event) => {
    if (this.preOpenPanelEl && !this.preOpenPanelEl.contains(e.target as Node)) {
      this.dismissPreOpenPanel();
    }
  };

  constructor(config: WidgetConfig) {
    this.config = { ...DEFAULT_CONFIG, ...this.normalizeAliases(config) };
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
      .cw-bubble { background:linear-gradient(135deg,var(--cw-primary-color,#006248) 0%,var(--cw-primary-color,#004d38) 100%) !important; }
      .cw-send { background:linear-gradient(135deg,var(--cw-primary-color,#006248) 0%,var(--cw-primary-color,#004d38) 100%) !important; }
      .cw-bubble:hover { transform:scale(1.05) !important; box-shadow:0 12px 40px rgba(0,98,72,0.55) !important; }
      .cw-send:hover { transform:scale(1.05) !important; box-shadow:0 6px 24px rgba(0,98,72,0.4) !important; }
      .cw-action-button:active { transform:scale(0.96) !important; box-shadow:none !important; }
      .cw-input:focus { border-color:var(--cw-primary-color,#006248) !important; box-shadow:0 0 0 3px rgba(0,98,72,0.12) !important; background:#fff !important; }
      .cw-preopen-panel { border:1.5px solid #E8F5E9 !important; box-shadow:0 20px 60px rgba(0,98,72,0.12),0 4px 20px rgba(0,0,0,0.06) !important; }
      .cw-preopen-pill { background:#E8F5E9 !important; color:#006248 !important; border:1px solid #C8E6C9 !important; }
      .cw-preopen-pill:hover { background:#006248 !important; color:#fff !important; }
      /* Welcome action cards */
      .cw-welcome-cards { display:flex; flex-direction:column; gap:6px; padding:2px 0 6px; }
      .cw-welcome-card { display:flex; align-items:center; gap:10px; padding:10px 12px; border:1.5px solid #E8ECF1; border-radius:12px; background:#fff; cursor:pointer; transition:all 0.2s cubic-bezier(0.16,1,0.3,1); text-align:left; font-family:inherit; width:100%; }
      .cw-welcome-card:hover { border-color:#A5D6A7; background:#F0FAF4; transform:translateY(-1px); box-shadow:0 4px 16px rgba(0,98,72,0.08); }
      .cw-welcome-card:active { transform:translateY(0); box-shadow:none; }
      .cw-welcome-card-icon { width:32px; height:32px; display:grid; place-items:center; border-radius:10px; background:#E8F5E9; color:#006248; flex-shrink:0; }
      .cw-welcome-card-icon svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
      .cw-welcome-card-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
      .cw-welcome-card-body b { font-size:13px; font-weight:600; color:#1F2937; letter-spacing:-0.01em; line-height:1.35; }
      .cw-welcome-card-body small { font-size:11px; color:#6B7280; line-height:1.35; white-space:normal; overflow:visible; }
      .cw-welcome-card-badge { display:inline-block; padding:2px 6px; border-radius:999px; background:#E8F5E9; color:#006248; font-size:9px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; margin-bottom:2px; width:fit-content; }
      .cw-welcome-card-arrow { width:16px; height:16px; flex-shrink:0; color:#9CA3AF; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; transition:transform 0.15s ease, color 0.15s ease; }
      .cw-welcome-card:hover .cw-welcome-card-arrow { transform:translateX(2px); color:#006248; }
      .cw-welcome-section { margin-top:12px; }
      .cw-welcome-section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
      .cw-welcome-section-title { font-size:10px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#374151; }
      .cw-welcome-section-meta { font-size:10px; color:#9CA3AF; }
      .cw-welcome-escape { display:block; width:100%; padding:6px 0; margin-top:4px; border:0; background:transparent; color:#006248; font-size:12px; font-weight:600; font-family:inherit; cursor:pointer; text-align:center; border-radius:8px; transition:background 0.15s ease; }
      .cw-welcome-escape:hover { background:#F0FAF4; }
      .cw-welcome-icon { width:30px; height:30px; display:grid; place-items:center; border-radius:10px; background:#E8F5E9; color:#006248; margin-bottom:8px; }
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
    `;
    document.head.appendChild(style);
  }

  mount(): void {
    if (this.container) return;
    this.injectStyles();
    this.applyBrandingVars();
    this.createBubble();
    this.createChatWindow();
    if (this.config.widgetToken) {
      this.configLoadPromise = this.fetchRemoteConfig();
      this.startConfigPolling();
    }
    this.startAgentPolling();
    this.subscribeTakeoverEvents();
  }

  unmount(): void {
    this.abort();
    this.takeoverEventsController?.abort();
    this.takeoverEventsController = null;
    if (this.placeholderInterval) { clearInterval(this.placeholderInterval); this.placeholderInterval = null; }
    if (this.autoOpenTimer) { clearTimeout(this.autoOpenTimer); this.autoOpenTimer = null; }
    if (this.agentPollTimer) { clearInterval(this.agentPollTimer); this.agentPollTimer = null; }
    if (this.configPollTimer) { clearInterval(this.configPollTimer); this.configPollTimer = null; }
    this.container?.remove();
    this.bubbleEl?.remove();
    this.container = null;
    this.bubbleEl = null;
    this.messagesEl = null;
    this.inputEl = null;
  }

  /**
   * Poll the chat history every 4s while the widget is alive. Only agent-sent
   * messages (sender='agent', sequence > lastAgentSeq) are appended, so AI
   * responses — which arrive synchronously over SSE — are never duplicated and
   * operator replies reach the visitor without them sending a new message.
   */
  private startAgentPolling(): void {
    if (this.agentPollTimer) return;
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
        this.showTakeoverBanner();
        this.hideStarterChips();
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
        // AI is back in control — restore the starter chips.
        this.renderInitialActions();
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
      const res = await fetch(url, { headers, signal: this.abortController?.signal });
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
    const primary = this.config.primaryColor || '#3B82F6';
    const accent = (this.config as any).accentColor || primary;
    document.documentElement.style.setProperty('--cw-primary-color', primary);
    document.documentElement.style.setProperty('--cw-accent-color', accent);

    let theme = this.config.theme || 'light';
    if (theme === 'auto') {
      try {
        theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
      } catch { theme = 'light'; }
    }
    document.documentElement.setAttribute('data-cw-theme', theme);

    let style = document.getElementById('cw-widget-custom') as HTMLStyleElement | null;
    const css = this.config.customCss || '';
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
    bubble.setAttribute('aria-label', 'Open chat');
    bubble.setAttribute('tabindex', '0');
    bubble.style.cssText = this.getBubbleStyles();

    const icon = document.createElement('div');
    icon.className = 'cw-bubble-icon';
    icon.innerHTML = this.getChatIconSvg();
    bubble.appendChild(icon);

    const label = document.createElement('span');
    label.className = 'cw-bubble-label';
    label.textContent = 'Chat with us';
    bubble.appendChild(label);

    const badge = document.createElement('span');
    badge.className = 'cw-bubble-badge';
    badge.style.cssText = 'display:none;position:absolute;top:-4px;right:-4px;background:#EF4444;color:#fff;border-radius:50%;width:20px;height:20px;font-size:11px;display:flex;align-items:center;justify-content:center;font-weight:600;';
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
    panel.style.cssText = `position:fixed;bottom:76px;${pos}z-index:999998;display:none;max-width:264px;animation:cw-slide-in 0.3s cubic-bezier(0.16,1,0.3,1);background:#fff;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(15,23,42,0.12),0 8px 32px rgba(0,0,0,0.06);`;

    // Header with brand mark
    const header = document.createElement('div');
    header.style.cssText = 'padding:12px 14px 8px;display:flex;align-items:center;gap:8px;';
    const brandMark = document.createElement('span');
    brandMark.style.cssText = 'width:22px;height:22px;display:grid;place-items:center;border-radius:7px;background:#006248;color:#fff;font-size:13px;font-weight:800;flex-shrink:0;';
    brandMark.textContent = (this.config.companyName || 'C')[0].toUpperCase();
    header.appendChild(brandMark);
    const brandText = document.createElement('span');
    brandText.style.cssText = 'font-size:11.5px;font-weight:600;color:#111827;';
    brandText.textContent = this.config.companyName || 'Chat';
    header.appendChild(brandText);
    const statusDot = document.createElement('span');
    statusDot.style.cssText = 'font-size:10px;color:#6B7280;margin-left:auto;';
    statusDot.textContent = 'Online now';
    header.appendChild(statusDot);
    panel.appendChild(header);

    // Question text
    const questionEl = document.createElement('div');
    questionEl.style.cssText = 'padding:0 14px 8px;font-size:12.5px;color:#374151;line-height:1.5;';
    questionEl.textContent = 'Not sure where to start? Pick a quick path below.';
    panel.appendChild(questionEl);

    // Options
    const optionsWrap = document.createElement('div');
    optionsWrap.className = 'cw-preopen-options';
    panel.appendChild(optionsWrap);

    // Escape link
    const escapeLink = document.createElement('div');
    escapeLink.style.cssText = 'padding:6px 14px 12px;text-align:center;font-size:11.5px;color:#006248;font-weight:600;cursor:pointer;transition:background 0.15s ease;border-radius:0 0 14px 14px;';
    escapeLink.textContent = 'Ask something else →';
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
      if (!this.preOpenDismissed && !this.isOpen) {
        panel.style.display = 'block';
      }
    }, 2000);
    setTimeout(() => this.dismissPreOpenPanel(), 12000);
    document.addEventListener('click', this.boundDismissPreOpen);
  }

  /** Rebuilds the pre-open panel option rows from the current config. */
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
      pill.style.cssText = 'display:inline-flex;align-items:center;padding:6px 12px;border-radius:9px;background:#E8F5E9;color:#006248;font-size:12.5px;font-weight:500;white-space:nowrap;border:1px solid #C8E6C9;transition:all 0.18s ease;line-height:1.3;flex:1;';
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

  private defaultStarterOptions(): string[] {
    const type = (this.businessProfile.businessType || '').toLowerCase();
    if (/ecommerce|retail|store|shop/.test(type)) {
      return ['Find the right product', 'How fast is delivery?', 'What is your return policy?'];
    }
    if (/clinic|dental|healthcare|hospital|medical|pharma/.test(type)) {
      return ['Book an appointment', 'What services do you offer?', 'What are your hours?'];
    }
    if (/agency|consulting|services/.test(type)) {
      return ['What services do you offer?', 'How does pricing work?', 'Book a consultation'];
    }
    return ['How can you help me?', 'What do you offer?', 'Talk to a person'];
  }

  private showPreOpenPanel(): void {
    if (this.preOpenDismissed || this.isOpen || !this.preOpenPanelEl) return;
    this.preOpenPanelEl.style.display = 'flex';
    this.preOpenDismissed = true;
    setTimeout(() => this.dismissPreOpenPanel(), 12000);
  }

  private dismissPreOpenPanel(): void {
    if (this.preOpenPanelEl) {
      this.preOpenPanelEl.style.display = 'none';
    }
  }

  private createChatWindow(): void {
    const container = document.createElement('div');
    container.className = 'cw-container';
    container.style.cssText = this.getContainerStyles();
    container.style.display = 'none';

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

    document.body.appendChild(container);
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
    header.style.cssText = `background:linear-gradient(135deg,#003d2d 0%,#006248 60%,#00855e 100%);color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;border-radius:18px 18px 0 0;`;

    const info = document.createElement('div');
    info.style.cssText = 'display:flex;align-items:center;gap:9px;';
    const logoUrl = this.config.logoUrl || this.config.avatarUrl;
    if (logoUrl) {
      const logo = document.createElement('img');
      logo.className = 'cw-logo';
      logo.alt = '';
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
    subtitle.textContent = this.config.subtitle || 'AI assistant · Online';
    this.headerSubtitleEl = subtitle;
    textWrap.appendChild(subtitle);
    info.appendChild(textWrap);
    header.appendChild(info);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'cw-close';
    closeBtn.setAttribute('aria-label', 'Close chat');
    closeBtn.style.cssText = 'background:none;border:none;color:#fff;cursor:pointer;padding:4px;border-radius:4px;font-size:18px;line-height:1;';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.toggle());
    header.appendChild(closeBtn);

    return header;
  }

  private createMessagesArea(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'cw-messages';
    el.style.cssText = 'flex:1;overflow-y:auto;padding:18px 16px;display:flex;flex-direction:column;gap:12px;background:#F8F9FB;overscroll-behavior:contain;';
    return el;
  }

  private createActionPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'cw-action-panel';
    panel.style.cssText = 'padding:10px 16px 6px;display:none;flex-direction:column;gap:8px;border-top:1px solid #E5E7EB;background:#F3F4F6;';
    return panel;
  }

  private createInputArea(): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'cw-input-area';
    wrapper.style.cssText = 'padding:0 16px 0;border-top:1px solid #E8ECF1;background:#fff;border-radius:0 0 18px 18px;';

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
    });
    this.inputEl = textarea;

    const sendBtn = document.createElement('button');
    sendBtn.className = 'cw-send';
    sendBtn.setAttribute('aria-label', 'Send message');
    sendBtn.style.cssText = `background:linear-gradient(135deg,#006248 0%,#004d38 100%);color:#fff;border:none;border-radius:12px;width:40px;height:40px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 16px rgba(0,98,72,0.3);transition:transform 0.15s ease,box-shadow 0.15s ease;`;
    sendBtn.innerHTML = this.getSendIconSvg();
    sendBtn.addEventListener('click', () => this.send());
    this.sendBtnEl = sendBtn;

    inputRow.appendChild(textarea);
    inputRow.appendChild(sendBtn);
    wrapper.appendChild(inputRow);

    // --- Talk to Human button ---
    const talkToHumanRow = document.createElement('div');
    talkToHumanRow.style.cssText = 'padding:8px 0 4px;text-align:center;';
    const talkBtn = document.createElement('button');
    talkBtn.type = 'button';
    talkBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:10px;border:1.5px solid #E0E4EB;background:#F8F9FB;color:#6B7280;font-size:12px;font-weight:500;cursor:pointer;transition:all 0.15s ease;font-family:inherit;';
    talkBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> Talk to a human';
    talkBtn.addEventListener('mouseenter', () => { talkBtn.style.borderColor = '#006248'; talkBtn.style.color = '#006248'; talkBtn.style.background = '#F0FFF4'; });
    talkBtn.addEventListener('mouseleave', () => { talkBtn.style.borderColor = '#E0E4EB'; talkBtn.style.color = '#6B7280'; talkBtn.style.background = '#F8F9FB'; });
    talkBtn.addEventListener('click', () => this.requestHumanAgent());
    talkToHumanRow.appendChild(talkBtn);
    wrapper.appendChild(talkToHumanRow);

    const footer = document.createElement('div');
    footer.style.cssText = 'padding:5px 0 8px;text-align:center;';
    footer.innerHTML = `<span style="font-size:10px;color:#9CA3AF;letter-spacing:0.02em;">Answers from this website · Powered by <b style="color:#006248;">BurFlow</b></span>`;
    wrapper.appendChild(footer);

    return wrapper;
  }

  private createTakeoverArea(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'cw-takeover';
    el.style.cssText = 'display:none;padding:0 16px 12px;background:#E8F5E9;border-top:1px solid #C8E6C9;';
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
          <p style="margin:0;font-size:12px;font-weight:600;color:#003d2d;">Human agent joined</p>
          <p style="margin:2px 0 0;font-size:12px;color:#6B7280;line-height:1.5;">A real person is now assisting this conversation. Replies will come from them shortly.</p>
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
    el.style.cssText = 'padding:0 16px 12px;display:none;background:#fff;border-radius:0 0 20px 20px;';
    return el;
  }

  private updateHandoffVisibility(): void {
    if (!this.handoffEl || this.handoffShown) return;
    const userMessages = this.messages.filter(m => m.role === 'user').length;
    if (userMessages >= 3) {
      this.handoffEl.style.display = 'block';
      this.handoffEl.innerHTML = `
        <button class="cw-handoff-link" style="background:none;border:none;color:#006248;font-size:12px;cursor:pointer;padding:4px 0;font-family:inherit;text-decoration:underline;text-underline-offset:2px;">
          Talk to a human
        </button>`;
      this.handoffEl.querySelector('.cw-handoff-link')?.addEventListener('click', () => this.showHandoffForm());
    }
  }

  private showHandoffForm(): void {
    if (!this.handoffEl) return;
    this.handoffShown = true;
    this.handoffEl.innerHTML = `
      <div style="padding:8px 0;">
        <p style="font-size:12px;color:#6B7280;margin:0 0 8px;">Leave your email and we'll reach out shortly.</p>
        <div style="display:flex;gap:8px;">
          <input type="email" class="cw-handoff-email" placeholder="you@company.com" style="flex:1;border:1.5px solid #E0E4EB;border-radius:10px;padding:8px 12px;font-size:13px;font-family:inherit;outline:none;background:#F8F9FB;" />
          <button class="cw-handoff-submit" style="background:linear-gradient(135deg,#006248 0%,#004d38 100%);color:#fff;border:none;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;">Send</button>
        </div>
      </div>`;
    this.handoffEl.querySelector('.cw-handoff-submit')?.addEventListener('click', () => this.submitHandoff());
    this.handoffEl.querySelector('.cw-handoff-email')?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') this.submitHandoff();
    });
  }

  private async submitHandoff(): Promise<void> {
    if (!this.handoffEl) return;
    const emailInput = this.handoffEl.querySelector('.cw-handoff-email') as HTMLInputElement | null;
    const email = emailInput?.value.trim();
    if (!email || !email.includes('@')) {
      if (emailInput) emailInput.style.borderColor = '#EF4444';
      return;
    }
    try {
      const res = await fetch(`${this.config.apiUrl}/api/widget/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(this.config.widgetToken ? { 'x-widget-token': this.config.widgetToken } : {}) },
        body: JSON.stringify({ sessionId: this.config.sessionId, visitorEmail: email, message: 'Visitor requested human assistance' }),
      });
      if (res.ok) {
        this.handoffEl.innerHTML = `<p style="font-size:12px;color:#059669;padding:8px 0;">✓ Request sent. Someone will email you at ${email} within a few hours.</p>`;
      } else {
        this.handoffEl.innerHTML = `<p style="font-size:12px;color:#DC2626;padding:8px 0;">Something went wrong. Please try again.</p>`;
      }
    } catch {
      this.handoffEl.innerHTML = `<p style="font-size:12px;color:#DC2626;padding:8px 0;">Network error. Please try again.</p>`;
    }
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    this.dismissPreOpenPanel();
    if (!this.container) return;
    this.container.style.display = this.isOpen ? 'flex' : 'none';
    if (this.bubbleEl) this.bubbleEl.style.display = this.isOpen ? 'none' : 'flex';
    if (this.isOpen) {
      this.container.style.animation = 'cw-slide-up 0.35s cubic-bezier(0.16,1,0.3,1)';
      this.unreadCount = 0;
      this.updateBadge();
      this.inputEl?.focus();
      const isFirstOpen = this.messages.length === 0;
      if (isFirstOpen) {
        this.addMessage({ role: 'assistant', content: this.getWelcomeMessage() });
      }
      if (isFirstOpen) {
        this.renderInitialActions();
      } else {
        this.renderUiState();
      }
      this.scrollToBottom();
    }
  }

  send(): void {
    const text = this.inputEl?.value.trim();
    if (!text || this.isStreaming) return;

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

    const msg = "I'd like to talk to a human agent, please.";
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
        assistantMsg.content = "A team member has been notified and will join this conversation shortly. Please wait a moment.";
        assistantMsg.streaming = false;
        this.updateMessageContent(assistantMsg);
      } else {
        assistantMsg.content = "I wasn't able to reach a human agent right now. Please try again later or email us at support.";
        assistantMsg.streaming = false;
        this.updateMessageContent(assistantMsg);
      }
    } catch {
      this.hideTypingIndicator();
      assistantMsg.content = "Connection error. Please try again.";
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
      onUiState: (uiState, cta, suggestedOptions) => {
        this.uiState = uiState || this.uiState || null;
        this.cta = cta || this.cta || null;
        if (Array.isArray(suggestedOptions)) {
          this.suggestedOptions = suggestedOptions;
        }
        this.renderUiState();
      },
      onHumanTakeover: () => {
        this.showTakeoverBanner();
        this.hideStarterChips();
      },
      onComplete: (fullContent) => {
        if (fullContent) assistantMsg.content = fullContent;
        assistantMsg.streaming = false;
        this.updateMessageContent(assistantMsg);
        this.hideTypingIndicator();
        this.isStreaming = false;
        this.updateSendButton();
        this.scrollToBottom();
        if (this.suggestedOptions.length > 0 || this.uiState || this.cta) {
          this.renderUiState();
        } else {
          this.clearUiState();
        }
      },
      onError: (error) => {
        console.error('[BurFlow Widget] Chat error:', error);
        assistantMsg.streaming = false;
        assistantMsg.content = assistantMsg.content || 'I\'m here to help, but the assistant is temporarily unavailable. Please try again in a moment.';
        this.updateMessageContent(assistantMsg);
        this.hideTypingIndicator();
        this.isStreaming = false;
        this.updateSendButton();
      },
    });
  }

  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.isStreaming = false;
    this.updateSendButton();
  }

  private addMessage(partial: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const msg: ChatMessage = {
      id: nextId(),
      timestamp: Date.now(),
      ...partial,
    };
    this.messages.push(msg);
    this.renderMessage(msg);
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
    el.style.cssText = `display:flex;${msg.role === 'user' ? 'justify-content:flex-end' : 'justify-content:flex-start'};position:relative;`;

    const bubble = document.createElement('div');
    bubble.className = 'cw-message-bubble';
    const isUser = msg.role === 'user';
    const isAgent = msg.sender === 'agent';
    const bubbleStyle = isUser
      ? 'background:linear-gradient(135deg,#006248 0%,#004d38 100%);color:#fff;border-bottom-right-radius:6px;box-shadow:none;'
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
      label.textContent = 'Agent';
      label.style.cssText = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#006248;margin-bottom:4px;';
      bubble.appendChild(label);
    }

    const content = document.createElement('div');
    content.className = 'cw-message-content';
    content.textContent = msg.content;
    bubble.appendChild(content);

    if (msg.streaming) {
      const cursor = document.createElement('span');
      cursor.className = 'cw-cursor';
      cursor.style.cssText = 'display:inline-block;width:2px;height:14px;background:' + (isUser ? '#fff' : this.config.primaryColor) + ';margin-left:2px;animation:cw-blink 1s step-end infinite;vertical-align:text-bottom;';
      bubble.appendChild(cursor);
    }

    el.appendChild(bubble);

    const ts = document.createElement('div');
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    ts.textContent = time;
    ts.style.cssText = `font-size:10px;color:#9CA3AF;margin-top:4px;opacity:0;transition:opacity 0.15s ease;${isUser ? 'text-align:right;padding-right:4px;' : 'text-align:left;padding-left:26px;'}`;
    el.appendChild(ts);
    el.addEventListener('mouseenter', () => { ts.style.opacity = '1'; });
    el.addEventListener('mouseleave', () => { ts.style.opacity = '0'; });

    this.messagesEl.appendChild(el);
  }

  private updateMessageContent(msg: ChatMessage): void {
    if (!this.messagesEl) return;
    const el = this.messagesEl.querySelector(`[data-message-id="${msg.id}"]`);
    if (!el) return;
    const contentEl = el.querySelector('.cw-message-content');
    if (contentEl) {
      contentEl.textContent = msg.content;
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

    if (!hasActiveCard && !hasButtons && !hasCta && !hasSuggestedOptions) {
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

    if (hasButtons) {
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
      const visibleButtons = this.getContextualButtons(buttonGroup);
      visibleButtons.slice(0, 3).forEach((button) => {
        buttonContainer.appendChild(this.createActionButton(button));
      });
      this.actionPanel.appendChild(buttonContainer);
    }

    if (this.suggestedOptions.length > 0) {
      const optContainer = document.createElement('div');
      optContainer.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;';
      this.suggestedOptions.slice(0, 3).forEach((opt) => {
        const chip = document.createElement('button');
        chip.className = 'cw-suggested-option';
        chip.textContent = opt;
        chip.style.cssText = 'background:#f0f0f0;border:1px solid #d0d0d0;border-radius:16px;padding:6px 14px;font-size:12px;cursor:pointer;color:#333;white-space:nowrap;transition:background .15s;';
        chip.addEventListener('mouseenter', () => { chip.style.background = '#e0e0e0'; });
        chip.addEventListener('mouseleave', () => { chip.style.background = '#f0f0f0'; });
        chip.addEventListener('click', () => {
          if (this.isStreaming) return;
          if (this.inputEl) this.inputEl.value = opt;
          this.clearUiState();
          this.send();
        });
        optContainer.appendChild(chip);
      });
      this.actionPanel.appendChild(optContainer);
    }

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

    // --- Welcome icon ---
    const welcomeIcon = document.createElement('div');
    welcomeIcon.className = 'cw-welcome-icon';
    welcomeIcon.innerHTML = '<svg viewBox="0 0 24 24"><path d="m12 3 .8 2.8a5.6 5.6 0 0 0 3.9 3.9l2.8.8-2.8.8a5.6 5.6 0 0 0-3.9 3.9L12 19l-.8-2.8a5.6 5.6 0 0 0-3.9-3.9l-2.8-.8 2.8-.8a5.6 5.6 0 0 0 3.9-3.9L12 3Z"/></svg>';

    // --- Section: "Choose a quick path" ---
    const section = document.createElement('div');
    section.className = 'cw-welcome-section';

    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'cw-welcome-section-header';
    const sectionTitle = document.createElement('span');
    sectionTitle.className = 'cw-welcome-section-title';
    sectionTitle.textContent = 'HOW CAN I HELP?';
    sectionHeader.appendChild(sectionTitle);
    const sectionMeta = document.createElement('span');
    sectionMeta.className = 'cw-welcome-section-meta';
    sectionMeta.textContent = 'Pick a topic or type your question';
    sectionHeader.appendChild(sectionMeta);
    section.appendChild(sectionHeader);

    // --- Action cards ---
    const cardWrap = document.createElement('div');
    cardWrap.className = 'cw-welcome-cards';

    const cardIcons: Record<string, string> = {
      plans: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M15 9l4-4M17 3h4v4"/></svg>',
      guidance: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m9 9 3-3 3 3M9 15l3 3 3-3"/></svg>',
      demo: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
      sales: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      faq: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
      products: '<svg viewBox="0 0 24 24"><path d="m12 3 .8 2.8a5.6 5.6 0 0 0 3.9 3.9l2.8.8-2.8.8a5.6 5.6 0 0 0-3.9 3.9L12 19l-.8-2.8a5.6 5.6 0 0 0-3.9-3.9l-2.8-.8 2.8-.8a5.6 5.6 0 0 0 3.9-3.9L12 3Z"/></svg>',
    };

    starters.forEach((text, i) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'cw-welcome-card';
      card.style.animationDelay = `${i * 0.06}s`;

      // Icon
      const iconWrap = document.createElement('span');
      iconWrap.className = 'cw-welcome-card-icon';
      const category = this.config.suggestedActions?.[i]?.category || (i === 0 ? 'guidance' : i === 1 ? 'demo' : 'plans');
      iconWrap.innerHTML = cardIcons[category] || cardIcons.guidance;
      card.appendChild(iconWrap);

      // Body
      const body = document.createElement('span');
      body.className = 'cw-welcome-card-body';
      // Badge on first card
      if (i === 0) {
        const badge = document.createElement('span');
        badge.className = 'cw-welcome-card-badge';
        badge.textContent = 'Recommended';
        body.appendChild(badge);
      }
      const title = document.createElement('b');
      title.textContent = text;
      body.appendChild(title);
      const desc = document.createElement('small');
      desc.textContent = i === 0 ? '3 quick questions' : i === 1 ? 'A 60-second product tour' : 'Choose a convenient time';
      body.appendChild(desc);
      card.appendChild(body);

      // Arrow
      const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      arrow.setAttribute('class', 'cw-welcome-card-arrow');
      arrow.setAttribute('viewBox', '0 0 24 24');
      arrow.innerHTML = '<path d="m9 18 6-6-6-6"/>';
      card.appendChild(arrow);

      card.addEventListener('click', () => this.sendStarterPrompt(text));
      cardWrap.appendChild(card);
    });

    section.appendChild(cardWrap);

    // --- Escape path ---
    const escapeBtn = document.createElement('button');
    escapeBtn.type = 'button';
    escapeBtn.className = 'cw-welcome-escape';
    escapeBtn.textContent = 'Already a customer? Get support →';
    escapeBtn.addEventListener('click', () => {
      if (this.inputEl) this.inputEl.focus();
    });

    // Insert into the first assistant bubble (after the greeting text)
    const firstAssistantBubble = this.messagesEl.querySelector('.cw-message-assistant .cw-message-bubble');
    if (firstAssistantBubble) {
      firstAssistantBubble.appendChild(welcomeIcon);
      firstAssistantBubble.appendChild(section);
      firstAssistantBubble.appendChild(escapeBtn);
    } else {
      this.messagesEl.appendChild(welcomeIcon);
      this.messagesEl.appendChild(section);
      this.messagesEl.appendChild(escapeBtn);
    }
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
    badge.textContent = 'Recommended';
    badge.style.cssText = 'font-size:10px;font-weight:600;padding:3px 7px;border-radius:999px;background:#E8F5E9;color:#006248;';
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
    title.textContent = 'I don\'t want to overstate what I know';
    el.appendChild(title);

    const body = document.createElement('div');
    body.style.cssText = 'font-size:12px;color:#7F1D1D;line-height:1.5;';
    body.textContent = guide;
    el.appendChild(body);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
    const ctas: SmartButton[] = [
      { id: 'fallback-contact', label: 'Contact Sales', action: 'send_text', payload: 'Connect me with sales', variant: 'primary' },
      { id: 'fallback-demo', label: 'Book Demo', action: 'send_text', payload: 'I want to book a demo', variant: 'secondary' },
      { id: 'fallback-message', label: 'Leave a Message', action: 'send_text', payload: 'Leave a message', variant: 'secondary' },
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
    return 'Recommended next step for this conversation.';
  }

  private getCardActions(cardType: string, data: Record<string, unknown>): SmartButton[] {
    const base: SmartButton[] = [];
    if (cardType === 'pricing' || cardType === 'demo_booking') {
      base.push({ id: 'book-demo', label: 'Book 15-Min Demo', action: 'send_text', payload: 'I want to book a demo', variant: 'primary' });
      base.push({ id: 'compare-plans', label: 'Compare Plans', action: 'send_text', payload: 'Compare plans and pricing', variant: 'secondary' });
    }
    if (cardType.includes('service') || cardType === 'trust_summary') {
      base.push({ id: 'talk-sales', label: 'Talk to Sales', action: 'send_text', payload: 'Connect me with sales', variant: 'secondary' });
    }
    if (base.length === 0) {
      base.push({ id: 'best-solution', label: 'Best Solution', action: 'send_text', payload: 'Recommend the best fit for my needs', variant: 'secondary' });
    }
    return base;
  }

  private createActionButton(button: SmartButton): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cw-action-button';
    btn.textContent = button.label;
    btn.style.cssText = `padding:8px 12px;border-radius:999px;border:none;cursor:pointer;font-size:12.5px;transition:transform 0.15s ease, box-shadow 0.15s ease;${button.variant === 'primary' ? `background:${this.config.primaryColor};color:#fff;box-shadow:0 10px 20px rgba(0,98,72,0.16);` : 'background:#fff;color:#1F2937;border:1px solid #D1D5DB;'}`;
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
        window.open(button.payload, '_blank');
        break;
      case 'open_modal':
        if (button.payload) {
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
    indicator.innerHTML = '<span style="display:inline-flex;gap:4px"><span style="width:6px;height:6px;border-radius:50%;background:#6B7280;animation: cw-pulse 1s ease-in-out infinite"></span><span style="width:6px;height:6px;border-radius:50%;background:#6B7280;animation: cw-pulse 1s ease-in-out infinite 0.15s"></span><span style="width:6px;height:6px;border-radius:50%;background:#6B7280;animation: cw-pulse 1s ease-in-out infinite 0.3s"></span></span> Thinking…';
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
    btn.style.cssText = `width:100%;padding:10px 14px;border:none;border-radius:10px;background:${this.config.primaryColor};color:#fff;font-weight:700;cursor:pointer;font-size:13px;`;
    btn.addEventListener('click', () => window.open(link, '_blank'));
    wrapper.appendChild(btn);
    return wrapper;
  }

  private updateSendButton(): void {
    if (!this.sendBtnEl) return;
    this.sendBtnEl.disabled = this.isStreaming;
    this.sendBtnEl.style.opacity = this.isStreaming ? '0.5' : '1';
    this.sendBtnEl.style.cursor = this.isStreaming ? 'not-allowed' : 'pointer';
  }

  private updateBadge(): void {
    if (!this.unreadBadge) return;
    if (this.unreadCount > 0) {
      this.unreadBadge.textContent = String(this.unreadCount);
      this.unreadBadge.style.display = 'flex';
    } else {
      this.unreadBadge.style.display = 'none';
    }
  }

  private getBubbleStyles(): string {
    const pos = this.config.position === 'bottom-left' ? 'left:20px;' : 'right:20px;';
    return `position:fixed;bottom:20px;${pos}height:48px;padding:0 18px;border-radius:24px;background:linear-gradient(135deg,#006248 0%,#004d38 100%);color:#fff;cursor:pointer;display:flex;align-items:center;gap:9px;box-shadow:0 8px 32px rgba(0,98,72,0.45),0 2px 8px rgba(0,0,0,0.1);z-index:999999;transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease;border:2px solid rgba(255,255,255,0.2);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13.5px;font-weight:600;letter-spacing:0.01em;white-space:nowrap;animation:cw-bubble-pulse 3s ease-in-out infinite;`;
  }

  private getContainerStyles(): string {
    const pos = this.config.position === 'bottom-left' ? 'left:20px;' : 'right:20px;';
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return `position:fixed;left:10px;right:10px;bottom:10px;width:auto;height:min(70dvh, 600px);background:#FAFBFC;z-index:999998;flex-direction:column;overflow:hidden;border-radius:20px;box-shadow:0 24px 80px rgba(15, 23, 42, 0.25),0 0 0 1px rgba(0,0,0,0.04);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;`;
    }
    return `position:fixed;bottom:20px;${pos}width:380px;max-width:min(calc(100vw - 24px), 380px);height:min(640px, calc(100vh - 80px));background:#FAFBFC;border-radius:18px;box-shadow:0 24px 80px rgba(15, 23, 42, 0.22),0 0 0 1px rgba(0,0,0,0.04);z-index:999998;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;`;
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
        this.config.sessionId = stored;
        return;
      }
    } catch {
      // localStorage unavailable
    }

    this.config.sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    try {
      window.localStorage.setItem(key, this.config.sessionId);
    } catch {
      // ignore write failures
    }
  }

  private deriveBusinessProfileFromConfig(): BusinessContextLike {
    return buildBusinessProfileFromWidgetConfig(this.config);
  }

  private getWelcomeMessage(): string {
    const baseGreeting = buildBusinessGreeting(this.businessProfile);
    const subtitle = this.messages.length === 0 ? '\n\nChoose a quick path, or ask anything below.' : '';
    const continuityCue = this.messages.length > 0 ? ` ${buildContinuityCue(this.messages, this.messages[this.messages.length - 1]?.content || '')}` : '';
    const contextHint = this.messages.length > 0 ? ' Based on what you asked earlier, I can continue from there.' : '';
    return `${baseGreeting}${subtitle}${contextHint}${continuityCue}`;
  }

  private updateHeaderText(): void {
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
          logo.alt = '';
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
      if (this.config.launcherText) {
        this.bubbleEl.setAttribute('aria-label', this.config.launcherText);
        this.bubbleEl.title = this.config.launcherText;
      }
    }
    if (this.container) {
      const currentDisplay = this.container.style.display;
      this.container.style.cssText = this.getContainerStyles();
      if (currentDisplay) this.container.style.display = currentDisplay;
    }
  }

  private async fetchRemoteConfig(): Promise<void> {
    if (!this.config.widgetToken) return;

    try {
      const url = `${this.config.apiUrl}/api/widget/config?token=${encodeURIComponent(this.config.widgetToken)}`;
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
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
    // Only use embed primaryColor as fallback when server has none set
    if (this.embedPrimaryColor && !merged.primaryColor) {
      this.config.primaryColor = this.embedPrimaryColor;
    }
    this.businessProfile = this.deriveBusinessProfileFromConfig();
    if (this.inputEl && this.placeholders.length) {
      this.inputEl.placeholder = this.placeholders[0];
    }
    this.renderPreOpenOptions();
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
      this.bubbleEl && (this.bubbleEl.style.cssText = this.getBubbleStyles());
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
    }

    if (this.isOpen && this.messages.length === 0 && this.config.greeting) {
      this.addMessage({ role: 'assistant', content: this.config.greeting });
    }

    // If the chat is open and shows only the initial greeting (no user
    // messages yet), re-render the welcome cards so tenant-specific
    // starterOptions arrive from the server without requiring a page reload.
    if (this.isOpen && this.messages.length <= 1) {
      const hasUserMessages = this.messages.some((m) => m.role === 'user');
      if (!hasUserMessages) {
        this.renderInitialActions();
      }
    }

    // If chat is open and has content, refresh the action panel UI state
    // to reflect any new suggestedActions or business profile changes
    if (this.isOpen && this.messages.length > 0) {
      this.clearUiState();
      this.renderUiState();
    }

    if (this.config.autoOpen && !this.isOpen && !this.autoOpenTimer) {
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
