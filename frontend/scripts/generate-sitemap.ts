import { TOOLS } from '../src/data/toolsData';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');
const SITE = 'https://burflow.vercel.app';
const TODAY = new Date().toISOString().slice(0, 10);

const coreUrls: Array<{ loc: string; priority: string; changefreq: string }> = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/pricing', priority: '0.9', changefreq: 'weekly' },
  { loc: '/demo', priority: '0.8', changefreq: 'weekly' },
  { loc: '/signup', priority: '0.8', changefreq: 'monthly' },
  { loc: '/features', priority: '0.7', changefreq: 'monthly' },
  { loc: '/free-tools', priority: '0.9', changefreq: 'weekly' },
  { loc: '/compare', priority: '0.8', changefreq: 'weekly' },
  { loc: '/alternatives', priority: '0.8', changefreq: 'weekly' },
  { loc: '/blog', priority: '0.7', changefreq: 'weekly' },
  { loc: '/integrations', priority: '0.7', changefreq: 'weekly' },
  { loc: '/guides/ai-sales-agents', priority: '0.8', changefreq: 'monthly' },
  { loc: '/case-studies', priority: '0.7', changefreq: 'weekly' },
  { loc: '/faq', priority: '0.6', changefreq: 'monthly' },
  { loc: '/about', priority: '0.5', changefreq: 'monthly' },
  { loc: '/contact', priority: '0.5', changefreq: 'monthly' },
  { loc: '/trust', priority: '0.5', changefreq: 'monthly' },
];

const toolPriority = (slug: string): string => {
  const popular = ['lead-leak-calculator', 'chatbot-roi-calculator', 'ai-prompt-generator', 'ai-chat-with-website'];
  return popular.includes(slug) ? '0.8' : '0.7';
};

const toolUrls = TOOLS.filter((t) => t.status === 'active').map((t) => ({
  loc: t.route ?? `/tools/${t.slug}`,
  priority: toolPriority(t.slug),
  changefreq: 'monthly',
}));

const audit: string[] = [];
for (const t of TOOLS) {
  if (!t.seo?.title) audit.push(`${t.slug}: missing seo.title`);
  if (!t.seo?.description) audit.push(`${t.slug}: missing seo.description`);
  if (!t.faqs || t.faqs.length < 2) audit.push(`${t.slug}: fewer than 2 FAQs`);
}

const lines: string[] = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...coreUrls.map(
    (u) =>
      `  <url><loc>${SITE}${u.loc}</loc><lastmod>${TODAY}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
  ),
  '  <!-- Tools -->',
  ...toolUrls.map(
    (u) =>
      `  <url><loc>${SITE}${u.loc}</loc><lastmod>${TODAY}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
  ),
  '</urlset>',
  '',
];

writeFileSync(join(publicDir, 'sitemap.xml'), lines.join('\n'), 'utf8');

console.log(
  JSON.stringify(
    {
      core: coreUrls.length,
      tools: toolUrls.length,
      total: coreUrls.length + toolUrls.length,
      audit,
    },
    null,
    1
  )
);