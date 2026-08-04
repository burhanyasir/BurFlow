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
  const persisted = (config.businessProfile || {}) as Record<string, unknown>;
  const titleText = (config.title || '').toLowerCase();
  const greetingText = (config.greeting || '').toLowerCase();
  const hasSalesLanguage = titleText.includes('sales') || greetingText.includes('demo') || greetingText.includes('plan') || greetingText.includes('pricing');
  const suggestedActions = (config.suggestedActions || []).map((action) => action.label.toLowerCase());
  const hasDemoAction = suggestedActions.some((label) => label.includes('demo'));
  const hasPricingAction = suggestedActions.some((label) => label.includes('plan') || label.includes('pricing'));

  const base: BusinessContextLike = {
    companyName: (persisted.companyName as string | undefined) || config.companyName || 'this business',
    industry: (persisted.industry as string | undefined) || (hasSalesLanguage ? 'SaaS' : undefined),
    businessType: (persisted.businessType as string | undefined) || (hasSalesLanguage ? 'saas' : undefined),
    products: ((persisted.products as string[] | undefined) || ['product guidance', hasDemoAction ? 'demo qualification' : 'core offering'].filter(Boolean)) as string[],
    services: ((persisted.services as string[] | undefined) || ['guided recommendations', hasDemoAction ? 'demo booking support' : 'support'].filter(Boolean)) as string[],
    pricingModel: (persisted.pricingModel as string | undefined) || (hasPricingAction ? 'guided plans' : 'flexible options'),
    valuePropositions: ((persisted.valuePropositions as string[] | undefined) || [hasDemoAction ? 'clear next steps' : 'clear guidance', 'fast, trustworthy responses']) as string[],
    targetAudience: ((persisted.targetAudience as string[] | undefined) || ['prospective buyers', 'website visitors']) as string[],
    faqs: ((persisted.faqs as string[] | undefined) || ['How does this work?', 'What should I do next?']) as string[],
    contactDetails: ((persisted.contactDetails as string[] | undefined) || ['sales contact']) as string[],
    trustSignals: ((persisted.trustSignals as string[] | undefined) || ['website-guided guidance', 'transparent next steps']) as string[],
    brandTone: (persisted.brandTone as string | undefined) || 'confident and helpful',
    sourceUrls: (persisted.sourceUrls as Record<string, string> | undefined) || (config.companyName ? { pricing: '#', services: '#', faq: '#', about: '#' } : undefined),
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
  const companyName = profile.companyName || 'this business';
  const industryLabel = profile.industry || profile.businessType || 'business';
  const productHint = profile.products?.[0] || profile.services?.[0] || 'offerings';
  const pricingHint = profile.pricingModel || 'plans';
  const valueHint = profile.valuePropositions?.[0] || 'clear, outcome-focused guidance';

  let greeting = '';

  if (/saas|software|technology|platform/i.test(industryLabel)) {
    greeting = `Hi! I can help you compare ${pricingHint.toLowerCase()}, explain ${productHint.toLowerCase()}, or recommend the best option for ${companyName}.`;
  } else if (/agency|consult|marketing|creative|design/i.test(industryLabel)) {
    greeting = `Welcome! I can recommend the right service for ${companyName} and help you book a consultation around ${productHint.toLowerCase()}.`;
  } else if (/restaurant|food|cafe|hotel|hospitality/i.test(industryLabel)) {
    greeting = `Welcome! I can help you explore ${productHint.toLowerCase()}, availability, or the best next step for ${companyName}.`;
  } else {
    greeting = `Welcome! I can help you understand ${productHint.toLowerCase()} and guide you toward the best next step for ${companyName}.`;
  }

  if (profile.faqs?.length || profile.contactDetails?.length) {
    const faqPart = profile.faqs?.length ? 'answer common questions' : 'clarify common questions';
    const contactPart = profile.contactDetails?.length ? `point you to contact options such as ${profile.contactDetails[0]}` : 'point you to contact options';
    greeting = `${greeting} I can also ${faqPart} and ${contactPart}.`;
  }

  if (profile.trustSignals?.length) {
    greeting = `${greeting} I’ll frame the guidance around ${profile.trustSignals[0].toLowerCase()}.`;
  }

  if (profile.valuePropositions?.length) {
    greeting = `${greeting} The experience is designed around ${valueHint.toLowerCase()}.`;
  }

  return greeting;
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

const DEFAULT_CONFIG: Required<Omit<WidgetConfig, 'tenantId' | 'apiKey' | 'widgetToken' | 'sessionId'>> & { tenantId?: string; apiKey?: string; widgetToken?: string; sessionId?: string } = {
  apiUrl: '',
  tenantId: undefined as any,
  apiKey: undefined as any,
  sessionId: undefined as any,
  widgetToken: undefined as any,
  title: 'BurFlow Sales Agent',
  subtitle: 'AI website sales & demo assistant',
  primaryColor: '#3B82F6',
  greeting: '👋 I already understand this website. I can help visitors find the right product, plan, or next step in just a minute.',
  position: 'bottom-right',
  companyName: '',
  launcherText: 'Talk to BurFlow',
  suggestedActions: [
    { id: 'pricing', label: 'Pricing', action: 'send_text', payload: 'Show me pricing', variant: 'secondary', category: 'plans' },
    { id: 'products', label: 'Best Fit', action: 'send_text', payload: 'Which option fits our needs best?', variant: 'secondary', category: 'guidance' },
    { id: 'services', label: 'Products', action: 'send_text', payload: 'What products do you offer?', variant: 'secondary', category: 'products' },
    { id: 'demo', label: 'Book 15-Min Demo', action: 'send_text', payload: 'I want to book a demo', variant: 'primary', category: 'demo' },
    { id: 'faq', label: 'Common Questions', action: 'send_text', payload: 'What are the most common questions?', variant: 'secondary', category: 'faq' },
    { id: 'contact', label: 'Talk to Sales', action: 'send_text', payload: 'Connect me with sales', variant: 'secondary', category: 'sales' },
  ],
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
  private unreadBadge: HTMLSpanElement | null = null;
  private configLoadPromise: Promise<void> | null = null;
  private suggestionHistory: SmartButton[] = [];

  constructor(config: WidgetConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.restoreSessionId();
    this.businessProfile = this.deriveBusinessProfileFromConfig();
  }

  mount(): void {
    if (this.container) return;
    this.createBubble();
    this.createChatWindow();
    if (this.config.widgetToken) {
      this.configLoadPromise = this.fetchRemoteConfig();
    }
    this.renderInitialActions();
  }

  unmount(): void {
    this.abort();
    this.container?.remove();
    this.bubbleEl?.remove();
    this.container = null;
    this.bubbleEl = null;
    this.messagesEl = null;
    this.inputEl = null;
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

    document.body.appendChild(container);
    this.container = container;
  }

  private createHeader(): HTMLDivElement {
    const header = document.createElement('div');
    header.className = 'cw-header';
    header.style.cssText = `background:${this.config.primaryColor};color:#fff;padding:16px;display:flex;align-items:center;justify-content:space-between;border-radius:12px 12px 0 0;`;

    const info = document.createElement('div');
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:600;font-size:15px;';
    title.textContent = this.config.title || this.config.companyName || '';
    this.headerTitleEl = title;
    info.appendChild(title);
    const subtitle = document.createElement('div');
    subtitle.style.cssText = 'font-size:12px;opacity:0.85;margin-top:2px;';
    subtitle.textContent = this.config.subtitle;
    this.headerSubtitleEl = subtitle;
    info.appendChild(subtitle);
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
    el.style.cssText = 'flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;min-height:300px;max-height:400px;background:#F9FAFB;';
    return el;
  }

  private createActionPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'cw-action-panel';
    panel.style.cssText = 'padding:12px 16px 8px;display:none;flex-direction:column;gap:10px;border-top:1px solid #E5E7EB;background:#F3F4F6;';
    return panel;
  }

  private createInputArea(): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'cw-input-area';
    wrapper.style.cssText = 'padding:12px;border-top:1px solid #E5E7EB;display:flex;gap:8px;align-items:flex-end;background:#fff;border-radius:0 0 18px 18px;';

    const textarea = document.createElement('textarea');
    textarea.className = 'cw-input';
    textarea.placeholder = 'Ask about pricing, products, or demos...';
    textarea.rows = 1;
    textarea.style.cssText = 'flex:1;resize:none;border:1px solid #D1D5DB;border-radius:12px;padding:10px 12px;font-size:14px;font-family:inherit;outline:none;max-height:120px;min-height:44px;line-height:1.4;';
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
    sendBtn.style.cssText = `background:${this.config.primaryColor};color:#fff;border:none;border-radius:12px;width:44px;height:44px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 10px 20px rgba(59,130,246,0.16);`;
    sendBtn.innerHTML = this.getSendIconSvg();
    sendBtn.addEventListener('click', () => this.send());
    this.sendBtnEl = sendBtn;

    wrapper.appendChild(textarea);
    wrapper.appendChild(sendBtn);
    return wrapper;
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (!this.container) return;
    this.container.style.display = this.isOpen ? 'flex' : 'none';
    if (this.isOpen) {
      this.unreadCount = 0;
      this.updateBadge();
      this.inputEl?.focus();
      if (this.messages.length === 0) {
        this.addMessage({ role: 'assistant', content: this.getWelcomeMessage() });
        this.renderInitialActions();
      }
      this.renderUiState();
      this.scrollToBottom();
    }
  }

  send(): void {
    const text = this.inputEl?.value.trim();
    if (!text || this.isStreaming) return;

    this.inputEl!.value = '';
    this.inputEl!.style.height = 'auto';
    this.clearUiState();
    this.addMessage({ role: 'user', content: text });
    this.streamResponse(text);
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
      onUiState: (uiState, cta) => {
        this.uiState = uiState || null;
        this.cta = cta || null;
        this.renderUiState();
      },
      onComplete: (fullContent) => {
        if (fullContent) assistantMsg.content = fullContent;
        assistantMsg.streaming = false;
        this.updateMessageContent(assistantMsg);
        this.hideTypingIndicator();
        this.isStreaming = false;
        this.updateSendButton();
        this.scrollToBottom();
        if (!this.uiState) {
          this.clearUiState();
        }
      },
      onError: (error) => {
        assistantMsg.streaming = false;
        assistantMsg.content = assistantMsg.content || 'I’m here to help, but the assistant is temporarily unavailable. Please try again in a moment.';
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
    return msg;
  }

  private renderMessage(msg: ChatMessage): void {
    if (!this.messagesEl) return;
    const el = document.createElement('div');
    el.className = `cw-message cw-message-${msg.role}`;
    el.setAttribute('data-message-id', msg.id);
    el.style.cssText = `display:flex;${msg.role === 'user' ? 'justify-content:flex-end' : 'justify-content:flex-start'};`;

    const bubble = document.createElement('div');
    bubble.className = 'cw-message-bubble';
    const isUser = msg.role === 'user';
    bubble.style.cssText = `max-width:84%;padding:12px 14px;border-radius:16px;font-size:14px;line-height:1.6;word-wrap:break-word;box-shadow:${isUser ? 'none' : '0 8px 20px rgba(15, 23, 42, 0.06)'};${isUser
      ? `background:${this.config.primaryColor};color:#fff;border-bottom-right-radius:6px;`
      : 'background:#fff;color:#111827;border:1px solid #E5E7EB;border-bottom-left-radius:6px;'
    }`;

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

    if (!hasActiveCard && !hasButtons && !hasCta) {
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
      visibleButtons.slice(0, 6).forEach((button) => {
        buttonContainer.appendChild(this.createActionButton(button));
      });
      this.actionPanel.appendChild(buttonContainer);
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
    const greetingText = this.getWelcomeMessage();
    const initialButtons = deriveSuggestedActions(greetingText, this.suggestionHistory);
    this.suggestionHistory = [...this.suggestionHistory, ...initialButtons];
    if (this.actionPanel) {
      this.actionPanel.innerHTML = '';
      this.actionPanel.style.display = 'flex';
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
      const categoryHeader = document.createElement('div');
      categoryHeader.textContent = 'Recommended next steps';
      categoryHeader.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#6B7280;';
      this.actionPanel.appendChild(categoryHeader);
      initialButtons.forEach((button) => buttonContainer.appendChild(this.createActionButton(button)));
      this.actionPanel.appendChild(buttonContainer);
    }
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
    if (this.actionPanel) {
      this.actionPanel.style.display = 'none';
      this.actionPanel.innerHTML = '';
    }
  }

  private createActiveCard(card: NonNullable<ConversationUIState['activeCard']>): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'cw-active-card';
    el.style.cssText = 'background:linear-gradient(135deg,#fff 0%,#f8fafc 100%);border:1px solid #E5E7EB;border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:10px;box-shadow:0 16px 40px rgba(15, 23, 42, 0.08);';

    const title = document.createElement('div');
    title.style.cssText = 'font-size:13px;font-weight:700;color:#111827;display:flex;justify-content:space-between;align-items:center;';
    const titleText = document.createElement('span');
    titleText.textContent = card.type.replace(/_/g, ' ').replace(/\b\w/g, (chr) => chr.toUpperCase());
    title.appendChild(titleText);
    const badge = document.createElement('span');
    badge.textContent = 'Recommended';
    badge.style.cssText = 'font-size:11px;font-weight:600;padding:4px 8px;border-radius:999px;background:#E0E7FF;color:#4338CA;';
    title.appendChild(badge);
    el.appendChild(title);

    const body = document.createElement('div');
    body.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

    const data = card.data || {};
    const summary = document.createElement('div');
    summary.style.cssText = 'font-size:12px;color:#374151;line-height:1.5;';
    summary.textContent = this.getCardSummary(data);
    body.appendChild(summary);

    const recommendation = buildRecommendationCardFromMessage(this.messages.map((msg) => msg.content).join(' ') || this.config.greeting || '', this.businessProfile);
    if (recommendation) {
      const cardBody = document.createElement('div');
      cardBody.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:12px;background:#fff;border:1px solid #E5E7EB;';
      const cardHeadline = document.createElement('div');
      cardHeadline.style.cssText = 'font-size:13px;font-weight:700;color:#111827;';
      cardHeadline.textContent = `${recommendation.icon || '✨'} ${recommendation.title}`;
      cardBody.appendChild(cardHeadline);
      const desc = document.createElement('div');
      desc.style.cssText = 'font-size:12px;color:#4B5563;line-height:1.5;';
      desc.textContent = recommendation.description;
      cardBody.appendChild(desc);

      if (recommendation.trustNote) {
        const trustNote = document.createElement('div');
        trustNote.style.cssText = 'font-size:11px;color:#7C3AED;line-height:1.4;';
        trustNote.textContent = recommendation.trustNote;
        cardBody.appendChild(trustNote);
      }

      if (recommendation.source) {
        const sourceLink = document.createElement('a');
        sourceLink.href = recommendation.source.url || '#';
        sourceLink.target = '_blank';
        sourceLink.rel = 'noreferrer';
        sourceLink.textContent = recommendation.source.label;
        sourceLink.style.cssText = 'font-size:11px;color:#2563EB;text-decoration:none;display:inline-flex;align-items:center;gap:4px;';
        sourceLink.title = recommendation.source.url ? `View source: ${recommendation.source.url}` : 'Source attribution';
        cardBody.appendChild(sourceLink);
      }

      const benefits = document.createElement('div');
      benefits.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
      recommendation.benefits.forEach((benefit) => {
        const pill = document.createElement('span');
        pill.textContent = benefit;
        pill.style.cssText = 'font-size:11px;padding:4px 7px;border-radius:999px;background:#F3F4F6;color:#374151;';
        benefits.appendChild(pill);
      });
      cardBody.appendChild(benefits);
      const ctaRow = document.createElement('div');
      ctaRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
      const primary = this.createActionButton(recommendation.primaryCta);
      ctaRow.appendChild(primary);
      if (recommendation.secondaryCta) {
        ctaRow.appendChild(this.createActionButton(recommendation.secondaryCta));
      }
      cardBody.appendChild(ctaRow);
      body.appendChild(cardBody);
    } else {
      const fallbackCard = this.createUnknownGuidanceCard(this.messages.map((msg) => msg.content).join(' ') || this.config.greeting || '');
      if (fallbackCard) {
        body.appendChild(fallbackCard);
      }
    }

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
    btn.style.cssText = `padding:10px 14px;border-radius:999px;border:none;cursor:pointer;font-size:13px;transition:transform 0.15s ease, box-shadow 0.15s ease;${button.variant === 'primary' ? `background:${this.config.primaryColor};color:#fff;box-shadow:0 10px 20px rgba(59,130,246,0.16);` : 'background:#fff;color:#1F2937;border:1px solid #D1D5DB;'}`;
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
    btn.style.cssText = `width:100%;padding:12px 16px;border:none;border-radius:10px;background:${this.config.primaryColor};color:#fff;font-weight:700;cursor:pointer;`;
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
    return `position:fixed;bottom:20px;${pos}width:60px;height:60px;border-radius:50%;background:${this.config.primaryColor};color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 16px 40px rgba(15, 23, 42, 0.2);z-index:999999;transition:transform 0.2s ease, box-shadow 0.2s ease;`;
  }

  private getContainerStyles(): string {
    const pos = this.config.position === 'bottom-left' ? 'left:20px;' : 'right:20px;';
    return `position:fixed;bottom:96px;${pos}width:392px;max-width:calc(100vw - 24px);height:620px;max-height:calc(100vh - 24px);background:#fff;border-radius:18px;box-shadow:0 24px 80px rgba(15, 23, 42, 0.18);z-index:999998;display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;`;
  }

  private getChatIconSvg(): string {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
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
    const continuityCue = this.messages.length > 0 ? ` ${buildContinuityCue(this.messages, this.messages[this.messages.length - 1]?.content || '')}` : '';
    const contextHint = this.messages.length > 0 ? ' Based on what you asked earlier, I can continue from there.' : '';
    return `${baseGreeting}${contextHint}${continuityCue}`;
  }

  private updateHeaderText(): void {
    if (this.headerTitleEl) {
      this.headerTitleEl.textContent = this.config.title || this.config.companyName || '';
    }
    if (this.headerSubtitleEl) {
      this.headerSubtitleEl.textContent = this.config.subtitle || '';
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
      this.container.style.cssText = this.getContainerStyles();
    }
  }

  private async fetchRemoteConfig(): Promise<void> {
    if (!this.config.widgetToken || !this.config.apiUrl) return;

    try {
      const url = new URL('/api/widget/config', this.config.apiUrl);
      url.searchParams.set('token', this.config.widgetToken);
      const response = await fetch(url.toString(), {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) return;
      const remoteConfig = await response.json();
      this.applyRemoteConfig(remoteConfig);
      if (remoteConfig.autoOpen) {
        window.setTimeout(() => {
          if (!this.isOpen) {
            this.toggle();
          }
        }, (remoteConfig.autoOpenDelay || 3) * 1000);
      }
    } catch {
      // Ignore fetch failures and continue with default config
    }
  }

  private applyRemoteConfig(remote: Partial<WidgetConfig>): void {
    this.config = { ...this.config, ...remote };
    this.businessProfile = this.deriveBusinessProfileFromConfig();
    this.updateBubbleAndContainerStyles();
    this.updateHeaderText();

    if (this.config.launcherText && this.bubbleEl) {
      this.bubbleEl.setAttribute('aria-label', this.config.launcherText);
      this.bubbleEl.title = this.config.launcherText;
    }

    if (this.isOpen && this.messages.length === 0 && this.config.greeting) {
      this.addMessage({ role: 'assistant', content: this.config.greeting });
    }
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }
}
