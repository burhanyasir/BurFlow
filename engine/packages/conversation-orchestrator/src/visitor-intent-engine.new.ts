export type VisitorIntent =
  | 'Buying'
  | 'Pricing'
  | 'Product Research'
  | 'Support'
  | 'Comparison'
  | 'Booking'
  | 'Contact'
  | 'Careers'
  | 'General Information';

export interface VisitorIntentEngineInput {
  landingPage?: string;
  currentUrl?: string;
  referrer?: string;
  pageContent?: string;
  pageTitle?: string;
  pageHeadings?: string[];
  pageHtml?: string;
  navigationMenu?: string[];
  structuredData?: string[];
  metaTags?: {
    title?: string;
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
  };
  breadcrumbs?: string[];
  internalLinks?: string[];
  pageDepth?: number;
  anchorText?: string[];
  forms?: string[];
  contactInfo?: string[];
  calendarDetected?: boolean;
  checkoutDetected?: boolean;
  faqDetected?: boolean;
  userQuestion?: string;
  businessProfile?: {
    businessType?: string;
    industry?: string;
    products?: string[];
    services?: string[];
    policies?: string[];
    goals?: string[];
    brandTone?: string;
    supportedCTAs?: string[];
  };
  knowledgeEngineFacts?: string[];
}

export interface VisitorIntentResult {
  primaryIntent: VisitorIntent;
  secondaryIntent?: VisitorIntent;
  confidence: number;
  supportingEvidence: string[];
  recommendedNextAction: string;
  intentDistribution: Record<VisitorIntent, number>;
}

type IntentSignalMap = Record<VisitorIntent, number>;

type IntentPattern = { regex: RegExp; weight: number };

const intentPatterns: Record<VisitorIntent, IntentPattern[]> = {
  Buying: [
    { regex: /\bready to buy\b|\bbuy now\b|\bpurchase\b|\bsign up\b|\bstart free\b|\bstart trial\b|\bcheckout\b|\badd to cart\b|\bget started\b|\btake my money\b|\bbuy online\b|\breserve\b|\bbook now\b/i, weight: 5 },
    { regex: /\bquote request\b|\brequest a quote\b|\bcontact sales\b|\brequest demo\b/i, weight: 4 },
    { regex: /\border\b|\borders\b|\bcart\b|\bcheckout\b|\bstore\b|\bshop\b/i, weight: 2 },
  ],
  Pricing: [
    { regex: /\bpricing\b|\bprice\b|\bcost\b|\bhow much\b|\bmonthly\b|\bsubscription\b|\bquote\b|\bplan\b|\btier\b|\bstarting at\b|\brates?\b/i, weight: 4 },
    { regex: /\bplans?\b|\bpackages?\b|\benterprise\b|\bstarter\b|\bpro\b|\bfree\b/i, weight: 2 },
  ],
  'Product Research': [
    { regex: /\bwhat does\b|\bwhat are\b|\bfeatures\b|\bbenefits\b|\bcapabilities\b|\bplatform\b|\bsolution\b|\bsolutions\b|\bproduct\b|\bproducts\b|\bservice\b|\bservices\b|\bportfolio\b|\bcatalog\b|\bofferings\b|\bindustries\b|\bcase study\b|\bcase studies\b|\buse cases\b|\bcompare\b|\bintegrations?\b|\bspecifications?\b/i, weight: 4 },
    { regex: /\bmenu\b|\bshowcase\b|\bsolutions\b|\bindustries\b/i, weight: 2 },
  ],
  Support: [
    { regex: /\bsupport\b|\bhelp\b|\btroubleshooting\b|\bissue\b|\bproblem\b|\berror\b|\bfaq\b|\bdocs\b|\bdocumentation\b|\breturns\b|\brefund\b|\bshipping\b|\bstatus\b/i, weight: 4 },
    { regex: /\bcontact us\b|\bget help\b|\bcustomer service\b|\bassistant\b/i, weight: 2 },
  ],
  Comparison: [
    { regex: /\bcompare\b|\bcomparison\b|\bvs\b|\bversus\b|\bdifference\b|\bdifferent\b|\bbetter\b|\balternative\b|\bchoose between\b|\bpros and cons\b/i, weight: 4 },
    { regex: /\bwhich one\b|\bwhich plan\b|\bbest fit\b/i, weight: 2 },
  ],
  Booking: [
    { regex: /\bbook\b|\bschedule\b|\bdemo\b|\bappointment\b|\bmeeting\b|\bcall\b|\bconsultation\b|\bcalendar\b|\breservation\b/i, weight: 4 },
    { regex: /\bwalkthrough\b|\bintro call\b|\bdiscovery call\b/i, weight: 2 },
  ],
  Contact: [
    { regex: /\bcontact\b|\bcontact us\b|\breach out\b|\btalk to sales\b|\bget in touch\b|\bsomeone contact me\b|\bmessage us\b|\bcall us\b|\bcallback\b/i, weight: 4 },
    { regex: /\brequest info\b|\brequest callback\b/i, weight: 2 },
  ],
  Careers: [
    { regex: /\bcareers\b|\bjobs\b|\bhiring\b|\broles\b|\bopen roles\b|\bjoin our team\b|\bapply now\b|\bapply\b|\brecruiting\b/i, weight: 4 },
    { regex: /\bteam\b|\bengineer\b|\bdesigner\b|\bcustomer success\b/i, weight: 2 },
  ],
  'General Information': [
    { regex: /\bwhat is\b|\bwho is\b|\babout\b|\boverview\b|\blearn more\b|\bcompany overview\b|\bmission\b|\bour story\b|\bwho we are\b|\bhistory\b|\babout us\b/i, weight: 4 },
    { regex: /\bcompany\b|\binstitutions?\b|\borganization\b|\boverview\b/i, weight: 2 },
  ],
};

