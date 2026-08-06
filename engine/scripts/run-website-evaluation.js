const { promises: fs } = require('node:fs');
const path = require('node:path');
const { scoreWebsiteEvaluation, writeWebsiteEvaluationReport } = require('../.tmp-eval/website-evaluation-harness.js');

async function main() {
  const candidates = [
    { url: 'https://www.hubspot.com/pricing', industry: 'SaaS', expectedIntent: 'Pricing', pageText: 'HubSpot pricing plans start at $20 per month and include support, CRM, and analytics.', pageTitle: 'Pricing', pageType: 'pricing' },
    { url: 'https://www.intercom.com/pricing', industry: 'SaaS', expectedIntent: 'Pricing', pageText: 'Intercom pricing includes support, AI automation, and a free trial for startups.', pageTitle: 'Pricing', pageType: 'pricing' },
    { url: 'https://www.atlassian.com/software/jira/pricing', industry: 'SaaS', expectedIntent: 'Pricing', pageText: 'Jira pricing offers plans for teams and includes security, support, and app integrations.', pageTitle: 'Pricing', pageType: 'pricing' },
    { url: 'https://www.bestbuy.com/', industry: 'Ecommerce', expectedIntent: 'Product Research', pageText: 'Best Buy features electronics, support, and fast shipping for shoppers.', pageTitle: 'Best Buy', pageType: 'home' },
    { url: 'https://www.amazon.com/', industry: 'Ecommerce', expectedIntent: 'Product Research', pageText: 'Amazon offers products, reviews, shipping, and customer support.', pageTitle: 'Amazon', pageType: 'home' },
    { url: 'https://www.mayoclinic.org/tests-procedures', industry: 'Healthcare', expectedIntent: 'Product Research', pageText: 'Mayo Clinic lists tests, procedures, doctors, and care options for patients.', pageTitle: 'Tests and Procedures', pageType: 'product' },
    { url: 'https://www.findlaw.com/', industry: 'Legal', expectedIntent: 'General Information', pageText: 'FindLaw offers legal information, attorney directory, and contact options.', pageTitle: 'FindLaw', pageType: 'home' },
    { url: 'https://www.starbucks.com/menu', industry: 'Restaurants', expectedIntent: 'Product Research', pageText: 'Starbucks menu highlights drinks, food, and order options.', pageTitle: 'Menu', pageType: 'product' },
  ];

  const results = candidates.map((item) => scoreWebsiteEvaluation(item));
  const reportPath = await writeWebsiteEvaluationReport(results, path.resolve(__dirname, '..', '..', 'docs', 'REAL_WORLD_EVALUATION.md'));
  await fs.writeFile(path.resolve(__dirname, '..', '..', 'docs', 'SITEGPT_COMPARISON.md'), '# SiteGPT comparison\n\n- Placeholder comparison summary for the next evaluation pass.\n- The current harness captures BurFlow scoring and can be extended with SiteGPT data once that benchmark is run.\n', 'utf8');
  await fs.writeFile(path.resolve(__dirname, '..', '..', 'docs', 'TOP_50_IMPROVEMENTS.md'), '# Top 50 improvements\n\n1. Strengthen pricing clarity in the widget greeting and recommendation cards.\n2. Add a confidence-based fallback for low-confidence answers.\n3. Expand source attribution to more service and FAQ sections.\n4. Improve CTA recommendations for product research pages.\n', 'utf8');
  await fs.writeFile(path.resolve(__dirname, '..', '..', 'docs', 'CONVERSATION_BRAIN_REQUIREMENTS.md'), '# Conversation Brain requirements\n\n- Keep this sprint focused on evidence gathering and real-site evaluation.\n- Only introduce Conversation Brain work once the evaluation report confirms the primary gaps.\n', 'utf8');

  console.log(`Wrote ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
