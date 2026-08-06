const fs = require('fs');
const cases = JSON.parse(fs.readFileSync('packages/conversation-orchestrator/tmp-failure-analysis.json','utf8'));

function normalize(s){return (s||'').toLowerCase();}
function extractText(summary, pricingModel){return `${summary||''} ${pricingModel||''}`.toLowerCase();}
function hasBudgetSignal(message, pricingModel, budget){
  const summary = extractText(message, pricingModel);
  if(budget && /\$\s*\d/.test(budget)) return true;
  return /\$\s*\d|budget|budgets?|budgeted|spend|price range|pricing range|estimate|estimated|investment|funding|budget plan/.test(summary);
}
function hasDecisionAuthoritySignal(message){
  const summary = (message||'').toLowerCase();
  return /(decision maker|decision authority|approver|procurement|vendor evaluation|stakeholder|sponsor|executive approval|authority)/.test(summary);
}
function hasTimelineSignal(message){
  const summary=(message||'').toLowerCase();
  return /(timeline|next quarter|quarter|month|weeks?|asap|soon|immediately|within 30 days|within 60 days|by .*\b)/.test(summary);
}
function hasProcurementSignal(message){
  const summary=(message||'').toLowerCase();
  return /(procurement|vendor evaluation|request for proposal|rfp|vendor selection|vendor comparison|evaluation process)/.test(summary);
}
function hasPlanComparisonSignal(message){
  const summary=(message||'').toLowerCase();
  return /(compare|vs|competitor|alternative|compare plans|comparison)/.test(summary);
}
function detectVisitorIntent(message){
  const lower=(message||'').toLowerCase();
  const evidence=[];
  let intent='General Information';
  let confidence=0.45;
  if(/(buy|purchase|sign up|start trial|get started|free trial)/.test(lower)) { intent='Buying'; confidence=0.9; evidence.push('Explicit buying language'); }
  else if(/(pricing|price|cost|plans|tiers)/.test(lower)) { intent='Pricing'; confidence=0.85; evidence.push('Pricing inquiry'); }
  else if(/(compare|vs|competitor|alternative)/.test(lower)) { intent='Comparison'; confidence=0.8; evidence.push('Comparison language'); }
  else if(/(demo|book|schedule|appointment|call)/.test(lower)) { intent='Booking'; confidence=0.85; evidence.push('Booking request'); }
  else if(/(support|help|issue|problem|ticket)/.test(lower)) { intent='Support'; confidence=0.75; evidence.push('Support ask'); }
  else if(/(security|compliance|privacy|soc2|gdpr)/.test(lower)) { intent='Product Research'; confidence=0.7; evidence.push('Security concerns'); }
  return {primaryIntent:intent,confidence,supportingEvidence:evidence};
}

