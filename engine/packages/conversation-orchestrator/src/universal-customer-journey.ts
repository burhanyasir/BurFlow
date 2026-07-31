import type {
  BusinessProfile,
  BusinessType,
  JourneyDetectionResult,
  JourneyTemplate,
  ModuleName,
  ModuleRoutingDecision,
  UniversalIntent,
  UniversalIntentResult,
} from './types';

export interface SmartChoice {
  text: string;
  score: number;
  category: string;
}

export interface JourneyTemplateRegistryEntry {
  template: JourneyTemplate;
  profile: BusinessProfile;
}

export interface RankedIntent {
  intent: UniversalIntent;
  confidence: number;
  reason: string;
}

export interface MultiIntentDetectionResult {
  intents: RankedIntent[];
  primaryIntent: UniversalIntent;
  requiresClarification: boolean;
  blended: boolean;
}

export interface JourneySwitchDecision {
  switching: boolean;
  fromJourney: string;
  toJourney: string;
  preserveContext: boolean;
  preservedStage: string;
  nextStage: string;
  reason: string;
}

export interface ConfidenceRouteResult {
  decisions: ModuleRoutingDecision[];
  requiresClarification: boolean;
  blended: boolean;
  reason: string;
}

const defaultKeywordMap: Record<UniversalIntent, string[]> = {
  buy: ['buy', 'purchase', 'get started', 'start', 'subscribe', 'demo', 'book a demo', 'pricing', 'budget', 'cost', 'quote'],
  research: ['research', 'learn', 'info', 'details', 'understand', 'explore', 'compare options'],
  compare: ['compare', 'vs', 'versus', 'better than', 'alternatives', 'which is better'],
  support: ['support', 'help', 'can you help', 'need help', 'problem'],
  billing: ['billing', 'invoice', 'charge', 'payment', 'subscription', 'plan'],
  refund: ['refund', 'cancel', 'chargeback', 'money back', 'reimbursement'],
  warranty: ['warranty', 'guarantee', 'replacement'],
  technical_issue: ['bug', 'error', 'failed', 'not working', 'broken', 'login issue', 'api issue'],
  appointment: ['appointment', 'consultation', 'schedule', 'visit', 'meet', 'insurance', 'coverage'],
  booking: ['book', 'reserve', 'hotel', 'room', 'table', 'appointment booking'],
  complaint: ['complaint', 'dissatisfied', 'unhappy', 'problem complaint', 'issue'],
  partnership: ['partner', 'partnership', 'reseller', 'wholesale', 'affiliate'],
  careers: ['careers', 'jobs', 'hire', 'employment', 'apply'],
  contact: ['contact', 'call me', 'email me', 'reach out', 'talk to someone'],
  faq: ['faq', 'frequently asked', 'how does it work', 'what is'],
  unknown: [],
};

