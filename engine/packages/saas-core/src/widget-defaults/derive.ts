export interface DerivedStarterButton {
  id: string;
  label: string;
  action: 'send_text';
  payload: string;
  variant?: 'primary' | 'secondary';
  category?: string;
}

export interface WidgetDerivedDefaults {
  businessType?: string;
  starterOptions: string[];
  suggestedActions: DerivedStarterButton[];
}

export type DerivedBusinessType =
  | 'healthcare'
  | 'ecommerce'
  | 'restaurant'
  | 'real_estate'
  | 'saas'
  | 'general';

const TYPE_KEYWORDS: Array<{ type: Exclude<DerivedBusinessType, 'general'>; words: string[] }> = [
  {
    type: 'healthcare',
    words: ['dental', 'dentist', 'clinic', 'medical', 'doctor', 'patient', 'appointment', 'insurance', 'checkup', 'cleaning', 'teeth', 'orthodont', 'physician', 'surgery', 'pediatric', 'treatment', 'exam', 'x-ray', 'hygiene', 'vision', 'eyecare'],
  },
  {
    type: 'ecommerce',
    words: ['price', 'pricing', 'shipping', 'cart', 'checkout', 'order', 'store', 'shop', 'product', 'delivery', 'returns', 'refund', 'discount', 'stock', 'inventory', 'bestseller', 'headphones', 'wearable', 'warehouse', 'browse', 'add to cart'],
  },
  {
    type: 'restaurant',
    words: ['menu', 'reservation', 'table', 'dish', 'chef', 'kitchen', 'beverage', 'dining', 'restaurant', 'cafe', 'bakery', 'brunch', 'cuisine', 'drinks', 'catering', 'takeout', 'delivery order'],
  },
  {
    type: 'real_estate',
    words: ['listing', 'mortgage', 'property', 'real estate', 'house', 'apartment', 'condo', 'rent', 'lease', 'closing', 'home buyer', 'showing', 'neighborhood', 'realtor', 'broker'],
  },
  {
    type: 'saas',
    words: ['subscription', 'sign up', 'dashboard', 'api', 'integration', 'pricing plan', 'saas', 'software', 'platform', 'trial', 'workspace', 'feature', 'workflow', 'automation', 'app store', 'onboard'],
  },
];

const TYPE_BASES: Record<DerivedBusinessType, string[]> = {
  ecommerce: ['What are your best-selling products?', 'How fast is shipping?', 'What is your return policy?', 'Do you have any discounts or deals?'],
  healthcare: ['What services do you offer?', 'How do I book an appointment?', 'Do you accept insurance?', 'What are your hours?'],
  restaurant: ['What is on your menu?', 'How do I make a reservation?', 'Do you have dietary or vegetarian options?', 'What are your hours?'],
  real_estate: ['What listings do you have available?', 'How do I book a showing?', 'What areas do you serve?', 'How do I get in touch?'],
  saas: ['What does your product do?', 'How much does it cost?', 'Is there a free trial or demo?', 'How do I get started?'],
  general: ['What do you offer?', 'How can I get started?', 'Do you have pricing or rates?', 'How do I contact you?'],
};