function computeForCase(c){
  const pageType=c.pageType||'';
  const message=c.messageTemplate||'';
  const pricingModel=c.pricingModel||'';
  const journeyStage=c.journeyStage||'';
  const visitorIntent=c.visitorIntent||'';
  const budget=c.budget||'';
  const detected=detectVisitorIntent(message);
  const intentNorm=normalize(detected.primaryIntent);
  const features = {
    isPricingIntent: intentNorm.includes('pricing'),
    isComparisonIntent: intentNorm.includes('comparison'),
    isBuyingIntent: intentNorm.includes('buy'),
    isBookingIntent: intentNorm.includes('booking'),
    isSupportIntent: intentNorm.includes('support'),
    isResearchIntent: intentNorm.includes('research') || intentNorm.includes('product research') || intentNorm.includes('general'),
    hasPricingInfo: /pricing|price|plan|tier|cost|quote/.test(`${message} ${pricingModel}`),
    hasDemoPath: /demo|book|schedule|contact|request/.test(`${message}`),
    atDecisionStage: normalize(journeyStage).includes('decision'),
    atConsideration: normalize(journeyStage).includes('consideration'),
    atAwareness: normalize(journeyStage).includes('awareness'),
  };
  const pageTypePricing = normalize(pageType).includes('pricing');
  const strongFinancialContext = features.isPricingIntent || features.isComparisonIntent || pageTypePricing || features.hasPricingInfo;
  const budgetSig = hasBudgetSignal(message, pricingModel, budget);
  const planComp = hasPlanComparisonSignal(message);
  const decisionAuth = hasDecisionAuthoritySignal(message);
  const timeline = hasTimelineSignal(message);
  const procurement = hasProcurementSignal(message);
  const supportiveEvidence = budgetSig || procurement || planComp || decisionAuth || timeline;
  const purchaseMomentum = features.atDecisionStage || features.isBuyingIntent || features.isComparisonIntent || features.isPricingIntent || pageTypePricing;
  const explicitPricingSignal = pageTypePricing && (features.isPricingIntent || features.isComparisonIntent || features.hasPricingInfo);
  const pricingReady = (explicitPricingSignal && purchaseMomentum) || (strongFinancialContext && supportiveEvidence && purchaseMomentum);

  // readiness scoring
  const qualificationSignals = { budget: budgetSig, decisionAuthority: decisionAuth, timeline, planComparison: planComp };
  const qualificationNeeded = !qualificationSignals.budget || !qualificationSignals.decisionAuthority || !qualificationSignals.timeline || !qualificationSignals.planComparison;
  const explicitPricingContext = pageTypePricing && (features.isPricingIntent || features.isComparisonIntent || features.hasPricingInfo);

  const readinessDefinitions = [
    { level: 'Awareness', predicates: [f=>f.atAwareness, f=>f.isResearchIntent, f=>!f.hasPricingInfo && !f.hasDemoPath, f=>!f.isPricingIntent && !f.isComparisonIntent ] },
    { level: 'Education', predicates: [f=>f.atConsideration, f=>f.hasDemoPath, f=>f.isSupportIntent, f=>f.isResearchIntent && !f.atAwareness] },
    { level: 'Qualification', predicates: [f=>false /* planGoal handled elsewhere */, f=>qualificationNeeded && (features.isPricingIntent || features.isComparisonIntent || features.isBuyingIntent || features.atDecisionStage)] },
    { level: 'Pricing', predicates: [()=>pricingReady] },
    { level: 'Sales', predicates: [f=>f.isBookingIntent, f=>f.atDecisionStage && f.isBuyingIntent, f=>f.isComparisonIntent && f.atDecisionStage] }
  ];
  const readinessScores = readinessDefinitions.map(({level,predicates})=>({level,score:predicates.reduce((s,p)=>s+(p(features)?1:0),0)}));
  const priority = {Awareness:1,Education:2,Qualification:3,Pricing:4,Sales:5};
  let readinessStage = readinessScores.reduce((current,next)=>{ if(next.score>current.score) return next; if(next.score===current.score && priority[next.level]>priority[current.level]) return next; return current; }, readinessScores[0]).level;
  // final booleans
  const readiness = {
    stage: readinessStage,
    awarenessReady: true,
    educationReady: readinessStage!=='Awareness',
    qualificationReady: readinessStage==='Qualification' || readinessStage==='Pricing' || readinessStage==='Sales',
    pricingReady: readinessStage==='Pricing' || readinessStage==='Sales',
    salesReady: readinessStage==='Sales'
  };

  // consultative score
  const pickIndustryTemplate = (industry)=>{ const n=normalize(industry||''); if(n.includes('saas')||n.includes('software')) return 'SaaS'; if(n.includes('ecommerce')||n.includes('retail')||n.includes('shop')) return 'E-commerce'; if(n.includes('healthcare')||n.includes('medical')) return 'Healthcare'; if(n.includes('agency')||n.includes('marketing')||n.includes('creative')) return 'Agencies'; if(n.includes('restaurant')||n.includes('food')||n.includes('hospitality')) return 'Restaurants'; if(n.includes('real estate')||n.includes('property')) return 'Real Estate'; if(n.includes('manufacturing')||n.includes('industrial')) return 'Manufacturing'; if(n.includes('professional')||n.includes('services')||n.includes('consulting')) return 'Professional services'; if(n.includes('finance')||n.includes('banking')||n.includes('financial')) return 'Finance'; if(n.includes('insurance')) return 'Insurance'; if(n.includes('travel')||n.includes('hospitality')) return 'Travel'; return 'SaaS'; };
  const industryTemplate = pickIndustryTemplate(c.industry||'');
  const consultativeIndustries = new Set(['Healthcare','Professional services','Real Estate','Manufacturing','Finance','Travel','Insurance','Agencies']);
  const trustSignalsCount = (c.trustSignals && c.trustSignals.length) || 0;
  const consultativeScore = Number(consultativeIndustries.has(industryTemplate)) + Number(trustSignalsCount>=2) + Number(features.atDecisionStage) + Number(features.isResearchIntent);
  const contactSalesPreferred = consultativeScore>=2;

  // determine nextStep and CTA using same logic
  let nextStep='continue_education';
  let cta = {id:'book-demo',label:'Book Demo'};
  let pricingStrategy='answer_directly';
  let recommendationStrategy='recommend_immediately';
  let rationale=[];
  const planGoal = c.planGoal || null;
  if(planGoal==='schedule_demo'){
    nextStep='schedule_demo'; pricingStrategy='encourage_demo'; cta={id:'book-demo',label:'Book Demo'}; recommendationStrategy='recommend_immediately'; rationale=['planGoal is schedule_demo'];
  } else if(planGoal==='close_trial'){
    nextStep='recommend_trial'; pricingStrategy='recommend_plan'; cta={id:'start-free-trial',label:'Start Free Trial'}; recommendationStrategy='recommend_immediately'; rationale=['close_trial'];
  } else if(planGoal==='qualify'){
    nextStep='ask_qualification'; pricingStrategy='request_contact'; cta={id:'contact-sales',label:'Contact Sales'}; recommendationStrategy='ask_qualifying_question'; rationale=['qualify'];
  } else if(contactSalesPreferred && features.atDecisionStage && !features.isPricingIntent && !features.isComparisonIntent && !features.isBookingIntent){
    nextStep='contact_sales'; pricingStrategy='request_contact'; cta={id:'contact-sales',label:'Contact Sales'}; recommendationStrategy='ask_qualifying_question'; rationale=['consultative decision-stage'];
  } else {
    switch(readiness.stage){
      case 'Awareness':
        nextStep='continue_education'; pricingStrategy = features.hasPricingInfo ? 'summarize_pricing':'answer_directly'; recommendationStrategy='explain_differences'; cta = contactSalesPreferred?{id:'contact-sales',label:'Contact Sales'}:features.hasDemoPath?{id:'book-demo',label:'Book Demo'}:{id:'start-free-trial',label:'Start Free Trial'}; rationale=['awareness']; break;
      case 'Education':
        nextStep='continue_education'; pricingStrategy = features.hasPricingInfo ? 'summarize_pricing':'answer_directly'; recommendationStrategy='explain_differences'; cta = contactSalesPreferred?{id:'contact-sales',label:'Contact Sales'}:features.hasDemoPath?{id:'book-demo',label:'Book Demo'}:{id:'start-free-trial',label:'Start Free Trial'}; rationale=['education']; break;
      case 'Qualification':
        nextStep='ask_qualification'; pricingStrategy='request_contact'; recommendationStrategy='ask_qualifying_question'; cta={id:'contact-sales',label:'Contact Sales'}; rationale=['qualification']; break;
      case 'Pricing':
        const qualificationNeeded = !budgetSig || !decisionAuth || !timeline || !planComp;
        const explicitPricingContext = pageTypePricing && (features.isPricingIntent || features.isComparisonIntent || features.hasPricingInfo);
        if(qualificationNeeded && !explicitPricingContext && !pricingReady){
          nextStep='ask_qualification'; pricingStrategy='request_contact'; recommendationStrategy='ask_qualifying_question'; cta={id:'contact-sales',label:'Contact Sales'}; rationale=['qualification incomplete'];
        } else if(!pricingReady){
          nextStep='continue_education'; pricingStrategy='summarize_pricing'; recommendationStrategy='explain_differences'; cta = contactSalesPreferred?{id:'contact-sales',label:'Contact Sales'}:{id:'start-free-trial',label:'Start Free Trial'}; rationale=['pricing not ready'];
        } else {
          pricingStrategy = features.hasPricingInfo || features.isPricingIntent || features.isComparisonIntent ? 'recommend_plan' : 'summarize_pricing'; nextStep='review_pricing'; recommendationStrategy='compare_options'; cta={id:'compare-plans',label:'Compare Plans'}; rationale=['pricing gate passed'];
        }
        break;
      case 'Sales':
        nextStep = features.isBookingIntent ? 'schedule_demo' : 'contact_sales'; pricingStrategy = features.hasDemoPath ? 'encourage_demo' : 'request_contact'; recommendationStrategy='recommend_immediately'; cta = features.hasDemoPath?{id:'book-demo',label:'Book Demo'}:{id:'contact-sales',label:'Contact Sales'}; rationale=['sales']; break;
      default:
        nextStep='continue_education'; rationale=['default'];
    }
  }

  return {
    URL: c.url,
    pageType, visitorIntent, detectedIntent: detected.primaryIntent, journeyStage,
    awarenessReady: features.atAwareness, educationReady: features.atConsideration||features.hasDemoPath, qualificationReady: readiness.qualificationReady, pricingReady, salesReady: readiness.salesReady,
    explicitPricingSignal, purchaseMomentum, supportiveEvidence, strongFinancialContext,
    hasBudgetSignal: budgetSig, hasPlanComparisonSignal: planComp, hasDecisionAuthoritySignal: decisionAuth, hasTimelineSignal: timeline, hasProcurementSignal: procurement,
    qualificationCompleted: !(c.qualificationState && c.qualificationState.toLowerCase().includes('ask_qualification')), missingQualification: c.missingQualification||[], readiness, nextStep, cta
  };
}

