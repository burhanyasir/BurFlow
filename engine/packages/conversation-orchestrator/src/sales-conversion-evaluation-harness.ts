import { promises as fs } from 'node:fs';
import path from 'node:path';
import { buildSalesConversionSignals } from './sales-conversion-engine';
import buildCanonicalBenchmarkInputs from './benchmark-fixtures';
import { createMemory, ConversationMemoryData } from './conversation-memory';
import { ConversationIntelligenceResult } from './conversation-intelligence-types';
import { ConversationGoal, FunnelStageExtended } from './conversation-planner';

type VisitorIntentCategory = 'buying' | 'pricing' | 'booking' | 'research' | 'support' | 'comparison';

type BuyingStage = 'awareness' | 'consideration' | 'decision';

type ProductComplexity = 'simple' | 'moderate' | 'complex';

type ObjectionCategory = 'none' | 'price' | 'trust' | 'competitors' | 'timing' | 'authority';

interface SalesConversionBenchmarkCase {
  title: string;
  industry: string;
  message: string;
  persona: ConversationMemoryData['persona'];
  existingCustomer: boolean;
  companySize: string;
  budget: string;
  trustLevel: ConversationMemoryData['trustLevel'];
  leadScore: number;
  productComplexity: ProductComplexity;
  objectionCategory: ObjectionCategory;
  buyingStage: BuyingStage;
  visitorIntent: VisitorIntentCategory;
  plan: {
    goal: ConversationGoal;
    customerIntent: 'buying' | 'evaluating' | 'research' | 'support';
    funnelStage: FunnelStageExtended;
    missingQualification: string[];
  };
  ciOverrides?: Partial<ConversationIntelligenceResult>;
  expected: {
    recommendedPlan: string;
    nextStep: ReturnType<typeof buildSalesConversionSignals>['nextStep'];
    ctaId: string;
    crmBucket: 'cold' | 'warm' | 'hot';
    calendarBooking: boolean;
    qualificationTiming: boolean;
    objectionHandling: boolean;
    trustSignalsUsed: boolean;
  };
}

interface BenchmarkOutcome {
  title: string;
  industry: string;
  expected: SalesConversionBenchmarkCase['expected'];
  actual: {
    recommendedPlan: string;
    nextStep: string;
    ctaId: string;
    crmBucket: string;
    calendarBooking: boolean;
    qualificationTiming: boolean;
    objectionHandling: boolean;
    trustSignalsUsed: boolean;
  };
  correct: {
    recommendedPlan: boolean;
    nextStep: boolean;
    ctaId: boolean;
    crmBucket: boolean;
    calendarBooking: boolean;
    qualificationTiming: boolean;
    objectionHandling: boolean;
    trustSignalsUsed: boolean;
  };
  rootCauses: string[];
}