const TOPIC_QUESTIONS: Record<DerivedBusinessType, Record<string, string>> = {
  ecommerce: {
    shipping: 'How fast is shipping?',
    returns: 'What is your return policy?',
    pricing: 'Do you have any discounts or deals?',
    products: 'What products do you offer?',
    booking: 'How do I place an order?',
    hours: 'What are your hours?',
    contact: 'How can I contact you?',
    insurance: 'Do you accept insurance?',
  },
  healthcare: {
    shipping: 'How fast is shipping?',
    returns: 'What is your return policy?',
    pricing: 'How much do services cost?',
    products: 'What products do you offer?',
    booking: 'How do I book an appointment?',
    hours: 'What are your hours?',
    contact: 'How can I contact you?',
    insurance: 'Do you accept insurance?',
  },
  restaurant: {
    shipping: 'How fast is shipping?',
    returns: 'What is your return policy?',
    pricing: 'Do you have set menus or specials?',
    products: 'What is on your menu?',
    booking: 'How do I make a reservation?',
    hours: 'What are your hours?',
    contact: 'How can I contact you?',
    insurance: 'Do you accept insurance?',
  },
  real_estate: {
    shipping: 'How fast is shipping?',
    returns: 'What is your return policy?',
    pricing: 'How much does a showing cost?',
    products: 'What listings do you have available?',
    booking: 'How do I book a showing?',
    hours: 'What are your hours?',
    contact: 'How can I contact you?',
    insurance: 'Do you accept insurance?',
  },
  saas: {
    shipping: 'How fast is shipping?',
    returns: 'What is your return policy?',
    pricing: 'How much does it cost?',
    products: 'What does your product do?',
    booking: 'How do I get started?',
    hours: 'What are your hours?',
    contact: 'How can I contact you?',
    insurance: 'Do you accept insurance?',
  },
  general: {
    shipping: 'How fast is shipping?',
    returns: 'What is your return policy?',
    pricing: 'Do you have pricing or rates?',
    products: 'What do you offer?',
    booking: 'How do I book or place an order?',
    hours: 'What are your hours?',
    contact: 'How can I contact you?',
    insurance: 'Do you accept insurance?',
  },
};

const TOPIC_PATTERNS: Array<{ topic: keyof (typeof TOPIC_QUESTIONS)[DerivedBusinessType]; re: RegExp }> = [
  { topic: 'products', re: /\bproduct[s]?\b|\bmenu\b|\blisting[s]?\b|\bcollection[s]?\b|\bservices\b|\bheadphones\b|\bwearable\b/ },
  { topic: 'pricing', re: /\$\s?\d|\bprice[sd]?\b|\bpricing\b|\bcost[s]?\b|\brates?\b|\bfee[s]?\b|\bquote\b/ },
  { topic: 'shipping', re: /\bshipping\b|\bdelivery\b|\bship\b|\barrives?\b|\bfulfillment\b/ },
  { topic: 'returns', re: /\breturn(s|ed)?\b|\brefund\b|\bexchange\b/ },
  { topic: 'booking', re: /\bappointment\b|\b(reserv|book|schedule|booking)\w*\b|\bvisit\b/ },
  { topic: 'insurance', re: /\binsurance\b|\bcoverage\b|\bppo\b|\bnetwork plan\b/ },
  { topic: 'hours', re: /\bhours?\b|\bopen\b|\bclosed\b|\bmon(day|\.)?\b|\bfri(day|\.)?\b|\bweekdays?\b/ },
  { topic: 'contact', re: /\bcontact\b|\bcall\b|\bphone\b|\breach out\b|\bemail\b|\bvisit us\b/ },
];

const SHORT_LABELS: Record<string, string> = {
  'What are your best-selling products?': 'Browse products',
  'How fast is shipping?': 'Shipping',
  'What is your return policy?': 'Returns',
  'Do you have any discounts or deals?': 'Deals & discounts',
  'What services do you offer?': 'Our services',
  'How do I book an appointment?': 'Book a visit',
  'Do you accept insurance?': 'Insurance',
  'What are your hours?': 'Hours',
  'What is on your menu?': 'View menu',
  'How do I make a reservation?': 'Reservations',
  'Do you have dietary or vegetarian options?': 'Dietary options',
  'What listings do you have available?': 'Browse listings',
  'How do I book a showing?': 'Book a showing',
  'What areas do you serve?': 'Areas served',
  'How do I get in touch?': 'Contact us',
  'What does your product do?': 'What we do',
  'How much does it cost?': 'Pricing',
  'Is there a free trial or demo?': 'Try it free',
  'How do I get started?': 'Get started',
  'What do you offer?': 'What we offer',
  'How can I get started?': 'Get started',
  'Do you have pricing or rates?': 'Pricing',
  'How can I contact you?': 'Contact us',
  'How much do services cost?': 'Pricing',
  'What products do you offer?': 'Products',
  'How do I place an order?': 'Place an order',
  'How do I book or place an order?': 'Book an order',
  'Do you have set menus or specials?': 'Specials',
  'How much does a showing cost?': 'Pricing',
};

const PRIMARY_LABELS: Record<DerivedBusinessType, string> = {
  ecommerce: 'Browse products',
  healthcare: 'Our services',
  restaurant: 'View menu',
  real_estate: 'Browse listings',
  saas: 'What we do',
  general: 'What we offer',
};

