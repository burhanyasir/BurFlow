import { ParsedDocument, SourceType } from '../types';
import { DocumentParser, WebCrawler } from '../interfaces';
import { createHash, randomUUID } from 'crypto';
import { lookup as dnsLookup } from 'dns';
import { promisify } from 'util';

const dnsLookupAsync = promisify(dnsLookup);

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
      .replace(/<(br|hr|\/p|\/div|\/h[1-6]|\/li|\/tr|\/blockquote)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, m => String.fromCharCode(parseInt(m.slice(2, -1), 10)))
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .replace(/^\n+|\n+$/g, '')
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

async function parseSitemapUrl(sitemapUrl: string, depth = 0): Promise<string[]> {
  if (depth > 3) return [];
  const urls: string[] = [];
  try {
    const response = await fetch(sitemapUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'BurFlowBot/1.0 (+https://burflow.com/bot)' },
      redirect: 'follow',
    });
    if (!response.ok) return urls;
    const xml = await response.text();
    const urlRegex = /<loc[^>]*>([^<]+)<\/loc>/gi;
    let match: RegExpExecArray | null;
    while ((match = urlRegex.exec(xml)) !== null) {
      const href = match[1].trim();
      if (href.startsWith('http')) urls.push(href);
    }
    const sitemapRegex = /<sitemap[^>]*>[\s\S]*?<loc[^>]*>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi;
    while ((match = sitemapRegex.exec(xml)) !== null) {
      const childUrls = await parseSitemapUrl(match[1].trim(), depth + 1);
      urls.push(...childUrls);
    }
  } catch {}
  return [...new Set(urls)];
}

function normalizeUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    let host = u.hostname.toLowerCase();
    if (host.startsWith('www.')) host = host.slice(4);
    let path = u.pathname.replace(/\/+$/, '').replace(/\/index\.\w+$/, '') || '/';
    path = path.replace(/\.\w+$/, '');
    const stripped = u.search
      .split('&')
      .filter(p => !/^(utm_|fbclid|gclid|ref|mc_cid|mc_eid|_ga|_gl)=/.test(p))
      .join('&');
    const norm = `${host}${path}${stripped ? '?' + stripped : ''}`;
    return norm;
  } catch {
    return urlStr;
  }
}

const CHALLENGE_SIGNATURES = [
  /just a moment/i, /verify you are human/i, /checking your browser/i,
  /turnstile/i, /cf-challenge/i, /_cf_chl/i,
  /request blocked by security/i, /ddos protection by cloudflare/i,
  /enable javascript to continue/i, /enable javascript and cookies to continue/i,
];
const SOFT_404_TITLES = /404|not found|page not found|access denied|error|oops/i;
const BOILERPLATE_NAV = /^(menu|navigation|header|footer|sidebar|cookie|copyright|©|all rights reserved)/i;
const TRACKING_PARAMS = /^(utm_|fbclid|gclid|ref|mc_cid|_ga|_gl)/;

function isChallengeOrBlocked(text: string, title: string): boolean {
  if (CHALLENGE_SIGNATURES.some(re => re.test(text))) return true;
  if (SOFT_404_TITLES.test(title)) return true;
  return false;
}

function contentQualityScore(text: string, rawHtml?: string): { score: number; reason?: string } {
  const len = text.length;
  if (len < 200) return { score: 0, reason: 'too_short' };
  const pTags = (rawHtml?.match(/<p[\s>]/gi) || []).length;
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 50) return { score: 0, reason: 'too_few_words' };
  const lines = text.split('\n').filter(l => l.trim());
  const uniqueLines = new Set(lines.map(l => l.trim().toLowerCase()));
  const boilerplateRatio = 1 - (uniqueLines.size / Math.max(lines.length, 1));
  if (boilerplateRatio > 0.9) return { score: 0, reason: 'high_boilerplate' };
  return { score: Math.min(10, Math.floor(wordCount / 100) + (pTags > 3 ? 3 : pTags > 0 ? 1 : 0)) };
}

