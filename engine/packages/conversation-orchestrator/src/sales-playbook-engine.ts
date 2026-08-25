export interface VisitorIntentLike {
  primaryIntent: string;
  confidence?: number;
  supportingEvidence?: string[];
  recommendedNextAction?: string;
}

export interface BusinessIntelligenceLike {
  industry?: string;
  businessType?: string;
  pricingModel?: string;
  trustSignals?: string[];
  products?: string[];
  services?: string[];
  contactDetails?: string[];
}

export interface WebsiteScannerLike {
  pageType?: string;
  pageSummary?: string;
  extractedSignals?: string[];
}

export type SalesNextStep =
  | 'ask_qualification'
  | 'recommend_trial'
  | 'schedule_demo'
  | 'contact_sales'
  | 'review_pricing'
  | 'continue_education'
  | 'follow_up'
  | 'none';

export type ConversationReadinessStage = 'Awareness' | 'Education' | 'Qualification' | 'Pricing' | 'Sales';

export interface ConversationReadiness {
  stage: ConversationReadinessStage;
  awarenessReady: boolean;
  educationReady: boolean;
  qualificationReady: boolean;
  pricingReady: boolean;
  salesReady: boolean;
}

export interface KnowledgeEngineLike {
  facts?: string[];
}

export interface SalesPlaybookInput {
  visitorIntent: VisitorIntentLike;
  businessIntelligence: BusinessIntelligenceLike;
  websiteScanner: WebsiteScannerLike;
  knowledgeEngine: KnowledgeEngineLike;
  conversationStage?: string;
  planGoal?: string;
}

export interface SalesPlaybookStrategy {
  pricingStrategy: 'answer_directly' | 'summarize_pricing' | 'recommend_plan' | 'encourage_demo' | 'request_contact';
  cta: {
    id: string;
    label: string;
    action: string;
    payload: string;
    variant: 'primary' | 'secondary';
  };
  nextStep: SalesNextStep;
  readiness: ConversationReadiness;
  trustSignals: string[];
  recommendationStrategy: 'recommend_immediately' | 'ask_qualifying_question' | 'compare_options' | 'explain_differences';
  industryTemplate: string;
  rationale: string[];
}

function normalize(value?: string): string {
  return (value || '').toLowerCase();
}



function pickIndustryTemplate(industry?: string): string {
  const normalized = normalize(industry);
  if (normalized.includes('saas') || normalized.includes('software')) return 'SaaS';
  if (normalized.includes('ecommerce') || normalized.includes('retail') || normalized.includes('shop')) return 'E-commerce';
  if (normalized.includes('healthcare') || normalized.includes('medical')) return 'Healthcare';
  if (normalized.includes('agency') || normalized.includes('marketing') || normalized.includes('creative')) return 'Agencies';
  if (normalized.includes('restaurant') || normalized.includes('food') || normalized.includes('hospitality')) return 'Restaurants';
  if (normalized.includes('real estate') || normalized.includes('property')) return 'Real Estate';
  if (normalized.includes('manufacturing') || normalized.includes('industrial')) return 'Manufacturing';
  if (normalized.includes('professional') || normalized.includes('services') || normalized.includes('consulting')) return 'Professional services';
  if (normalized.includes('finance') || normalized.includes('banking') || normalized.includes('financial')) return 'Finance';
  if (normalized.includes('insurance')) return 'Insurance';
  if (normalized.includes('travel') || normalized.includes('hospitality')) return 'Travel';
  return 'SaaS';
}

type SalesPlaybookPricingSignals = {
  pricingInterest: boolean;
  comparisonInterest: boolean;
  buyingIntent: boolean;
  bookingIntent: boolean;
  supportIntent: boolean;
  researchIntent: boolean;
  hasPricingInfo: boolean;
  hasDemoPath: boolean;
  pageTypePricing: boolean;
  atDecisionStage: boolean;
  atConsideration: boolean;
  atAwareness: boolean;
  isQualificationGoal: boolean;
};

type SalesPlaybookActionDecision = {
  pricingStrategy: SalesPlaybookStrategy['pricingStrategy'];
  cta: SalesPlaybookStrategy['cta'];
  recommendationStrategy: SalesPlaybookStrategy['recommendationStrategy'];
  nextStep: SalesNextStep;
  rationale: string[];
};