const benchmarkCases: SalesConversionBenchmarkCase[] = (() => {
  const visitorIntentToGoal: Record<VisitorIntentCategory, ConversationGoal> = {
    buying: 'close_trial',
    pricing: 'recommend_plan',
    booking: 'schedule_demo',
    research: 'advance_funnel',
    support: 'answer_question',
    comparison: 'advance_funnel',
  };

  const buyingStageToFunnel: Record<BuyingStage, FunnelStageExtended> = {
    awareness: 'awareness',
    consideration: 'consideration',
    decision: 'decision',
  };

  const companySizeOptions = ['10', '50', '250', '1200+'];
  const budgetOptions = ['$75', '$250', '$900', '$4200'];
  const existingCustomerOptions = [false, true] as const;

  const templates: Array<{
    industry: string;
    title: string;
    messageTemplate: string;
    persona: ConversationMemoryData['persona'];
    buyingStage: BuyingStage;
    visitorIntent: VisitorIntentCategory;
    productComplexity: ProductComplexity;
    objectionCategory: ObjectionCategory;
    trustLevel: ConversationMemoryData['trustLevel'];
  }> = [
    {
      industry: 'SaaS',
      title: 'SaaS pricing evaluation for startup',
      messageTemplate: 'We need a {budget} per month pricing option for {companySize} users with strong security certifications.',
      persona: 'startup',
      buyingStage: 'decision',
      visitorIntent: 'pricing',
      productComplexity: 'moderate',
      objectionCategory: 'none',
      trustLevel: 'high',
    },
    {
      industry: 'SaaS',
      title: 'SaaS demo scheduling for enterprise buyer',
      messageTemplate: 'Can we book a walkthrough to see how this integrates with our systems and team of {companySize}?',
      persona: 'enterprise',
      buyingStage: 'consideration',
      visitorIntent: 'booking',
      productComplexity: 'complex',
      objectionCategory: 'none',
      trustLevel: 'medium',
    },
    {
      industry: 'SaaS',
      title: 'SaaS competitive comparison inquiry',
      messageTemplate: 'How do you compare to the incumbent vendor and what is the true cost for {companySize} seats?',
      persona: 'enterprise',
      buyingStage: 'consideration',
      visitorIntent: 'comparison',
      productComplexity: 'complex',
      objectionCategory: 'competitors',
      trustLevel: 'medium',
    },
    {
      industry: 'SaaS',
      title: 'SaaS product research for API integration',
      messageTemplate: 'We are researching API integration capabilities for a {companySize}-person engineering team.',
      persona: 'developer',
      buyingStage: 'awareness',
      visitorIntent: 'research',
      productComplexity: 'complex',
      objectionCategory: 'none',
      trustLevel: 'medium',
    },
    {
      industry: 'E-commerce',
      title: 'E-commerce bulk order quote request',
      messageTemplate: 'I need a quote for bulk orders and pricing for our retail chain with {companySize} locations.',
      persona: 'small_business',
      buyingStage: 'decision',
      visitorIntent: 'pricing',
      productComplexity: 'simple',
      objectionCategory: 'none',
      trustLevel: 'medium',
    },
    {
      industry: 'E-commerce',
      title: 'E-commerce integration support for existing merchant',
      messageTemplate: 'As an existing merchant, we want integration support and delivery timelines for our ecommerce platform.',
      persona: 'existing_customer',
      buyingStage: 'awareness',
      visitorIntent: 'support',
      productComplexity: 'moderate',
      objectionCategory: 'timing',
      trustLevel: 'high',
    },
    {
      industry: 'E-commerce',
      title: 'E-commerce competitor feature comparison',
      messageTemplate: 'How do your merchandising and checkout features compare to the competitor we are evaluating?',
      persona: 'small_business',
      buyingStage: 'consideration',
      visitorIntent: 'comparison',
      productComplexity: 'moderate',
      objectionCategory: 'competitors',
      trustLevel: 'medium',
    },
    {
      industry: 'Healthcare',
      title: 'Healthcare appointment booking request',
      messageTemplate: 'I need to schedule an appointment and review your patient intake workflow for our {companySize}-provider practice.',
      persona: 'support_manager',
      buyingStage: 'decision',
      visitorIntent: 'booking',
      productComplexity: 'complex',
      objectionCategory: 'none',
      trustLevel: 'high',
    },
    {
      industry: 'Healthcare',
      title: 'Healthcare pricing and compliance question',
      messageTemplate: 'What are the pricing options for telehealth and compliance support for a {companySize}-provider practice?',
      persona: 'enterprise',
      buyingStage: 'consideration',
      visitorIntent: 'pricing',
      productComplexity: 'complex',
      objectionCategory: 'trust',
      trustLevel: 'low',
    },
    {
      industry: 'Healthcare',
      title: 'Healthcare solution research for existing provider',
      messageTemplate: 'As an existing provider, we are researching advanced analytics and patient engagement tools.',
      persona: 'existing_customer',
      buyingStage: 'awareness',
      visitorIntent: 'research',
      productComplexity: 'complex',
      objectionCategory: 'none',
      trustLevel: 'high',
    },
    {
      industry: 'Manufacturing',
      title: 'Manufacturing industrial automation quotation',
      messageTemplate: 'We need a quote for factory automation equipment for a {companySize}-person operation with uptime guarantees.',
      persona: 'enterprise',
      buyingStage: 'decision',
      visitorIntent: 'pricing',
      productComplexity: 'complex',
      objectionCategory: 'none',
      trustLevel: 'medium',
    },
    {
      industry: 'Manufacturing',
      title: 'Manufacturing reliability research request',
      messageTemplate: 'We are researching long-term support and reliability for our factory automation tools.',
      persona: 'small_business',
      buyingStage: 'awareness',
      visitorIntent: 'research',
      productComplexity: 'complex',
      objectionCategory: 'none',
      trustLevel: 'medium',
    },
    {
      industry: 'Manufacturing',
      title: 'Manufacturing authority approval delay',
      messageTemplate: 'Our procurement committee needs more validation before we sign off on the solution.',
      persona: 'enterprise',
      buyingStage: 'decision',
      visitorIntent: 'buying',
      productComplexity: 'complex',
      objectionCategory: 'authority',
      trustLevel: 'medium',
    },
    {
      industry: 'Real Estate',
      title: 'Real estate commercial pricing inquiry',
      messageTemplate: 'We need pricing details for managing {companySize} commercial properties and agent commission structure.',
      persona: 'small_business',
      buyingStage: 'decision',
      visitorIntent: 'pricing',
      productComplexity: 'moderate',
      objectionCategory: 'price',
      trustLevel: 'medium',
    },
    {
      industry: 'Real Estate',
      title: 'Real estate tour booking request',
      messageTemplate: 'Can we book a tour and get details on your property management services?',
      persona: 'small_business',
      buyingStage: 'decision',
      visitorIntent: 'booking',
      productComplexity: 'simple',
      objectionCategory: 'none',
      trustLevel: 'medium',
    },
    {
      industry: 'Agencies',
      title: 'Agency proposal request for marketing services',
      messageTemplate: 'We need a proposal for marketing services covering strategy, creative, and analytics for our {companySize}-person team.',
      persona: 'agency',
      buyingStage: 'consideration',
      visitorIntent: 'pricing',
      productComplexity: 'moderate',
      objectionCategory: 'none',
      trustLevel: 'medium',
    },
    {
      industry: 'Agencies',
      title: 'Agency leadership approval objection',
      messageTemplate: 'Our leadership needs to approve the agency selection before we can move forward.',
      persona: 'agency',
      buyingStage: 'decision',
      visitorIntent: 'buying',
      productComplexity: 'moderate',
      objectionCategory: 'authority',
      trustLevel: 'medium',
    },
    {
      industry: 'Restaurants',
      title: 'Restaurant POS demo request',
      messageTemplate: 'Can we book a demo for your restaurant POS and inventory features?',
      persona: 'small_business',
      buyingStage: 'decision',
      visitorIntent: 'booking',
      productComplexity: 'moderate',
      objectionCategory: 'none',
      trustLevel: 'medium',
    },
    {
      industry: 'Restaurants',
      title: 'Restaurant pricing and timing concern',
      messageTemplate: 'The price and deployment timing are both concerns for our busy restaurant.',
      persona: 'small_business',
      buyingStage: 'decision',
      visitorIntent: 'buying',
      productComplexity: 'moderate',
      objectionCategory: 'timing',
      trustLevel: 'medium',
    },
    {
      industry: 'Education',
      title: 'Education admissions pricing and accreditation',
      messageTemplate: 'What are the tuition options and do you have accreditation proof for our program?',
      persona: 'startup',
      buyingStage: 'decision',
      visitorIntent: 'pricing',
      productComplexity: 'moderate',
      objectionCategory: 'trust',
      trustLevel: 'low',
    },
    {
      industry: 'Education',
      title: 'Education campus visit booking request',
      messageTemplate: 'Can we schedule a campus visit and speak with admissions?',
      persona: 'support_manager',
      buyingStage: 'consideration',
      visitorIntent: 'booking',
      productComplexity: 'simple',
      objectionCategory: 'none',
      trustLevel: 'medium',
    },
    {
      industry: 'Professional services',
      title: 'Professional services proposal request',
      messageTemplate: 'We need a proposal for advisory services for our {companySize}-person finance team.',
      persona: 'enterprise',
      buyingStage: 'consideration',
      visitorIntent: 'pricing',
      productComplexity: 'complex',
      objectionCategory: 'none',
      trustLevel: 'medium',
    },
    {
      industry: 'Professional services',
      title: 'Professional services competitor and trust concern',
      messageTemplate: 'Your proposal looks good, but we need to compare against the competitor and verify your certifications.',
      persona: 'enterprise',
      buyingStage: 'decision',
      visitorIntent: 'comparison',
      productComplexity: 'complex',
      objectionCategory: 'competitors',
      trustLevel: 'medium',
    },
  ];

  const cases: SalesConversionBenchmarkCase[] = [];

  const fillMessage = (template: string, values: Record<string, string>) =>
    template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');

  const chooseCtaFromIntent = (intent: VisitorIntentCategory, industry: string, goal: ConversationGoal, objection: ObjectionCategory) => {
    if (goal === 'schedule_demo' || intent === 'booking') return 'book-demo';
    if (intent === 'pricing') return industry === 'E-commerce' ? 'request-quote' : 'compare-plans';
    if (intent === 'comparison') return 'compare-plans';
    if (industry === 'Healthcare' || industry === 'Professional services') return 'contact-sales';
    if (intent === 'support') return 'start-free-trial';
    if (objection !== 'none') return 'contact-sales';
    return 'contact-sales';
  };

  const choosePlanRecommendation = (budget: string, companySize: string, existingCustomer: boolean, goal: ConversationGoal) => {
    const budgetValue = Number(budget.replace(/[^0-9]/g, ''));
    if (existingCustomer || goal === 'schedule_demo') return 'Enterprise';
    if (budgetValue >= 4200 || /1200\+/.test(companySize)) return 'Enterprise';
    if (budgetValue >= 900) return 'Professional';
    return 'Starter';
  };

  const chooseNextStep = (intent: VisitorIntentCategory, goal: ConversationGoal, objection: ObjectionCategory) => {
    if (goal === 'qualify') return 'ask_qualification';
    if (goal === 'schedule_demo') return 'schedule_demo';
    if (objection === 'price') return 'recommend_trial';
    if (intent === 'pricing') return 'review_pricing';
    if (intent === 'buying') return 'recommend_trial';
    if (intent === 'comparison') return 'review_pricing';
    return 'continue_education';
  };

  const shouldUseTrustSignals = (trustLevel: ConversationMemoryData['trustLevel'], objection: ObjectionCategory, complexity: ProductComplexity) =>
    trustLevel === 'high' || objection === 'trust' || complexity === 'complex';

  const shouldTriggerBooking = (message: string, goal: ConversationGoal) =>
    goal === 'schedule_demo' || /demo|book|schedule|walkthrough|appointment/.test(message.toLowerCase());

  const isExistingPersona = (existingCustomer: boolean, persona: ConversationMemoryData['persona']) =>
    existingCustomer ? 'existing_customer' : persona;

  const getPackCount = (companySize: string) =>
    companySize === '1200+' ? '1200+' : companySize;

  for (const template of templates) {
    for (const companySize of companySizeOptions) {
      for (const budget of budgetOptions) {
        for (const existingCustomer of existingCustomerOptions) {
          const leadScore = (() => {
            const base = template.buyingStage === 'awareness' ? 30 : template.buyingStage === 'consideration' ? 55 : 75;
            const bonus = existingCustomer ? 10 : 0;
            const objectionPenalty = template.objectionCategory === 'none' ? 0 : 10;
            const budgetBonus = Number(budget.replace(/[^0-9]/g, '')) >= 900 ? 10 : 0;
            return Math.min(95, Math.max(15, base + bonus - objectionPenalty + budgetBonus));
          })();

          const planGoal = visitorIntentToGoal[template.visitorIntent];
          const missingQualification = template.buyingStage === 'awareness' || template.objectionCategory !== 'none' ? ['budget'] : [];
          const plan = {
            goal: planGoal,
            customerIntent: template.visitorIntent === 'buying' ? 'buying' : template.visitorIntent === 'support' ? 'support' : 'evaluating',
            funnelStage: buyingStageToFunnel[template.buyingStage],
            missingQualification,
          } as const;

          const expected = {
            recommendedPlan: choosePlanRecommendation(budget, companySize, existingCustomer, planGoal),
            nextStep: chooseNextStep(template.visitorIntent, planGoal, template.objectionCategory),
            ctaId: chooseCtaFromIntent(template.visitorIntent, template.industry, planGoal, template.objectionCategory),
            crmBucket: leadScore >= 75 ? 'hot' : leadScore >= 40 ? 'warm' : 'cold',
            calendarBooking: shouldTriggerBooking(fillMessage(template.messageTemplate, { companySize, budget }), planGoal),
            qualificationTiming: missingQualification.length > 0,
            objectionHandling: template.objectionCategory !== 'none',
            trustSignalsUsed: shouldUseTrustSignals(template.trustLevel, template.objectionCategory, template.productComplexity),
          } as const;

          cases.push({
            title: `${template.title} — ${companySize} staff, ${budget}, ${existingCustomer ? 'existing' : 'new'} customer, ${template.objectionCategory} objection`,
            industry: template.industry,
            message: fillMessage(template.messageTemplate, { companySize, budget }),
            persona: isExistingPersona(existingCustomer, template.persona),
            existingCustomer,
            companySize,
            budget,
            trustLevel: template.trustLevel,
            leadScore,
            productComplexity: template.productComplexity,
            objectionCategory: template.objectionCategory,
            buyingStage: template.buyingStage,
            visitorIntent: template.visitorIntent,
            plan,
            ciOverrides: template.objectionCategory !== 'none' ? {
              objection: {
                isObjection: true,
                category: template.objectionCategory,
                groundedAnswer: `Addressing ${template.objectionCategory} concern.`,
                sources: [],
              },
            } : undefined,
            expected,
          });
        }
      }
    }
  }

  return cases;
})();