export class WebsiteCrawler implements WebCrawler {
  private static PRIVATE_IP_PATTERNS = [
    /^127\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./, /^192\.168\./,
    /^169\.254\./, /^0\./, /^::1$/, /^fc00:/i, /^fd[0-9a-f]{2}:/i, /^fe80:/i,
    /^::ffff:(\d{1,3}\.){3}\d{1,3}$/i, /^100\.6[4-9]\./, /^100\.[7-9]\d\./,
    /^100\.1[0-1]\d\./, /^100\.12[0-7]\./,
  ];
  private static SCHEME_ALLOW = new Set(['http:', 'https:']);
  private static MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
  private static FIRST_BYTE_TIMEOUT_MS = 8000;
  private static TOTAL_TIMEOUT_MS = 20000;
  private static MAX_REDIRECTS = 5;
  private static CIRCUIT_BREAKER_THRESHOLD = 3;
  private static CIRCUIT_BREAKER_TIMEOUT_MS = 60000;

  private hostFailures = new Map<string, number>();
  private hostCircuitOpen = new Map<string, number>();
  private robotsCache = new Map<string, { rules: RobotsRules; fetchedAt: number }>();
  private contentHashes = new Set<string>();

  private static isPrivateIp(ip: string): boolean {
    return WebsiteCrawler.PRIVATE_IP_PATTERNS.some(p => p.test(ip));
  }

  private static isPrivateUrl(urlStr: string): boolean {
    try {
      const url = new URL(urlStr);
      if (!WebsiteCrawler.SCHEME_ALLOW.has(url.protocol)) return true;
      const hostname = url.hostname;
      const isDev = process.env.NODE_ENV === 'development';
      const allowLocalhost = process.env.ALLOW_LOCALHOST_CRAWL === 'true';
      if (/^localhost$/i.test(hostname)) return !(isDev || allowLocalhost);
      if (hostname === '[::1]') return !(isDev || allowLocalhost);
      if (/^127\./.test(hostname)) return !(isDev || allowLocalhost);
      return WebsiteCrawler.PRIVATE_IP_PATTERNS.some(p => p.test(hostname));
    } catch {
      return true;
    }
  }

  private async resolveDns(hostname: string): Promise<string[]> {
    try {
      const result = await dnsLookupAsync(hostname, { all: true });
      return result.map(r => r.address);
    } catch {
      return [];
    }
  }

  private async validateResolvedIp(hostname: string): Promise<boolean> {
    const isDev = process.env.NODE_ENV === 'development';
    const allowLocalhost = process.env.ALLOW_LOCALHOST_CRAWL === 'true';
    if (/^localhost$/i.test(hostname) && (isDev || allowLocalhost)) return true;
    const ips = await this.resolveDns(hostname);
    if (ips.length === 0) return false;
    return ips.every(ip => !WebsiteCrawler.isPrivateIp(ip));
  }

  private isHostCircuitOpen(hostname: string): boolean {
    const openAt = this.hostCircuitOpen.get(hostname);
    if (!openAt) return false;
    if (Date.now() - openAt > WebsiteCrawler.CIRCUIT_BREAKER_TIMEOUT_MS) {
      this.hostCircuitOpen.delete(hostname);
      this.hostFailures.delete(hostname);
      return false;
    }
    return true;
  }

  private recordHostFailure(hostname: string): void {
    const count = (this.hostFailures.get(hostname) || 0) + 1;
    this.hostFailures.set(hostname, count);
    if (count >= WebsiteCrawler.CIRCUIT_BREAKER_THRESHOLD) {
      this.hostCircuitOpen.set(hostname, Date.now());
    }
  }

  private resetHostFailure(hostname: string): void {
    this.hostFailures.set(hostname, 0);
  }

  private lastFetchByHost = new Map<string, number>();
  private async rateLimit(hostname: string, hostDelay = 250): Promise<void> {
    const lastFetch = this.lastFetchByHost.get(hostname) || 0;
    const now = Date.now();
    const wait = hostDelay - (now - lastFetch);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    this.lastFetchByHost.set(hostname, Date.now());
  }