const defaultTemplates: Record<BusinessType, JourneyTemplate> = {
  saas: {
    id: 'saas-default',
    businessType: 'saas',
    industry: 'SaaS',
    name: 'SaaS Customer Journey',
    stages: [
      { id: 'problem', name: 'Problem', description: 'Pain point identified', keywords: ['need', 'problem', 'workflow', 'challenge'] },
      { id: 'qualification', name: 'Qualification', description: 'Assess fit and maturity', keywords: ['team size', 'budget', 'timeline', 'fit'] },
      { id: 'demo', name: 'Demo', description: 'Product review and proof', keywords: ['demo', 'show me', 'walkthrough', 'proof'] },
      { id: 'trial', name: 'Trial', description: 'Proof of value with evaluation', keywords: ['trial', 'pilot', 'evaluate', 'test drive'] },
      { id: 'purchase', name: 'Purchase', description: 'Decision and procurement', keywords: ['buy', 'purchase', 'contract', 'sign up'] },
    ],
    ctas: ['Book demo', 'Start free trial', 'Talk to sales', 'Compare plans'],
    enabled: true,
  },
  shopify: {
    id: 'shopify-default',
    businessType: 'shopify',
    industry: 'Shopify / Ecommerce',
    name: 'Commerce Journey',
    stages: [
      { id: 'browse', name: 'Browse', description: 'Product discovery', keywords: ['browse', 'look at', 'product', 'catalog'] },
      { id: 'compare', name: 'Compare', description: 'Review options', keywords: ['compare', 'features', 'pricing', 'alternative'] },
      { id: 'shipping', name: 'Shipping', description: 'Logistics and delivery details', keywords: ['shipping', 'delivery', 'warehouse', 'dispatch'] },
      { id: 'checkout', name: 'Checkout', description: 'Payment and order completion', keywords: ['checkout', 'pay', 'cart', 'order'] },
      { id: 'upsell', name: 'Upsell', description: 'Cross-sell or post-purchase add-on', keywords: ['upsell', 'bundle', 'add-on'] },
    ],
    ctas: ['View collection', 'Shipping info', 'Compare products', 'Checkout help'],
    enabled: true,
  },
  dental: {
    id: 'dental-default',
    businessType: 'dental',
    industry: 'Dental Clinics',
    name: 'Dental Patient Journey',
    stages: [
      { id: 'pain', name: 'Pain', description: 'Symptom and urgency', keywords: ['pain', 'toothache', 'sore', 'emergency'] },
      { id: 'insurance', name: 'Insurance', description: 'Coverage and benefits', keywords: ['insurance', 'benefits', 'coverage'] },
      { id: 'appointment', name: 'Appointment', description: 'Scheduling care', keywords: ['appointment', 'schedule', 'visit'] },
      { id: 'treatment', name: 'Treatment', description: 'Clinical recommendation', keywords: ['cleaning', 'filling', 'service'] },
      { id: 'follow_up', name: 'Follow-up', description: 'Aftercare and reminders', keywords: ['follow-up', 'check-in', 'reminder'] },
    ],
    ctas: ['Book appointment', 'Insurance questions', 'New patient info', 'Call clinic'],
    enabled: true,
  },
  healthcare: {
    id: 'healthcare-default',
    businessType: 'healthcare',
    industry: 'Healthcare',
    name: 'Healthcare Patient Journey',
    stages: [
      { id: 'symptom', name: 'Symptoms', description: 'Initial concern', keywords: ['symptom', 'condition', 'concern'] },
      { id: 'eligibility', name: 'Eligibility', description: 'Coverage and paperwork', keywords: ['coverage', 'eligibility', 'insurance'] },
      { id: 'consultation', name: 'Consultation', description: 'Provider review', keywords: ['consult', 'doctor', 'appointment'] },
      { id: 'treatment', name: 'Treatment', description: 'Care recommendation', keywords: ['treatment', 'care', 'plan'] },
      { id: 'support', name: 'Support', description: 'Follow-up and guidance', keywords: ['support', 'follow-up', 'care plan'] },
    ],
    ctas: ['Book consultation', 'Insurance info', 'Care options', 'Patient support'],
    enabled: true,
  },
  legal: {
    id: 'legal-default',
    businessType: 'legal',
    industry: 'Law Firms',
    name: 'Legal Intake Journey',
    stages: [
      { id: 'issue', name: 'Issue', description: 'Legal problem identified', keywords: ['issue', 'case', 'problem'] },
      { id: 'consultation', name: 'Consultation', description: 'Intake and context', keywords: ['consultation', 'call', 'meeting'] },
      { id: 'assessment', name: 'Assessment', description: 'Case review', keywords: ['assessment', 'review', 'evaluate'] },
      { id: 'engagement', name: 'Engagement', description: 'Decision and signature', keywords: ['hire', 'engage', 'retainer', 'sign'] },
    ],
    ctas: ['Book consultation', 'Case review', 'Pricing', 'Talk to an attorney'],
    enabled: true,
  },
  real_estate: {
    id: 'real-estate-default',
    businessType: 'real_estate',
    industry: 'Real Estate',
    name: 'Property Journey',
    stages: [
      { id: 'search', name: 'Search', description: 'Property discovery', keywords: ['search', 'property', 'listing'] },
      { id: 'tour', name: 'Tour', description: 'Viewing and due diligence', keywords: ['tour', 'schedule', 'visit'] },
      { id: 'offer', name: 'Offer', description: 'Negotiation', keywords: ['offer', 'negotiate', 'price'] },
      { id: 'closing', name: 'Closing', description: 'Contract and title', keywords: ['closing', 'contract', 'paperwork'] },
    ],
    ctas: ['View listings', 'Book tour', 'Mortgage info', 'Talk to agent'],
    enabled: true,
  },
  hotel: {
    id: 'hotel-default',
    businessType: 'hotel',
    industry: 'Hotels',
    name: 'Hotel Booking Journey',
    stages: [
      { id: 'availability', name: 'Availability', description: 'Check dates and capacity', keywords: ['availability', 'dates', 'room', 'vacancy'] },
      { id: 'dates', name: 'Dates', description: 'Dates and stay length', keywords: ['dates', 'check-in', 'check-out', 'nights'] },
      { id: 'room_selection', name: 'Room Selection', description: 'Choosing a room', keywords: ['suite', 'room', 'view', 'options'] },
      { id: 'booking', name: 'Booking', description: 'Reservation and confirmation', keywords: ['book', 'reserve', 'confirm'] },
    ],
    ctas: ['Check availability', 'Room options', 'Book stay', 'Call concierge'],
    enabled: true,
  },
  restaurant: {
    id: 'restaurant-default',
    businessType: 'restaurant',
    industry: 'Restaurants',
    name: 'Dining Journey',
    stages: [
      { id: 'browse', name: 'Browse', description: 'Menu and atmosphere', keywords: ['menu', 'dining', 'options'] },
      { id: 'reservation', name: 'Reservation', description: 'Booking or waitlist', keywords: ['reserve', 'table', 'time'] },
      { id: 'order', name: 'Order', description: 'Order with specifics', keywords: ['order', 'takeout', 'delivery'] },
      { id: 'follow_up', name: 'Follow-up', description: 'Feedback and loyalty', keywords: ['feedback', 'loyalty', 'review'] },
    ],
    ctas: ['Reserve table', 'View menu', 'Delivery options', 'Ask about dietary info'],
    enabled: true,
  },
  agency: {
    id: 'agency-default',
    businessType: 'agency',
    industry: 'Agencies',
    name: 'Agency Sales Journey',
    stages: [
      { id: 'brief', name: 'Brief', description: 'Project need identified', keywords: ['project', 'goal', 'brief'] },
      { id: 'qualification', name: 'Qualification', description: 'Scope and fit', keywords: ['budget', 'timeline', 'team'] },
      { id: 'proposal', name: 'Proposal', description: 'Offer or pitch', keywords: ['proposal', 'quote', 'plan'] },
      { id: 'engagement', name: 'Engagement', description: 'Decision and onboarding', keywords: ['hire', 'start', 'engage'] },
    ],
    ctas: ['Book a strategy call', 'See case studies', 'Discuss budget', 'Get proposal'],
    enabled: true,
  },
  education: {
    id: 'education-default',
    businessType: 'education',
    industry: 'Education',
    name: 'Enrollment Journey',
    stages: [
      { id: 'interest', name: 'Interest', description: 'Initial curiosity', keywords: ['program', 'course', 'interest'] },
      { id: 'eligibility', name: 'Eligibility', description: 'Requirements and fit', keywords: ['requirements', 'eligibility', 'admissions'] },
      { id: 'application', name: 'Application', description: 'Enrollment or application', keywords: ['application', 'enroll', 'register'] },
      { id: 'support', name: 'Support', description: 'Admissions follow-up', keywords: ['support', 'questions', 'contact'] },
    ],
    ctas: ['Explore programs', 'Book info session', 'Admissions support', 'Download brochure'],
    enabled: true,
  },
  manufacturing: {
    id: 'manufacturing-default',
    businessType: 'manufacturing',
    industry: 'Manufacturing',
    name: 'B2B Manufacturing Journey',
    stages: [
      { id: 'problem', name: 'Problem', description: 'Operational or supply issue', keywords: ['issue', 'capacity', 'supply'] },
      { id: 'specification', name: 'Specification', description: 'Requirements and fit', keywords: ['requirements', 'specs', 'volume'] },
      { id: 'quote', name: 'Quote', description: 'Pricing and proposal', keywords: ['quote', 'pricing', 'bid'] },
      { id: 'delivery', name: 'Delivery', description: 'Implementation and fulfillment', keywords: ['delivery', 'rollout', 'implementation'] },
    ],
    ctas: ['Request quote', 'Talk to engineering', 'Use cases', 'Schedule call'],
    enabled: true,
  },
  consulting: {
    id: 'consulting-default',
    businessType: 'consulting',
    industry: 'Consulting',
    name: 'Consulting Sales Journey',
    stages: [
      { id: 'need', name: 'Need', description: 'Challenge identified', keywords: ['challenge', 'need', 'problem'] },
      { id: 'assessment', name: 'Assessment', description: 'Scope and fit', keywords: ['assessment', 'scope', 'consultation'] },
      { id: 'proposal', name: 'Proposal', description: 'Offer and pricing', keywords: ['proposal', 'quote', 'engagement'] },
      { id: 'outcome', name: 'Outcome', description: 'Delivery and success', keywords: ['outcome', 'success', 'delivery'] },
    ],
    ctas: ['Book discovery call', 'See case studies', 'Get proposal', 'Talk to strategist'],
    enabled: true,
  },
  generic: {
    id: 'generic-default',
    businessType: 'generic',
    industry: 'General',
    name: 'Generic Journey',
    stages: [
      { id: 'research', name: 'Research', description: 'Initial discovery', keywords: ['learn', 'info', 'research'] },
      { id: 'consideration', name: 'Consideration', description: 'Evaluation and fit', keywords: ['compare', 'options'] },
      { id: 'decision', name: 'Decision', description: 'Ready to convert', keywords: ['decision', 'buy', 'pricing'] },
      { id: 'purchase', name: 'Purchase', description: 'Complete action', keywords: ['purchase', 'checkout', 'book'] },
    ],
    ctas: ['Learn more', 'Talk to sales', 'Book a call', 'Get pricing'],
    enabled: true,
  },
};

