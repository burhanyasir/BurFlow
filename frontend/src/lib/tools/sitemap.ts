export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

export interface SitemapParseResult {
  entries: SitemapUrlEntry[];
  isIndex: boolean;
  childSitemaps: string[];
  error?: string;
}

export function parseSitemapXml(xml: string): SitemapParseResult {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) return { entries: [], isIndex: false, childSitemaps: [], error: 'Invalid XML — the file could not be parsed.' };
  const root = doc.documentElement;
  if (!root) return { entries: [], isIndex: false, childSitemaps: [], error: 'Empty document.' };
  const isIndex = root.nodeName === 'sitemapindex' || root.nodeName.endsWith(':sitemapindex');
  const childSitemaps = Array.from(root.getElementsByTagName('loc'))
    .map((n) => n.textContent?.trim() ?? '')
    .filter(Boolean);
  const entries: SitemapUrlEntry[] = [];
  for (const urlNode of Array.from(root.children).filter((n) => n.nodeName === 'url' || n.nodeName.endsWith(':url'))) {
    const get = (tag: string) => {
      const el = urlNode.getElementsByTagName(tag)[0] ?? urlNode.getElementsByTagName(`sitemap:${tag}`)[0];
      return el?.textContent?.trim() ?? undefined;
    };
    const loc = get('loc');
    if (loc) {
      entries.push({ loc, lastmod: get('lastmod'), changefreq: get('changefreq'), priority: get('priority') });
    }
  }
  return { entries, isIndex, childSitemaps: isIndex ? childSitemaps : [] };
}

export function validateSitemap(xml: string): { ok: boolean; issues: string[]; entryCount: number; score: number } {
  const parsed = parseSitemapXml(xml);
  const issues: string[] = [];
  if (parsed.error) return { ok: false, issues: [parsed.error], entryCount: 0, score: 0 };
  if (parsed.isIndex) {
    issues.push('This is a sitemap index file, not a URL sitemap — validate the child sitemaps instead.');
    return { ok: false, issues, entryCount: parsed.childSitemaps.length, score: 10 };
  }
  if (parsed.entries.length === 0) {
    issues.push('No <url> entries with <loc> were found.');
    return { ok: false, issues, entryCount: 0, score: 0 };
  }
  let score = 50;
  if (parsed.entries.length > 50000) {
    issues.push(`Exceeds the 50,000 URL limit (found ${parsed.entries.length}).`);
    score -= 25;
  }
  const protocols = new Set(parsed.entries.map((e) => {
    try { return new URL(e.loc).protocol; } catch { return 'invalid'; }
  }));
  if (protocols.size > 1) {
    issues.push('Mixed protocols detected (http and https URLs).');
    score -= 10;
  }
  const invalid = parsed.entries.filter((e) => {
    try { new URL(e.loc); return false; } catch { return true; }
  });
  if (invalid.length > 0) {
    issues.push(`${invalid.length} <loc> entries are not valid absolute URLs.`);
    score -= 15;
  }
  const withLastmod = parsed.entries.filter((e) => e.lastmod).length;
  const withPriority = parsed.entries.filter((e) => e.priority !== undefined).length;
  if (withLastmod / parsed.entries.length < 0.5) issues.push('Fewer than half the URLs have <lastmod> — adding it helps crawlers.');
  else score += 10;
  if (withPriority / parsed.entries.length < 0.5) issues.push('Fewer than half the URLs have <priority> — optional but recommended.');
  if (issues.length === 0) issues.push('No issues found — this sitemap looks healthy.');
  score = Math.min(100, score);
  return { ok: issues.every((i) => !i.startsWith('Exceeds') && !i.startsWith('No <url>') && !i.startsWith('This is') && !i.startsWith('Invalid XML') && !i.startsWith('Mixed') && !i.startsWith('Empty')), entryCount: parsed.entries.length, issues, score };
}

export function extractUrls(xml: string): string[] {
  return parseSitemapXml(xml).entries.map((e) => e.loc);
}

export function compareSitemaps(xmlA: string, xmlB: string): { added: string[]; removed: string[]; unchanged: string[] } {
  const a = new Set(extractUrls(xmlA));
  const b = new Set(extractUrls(xmlB));
  return {
    added: Array.from(b).filter((u) => !a.has(u)),
    removed: Array.from(a).filter((u) => !b.has(u)),
    unchanged: Array.from(a).filter((u) => b.has(u)),
  };
}