function createBaselineCIResult(overrides: Partial<ConversationIntelligenceResult> = {}): ConversationIntelligenceResult {
  return {
    responseText: '',
    leadScore: { overallScore: overrides.leadScore?.overallScore ?? 50 },
    conversationScore: { overallScore: overrides.conversationScore?.overallScore ?? 60 },
    sentiment: { polarity: 0.2, frustration: 'low', urgency: 'medium', trend: 'stable' },
    abandonmentRisk: { level: 'low', score: 15 },
    repetition: { hasRepetition: false, count: 0, topics: [] },
    escalation: { shouldEscalate: false, urgency: 'low' },
    routingDecision: { decision: 'assistant', confidence: 0.8, label: 'Handled by AI assistant' },
    trustSignal: { shouldInject: false },
    buyingIntent: { hasBuyingIntent: false, confidence: 0.5 },
    objection: overrides.objection ?? { isObjection: false, category: 'none', groundedAnswer: '', sources: [] },
    qualification: { questionsAskedCount: 0, completed: false },
    qualificationProgress: 0,
    persona: { persona: 'unknown', confidence: 0.5, reasoning: 'baseline' },
    funnelStage: 'awareness',
    cta: { primaryCTA: 'none', label: 'None', link: '' },
    quickReplies: [],
    uiState: { buttons: [], suggestedActions: [] },
    sources: [],
    isFallback: false,
    turnCount: 1,
    ...overrides,
  } as ConversationIntelligenceResult;
}