  private async fetchWithLimits(urlStr: string): Promise<{ ok: boolean; status: number; contentType: string; body: string; redirected: boolean } | null> {
    let redirected = false;
    let currentUrl = urlStr;
    let redirectCount = 0;

    for (let hop = 0; hop <= WebsiteCrawler.MAX_REDIRECTS; hop++) {
      const parsedUrl = new URL(currentUrl);
      const hostname = parsedUrl.hostname;

      if (this.isHostCircuitOpen(hostname)) return null;
      if (!(await this.validateResolvedIp(hostname))) return null;

      await this.rateLimit(hostname);

      const controller = new AbortController();
      const totalTimer = setTimeout(() => controller.abort(), WebsiteCrawler.TOTAL_TIMEOUT_MS);

      try {
        const response = await fetch(currentUrl, {
          signal: controller.signal,
          redirect: 'manual',
          headers: {
            'User-Agent': 'BurFlowBot/1.0 (+https://burflow.com/bot)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Encoding': 'gzip, br',
            'Accept-Language': 'en-US,en;q=0.5',
          },
        });

        clearTimeout(totalTimer);

        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('location');
          if (!location) break;
          try {
            currentUrl = new URL(location, currentUrl).href;
          } catch { break; }
          const nextParsed = new URL(currentUrl);
          if (!WebsiteCrawler.SCHEME_ALLOW.has(nextParsed.protocol)) return null;
          if (await this.validateResolvedIp(nextParsed.hostname) === false) return null;
          redirected = true;
          redirectCount++;
          continue;
        }

        const contentType = (response.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
        const ALLOWED_TYPES = ['text/html', 'application/xhtml+xml', 'text/plain', 'application/xml', 'text/xml'];
        const isAllowed = ALLOWED_TYPES.some(t => contentType.includes(t));

        if (!isAllowed && contentType) {
          const sniff = await response.clone().text().then(t => t.slice(0, 1024).trim(), () => '');
          const looksLikeMarkup = /^<(!doctype|html|\/html|\?xml)/i.test(sniff) || /^<!doctype/i.test(sniff);
          if (!looksLikeMarkup) return null;
        }

        const reader = response.body?.getReader();
        if (!reader) return null;
        const chunks: Uint8Array[] = [];
        let totalBytes = 0;
        const firstByteTimer = setTimeout(() => controller.abort(), WebsiteCrawler.FIRST_BYTE_TIMEOUT_MS);
        let firstByteReceived = false;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!firstByteReceived) { firstByteReceived = true; clearTimeout(firstByteTimer); }
            chunks.push(value);
            totalBytes += value.length;
            if (totalBytes > WebsiteCrawler.MAX_RESPONSE_BYTES) { controller.abort(); break; }
          }
        } catch {} finally { clearTimeout(firstByteTimer); }
        clearTimeout(totalTimer);

