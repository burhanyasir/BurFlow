import { ParsedDocument, SourceType } from '../types';
import { DocumentParser, WebCrawler } from '../interfaces';
import { createHash, randomUUID } from 'crypto';

export class TextParser implements DocumentParser {
  supports(sourceType: string): boolean {
    return sourceType === 'text' || sourceType === 'txt';
  }

  async parse(content: Buffer | string, originalName: string, tenantId: string, metadata?: Record<string, unknown>): Promise<ParsedDocument> {
    const text = typeof content === 'string' ? content : content.toString('utf-8');
    const contentHash = createHash('sha256').update(text).digest('hex');
    const lines = text.split('\n');
    const title = lines[0]?.replace(/^#\s*/, '').trim() || originalName.replace(/\.\w+$/, '');
    const headings = this.extractHeadings(lines);
    const lists = this.extractLists(lines);
    const tables = this.extractTables(lines);

    return {
      documentId: `${tenantId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId,
      sourceType: 'text',
      originalName,
      title,
      content: text,
      metadata: { ...metadata, lineCount: lines.length, charCount: text.length },
      contentHash,
      headings,
      lists,
      tables,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  protected extractHeadings(lines: string[]): ParsedDocument['headings'] {
    return lines
      .map((line, i) => {
        const hMatch = line.match(/^(#{1,6})\s+(.+)/);
        if (hMatch) return { level: hMatch[1].length, text: hMatch[2].trim(), position: i };
        const ulMatch = line.match(/^([A-Z][A-Z\s]+)$/);
        if (ulMatch && line.trim().length > 0 && line.trim().length < 100) return { level: 1, text: line.trim(), position: i };
        return null;
      })
      .filter((h): h is ParsedDocument['headings'][0] => h !== null);
  }

  private extractLists(lines: string[]): ParsedDocument['lists'] {
    const lists: ParsedDocument['lists'] = [];
    let currentList: { items: string[]; ordered: boolean; start: number } | null = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const ulMatch = line.match(/^[-*+]\s+(.+)/);
      const olMatch = line.match(/^\d+[.)]\s+(.+)/);
      if (ulMatch || olMatch) {
        if (!currentList) currentList = { items: [], ordered: !!olMatch, start: i };
        currentList.items.push((ulMatch || olMatch)![1].trim());
      } else if (currentList) {
        if (line.trim() === '') {
          lists.push({ items: currentList.items, ordered: currentList.ordered, position: currentList.start });
          currentList = null;
        } else if (currentList.items.length > 0) {
          currentList.items[currentList.items.length - 1] += ' ' + line.trim();
        }
      }
    }
    if (currentList) lists.push({ items: currentList.items, ordered: currentList.ordered, position: currentList.start });
    return lists;
  }

  private extractTables(lines: string[]): ParsedDocument['tables'] {
    const tables: ParsedDocument['tables'] = [];
    for (let i = 0; i < lines.length - 2; i++) {
      const sepMatch = lines[i + 1]?.match(/^[\s\|: -]+$/);
      if (sepMatch && lines[i].includes('|') && lines[i + 2]?.includes('|')) {
        const headers = lines[i].split('|').filter(s => s.trim()).map(s => s.trim());
        const rows: string[][] = [];
        for (let j = i + 2; j < lines.length && lines[j].includes('|'); j++) {
          rows.push(lines[j].split('|').filter(s => s.trim()).map(s => s.trim()));
        }
        tables.push({ headers, rows, position: i });
        break;
      }
    }
    return tables;
  }
}

export class MarkdownParser extends TextParser {
  supports(sourceType: string): boolean {
    return sourceType === 'markdown' || sourceType === 'md';
  }

  async parse(content: Buffer | string, originalName: string, tenantId: string, metadata?: Record<string, unknown>): Promise<ParsedDocument> {
    const doc = await super.parse(content, originalName, tenantId, metadata);
    doc.sourceType = 'markdown';
    doc.content = typeof content === 'string' ? content : content.toString('utf-8');
    const lines = doc.content.split('\n');
    doc.headings = this.extractHeadings(lines);
    doc.metadata = { ...doc.metadata, isMarkdown: true, codeBlocks: this.countCodeBlocks(lines) };
    return doc;
  }

  private countCodeBlocks(lines: string[]): number {
    let count = 0;
    for (const line of lines) {
      if (line.trim().startsWith('```')) count++;
    }
    return Math.floor(count / 2);
  }
}

export class HtmlParser implements DocumentParser {
  supports(sourceType: string): boolean {
    return sourceType === 'html' || sourceType === 'htm';
  }

