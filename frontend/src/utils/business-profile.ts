export interface BusinessIntelligenceSnapshot {
  businessName: string;
  industry: string;
  productsAndServices: string[];
  pricingModel: string;
  idealCustomer: string;
  trustSignals: string[];
  conversionOpportunities: string[];
  missingWebsiteContent: string[];
  intelligenceScore: number;
  conversionScore: number;
  trustScore: number;
  salesReadinessScore: number;
  recommendedNextAction: string;
  welcomeMessage: string;
  suggestedQuestions: string[];
}

interface KnowledgeSignals {
  hasFiles?: boolean;
  hasWebsites?: boolean;
  hasFaqs?: boolean;
  hasDocuments?: boolean;
  hasWidget?: boolean;
  hasConversations?: boolean;
}

function normalizeIndustry(value?: string): string {
  if (!value) return 'your market';
  const cleaned = value.trim();
  if (!cleaned) return 'your market';
  return cleaned.replace(/\s+/g, ' ');
}

function inferProductsAndServices(industry: string): string[] {
  const normalized = industry.toLowerCase();
  if (normalized.includes('saas') || normalized.includes('software') || normalized.includes('tech')) {
    return ['Product guidance', 'Implementation support'];
  }
  if (normalized.includes('ecom') || normalized.includes('retail') || normalized.includes('commerce')) {
    return ['Product discovery', 'Checkout support'];
  }
  if (normalized.includes('health') || normalized.includes('medical') || normalized.includes('care')) {
    return ['Patient support', 'Consultation guidance'];
  }
  if (normalized.includes('law') || normalized.includes('legal')) {
    return ['Case support', 'Consultation guidance'];
  }
  if (normalized.includes('rest') || normalized.includes('hotel') || normalized.includes('food')) {
    return ['Booking support', 'Service guidance'];
  }
  return ['Core offering', 'Support guidance'];
}

function inferPricingModel(industry: string, hasFaqs: boolean): string {
  const normalized = industry.toLowerCase();
  if (normalized.includes('saas') || normalized.includes('software') || normalized.includes('tech')) {
    return hasFaqs ? 'guided plan comparison' : 'tiered pricing';
  }
  if (normalized.includes('health') || normalized.includes('medical') || normalized.includes('care')) {
    return 'custom consultation quotes';
  }
  return hasFaqs ? 'guided offer selection' : 'custom quotes';
}

function inferTrustSignals(hasFiles: boolean, hasFaqs: boolean, hasWidget: boolean): string[] {
  const signals = ['website-grounded guidance'];
  if (hasFiles) signals.push('document-backed answers');
  if (hasFaqs) signals.push('FAQ-ready responses');
  if (hasWidget) signals.push('live website support');
  return signals;
}

function inferMissingContent(hasFiles: boolean, hasFaqs: boolean, hasWebsites: boolean): string[] {
  const missing: string[] = [];
  if (!hasFaqs) missing.push('FAQ content');
  if (!hasFiles) missing.push('pricing or offer details');
  if (!hasWebsites) missing.push('website proof points');
  return missing.length > 0 ? missing : ['social proof and testimonials'];
}

export function deriveBusinessIntelligenceSnapshot(params: {
  businessName?: string;
  industry?: string;
  knowledge?: { files?: Array<unknown>; websites?: string[]; faqs?: string; uploaded?: boolean; };
  widgetInstalled?: boolean;
  hasConversations?: boolean;
  totalDocs?: number;
  totalSessions?: number;
}): BusinessIntelligenceSnapshot {
  const businessName = params.businessName?.trim() || 'your business';
  const industry = normalizeIndustry(params.industry);
  const knowledge = params.knowledge || {};
  const hasFiles = Boolean(knowledge.files?.length || knowledge.uploaded);
  const hasFaqs = Boolean(knowledge.faqs?.trim());
  const hasWebsites = Boolean(knowledge.websites?.length);
  const hasWidget = Boolean(params.widgetInstalled);
  const hasConversations = Boolean(params.hasConversations || params.totalSessions);

  const productsAndServices = inferProductsAndServices(industry);
  const pricingModel = inferPricingModel(industry, hasFaqs);
  const trustSignals = inferTrustSignals(hasFiles, hasFaqs, hasWidget);
  const conversionOpportunities = [
    'Clarify pricing and plan options',
    'Surface a direct demo or contact CTA',
    'Make product comparison obvious',
  ];
  const missingWebsiteContent = inferMissingContent(hasFiles, hasFaqs, hasWebsites);

  const signalScore = [hasFiles ? 1 : 0, hasFaqs ? 1 : 0, hasWebsites ? 1 : 0, hasWidget ? 1 : 0, hasConversations ? 1 : 0].reduce((sum, value) => sum + value, 0);
  const intelligenceScore = Math.min(100, 45 + signalScore * 8);
  const conversionScore = Math.min(100, 50 + (hasWidget ? 15 : 0) + (hasConversations ? 10 : 0) + (hasFaqs ? 8 : 0));
  const trustScore = Math.min(100, 50 + (hasFiles ? 12 : 0) + (hasFaqs ? 10 : 0) + (hasWidget ? 8 : 0));
  const salesReadinessScore = Math.min(100, 40 + (hasWidget ? 15 : 0) + (hasFaqs ? 10 : 0) + (hasFiles ? 12 : 0) + (hasConversations ? 8 : 0));

  const serviceLabel = productsAndServices[0]?.toLowerCase() || 'service';
  const welcomeMessage = `Welcome to ${businessName} 👋 I can help you choose the right ${serviceLabel}, compare pricing, answer questions, or book a demo.`;

  const suggestedQuestions = [
    `View ${productsAndServices[0] || 'Products'}`,
    'Compare Plans',
    'Pricing',
    'Services',
    'Book Demo',
    'Contact Sales',
    'FAQs',
  ];

  return {
    businessName,
    industry,
    productsAndServices,
    pricingModel,
    idealCustomer: `Visitors evaluating ${industry.toLowerCase()} solutions`,
    trustSignals,
    conversionOpportunities,
    missingWebsiteContent,
    intelligenceScore,
    conversionScore,
    trustScore,
    salesReadinessScore,
    recommendedNextAction: hasWidget
      ? 'Turn this profile into a guided demo flow and keep the widget focused on pricing, services, and next-step CTAs.'
      : 'Install the widget and make the first message point visitors toward products, pricing, and demo booking.',
    welcomeMessage,
    suggestedQuestions,
  };
}