function normalizeText(value?: string | string[]): string {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(' ');
  }
  return String(value);
}

function getUrlPath(url?: string): string {
  try {
    return new URL(url || '').pathname.toLowerCase();
  } catch {
    return (url || '').toLowerCase();
  }
}

function countMatches(text: string, patterns: IntentPattern[]): number {
  return patterns.reduce((total, pattern) => total + (text.match(pattern.regex)?.length || 0) * pattern.weight, 0);
}

function getIntentScores(input: VisitorIntentEngineInput): IntentSignalMap {
  const scores: IntentSignalMap = {
    Buying: 0,
    Pricing: 0,
    'Product Research': 0,
    Support: 0,
    Comparison: 0,
    Booking: 0,
    Contact: 0,
    Careers: 0,
    'General Information': 0,
  };

  const textSources = [
    input.pageTitle,
    input.pageContent,
    input.currentUrl,
    input.landingPage,
    input.userQuestion,
    input.pageHtml,
    input.metaTags?.title,
    input.metaTags?.description,
    input.metaTags?.ogTitle,
    input.metaTags?.ogDescription,
    ...(input.pageHeadings || []),
    ...(input.navigationMenu || []),
    ...(input.breadcrumbs || []),
    ...(input.internalLinks || []),
    ...(input.anchorText || []),
    ...(input.forms || []),
    ...(input.contactInfo || []),
    ...(input.businessProfile?.products || []),
    ...(input.businessProfile?.services || []),
    ...(input.knowledgeEngineFacts || []),
    ...(input.structuredData || []),
  ];

  const combinedText = textSources.filter(Boolean).join(' ').toLowerCase();
  const pageText = normalizeText([input.pageTitle, input.pageContent, ...(input.pageHeadings || [])]).toLowerCase();
  const titleText = normalizeText(input.pageTitle).toLowerCase();
  const headingText = normalizeText(input.pageHeadings || []).toLowerCase();
  const ctaText = normalizeText([...(input.businessProfile?.supportedCTAs || []), ...(input.forms || []), ...(input.contactInfo || [])]).toLowerCase();
  const navText = normalizeText(input.navigationMenu || []).toLowerCase();
  const metaText = normalizeText([input.metaTags?.title, input.metaTags?.description, input.metaTags?.ogTitle, input.metaTags?.ogDescription]).toLowerCase();
  const schemaText = normalizeText(input.structuredData || []).toLowerCase();
  const breadcrumbText = normalizeText(input.breadcrumbs || []).toLowerCase();
  const linkText = normalizeText([...(input.internalLinks || []), ...(input.anchorText || [])]).toLowerCase();
  const knowledgeText = normalizeText(input.knowledgeEngineFacts || []).toLowerCase();
  const businessText = normalizeText([input.businessProfile?.businessType, input.businessProfile?.industry, input.businessProfile?.brandTone, ...(input.businessProfile?.goals || []), ...(input.businessProfile?.policies || [])]).toLowerCase();
  const path = getUrlPath(input.currentUrl || input.landingPage || '');

  const addFromSource = (intent: VisitorIntent, sourceText: string, weight: number) => {
    if (!sourceText) return;
    scores[intent] += countMatches(sourceText, intentPatterns[intent]) * weight;
  };

  (Object.keys(scores) as VisitorIntent[]).forEach(intent => {
    addFromSource(intent, combinedText, 0.8);
  });

  addFromSource('Buying', titleText, 1.2);
  addFromSource('Pricing', titleText, 1.1);
  addFromSource('Product Research', titleText, 1.0);
  addFromSource('Support', titleText, 1.0);
  addFromSource('Booking', titleText, 1.0);
  addFromSource('Contact', titleText, 1.0);
  addFromSource('Careers', titleText, 1.0);
  addFromSource('General Information', titleText, 0.9);

  addFromSource('Buying', headingText, 1.1);
  addFromSource('Pricing', headingText, 1.1);
  addFromSource('Product Research', headingText, 1.1);
  addFromSource('Support', headingText, 1.0);
  addFromSource('Booking', headingText, 1.1);
  addFromSource('Contact', headingText, 1.0);
  addFromSource('Careers', headingText, 1.0);
  addFromSource('General Information', headingText, 0.9);

  addFromSource('Buying', ctaText, 1.7);
  addFromSource('Pricing', ctaText, 1.4);
  addFromSource('Support', ctaText, 1.2);
  addFromSource('Booking', ctaText, 1.7);
  addFromSource('Contact', ctaText, 1.5);
  addFromSource('Careers', ctaText, 1.3);
  addFromSource('Product Research', ctaText, 1.2);
  addFromSource('General Information', ctaText, 0.8);

  addFromSource('Buying', navText, 0.7);
  addFromSource('Pricing', navText, 0.7);
  addFromSource('Support', navText, 0.6);
  addFromSource('Booking', navText, 0.5);
  addFromSource('Contact', navText, 0.6);
  addFromSource('Careers', navText, 0.7);
  addFromSource('Product Research', navText, 0.8);
  addFromSource('General Information', navText, 0.7);

  addFromSource('Buying', metaText, 0.7);
  addFromSource('Pricing', metaText, 0.8);
  addFromSource('Support', metaText, 0.6);
  addFromSource('Booking', metaText, 0.6);
  addFromSource('Contact', metaText, 0.6);
  addFromSource('Product Research', metaText, 0.8);
  addFromSource('General Information', metaText, 0.7);

  addFromSource('Buying', schemaText, 0.6);
  addFromSource('Pricing', schemaText, 0.7);
  addFromSource('Product Research', schemaText, 0.8);
  addFromSource('Support', schemaText, 0.7);
  addFromSource('Booking', schemaText, 0.6);
  addFromSource('Contact', schemaText, 0.6);
  addFromSource('General Information', schemaText, 0.6);

  addFromSource('Buying', breadcrumbText, 0.5);
  addFromSource('Pricing', breadcrumbText, 0.5);
  addFromSource('Support', breadcrumbText, 0.5);
  addFromSource('Booking', breadcrumbText, 0.4);
  addFromSource('Contact', breadcrumbText, 0.4);
  addFromSource('Product Research', breadcrumbText, 0.5);
  addFromSource('General Information', breadcrumbText, 0.4);

  addFromSource('Buying', linkText, 0.4);
  addFromSource('Pricing', linkText, 0.4);
  addFromSource('Support', linkText, 0.4);
  addFromSource('Booking', linkText, 0.4);
  addFromSource('Contact', linkText, 0.4);
  addFromSource('Product Research', linkText, 0.6);
  addFromSource('General Information', linkText, 0.4);

  addFromSource('Buying', knowledgeText, 1.0);
  addFromSource('Pricing', knowledgeText, 0.9);
  addFromSource('Support', knowledgeText, 0.9);
  addFromSource('Booking', knowledgeText, 0.8);
  addFromSource('Contact', knowledgeText, 0.8);
  addFromSource('Product Research', knowledgeText, 0.8);
  addFromSource('General Information', knowledgeText, 0.7);

  addFromSource('Buying', businessText, 0.9);
  addFromSource('Pricing', businessText, 0.8);
  addFromSource('Support', businessText, 0.7);
  addFromSource('Booking', businessText, 0.7);
  addFromSource('Contact', businessText, 0.7);
  addFromSource('Product Research', businessText, 0.8);
  addFromSource('General Information', businessText, 0.7);

  if (/\/pricing|\/plans|\/cost|\/quote|\/subscribe|\/tiers?|\/rates?/.test(path)) {
    scores.Pricing += 8;
  }
  if (/\/buy|\/purchase|\/checkout|\/cart|\/order|\/trial|\/signup|\/shop|\/reserve|\/book-now/.test(path)) {
    scores.Buying += 8;
  }
  if (/\/compare|\/comparison|\/vs|\/versus/.test(path)) {
    scores.Comparison += 8;
  }
  if (/\/support|\/help|\/faq|\/troubleshooting|\/docs|\/documentation|\/returns|\/refund|\/shipping/.test(path)) {
    scores.Support += 8;
  }
  if (/\/contact|\/contact-us|\/get-in-touch|\/reach-out/.test(path)) {
    scores.Contact += 8;
  }
  if (/\/demo|\/book|\/schedule|\/appointment|\/consultation|\/meeting|\/reservation/.test(path)) {
    scores.Booking += 8;
    scores.Buying += 2;
  }
  if (/\/careers|\/jobs|\/hiring|\/join-us|\/apply|\/open-roles/.test(path)) {
    scores.Careers += 8;
  }
  if (/\/about|\/company|\/who-we-are|\/our-story|\/mission|\/overview|\/learn-more|\/about-us/.test(path)) {
    scores['General Information'] += 7;
  }
  if (/\/products?|\/services?|\/solutions?|\/portfolio|\/industries|\/catalog|\/menu|\/offerings|\/case-studies?/.test(path)) {
    scores['Product Research'] += 7;
  }

  if (input.pageDepth && input.pageDepth > 2) {
    scores['General Information'] += 0.5;
  }

  if (input.checkoutDetected) {
    scores.Buying += 7;
  }
  if (input.calendarDetected) {
    scores.Booking += 7;
    scores.Buying += 1.5;
  }
  if (input.faqDetected) {
    scores.Support += 6;
  }

  const industry = (input.businessProfile?.industry || input.businessProfile?.businessType || '').toLowerCase();
  const pageSignals = `${pageText} ${path} ${ctaText}`.toLowerCase();

  if (industry.includes('healthcare') && /(appointment|consultation|visit|insurance|clinic|doctor|treatment|care)/i.test(pageSignals)) {
    scores.Buying += 4;
    scores.Booking += 2;
  }
  if ((industry.includes('saas') || industry.includes('software')) && /(demo|trial|contact sales|pricing|plan|subscription)/i.test(pageSignals)) {
    scores.Buying += 3;
    scores.Pricing += 2;
    scores.Booking += 1.5;
  }
  if (industry.includes('restaurant') && /(reservation|table|book|order|delivery|menu)/i.test(pageSignals)) {
    scores.Buying += 3;
    scores.Booking += 2;
  }
  if ((industry.includes('education') || industry.includes('university')) && /(admissions|apply|program|degree|enrollment|campus|student)/i.test(pageSignals)) {
    scores['Product Research'] += 3;
    scores['General Information'] += 1.5;
  }
  if (industry.includes('government') || industry.includes('nonprofit')) {
    scores['General Information'] += 1.5;
  }

  return scores;
}