export function createDefaultBusinessProfile(overrides: Partial<BusinessProfile> = {}): BusinessProfile {
  return {
    businessType: 'generic',
    industry: 'General',
    products: [],
    services: [],
    policies: [],
    goals: ['increase conversions', 'improve customer experience'],
    brandTone: 'helpful',
    supportedCTAs: ['Book a demo', 'Talk to sales', 'Get pricing'],
    ...overrides,
  };
}

export function detectVisitorIntent(message: string, profile?: BusinessProfile): UniversalIntentResult {
  const normalized = (message || '').toLowerCase();
  const effectiveProfile = profile ?? createDefaultBusinessProfile();

  let bestIntent: UniversalIntent = 'unknown';
  let bestScore = 0;
  let bestReason = 'No strong intent signal detected';

  const entries = Object.entries(defaultKeywordMap) as Array<[UniversalIntent, string[]]>;

  for (const [intent, keywords] of entries) {
    if (intent === 'unknown') continue;

    let score = 0;
    for (const keyword of keywords) {
      if (!keyword) continue;
      if (matchKeyword(normalized, keyword)) {
        score += 2;
      }
    }

    if (effectiveProfile.businessType === 'dental' && intent === 'appointment') score += 2;
    if (effectiveProfile.businessType === 'shopify' && intent === 'buy') score += 2;
    if (effectiveProfile.businessType === 'saas' && intent === 'buy') score += 1;
    if (effectiveProfile.businessType === 'saas' && intent === 'compare') score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
      bestReason = `Matched ${keywordMatchLabel(normalized, keywords)} intent signals`;
    }
  }

  if (bestScore === 0) {
    const isResearch = /how|what|why|when|where|tell me|learn/.test(normalized);
    if (isResearch) {
      return { intent: 'research', confidence: 0.5, reason: 'General informational query' };
    }
    return { intent: 'unknown', confidence: 0.1, reason: 'No strong intent signal detected' };
  }

  return { intent: bestIntent, confidence: Math.min(0.95, 0.4 + bestScore / 12), reason: bestReason };
}

