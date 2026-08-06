import { detectVisitorIntent } from './packages/conversation-orchestrator/src/visitor-intent-engine.ts';

async function main() {
  const urls = [
    'https://www.mayoclinic.org/tests-procedures',
    'https://www.kp.org/',
    'https://www.hopkinsmedicine.org/',
    'https://www.ucsfhealth.org/',
    'https://www.ucsfhealth.org/locations',
  ];

  const normalizeUrl = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const proxy = (url: string) => `https://r.jina.ai/http://https://${normalizeUrl(url)}`;

  for (const url of urls) {
    const res = await fetch(proxy(url), { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const raw = await res.text();
    const title = (raw.match(/Title:\s*(.+)/i) || [])[1] || url;
    const content = raw.includes('Markdown Content:') ? raw.split('Markdown Content:')[1].trim() : raw.trim();
    const headings = Array.from(raw.matchAll(/^(#{1,6})\s+(.+)$/gm), (m) => m[2].trim()).slice(0, 8);
    const pageType = url.endsWith('/locations') ? 'contact' : url.endsWith('/tests-procedures') ? 'product' : 'home';
    const result = detectVisitorIntent({
      currentUrl: url,
      landingPage: url,
      pageType,
      pageContent: content,
      pageTitle: title,
      pageHeadings: headings,
      businessProfile: { industry: 'Healthcare', businessType: 'Healthcare' },
    });
    console.log('URL:', url);
    console.log('pageType:', pageType);
    console.log('TITLE:', title);
    console.log('PRIMARY:', result.primaryIntent, 'SECONDARY:', result.secondaryIntent, 'CONF:', result.confidence);
    console.log('DISTRIBUTION:', JSON.stringify(result.intentDistribution));
    console.log('HEADINGS:', headings.slice(0, 4));
    console.log('CONTENT_SAMPLE:', content.slice(0, 1200).replace(/\n+/g, ' '));
    console.log('---');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