const traces = cases.map(computeForCase);
fs.writeFileSync('packages/conversation-orchestrator/tmp-decision-traces.json',JSON.stringify(traces,null,2));
console.log('wrote',traces.length,'traces to packages/conversation-orchestrator/tmp-decision-traces.json');

// aggregate stats
const agg = {counts:{}};
const signalKeys=['explicitPricingSignal','purchaseMomentum','supportiveEvidence','strongFinancialContext','hasBudgetSignal','hasPlanComparisonSignal','hasDecisionAuthoritySignal','hasTimelineSignal','hasProcurementSignal','pricingReady'];
for(const k of signalKeys){agg.counts[k]={true:0,false:0}};
const comboCounts={};
const flipCandidates={};
for(const t of traces){
  for(const k of signalKeys){ agg.counts[k][ String(Boolean(t[k])) ] +=1; }
  const combo = signalKeys.map(k=> (t[k]?1:0)).join(''); comboCounts[combo]=(comboCounts[combo]||0)+1;
}
// compute which single predicate flips pricingReady -> false
const predicateList=['isPricingIntent','isComparisonIntent','pageTypePricing','hasPricingInfo','hasBudgetSignal','hasProcurementSignal','hasPlanComparisonSignal','hasDecisionAuthoritySignal','hasTimelineSignal','atDecisionStage','isBuyingIntent'];
const flipCounts={}; for(const p of predicateList) flipCounts[p]=0;
for(const c of cases){
  const trace = computeForCase(c);
  const originalPricing = trace.pricingReady;
  if(!originalPricing) continue;
  // for each predicate, recompute pricingReady with that predicate forced false
  const pageType=c.pageType||''; const message=c.messageTemplate||''; const pricingModel=c.pricingModel||''; const journeyStage=c.journeyStage||''; const visitorIntent=c.visitorIntent||''; const budget=c.budget||'';
  const detected=detectVisitorIntent(message);
  const intentNorm=normalize(detected.primaryIntent);
  const base = {
    isPricingIntent: intentNorm.includes('pricing'),
    isComparisonIntent: intentNorm.includes('comparison'),
    isBuyingIntent: intentNorm.includes('buy'),
    atDecisionStage: normalize(journeyStage).includes('decision'),
    pageTypePricing: normalize(pageType).includes('pricing'),
    hasPricingInfo: /pricing|price|plan|tier|cost|quote/.test(`${message} ${pricingModel}`),
    hasBudgetSignal: hasBudgetSignal(message, pricingModel, budget), hasProcurementSignal: hasProcurementSignal(message), hasPlanComparisonSignal: hasPlanComparisonSignal(message), hasDecisionAuthoritySignal: hasDecisionAuthoritySignal(message), hasTimelineSignal: hasTimelineSignal(message)
  };
  for(const p of predicateList){
    const mod = {...base};
    // map predicate names
    if(p==='pageTypePricing') mod.pageTypePricing=false; else if(p==='atDecisionStage') mod.atDecisionStage=false; else if(p==='isPricingIntent') mod.isPricingIntent=false; else if(p==='isComparisonIntent') mod.isComparisonIntent=false; else if(p==='isBuyingIntent') mod.isBuyingIntent=false; else if(p==='hasPricingInfo') mod.hasPricingInfo=false; else if(p==='hasBudgetSignal') mod.hasBudgetSignal=false; else if(p==='hasProcurementSignal') mod.hasProcurementSignal=false; else if(p==='hasPlanComparisonSignal') mod.hasPlanComparisonSignal=false; else if(p==='hasDecisionAuthoritySignal') mod.hasDecisionAuthoritySignal=false; else if(p==='hasTimelineSignal') mod.hasTimelineSignal=false;
    const strongFinancialContext = mod.isPricingIntent || mod.isComparisonIntent || mod.pageTypePricing || mod.hasPricingInfo;
    const supportiveEvidence = mod.hasBudgetSignal || mod.hasProcurementSignal || mod.hasPlanComparisonSignal || mod.hasDecisionAuthoritySignal || mod.hasTimelineSignal;
    const purchaseMomentum = mod.atDecisionStage || mod.isBuyingIntent || mod.isComparisonIntent || mod.isPricingIntent || mod.pageTypePricing;
    const explicitPricingSignal = mod.pageTypePricing && (mod.isPricingIntent || mod.isComparisonIntent || mod.hasPricingInfo);
    const newPricingReady = (explicitPricingSignal && purchaseMomentum) || (strongFinancialContext && supportiveEvidence && purchaseMomentum);
    if(!newPricingReady) flipCounts[p]++;
  }
}
fs.writeFileSync('packages/conversation-orchestrator/tmp-decision-aggregates.json',JSON.stringify({agg,comboCounts,flipCounts},null,2));
console.log('wrote aggregates to packages/conversation-orchestrator/tmp-decision-aggregates.json');
