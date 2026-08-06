const fs = require('fs');
const https = require('https');
const http = require('http');
const urls = JSON.parse(fs.readFileSync('tmp-failing-cases.json', 'utf8')).map((x) => x.URL);
const terms = ['pricing', 'price', 'cost', 'plan'];
function normalize(text) {
  return (text || '').toLowerCase();
}
function containsTerm(text) {
  const lower = normalize(text);
  return terms.some((term) => lower.includes(term));
}
function getTag(html, regex) {
  const match = html.match(regex);
  return match ? match[1].trim() : '';
}
function getAllTags(html, regex) {
  const out = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    out.push(match[1].trim());
  }
  return out;
}
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode, body: data });
        });
      })
      .on('error', reject)
      .setTimeout(20000, () => reject(new Error('timeout')));
  });
}
async function inspectPage(url) {
  const result = { url, hitFields: [], count: 0, fields: { title: 0, heading: 0, content: 0, meta: 0 } };
  try {
    const { body } = await fetchUrl(url);
    const title = getTag(body, /<title[^>]*>([^<]*)<\/title>/i);
    const headings = getAllTags(body, /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi).join(' ');
    const description = getTag(body, /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) || getTag(body, /<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
    const ogTitle = getTag(body, /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i) || getTag(body, /<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["'][^>]*>/i);
    const ogDesc = getTag(body, /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i) || getTag(body, /<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["'][^>]*>/i);
    const meta = [description, ogTitle, ogDesc].join(' ');
    const bodyText = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
    if (containsTerm(title)) {
      result.fields.title = 1;
      result.hitFields.push('title');
    }
    if (containsTerm(headings)) {
      result.fields.heading = 1;
      result.hitFields.push('heading');
    }
    if (containsTerm(bodyText)) {
      result.fields.content = 1;
      result.hitFields.push('content');
    }
    if (containsTerm(meta)) {
      result.fields.meta = 1;
      result.hitFields.push('meta');
    }
    result.count = result.hitFields.length;
  } catch (error) {
    result.error = error.message;
  }
  return result;
}
(async () => {
  const results = [];
  for (const url of urls) {
    const res = await inspectPage(url);
    results.push(res);
    console.error('inspected', url, 'count', res.count, res.error ? 'error' : '');
  }
  const dupCount = results.filter((r) => r.count > 1).length;
  const avg = results.reduce((sum, r) => sum + (r.count || 0), 0) / results.length;
  const output = { total: results.length, dupCount, avgFields: avg, results };
  fs.writeFileSync('tmp-failing-pricing-field-audit.json', JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output, null, 2));
})();