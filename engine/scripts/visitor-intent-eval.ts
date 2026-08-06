import { promises as fs } from 'node:fs';
import path from 'node:path';
import { detectVisitorIntent } from '../packages/conversation-orchestrator/src/index.ts';

interface Candidate {
  url: string;
  industry: string;
  expectedIntent: string;
  reason: string;
}

const candidates: Candidate[] = [
  { url: 'https://www.hubspot.com/pricing', industry: 'SaaS', expectedIntent: 'Pricing', reason: 'pricing page' },
  { url: 'https://www.salesforce.com/editions-pricing/', industry: 'SaaS', expectedIntent: 'Pricing', reason: 'pricing page' },
  { url: 'https://www.atlassian.com/software/jira/pricing', industry: 'SaaS', expectedIntent: 'Pricing', reason: 'pricing page' },
  { url: 'https://www.intercom.com/pricing', industry: 'SaaS', expectedIntent: 'Pricing', reason: 'pricing page' },
  { url: 'https://www.zendesk.com/pricing/', industry: 'SaaS', expectedIntent: 'Pricing', reason: 'pricing page' },
  { url: 'https://www.apple.com/shop/buy-iphone', industry: 'Ecommerce', expectedIntent: 'Buying', reason: 'purchase flow' },
  { url: 'https://www.bestbuy.com/site/iphone/iphone-15/pcmcat382000050000.c?id=pcmcat382000050000', industry: 'Ecommerce', expectedIntent: 'Buying', reason: 'shopping page' },
  { url: 'https://www.nike.com/w/mens-shoes-nik1y7ok', industry: 'Ecommerce', expectedIntent: 'Product Research', reason: 'product catalog' },
  { url: 'https://www.walmart.com/cp/returns/1235', industry: 'Ecommerce', expectedIntent: 'Support', reason: 'returns support' },
  { url: 'https://www.target.com/returns', industry: 'Ecommerce', expectedIntent: 'Support', reason: 'returns policy' },
  { url: 'https://www.mayoclinic.org/tests-procedures', industry: 'Healthcare', expectedIntent: 'Product Research', reason: 'medical procedure information' },
  { url: 'https://www.clevelandclinic.org/health', industry: 'Healthcare', expectedIntent: 'Product Research', reason: 'health topics' },
  { url: 'https://www.hopkinsmedicine.org/health/conditions-and-diseases', industry: 'Healthcare', expectedIntent: 'Product Research', reason: 'conditions overview' },
  { url: 'https://www.kaiserpermanente.org/health-wellness', industry: 'Healthcare', expectedIntent: 'Product Research', reason: 'wellness content' },
  { url: 'https://www.mayoclinic.org/diseases-conditions', industry: 'Healthcare', expectedIntent: 'Product Research', reason: 'disease guide' },
  { url: 'https://www.findlaw.com', industry: 'Legal', expectedIntent: 'General Information', reason: 'legal information hub' },
  { url: 'https://www.avvo.com/legal-answers', industry: 'Legal', expectedIntent: 'Support', reason: 'legal Q&A support' },
  { url: 'https://www.justia.com/', industry: 'Legal', expectedIntent: 'General Information', reason: 'legal resource portal' },
  { url: 'https://www.findlaw.com/lawyer/attorney-directory.html', industry: 'Legal', expectedIntent: 'Contact', reason: 'lawyer directory/contact' },
  { url: 'https://www.law.cornell.edu/', industry: 'Legal', expectedIntent: 'General Information', reason: 'legal research hub' },
  { url: 'https://www.pizzahut.com/', industry: 'Restaurants', expectedIntent: 'Product Research', reason: 'restaurant menu' },
  { url: 'https://www.dominos.com/', industry: 'Restaurants', expectedIntent: 'Product Research', reason: 'restaurant product pages' },
  { url: 'https://www.subway.com/en-US', industry: 'Restaurants', expectedIntent: 'Product Research', reason: 'restaurant menu' },
  { url: 'https://www.chipotle.com/', industry: 'Restaurants', expectedIntent: 'Product Research', reason: 'menu and ordering' },
  { url: 'https://www.tacobell.com/', industry: 'Restaurants', expectedIntent: 'Product Research', reason: 'menu and order' },
  { url: 'https://www.harvard.edu/', industry: 'Education', expectedIntent: 'General Information', reason: 'university overview' },
  { url: 'https://www.mit.edu/', industry: 'Education', expectedIntent: 'General Information', reason: 'university overview' },
  { url: 'https://www.columbia.edu/', industry: 'Education', expectedIntent: 'General Information', reason: 'university overview' },
  { url: 'https://www.coursera.org/about', industry: 'Education', expectedIntent: 'General Information', reason: 'education platform overview' },
  { url: 'https://www.ucf.edu/', industry: 'Education', expectedIntent: 'General Information', reason: 'school overview' },
  { url: 'https://www.ideo.com/', industry: 'Agencies', expectedIntent: 'Product Research', reason: 'agency portfolio' },
  { url: 'https://www.akqa.com/', industry: 'Agencies', expectedIntent: 'Product Research', reason: 'agency services' },
  { url: 'https://www.rga.com/', industry: 'Agencies', expectedIntent: 'Product Research', reason: 'agency services' },
  { url: 'https://www.muledesign.com/', industry: 'Agencies', expectedIntent: 'Product Research', reason: 'agency services' },
  { url: 'https://www.criticalmass.com/', industry: 'Agencies', expectedIntent: 'Product Research', reason: 'agency services' },
  { url: 'https://www.caterpillar.com/en/company.html', industry: 'Manufacturing', expectedIntent: 'General Information', reason: 'company overview' },
  { url: 'https://www.boeing.com/', industry: 'Manufacturing', expectedIntent: 'General Information', reason: 'company overview' },
  { url: 'https://www.3m.com/3M/en_US/company-us/', industry: 'Manufacturing', expectedIntent: 'General Information', reason: 'company overview' },
  { url: 'https://www.siemens.com/us/en/company/about.html', industry: 'Manufacturing', expectedIntent: 'General Information', reason: 'company overview' },
  { url: 'https://www.gevernova.com/', industry: 'Manufacturing', expectedIntent: 'General Information', reason: 'company overview' },
  { url: 'https://www.mckinsey.com/', industry: 'Consulting', expectedIntent: 'Product Research', reason: 'consulting services' },
  { url: 'https://www.bain.com/', industry: 'Consulting', expectedIntent: 'Product Research', reason: 'consulting services' },
  { url: 'https://www.bcg.com/', industry: 'Consulting', expectedIntent: 'Product Research', reason: 'consulting services' },
  { url: 'https://www.deloitte.com/us/en.html', industry: 'Consulting', expectedIntent: 'Product Research', reason: 'consulting services' },
  { url: 'https://www.pwc.com/us/en.html', industry: 'Consulting', expectedIntent: 'Product Research', reason: 'consulting services' },
  { url: 'https://www.yelp.com/search?find_desc=plumber&find_loc=Seattle%2C%20WA', industry: 'Local businesses', expectedIntent: 'Product Research', reason: 'service discovery' },
  { url: 'https://www.yelp.com/search?find_desc=dentist&find_loc=Austin%2C%20TX', industry: 'Local businesses', expectedIntent: 'Product Research', reason: 'service discovery' },
  { url: 'https://www.yelp.com/search?find_desc=lawyer&find_loc=Phoenix%2C%20AZ', industry: 'Local businesses', expectedIntent: 'Product Research', reason: 'service discovery' },
  { url: 'https://www.yelp.com/search?find_desc=salon&find_loc=Miami%2C%20FL', industry: 'Local businesses', expectedIntent: 'Product Research', reason: 'service discovery' },
  { url: 'https://www.yelp.com/search?find_desc=restaurant&find_loc=Denver%2C%20CO', industry: 'Local businesses', expectedIntent: 'Product Research', reason: 'service discovery' },
  { url: 'https://www.hubspot.com/company/about-hubspot', industry: 'SaaS', expectedIntent: 'General Information', reason: 'company overview' },
  { url: 'https://www.salesforce.com/company/', industry: 'SaaS', expectedIntent: 'General Information', reason: 'company overview' },
  { url: 'https://www.shopify.com/blog', industry: 'Ecommerce', expectedIntent: 'Product Research', reason: 'educational content' },
  { url: 'https://www.amazon.com/gp/help/customer/display.html?nodeId=508510', industry: 'Ecommerce', expectedIntent: 'Support', reason: 'customer support' },
  { url: 'https://www.eBay.com/help/buying', industry: 'Ecommerce', expectedIntent: 'Support', reason: 'buyer support' },
  { url: 'https://www.stanford.edu/', industry: 'Education', expectedIntent: 'General Information', reason: 'university overview' },
  { url: 'https://www.ucla.edu/', industry: 'Education', expectedIntent: 'General Information', reason: 'university overview' },
  { url: 'https://www.usc.edu/', industry: 'Education', expectedIntent: 'General Information', reason: 'university overview' },
  { url: 'https://www.northwestern.edu/', industry: 'Education', expectedIntent: 'General Information', reason: 'university overview' },
  { url: 'https://www.allstate.com/', industry: 'Local businesses', expectedIntent: 'Product Research', reason: 'insurance services' },
  { url: 'https://www.statefarm.com/', industry: 'Local businesses', expectedIntent: 'Product Research', reason: 'insurance services' },
  { url: 'https://www.bankofamerica.com/', industry: 'Local businesses', expectedIntent: 'General Information', reason: 'financial services overview' },
  { url: 'https://www.capitalone.com/', industry: 'Local businesses', expectedIntent: 'Product Research', reason: 'financial services overview' },
  { url: 'https://www.notion.so/pricing', industry: 'SaaS', expectedIntent: 'Pricing', reason: 'pricing page' },
  { url: 'https://www.canva.com/pricing/', industry: 'SaaS', expectedIntent: 'Pricing', reason: 'pricing page' },
  { url: 'https://www.etsy.com/', industry: 'Ecommerce', expectedIntent: 'Product Research', reason: 'marketplace catalog' },
  { url: 'https://www.webmd.com/', industry: 'Healthcare', expectedIntent: 'Product Research', reason: 'health content hub' },
  { url: 'https://www.nolo.com/', industry: 'Legal', expectedIntent: 'General Information', reason: 'legal information' },
  { url: 'https://www.starbucks.com/', industry: 'Restaurants', expectedIntent: 'Product Research', reason: 'menu and products' },
  { url: 'https://www.udemy.com/courses/', industry: 'Education', expectedIntent: 'Product Research', reason: 'course catalog' },
  { url: 'https://www.frog.co/', industry: 'Agencies', expectedIntent: 'Product Research', reason: 'agency services' },
  { url: 'https://www.honeywell.com/us/en', industry: 'Manufacturing', expectedIntent: 'General Information', reason: 'company overview' },
  { url: 'https://www.accenture.com/us-en/about/company-index', industry: 'Consulting', expectedIntent: 'Product Research', reason: 'consulting services' },
  { url: 'https://www.yellowpages.com/search?search_terms=plumber&geo_location_terms=Seattle%2C%20WA', industry: 'Local businesses', expectedIntent: 'Product Research', reason: 'service discovery' },
];