export function splitSitemap(xml: string, chunkSize: number): { name: string; content: string }[] {
  const entries = parseSitemapXml(xml).entries;
  const chunks: { name: string; content: string }[] = [];
  for (let i = 0; i < entries.length; i += chunkSize) {
    const slice = entries.slice(i, i + chunkSize);
    chunks.push({
      name: `sitemap-${i / chunkSize + 1}.xml`,
      content: xmlHeader() + slice.map((e) => `  <url>\n    <loc>${escapeXml(e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${escapeXml(e.lastmod)}</lastmod>` : ''}${e.priority !== undefined ? `\n    <priority>${escapeXml(e.priority)}</priority>` : ''}\n  </url>`).join('\n') + xmlFooter(),
    });
  }
  return chunks;
}

export function mergeSitemaps(xmls: string[]): string {
  const entries = xmls.flatMap((x) => parseSitemapXml(x).entries);
  const seen = new Set<string>();
  const unique = entries.filter((e) => {
    if (seen.has(e.loc)) return false;
    seen.add(e.loc);
    return true;
  });
  return xmlHeader() + unique.map((e) => `  <url>\n    <loc>${escapeXml(e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${escapeXml(e.lastmod)}</lastmod>` : ''}${e.priority !== undefined ? `\n    <priority>${escapeXml(e.priority)}</priority>` : ''}\n  </url>`).join('\n') + xmlFooter();
}

export function buildSitemapFromUrls(urls: string[], options: { changefreq?: string; priority?: string; lastmod?: string } = {}): string {
  const { changefreq, priority, lastmod } = options;
  return xmlHeader() + urls.map((u) => `  <url>\n    <loc>${escapeXml(u)}</loc>${changefreq ? `\n    <changefreq>${escapeXml(changefreq)}</changefreq>` : ''}${priority ? `\n    <priority>${escapeXml(priority)}</priority>` : ''}${lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : ''}\n  </url>`).join('\n') + xmlFooter();
}

export function buildSitemapIndex(sitemapUrls: string[]): string {
  const now = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    sitemapUrls.map((u) => `  <sitemap>\n    <loc>${escapeXml(u)}</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`).join('\n') +
    `\n</sitemapindex>\n`;
}

export function buildRobotsTxt(options: { userAgents: string[]; allow: string[]; disallow: string[]; sitemapUrls: string[]; crawlDelay?: number }): string {
  const lines: string[] = [];
  const agents = options.userAgents.length > 0 ? options.userAgents : ['*'];
  for (const agent of agents) {
    lines.push(`User-agent: ${agent}`);
    for (const a of options.allow) lines.push(`Allow: ${a}`);
    for (const d of options.disallow) lines.push(`Disallow: ${d}`);
    if (options.crawlDelay !== undefined) lines.push(`Crawl-delay: ${options.crawlDelay}`);
    lines.push('');
  }
  for (const s of options.sitemapUrls) lines.push(`Sitemap: ${s}`);
  return lines.join('\n');
}

export interface SitemapAnalysis {
  total: number;
  byExtension: Record<string, number>;
  byDepth: Record<string, number>;
  changefreqCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  recommendations: string[];
}

export function analyzeSitemap(xml: string): SitemapAnalysis {
  const entries = parseSitemapXml(xml).entries;
  const byExtension: Record<string, number> = {};
  const byDepth: Record<string, number> = {};
  const changefreqCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};
  for (const e of entries) {
    let path = '';
    try { path = new URL(e.loc).pathname; } catch { continue; }
    const ext = path.split('.').pop()?.toLowerCase() || 'html';
    if (ext === path.replace(/\//g, '') || ext.includes('/')) {
      byExtension['html'] = (byExtension['html'] ?? 0) + 1;
    } else {
      byExtension[ext] = (byExtension[ext] ?? 0) + 1;
    }
    const depth = path.split('/').filter(Boolean).length;
    byDepth[String(depth)] = (byDepth[String(depth)] ?? 0) + 1;
    const cf = e.changefreq ?? 'none';
    changefreqCounts[cf] = (changefreqCounts[cf] ?? 0) + 1;
    const pr = e.priority ?? 'none';
    priorityCounts[pr] = (priorityCounts[pr] ?? 0) + 1;
  }
  const recommendations: string[] = [];
  if (Object.keys(changefreqCounts).length === 1 && changefreqCounts['none'] === entries.length) {
    recommendations.push('No <changefreq> values — adding them helps crawlers prioritize re-crawls.');
  }
  if (Object.keys(priorityCounts).length === 1 && priorityCounts['none'] === entries.length) {
    recommendations.push('No <priority> values — optional, but useful for large sites.');
  }
  const deep = Object.entries(byDepth).filter(([d]) => Number(d) >= 4);
  if (deep.length > 0) {
    recommendations.push(`Found URLs ${deep.map(([d, c]) => `${d} levels deep (${c})`).join(', ')} — very deep pages are rarely indexed.`);
  }
  if (byExtension['pdf'] || byExtension['zip'] || byExtension['docx']) {
    recommendations.push('Large binary files (PDF/ZIP/DOCX) in the sitemap may slow down crawling — consider moving them to their own sitemap.');
  }
  if (recommendations.length === 0) recommendations.push('The sitemap structure looks well organized.');
  return { total: entries.length, byExtension, byDepth, changefreqCounts, priorityCounts, recommendations };
}

export function sitemapCandidates(origin: string): string[] {
  const root = origin.endsWith('/') ? origin.slice(0, -1) : origin;
  return [
    `${root}/sitemap.xml`,
    `${root}/sitemap_index.xml`,
    `${root}/sitemap-index.xml`,
    `${root}/sitemap1.xml`,
    `${root}/sitemap/`,
    `${root}/sitemaps/sitemap.xml`,
    `${root}/wp-sitemap.xml`,
  ];
}

export async function findSitemap(origin: string): Promise<{ url: string; status: 'found' | 'not-found' | 'blocked' }[]> {
  const results: { url: string; status: 'found' | 'not-found' | 'blocked' }[] = [];
  for (const candidate of sitemapCandidates(origin)) {
    try {
      const res = await fetch(candidate, { mode: 'cors' });
      if (res.ok) {
        const text = await res.text();
        results.push({ url: candidate, status: text.includes('<urlset') || text.includes('<sitemapindex') ? 'found' : 'not-found' });
      } else {
        results.push({ url: candidate, status: 'not-found' });
      }
    } catch {
      results.push({ url: candidate, status: 'blocked' });
    }
  }
  return results;
}

/** Generates likely site URLs from a domain (demo-mode crawl when CORS blocks real crawling). */
export function demoCrawl(origin: string): string[] {
  const root = origin.endsWith('/') ? origin.slice(0, -1) : origin;
  return [
    `${root}/`,
    `${root}/about`,
    `${root}/features`,
    `${root}/pricing`,
    `${root}/blog`,
    `${root}/contact`,
    `${root}/docs`,
    `${root}/terms`,
    `${root}/privacy`,
  ];
}

function xmlHeader(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
}

function xmlFooter(): string {
  return `\n</urlset>\n`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}