function normalizeScores(scores: IntentSignalMap): Record<VisitorIntent, number> {
  const total = Object.values(scores).reduce((sum, value) => sum + Math.max(0, value), 0);
  const distribution = Object.fromEntries((Object.entries(scores) as Array<[VisitorIntent, number]>).map(([intent, value]) => [intent, total > 0 ? Math.max(0, value / total) : 0])) as Record<VisitorIntent, number>;
  const entries = Object.entries(distribution) as Array<[VisitorIntent, number]>;
  const sum = entries.reduce((acc, [, value]) => acc + value, 0);
  if (sum > 0) {
    entries.forEach(([intent, value]) => {
      distribution[intent] = value / sum;
    });
  }
  return distribution;
}

function buildEvidence(input: VisitorIntentEngineInput, scores: IntentSignalMap): string[] {
  const evidence: string[] = [];
  const path = getUrlPath(input.currentUrl || input.landingPage || '');
  const hasBuyingSignals = scores.Buying >= 3;
  const hasPricingSignals = scores.Pricing >= 3;
  const hasSupportSignals = scores.Support >= 3;
  const hasBookingSignals = scores.Booking >= 3;
  const hasContactSignals = scores.Contact >= 3;
  const hasCareerSignals = scores.Careers >= 3;
  const hasResearchSignals = scores['Product Research'] >= 3;
  const hasGeneralSignals = scores['General Information'] >= 3;

  if (path && /pricing|plans|quote|cost|subscribe/i.test(path)) {
    evidence.push(`URL path is pricing-centric: ${path}`);
  }
  if (path && /careers|jobs|apply|hiring/i.test(path)) {
    evidence.push(`URL path is career-oriented: ${path}`);
  }
  if (input.pageTitle) {
    evidence.push(`Title describes the page: ${input.pageTitle}`);
  }
  if (input.pageHeadings?.length) {
    evidence.push(`Headings include: ${input.pageHeadings.slice(0, 3).join(' | ')}`);
  }
  if (input.businessProfile?.supportedCTAs?.length) {
    evidence.push(`Business context includes CTAs: ${input.businessProfile.supportedCTAs.join(', ')}`);
  }
  if (input.knowledgeEngineFacts?.length) {
    evidence.push(`Knowledge Engine context: ${input.knowledgeEngineFacts.slice(0, 2).join(' | ')}`);
  }
  if (input.checkoutDetected || hasBuyingSignals) {
    evidence.push('Buying-oriented signals are present');
  }
  if (input.calendarDetected || hasBookingSignals) {
    evidence.push('Booking-oriented signals are present');
  }
  if (input.faqDetected || hasSupportSignals) {
    evidence.push('Support-oriented signals are present');
  }
  if (hasResearchSignals) {
    evidence.push('Product/service exploration signals are present');
  }
  if (hasGeneralSignals && !hasResearchSignals && !hasBuyingSignals && !hasPricingSignals && !hasBookingSignals && !hasContactSignals && !hasSupportSignals && !hasCareerSignals) {
    evidence.push('General-information signals are dominant');
  }

  if (evidence.length === 0) {
    evidence.push('Intent was inferred from the page context and business profile');
  }

  return evidence.slice(0, 5);
}