function extractSalesPlaybookSignals(input: SalesPlaybookInput, intent: string): SalesPlaybookPricingSignals {
  const pageSignals = input.websiteScanner.extractedSignals || [];
  const pageSummary = `${input.websiteScanner.pageSummary || ''} ${pageSignals.join(' ')}`;

  return {
    pricingInterest: intent.includes('pricing'),
    comparisonInterest: intent.includes('comparison'),
    buyingIntent: intent.includes('buy'),
    bookingIntent: intent.includes('booking'),
    supportIntent: intent.includes('support'),
    researchIntent: intent.includes('research') || intent.includes('general') || intent.includes('product research'),
    hasPricingInfo: /pricing|price|plan|tier|cost|quote/.test(`${pageSummary} ${input.businessIntelligence.pricingModel || ''}`),
    hasDemoPath: /demo|book|schedule|contact|request/.test(pageSummary),
    pageTypePricing: normalize(input.websiteScanner.pageType).includes('pricing'),
    atDecisionStage: normalize(input.conversationStage).includes('decision'),
    atConsideration: normalize(input.conversationStage).includes('consideration'),
    atAwareness: normalize(input.conversationStage).includes('awareness'),
    isQualificationGoal: input.planGoal === 'qualify',
  };
}

function evaluatePricingReviewEligibility(input: SalesPlaybookInput, signals: SalesPlaybookPricingSignals): boolean {
  return isPricingReady(input, {
    hasPricingInfo: signals.hasPricingInfo,
    pageTypePricing: signals.pageTypePricing,
    isPricingIntent: signals.pricingInterest,
    isComparisonIntent: signals.comparisonInterest,
    atDecisionStage: signals.atDecisionStage,
    isBuyingIntent: signals.buyingIntent,
  });
}

function classifyFunnelStage(
  signals: SalesPlaybookPricingSignals,
  pricingReviewEligible: boolean,
  qualificationNeeded: boolean,
): ConversationReadinessStage {
  const readinessDefinitions = [
    {
      level: 'Awareness' as const,
      predicates: [
        (f: SalesPlaybookPricingSignals) => f.atAwareness,
        (f: SalesPlaybookPricingSignals) => f.researchIntent,
        (f: SalesPlaybookPricingSignals) => !f.hasPricingInfo && !f.hasDemoPath,
        (f: SalesPlaybookPricingSignals) => !f.pricingInterest && !f.comparisonInterest,
      ],
    },
    {
      level: 'Education' as const,
      predicates: [
        (f: SalesPlaybookPricingSignals) => f.atConsideration,
        (f: SalesPlaybookPricingSignals) => f.hasDemoPath,
        (f: SalesPlaybookPricingSignals) => f.supportIntent,
        (f: SalesPlaybookPricingSignals) => f.researchIntent && !f.atAwareness,
      ],
    },
    {
      level: 'Qualification' as const,
      predicates: [
        (f: SalesPlaybookPricingSignals) => f.isQualificationGoal,
        (f: SalesPlaybookPricingSignals) => qualificationNeeded && (f.pricingInterest || f.comparisonInterest || f.buyingIntent || f.atDecisionStage),
      ],
    },
    {
      level: 'Pricing' as const,
      predicates: [
        (f: SalesPlaybookPricingSignals) =>
          pricingReviewEligible &&
          (f.pricingInterest || f.comparisonInterest || f.hasPricingInfo || f.atDecisionStage || f.bookingIntent),
      ],
    },
    {
      level: 'Sales' as const,
      predicates: [
        (f: SalesPlaybookPricingSignals) => f.bookingIntent,
        (f: SalesPlaybookPricingSignals) => f.atDecisionStage && f.buyingIntent,
        (f: SalesPlaybookPricingSignals) => f.comparisonInterest && f.atDecisionStage,
      ],
    },
  ];

  const readinessScores = readinessDefinitions.map(({ level, predicates }) => ({
    level,
    score: predicates.reduce((sum, predicate) => sum + (predicate(signals) ? 1 : 0), 0),
  }));

  const priority: Record<ConversationReadinessStage, number> = {
    Awareness: 1,
    Education: 2,
    Qualification: 3,
    Pricing: 4,
    Sales: 5,
  };

  return readinessScores.reduce((current, next) => {
    if (next.score > current.score) return next;
    if (next.score === current.score && priority[next.level] > priority[current.level]) return next;
    return current;
  }, readinessScores[0]).level;
}

function buildReadiness(stage: ConversationReadinessStage): ConversationReadiness {
  return {
    stage,
    awarenessReady: true,
    educationReady: stage !== 'Awareness',
    qualificationReady: stage === 'Qualification' || stage === 'Pricing' || stage === 'Sales',
    pricingReady: stage === 'Pricing' || stage === 'Sales',
    salesReady: stage === 'Sales',
  };
}