export function detectCustomerJourneyStage(
  message: string,
  profile: BusinessProfile = createDefaultBusinessProfile(),
  previousStages: string[] = [],
): JourneyDetectionResult {
  const normalized = (message || '').toLowerCase();
  const journeyTemplate = getJourneyTemplateForProfile(profile);

  let bestStage = journeyTemplate.stages[0]?.name ?? 'research';
  let bestScore = -1;
  let bestReason = 'Default stage fallback';

  for (const stage of journeyTemplate.stages) {
    let score = 0;
    for (const keyword of stage.keywords) {
      if (matchKeyword(normalized, keyword.toLowerCase())) {
        score += 2;
      }
    }

    if (stage.id === 'qualification' && /budget|team size|timeline|fit|scope/.test(normalized)) {
      score += 4;
    }
    if (stage.id === 'demo' && /demo|walkthrough|show me|proof/.test(normalized)) {
      score += 4;
    }
    if (stage.id === 'purchase' && /buy|purchase|subscribe|sign up|contract/.test(normalized)) {
      score += 4;
    }

    if (previousStages.includes(stage.id)) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestStage = stage.name;
      bestReason = `Matched stage keywords for ${stage.name}`;
    }
  }

  const confidence = bestScore > 0 ? Math.min(0.95, 0.45 + bestScore / 8) : 0.35;
  return { stage: bestStage, confidence, reason: bestReason };
}