function recommendNextAction(primary: VisitorIntent): string {
  switch (primary) {
    case 'Buying':
      return 'Offer a direct booking, quote, or checkout path and capture a lightweight conversion signal.';
    case 'Pricing':
      return 'Present the relevant plan or pricing details and offer a comparison or demo CTA.';
    case 'Product Research':
      return 'Recommend the most relevant product details, use cases, and then offer a comparison or demo next step.';
    case 'Support':
      return 'Provide a support path, docs link, or escalation route.';
    case 'Comparison':
      return 'Compare the relevant plans or offerings and recommend the best fit.';
    case 'Booking':
      return 'Move to booking, calendar scheduling, or a direct sales appointment.';
    case 'Contact':
      return 'Offer contact capture or a direct sales follow-up path.';
    case 'Careers':
      return 'Route the visitor to the careers or recruiting path.';
    default:
      return 'Share a concise explanation and offer a relevant pricing or demo next step.';
  }
}

function calibrateConfidence(scores: IntentSignalMap, primary: VisitorIntent, distribution: Record<VisitorIntent, number>, input: VisitorIntentEngineInput): number {
  const sorted = (Object.entries(scores) as Array<[VisitorIntent, number]>).sort((a, b) => b[1] - a[1]);
  const primaryScore = scores[primary] || 0;
  const secondaryScore = sorted[1]?.[1] || 0;
  const margin = primaryScore - secondaryScore;
  const evidenceCount = sorted.filter(([, value]) => value >= 2.5).length;
  const agreement = distribution[primary] || 0;
  const businessSignal = input.businessProfile?.industry || input.businessProfile?.businessType ? 1 : 0.7;
  const ambiguityPenalty = margin < 1.5 ? 0.15 : 0;
  const strongSignals = primaryScore >= 9 || evidenceCount >= 3;
  const base = strongSignals ? 0.48 : 0.28;
  const calibrated = Math.min(0.99, Math.max(0.12, base + agreement * 0.3 + evidenceCount * 0.05 + businessSignal * 0.08 - ambiguityPenalty));
  return Number(calibrated.toFixed(2));
}

export function detectVisitorIntent(input: VisitorIntentEngineInput): VisitorIntentResult {
  const scores = getIntentScores(input);
  const distribution = normalizeScores(scores);
  const ranked = (Object.entries(distribution) as Array<[VisitorIntent, number]>).sort((a, b) => b[1] - a[1]);
  const primary = ranked[0][0];
  const secondary = ranked[1] && ranked[1][1] >= 0.16 ? ranked[1][0] : undefined;
  const confidence = calibrateConfidence(scores, primary, distribution, input);
  const evidence = buildEvidence(input, scores);

  return {
    primaryIntent: primary,
    secondaryIntent: secondary,
    confidence,
    supportingEvidence: evidence,
    recommendedNextAction: recommendNextAction(primary),
    intentDistribution: distribution,
  };
}