  async parse(content: Buffer | string, originalName: string, tenantId: string, metadata?: Record<string, unknown>): Promise<ParsedDocument> {
    const html = typeof content === 'string' ? content : content.toString('utf-8');
    const contentHash = createHash('sha256').update(html).digest('hex');
    const text = this.stripHtml(html);
    const title = this.extractTitle(html) || originalName.replace(/\.\w+$/, '');
    const lines = text.split('\n').filter(l => l.trim());
    const headings = this.extractHeadings(html);
    const lists = this.extractLists(html);

    return {
      documentId: `${tenantId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId,
      sourceType: 'html',
      originalName,
      title,
      content: text,
      metadata: { ...metadata, rawHtml: html.slice(0, 500), charCount: text.length },
      contentHash,
      headings,
      lists,
      tables: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, m => String.fromCharCode(parseInt(m.slice(2, -1), 10)))
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractTitle(html: string): string | null {
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return match ? match[1].trim() : null;
  }

  private extractHeadings(html: string): ParsedDocument['headings'] {
    const headings: ParsedDocument['headings'] = [];
    const regex = /<h([1-6])[^>]*>([^<]*)<\/h\1>/gi;
    let match: RegExpExecArray | null;
    let idx = 0;
    while ((match = regex.exec(html)) !== null) {
      headings.push({ level: parseInt(match[1], 10), text: this.stripHtml(match[2]).trim(), position: idx++ });
    }
    return headings;
  }

  private extractLists(html: string): ParsedDocument['lists'] {
    const lists: ParsedDocument['lists'] = [];
    const ulRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
    let ulMatch: RegExpExecArray | null;
    let pos = 0;
    while ((ulMatch = ulRegex.exec(html)) !== null) {
      const items = ulMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      lists.push({
        items: items.map(i => this.stripHtml(i)),
        ordered: false,
        position: pos++,
      });
    }
    const olRegex = /<ol[^>]*>([\s\S]*?)<\/ol>/gi;
    let olMatch: RegExpExecArray | null;
    while ((olMatch = olRegex.exec(html)) !== null) {
      const items = olMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      lists.push({
        items: items.map(i => this.stripHtml(i)),
        ordered: true,
        position: pos++,
      });
    }
    return lists;
  }
}

export class FaqParser implements DocumentParser {
  supports(sourceType: string): boolean {
    return sourceType === 'faq';
  }

  async parse(content: Buffer | string, originalName: string, tenantId: string, metadata?: Record<string, unknown>): Promise<ParsedDocument> {
    const text = typeof content === 'string' ? content : content.toString('utf-8');
    const contentHash = createHash('sha256').update(text).digest('hex');
    const pairs = this.parseQaPairs(text);
    const faqContent = pairs.map(p => `Q: ${p.question}\nA: ${p.answer}`).join('\n\n');
    const headings = pairs.map((p, i) => ({ level: 2, text: p.question, position: i * 2 }));

    return {
      documentId: `${tenantId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId,
      sourceType: 'faq',
      originalName,
      title: originalName.replace(/\.\w+$/, '') || 'FAQ Import',
      content: faqContent,
      metadata: { ...metadata, questionCount: pairs.length, format: 'q&a' },
      contentHash,
      headings,
      lists: [],
      tables: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private parseQaPairs(text: string): Array<{ question: string; answer: string }> {
    const pairs: Array<{ question: string; answer: string }> = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    let currentQ: string | null = null;
    let currentA: string[] = [];

    for (const line of lines) {
      const qMatch = line.match(/^(?:Q:|Question:)\s*(.+)/i);
      const aMatch = line.match(/^(?:A:|Answer:)\s*(.+)/i);

      if (qMatch) {
        if (currentQ && currentA.length > 0) {
          pairs.push({ question: currentQ, answer: currentA.join('\n') });
        }
        currentQ = qMatch[1].trim();
        currentA = [];
      } else if (aMatch) {
        currentA.push(aMatch[1].trim());
      } else if (currentQ) {
        currentA.push(line);
      }
    }
    if (currentQ && currentA.length > 0) {
      pairs.push({ question: currentQ, answer: currentA.join('\n') });
    }
    return pairs;
  }
}

export class CsvFaqParser implements DocumentParser {
  supports(sourceType: string): boolean {
    return sourceType === 'csv';
  }

  async parse(content: Buffer | string, originalName: string, tenantId: string, metadata?: Record<string, unknown>): Promise<ParsedDocument> {
    const text = typeof content === 'string' ? content : content.toString('utf-8');
    const contentHash = createHash('sha256').update(text).digest('hex');
    const pairs = this.parseCsv(text);
    const faqContent = pairs.map(p => `Q: ${p.question}\nA: ${p.answer}`).join('\n\n');
    const headings = pairs.map((p, i) => ({ level: 2, text: p.question, position: i * 2 }));

    return {
      documentId: `${tenantId}_${Date.now()}_${randomUUID().slice(0, 8)}`,
      tenantId,
      sourceType: 'faq',
      originalName,
      title: originalName.replace(/\.\w+$/, '') || 'CSV FAQ Import',
      content: faqContent,
      metadata: { ...metadata, questionCount: pairs.length, format: 'csv' },
      contentHash,
      headings,
      lists: [],
      tables: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private parseCsv(text: string): Array<{ question: string; answer: string }> {
    const pairs: Array<{ question: string; answer: string }> = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return pairs;

    // Detect delimiter (comma or semicolon)
    const first = lines[0];
    const commaCount = (first.match(/,/g) || []).length;
    const semicolonCount = (first.match(/;/g) || []).length;
    const delimiter = semicolonCount >= commaCount ? ';' : ',';

    // Simple CSV parsing (handles quoted values)
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; continue; }
        if (ch === delimiter && !inQuotes) { result.push(current.trim()); current = ''; continue; }
        current += ch;
      }
      result.push(current.trim());
      return result;
    };

    const startIndex = lines.length > 1 && lines[0].toLowerCase().includes('question') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      if (cols.length >= 2 && cols[0] && cols[1]) {
        pairs.push({ question: cols[0], answer: cols[1] });
      }
    }

    return pairs;
  }
}

export class PdfParser implements DocumentParser {
  supports(sourceType: string): boolean {
    return sourceType === 'pdf';
  }