function decideAction(
  planGoal: string | undefined,
  signals: SalesPlaybookPricingSignals,
  pricingReviewEligible: boolean,
  readiness: ConversationReadiness,
  qualificationNeeded: boolean,
  contactSalesPreferred: boolean,
  industryTemplate: string,
): SalesPlaybookActionDecision {
  let pricingStrategy: SalesPlaybookStrategy['pricingStrategy'] = 'answer_directly';
  let cta: SalesPlaybookStrategy['cta'] = {
    id: 'book-demo',
    label: 'Book Demo',
    action: 'send_text',
    payload: 'I want to book a demo',
    variant: 'primary',
  };
  let recommendationStrategy: SalesPlaybookStrategy['recommendationStrategy'] = 'recommend_immediately';
  let rationale: string[] = [];
  let nextStep: SalesNextStep = 'continue_education';

  if (planGoal === 'schedule_demo') {
    nextStep = 'schedule_demo';
    pricingStrategy = 'encourage_demo';
    cta = {
      id: 'book-demo',
      label: 'Book Demo',
      action: 'send_text',
      payload: 'I want to book a demo',
      variant: 'primary',
    };
    recommendationStrategy = 'recommend_immediately';
    rationale = ['The plan goal is demo scheduling, so the playbook moves the conversation directly toward booking.'];
  } else if (planGoal === 'close_trial') {
    nextStep = 'recommend_trial';
    pricingStrategy = 'recommend_plan';
    cta = {
      id: 'start-free-trial',
      label: 'Start Free Trial',
      action: 'send_text',
      payload: 'Start a free trial',
      variant: 'primary',
    };
    recommendationStrategy = 'recommend_immediately';
    rationale = ['The plan goal is to close a trial, so the playbook prioritizes a trial recommendation.'];
  } else if (planGoal === 'qualify') {
    nextStep = 'ask_qualification';
    pricingStrategy = 'request_contact';
    cta = {
      id: 'contact-sales',
      label: 'Contact Sales',
      action: 'send_text',
      payload: 'Connect me with sales',
      variant: 'primary',
    };
    recommendationStrategy = 'ask_qualifying_question';
    rationale = ['The plan goal is qualification, so the playbook focuses on asking the right questions first.'];
  } else if (contactSalesPreferred && signals.atDecisionStage && !signals.pricingInterest && !signals.comparisonInterest && !signals.bookingIntent) {
    nextStep = 'contact_sales';
    pricingStrategy = 'request_contact';
    cta = {
      id: 'contact-sales',
      label: 'Contact Sales',
      action: 'send_text',
      payload: 'Connect me with sales',
      variant: 'primary',
    };
    recommendationStrategy = 'ask_qualifying_question';
    rationale = ['A consultative decision-stage profile is best served by direct contact before moving into pricing.'];
  } else {
    switch (readiness.stage) {
      case 'Awareness':
        nextStep = 'continue_education';
        pricingStrategy = signals.hasPricingInfo ? 'summarize_pricing' : 'answer_directly';
        recommendationStrategy = 'explain_differences';
        cta = contactSalesPreferred
          ? {
              id: 'contact-sales',
              label: 'Contact Sales',
              action: 'send_text',
              payload: 'Connect me with sales',
              variant: 'primary',
            }
          : signals.hasDemoPath
          ? {
              id: 'book-demo',
              label: 'Book Demo',
              action: 'send_text',
              payload: 'I want to book a demo',
              variant: 'primary',
            }
          : {
              id: 'start-free-trial',
              label: 'Start Free Trial',
              action: 'send_text',
              payload: 'Start a free trial',
              variant: 'primary',
            };
        rationale = ['The conversation is still in awareness, so the playbook keeps the experience educational and low pressure.'];
        break;
      case 'Education':
        nextStep = 'continue_education';
        pricingStrategy = signals.hasPricingInfo ? 'summarize_pricing' : 'answer_directly';
        recommendationStrategy = 'explain_differences';
        cta = contactSalesPreferred
          ? {
              id: 'contact-sales',
              label: 'Contact Sales',
              action: 'send_text',
              payload: 'Connect me with sales',
              variant: 'primary',
            }
          : signals.hasDemoPath
          ? {
              id: 'book-demo',
              label: 'Book Demo',
              action: 'send_text',
              payload: 'I want to book a demo',
              variant: 'primary',
            }
          : {
              id: 'start-free-trial',
              label: 'Start Free Trial',
              action: 'send_text',
              payload: 'Start a free trial',
              variant: 'primary',
            };
        rationale = ['The user is ready to learn more, so the playbook extends the educational experience before pricing.'];
        break;
      case 'Qualification':
        nextStep = 'ask_qualification';
        pricingStrategy = 'request_contact';
        recommendationStrategy = 'ask_qualifying_question';
        cta = {
          id: 'contact-sales',
          label: 'Contact Sales',
          action: 'send_text',
          payload: 'Connect me with sales',
          variant: 'primary',
        };
        rationale = ['The user is ready for qualification, so the playbook keeps the conversation focused on gathering details.'];
        break;
      case 'Pricing':
        const explicitPricingContext = signals.pageTypePricing && (signals.pricingInterest || signals.comparisonInterest || signals.hasPricingInfo);
        if (qualificationNeeded && !explicitPricingContext && !pricingReviewEligible) {
          nextStep = 'ask_qualification';
          pricingStrategy = 'request_contact';
          recommendationStrategy = 'ask_qualifying_question';
          cta = {
            id: 'contact-sales',
            label: 'Contact Sales',
            action: 'send_text',
            payload: 'Connect me with sales',
            variant: 'primary',
          };
          rationale = ['Qualification information is incomplete, so the playbook asks the right questions before pricing.'];
        } else if (!pricingReviewEligible) {
          nextStep = 'continue_education';
          pricingStrategy = 'summarize_pricing';
          recommendationStrategy = 'explain_differences';
          cta = contactSalesPreferred
            ? {
                id: 'contact-sales',
                label: 'Contact Sales',
                action: 'send_text',
                payload: 'Connect me with sales',
                variant: 'primary',
              }
            : {
                id: 'start-free-trial',
                label: 'Start Free Trial',
                action: 'send_text',
                payload: 'Start a free trial',
                variant: 'primary',
              };
          rationale = ['Pricing readiness is insufficient, so the playbook preserves an educational path instead of pushing a pricing review.'];
        } else {
          pricingStrategy = signals.hasPricingInfo || signals.pricingInterest || signals.comparisonInterest ? 'recommend_plan' : 'summarize_pricing';
          nextStep = 'review_pricing';
          recommendationStrategy = 'compare_options';
          cta = {
            id: 'compare-plans',
            label: 'Compare Plans',
            action: 'send_text',
            payload: 'Compare plans and pricing',
            variant: 'primary',
          };
          rationale = ['The conversation has met the pricing gate, so the playbook advances to pricing review.'];
        }
        break;
      case 'Sales':
        nextStep = signals.bookingIntent ? 'schedule_demo' : 'contact_sales';
        pricingStrategy = signals.hasDemoPath ? 'encourage_demo' : 'request_contact';
        recommendationStrategy = 'recommend_immediately';
        cta = signals.hasDemoPath
          ? {
              id: 'book-demo',
              label: 'Book Demo',
              action: 'send_text',
              payload: 'I want to book a demo',
              variant: 'primary',
            }
          : {
              id: 'contact-sales',
              label: 'Contact Sales',
              action: 'send_text',
              payload: 'Connect me with sales',
              variant: 'primary',
            };
        rationale = ['The user is ready to engage with sales or a demo, so the playbook closes the loop toward a concrete next step.'];
        break;
      default:
        nextStep = 'continue_education';
        rationale = ['Defaulting to education until stronger readiness signals emerge.'];
    }
  }

  return { pricingStrategy, cta, recommendationStrategy, nextStep, rationale };
}