function createBenchmarkMemory(caseDef: SalesConversionBenchmarkCase): ConversationMemoryData {
  const memory = createMemory();
  Object.assign(memory, {
    persona: caseDef.persona,
    industry: caseDef.industry,
    companySize: caseDef.companySize,
    budget: caseDef.budget,
    trustLevel: caseDef.trustLevel,
    leadScore: caseDef.leadScore,
    buyingIntentDetected: caseDef.plan.customerIntent === 'buying',
    recommendedPlan: undefined,
    qualificationCollected: {
      questionsAskedCount: caseDef.plan.missingQualification.length ? 1 : 0,
      completed: caseDef.plan.missingQualification.length === 0,
    },
    turnCount: 3,
    funnelStage: caseDef.plan.funnelStage,
    currentStage: caseDef.plan.funnelStage === 'pricing' ? 'pricing' : 'education',
    contextSummary: { lastUpdatedAtTurn: 3, buyingIntent: caseDef.plan.customerIntent === 'buying' ? 'high' : 'medium', keyTopics: [], objections: [], missingQualification: caseDef.plan.missingQualification },
    contextSummaryTurn: 3,
  });

  return memory;
}

function evaluateBenchmarkCase(caseDef: SalesConversionBenchmarkCase): BenchmarkOutcome {
  // build canonical inputs using shared fixture builder
  const { memory, ciResult, plan: canonicalPlan } = buildCanonicalBenchmarkInputs(caseDef);
  // prefer plan from caseDef when present
  const planToUse = caseDef.plan ?? canonicalPlan;

  const result = buildSalesConversionSignals({
    message: caseDef.message,
    memory,
    ciResult,
    plan: planToUse,
  });

  const actual = {
    recommendedPlan: result.recommendedPlan,
    nextStep: result.nextStep,
    ctaId: result.playbook.cta.id,
    crmBucket: result.analytics.bucket,
    calendarBooking: Boolean(result.calendarBooking),
    qualificationTiming: result.nextStep === 'ask_qualification',
    objectionHandling: result.analytics.objectionRisk >= 40,
    trustSignalsUsed: result.playbook.trustSignals.length > 0,
  };

  const correct = {
    recommendedPlan: actual.recommendedPlan === caseDef.expected.recommendedPlan,
    nextStep: actual.nextStep === caseDef.expected.nextStep,
    ctaId: actual.ctaId === caseDef.expected.ctaId,
    crmBucket: actual.crmBucket === caseDef.expected.crmBucket,
    calendarBooking: actual.calendarBooking === caseDef.expected.calendarBooking,
    qualificationTiming: actual.qualificationTiming === caseDef.expected.qualificationTiming,
    objectionHandling: actual.objectionHandling === caseDef.expected.objectionHandling,
    trustSignalsUsed: actual.trustSignalsUsed === caseDef.expected.trustSignalsUsed,
  };

  const rootCauses: string[] = [];
  if (!correct.recommendedPlan) {
    rootCauses.push(`Plan mismatch: expected ${caseDef.expected.recommendedPlan} but got ${actual.recommendedPlan}`);
  }
  if (!correct.nextStep) {
    rootCauses.push(`Next step mismatch: expected ${caseDef.expected.nextStep} but got ${actual.nextStep}`);
  }
  if (!correct.ctaId) {
    rootCauses.push(`CTA mismatch: expected ${caseDef.expected.ctaId} but got ${actual.ctaId}`);
  }
  if (!correct.crmBucket) {
    rootCauses.push(`CRM bucket mismatch: expected ${caseDef.expected.crmBucket} but got ${actual.crmBucket}`);
  }
  if (!correct.calendarBooking) {
    rootCauses.push(`Booking timing mismatch: expected ${caseDef.expected.calendarBooking ? 'trigger' : 'no trigger'} but got ${actual.calendarBooking ? 'trigger' : 'none'}`);
  }
  if (!correct.qualificationTiming) {
    rootCauses.push(`Qualification timing mismatch: expected ${caseDef.expected.qualificationTiming ? 'ask_qualification' : 'no qualification prompt'} but got ${actual.qualificationTiming ? 'ask_qualification' : 'none'}`);
  }
  if (!correct.objectionHandling) {
    rootCauses.push(`Objection handling mismatch: expected ${caseDef.expected.objectionHandling ? 'detected' : 'not detected'} but got ${actual.objectionHandling ? 'detected' : 'not detected'}`);
  }
  if (!correct.trustSignalsUsed) {
    rootCauses.push(`Trust signal usage mismatch: expected ${caseDef.expected.trustSignalsUsed ? 'used' : 'not used'} but got ${actual.trustSignalsUsed ? 'used' : 'not used'}`);
  }

  return {
    title: caseDef.title,
    industry: caseDef.industry,
    expected: caseDef.expected,
    actual,
    correct,
    rootCauses,
  };
}