        const body = new TextDecoder('utf-8', { fatal: false }).decode(Buffer.concat(chunks));
        return { ok: response.ok, status: response.status, contentType, body, redirected };
      } catch {
        clearTimeout(totalTimer);
        this.recordHostFailure(hostname);
        return null;
      }
    }
    return null;
  }

  private async checkRobotsTxt(origin: string): Promise<RobotsRules> {
    const cached = this.robotsCache.get(origin);
    if (cached && Date.now() - cached.fetchedAt < 3600000) return cached.rules;

    const rules: RobotsRules = { disallowAll: false, rules: [] };
    try {
      const robotsUrl = `${origin}/robots.txt`;
      const resp = await this.fetchWithLimits(robotsUrl);
      if (!resp || !resp.ok) { this.robotsCache.set(origin, { rules, fetchedAt: Date.now() }); return rules; }
      this.parseRobotsTxt(resp.body, rules);
    } catch {}
    this.robotsCache.set(origin, { rules, fetchedAt: Date.now() });
    return rules;
  }

  private parseRobotsTxt(text: string, rules: RobotsRules): void {
    const lines = text.split('\n').map(l => l.replace(/\r$/, '').trim());
    let currentAgents: string[] = [];
    const rawDirectives: Array<{ agent: string; directive: string; value: string }> = [];

    for (const line of lines) {
      if (line.startsWith('#') || !line) continue;
      const colonIdx = line.indexOf(':');
      if (colonIdx < 0) continue;
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const val = line.slice(colonIdx + 1).trim();
      if (key === 'user-agent') { currentAgents = [val]; }
      else { for (const agent of currentAgents) { rawDirectives.push({ agent, directive: key, value: val }); } }
    }

    for (const d of rawDirectives) {
      if (d.agent !== '*' && !d.agent.toLowerCase().includes('burflow')) continue;
      if (d.directive === 'disallow' && d.value) {
        rules.rules.push({ path: d.value, allow: false });
      } else if (d.directive === 'allow' && d.value) {
        rules.rules.push({ path: d.value, allow: true });
      } else if (d.directive === 'disallow' && !d.value) {
        rules.rules.push({ path: '/', allow: true });
      }
    }

    const disallowRoot = rules.rules.find(r => !r.allow && (r.path === '/' || r.path === ''));
    const allowRoot = rules.rules.find(r => r.allow && r.path === '/');
    if (disallowRoot && !allowRoot) {
      const hasAnyAllow = rules.rules.some(r => r.allow && r.path.length > 1);
      if (!hasAnyAllow) rules.disallowAll = true;
    }
  }

  private isAllowedByRobots(urlStr: string, rules: RobotsRules): boolean {
    if (rules.disallowAll) return false;
    try {
      const path = new URL(urlStr).pathname;
      let bestMatch: { length: number; allow: boolean } | null = null;
      for (const rule of rules.rules) {
        if (rule.path === '/') continue;
        const escaped = rule.path.replace(/([.+?^${}()|[\]\\])/g, '\\$1');
        const pattern = escaped.replace(/\*/g, '.*').replace(/\$/g, '');
        const re = new RegExp(`^${pattern}`);
        if (re.test(path)) {
          if (!bestMatch || rule.path.length > bestMatch.length) {
            bestMatch = { length: rule.path.length, allow: rule.allow };
          }
        }
      }
      return bestMatch ? bestMatch.allow : true;
    } catch {
      return true;
    }
  }

  private scoreUrl(urlStr: string, inSitemap: boolean, inNav: boolean): number {
    let score = 0;
    try {
      const path = new URL(urlStr).pathname.toLowerCase();
      if (/(pricing|plans|services|products|about|faq|contact|how-it-works|solutions|docs|features)/.test(path)) score += 10;
      if (/(blog|news|press|events|author|tag|category|archive|page\/\d)/.test(path)) score -= 5;
      if (/\?.*=/.test(urlStr)) score -= 4;
      if (/\/page\/\d+/.test(path)) score -= 8;
      if (/\/20\d\d\/\d\d/.test(path)) score -= 3;
      const segments = path.split('/').filter(Boolean);
      if (segments.length <= 2) score += 2;
      if (inSitemap) score += 4;
      if (inNav) score += 4;
      const depth = segments.length;
      if (depth <= 1) score += 6;
      else if (depth <= 2) score += 3;
    } catch {}
    return score;
  }

  async crawl(url: string, tenantId: string, options?: { respectRobotsTxt?: boolean; maxDepth?: number; maxPages?: number; useSitemap?: boolean; onProgress?: (pagesCrawled: number, queueRemaining: number) => void }): Promise<ParsedDocument[]> {
    const maxPages = Math.min(options?.maxPages ?? 50, 200);
    const respectRobots = options?.respectRobotsTxt ?? true;
    const useSitemap = options?.useSitemap ?? true;
    const onProgress = options?.onProgress;
    const wallClockStart = Date.now();
    const WALL_CLOCK_BUDGET_MS = 120000;

    if (WebsiteCrawler.isPrivateUrl(url)) throw new Error('URL points to a private/internal network address');

    const initialParsed = new URL(url);
    const targetDomain = initialParsed.hostname;
    const origin = `${initialParsed.protocol}//${initialParsed.host}`;

    if (!(await this.validateResolvedIp(initialParsed.hostname))) {
      throw new Error('DNS resolution failed or resolved to a private IP');
    }

    let robotsRules: RobotsRules = { disallowAll: false, rules: [] };
    if (respectRobots) {
      robotsRules = await this.checkRobotsTxt(origin);
    }

    const sitemapUrls = new Set<string>();
    if (useSitemap) {
      for (const path of ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml']) {
        const found = await parseSitemapUrl(`${origin}${path}`);
        for (const u of found) sitemapUrls.add(u);
      }
    }

    const visited = new Set<string>();
    const results: ParsedDocument[] = [];
    const queue = PriorityQueue<{ url: string; depth: number; score: number }>((a, b) => b.score - a.score);
    const parser = new HtmlParser();

    if (sitemapUrls.size > 0) {
      for (const su of sitemapUrls) {
        if (visited.has(normalizeUrl(su))) continue;
        const s = this.scoreUrl(su, true, false);
        queue.push({ url: su, depth: 1, score: s });
      }
    } else {
      queue.push({ url, depth: 0, score: 100 });
    }

    const consecutiveLowYield: number[] = [];

    while (queue.size() > 0 && results.length < maxPages) {
      if (Date.now() - wallClockStart > WALL_CLOCK_BUDGET_MS) break;

      const item = queue.pop()!;
      const normKey = normalizeUrl(item.url);
      if (visited.has(normKey)) continue;
      if (WebsiteCrawler.isPrivateUrl(item.url)) continue;

      try {
        const parsedUrl = new URL(item.url);
        if (this.isHostCircuitOpen(parsedUrl.hostname)) continue;
      } catch { continue; }

      if (respectRobots && !this.isAllowedByRobots(item.url, robotsRules)) continue;

      const result = await this.fetchWithLimits(item.url);
      if (!result || !result.ok) {
        try { this.recordHostFailure(new URL(item.url).hostname); } catch {}
        continue;
      }
      try { this.resetHostFailure(new URL(item.url).hostname); } catch {}

      const titleMatch = result.body.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : '';

      if (isChallengeOrBlocked(result.body, title)) continue;
      if (result.status === 403 || result.status === 503) continue;

      const doc = await parser.parse(result.body, item.url, tenantId, {
        sourceUrl: item.url, crawlDepth: item.depth,
        fetchedAt: new Date().toISOString(), redirected: result.redirected,
      });

      const quality = contentQualityScore(doc.content, result.body);
      if (quality.score === 0) continue;

      const contentHash = createHash('sha256').update(doc.content.toLowerCase().slice(0, 4096)).digest('hex');
      if (this.contentHashes.has(contentHash)) continue;
      this.contentHashes.add(contentHash);

      results.push(doc);
      const docTokens = doc.content.split(/\s+/).length;
      consecutiveLowYield.push(docTokens);
      if (consecutiveLowYield.length > 8) consecutiveLowYield.shift();

      if (onProgress) onProgress(results.length, queue.size());

      if (item.depth < 8) {
        const links = this.extractLinks(result.body, item.url);
        const navLinks = this.extractNavLinks(result.body);
        for (const link of links) {
          const linkNorm = normalizeUrl(link);
          if (visited.has(linkNorm)) continue;
          try {
            const linkHost = new URL(link).hostname;
            if (linkHost !== targetDomain && !linkHost.endsWith('.' + targetDomain)) continue;
          } catch { continue; }
          if (this.isHostCircuitOpen(new URL(link).hostname)) continue;
          if (respectRobots) {
            const linkOrigin = new URL(link).origin;
            const linkRules = await this.checkRobotsTxt(linkOrigin);
            if (!this.isAllowedByRobots(link, linkRules)) continue;
          }
          const score = this.scoreUrl(link, sitemapUrls.has(link), navLinks.has(new URL(link).pathname));
          queue.push({ url: link, depth: item.depth + 1, score });
          visited.add(linkNorm);
        }
      }

      if (consecutiveLowYield.length >= 8) {
        const avg = consecutiveLowYield.reduce((a, b) => a + b, 0) / consecutiveLowYield.length;
        if (avg < 50) break;
      }
    }

    return results;
  }

  private extractLinks(html: string, baseUrl: string): string[] {
    const links: string[] = [];
    const regex = /<a[^>]+href=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      const href = match[1];
      if (/^(mailto:|tel:|javascript:|#)/.test(href)) continue;
      if (/\.(pdf|zip|png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2|ttf|eot)$/i.test(href)) continue;
      try {
        const absolute = new URL(href, baseUrl).href;
        if (absolute.startsWith('http')) links.push(absolute);
      } catch {}
    }
    return [...new Set(links)];
  }

  private extractNavLinks(html: string): Set<string> {
    const navLinks = new Set<string>();
    const navRegex = /<(nav|header)[^>]*>([\s\S]*?)<\/\1>/gi;
    let navMatch: RegExpExecArray | null;
    while ((navMatch = navRegex.exec(html)) !== null) {
      const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
      let linkMatch: RegExpExecArray | null;
      while ((linkMatch = linkRegex.exec(navMatch[2])) !== null) {
        try {
          const path = new URL(linkMatch[1], 'http://x').pathname;
          navLinks.add(path);
        } catch {}
      }
    }
    return navLinks;
  }
}

interface RobotsRules {
  disallowAll: boolean;
  rules: Array<{ path: string; allow: boolean }>;
}

type PriorityQueue<T> = {
  push(item: T): void;
  pop(): T | undefined;
  size(): number;
};

function PriorityQueue<T>(comparator: (a: T, b: T) => number): PriorityQueue<T> {
  const heap: T[] = [];
  const push = (item: T) => { heap.push(item); heap.sort(comparator); };
  const pop = () => heap.shift();
  const size = () => heap.length;
  return { push, pop, size };
}