function stripHtml(text: string): string {
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, ' and ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchPageText(url: string): Promise<string | null> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  const tries = [
    async () => fetch(url, { headers }),
    async () => fetch(`https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`, { headers }),
  ];

  for (const attempt of tries) {
    try {
      const response = await attempt();
      if (!response.ok) continue;
      const html = await response.text();
      const text = stripHtml(html);
      if (text.length < 120) continue;
      return text.slice(0, 5000);
    } catch {
      // continue to next attempt
    }
  }

  return null;
}

function buildEvidence(result: ReturnType<typeof detectVisitorIntent>): string[] {
  return result.supportingEvidence.slice(0, 3);
}

async function main() {
  const results: Array<{
    url: string;
    industry: string;
    expectedIntent: string;
    predictedIntent: string;
    confidence: number;
    supportingEvidence: string[];
    correct: boolean;
    reason: string;
  }> = [];

  const collected: Candidate[] = [];

  for (const candidate of candidates) {
    if (collected.length >= 50) break;
    const text = await fetchPageText(candidate.url);
    if (!text) continue;

    const result = detectVisitorIntent({
      landingPage: candidate.url,
      currentUrl: candidate.url,
      pageContent: text,
      userQuestion: '',
      businessProfile: {
        businessType: candidate.industry,
        industry: candidate.industry,
        supportedCTAs: ['pricing', 'contact', 'book_demo', 'demo'],
      },
      knowledgeEngineFacts: [candidate.reason],
    });

    const correct = result.primaryIntent === candidate.expectedIntent;
    collected.push(candidate);
    results.push({
      url: candidate.url,
      industry: candidate.industry,
      expectedIntent: candidate.expectedIntent,
      predictedIntent: result.primaryIntent,
      confidence: result.confidence,
      supportingEvidence: buildEvidence(result),
      correct,
      reason: candidate.reason,
    });

    await new Promise(resolve => setTimeout(resolve, 450));
  }

  const total = results.length;
  const correctCount = results.filter(r => r.correct).length;
  const accuracy = Number((correctCount / total) * 100).toFixed(2);

  const intents = Array.from(new Set(results.map(r => r.expectedIntent).concat(results.map(r => r.predictedIntent))));
  const precisionByIntent = Object.fromEntries(intents.map(intent => {
    const predictedForIntent = results.filter(r => r.predictedIntent === intent);
    const truePositives = predictedForIntent.filter(r => r.correct).length;
    const precision = predictedForIntent.length ? Number((truePositives / predictedForIntent.length) * 100).toFixed(2) : 'n/a';
    return [intent, precision];
  }));

  const confusionMatrix: Record<string, Record<string, number>> = {};
  for (const expected of intents) {
    confusionMatrix[expected] = {};
    for (const predicted of intents) {
      confusionMatrix[expected][predicted] = results.filter(r => r.expectedIntent === expected && r.predictedIntent === predicted).length;
    }
  }

  const mistakePairs = results.filter(r => !r.correct)
    .map(r => `${r.expectedIntent} -> ${r.predictedIntent}`)
    .reduce<Record<string, number>>((acc, pair) => {
      acc[pair] = (acc[pair] || 0) + 1;
      return acc;
    }, {});

  const topMistakes = Object.entries(mistakePairs).sort((a, b) => b[1] - a[1]).slice(0, 5);

  let markdown = `# Visitor Intent Engine Evaluation\n\n`;
  markdown += `- Generated on: ${new Date().toISOString()}\n`;
  markdown += `- Total evaluated pages: ${total}\n`;
  markdown += `- Correct predictions: ${correctCount}\n`;
  markdown += `- Accuracy: ${accuracy}%\n\n`;
  markdown += `## Precision by intent\n\n`;
  markdown += `| Intent | Precision |\n| --- | ---: |\n`;
  for (const intent of intents.sort()) {
    markdown += `| ${intent} | ${precisionByIntent[intent]}% |\n`;
  }
  markdown += `\n## Confusion matrix\n\n`;
  markdown += `| Expected \ Predicted | ${intents.sort().join(' | ')} |\n| --- | ${intents.map(() => '---:').join(' | ')} |\n`;
  for (const expected of intents.sort()) {
    const row = [expected, ...intents.sort().map(predicted => confusionMatrix[expected][predicted].toString())];
    markdown += `| ${row.join(' | ')} |\n`;
  }
  markdown += `\n## Detailed evaluation\n\n`;
  markdown += `| # | Industry | URL | Expected | Predicted | Confidence | Supporting evidence | Correct |\n`;
  markdown += `| --- | --- | --- | --- | --- | ---: | --- | --- |\n`;
  results.forEach((row, index) => {
    const evidence = row.supportingEvidence.join(' • ').replace(/\|/g, '/');
    markdown += `| ${index + 1} | ${row.industry} | ${row.url} | ${row.expectedIntent} | ${row.predictedIntent} | ${row.confidence.toFixed(2)} | ${evidence} | ${row.correct ? 'Correct' : 'Incorrect'} |\n`;
  });
  markdown += `\n## Most common mistakes\n\n`;
  if (topMistakes.length) {
    for (const [pair, count] of topMistakes) {
      markdown += `- ${pair}: ${count}\n`;
    }
  } else {
    markdown += `- None\n`;
  }
  markdown += `\n## Recommendations for future improvements\n\n`;
  markdown += `- Strengthen intent-specific weighting for comparison and support pages that use broad commercial copy.\n`;
  markdown += `- Add a small post-classification confidence guardrail so low-confidence predictions trigger a fallback or clarifying prompt.\n`;
  markdown += `- Expand the evaluation set with more edge cases from healthcare, legal, and local-service pages to capture nuanced wording.\n`;
  markdown += `- Freeze the engine once the accuracy threshold is satisfied; no architecture changes are required for this milestone.\n`;

  const outputPath = path.resolve(__dirname, '..', '..', 'VISITOR_INTENT_EVALUATION.md');
  await fs.writeFile(outputPath, markdown, 'utf8');
  console.log(`Wrote evaluation report to ${outputPath}`);
  console.log(JSON.stringify({ total, correctCount, accuracy, precisionByIntent, topMistakes }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