function safeLabels<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function computeMetrics(outcomes: BenchmarkOutcome[]) {
  const industries = Array.from(new Set(outcomes.map((item) => item.industry)));
  const allPlanned = safeLabels(outcomes.map((outcome) => outcome.actual.recommendedPlan as string));
  const allSteps = safeLabels(outcomes.map((outcome) => outcome.actual.nextStep));
  const allCTAs = safeLabels(outcomes.map((outcome) => outcome.actual.ctaId));
  const allBuckets = ['cold', 'warm', 'hot'] as const;

  const confusionMatrix = {
    recommendedPlan: createConfusionMatrix(allPlanned),
    nextStep: createConfusionMatrix(allSteps),
    ctaId: createConfusionMatrix(allCTAs),
    crmBucket: createConfusionMatrix(allBuckets),
  };

  const aspectTotals = {
    recommendedPlan: 0,
    nextStep: 0,
    ctaId: 0,
    crmBucket: 0,
    calendarBooking: 0,
    qualificationTiming: 0,
    objectionHandling: 0,
    trustSignalsUsed: 0,
  };

  const aspectCorrect = { ...aspectTotals };

  const perIndustryTotals = industries.reduce<Record<string, number>>((acc, industry) => ({ ...acc, [industry]: 0 }), {});
  const perIndustryCorrect = industries.reduce<Record<string, number>>((acc, industry) => ({ ...acc, [industry]: 0 }), {});

  const aspectBinary = ['calendarBooking', 'qualificationTiming', 'objectionHandling', 'trustSignalsUsed'] as const;
  const binaryStats = aspectBinary.reduce((acc, aspect) => ({
    ...acc,
    [aspect]: { tp: 0, fp: 0, fn: 0, tn: 0 },
  }), {} as Record<typeof aspectBinary[number], { tp: number; fp: number; fn: number; tn: number }>);

  for (const outcome of outcomes) {
    aspectTotals.recommendedPlan += 1;
    aspectTotals.nextStep += 1;
    aspectTotals.ctaId += 1;
    aspectTotals.crmBucket += 1;
    aspectTotals.calendarBooking += 1;
    aspectTotals.qualificationTiming += 1;
    aspectTotals.objectionHandling += 1;
    aspectTotals.trustSignalsUsed += 1;

    aspectCorrect.recommendedPlan += outcome.correct.recommendedPlan ? 1 : 0;
    aspectCorrect.nextStep += outcome.correct.nextStep ? 1 : 0;
    aspectCorrect.ctaId += outcome.correct.ctaId ? 1 : 0;
    aspectCorrect.crmBucket += outcome.correct.crmBucket ? 1 : 0;
    aspectCorrect.calendarBooking += outcome.correct.calendarBooking ? 1 : 0;
    aspectCorrect.qualificationTiming += outcome.correct.qualificationTiming ? 1 : 0;
    aspectCorrect.objectionHandling += outcome.correct.objectionHandling ? 1 : 0;
    aspectCorrect.trustSignalsUsed += outcome.correct.trustSignalsUsed ? 1 : 0;

    perIndustryTotals[outcome.industry] += 1;
    perIndustryCorrect[outcome.industry] += outcome.correct.recommendedPlan && outcome.correct.nextStep && outcome.correct.ctaId && outcome.correct.crmBucket && outcome.correct.calendarBooking && outcome.correct.qualificationTiming && outcome.correct.objectionHandling && outcome.correct.trustSignalsUsed ? 1 : 0;

    registerConfusion(confusionMatrix.recommendedPlan, outcome.expected.recommendedPlan, outcome.actual.recommendedPlan);
    registerConfusion(confusionMatrix.nextStep, outcome.expected.nextStep, outcome.actual.nextStep);
    registerConfusion(confusionMatrix.ctaId, outcome.expected.ctaId, outcome.actual.ctaId);
    registerConfusion(confusionMatrix.crmBucket, outcome.expected.crmBucket, outcome.actual.crmBucket);

    for (const aspect of aspectBinary) {
      const expected = outcome.expected[aspect];
      const actual = outcome.actual[aspect];
      if (expected && actual) binaryStats[aspect].tp += 1;
      if (!expected && actual) binaryStats[aspect].fp += 1;
      if (expected && !actual) binaryStats[aspect].fn += 1;
      if (!expected && !actual) binaryStats[aspect].tn += 1;
    }
  }

  const overallCorrect = Object.values(aspectCorrect).reduce((sum, val) => sum + val, 0);
  const overallTotal = Object.values(aspectTotals).reduce((sum, val) => sum + val, 0);

  return {
    accuracy: overallCorrect / overallTotal,
    aspectAccuracy: {
      recommendedPlan: aspectCorrect.recommendedPlan / aspectTotals.recommendedPlan,
      nextStep: aspectCorrect.nextStep / aspectTotals.nextStep,
      ctaId: aspectCorrect.ctaId / aspectTotals.ctaId,
      crmBucket: aspectCorrect.crmBucket / aspectTotals.crmBucket,
      calendarBooking: aspectCorrect.calendarBooking / aspectTotals.calendarBooking,
      qualificationTiming: aspectCorrect.qualificationTiming / aspectTotals.qualificationTiming,
      objectionHandling: aspectCorrect.objectionHandling / aspectTotals.objectionHandling,
      trustSignalsUsed: aspectCorrect.trustSignalsUsed / aspectTotals.trustSignalsUsed,
    },
    perIndustryAccuracy: Object.fromEntries(industries.map((industry) => [industry, perIndustryTotals[industry] ? perIndustryCorrect[industry] / perIndustryTotals[industry] : 0])),
    confusionMatrix,
    binaryMetrics: Object.entries(binaryStats).reduce((acc, [aspect, stats]) => {
      const precision = stats.tp + stats.fp > 0 ? stats.tp / (stats.tp + stats.fp) : 0;
      const recall = stats.tp + stats.fn > 0 ? stats.tp / (stats.tp + stats.fn) : 0;
      const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
      return { ...acc, [aspect]: { precision, recall, f1, ...stats } };
    }, {} as Record<typeof aspectBinary[number], { precision: number; recall: number; f1: number; tp: number; fp: number; fn: number; tn: number }>),
  };
}