const PRIMARY_CATEGORIES: Record<DerivedBusinessType, string> = {
  ecommerce: 'products',
  healthcare: 'guidance',
  restaurant: 'guidance',
  real_estate: 'products',
  saas: 'guidance',
  general: 'guidance',
};

function shortLabel(question: string): string {
  if (SHORT_LABELS[question]) return SHORT_LABELS[question];
  if (/\bpric|cost|rate|fee\b/.test(question)) return 'Pricing';
  if (/\bshipping|delivery\b/.test(question)) return 'Shipping';
  if (/\breturn|refund\b/.test(question)) return 'Returns';
  if (/\binsurance|coverage\b/.test(question)) return 'Insurance';
  if (/\bhours?\b/.test(question)) return 'Hours';
  if (/\bcontact|call|phone|email\b/.test(question)) return 'Contact us';
  if (/\bbook|appointment|reserv|showing\b/.test(question)) return 'Book now';
  const clean = question.replace(/[?!]/g, '').trim();
  return clean.length > 28 ? clean.slice(0, 27).trimEnd() + '…' : clean;
}

export function detectBusinessType(text: string): DerivedBusinessType | undefined {
  const lower = text.toLowerCase();
  let best: Exclude<DerivedBusinessType, 'general'> | undefined;
  let bestScore = 0;
  for (const group of TYPE_KEYWORDS) {
    let score = 0;
    for (const word of group.words) {
      const idx = lower.indexOf(word);
      if (idx !== -1) score += word.length >= 8 ? 2 : 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = group.type;
    }
  }
  return bestScore > 0 ? best : undefined;
}

export function detectTopics(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const pattern of TOPIC_PATTERNS) {
    if (pattern.re.test(lower) && !found.includes(pattern.topic)) found.push(pattern.topic);
  }
  return found;
}

export function buildStarterOptions(type: DerivedBusinessType, topics: string[]): string[] {
  const topicQuestions = TOPIC_QUESTIONS[type] || TOPIC_QUESTIONS.general;
  const starters: string[] = [];
  for (const topic of topics) {
    const question = topicQuestions[topic];
    if (question && !starters.includes(question) && starters.length < 4) starters.push(question);
  }
  for (const question of TYPE_BASES[type] || TYPE_BASES.general) {
    if (!starters.includes(question) && starters.length < 4) starters.push(question);
  }
  return starters.slice(0, 4);
}

export function buildSuggestedActions(type: DerivedBusinessType, starters: string[]): DerivedStarterButton[] {
  const buttons: DerivedStarterButton[] = [];
  if (starters.length > 0) {
    buttons.push({
      id: 'primary',
      label: PRIMARY_LABELS[type] || 'What we offer',
      action: 'send_text',
      payload: starters[0],
      variant: 'primary',
      category: PRIMARY_CATEGORIES[type] || 'guidance',
    });
  }
  for (let i = 1; i < starters.length && buttons.length < 3; i++) {
    const category = /pric|cost|rate|fee/.test(starters[i])
      ? 'plans'
      : /contact|call|phone|email/.test(starters[i])
        ? 'sales'
        : 'faq';
    buttons.push({
      id: `suggest-${i}`,
      label: shortLabel(starters[i]),
      action: 'send_text',
      payload: starters[i],
      variant: 'secondary',
      category,
    });
  }
  return buttons;
}

export function deriveWidgetDefaults(chunks: Array<{ content?: string; metadata?: Record<string, unknown> }>): WidgetDerivedDefaults {
  const text = chunks
    .map((chunk) => {
      const metadata = (chunk.metadata || {}) as Record<string, unknown>;
      const title = typeof metadata.title === 'string' ? metadata.title : '';
      return title ? `[${title}] ${chunk.content || ''}` : chunk.content || '';
    })
    .join('\n\n');

  const type = detectBusinessType(text) || 'general';
  const topics = detectTopics(text);
  const starterOptions = buildStarterOptions(type, topics);
  return {
    businessType: type === 'general' ? undefined : type,
    starterOptions,
    suggestedActions: buildSuggestedActions(type, starterOptions),
  };
}