export function getJourneyTemplateForProfile(profile: BusinessProfile = createDefaultBusinessProfile()): JourneyTemplate {
  const template = defaultTemplates[profile.businessType] ?? defaultTemplates.generic;
  return { ...template, stages: template.stages.map((stage) => ({ ...stage })) };
}

export function buildModuleRouting(
  profile: BusinessProfile = createDefaultBusinessProfile(),
  intent: UniversalIntent | Array<UniversalIntent | { intent: UniversalIntent; confidence: number }> = 'unknown',
  stage: string = 'research',
): ModuleRoutingDecision[] {
  if (Array.isArray(intent)) {
    return routeWithConfidence(profile, intent, stage).decisions;
  }

  const decisions: ModuleRoutingDecision[] = [];
  const routeMap: Record<UniversalIntent, ModuleName[]> = {
    buy: ['sales', 'lead_qualification'],
    research: ['product_advisor', 'faq'],
    compare: ['product_advisor', 'sales'],
    support: ['customer_support'],
    billing: ['billing'],
    refund: ['billing', 'customer_support'],
    warranty: ['customer_support', 'product_advisor'],
    technical_issue: ['technical_support', 'customer_support'],
    appointment: ['booking'],
    booking: ['booking'],
    complaint: ['complaint_resolution', 'customer_support'],
    partnership: ['sales', 'lead_qualification'],
    careers: ['customer_support'],
    contact: ['sales', 'customer_support'],
    faq: ['faq'],
    unknown: ['faq', 'sales'],
  };

  const modules = routeMap[intent] ?? routeMap.unknown;

  for (let i = 0; i < modules.length; i += 1) {
    const module = modules[i];
    decisions.push({
      module,
      confidence: 0.6 + (i === 0 ? 0.2 : 0.08),
      reason: `Intent ${intent} and stage ${stage} align with ${module.replace(/_/g, ' ')}`,
      primary: i === 0,
    });
  }

  if (profile.businessType === 'dental' && intent === 'appointment') {
    decisions.unshift({ module: 'booking', confidence: 0.9, reason: 'Dental appointments require scheduling support', primary: true });
  }

  if (profile.businessType === 'shopify' && intent === 'buy') {
    decisions.unshift({ module: 'sales', confidence: 0.88, reason: 'Commerce offers benefit from conversion-focused sales support', primary: true });
  }

  return decisions.slice(0, 3);
}

export function detectMultiIntents(message: string, profile?: BusinessProfile): MultiIntentDetectionResult {
  const normalized = (message || '').toLowerCase();
  const effectiveProfile = profile ?? createDefaultBusinessProfile();
  const intents: RankedIntent[] = [];

  const entries = Object.entries(defaultKeywordMap) as Array<[UniversalIntent, string[]]>;

  for (const [intent, keywords] of entries) {
    if (intent === 'unknown') continue;

    let score = 0;
    for (const keyword of keywords) {
      if (!keyword) continue;
      if (matchKeyword(normalized, keyword)) {
        score += 2;
      }
    }

    if (effectiveProfile.businessType === 'dental' && intent === 'appointment') score += 2;
    if (effectiveProfile.businessType === 'shopify' && intent === 'buy') score += 2;
    if (effectiveProfile.businessType === 'saas' && intent === 'buy') score += 1;
    if (effectiveProfile.businessType === 'saas' && intent === 'compare') score += 1;

    if (score > 0) {
      const confidence = clamp(0.28 + score / 10, 0.1, 0.96);
      intents.push({ intent, confidence, reason: `Matched ${keywordMatchLabel(normalized, keywords)} intent signals` });
    }
  }

  const sorted = intents.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  const primaryIntent = sorted[0]?.intent ?? 'unknown';
  const topConfidence = sorted[0]?.confidence ?? 0;
  const secondConfidence = sorted[1]?.confidence ?? 0;
  const requiresClarification = sorted.length === 0 || (topConfidence < 0.45 && secondConfidence < 0.45);
  const blended = sorted.length > 1 && Math.abs(topConfidence - secondConfidence) < 0.12 && topConfidence >= 0.4;

  return { intents: sorted, primaryIntent, requiresClarification, blended };
}