function extractTextSignals(input: SalesPlaybookInput): string {
  const summary = `${input.websiteScanner.pageSummary || ''} ${input.knowledgeEngine.facts?.join(' ') || ''}`;
  return summary.toLowerCase();
}

function hasBudgetSignal(input: SalesPlaybookInput): boolean {
  const summary = extractTextSignals(input);
  const pricingModel = (input.businessIntelligence.pricingModel || '').toLowerCase();
  return /\$\s*\d|budget|budgets?|budgeted|spend|price range|pricing range|estimate|estimated|investment|funding|budget plan/.test(`${summary} ${pricingModel}`);
}

function hasDecisionAuthoritySignal(input: SalesPlaybookInput): boolean {
  const summary = extractTextSignals(input);
  return /(decision maker|decision authority|approver|procurement|vendor evaluation|stakeholder|sponsor|executive approval|authority)/.test(summary);
}

function hasTimelineSignal(input: SalesPlaybookInput): boolean {
  const summary = extractTextSignals(input);
  return /(timeline|timeline|next quarter|quarter|month|weeks?|asap|soon|immediately|within 30 days|within 60 days|by .*\b)/.test(summary);
}

function hasProcurementSignal(input: SalesPlaybookInput): boolean {
  const summary = extractTextSignals(input);
  return /(procurement|vendor evaluation|request for proposal|rfp|vendor selection|vendor comparison|evaluation process)/.test(summary);
}

