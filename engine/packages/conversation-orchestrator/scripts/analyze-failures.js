const fs = require('fs');
const path = 'packages/conversation-orchestrator/SALES_CONVERSION_REAL_WORLD_BENCHMARK.md';
const harness = 'packages/conversation-orchestrator/src/sales-conversion-real-world-evaluation-harness.ts';
const failures = JSON.parse(fs.readFileSync('packages/conversation-orchestrator/tmp-failing-cases.json','utf8'));
const harnessSrc = fs.readFileSync(harness,'utf8');
function findObjectForUrl(url){
  const idx = harnessSrc.indexOf("url: '"+url.replace(/'/g, "\\'") );
  if(idx===-1) return null;
  // find opening brace before idx
  let start = harnessSrc.lastIndexOf('{', idx);
  if(start===-1) return null;
  // find matching closing brace
  let depth=0;let end=-1;
  for(let i=start;i<harnessSrc.length;i++){
    const ch=harnessSrc[i];
    if(ch==='{') depth++;
    else if(ch==='}') {depth--; if(depth===0){ end=i; break; }}
  }
  if(end===-1) return null;
  return harnessSrc.slice(start,end+1);
}
function extractField(objText, field){
  const re=new RegExp(field+":\\s*'([^']*)'",'i');
  const m=re.exec(objText);
  if(m) return m[1];
  // try for arrays or double quoted
  const re2=new RegExp(field+":\\s*\\[([^\\]]*)\\]",'i');
  const m2=re2.exec(objText);
  if(m2) return m2[1].trim();
  const re3=new RegExp(field+":\\s*\"([^\"]*)\"",'i');
  const m3=re3.exec(objText);
  if(m3) return m3[1];
  return null;
}
function hasPricingInfoFromPricingModel(pm){
  if(!pm) return false; return /pricing|price|plan|tier|cost|quote/.test(pm.toLowerCase());
}
function hasBudgetSignal(budget, message, pricingModel){
  if(!budget && !message && !pricingModel) return false;
  if(budget && /\$\s*\d/.test(budget)) return true;
  const text = ((message||'')+' '+(pricingModel||'')).toLowerCase();
  return /\$\s*\d|budget|budgets|price range|pricing range|estimate|estimated|investment/.test(text);
}
function isPricingReadyComputed({pageType, message, pricingModel, journeyStage, visitorIntent, budget}){
  const isPricingIntent = (visitorIntent||'').toLowerCase().includes('pricing');
  const isComparisonIntent = (visitorIntent||'').toLowerCase().includes('comparison');
  const pageTypePricing = (pageType||'').toLowerCase().includes('pricing');
  const hasPricingInfo = hasPricingInfoFromPricingModel(pricingModel) || /pricing|price|plan|tier|cost|quote/.test((message||'').toLowerCase());
  const supportiveEvidence = hasBudgetSignal(budget,message,pricingModel) || /procurement|rfp|vendor|evaluate|compare|comparison|compare plans|compare/.test((message||'').toLowerCase());
  const purchaseMomentum = (journeyStage||'').toLowerCase().includes('decision') || isPricingIntent || isComparisonIntent || /buy|purchase|trial|start trial/.test((message||'').toLowerCase()) || pageTypePricing;
  const explicitPricingSignal = pageTypePricing && (isPricingIntent || isComparisonIntent || hasPricingInfo);
  if(explicitPricingSignal && purchaseMomentum) return true;
  return ( (isPricingIntent || isComparisonIntent || pageTypePricing || hasPricingInfo) && supportiveEvidence && purchaseMomentum );
}
const report = [];
for(const f of failures){
  const url = f.URL;
  const objText = findObjectForUrl(url);
  const rec = {url, header: f.header, found: !!objText};
  if(!objText){ report.push(Object.assign(rec,{error:'profile not found in harness', raw:f})); continue; }
  const industry = extractField(objText,'industry') || f.industry;
  const pageType = extractField(objText,'pageType') || f.pageType;
  const journeyStage = extractField(objText,'journeyStage') || f.funnelStage;
  const visitorIntent = extractField(objText,'visitorIntent') || f.visitorIntent;
  const pricingModel = extractField(objText,'pricingModel') || null;
  const companySize = extractField(objText,'companySize') || f.companySize;
  const budget = extractField(objText,'budget') || f.budget;
  const persona = extractField(objText,'persona') || f.persona;
  const messageTemplate = extractField(objText,'messageTemplate') || '';
  const isPricingReady = isPricingReadyComputed({pageType,message:messageTemplate,pricingModel,journeyStage,visitorIntent,budget});
  const patternTags = [];
  if((visitorIntent||'').toLowerCase().includes('research')) patternTags.push('research-intent');
  if((pageType||'').toLowerCase().includes('product')) patternTags.push('product-page');
  if((pageType||'').toLowerCase().includes('home')) patternTags.push('home-page');
  if((pageType||'').toLowerCase().includes('pricing')) patternTags.push('pricing-page');
  if((industry||'').toLowerCase().includes('professional') || (industry||'').toLowerCase().includes('healthcare') || (industry||'').toLowerCase().includes('real estate') || (industry||'').toLowerCase().includes('manufacturing')) patternTags.push('consultative-industry');
  if(pricingModel) patternTags.push('has-pricing-model');
  if(budget && /\$\s*\d/.test(budget)) patternTags.push('has-budget');
  if(messageTemplate && /pricing|price|cost|plans|tier/.test(messageTemplate.toLowerCase())) patternTags.push('message-mentions-pricing');
  report.push({url,industry,pageType,journeyStage,visitorIntent,pricingModel,companySize,budget,persona,messageTemplate,isPricingReady,patternTags,expectedNextStep:f.expectedNextStep,nextStepChosen:f.nextStepChosen,ctaChosen:f.ctaChosen,qualificationState:f.qualificationState});
}
fs.writeFileSync('packages/conversation-orchestrator/tmp-failure-analysis.json',JSON.stringify(report,null,2));
console.log('analysis saved to packages/conversation-orchestrator/tmp-failure-analysis.json');