export function routeWithConfidence(
  profile: BusinessProfile = createDefaultBusinessProfile(),
  intents: UniversalIntent | Array<UniversalIntent | { intent: UniversalIntent; confidence: number }> = 'unknown',
  stage: string = 'research',
): ConfidenceRouteResult {
  const candidates = normalizeIntentCandidates(intents);
  const aggregated = new Map<ModuleName, { score: number; reason: string }>();

  for (const candidate of candidates) {
    const routeMap: Record<UniversalIntent, ModuleName[]> = {
      buy: ['sales', 'lead_qualification'],
      research: ['product_advisor', 'faq'],
      compare: ['product_advisor', 'sales'],
      support: ['customer_support'],
      billing: ['billing'],
      refund: ['billing', 'customer_support'],
      warranty: ['customer_support', 'product_advisor'],
      technical_issue: ['technical_support', 'customer_support'],
      appointment: ['booking'],
      booking: ['booking'],
      complaint: ['complaint_resolution', 'customer_support'],
      partnership: ['sales', 'lead_qualification'],
      careers: ['customer_support'],
      contact: ['sales', 'customer_support'],
      faq: ['faq'],
      unknown: ['faq', 'sales'],
    };

    const modules = routeMap[candidate.intent] ?? routeMap.unknown;
    for (const module of modules) {
      const existing = aggregated.get(module) ?? { score: 0, reason: '' };
      const weight = candidate.confidence * (module === 'sales' || module === 'booking' ? 1.2 : 1);
      existing.score += weight;
      existing.reason = `Intent ${candidate.intent} and stage ${stage} align with ${module.replace(/_/g, ' ')}`;
      aggregated.set(module, existing);
    }
  }

  const decisions = Array.from(aggregated.entries())
    .map(([module, value]) => ({
      module,
      confidence: clamp(value.score / Math.max(1, candidates.length * 0.8), 0, 1),
      reason: value.reason,
      primary: false,
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .map((decision, index) => ({ ...decision, primary: index === 0 }));

  const topConfidence = decisions[0]?.confidence ?? 0;
  const secondConfidence = decisions[1]?.confidence ?? 0;
  const requiresClarification = topConfidence < 0.45 && candidates.length > 0;
  const blended = decisions.length > 1 && Math.abs(topConfidence - secondConfidence) < 0.12 && topConfidence >= 0.4;

  if (profile.businessType === 'dental' && candidates.some((candidate) => candidate.intent === 'appointment')) {
    decisions.unshift({ module: 'booking', confidence: 0.9, reason: 'Dental appointments require scheduling support', primary: true });
  }

  if (profile.businessType === 'shopify' && candidates.some((candidate) => candidate.intent === 'buy')) {
    decisions.unshift({ module: 'sales', confidence: 0.88, reason: 'Commerce offers benefit from conversion-focused sales support', primary: true });
  }

  return {
    decisions: decisions.slice(0, 3),
    requiresClarification,
    blended,
    reason: requiresClarification ? 'Low confidence route; clarification may improve match quality.' : blended ? 'Confidence is similar across modules; blended routing is recommended.' : 'Route selected by confidence-weighted module relevance.',
  };
}

export function evaluateJourneySwitch(
  currentJourney: string,
  currentStage: string,
  message: string,
  profile: BusinessProfile = createDefaultBusinessProfile(),
): JourneySwitchDecision {
  const normalized = (message || '').toLowerCase();
  const detections = detectMultiIntents(message, profile);
  const targetMap: Record<UniversalIntent, string> = {
    buy: 'sales',
    research: 'research',
    compare: 'comparison',
    support: 'support',
    billing: 'billing',
    refund: 'billing',
    warranty: 'support',
    technical_issue: 'support',
    appointment: 'booking',
    booking: 'booking',
    complaint: 'support',
    partnership: 'sales',
    careers: 'support',
    contact: 'sales',
    faq: 'faq',
    unknown: currentJourney,
  };

  const preferred = detections.intents[0]?.intent ?? 'unknown';
  const targetJourney = targetMap[preferred] ?? currentJourney;
  const switching = targetJourney !== currentJourney && targetJourney !== 'unknown';

  if (/switch|instead|actually|back to|move to/i.test(normalized) && targetJourney !== currentJourney) {
    return {
      switching: true,
      fromJourney: currentJourney,
      toJourney: targetJourney,
      preserveContext: true,
      preservedStage: currentStage,
      nextStage: currentStage,
      reason: 'Customer explicitly changed direction; conversation context is preserved while shifting journey.',
    };
  }

  return {
    switching,
    fromJourney: currentJourney,
    toJourney: targetJourney,
    preserveContext: true,
    preservedStage: currentStage,
    nextStage: currentStage,
    reason: switching ? 'New intent signals indicate a natural transition to a more relevant journey.' : 'Current journey still aligns with the conversation; context is preserved.',
  };
}

export function buildSmartChoices(
  profile: BusinessProfile = createDefaultBusinessProfile(),
  intent: UniversalIntent = 'unknown',
  stage: string = 'research',
  previousConversation: string[] = [],
): SmartChoice[] {
  const byType: Record<BusinessType, SmartChoice[]> = {
    saas: [
      { text: 'Book demo', score: 92, category: 'sales' },
      { text: 'Compare plans', score: 86, category: 'compare' },
      { text: 'Start free trial', score: 81, category: 'trial' },
      { text: 'Talk to sales', score: 79, category: 'sales' },
      { text: 'Get pricing', score: 77, category: 'pricing' },
      { text: 'View integrations', score: 74, category: 'product' },
    ],
    shopify: [
      { text: 'Shipping info', score: 90, category: 'shipping' },
      { text: 'Compare products', score: 87, category: 'compare' },
      { text: 'Checkout help', score: 84, category: 'support' },
      { text: 'View collection', score: 80, category: 'browse' },
      { text: 'Book a call', score: 76, category: 'sales' },
      { text: 'Returns policy', score: 72, category: 'support' },
    ],
    dental: [
      { text: 'Book appointment', score: 95, category: 'booking' },
      { text: 'Insurance questions', score: 88, category: 'insurance' },
      { text: 'New patient info', score: 84, category: 'info' },
      { text: 'Call clinic', score: 79, category: 'contact' },
      { text: 'Treatment options', score: 75, category: 'product' },
    ],
    healthcare: [
      { text: 'Book consultation', score: 92, category: 'booking' },
      { text: 'Insurance info', score: 88, category: 'insurance' },
      { text: 'Care options', score: 82, category: 'care' },
      { text: 'Patient support', score: 79, category: 'support' },
    ],
    legal: [
      { text: 'Book consultation', score: 94, category: 'booking' },
      { text: 'Case review', score: 88, category: 'legal' },
      { text: 'Pricing', score: 84, category: 'pricing' },
      { text: 'Talk to attorney', score: 80, category: 'sales' },
    ],
    real_estate: [
      { text: 'View listings', score: 92, category: 'browse' },
      { text: 'Book tour', score: 89, category: 'booking' },
      { text: 'Mortgage info', score: 81, category: 'finance' },
      { text: 'Talk to agent', score: 78, category: 'contact' },
    ],
    hotel: [
      { text: 'Check availability', score: 96, category: 'booking' },
      { text: 'Room options', score: 89, category: 'browse' },
      { text: 'Book stay', score: 86, category: 'booking' },
      { text: 'Call concierge', score: 74, category: 'contact' },
    ],
    restaurant: [
      { text: 'Reserve table', score: 92, category: 'booking' },
      { text: 'View menu', score: 87, category: 'browse' },
      { text: 'Delivery options', score: 80, category: 'ordering' },
      { text: 'Dietary info', score: 76, category: 'support' },
    ],
    agency: [
      { text: 'Book strategy call', score: 93, category: 'booking' },
      { text: 'See case studies', score: 89, category: 'proof' },
      { text: 'Discuss budget', score: 84, category: 'pricing' },
      { text: 'Get proposal', score: 80, category: 'sales' },
    ],
    education: [
      { text: 'Explore programs', score: 90, category: 'browse' },
      { text: 'Book info session', score: 87, category: 'booking' },
      { text: 'Admissions support', score: 82, category: 'support' },
      { text: 'Download brochure', score: 78, category: 'info' },
    ],
    manufacturing: [
      { text: 'Request quote', score: 94, category: 'quote' },
      { text: 'Talk to engineering', score: 89, category: 'support' },
      { text: 'Use cases', score: 84, category: 'proof' },
      { text: 'Schedule call', score: 80, category: 'booking' },
    ],
    consulting: [
      { text: 'Book discovery call', score: 94, category: 'booking' },
      { text: 'See case studies', score: 89, category: 'proof' },
      { text: 'Get proposal', score: 84, category: 'sales' },
      { text: 'Talk to strategist', score: 80, category: 'contact' },
    ],
    generic: [
      { text: 'Learn more', score: 88, category: 'research' },
      { text: 'Talk to sales', score: 84, category: 'sales' },
      { text: 'Book a call', score: 80, category: 'booking' },
      { text: 'Get pricing', score: 76, category: 'pricing' },
    ],
  };

  const base = byType[profile.businessType] ?? byType.generic;
  const filtered = base.filter((choice) => !previousConversation.some((snippet) => snippet.toLowerCase().includes(choice.text.toLowerCase())));
  const normalized = filtered.map((choice) => ({ ...choice, score: choice.score + (intent === 'buy' ? 6 : 0) + (stage === 'purchase' ? 4 : 0) }));
  return normalized.sort((a, b) => b.score - a.score).slice(0, 6);
}

function keywordMatchLabel(normalized: string, keywords: string[]): string {
  const hit = keywords.find((keyword) => matchKeyword(normalized, keyword.toLowerCase()));
  return hit ?? 'general';
}

function normalizeIntentCandidates(
  intents: UniversalIntent | Array<UniversalIntent | { intent: UniversalIntent; confidence: number }>,
): Array<{ intent: UniversalIntent; confidence: number }> {
  if (!Array.isArray(intents)) {
    return [{ intent: intents, confidence: 1 }];
  }

  return intents.map((value) =>
    typeof value === 'string' ? { intent: value, confidence: 1 } : { intent: value.intent, confidence: clamp(value.confidence, 0, 1) },
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function matchKeyword(text: string, keyword: string): boolean {
  if (!keyword || !text) return false;
  const pattern = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i');
  return pattern.test(text);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class JourneyTemplateRegistry {
  private readonly templates = new Map<string, JourneyTemplate>();

  constructor(initialTemplates: JourneyTemplate[] = []) {
    for (const template of initialTemplates) {
      this.templates.set(template.id, template);
    }
    for (const template of Object.values(defaultTemplates)) {
      if (!this.templates.has(template.id)) {
        this.templates.set(template.id, template);
      }
    }
  }

  list(): JourneyTemplate[] {
    return Array.from(this.templates.values());
  }

  getByBusinessType(businessType: BusinessType): JourneyTemplate | undefined {
    return Array.from(this.templates.values()).find((template) => template.businessType === businessType && template.enabled);
  }

  getById(id: string): JourneyTemplate | undefined {
    return this.templates.get(id);
  }

  save(template: JourneyTemplate): JourneyTemplate {
    this.templates.set(template.id, template);
    return template;
  }

  update(id: string, updates: Partial<JourneyTemplate>): JourneyTemplate | undefined {
    const existing = this.templates.get(id);
    if (!existing) return undefined;
    const next = { ...existing, ...updates };
    this.templates.set(id, next);
    return next;
  }

  setEnabled(id: string, enabled: boolean): JourneyTemplate | undefined {
    const existing = this.templates.get(id);
    if (!existing) return undefined;
    const next = { ...existing, enabled };
    this.templates.set(id, next);
    return next;
  }
}
