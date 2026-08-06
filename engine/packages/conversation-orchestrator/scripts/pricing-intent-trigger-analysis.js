const fs = require('fs');
const failureFile = 'packages/conversation-orchestrator/tmp-failure-analysis.json';
const benchmark = 'packages/conversation-orchestrator/SALES_CONVERSION_REAL_WORLD_BENCHMARK.md';
const harness = 'packages/conversation-orchestrator/src/sales-conversion-real-world-evaluation-harness.ts';
const failures = JSON.parse(fs.readFileSync(failureFile,'utf8'));
const bench = fs.readFileSync(benchmark,'utf8');
const harnessSrc = fs.readFileSync(harness,'utf8');

function findObjectForUrl(url){
  const idx = harnessSrc.indexOf("url: '"+url.replace(/'/g, "\\'") );
  if(idx===-1) return null;
  let start = harnessSrc.lastIndexOf('{', idx);
  if(start===-1) return null;
  let depth=0; let end=-1;
  for(let i=start;i<harnessSrc.length;i++){
    const ch=harnessSrc[i];
    if(ch==='{') depth++; else if(ch==='}') { depth--; if(depth===0){ end=i; break; } }
  }
  if(end===-1) return null;
  return harnessSrc.slice(start,end+1);
}

const pricingRegex = /(pricing|price|cost|plans|tiers)/ig;
function extractMatches(text){
  const m = text.matchAll(pricingRegex);
  const arr=[];
  for(const it of m) arr.push(it[0].toLowerCase());
  return arr;
}

// Analyze failing cases
const failTriggers = {};
const failDetails = [];
for(const f of failures){
  const msg = f.messageTemplate || '';
  const matches = extractMatches(msg);
  const matched = matches.length?matches:[];
  if(matched.length===0){
    // also check pricingModel and URL
    const pm = f.pricingModel||'';
    const m2 = extractMatches(pm);
    if(m2.length) matched.push(...m2);
  }
  if(matched.length===0) matched.push('none');
  for(const t of matched) failTriggers[t]=(failTriggers[t]||0)+1;
  failDetails.push({url:f.URL,matched, message: msg});
}

// Find correctly-classified pricing cases in benchmark: Expected next step: review_pricing, actual: review_pricing
const correctUrls = [];
const lines = bench.split('\n');
for(let i=0;i<lines.length;i++){
  const L = lines[i];
  if(L.includes('Expected next step: review_pricing, actual: review_pricing')){
    // search backward for URL line in the block
    let j=i-1; let url=null;
    while(j>0 && !url){
      const line = lines[j].trim();
      if(line.startsWith('### ')){
        // header contains URL
        const header = line.replace('### ','');
        const urlMatch = header.split('\n')[0];
        // header might be like 'https://... — ...'
        url = header.split('—')[0].trim();
        break;
      }
      if(line.startsWith('- URL:')){ url = line.replace('- URL:','').trim(); break; }
      j--;
    }
    if(url) correctUrls.push(url);
  }
}
// dedupe
const uniqCorrect = [...new Set(correctUrls)].slice(0,20);

const correctTriggers = {};
const correctDetails = [];
for(const url of uniqCorrect){
  const objText = findObjectForUrl(url);
  let msg='';
  if(objText){
    const m = /messageTemplate:\s*'([^']*)'/.exec(objText);
    if(m) msg = m[1];
  }
  const matches = extractMatches(msg);
  const matched = matches.length?matches:[];
  if(matched.length===0){
    // check pricingModel
    const pmMatch = /pricingModel:\s*'([^']*)'/.exec(objText||'');
    if(pmMatch){ const m2 = extractMatches(pmMatch[1]||''); if(m2.length) matched.push(...m2); }
  }
  if(matched.length===0) matched.push('none');
  for(const t of matched) correctTriggers[t]=(correctTriggers[t]||0)+1;
  correctDetails.push({url,matched,message:msg});
}

// Build frequency table and precision/false-positive rate
const triggers = new Set([...Object.keys(failTriggers), ...Object.keys(correctTriggers)]);
const table = [];
for(const t of triggers){
  const fp = failTriggers[t]||0;
  const tp = correctTriggers[t]||0;
  const precision = tp + fp === 0 ? null : (tp/(tp+fp));
  const fpr = tp + fp === 0 ? null : (fp/(tp+fp));
  table.push({trigger:t, falsePositives:fp, truePositives:tp, precision: precision===null?null:precision.toFixed(3), falsePositiveRate: fpr===null?null:fpr.toFixed(3)});
}

// Sort by false positives desc
table.sort((a,b)=> (b.falsePositives - a.falsePositives) || (b.truePositives - a.truePositives));

fs.writeFileSync('packages/conversation-orchestrator/tmp-pricing-trigger-fail-details.json', JSON.stringify(failDetails,null,2));
fs.writeFileSync('packages/conversation-orchestrator/tmp-pricing-trigger-correct-details.json', JSON.stringify(correctDetails,null,2));
fs.writeFileSync('packages/conversation-orchestrator/tmp-pricing-trigger-table.json', JSON.stringify(table,null,2));
console.log('wrote trigger table and detail files.');