function createConfusionMatrix(labels: readonly string[]) {
  return Object.fromEntries(labels.map((expected) => [expected, Object.fromEntries(labels.map((predicted) => [predicted, 0]))])) as Record<string, Record<string, number>>;
}

function registerConfusion(matrix: Record<string, Record<string, number>>, expected: string, actual: string) {
  if (!matrix[expected]) {
    matrix[expected] = Object.fromEntries(Object.keys(matrix[Object.keys(matrix)[0]]).map((label) => [label, 0]));
  }
  if (!matrix[expected][actual]) {
    matrix[expected][actual] = 0;
  }
  matrix[expected][actual] += 1;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function renderConfusionMatrix(matrix: Record<string, Record<string, number>>): string {
  const headers = Object.keys(matrix[Object.keys(matrix)[0]]);
  const headerRow = `| Expected \ Predicted | ${headers.map((header) => header).join(' | ')} |`;
  const separatorRow = `| --- | ${headers.map(() => '---').join(' | ')} |`;
  const rows = Object.entries(matrix).map(([expected, row]) => {
    const values = headers.map((predicted) => row[predicted]?.toString() ?? '0').join(' | ');
    return `| ${expected} | ${values} |`;
  });
  return [headerRow, separatorRow, ...rows].join('\n');
}

function generateReport(outcomes: BenchmarkOutcome[], metrics: ReturnType<typeof computeMetrics>) {
  const failures = outcomes.filter((outcome) => Object.values(outcome.correct).some((value) => !value));
  const sortedIndustries = Object.entries(metrics.perIndustryAccuracy).sort((a, b) => b[1] - a[1]);
  const planLabels = Object.keys(metrics.confusionMatrix.recommendedPlan);
  const nextStepLabels = Object.keys(metrics.confusionMatrix.nextStep);
  const ctaLabels = Object.keys(metrics.confusionMatrix.ctaId);
  const bucketLabels = Object.keys(metrics.confusionMatrix.crmBucket);

  return `# Sales Conversion Evaluation Benchmark

## Summary
- Cases evaluated: ${outcomes.length}
- Overall aspect accuracy: ${formatPercent(metrics.accuracy)}
- Recommended plan accuracy: ${formatPercent(metrics.aspectAccuracy.recommendedPlan)}
- Next best action accuracy: ${formatPercent(metrics.aspectAccuracy.nextStep)}
- CTA selection accuracy: ${formatPercent(metrics.aspectAccuracy.ctaId)}
- CRM bucket accuracy: ${formatPercent(metrics.aspectAccuracy.crmBucket)}
- Booking trigger accuracy: ${formatPercent(metrics.aspectAccuracy.calendarBooking)}
- Qualification timing accuracy: ${formatPercent(metrics.aspectAccuracy.qualificationTiming)}
- Objection handling accuracy: ${formatPercent(metrics.aspectAccuracy.objectionHandling)}
- Trust signal usage accuracy: ${formatPercent(metrics.aspectAccuracy.trustSignalsUsed)}

## Per-industry accuracy
| Industry | Accuracy |
| --- | ---: |
${sortedIndustries.map(([industry, value]) => `| ${industry} | ${formatPercent(value)} |`).join('\n')}

## Confusion matrices
### Recommended plan
${renderConfusionMatrix(metrics.confusionMatrix.recommendedPlan)}

### Next best action
${renderConfusionMatrix(metrics.confusionMatrix.nextStep)}

### CTA selection
${renderConfusionMatrix(metrics.confusionMatrix.ctaId)}

### CRM lead bucket
${renderConfusionMatrix(metrics.confusionMatrix.crmBucket)}

## Binary metrics
| Aspect | Precision | Recall | F1 |
| --- | ---: | ---: | ---: |
| Booking trigger | ${formatPercent(metrics.binaryMetrics.calendarBooking.precision)} | ${formatPercent(metrics.binaryMetrics.calendarBooking.recall)} | ${formatPercent(metrics.binaryMetrics.calendarBooking.f1)} |
| Qualification timing | ${formatPercent(metrics.binaryMetrics.qualificationTiming.precision)} | ${formatPercent(metrics.binaryMetrics.qualificationTiming.recall)} | ${formatPercent(metrics.binaryMetrics.qualificationTiming.f1)} |
| Objection handling | ${formatPercent(metrics.binaryMetrics.objectionHandling.precision)} | ${formatPercent(metrics.binaryMetrics.objectionHandling.recall)} | ${formatPercent(metrics.binaryMetrics.objectionHandling.f1)} |
| Trust signal usage | ${formatPercent(metrics.binaryMetrics.trustSignalsUsed.precision)} | ${formatPercent(metrics.binaryMetrics.trustSignalsUsed.recall)} | ${formatPercent(metrics.binaryMetrics.trustSignalsUsed.f1)} |

## Failure analysis
- Total failing cases: ${failures.length}

${failures.map((outcome) => `### ${outcome.title}
- Industry: ${outcome.industry}
- Expected plan: ${outcome.expected.recommendedPlan}, actual: ${outcome.actual.recommendedPlan}
- Expected next step: ${outcome.expected.nextStep}, actual: ${outcome.actual.nextStep}
- Expected CTA: ${outcome.expected.ctaId}, actual: ${outcome.actual.ctaId}
- Expected bucket: ${outcome.expected.crmBucket}, actual: ${outcome.actual.crmBucket}
- Expected booking: ${outcome.expected.calendarBooking}, actual: ${outcome.actual.calendarBooking}
- Expected qualification timing: ${outcome.expected.qualificationTiming}, actual: ${outcome.actual.qualificationTiming}
- Expected objection handling: ${outcome.expected.objectionHandling}, actual: ${outcome.actual.objectionHandling}
- Root causes: ${outcome.rootCauses.join('; ')}
`).join('\n')}

## Improvement recommendations
- Improve plan recommendation coverage for mid-market and enterprise buyers; several cases depend on persona and scheduling goals.
- Expand CTA alignment logic for industry-specific pathways such as healthcare and e-commerce, especially when pricing and booking cues overlap.
- Strengthen objection sensitivity so price pushback still preserves correct next-step and bucket decisions.
- Refine qualification timing detection when missing qualification is present but the plan does not yet require a direct ask.
- Add more real-world industry variation for real estate, manufacturing, and restaurants before freeze.

## Freeze decision
${generateFreezeDecision(metrics)}
`;
}

function generateFreezeDecision(metrics: ReturnType<typeof computeMetrics>) {
  const pass =
    metrics.accuracy >= 0.80 &&
    metrics.aspectAccuracy.recommendedPlan >= 0.70 &&
    metrics.aspectAccuracy.nextStep >= 0.75 &&
    metrics.aspectAccuracy.ctaId >= 0.75 &&
    metrics.aspectAccuracy.crmBucket >= 0.70 &&
    metrics.aspectAccuracy.trustSignalsUsed >= 0.70 &&
    metrics.binaryMetrics.calendarBooking.f1 >= 0.80 &&
    metrics.binaryMetrics.qualificationTiming.f1 >= 0.85 &&
    metrics.binaryMetrics.objectionHandling.f1 >= 0.80 &&
    metrics.binaryMetrics.trustSignalsUsed.f1 >= 0.75 &&
    Object.values(metrics.perIndustryAccuracy).every((value) => value >= 0.70);

  return `- Accuracy threshold: ${formatPercent(metrics.accuracy)} / 80% (${metrics.accuracy >= 0.80 ? 'PASS' : 'FAIL'})
- Recommended plan threshold: ${formatPercent(metrics.aspectAccuracy.recommendedPlan)} / 70% (${metrics.aspectAccuracy.recommendedPlan >= 0.70 ? 'PASS' : 'FAIL'})
- Next best action threshold: ${formatPercent(metrics.aspectAccuracy.nextStep)} / 75% (${metrics.aspectAccuracy.nextStep >= 0.75 ? 'PASS' : 'FAIL'})
- CTA selection threshold: ${formatPercent(metrics.aspectAccuracy.ctaId)} / 75% (${metrics.aspectAccuracy.ctaId >= 0.75 ? 'PASS' : 'FAIL'})
- CRM lead classification threshold: ${formatPercent(metrics.aspectAccuracy.crmBucket)} / 70% (${metrics.aspectAccuracy.crmBucket >= 0.70 ? 'PASS' : 'FAIL'})
- Booking trigger F1 threshold: ${formatPercent(metrics.binaryMetrics.calendarBooking.f1)} / 80% (${metrics.binaryMetrics.calendarBooking.f1 >= 0.80 ? 'PASS' : 'FAIL'})
- Qualification timing F1 threshold: ${formatPercent(metrics.binaryMetrics.qualificationTiming.f1)} / 85% (${metrics.binaryMetrics.qualificationTiming.f1 >= 0.85 ? 'PASS' : 'FAIL'})
- Objection handling F1 threshold: ${formatPercent(metrics.binaryMetrics.objectionHandling.f1)} / 80% (${metrics.binaryMetrics.objectionHandling.f1 >= 0.80 ? 'PASS' : 'FAIL'})
- Trust signal usage F1 threshold: ${formatPercent(metrics.binaryMetrics.trustSignalsUsed.f1)} / 75% (${metrics.binaryMetrics.trustSignalsUsed.f1 >= 0.75 ? 'PASS' : 'FAIL'})
- Per-industry threshold: ${formatPercent(Math.min(...Object.values(metrics.perIndustryAccuracy)))} / 70% (${Object.values(metrics.perIndustryAccuracy).every((value) => value >= 0.70) ? 'PASS' : 'FAIL'})

**Freeze decision:** ${pass ? 'PROCEED TO FREEZE' : 'DO NOT FREEZE'}
`;
}

export async function runSalesConversionBenchmark(outputPath?: string) {
  const outcomes = benchmarkCases.map(evaluateBenchmarkCase);
  const metrics = computeMetrics(outcomes);
  const report = generateReport(outcomes, metrics);
  const reportPath = outputPath || path.resolve(__dirname, '..', 'SALES_CONVERSION_FINAL_BENCHMARK.md');
  const freezeReportPath = path.resolve(__dirname, '..', 'SALES_CONVERSION_FREEZE_REPORT.md');
  await fs.writeFile(reportPath, report, 'utf8');
  await fs.writeFile(freezeReportPath, generateFreezeDecision(metrics), 'utf8');
  return { outcomes, metrics, reportPath, freezeReportPath };
}