function hasPlanComparisonSignal(input: SalesPlaybookInput): boolean {
  const summary = extractTextSignals(input);
  return /(compare|vs|competitor|alternative|compare plans|comparison)/.test(summary);
}

function isPricingReady(input: SalesPlaybookInput, features: { hasPricingInfo: boolean; pageTypePricing: boolean; isPricingIntent: boolean; isComparisonIntent: boolean; atDecisionStage: boolean; isBuyingIntent: boolean; }): boolean {
  const strongFinancialContext = features.isPricingIntent || features.isComparisonIntent || features.pageTypePricing || features.hasPricingInfo;
  const supportiveEvidence = hasBudgetSignal(input) || hasProcurementSignal(input) || hasPlanComparisonSignal(input) || hasDecisionAuthoritySignal(input) || hasTimelineSignal(input);
  const purchaseMomentum = features.atDecisionStage || features.isBuyingIntent || features.isComparisonIntent || features.isPricingIntent || features.pageTypePricing;
  const explicitPricingSignal = features.pageTypePricing && (features.isPricingIntent || features.isComparisonIntent || features.hasPricingInfo);
  if (explicitPricingSignal && purchaseMomentum) {
    return true;
  }
  return strongFinancialContext && supportiveEvidence && purchaseMomentum;
}

export function buildSalesPlaybook(input: SalesPlaybookInput): SalesPlaybookStrategy {
  const intent = normalize(input.visitorIntent.primaryIntent);
  const signals = extractSalesPlaybookSignals(input, intent);
  const trustSignals = (input.businessIntelligence.trustSignals || []).filter(Boolean).slice(0, 4);
  const planGoal = input.planGoal;

  const pricingReviewEligible = evaluatePricingReviewEligibility(input, signals);

  const qualificationSignals = {
    budget: hasBudgetSignal(input),
    decisionAuthority: hasDecisionAuthoritySignal(input),
    timeline: hasTimelineSignal(input),
    planComparison: hasPlanComparisonSignal(input),
  };

  const qualSignalCount = [qualificationSignals.budget, qualificationSignals.decisionAuthority, qualificationSignals.timeline, qualificationSignals.planComparison].filter(Boolean).length;
  const qualificationNeeded = qualSignalCount < 2;
  const funnelStage = classifyFunnelStage(signals, pricingReviewEligible, qualificationNeeded);
  const readiness = buildReadiness(funnelStage);

  const industryTemplate = pickIndustryTemplate(input.businessIntelligence.industry);
  const consultativeIndustries = new Set(['Healthcare', 'Professional services', 'Real Estate', 'Manufacturing', 'Finance', 'Travel', 'Insurance', 'Agencies']);
  const consultativeScore = Number(consultativeIndustries.has(industryTemplate)) + Number(trustSignals.length >= 2) + Number(signals.atDecisionStage) + Number(signals.researchIntent);
  const contactSalesPreferred = consultativeScore >= 2;

  const { pricingStrategy, cta, recommendationStrategy, nextStep, rationale } = decideAction(
    planGoal,
    signals,
    pricingReviewEligible,
    readiness,
    qualificationNeeded,
    contactSalesPreferred,
    industryTemplate,
  );

  if (industryTemplate === 'Healthcare' && readiness.stage !== 'Pricing' && readiness.stage !== 'Sales') {
    return {
      pricingStrategy,
      cta: {
        id: 'contact-sales',
        label: 'Contact Sales',
        action: 'send_text',
        payload: 'Connect me with sales',
        variant: 'primary',
      },
      nextStep,
      readiness,
      trustSignals,
      recommendationStrategy,
      industryTemplate,
      rationale,
    };
  }

  const finalCta =
    industryTemplate === 'E-commerce' && signals.hasPricingInfo && readiness.stage === 'Pricing'
      ? {
          id: 'request-quote',
          label: 'Request Quote',
          action: 'send_text',
          payload: 'Request a quote',
          variant: 'primary',
        }
      : industryTemplate === 'Restaurants' && signals.hasDemoPath && readiness.stage === 'Sales'
      ? {
          id: 'book-demo',
          label: 'Book Demo',
          action: 'send_text',
          payload: 'I want to book a demo',
          variant: 'primary',
        }
      : cta;

  return {
    pricingStrategy,
    cta: finalCta,
    nextStep,
    readiness,
    trustSignals,
    recommendationStrategy,
    industryTemplate,
    rationale,
  };
}