  async parse(content: Buffer | string, originalName: string, tenantId: string, metadata?: Record<string, unknown>): Promise<ParsedDocument> {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const text = buffer.toString('utf-8').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    const contentHash = createHash('sha256').update(buffer).digest('hex');
    const extractedText = this.extractPdfText(text);
    const lines = extractedText.split('\n').filter(l => l.trim());
    const title = metadata?.title as string || originalName.replace(/\.\w+$/, '');
    const headings = lines
      .map((l, i) => l.match(/^[A-Z\s]{4,}$/) ? { level: 1, text: l.trim(), position: i } : null)
      .filter((h): h is ParsedDocument['headings'][0] => h !== null);

    return {
      documentId: `${tenantId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId,
      sourceType: 'pdf',
      originalName,
      title,
      content: extractedText,
      metadata: { ...metadata, charCount: extractedText.length, lineCount: lines.length, rawPdfLike: true },
      contentHash,
      headings,
      lists: [],
      tables: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private extractPdfText(raw: string): string {
    const step1 = raw
      .replace(/\(([^)]*)\)/g, '$1')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\n')
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .trim();
    return step1.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l).join('\n');
  }
}

export class DocxParser implements DocumentParser {
  supports(sourceType: string): boolean {
    return sourceType === 'docx';
  }

  async parse(content: Buffer | string, originalName: string, tenantId: string, metadata?: Record<string, unknown>): Promise<ParsedDocument> {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const contentHash = createHash('sha256').update(buffer).digest('hex');
    const text = buffer.toString('utf-8');
    const extracted = this.extractDocxText(text);
    const lines = extracted.split('\n').filter(l => l.trim());

    return {
      documentId: `${tenantId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId,
      sourceType: 'docx',
      originalName,
      title: metadata?.title as string || originalName.replace(/\.\w+$/, ''),
      content: extracted,
      metadata: { ...metadata, charCount: extracted.length },
      contentHash,
      headings: [],
      lists: [],
      tables: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private extractDocxText(raw: string): string {
    const textParts: string[] = [];
    const wpRegex = /<w:t[^>]*>([^<]*)<\/w:t>/gi;
    let match: RegExpExecArray | null;
    while ((match = wpRegex.exec(raw)) !== null) {
      textParts.push(match[1]);
    }
    return textParts.join(' ').replace(/\s+/g, ' ').trim();
  }
}

async function parseSitemapUrl(sitemapUrl: string): Promise<string[]> {
  const urls: string[] = [];
  try {
    const response = await fetch(sitemapUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return urls;
    const xml = await response.text();

    // Parse <url><loc>...</loc></url>
    const urlRegex = /<loc[^>]*>([^<]+)<\/loc>/gi;
    let match: RegExpExecArray | null;
    while ((match = urlRegex.exec(xml)) !== null) {
      const href = match[1].trim();
      if (href.startsWith('http')) urls.push(href);
    }

    // Handle sitemap index: <sitemap><loc>...</loc></sitemap>
    const sitemapRegex = /<sitemap[^>]*>[\s\S]*?<loc[^>]*>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi;
    while ((match = sitemapRegex.exec(xml)) !== null) {
      const childUrls = await parseSitemapUrl(match[1].trim());
      urls.push(...childUrls);
    }
  } catch {}
  return [...new Set(urls)];
}

export class WebsiteCrawler implements WebCrawler {
  private static PRIVATE_IP_PATTERNS = [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^0\./,
    /^::1$/,
    /^fc00:/i,
    /^fd[0-9a-f]{2}:/i,
    /^fe80:/i,
    /^localhost$/i,
  ];

  private static isPrivateUrl(urlStr: string): boolean {
    try {
      const url = new URL(urlStr);
      const hostname = url.hostname;
      const isDev = process.env.NODE_ENV === 'development';
      if (/^localhost$/i.test(hostname)) return !isDev;
      if (hostname === '[::1]') return !isDev;
      if (/^127\./.test(hostname)) return !isDev;
      if (/^10\./.test(hostname)) return true;
      if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) return true;
      if (/^192\.168\./.test(hostname)) return true;
      if (/^169\.254\./.test(hostname)) return true;
      if (/^0\./.test(hostname)) return true;
      if (/^fc00:/i.test(hostname)) return true;
      if (/^fd[0-9a-f]{2}:/i.test(hostname)) return true;
      if (/^fe80:/i.test(hostname)) return true;
      return false;
    } catch {
      return true;
    }
  }

  async crawl(url: string, tenantId: string, options?: { respectRobotsTxt?: boolean; maxDepth?: number; maxPages?: number; useSitemap?: boolean; onProgress?: (pagesCrawled: number, queueRemaining: number) => void }): Promise<ParsedDocument[]> {
    const maxDepth = Math.min(options?.maxDepth ?? 5, 15);
    const maxPages = Math.min(options?.maxPages ?? 50, 1000);
    const respectRobots = options?.respectRobotsTxt ?? true;
    const useSitemap = options?.useSitemap ?? true;
    const onProgress = options?.onProgress;

    if (WebsiteCrawler.isPrivateUrl(url)) {
      throw new Error('URL points to a private/internal network address');
    }

    // Extract the target domain to stay on the same site
    const initialParsed = new URL(url);
    const targetDomain = initialParsed.hostname;

    const visited = new Set<string>();
    const results: ParsedDocument[] = [];
    const queue: Array<{ url: string; depth: number }> = [];
    const parser = new HtmlParser();
    const robotsCache = new Map<string, boolean>();

    if (respectRobots) {
      const allowed = await this.checkRobotsTxtCached(url, robotsCache);
      if (!allowed) return [];
    }

    // Check for sitemap.xml and use it if available
    if (useSitemap) {
      const parsed = new URL(url);
      const sitemapUrl = `${parsed.protocol}//${parsed.host}/sitemap.xml`;
      const sitemapUrls = await parseSitemapUrl(sitemapUrl);
      for (const su of sitemapUrls) {
        if (queue.length + results.length < maxPages * 2) {
          queue.push({ url: su, depth: 1 });
        }
      }
    }

    // If no sitemap results, use the original URL as seed
    if (queue.length === 0) {
      queue.push({ url, depth: 0 });
    }

    while (queue.length > 0 && results.length < maxPages) {
      const item = queue.shift()!;
      console.log(`[crawl] Processing: ${item.url} (depth=${item.depth}, visited=${visited.size}, queue=${queue.length}, results=${results.length})`);
      if (visited.has(item.url)) { console.log(`[crawl] SKIP (visited)`); continue; }
      if (WebsiteCrawler.isPrivateUrl(item.url)) { console.log(`[crawl] SKIP (private)`); continue; }

      try {
        await this.rateLimit();
        const response = await fetch(item.url, { signal: AbortSignal.timeout(30000) });
        if (!response.ok) { console.log(`[crawl] SKIP (HTTP ${response.status}): ${item.url}`); continue; }

        const contentType = response.headers.get('content-type') || '';
        // Be permissive: allow any content type that isn't explicitly non-text
        // Many modern sites return application/json or no content-type at all
        const forbiddenTypes = ['image/', 'video/', 'audio/', 'application/pdf', 'application/'];
        if (forbiddenTypes.some(t => contentType.startsWith(t))) { console.log(`[crawl] SKIP (non-text content): ${item.url}`); continue; }

        const html = await response.text();
        const canonical = this.extractCanonical(html) || item.url;
        if (visited.has(canonical)) { console.log(`[crawl] SKIP (canonical duplicate): ${item.url} -> ${canonical}`); continue; }
        visited.add(item.url);
        visited.add(canonical);

        const doc = await parser.parse(html, item.url, tenantId, { sourceUrl: item.url, canonicalUrl: canonical, crawlDepth: item.depth, fetchedAt: new Date().toISOString() });
        results.push(doc);
        if (onProgress) onProgress(results.length, queue.length);

        if (item.depth < maxDepth) {
          const links = this.extractLinks(html, item.url);
          let added = 0;
          for (const link of links) {
            if (visited.has(link) || results.length + queue.length >= maxPages) continue;
            if (WebsiteCrawler.isPrivateUrl(link)) continue;
            // Stay on the same domain (or subdomain) as the initial URL
            try {
              const linkHost = new URL(link).hostname;
              if (linkHost !== targetDomain && !linkHost.endsWith('.' + targetDomain)) continue;
            } catch { continue; }
            if (respectRobots) {
              const allowed = await this.checkRobotsTxtCached(link, robotsCache);
              if (!allowed) { console.log(`[crawl] SKIP (robots disallowed): ${link}`); continue; }
            }
            queue.push({ url: link, depth: item.depth + 1 });
            added++;
          }
          console.log(`[crawl] ${item.url} -> ${links.length} links, ${added} added, queue=${queue.length}, results=${results.length}`);
        }
      } catch {
        continue;
      }
    }
    return results;
  }

  private lastFetchTime = 0;
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const minInterval = 200; // max 5 requests per second
    const wait = minInterval - (now - this.lastFetchTime);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    this.lastFetchTime = Date.now();
  }

  private extractCanonical(html: string): string | null {
    const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
    return match ? match[1] : null;
  }

  private extractLinks(html: string, baseUrl: string): string[] {
    const links: string[] = [];
    const regex = /<a[^>]+href=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      try {
        const absolute = new URL(match[1], baseUrl).href;
        if (absolute.startsWith('http') && !absolute.includes('#') && !absolute.match(/\.(pdf|zip|png|jpg|jpeg|gif|svg|ico)$/i)) {
          links.push(absolute);
        }
      } catch {}
    }
    return [...new Set(links)];
  }

  private async checkRobotsTxtCached(url: string, cache: Map<string, boolean>): Promise<boolean> {
    try {
      const parsed = new URL(url);
      const origin = `${parsed.protocol}//${parsed.host}`;
      if (cache.has(origin)) return cache.get(origin)!;
      const robotsUrl = `${origin}/robots.txt`;
      const response = await fetch(robotsUrl, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) { cache.set(origin, true); return true; }
      const text = await response.text();
      const allowed = !text.includes('Disallow: /');
      cache.set(origin, allowed);
      return allowed;
    } catch {
      return true;
    }
  }
}
