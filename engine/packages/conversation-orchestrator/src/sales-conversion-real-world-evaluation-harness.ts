import { promises as fs } from 'node:fs';
import path from 'node:path';
import { buildSalesConversionSignals } from './sales-conversion-engine';
import buildCanonicalBenchmarkInputs from './benchmark-fixtures';
import { createMemory, ConversationMemoryData } from './conversation-memory';
import { ConversationIntelligenceResult } from './conversation-intelligence-types';
import { ConversationGoal, FunnelStageExtended } from './conversation-planner';
import { runSalesConversionBenchmark } from './sales-conversion-evaluation-harness';

type VisitorIntentCategory = 'buying' | 'pricing' | 'booking' | 'research' | 'support' | 'comparison';

type JourneyStage = 'awareness' | 'consideration' | 'decision';

type ProductComplexity = 'simple' | 'moderate' | 'complex';

type ObjectionCategory = 'none' | 'price' | 'trust' | 'competitors' | 'timing' | 'authority';

type RealWorldFailureCategory =
  | 'wrong_product_recommendation'
  | 'wrong_cta'
  | 'wrong_next_best_action'
  | 'wrong_crm_classification'
  | 'incorrect_booking_timing'
  | 'incorrect_qualification_timing'
  | 'missed_objection'
  | 'missing_trust_signal'
  | 'weak_personalization';

interface RealWorldWebsiteProfile {
  url: string;
  industry: string;
  pageType: string;
  journeyStage: JourneyStage;
  visitorIntent: VisitorIntentCategory;
  productComplexity: ProductComplexity;
  products: string[];
  services: string[];
  pricingModel: string;
  trustSignals: string[];
  objectionCategory: ObjectionCategory;
  companySize: string;
  budget: string;
  persona: ConversationMemoryData['persona'];
  messageTemplate: string;
}

type RealWorldEvaluationCase = RealWorldWebsiteProfile & {
  title: string;
  message: string;
  plan: {
    goal: ConversationGoal;
    customerIntent: 'buying' | 'evaluating' | 'research' | 'support';
    funnelStage: FunnelStageExtended;
    missingQualification: string[];
  };
  leadScore: number;
  trustLevel: ConversationMemoryData['trustLevel'];
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
  ciOverrides?: Partial<ConversationIntelligenceResult>;
};

interface BenchmarkOutcome {
  title: string;
  industry: string;
  url: string;
  expected: RealWorldEvaluationCase['expected'];
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
  failureCategories: RealWorldFailureCategory[];
}

type MetricsBinary = {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  precision: number;
  recall: number;
  f1: number;
};

interface RealWorldEvaluationMetrics {
  accuracy: number;
  aspectAccuracy: {
    recommendedPlan: number;
    nextStep: number;
    ctaId: number;
    crmBucket: number;
    calendarBooking: number;
    qualificationTiming: number;
    objectionHandling: number;
    trustSignalsUsed: number;
  };
  perIndustryAccuracy: Record<string, number>;
  confusionMatrix: {
    recommendedPlan: Record<string, Record<string, number>>;
    nextStep: Record<string, Record<string, number>>;
    ctaId: Record<string, Record<string, number>>;
    crmBucket: Record<string, Record<string, number>>;
  };
  binaryMetrics: Record<'calendarBooking' | 'qualificationTiming' | 'objectionHandling' | 'trustSignalsUsed', MetricsBinary>;
}

interface SyntheticComparison {
  syntheticAccuracy: number;
  syntheticAspectAccuracy: RealWorldEvaluationMetrics['aspectAccuracy'];
  deltaAccuracy: number;
  deltaAspectAccuracy: Partial<RealWorldEvaluationMetrics['aspectAccuracy']>;
  deltaPerIndustryAccuracy: Record<string, number>;
}

interface RealWorldBenchmarkResult {
  outcomes: BenchmarkOutcome[];
  metrics: RealWorldEvaluationMetrics;
  syntheticMetrics: RealWorldEvaluationMetrics;
  syntheticComparison: SyntheticComparison;
  reportPath: string;
  freezeReportPath: string;
}

const visitorIntentToGoal: Record<VisitorIntentCategory, ConversationGoal> = {
  buying: 'close_trial',
  pricing: 'recommend_plan',
  booking: 'schedule_demo',
  research: 'advance_funnel',
  support: 'answer_question',
  comparison: 'advance_funnel',
};

const journeyToFunnel: Record<JourneyStage, FunnelStageExtended> = {
  awareness: 'awareness',
  consideration: 'consideration',
  decision: 'decision',
};

const websiteProfiles: RealWorldWebsiteProfile[] = [
  {
    url: 'https://www.hubspot.com/crm',
    industry: 'SaaS',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'moderate',
    products: ['CRM platform'],
    services: ['sales automation'],
    pricingModel: 'tiered subscription',
    trustSignals: ['G2 leader', 'customer logos', 'security certifications'],
    objectionCategory: 'none',
    companySize: '250',
    budget: '$900',
    persona: 'support_manager',
    messageTemplate: 'We are assessing a CRM platform for our sales and service teams. We need pricing, integration, and trust details before we proceed.',
  },
  {
    url: 'https://www.hubspot.com/pricing',
    industry: 'SaaS',
    pageType: 'pricing',
    journeyStage: 'decision',
    visitorIntent: 'pricing',
    productComplexity: 'moderate',
    products: ['CRM plans'],
    services: ['customer relationship management'],
    pricingModel: 'tiered subscription',
    trustSignals: ['free trial', 'customer references'],
    objectionCategory: 'price',
    companySize: '50',
    budget: '$250',
    persona: 'small_business',
    messageTemplate: 'We need to understand pricing options for a CRM subscription for our small team and evaluate whether the plans fit our budget.',
  },
  {
    url: 'https://www.hubspot.com/contact-sales',
    industry: 'SaaS',
    pageType: 'booking',
    journeyStage: 'decision',
    visitorIntent: 'booking',
    productComplexity: 'moderate',
    products: ['Enterprise sales package'],
    services: ['implementation consulting'],
    pricingModel: 'custom quote',
    trustSignals: ['customer success stories', 'premium support'],
    objectionCategory: 'authority',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We want to book a demo for the enterprise package and confirm pricing, implementation support, and procurement approval requirements.',
  },
  {
    url: 'https://www.atlassian.com/software/jira/pricing',
    industry: 'SaaS',
    pageType: 'pricing',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'complex',
    products: ['Project management tool'],
    services: ['team collaboration'],
    pricingModel: 'per user subscription',
    trustSignals: ['Fortune 500 customers', 'security certifications'],
    objectionCategory: 'none',
    companySize: '250',
    budget: '$900',
    persona: 'operations_manager',
    messageTemplate: 'We need to review pricing and security details for a project management platform that scales with our teams.',
  },
  {
    url: 'https://www.atlassian.com/software/confluence',
    industry: 'SaaS',
    pageType: 'product',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'moderate',
    products: ['Knowledge management solution'],
    services: ['documentation collaboration'],
    pricingModel: 'per user subscription',
    trustSignals: ['enterprise traction', 'security features'],
    objectionCategory: 'none',
    companySize: '50',
    budget: '$250',
    persona: 'startup',
    messageTemplate: 'We are exploring a knowledge management solution for our startup and want to understand the offering, pricing approach, and trust signals.',
  },
  {
    url: 'https://www.salesforce.com/editions-pricing/',
    industry: 'SaaS',
    pageType: 'pricing',
    journeyStage: 'decision',
    visitorIntent: 'pricing',
    productComplexity: 'complex',
    products: ['CRM editions'],
    services: ['customer success'],
    pricingModel: 'tiered enterprise pricing',
    trustSignals: ['customer stories', 'awards', 'security compliance'],
    objectionCategory: 'price',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We need pricing for Salesforce editions, plus security and enterprise support proof before our procurement team signs off.',
  },
  {
    url: 'https://www.zendesk.com/pricing/',
    industry: 'SaaS',
    pageType: 'pricing',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'moderate',
    products: ['Customer support software'],
    services: ['helpdesk automation'],
    pricingModel: 'monthly subscription',
    trustSignals: ['customer quotes', 'security certifications'],
    objectionCategory: 'none',
    companySize: '250',
    budget: '$900',
    persona: 'support_manager',
    messageTemplate: 'We want to compare customer support software pricing and see if the plans match our workflow and trust requirements.',
  },
  {
    url: 'https://www.shopify.com/pricing',
    industry: 'E-commerce',
    pageType: 'pricing',
    journeyStage: 'decision',
    visitorIntent: 'pricing',
    productComplexity: 'simple',
    products: ['Online store platform'],
    services: ['e-commerce hosting'],
    pricingModel: 'monthly subscription',
    trustSignals: ['free trial', 'e-commerce success stories'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'small_business',
    messageTemplate: 'We are ready to choose an online store platform and need a clear pricing comparison plus trust signals for security and uptime.',
  },
  {
    url: 'https://www.bestbuy.com/',
    industry: 'E-commerce',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Consumer electronics'],
    services: ['delivery', 'extended warranty'],
    pricingModel: 'product catalog pricing',
    trustSignals: ['reviews', 'brand recognition'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'entrepreneur',
    messageTemplate: 'We are researching consumer electronics and want to understand product offerings, pricing models, and trust signals like reviews.',
  },
  {
    url: 'https://www.nike.com/w/new-releases-3n82y',
    industry: 'E-commerce',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Athletic apparel'],
    services: ['fast shipping'],
    pricingModel: 'single-item pricing',
    trustSignals: ['brand reputation', 'customer reviews'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'startup',
    messageTemplate: 'We are comparing athletic apparel offerings and want to know product details, price ranges, and how much we can trust the brand.',
  },
  {
    url: 'https://www.amazon.com/',
    industry: 'E-commerce',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Marketplace goods'],
    services: ['fast delivery', 'prime membership'],
    pricingModel: 'list pricing',
    trustSignals: ['customer ratings', 'brand familiarity'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We are exploring marketplace products and want to understand how pricing, trust signals, and shipping options compare.',
  },
  {
    url: 'https://www.walmart.com/cp/customer-service/1235',
    industry: 'E-commerce',
    pageType: 'support',
    journeyStage: 'consideration',
    visitorIntent: 'support',
    productComplexity: 'simple',
    products: ['Retail merchandise'],
    services: ['customer care'],
    pricingModel: 'list pricing',
    trustSignals: ['return policy', 'brand trust'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'small_business',
    messageTemplate: 'We need help with an order and want to understand support options, trust signals, and whether pricing is transparent.',
  },
  {
    url: 'https://www.mayoclinic.org/appointments',
    industry: 'Healthcare',
    pageType: 'booking',
    journeyStage: 'decision',
    visitorIntent: 'booking',
    productComplexity: 'complex',
    products: ['Medical appointments'],
    services: ['specialist care'],
    pricingModel: 'insurance / self-pay',
    trustSignals: ['clinical reputation', 'research citations'],
    objectionCategory: 'trust',
    companySize: '50',
    budget: '$900',
    persona: 'support_manager',
    messageTemplate: 'We need to book a specialist appointment, verify trust credentials, and confirm payment options or insurance coverage.',
  },
  {
    url: 'https://www.clevelandclinic.org/appointments',
    industry: 'Healthcare',
    pageType: 'booking',
    journeyStage: 'decision',
    visitorIntent: 'booking',
    productComplexity: 'complex',
    products: ['Cardiology consultation'],
    services: ['heart care'],
    pricingModel: 'insurance / consultation fee',
    trustSignals: ['doctor credentials', 'patient testimonials'],
    objectionCategory: 'none',
    companySize: '50',
    budget: '$900',
    persona: 'enterprise',
    messageTemplate: 'We want to schedule a cardiology consultation and verify credentials, waiting times, and pricing options.',
  },
  {
    url: 'https://www.nhs.uk/conditions/',
    industry: 'Healthcare',
    pageType: 'product',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Health condition guidance'],
    services: ['patient resources'],
    pricingModel: 'publicly funded',
    trustSignals: ['government endorsement', 'clinical references'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are researching health conditions and need clear guidance, trust signals, and direction toward booking or support.',
  },
  {
    url: 'https://www.kaiserpermanente.org/health-wellness',
    industry: 'Healthcare',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'moderate',
    products: ['Preventive care programs'],
    services: ['wellness resources'],
    pricingModel: 'insurance-based',
    trustSignals: ['member satisfaction', 'quality ratings'],
    objectionCategory: 'none',
    companySize: '50',
    budget: '$900',
    persona: 'small_business',
    messageTemplate: 'We are comparing preventive care and wellness services, and need pricing clarity and trust signals from the provider.',
  },
  {
    url: 'https://www.harvard.edu/admissions/',
    industry: 'Education',
    pageType: 'admissions',
    journeyStage: 'decision',
    visitorIntent: 'buying',
    productComplexity: 'complex',
    products: ['Undergraduate programs'],
    services: ['admissions counseling'],
    pricingModel: 'tuition and financial aid',
    trustSignals: ['academic ranking', 'research reputation'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are ready to apply and need admissions details, tuition pricing, and trust credentials for the university.',
  },
  {
    url: 'https://web.mit.edu/admissions/',
    industry: 'Education',
    pageType: 'admissions',
    journeyStage: 'decision',
    visitorIntent: 'buying',
    productComplexity: 'complex',
    products: ['Graduate admissions'],
    services: ['academic programs'],
    pricingModel: 'tuition-based',
    trustSignals: ['research awards', 'faculty credentials'],
    objectionCategory: 'none',
    companySize: '50',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We want application guidance, tuition expectations, and research reputation to finalize our decision.',
  },
  {
    url: 'https://www.stanford.edu/admissions',
    industry: 'Education',
    pageType: 'admissions',
    journeyStage: 'decision',
    visitorIntent: 'buying',
    productComplexity: 'complex',
    products: ['Degree programs'],
    services: ['admissions support'],
    pricingModel: 'tuition and fees',
    trustSignals: ['alumni success', 'rankings'],
    objectionCategory: 'trust',
    companySize: '10',
    budget: '$4200',
    persona: 'startup',
    messageTemplate: 'We are comparing top universities and need trust proof, tuition details, and next steps for the application process.',
  },
  {
    url: 'https://www.upenn.edu/admissions',
    industry: 'Education',
    pageType: 'admissions',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Undergraduate programs'],
    services: ['campus visits'],
    pricingModel: 'tuition and financial aid',
    trustSignals: ['prestige', 'career outcomes'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$900',
    persona: 'small_business',
    messageTemplate: 'We are comparing undergraduate programs, campus visits, and financial aid options with trust signals and tuition clarity.',
  },
  {
    url: 'https://www.marriott.com/hotels/travel/',
    industry: 'Hotels',
    pageType: 'booking',
    journeyStage: 'decision',
    visitorIntent: 'booking',
    productComplexity: 'simple',
    products: ['Room bookings'],
    services: ['hotel stays'],
    pricingModel: 'nightly rate',
    trustSignals: ['loyalty program', 'guest reviews'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We want to book a hotel room, confirm nightly pricing, and check guest reviews and loyalty benefits.',
  },
  {
    url: 'https://www.hilton.com/en/book/',
    industry: 'Hotels',
    pageType: 'booking',
    journeyStage: 'decision',
    visitorIntent: 'booking',
    productComplexity: 'simple',
    products: ['Hotel reservations'],
    services: ['event space'],
    pricingModel: 'room rate',
    trustSignals: ['hilton honors', 'guest reviews'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We need to book a hotel stay and want to confirm room rates, event space availability, and trust signals.',
  },
  {
    url: 'https://www.airbnb.com/',
    industry: 'Hotels',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Short-term rentals'],
    services: ['host listings'],
    pricingModel: 'per night variable pricing',
    trustSignals: ['reviews', 'host verification'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We are exploring short-term rentals, looking for pricing transparency, reviews, and host trust signals.',
  },
  {
    url: 'https://www.redfin.com/city/1230/WA/Seattle',
    industry: 'Real Estate',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'moderate',
    products: ['Residential listings'],
    services: ['agent matching'],
    pricingModel: 'commission-based',
    trustSignals: ['market data', 'agent reviews'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$4200',
    persona: 'entrepreneur',
    messageTemplate: 'We are researching real estate listings and need market data, agent trust signals, and commission expectations.',
  },
  {
    url: 'https://www.zillow.com/homes/for_sale/',
    industry: 'Real Estate',
    pageType: 'product',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'moderate',
    products: ['Home listings'],
    services: ['property search'],
    pricingModel: 'commission-based',
    trustSignals: ['customer reviews', 'market insights'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$4200',
    persona: 'consumer',
    messageTemplate: 'We are exploring home listings and want to see pricing, neighborhood data, and trust signals from the real estate platform.',
  },
  {
    url: 'https://www.realtor.com/realestateandhomes-search',
    industry: 'Real Estate',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'moderate',
    products: ['Home search platform'],
    services: ['agent contact'],
    pricingModel: 'commission-based',
    trustSignals: ['agent ratings', 'market trends'],
    objectionCategory: 'trust',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We need pricing and trust details for home search, plus agent reliability and commission transparency.',
  },
  {
    url: 'https://www.accenture.com/us-en/services/consulting/technology',
    industry: 'Professional services',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Technology consulting'],
    services: ['strategy and implementation'],
    pricingModel: 'project-based',
    trustSignals: ['industry awards', 'reference customers'],
    objectionCategory: 'none',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are evaluating technology consulting services and need pricing, project scope, and trust proof from reference customers.',
  },
  {
    url: 'https://www.bcg.com/capabilities',
    industry: 'Professional services',
    pageType: 'product',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Management consulting'],
    services: ['strategy and operations'],
    pricingModel: 'custom engagement',
    trustSignals: ['client results', 'thought leadership'],
    objectionCategory: 'none',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are researching management consulting services and want to assess trust signals, fees, and expected ROI.',
  },
  {
    url: 'https://www.deloitte.com/us/en/pages/consulting/solutions.html',
    industry: 'Professional services',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Consulting solutions'],
    services: ['risk advisory'],
    pricingModel: 'custom quote',
    trustSignals: ['global footprint', 'regulatory expertise'],
    objectionCategory: 'authority',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We need to compare consulting solutions and verify regulatory expertise, trust signals, and pricing for our procurement review.',
  },
  {
    url: 'https://www.ibm.com/services',
    industry: 'Professional services',
    pageType: 'product',
    journeyStage: 'decision',
    visitorIntent: 'booking',
    productComplexity: 'complex',
    products: ['Technology services'],
    services: ['cloud migration'],
    pricingModel: 'custom engagement',
    trustSignals: ['enterprise references', 'security certifications'],
    objectionCategory: 'none',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We want to schedule a conversation about technology services, security credentials, and custom pricing for cloud migration.',
  },
  {
    url: 'https://www.mcdonalds.com/us/en-us.html',
    industry: 'Restaurants',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Fast food menu'],
    services: ['delivery', 'drive-thru'],
    pricingModel: 'menu pricing',
    trustSignals: ['brand recognition', 'customer ratings'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are exploring meal options and want to understand menu pricing, delivery, and trust signals like brand familiarity.',
  },
  {
    url: 'https://www.starbucks.com/menu',
    industry: 'Restaurants',
    pageType: 'product',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Coffee and beverages'],
    services: ['mobile ordering'],
    pricingModel: 'menu pricing',
    trustSignals: ['brand reputation', 'customer familiarity'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are evaluating coffee and beverage options, and want pricing, trust signals, and order convenience information.',
  },
  {
    url: 'https://www.chipotle.com/order',
    industry: 'Restaurants',
    pageType: 'buying',
    journeyStage: 'decision',
    visitorIntent: 'buying',
    productComplexity: 'simple',
    products: ['Restaurant delivery'],
    services: ['online ordering'],
    pricingModel: 'menu pricing',
    trustSignals: ['food safety information', 'customer ratings'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are ready to order food and need pricing, delivery timing, and trust signals like food safety assurances.',
  },
  {
    url: 'https://www.dominos.com/en/pages/order/',
    industry: 'Restaurants',
    pageType: 'buying',
    journeyStage: 'decision',
    visitorIntent: 'booking',
    productComplexity: 'simple',
    products: ['Pizza ordering'],
    services: ['delivery scheduling'],
    pricingModel: 'menu pricing',
    trustSignals: ['delivery tracking', 'customer reviews'],
    objectionCategory: 'timing',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We want to place a pizza order and need delivery timing, pricing, and clear trust signals about order accuracy.',
  },
  {
    url: 'https://www.toyota.com/prius',
    industry: 'Automotive',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Hybrid vehicle'],
    services: ['test drive scheduling'],
    pricingModel: 'MSRP and financing',
    trustSignals: ['safety ratings', 'fuel economy awards'],
    objectionCategory: 'price',
    companySize: '10',
    budget: '$4200',
    persona: 'entrepreneur',
    messageTemplate: 'We are comparing hybrid vehicles and need pricing, financing options, and trust signals like safety ratings.',
  },
  {
    url: 'https://www.ford.com/cars/mustang/',
    industry: 'Automotive',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Sports car'],
    services: ['test drive'],
    pricingModel: 'MSRP and lease offers',
    trustSignals: ['performance awards', 'customer reviews'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$4200',
    persona: 'consumer',
    messageTemplate: 'We are evaluating a sports car and need pricing details, lease offers, and trust signals around performance and ownership.',
  },
  {
    url: 'https://www.caterpillar.com/en/products/new.html',
    industry: 'Manufacturing',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Heavy equipment'],
    services: ['equipment financing'],
    pricingModel: 'custom quote',
    trustSignals: ['industry certifications', 'dealer network'],
    objectionCategory: 'none',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are reviewing heavy equipment options and need pricing quotes, financing options, and trust signals from dealer support.',
  },
  {
    url: 'https://www.siemens.com/global/en/products/automation.html',
    industry: 'Manufacturing',
    pageType: 'product',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Automation systems'],
    services: ['industrial consulting'],
    pricingModel: 'custom engagement',
    trustSignals: ['technical credentials', 'global deployments'],
    objectionCategory: 'none',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are researching industrial automation systems and need trust evidence, deployment examples, and price guidance.',
  },
  {
    url: 'https://www.honeywell.com/us/en/products',
    industry: 'Manufacturing',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'complex',
    products: ['Safety and security products'],
    services: ['system integration'],
    pricingModel: 'custom quote',
    trustSignals: ['safety certifications', 'case studies'],
    objectionCategory: 'trust',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We need pricing and trust details for safety systems and want proof of certifications and successful installations.',
  },
  {
    url: 'https://www.turnerconstruction.com/projects',
    industry: 'Construction',
    pageType: 'product',
    journeyStage: 'research',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Large construction projects'],
    services: ['project delivery'],
    pricingModel: 'bidding / custom quote',
    trustSignals: ['project portfolio', 'safety record'],
    objectionCategory: 'none',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are researching construction project delivery services and need trust signals, pricing approach, and portfolio examples.',
  },
  {
    url: 'https://www.lennar.com/homes',
    industry: 'Construction',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'moderate',
    products: ['New home communities'],
    services: ['home financing'],
    pricingModel: 'list price / mortgage',
    trustSignals: ['model homes', 'warranty'],
    objectionCategory: 'price',
    companySize: '10',
    budget: '$4200',
    persona: 'consumer',
    messageTemplate: 'We are evaluating new home communities and need detailed pricing, financing information, and trust indicators like warranties.',
  },
  {
    url: 'https://www.zillow.com/agents/',
    industry: 'Real Estate',
    pageType: 'contact',
    journeyStage: 'decision',
    visitorIntent: 'contact',
    productComplexity: 'moderate',
    products: ['Agent referrals'],
    services: ['home buying assistance'],
    pricingModel: 'commission-based',
    trustSignals: ['agent ratings', 'market expertise'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We are ready to contact an agent and want information on commissions, trust signals, and home-buying assistance.',
  },
  {
    url: 'https://www.pwc.com/us/en/services.html',
    industry: 'Agencies',
    pageType: 'product',
    journeyStage: 'research',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Consulting services'],
    services: ['risk management'],
    pricingModel: 'custom engagement',
    trustSignals: ['industry recognition', 'client success stories'],
    objectionCategory: 'none',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are researching consulting services and need trust signals, pricing model expectations, and examples of client impact.',
  },
  {
    url: 'https://www.nerdwallet.com/best/credit-cards',
    industry: 'Finance',
    pageType: 'comparison',
    journeyStage: 'consideration',
    visitorIntent: 'comparison',
    productComplexity: 'moderate',
    products: ['Credit card comparison'],
    services: ['rate comparison'],
    pricingModel: 'fee and reward disclosures',
    trustSignals: ['editorial reviews', 'industry rankings'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are comparing credit card offers and want fees, rewards, and trust signals from editorial reviews.',
  },
  {
    url: 'https://www.citi.com/',
    industry: 'Finance',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'moderate',
    products: ['Banking products'],
    services: ['online banking'],
    pricingModel: 'account fees / APRs',
    trustSignals: ['customer security', 'brand reputation'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We are exploring banking products, fees, and trust signals around security and reputation.',
  },
  {
    url: 'https://www.littler.com/people',
    industry: 'Legal',
    pageType: 'product',
    journeyStage: 'research',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Employment law services'],
    services: ['legal counsel'],
    pricingModel: 'custom retainers',
    trustSignals: ['firm credentials', 'industry awards'],
    objectionCategory: 'none',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are researching employment law counsel and need pricing model details, trust signals, and firm credentials.',
  },
  {
    url: 'https://www.toyota.com/',
    industry: 'Automotive',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Vehicles'],
    services: ['dealer network'],
    pricingModel: 'MSRP and incentives',
    trustSignals: ['safety ratings', 'reliability awards'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We are exploring vehicles, incentives, and trust signals such as safety and reliability awards.',
  },
  {
    url: 'https://www.chase.com/personal/credit-cards',
    industry: 'Finance',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'moderate',
    products: ['Credit cards'],
    services: ['card benefits'],
    pricingModel: 'APR and fees',
    trustSignals: ['fraud protection', 'customer service'],
    objectionCategory: 'price',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We need credit card pricing, APR details, and trust signals like fraud protection and customer service.',
  },
  {
    url: 'https://www.bosch.com/products-and-services/',
    industry: 'Manufacturing',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Industrial automation'],
    services: ['system integration'],
    pricingModel: 'custom quote',
    trustSignals: ['engineering expertise', 'global references'],
    objectionCategory: 'trust',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are researching industrial automation solutions and need engineering trust signals, pricing model clarity, and integration proof.',
  },
  {
    url: 'https://www.homedepot.com/b/Tools/N-5yc1vZc1j0',
    industry: 'Local Businesses',
    pageType: 'product',
    journeyStage: 'research',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Tools and hardware'],
    services: ['installation services'],
    pricingModel: 'catalog pricing',
    trustSignals: ['store reputation', 'customer reviews'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'small_business',
    messageTemplate: 'We are researching tools and hardware options, and need pricing transparency, service capabilities, and trust signals.',
  },
  {
    url: 'https://www.expedia.com/Flights',
    industry: 'Travel',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'comparison',
    productComplexity: 'moderate',
    products: ['Flight booking'],
    services: ['travel packages'],
    pricingModel: 'dynamic fares',
    trustSignals: ['travel reviews', 'price guarantees'],
    objectionCategory: 'price',
    companySize: '10',
    budget: '$900',
    persona: 'consumer',
    messageTemplate: 'We are comparing flights and packages for our next trip and need clear pricing, refund rules, and trust signals.',
  },
  {
    url: 'https://www.united.com/ual/en/us/',
    industry: 'Travel',
    pageType: 'booking',
    journeyStage: 'decision',
    visitorIntent: 'booking',
    productComplexity: 'moderate',
    products: ['Airline tickets'],
    services: ['seat selection', 'loyalty program'],
    pricingModel: 'fare-based pricing',
    trustSignals: ['on-time performance', 'safety record'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$4200',
    persona: 'consumer',
    messageTemplate: 'We want to book a flight, compare fare classes, and verify safety and loyalty benefits before purchasing.',
  },
  {
    url: 'https://www.booking.com/',
    industry: 'Travel',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Hotel bookings'],
    services: ['travel deals'],
    pricingModel: 'room-rate pricing',
    trustSignals: ['guest ratings', 'brand familiarity'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'startup',
    messageTemplate: 'We are planning a trip and want to compare hotels, prices, and trust signals from guest reviews and ratings.',
  },
  {
    url: 'https://www.geico.com/insurance/',
    industry: 'Insurance',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'moderate',
    products: ['Auto insurance'],
    services: ['coverage comparison'],
    pricingModel: 'premium pricing',
    trustSignals: ['customer satisfaction', 'claims service'],
    objectionCategory: 'price',
    companySize: '10',
    budget: '$900',
    persona: 'consumer',
    messageTemplate: 'We need insurance pricing and trust signals like claims support and discounts before choosing a policy.',
  },
  {
    url: 'https://www.aetna.com/individuals-families/health-insurance.html',
    industry: 'Healthcare',
    pageType: 'product',
    journeyStage: 'decision',
    visitorIntent: 'buying',
    productComplexity: 'complex',
    products: ['Health insurance plans'],
    services: ['provider networks'],
    pricingModel: 'premium and deductible',
    trustSignals: ['network size', 'member ratings'],
    objectionCategory: 'trust',
    companySize: '50',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are ready to choose a health plan and need provider network details, pricing, and trust validation.',
  },
  {
    url: 'https://www.revolut.com/',
    industry: 'Finance',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'moderate',
    products: ['Digital banking'],
    services: ['payments', 'currency exchange'],
    pricingModel: 'subscription plus transaction fees',
    trustSignals: ['app ratings', 'licensing'],
    objectionCategory: 'trust',
    companySize: '10',
    budget: '$250',
    persona: 'small_business',
    messageTemplate: 'We are exploring digital banking services and need pricing, app trust signals, and regulatory proof.',
  },
  {
    url: 'https://stripe.com/pricing',
    industry: 'Fintech',
    pageType: 'pricing',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'complex',
    products: ['Payment processing'],
    services: ['developer APIs'],
    pricingModel: 'pay-as-you-go',
    trustSignals: ['developer stories', 'security certifications'],
    objectionCategory: 'price',
    companySize: '250',
    budget: '$1200',
    persona: 'startup',
    messageTemplate: 'We need payment API pricing and trust signals such as security proof and developer references.',
  },
  {
    url: 'https://www.att.com/',
    industry: 'Telecom',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'moderate',
    products: ['Business connectivity'],
    services: ['internet services'],
    pricingModel: 'plan pricing',
    trustSignals: ['coverage maps', 'customer service awards'],
    objectionCategory: 'none',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are reviewing connectivity plans and need pricing, coverage information, and trust signals for enterprise use.',
  },
  {
    url: 'https://www.netflix.com/',
    industry: 'Media',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Streaming service'],
    services: ['entertainment content'],
    pricingModel: 'subscription tiers',
    trustSignals: ['popular shows', 'member satisfaction'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are comparing streaming subscription tiers and need pricing clarity and trust signals around content quality.',
  },
  {
    url: 'https://www.disneyplus.com/',
    industry: 'Media',
    pageType: 'home',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'simple',
    products: ['Streaming service'],
    services: ['family plans'],
    pricingModel: 'monthly subscription',
    trustSignals: ['brand franchise', 'content exclusives'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are evaluating family streaming plans and need pricing details and trust signals for content exclusivity.',
  },
  {
    url: 'https://www.verizon.com/',
    industry: 'Telecom',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'moderate',
    products: ['Mobile plans'],
    services: ['5G coverage'],
    pricingModel: 'plan pricing',
    trustSignals: ['network reliability', 'customer ratings'],
    objectionCategory: 'price',
    companySize: '250',
    budget: '$900',
    persona: 'small_business',
    messageTemplate: 'We need mobile plan pricing, 5G coverage proof, and trust signals before switching carriers.',
  },
  {
    url: 'https://www.ocado.com/',
    industry: 'Retail',
    pageType: 'product',
    journeyStage: 'research',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Grocery delivery'],
    services: ['online order'],
    pricingModel: 'membership and delivery fees',
    trustSignals: ['customer reviews', 'delivery reliability'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We are comparing grocery delivery services and need pricing transparency, delivery reliability, and trust signals.',
  },
  {
    url: 'https://www.wholefoodsmarket.com/',
    industry: 'Retail',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'simple',
    products: ['Groceries'],
    services: ['home delivery'],
    pricingModel: 'list pricing',
    trustSignals: ['organic certification', 'brand reputation'],
    objectionCategory: 'price',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We are shopping for groceries and need to compare pricing, organic trust signals, and delivery options.',
  },
  {
    url: 'https://www.doordash.com/',
    industry: 'Food & Beverage',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Food delivery'],
    services: ['restaurant ordering'],
    pricingModel: 'delivery fee plus markup',
    trustSignals: ['partner ratings', 'delivery time estimates'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are exploring food delivery options and need pricing details, expected delivery times, and trust signals.',
  },
  {
    url: 'https://www.3m.com/3M/en_US/company-us/',
    industry: 'Manufacturing',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Industrial materials'],
    services: ['engineering support'],
    pricingModel: 'custom quote',
    trustSignals: ['industry awards', 'technical certifications'],
    objectionCategory: 'trust',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are researching industrial materials suppliers and need trust signals, technical certifications, and pricing clarity.',
  },
  {
    url: 'https://www.fedex.com/en-us/home.html',
    industry: 'Logistics',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'moderate',
    products: ['Shipping services'],
    services: ['logistics solutions'],
    pricingModel: 'weight and distance pricing',
    trustSignals: ['delivery guarantees', 'global network'],
    objectionCategory: 'none',
    companySize: '250',
    budget: '$900',
    persona: 'small_business',
    messageTemplate: 'We are comparing shipping options and need trust signals for global logistics reliability and pricing transparency.',
  },
  {
    url: 'https://www.irs.gov/',
    industry: 'Government',
    pageType: 'service',
    journeyStage: 'awareness',
    visitorIntent: 'support',
    productComplexity: 'complex',
    products: ['Tax filing guidance'],
    services: ['government services'],
    pricingModel: 'public service',
    trustSignals: ['official status', 'regulatory authority'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We need tax filing support and want official guidance, trust signals, and step-by-step next actions.',
  },
  {
    url: 'https://www.dmv.org/',
    industry: 'Government',
    pageType: 'service',
    journeyStage: 'decision',
    visitorIntent: 'support',
    productComplexity: 'simple',
    products: ['Vehicle registration'],
    services: ['appointment booking'],
    pricingModel: 'service fee',
    trustSignals: ['official portal', 'compliance information'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We want to book a vehicle registration appointment and need reliable instructions, fees, and trust signals.',
  },
  {
    url: 'https://www.redcross.org/',
    industry: 'Nonprofit',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Donations'],
    services: ['disaster relief'],
    pricingModel: 'donation-based',
    trustSignals: ['impact reports', 'charity ratings'],
    objectionCategory: 'trust',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We are evaluating charitable organizations and need trust signals, transparency, and donation guidance.',
  },
  {
    url: 'https://www.mckinsey.com/',
    industry: 'Professional services',
    pageType: 'services',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Management consulting'],
    services: ['business transformation'],
    pricingModel: 'custom project pricing',
    trustSignals: ['client case studies', 'partner credentials'],
    objectionCategory: 'trust',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are researching consulting partners and need trust signals, case studies, and pricing model transparency.',
  },
  {
    url: 'https://www.coursera.org/',
    industry: 'Education',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'moderate',
    products: ['Online courses'],
    services: ['certificate programs'],
    pricingModel: 'subscription and course fees',
    trustSignals: ['university partners', 'learner reviews'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We are evaluating online learning platforms and need pricing, accreditation, and trust signals.',
  },
  {
    url: 'https://www.peloton.com/',
    industry: 'Fitness',
    pageType: 'product',
    journeyStage: 'decision',
    visitorIntent: 'buying',
    productComplexity: 'moderate',
    products: ['Exercise equipment'],
    services: ['subscription workouts'],
    pricingModel: 'hardware plus membership',
    trustSignals: ['customer reviews', 'fitness awards'],
    objectionCategory: 'price',
    companySize: '10',
    budget: '$1200',
    persona: 'consumer',
    messageTemplate: 'We are ready to buy a connected fitness bike and need total cost, membership pricing, and trust signals.',
  },
  {
    url: 'https://www.tiffany.com/',
    industry: 'Luxury retail',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Jewelry'],
    services: ['gift services'],
    pricingModel: 'premium item pricing',
    trustSignals: ['brand heritage', 'authenticity certificate'],
    objectionCategory: 'trust',
    companySize: '10',
    budget: '$4200',
    persona: 'consumer',
    messageTemplate: 'We are comparing luxury jewelry options and need pricing guidance, authenticity proof, and trust signals.',
  },
  {
    url: 'https://www.apple.com/shop/buy-iphone',
    industry: 'Consumer electronics',
    pageType: 'product',
    journeyStage: 'decision',
    visitorIntent: 'buying',
    productComplexity: 'moderate',
    products: ['Smartphones'],
    services: ['warranty', 'trade-in'],
    pricingModel: 'tiered pricing',
    trustSignals: ['brand strength', 'reviews'],
    objectionCategory: 'price',
    companySize: '10',
    budget: '$1200',
    persona: 'consumer',
    messageTemplate: 'We are ready to buy a smartphone and need plan details, trade-in options, and trust validation.',
  },
  {
    url: 'https://www.espn.com/',
    industry: 'Media',
    pageType: 'home',
    journeyStage: 'research',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Sports content'],
    services: ['news and highlights'],
    pricingModel: 'advertising-supported',
    trustSignals: ['brand reputation', 'coverage depth'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are researching sports coverage and need trust signals around reliability, ratings, and subscription options.',
  },
  {
    url: 'https://www.taskrabbit.com/',
    industry: 'Local Businesses',
    pageType: 'service',
    journeyStage: 'decision',
    visitorIntent: 'booking',
    productComplexity: 'simple',
    products: ['Home services'],
    services: ['task booking'],
    pricingModel: 'hourly rates',
    trustSignals: ['background checks', 'reviews'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We want to book a home service provider, understand pricing, and verify trust signals like reviews and background checks.',
  },
  {
    url: 'https://www.tesla.com/',
    industry: 'Automotive',
    pageType: 'product',
    journeyStage: 'decision',
    visitorIntent: 'buying',
    productComplexity: 'complex',
    products: ['Electric vehicles'],
    services: ['charging network'],
    pricingModel: 'custom vehicle pricing',
    trustSignals: ['range ratings', 'safety awards'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are ready to inquire about an electric vehicle purchase and need pricing, charging support, and trust signals.',
  },
  {
    url: 'https://www.aarp.org/',
    industry: 'Healthcare',
    pageType: 'home',
    journeyStage: 'research',
    visitorIntent: 'support',
    productComplexity: 'moderate',
    products: ['Senior care resources'],
    services: ['insurance guidance'],
    pricingModel: 'membership and service fees',
    trustSignals: ['senior advocacy', 'research data'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We are exploring senior care resources and need trust signals, membership benefits, and support guidance.',
  },
  {
    url: 'https://www.airbnb.com/s/experiences',
    industry: 'Travel',
    pageType: 'product',
    journeyStage: 'research',
    visitorIntent: 'comparison',
    productComplexity: 'simple',
    products: ['Local experiences'],
    services: ['booking platform'],
    pricingModel: 'per experience pricing',
    trustSignals: ['host reviews', 'verified experiences'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We are comparing local experiences and need pricing transparency, host trust signals, and booking guidance.',
  },
  {
    url: 'https://www.slack.com/pricing',
    industry: 'SaaS',
    pageType: 'pricing',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'moderate',
    products: ['Collaboration software'],
    services: ['team chat'],
    pricingModel: 'per-user pricing',
    trustSignals: ['customer case studies', 'security compliance'],
    objectionCategory: 'price',
    companySize: '250',
    budget: '$900',
    persona: 'support_manager',
    messageTemplate: 'We are evaluating team collaboration pricing and need security trust signals and plan comparison details.',
  },
  {
    url: 'https://www.tesla.com/energy',
    industry: 'Energy',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Solar energy solutions'],
    services: ['energy storage'],
    pricingModel: 'custom quote',
    trustSignals: ['energy savings estimates', 'install partner ratings'],
    objectionCategory: 'price',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are researching solar solutions for our facility and need pricing transparency, trust signals, and installation guidance.',
  },
  {
    url: 'https://www.johndeere.com/en/',
    industry: 'Agriculture',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'complex',
    products: ['Agricultural equipment'],
    services: ['dealer support'],
    pricingModel: 'custom quote',
    trustSignals: ['industry reliability', 'dealer network'],
    objectionCategory: 'trust',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We need pricing for agricultural equipment and trust signals around dealer support and reliability.',
  },
  {
    url: 'https://www.homeadvisor.com/',
    industry: 'Construction',
    pageType: 'service',
    journeyStage: 'decision',
    visitorIntent: 'booking',
    productComplexity: 'moderate',
    products: ['Home repair services'],
    services: ['contractor matching'],
    pricingModel: 'project estimate',
    trustSignals: ['contractor reviews', 'license verification'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$1200',
    persona: 'consumer',
    messageTemplate: 'We are ready to book a home repair contractor and need pricing estimates, trust signals, and service guarantees.',
  },
  {
    url: 'https://www.mercedes-benz.com/en/',
    industry: 'Automotive',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Luxury vehicles'],
    services: ['leasing options'],
    pricingModel: 'MSRP plus options',
    trustSignals: ['premium reviews', 'safety awards'],
    objectionCategory: 'price',
    companySize: '10',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are comparing luxury vehicles and need pricing, safety ratings, and trust proof.',
  },
  {
    url: 'https://www.ikea.com/us/en/',
    industry: 'Retail',
    pageType: 'product',
    journeyStage: 'research',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Furniture'],
    services: ['assembly help'],
    pricingModel: 'catalog pricing',
    trustSignals: ['return policy', 'customer reviews'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'small_business',
    messageTemplate: 'We are looking for furniture and need pricing, assembly service options, and trust signals.',
  },
  {
    url: 'https://www.wellsfargo.com/',
    industry: 'Finance',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'moderate',
    products: ['Business banking'],
    services: ['loan products'],
    pricingModel: 'fee-based',
    trustSignals: ['FDIC insurance', 'customer service'],
    objectionCategory: 'trust',
    companySize: '250',
    budget: '$1200',
    persona: 'enterprise',
    messageTemplate: 'We are comparing business banking services and need pricing details, trust signals, and loan support.',
  },
  {
    url: 'https://www.gopro.com/en/us/shop',
    industry: 'Consumer electronics',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'moderate',
    products: ['Action cameras'],
    services: ['accessories'],
    pricingModel: 'retail pricing',
    trustSignals: ['product reviews', 'community stories'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$900',
    persona: 'consumer',
    messageTemplate: 'We are comparing action cameras and need pricing, product comparisons, and trust signals from reviews.',
  },
  {
    url: 'https://www.cnn.com/',
    industry: 'Media',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['News coverage'],
    services: ['article subscriptions'],
    pricingModel: 'advertising and subscription',
    trustSignals: ['journalistic reputation', 'brand recognition'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are looking for reliable news sources and need trust signals, content quality, and subscription information.',
  },
  {
    url: 'https://www.siemens.com/global/en/home.html',
    industry: 'Manufacturing',
    pageType: 'product',
    journeyStage: 'research',
    visitorIntent: 'pricing',
    productComplexity: 'complex',
    products: ['Automation systems'],
    services: ['engineering consulting'],
    pricingModel: 'custom project pricing',
    trustSignals: ['engineering awards', 'global references'],
    objectionCategory: 'trust',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are researching automation systems and need pricing estimates, trust signals, and reference projects.',
  },
  {
    url: 'https://www.evernote.com/',
    industry: 'SaaS',
    pageType: 'pricing',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'moderate',
    products: ['Productivity software'],
    services: ['note syncing'],
    pricingModel: 'subscription tiers',
    trustSignals: ['enterprise adoption', 'security controls'],
    objectionCategory: 'price',
    companySize: '250',
    budget: '$900',
    persona: 'small_business',
    messageTemplate: 'We are evaluating productivity software pricing and need trust signals around security and enterprise adoption.',
  },
  {
    url: 'https://www.uber.com/us/en/',
    industry: 'Transportation',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Ride booking'],
    services: ['delivery services'],
    pricingModel: 'dynamic pricing',
    trustSignals: ['driver ratings', 'safety features'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are comparing transportation options and need pricing transparency, safety trust signals, and booking options.',
  },
  {
    url: 'https://www.nordstrom.com/',
    industry: 'Retail',
    pageType: 'product',
    journeyStage: 'research',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Apparel'],
    services: ['personal styling'],
    pricingModel: 'retail pricing',
    trustSignals: ['brand reputation', 'return policy'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We are browsing apparel options and need trust signals around quality, return policy, and pricing.',
  },
  {
    url: 'https://www.intuit.com/',
    industry: 'Fintech',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'moderate',
    products: ['Accounting software'],
    services: ['tax support'],
    pricingModel: 'subscription pricing',
    trustSignals: ['market leadership', 'security certifications'],
    objectionCategory: 'trust',
    companySize: '250',
    budget: '$900',
    persona: 'small_business',
    messageTemplate: 'We are evaluating accounting software pricing and need trust signals around security and compliance.',
  },
  {
    url: 'https://www.uber.com/en-US/ride/',
    industry: 'Transportation',
    pageType: 'booking',
    journeyStage: 'decision',
    visitorIntent: 'booking',
    productComplexity: 'simple',
    products: ['Ride share'],
    services: ['on-demand transport'],
    pricingModel: 'dynamic fare',
    trustSignals: ['driver ratings', 'safety features'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are ready to request a ride and need details on pricing, safety, and trust signals.',
  },
  {
    url: 'https://www.procore.com/',
    industry: 'Construction',
    pageType: 'pricing',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'complex',
    products: ['Construction management software'],
    services: ['project collaboration'],
    pricingModel: 'subscription and project fees',
    trustSignals: ['customer testimonials', 'industry awards'],
    objectionCategory: 'price',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We need pricing for construction project software and trust signals around enterprise reliability.',
  },
  {
    url: 'https://www.sherwin-williams.com/homeowners',
    industry: 'Manufacturing',
    pageType: 'product',
    journeyStage: 'research',
    visitorIntent: 'research',
    productComplexity: 'moderate',
    products: ['Paint products'],
    services: ['color consultation'],
    pricingModel: 'retail pricing',
    trustSignals: ['brand history', 'product performance'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We are exploring paint products and need pricing, color services, and trust signals.',
  },
  {
    url: 'https://www.cnbc.com/',
    industry: 'Media',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['News coverage'],
    services: ['business updates'],
    pricingModel: 'advertising-supported',
    trustSignals: ['market credibility', 'expert commentary'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are looking for business and market news and need trust signals on credibility and expert sources.',
  },
  {
    url: 'https://www.mckesson.com/',
    industry: 'Healthcare',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Medical supplies'],
    services: ['supply chain management'],
    pricingModel: 'custom pricing',
    trustSignals: ['logistics reliability', 'industry certifications'],
    objectionCategory: 'trust',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are researching medical supply partners and need trust signals, certifications, and pricing clarity.',
  },
  {
    url: 'https://www.jpmorgan.com/',
    industry: 'Finance',
    pageType: 'services',
    journeyStage: 'research',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Investment banking'],
    services: ['capital markets'],
    pricingModel: 'custom fees',
    trustSignals: ['financial strength', 'market reputation'],
    objectionCategory: 'trust',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are exploring investment banking partners and need reputational trust signals and pricing model transparency.',
  },
  {
    url: 'https://www.wikipedia.org/',
    industry: 'Media',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Information resource'],
    services: ['encyclopedia content'],
    pricingModel: 'free access',
    trustSignals: ['community editing', 'citation quality'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are looking up information and need signal quality and trust indicators for the topic.',
  },
  {
    url: 'https://www.ikea.com/us/en/customer-service',
    industry: 'Retail',
    pageType: 'support',
    journeyStage: 'decision',
    visitorIntent: 'support',
    productComplexity: 'simple',
    products: ['Furniture support'],
    services: ['returns and assembly'],
    pricingModel: 'service fees',
    trustSignals: ['store policies', 'customer ratings'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We need help with a furniture order and want clear support options, trust signals, and service policy details.',
  },
  {
    url: 'https://www.indeed.com/hire',
    industry: 'Professional services',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'moderate',
    products: ['Recruiting services'],
    services: ['job posting'],
    pricingModel: 'subscription and pay-per-click',
    trustSignals: ['employer reviews', 'hiring metrics'],
    objectionCategory: 'price',
    companySize: '250',
    budget: '$900',
    persona: 'support_manager',
    messageTemplate: 'We are evaluating recruiting solutions and need pricing details, trust signals, and hiring performance evidence.',
  },
  {
    url: 'https://www.cigna.com/',
    industry: 'Healthcare',
    pageType: 'product',
    journeyStage: 'decision',
    visitorIntent: 'buying',
    productComplexity: 'complex',
    products: ['Health insurance'],
    services: ['provider network'],
    pricingModel: 'premium-based',
    trustSignals: ['accreditations', 'customer satisfaction'],
    objectionCategory: 'trust',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are choosing a health insurance plan and need trust signals, network details, and pricing clarity.',
  },
  {
    url: 'https://www.sony.com/electronics',
    industry: 'Consumer electronics',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'moderate',
    products: ['Electronics'],
    services: ['support'],
    pricingModel: 'retail pricing',
    trustSignals: ['brand history', 'product awards'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$900',
    persona: 'consumer',
    messageTemplate: 'We are comparing electronics products and need pricing, support options, and trust signals.',
  },
  {
    url: 'https://www.petco.com/',
    industry: 'Retail',
    pageType: 'product',
    journeyStage: 'research',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Pet supplies'],
    services: ['pet care'],
    pricingModel: 'catalog pricing',
    trustSignals: ['veterinarian recommendations', 'customer reviews'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We are looking for pet supplies and need pricing, product quality, and trust signals from veterinarians and reviews.',
  },
  {
    url: 'https://www.sprint.com/',
    industry: 'Telecom',
    pageType: 'pricing',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'moderate',
    products: ['Wireless plans'],
    services: ['network access'],
    pricingModel: 'plan pricing',
    trustSignals: ['coverage maps', 'customer service awards'],
    objectionCategory: 'price',
    companySize: '250',
    budget: '$900',
    persona: 'small_business',
    messageTemplate: 'We are comparing wireless plans and need pricing, coverage details, and trust signals.',
  },
  {
    url: 'https://www.suncorp.com.au/',
    industry: 'Insurance',
    pageType: 'product',
    journeyStage: 'decision',
    visitorIntent: 'buying',
    productComplexity: 'moderate',
    products: ['Home insurance'],
    services: ['claims support'],
    pricingModel: 'premium pricing',
    trustSignals: ['regulatory ratings', 'customer support'],
    objectionCategory: 'trust',
    companySize: '250',
    budget: '$1200',
    persona: 'consumer',
    messageTemplate: 'We are ready to buy home insurance and need pricing, claim service proof, and trust signals.',
  },
  {
    url: 'https://www.walmart.com/browse/electronics',
    industry: 'Retail',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'simple',
    products: ['Electronics'],
    services: ['delivery'],
    pricingModel: 'catalog pricing',
    trustSignals: ['price match', 'customer ratings'],
    objectionCategory: 'price',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We are evaluating electronics pricing and need discount details, delivery options, and trust signals.',
  },
  {
    url: 'https://www.ikea.com/us/en/rooms/',
    industry: 'Retail',
    pageType: 'product',
    journeyStage: 'research',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Home design'],
    services: ['room planning'],
    pricingModel: 'service packages',
    trustSignals: ['design awards', 'customer testimonials'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'small_business',
    messageTemplate: 'We are researching home design and need pricing, planning services, and trust signals.',
  },
  {
    url: 'https://www.diageo.com/en/',
    industry: 'Food & Beverage',
    pageType: 'product',
    journeyStage: 'research',
    visitorIntent: 'comparison',
    productComplexity: 'moderate',
    products: ['Beverage brands'],
    services: ['sustainability reporting'],
    pricingModel: 'premium pricing',
    trustSignals: ['brand heritage', 'quality certifications'],
    objectionCategory: 'trust',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are reviewing beverage suppliers and need trust signals, pricing transparency, and sustainability proof.',
  },
  {
    url: 'https://www.pepsico.com/',
    industry: 'Food & Beverage',
    pageType: 'product',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Food brands'],
    services: ['marketing support'],
    pricingModel: 'custom pricing',
    trustSignals: ['brand strength', 'supply chain transparency'],
    objectionCategory: 'trust',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are researching food brand partnerships and need pricing, trust signals, and supply chain clarity.',
  },
  {
    url: 'https://www.uber.com/business',
    industry: 'Transportation',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'moderate',
    products: ['Corporate ride programs'],
    services: ['transport management'],
    pricingModel: 'program pricing',
    trustSignals: ['enterprise customers', 'safety features'],
    objectionCategory: 'price',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are evaluating corporate transportation programs and need pricing, safety proof, and enterprise references.',
  },
  {
    url: 'https://www.barnesandnoble.com/',
    industry: 'Retail',
    pageType: 'product',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Books'],
    services: ['education resources'],
    pricingModel: 'catalog pricing',
    trustSignals: ['editor recommendations', 'author reputation'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are browsing books and need pricing, recommendations, and trust signals.',
  },
  {
    url: 'https://www.indeed.com/',
    industry: 'Professional services',
    pageType: 'product',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'moderate',
    products: ['Job search'],
    services: ['employer reviews'],
    pricingModel: 'advertising and subscriptions',
    trustSignals: ['review scores', 'company ratings'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are searching for jobs and need trust signals, employer ratings, and support resources.',
  },
  {
    url: 'https://www.adobe.com/creativecloud/plans.html',
    industry: 'SaaS',
    pageType: 'pricing',
    journeyStage: 'decision',
    visitorIntent: 'buying',
    productComplexity: 'moderate',
    products: ['Creative software'],
    services: ['cloud storage'],
    pricingModel: 'subscription tiers',
    trustSignals: ['creative industry endorsements', 'security standards'],
    objectionCategory: 'price',
    companySize: '250',
    budget: '$1200',
    persona: 'small_business',
    messageTemplate: 'We are ready to choose a creative software plan and need pricing details, storage options, and trust signals.',
  },
  {
    url: 'https://www.merriam-webster.com/',
    industry: 'Education',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Reference materials'],
    services: ['dictionary access'],
    pricingModel: 'free and premium access',
    trustSignals: ['academic credibility', 'authority'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are verifying definitions and need trust signals around authority and accuracy.',
  },
  {
    url: 'https://www.mcdonalds.com/us/en-us.html',
    industry: 'Food & Beverage',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Fast food menu'],
    services: ['mobile ordering'],
    pricingModel: 'menu pricing',
    trustSignals: ['brand familiarity', 'food safety'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are looking for meal options and need pricing, ordering details, and trust signals.',
  },
  {
    url: 'https://www.ke.com/',
    industry: 'Real Estate',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'moderate',
    products: ['Home listings'],
    services: ['agent services'],
    pricingModel: 'commission-based',
    trustSignals: ['market data', 'agent ratings'],
    objectionCategory: 'none',
    companySize: '250',
    budget: '$1200',
    persona: 'entrepreneur',
    messageTemplate: 'We are comparing home listings and need market data, agent trust signals, and commission clarity.',
  },
  {
    url: 'https://www.wellsfargo.com/personal-banking/',
    industry: 'Finance',
    pageType: 'product',
    journeyStage: 'decision',
    visitorIntent: 'buying',
    productComplexity: 'moderate',
    products: ['Personal checking'],
    services: ['mobile banking'],
    pricingModel: 'fee-based',
    trustSignals: ['FDIC insurance', 'branch network'],
    objectionCategory: 'trust',
    companySize: '250',
    budget: '$900',
    persona: 'consumer',
    messageTemplate: 'We are ready to open a bank account and need pricing, fees, and trust signals.',
  },
  {
    url: 'https://www.reddit.com/',
    industry: 'Media',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Community forums'],
    services: ['discussion boards'],
    pricingModel: 'advertising-supported',
    trustSignals: ['community moderation', 'user ratings'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are exploring discussion communities and need trust signals around moderation and user credibility.',
  },
  {
    url: 'https://www.lululemon.com/',
    industry: 'Retail',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'buying',
    productComplexity: 'simple',
    products: ['Athletic apparel'],
    services: ['gift cards'],
    pricingModel: 'premium pricing',
    trustSignals: ['product quality', 'brand reputation'],
    objectionCategory: 'price',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We are ready to buy athletic apparel and need pricing, quality assurances, and trust signals.',
  },
  {
    url: 'https://www.vmware.com/',
    industry: 'SaaS',
    pageType: 'services',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Cloud infrastructure'],
    services: ['virtualization'],
    pricingModel: 'enterprise pricing',
    trustSignals: ['security certifications', 'customer stories'],
    objectionCategory: 'trust',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are researching cloud infrastructure solutions and need pricing, security, and trust signals.',
  },
  {
    url: 'https://www.nest.com/',
    industry: 'Consumer electronics',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'moderate',
    products: ['Smart home devices'],
    services: ['installation support'],
    pricingModel: 'product and subscription',
    trustSignals: ['energy savings', 'reviews'],
    objectionCategory: 'trust',
    companySize: '10',
    budget: '$900',
    persona: 'consumer',
    messageTemplate: 'We are comparing smart home devices and need pricing, energy savings proof, and trust signals.',
  },
  {
    url: 'https://www.cvs.com/',
    industry: 'Healthcare',
    pageType: 'product',
    journeyStage: 'support',
    visitorIntent: 'support',
    productComplexity: 'simple',
    products: ['Pharmacy services'],
    services: ['prescription refill'],
    pricingModel: 'service fees',
    trustSignals: ['pharmacy accreditation', 'customer reviews'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$250',
    persona: 'consumer',
    messageTemplate: 'We need prescription assistance and want trust signals around pharmacy quality and service hours.',
  },
  {
    url: 'https://www.nature.com/',
    industry: 'Media',
    pageType: 'product',
    journeyStage: 'research',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Scientific publications'],
    services: ['journal access'],
    pricingModel: 'subscription and paywall',
    trustSignals: ['peer review', 'impact factor'],
    objectionCategory: 'trust',
    companySize: '10',
    budget: '$900',
    persona: 'consumer',
    messageTemplate: 'We are evaluating scientific resources and need trust signals around peer review and publication credibility.',
  },
  {
    url: 'https://www.hulu.com/welcome',
    industry: 'Media',
    pageType: 'home',
    journeyStage: 'research',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['Streaming service'],
    services: ['subscription'],
    pricingModel: 'monthly subscription',
    trustSignals: ['content library', 'user ratings'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are evaluating streaming services and need pricing, content depth, and trust signals.',
  },
  {
    url: 'https://www.dw.com/en/top-stories/s-9097',
    industry: 'Media',
    pageType: 'home',
    journeyStage: 'awareness',
    visitorIntent: 'research',
    productComplexity: 'simple',
    products: ['News coverage'],
    services: ['international reporting'],
    pricingModel: 'free access',
    trustSignals: ['global journalism', 'source transparency'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$75',
    persona: 'consumer',
    messageTemplate: 'We are looking for international news and need trust signals around source credibility and global reporting.',
  },
  {
    url: 'https://www.pwc.com/us/en/services.html',
    industry: 'Professional services',
    pageType: 'services',
    journeyStage: 'consideration',
    visitorIntent: 'research',
    productComplexity: 'complex',
    products: ['Assurance services'],
    services: ['auditing'],
    pricingModel: 'project pricing',
    trustSignals: ['partner credentials', 'industry recognition'],
    objectionCategory: 'trust',
    companySize: '1200+',
    budget: '$4200',
    persona: 'enterprise',
    messageTemplate: 'We are evaluating assurance providers and need trust signals, partner experience, and pricing clarity.',
  },
  {
    url: 'https://www.kaspersky.com/',
    industry: 'Technology',
    pageType: 'product',
    journeyStage: 'consideration',
    visitorIntent: 'pricing',
    productComplexity: 'complex',
    products: ['Security software'],
    services: ['threat protection'],
    pricingModel: 'subscription tiers',
    trustSignals: ['security certifications', 'independent testing'],
    objectionCategory: 'trust',
    companySize: '250',
    budget: '$900',
    persona: 'small_business',
    messageTemplate: 'We are comparing security software pricing and need trust signals around certifications and independent test results.',
  },
  {
    url: 'https://www.disneyworld.disney.go.com/',
    industry: 'Travel',
    pageType: 'booking',
    journeyStage: 'decision',
    visitorIntent: 'booking',
    productComplexity: 'complex',
    products: ['Theme park tickets'],
    services: ['vacation packages'],
    pricingModel: 'ticket bundles',
    trustSignals: ['brand reputation', 'guest experience reviews'],
    objectionCategory: 'none',
    companySize: '10',
    budget: '$1200',
    persona: 'consumer',
    messageTemplate: 'We are ready to book a theme park vacation and need pricing, package options, and trust signals.',
  },
];

const realWorldCases: RealWorldEvaluationCase[] = websiteProfiles.map((profile) => {
  const planGoal = visitorIntentToGoal[profile.visitorIntent];
  const missingQualification = profile.journeyStage === 'awareness' || profile.objectionCategory !== 'none' ? ['budget'] : [];
  const plan = {
    goal: planGoal,
    customerIntent: profile.visitorIntent === 'buying' ? 'buying' : profile.visitorIntent === 'support' ? 'support' : 'evaluating',
    funnelStage: journeyToFunnel[profile.journeyStage],
    missingQualification,
  } as const;
  const leadScore = (() => {
    const base = profile.journeyStage === 'awareness' ? 30 : profile.journeyStage === 'consideration' ? 55 : 80;
    const budgetBonus = Number(profile.budget.replace(/[^0-9]/g, '')) >= 900 ? 10 : 0;
    const objectionPenalty = profile.objectionCategory === 'none' ? 0 : 10;
    return Math.min(95, Math.max(20, base + budgetBonus - objectionPenalty));
  })();
  const trustLevel = profile.trustSignals.length >= 2 ? 'high' : profile.trustSignals.length === 1 ? 'medium' : 'low';
  const message = profile.messageTemplate.replace(/\{products\}/g, profile.products.join(', ')).replace(/\{pricingModel\}/g, profile.pricingModel);
  const expected = {
    recommendedPlan: choosePlanRecommendation(profile.budget, profile.companySize, false, planGoal),
    nextStep: chooseNextStep(profile.visitorIntent, planGoal, profile.objectionCategory),
    ctaId: chooseCtaFromIntent(profile.visitorIntent, profile.industry, planGoal, profile.objectionCategory),
    crmBucket: profile.journeyStage === 'decision' || profile.visitorIntent === 'buying' || profile.companySize === '1200+' ? 'hot' : profile.journeyStage === 'consideration' || trustLevel === 'high' ? 'warm' : 'cold',
    calendarBooking: shouldTriggerBooking(message, planGoal),
    qualificationTiming: missingQualification.length > 0,
    objectionHandling: profile.objectionCategory !== 'none',
    trustSignalsUsed: profile.trustSignals.length > 0,
  } as const;

  return {
    ...profile,
    title: `${profile.url} — ${profile.industry} / ${profile.pageType} / ${profile.journeyStage}`,
    message,
    plan,
    leadScore,
    trustLevel,
    expected,
    ciOverrides: profile.objectionCategory !== 'none' ? {
      objection: {
        isObjection: true,
        category: profile.objectionCategory,
        groundedAnswer: `Addressing ${profile.objectionCategory} concern in a realistic website journey.`,
        sources: [],
      },
    } : undefined,
  };
});

function fillMessage(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
}

function chooseCtaFromIntent(intent: VisitorIntentCategory, industry: string, goal: ConversationGoal, objection: ObjectionCategory) {
  if (goal === 'schedule_demo' || intent === 'booking') return 'book-demo';
  if (intent === 'pricing') return industry === 'E-commerce' ? 'request-quote' : 'compare-plans';
  if (intent === 'comparison') return 'compare-plans';
  if (industry === 'Healthcare' || industry === 'Professional services' || industry === 'Real Estate') return 'contact-sales';
  if (intent === 'support') return 'start-free-trial';
  if (objection !== 'none') return 'contact-sales';
  return 'contact-sales';
}

function choosePlanRecommendation(budget: string, companySize: string, existingCustomer: boolean, goal: ConversationGoal) {
  const budgetValue = Number(budget.replace(/[^0-9]/g, ''));
  if (existingCustomer || goal === 'schedule_demo') return 'Enterprise';
  if (budgetValue >= 4200 || /1200\+/.test(companySize)) return 'Enterprise';
  if (budgetValue >= 900) return 'Professional';
  return 'Starter';
}

function chooseNextStep(intent: VisitorIntentCategory, goal: ConversationGoal, objection: ObjectionCategory) {
  if (goal === 'qualify') return 'ask_qualification';
  if (goal === 'schedule_demo') return 'schedule_demo';
  if (objection === 'price') return 'recommend_trial';
  if (intent === 'pricing') return 'review_pricing';
  if (intent === 'buying') return 'recommend_trial';
  if (intent === 'comparison') return 'review_pricing';
  return 'continue_education';
}

function shouldTriggerBooking(message: string, goal: ConversationGoal) {
  return goal === 'schedule_demo' || /demo|book|schedule|walkthrough|appointment|order|book a room/.test(message.toLowerCase());
}

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
    trustSignal: { shouldInject: overrides.trustSignal?.shouldInject ?? false, signalType: overrides.trustSignal?.signalType, reason: overrides.trustSignal?.reason },
    buyingIntent: { hasBuyingIntent: false, confidence: 0.5 },
    objection: overrides.objection ?? { isObjection: false, category: 'none', groundedAnswer: '', sources: [] },
    qualification: overrides.qualification ?? { questionsAskedCount: 0, completed: false },
    qualificationProgress: overrides.qualificationProgress ?? 0,
    persona: overrides.persona ?? { persona: 'unknown', confidence: 0.5, reasoning: 'baseline' },
    funnelStage: overrides.funnelStage ?? 'awareness',
    cta: overrides.cta ?? { primaryCTA: 'none', label: 'None', link: '' },
    quickReplies: [],
    uiState: { buttons: [], suggestedActions: [] },
    sources: [],
    isFallback: false,
    turnCount: 1,
    ...overrides,
  } as ConversationIntelligenceResult;
}

function createBenchmarkMemory(caseDef: RealWorldEvaluationCase): ConversationMemoryData {
  const memory = createMemory();
  Object.assign(memory, {
    persona: caseDef.persona,
    industry: caseDef.industry,
    companySize: caseDef.companySize,
    budget: caseDef.budget,
    trustLevel: caseDef.trustLevel,
    leadScore: caseDef.leadScore,
    buyingIntentDetected: caseDef.visitorIntent === 'buying',
    qualificationCollected: {
      questionsAskedCount: caseDef.plan.missingQualification.length ? 1 : 0,
      completed: caseDef.plan.missingQualification.length === 0,
    },
    turnCount: 4,
    funnelStage: caseDef.plan.funnelStage,
    currentStage: caseDef.plan.funnelStage === 'pricing' ? 'pricing' : 'education',
    contextSummary: {
      lastUpdatedAtTurn: 4,
      buyingIntent: caseDef.visitorIntent === 'buying' ? 'high' : 'medium',
      keyTopics: caseDef.products,
      objections: caseDef.objectionCategory === 'none' ? [] : [caseDef.objectionCategory],
      missingQualification: caseDef.plan.missingQualification,
    },
    contextSummaryTurn: 4,
    salesSignals: {
      objections: caseDef.objectionCategory === 'none' ? [] : [caseDef.objectionCategory],
      competitors: caseDef.products.some((product) => /compare|competitor|alternative/.test(product.toLowerCase())) ? ['competitor'] : [],
      integrations: /integration|api|webhook|connect/i.test(caseDef.message) ? ['integration'] : [],
      painPoints: caseDef.objectionCategory === 'none' ? [] : [caseDef.objectionCategory],
      trustIssues: caseDef.trustSignals,
      ctaRejections: [],
      urgencySignals: /urgent|ready|ASAP|today|soon/.test(caseDef.message.toLowerCase()) ? ['timeline pressure'] : [],
      authoritySignals: /enterprise|procurement|leadership|director|manager/i.test(caseDef.message) ? ['decision-maker'] : [],
      timelineSignals: [],
      budget: caseDef.budget,
      deadline: undefined,
    },
  });

  return memory;
}

function evaluateBenchmarkCase(caseDef: RealWorldEvaluationCase): BenchmarkOutcome {
  // build canonical inputs using shared fixture builder
  const { memory, ciResult, plan: canonicalPlan } = buildCanonicalBenchmarkInputs(caseDef);
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
  const failureCategories: RealWorldFailureCategory[] = [];
  if (!correct.recommendedPlan) failureCategories.push('wrong_product_recommendation');
  if (!correct.ctaId) failureCategories.push('wrong_cta');
  if (!correct.nextStep) failureCategories.push('wrong_next_best_action');
  if (!correct.crmBucket) failureCategories.push('wrong_crm_classification');
  if (!correct.calendarBooking) failureCategories.push('incorrect_booking_timing');
  if (!correct.qualificationTiming) failureCategories.push('incorrect_qualification_timing');
  if (!correct.objectionHandling) failureCategories.push('missed_objection');
  if (!correct.trustSignalsUsed) failureCategories.push('missing_trust_signal');

  const highValuePersonalization =
    caseDef.companySize === '1200+' ||
    caseDef.persona === 'enterprise' ||
    caseDef.budget === '$4200' ||
    caseDef.trustLevel === 'high';
  const weakPersonalization = highValuePersonalization &&
    (result.recommendedPlan === 'Starter' || result.playbook.cta.id === 'contact-sales' || result.nextStep === 'continue_education');
  if (weakPersonalization) {
    failureCategories.push('weak_personalization');
    rootCauses.push('Personalization mismatch: high-value case received a generic plan/CTA/action.');
  }
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
    url: caseDef.url,
    expected: caseDef.expected,
    actual,
    correct,
    rootCauses,
    failureCategories,
  };
}

function safeLabels<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values));
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

function computeMetrics(outcomes: BenchmarkOutcome[]): RealWorldEvaluationMetrics {
  const industries = Array.from(new Set(outcomes.map((item) => item.industry)));
  const allPlans = safeLabels(outcomes.map((outcome) => outcome.actual.recommendedPlan as string));
  const allSteps = safeLabels(outcomes.map((outcome) => outcome.actual.nextStep));
  const allCTAs = safeLabels(outcomes.map((outcome) => outcome.actual.ctaId));
  const allBuckets = ['cold', 'warm', 'hot'] as const;

  const confusionMatrix = {
    recommendedPlan: createConfusionMatrix(allPlans),
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

  const binaryAspects = ['calendarBooking', 'qualificationTiming', 'objectionHandling', 'trustSignalsUsed'] as const;
  const binaryStats = binaryAspects.reduce((acc, aspect) => ({
    ...acc,
    [aspect]: { tp: 0, fp: 0, fn: 0, tn: 0 },
  }), {} as Record<typeof binaryAspects[number], { tp: number; fp: number; fn: number; tn: number }>);

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

    for (const aspect of binaryAspects) {
      const expected = outcome.expected[aspect];
      const actual = outcome.actual[aspect];
      if (expected && actual) binaryStats[aspect].tp += 1;
      if (!expected && actual) binaryStats[aspect].fp += 1;
      if (expected && !actual) binaryStats[aspect].fn += 1;
      if (!expected && !actual) binaryStats[aspect].tn += 1;
    }
  }

  const buildBinary = (stats: { tp: number; fp: number; fn: number; tn: number }) => {
    const precision = stats.tp + stats.fp > 0 ? stats.tp / (stats.tp + stats.fp) : 0;
    const recall = stats.tp + stats.fn > 0 ? stats.tp / (stats.tp + stats.fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    return { ...stats, precision, recall, f1 };
  };

  return {
    accuracy: Object.values(aspectCorrect).reduce((sum, val) => sum + val, 0) / Object.values(aspectTotals).reduce((sum, val) => sum + val, 0),
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
    binaryMetrics: {
      calendarBooking: buildBinary(binaryStats.calendarBooking),
      qualificationTiming: buildBinary(binaryStats.qualificationTiming),
      objectionHandling: buildBinary(binaryStats.objectionHandling),
      trustSignalsUsed: buildBinary(binaryStats.trustSignalsUsed),
    },
  };
}

function compareWithSyntheticMetrics(real: RealWorldEvaluationMetrics, synthetic: RealWorldEvaluationMetrics): SyntheticComparison {
  const deltaAspectAccuracy = {} as RealWorldEvaluationMetrics['aspectAccuracy'];
  for (const key of Object.keys(real.aspectAccuracy) as Array<keyof RealWorldEvaluationMetrics['aspectAccuracy']>) {
    deltaAspectAccuracy[key] = real.aspectAccuracy[key] - synthetic.aspectAccuracy[key];
  }

  const realIndustries = Object.keys(real.perIndustryAccuracy);
  return {
    syntheticAccuracy: synthetic.accuracy,
    syntheticAspectAccuracy: synthetic.aspectAccuracy,
    deltaAccuracy: real.accuracy - synthetic.accuracy,
    deltaAspectAccuracy,
    deltaPerIndustryAccuracy: Object.fromEntries(realIndustries.map((industry) => [industry, real.perIndustryAccuracy[industry] - (synthetic.perIndustryAccuracy[industry] ?? 0)])),
  };
}

function collectFailureModeCounts(outcomes: BenchmarkOutcome[]) {
  return outcomes.reduce<Record<RealWorldFailureCategory, number>>((acc, outcome) => {
    for (const category of outcome.failureCategories) {
      acc[category] = (acc[category] || 0) + 1;
    }
    return acc;
  }, {
    wrong_product_recommendation: 0,
    wrong_cta: 0,
    wrong_next_best_action: 0,
    wrong_crm_classification: 0,
    incorrect_booking_timing: 0,
    incorrect_qualification_timing: 0,
    missed_objection: 0,
    missing_trust_signal: 0,
    weak_personalization: 0,
  });
}

const failureModeRecommendations: Record<RealWorldFailureCategory, string> = {
  wrong_product_recommendation: 'Add a stronger product-plan mapping layer in orchestration that weighs persona, budget, and product complexity before plan selection.',
  wrong_cta: 'Enhance CTA selection rules by including industry-specific booking and demo heuristics for complex purchase stages.',
  wrong_next_best_action: 'Refine next-step logic to prioritize qualification or demo paths when objections or buying triggers are present.',
  wrong_crm_classification: 'Improve CRM bucket inference by combining lead score, trust signals, and buyer stage before categorical assignment.',
  incorrect_qualification_timing: 'Adjust qualification timing to ask budget or timeline questions earlier for awareness cases and later for decision-stage flows.',
  missed_objection: 'Surface objection signals sooner in the orchestration layer and mark the conversation as objection-handling ready when price/trust cues are present.',
  missing_trust_signal: 'Inject trust signal checks into the playbook builder when content includes security, customer proof, or enterprise context.',
  weak_personalization: 'Use persona and company-size conditions earlier in orchestration to select higher-tier plans and enterprise-focused CTAs for high-value visitors.',
  incorrect_booking_timing: 'Refine booking trigger rules to better distinguish immediate demo/order intent from informational browsing or support journeys.',
};

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function renderConfusionMatrix(matrix: Record<string, Record<string, number>>): string {
  const headers = Object.keys(matrix[Object.keys(matrix)[0]]);
  const headerRow = `| Expected \\ Predicted | ${headers.map((header) => header).join(' | ')} |`;
  const separatorRow = `| --- | ${headers.map(() => '---').join(' | ')} |`;
  const rows = Object.entries(matrix).map(([expected, row]) => {
    const values = headers.map((predicted) => row[predicted]?.toString() ?? '0').join(' | ');
    return `| ${expected} | ${values} |`;
  });
  return [headerRow, separatorRow, ...rows].join('\n');
}

function generateFreezeDecision(metrics: RealWorldEvaluationMetrics) {
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

  return `- Overall accuracy: ${formatPercent(metrics.accuracy)} / 80% (${metrics.accuracy >= 0.80 ? 'PASS' : 'FAIL'})\n` +
    `- Recommended plan accuracy: ${formatPercent(metrics.aspectAccuracy.recommendedPlan)} / 70% (${metrics.aspectAccuracy.recommendedPlan >= 0.70 ? 'PASS' : 'FAIL'})\n` +
    `- Next step accuracy: ${formatPercent(metrics.aspectAccuracy.nextStep)} / 75% (${metrics.aspectAccuracy.nextStep >= 0.75 ? 'PASS' : 'FAIL'})\n` +
    `- CTA accuracy: ${formatPercent(metrics.aspectAccuracy.ctaId)} / 75% (${metrics.aspectAccuracy.ctaId >= 0.75 ? 'PASS' : 'FAIL'})\n` +
    `- CRM classification accuracy: ${formatPercent(metrics.aspectAccuracy.crmBucket)} / 70% (${metrics.aspectAccuracy.crmBucket >= 0.70 ? 'PASS' : 'FAIL'})\n` +
    `- Trust signal usage accuracy: ${formatPercent(metrics.aspectAccuracy.trustSignalsUsed)} / 70% (${metrics.aspectAccuracy.trustSignalsUsed >= 0.70 ? 'PASS' : 'FAIL'})\n` +
    `- Booking trigger F1: ${formatPercent(metrics.binaryMetrics.calendarBooking.f1)} / 80% (${metrics.binaryMetrics.calendarBooking.f1 >= 0.80 ? 'PASS' : 'FAIL'})\n` +
    `- Qualification timing F1: ${formatPercent(metrics.binaryMetrics.qualificationTiming.f1)} / 85% (${metrics.binaryMetrics.qualificationTiming.f1 >= 0.85 ? 'PASS' : 'FAIL'})\n` +
    `- Objection handling F1: ${formatPercent(metrics.binaryMetrics.objectionHandling.f1)} / 80% (${metrics.binaryMetrics.objectionHandling.f1 >= 0.80 ? 'PASS' : 'FAIL'})\n` +
    `- Trust signal usage F1: ${formatPercent(metrics.binaryMetrics.trustSignalsUsed.f1)} / 75% (${metrics.binaryMetrics.trustSignalsUsed.f1 >= 0.75 ? 'PASS' : 'FAIL'})\n` +
    `- Per-industry minimum accuracy: ${formatPercent(Math.min(...Object.values(metrics.perIndustryAccuracy)))} / 70% (${Object.values(metrics.perIndustryAccuracy).every((value) => value >= 0.70) ? 'PASS' : 'FAIL'})\n` +
    `\n**Freeze recommendation:** ${pass ? 'PROCEED TO FREEZE' : 'DO NOT FREEZE'}\n`;
}

function generateReport(outcomes: BenchmarkOutcome[], metrics: RealWorldEvaluationMetrics, syntheticMetrics: RealWorldEvaluationMetrics, comparison: SyntheticComparison) {
  const failures = outcomes.filter((outcome) => Object.values(outcome.correct).some((value) => !value));
  const sortedIndustries = Object.entries(metrics.perIndustryAccuracy).sort((a, b) => b[1] - a[1]);
  const failureModeCounts = collectFailureModeCounts(outcomes);
  const sortedFailureModes = Object.entries(failureModeCounts).sort((a, b) => b[1] - a[1]);

  return `# Sales Conversion Real-World Evaluation Benchmark\n\n## Summary\n` +
    `- Cases evaluated: ${outcomes.length}\n` +
    `- Overall accuracy: ${formatPercent(metrics.accuracy)}\n` +
    `- Recommended plan accuracy: ${formatPercent(metrics.aspectAccuracy.recommendedPlan)}\n` +
    `- Next best action accuracy: ${formatPercent(metrics.aspectAccuracy.nextStep)}\n` +
    `- CTA accuracy: ${formatPercent(metrics.aspectAccuracy.ctaId)}\n` +
    `- CRM classification accuracy: ${formatPercent(metrics.aspectAccuracy.crmBucket)}\n` +
    `- Booking timing accuracy: ${formatPercent(metrics.aspectAccuracy.calendarBooking)}\n` +
    `- Qualification timing accuracy: ${formatPercent(metrics.aspectAccuracy.qualificationTiming)}\n` +
    `- Objection handling accuracy: ${formatPercent(metrics.aspectAccuracy.objectionHandling)}\n` +
    `- Trust signal usage accuracy: ${formatPercent(metrics.aspectAccuracy.trustSignalsUsed)}\n\n` +
    `## Synthetic benchmark comparison\n` +
    `- Synthetic overall accuracy: ${formatPercent(comparison.syntheticAccuracy)}\n` +
    `- Real-world overall accuracy: ${formatPercent(metrics.accuracy)}\n` +
    `- Accuracy delta: ${formatPercent(comparison.deltaAccuracy)}\n` +
    `- Real-world vs synthetic per-industry deltas: ${Object.entries(comparison.deltaPerIndustryAccuracy).map(([industry, delta]) => `${industry}: ${formatPercent(delta)}`).join(', ')}\n\n` +
    `## Per-industry accuracy\n` +
    `| Industry | Accuracy |\n` +
    `| --- | ---: |\n` +
    sortedIndustries.map(([industry, value]) => `| ${industry} | ${formatPercent(value)} |`).join('\n') +
    `\n\n## Confusion matrices\n\n### Recommended plan\n${renderConfusionMatrix(metrics.confusionMatrix.recommendedPlan)}\n\n` +
    `### Next best action\n${renderConfusionMatrix(metrics.confusionMatrix.nextStep)}\n\n` +
    `### CTA selection\n${renderConfusionMatrix(metrics.confusionMatrix.ctaId)}\n\n` +
    `### CRM bucket\n${renderConfusionMatrix(metrics.confusionMatrix.crmBucket)}\n\n` +
    `## Binary metrics\n` +
    `| Aspect | Precision | Recall | F1 |\n` +
    `| --- | ---: | ---: | ---: |\n` +
    `| Booking trigger | ${formatPercent(metrics.binaryMetrics.calendarBooking.precision)} | ${formatPercent(metrics.binaryMetrics.calendarBooking.recall)} | ${formatPercent(metrics.binaryMetrics.calendarBooking.f1)} |\n` +
    `| Qualification timing | ${formatPercent(metrics.binaryMetrics.qualificationTiming.precision)} | ${formatPercent(metrics.binaryMetrics.qualificationTiming.recall)} | ${formatPercent(metrics.binaryMetrics.qualificationTiming.f1)} |\n` +
    `| Objection handling | ${formatPercent(metrics.binaryMetrics.objectionHandling.precision)} | ${formatPercent(metrics.binaryMetrics.objectionHandling.recall)} | ${formatPercent(metrics.binaryMetrics.objectionHandling.f1)} |\n` +
    `| Trust signal usage | ${formatPercent(metrics.binaryMetrics.trustSignalsUsed.precision)} | ${formatPercent(metrics.binaryMetrics.trustSignalsUsed.recall)} | ${formatPercent(metrics.binaryMetrics.trustSignalsUsed.f1)} |\n\n` +
    `## Failure analysis\n` +
    `- Total failing cases: ${failures.length}\n\n` +
    failures.map((outcome) => `### ${outcome.title}\n` +
      `- URL: ${outcome.url}\n` +
      `- Failure categories: ${outcome.failureCategories.join(', ')}\n` +
      `- Expected plan: ${outcome.expected.recommendedPlan}, actual: ${outcome.actual.recommendedPlan}\n` +
      `- Expected next step: ${outcome.expected.nextStep}, actual: ${outcome.actual.nextStep}\n` +
      `- Expected CTA: ${outcome.expected.ctaId}, actual: ${outcome.actual.ctaId}\n` +
      `- Expected bucket: ${outcome.expected.crmBucket}, actual: ${outcome.actual.crmBucket}\n` +
      `- Expected booking: ${outcome.expected.calendarBooking ? 'trigger' : 'no trigger'} but got ${outcome.actual.calendarBooking ? 'trigger' : 'none'}\n` +
      `- Expected qualification timing: ${outcome.expected.qualificationTiming ? 'ask_qualification' : 'no qualification prompt'} but got ${outcome.actual.qualificationTiming ? 'ask_qualification' : 'none'}\n` +
      `- Expected objection handling: ${outcome.expected.objectionHandling ? 'detected' : 'not detected'} but got ${outcome.actual.objectionHandling ? 'detected' : 'not detected'}\n` +
      `- Expected trust signal usage: ${outcome.expected.trustSignalsUsed ? 'used' : 'not used'} but got ${outcome.actual.trustSignalsUsed ? 'used' : 'not used'}\n` +
      `- Root causes: ${outcome.rootCauses.join('; ')}\n`).join('\n') +
    `\n## Common failure patterns\n` +
    `- ${collectCommonFailures(failures).join('\n- ')}\n\n` +
    `## Ranked failure modes\n` +
    sortedFailureModes.map(([mode, count]) => `- ${mode}: ${count} case${count !== 1 ? 's' : ''} - ${failureModeRecommendations[mode as RealWorldFailureCategory]}`).join('\n') +
    `\n\n` +
    `## Improvement recommendations\n` +
    sortedFailureModes.map(([mode]) => `- ${failureModeRecommendations[mode as RealWorldFailureCategory]}`).join('\n') +
    `\n\n` +
    `## Freeze decision\n${generateFreezeDecision(metrics)}\n`;
}

function collectCommonFailures(failures: BenchmarkOutcome[]) {
  const patterns = failures.flatMap((outcome) => outcome.rootCauses);
  const counts = patterns.reduce<Record<string, number>>((acc, cause) => ({ ...acc, [cause]: (acc[cause] || 0) + 1 }), {});
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([cause, count]) => `${cause} (${count} cases)`);
}

export async function runSalesConversionRealWorldBenchmark(outputPath?: string): Promise<RealWorldBenchmarkResult> {
  const outcomes = realWorldCases.map(evaluateBenchmarkCase);
  const metrics = computeMetrics(outcomes);
  const syntheticResult = await runSalesConversionBenchmark();
  const syntheticMetrics = syntheticResult.metrics as RealWorldEvaluationMetrics;
  const comparison = compareWithSyntheticMetrics(metrics, syntheticMetrics);
  const reportPath = outputPath || path.resolve(__dirname, '..', 'SALES_CONVERSION_REAL_WORLD_BENCHMARK.md');
  const freezeReportPath = path.resolve(__dirname, '..', 'SALES_CONVERSION_REAL_WORLD_FREEZE_REPORT.md');

  const report = generateReport(outcomes, metrics, syntheticMetrics, comparison);
  await fs.writeFile(reportPath, report, 'utf8');
  await fs.writeFile(freezeReportPath, generateFreezeDecision(metrics), 'utf8');

  return { outcomes, metrics, syntheticMetrics, syntheticComparison: comparison, reportPath, freezeReportPath };
}
