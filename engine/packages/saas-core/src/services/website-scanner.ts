import { createHash } from 'crypto';
import {
  WebsiteScanRepository, ScannedPageRepository, KnowledgeBaseRepository,
  KbDocumentRepository, KbChunkRepository,
} from '../db/repositories';
import {
  WebsiteScan, ScannedPageStatus, ScanSchedule,
} from '../types';
import { BrandExtractor } from './brand-extractor';

export interface CrawlPage {
  url: string;
  title: string;
  text: string;
  depth: number;
}

export interface ScannerOptions {
  fetchImpl?: typeof fetch;
  allowPrivateHosts?: boolean;
  timeoutMs?: number;
  defaultMaxDepth?: number;
  defaultPageLimit?: number;
  concurrency?: number;
}

export interface ScanStartOptions {
  crawlMode?: 'discover' | 'update';
  schedule?: ScanSchedule;
  maxDepth?: number;
  pageLimit?: number;
}

export interface ScannerDeps {
  scanRepo: WebsiteScanRepository;
  pageRepo: ScannedPageRepository;
  kbRepo: KnowledgeBaseRepository;
  docRepo: KbDocumentRepository;
  chunkRepo: KbChunkRepository;
  brandExtractor?: BrandExtractor;
}

const NON_HTML_EXTENSIONS = /\.(pdf|png|jpe?g|gif|svg|webp|ico|zip|tar|gz|7z|mp3|mp4|mov|avi|wav|css|js|json|xml|woff2?|ttf|eot|xlsx?|docx?|pptx?|exe|dmg|apk|deb|rpm)$/i;
const STRIP_TAGS = /<(script|style|noscript|iframe|svg|nav|footer|header|form|template)\b[\s\S]*?<\/\1\s*>/gi;
const HTML_COMMENTS = /<!--[\s\S]*?-->/g;
const BLOCK_TAGS = /<\/(p|div|h1|h2|h3|h4|h5|h6|li|section|article|tr|br|blockquote)\s*>/gi;
const ALL_TAGS = /<[^>]+>/g;
const LINK_PATTERN = /href\s*=\s*["']([^"']+)["']/gi;
const TITLE_PATTERN = /<title[^>]*>([^<]+)<\/title>/i;
const HEADING_PATTERN = /<h1[^>]*>([^<]+)<\/h1>/i;
const MULTI_WHITESPACE = /\s+/g;

// S4: Prompt-injection patterns — strip or neutralize during ingestion
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|guidelines?)/gi,
  /you\s+are\s+now\s+(a|an|the)\s+/gi,
  /system\s*:\s*/gi,
  /\[INST\]/gi,
  /<\/?s>/gi,
  /<<SYS>>/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /###\s*(system|assistant|user)\s*:/gi,
  /act\s+as\s+if\s+you\s+(have|are|were)/gi,
  /disregard\s+(all\s+)?(previous|prior|your)\s+/gi,
  /override\s+(your\s+)?(instructions?|programming|rules?)/gi,
  /new\s+instructions?\s*:/gi,
  /IMPORTANT\s*:\s*you\s+must/gi,
  /from\s+now\s+on\s+you\s+will/gi,
];

/** Strip or neutralize prompt-injection patterns from crawled text. */
export function sanitizeCrawledContent(text: string): string {
  let sanitized = text;
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

export function computeNextScanAt(schedule: ScanSchedule, from = new Date()): string | undefined {
  if (schedule === 'manual') return undefined;
  const next = new Date(from.getTime());
  if (schedule === 'daily') next.setDate(next.getDate() + 1);
  if (schedule === 'weekly') next.setDate(next.getDate() + 7);
  return next.toISOString();
}

export function hashContent(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function cleanHtml(html: string): string {
  let cleaned = html
    .replace(STRIP_TAGS, ' ')
    .replace(HTML_COMMENTS, ' ')
    .replace(BLOCK_TAGS, ' ')
    .replace(ALL_TAGS, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  return cleaned.replace(MULTI_WHITESPACE, ' ').trim();
}

export function extractTitle(html: string): string {
  const titleMatch = html.match(TITLE_PATTERN) || html.match(HEADING_PATTERN);
  if (!titleMatch) return '';
  return titleMatch[1].replace(MULTI_WHITESPACE, ' ').trim();
}

export function extractLinks(html: string, base: string): string[] {
  const links: string[] = [];
  let match: RegExpExecArray | null;
  LINK_PATTERN.lastIndex = 0;
  while ((match = LINK_PATTERN.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!raw || raw.startsWith('javascript:') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('#')) continue;
    try {
      const resolved = new URL(raw, base);
      resolved.hash = '';
      links.push(resolved.toString());
    } catch {
      // ignore malformed links
    }
  }
  return links;
}

export function isSameOrigin(url: URL, root: URL): boolean {
  return url.host === root.host && url.protocol === root.protocol;
}

export function isPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  // Loopback
  if (lower === 'localhost' || lower === '127.0.0.1' || lower === '::1' || lower === '0.0.0.0') return true;
  // .local / .localhost
  if (lower.endsWith('.local') || lower.endsWith('.localhost')) return true;
  // RFC 1918 private ranges
  if (/^10\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(lower)) return true;
  // S5: Link-local, metadata, carrier-grade NAT, IPv6 special ranges
  if (/^169\.254\./.test(lower)) return true; // link-local (AWS metadata, etc.)
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(lower)) return true; // carrier-grade NAT (100.64.0.0/10)
  if (/^198\.51\.100\./.test(lower)) return true; // documentation range
  if (/^203\.0\.113\./.test(lower)) return true; // documentation range
  if (/^233\.252\.0\./.test(lower)) return true; // documentation range
  // IPv6 special addresses
  if (lower === '[::]' || lower === '[::0]') return true;
  if (/^\[fc[0-9a-f]{2}:/i.test(lower)) return true; // ULA
  if (/^\[fd[0-9a-f]{2}:/i.test(lower)) return true; // ULA
  if (/^\[fe[89ab]/i.test(lower)) return true; // link-local
  if (/^\[2001:db8:/i.test(lower)) return true; // documentation
  // IPv4-mapped IPv6
  if (/^\[::ffff:(0?\.)?127\./.test(lower)) return true;
  if (/^\[::ffff:(0?\.)?10\./.test(lower)) return true;
  if (/^\[::ffff:(0?\.)?192\.168\./.test(lower)) return true;
  if (/^\[::ffff:(0?\.)?172\.(1[6-9]|2\d|3[01])\./.test(lower)) return true;
  return false;
}

export function validateRootUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid website URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Website URL must use http or https');
  }
  if (!url.hostname) throw new Error('Website URL must include a hostname');
  return url;
}

export function chunkText(text: string, size = 1200, overlap = 100): string[] {
  if (!text) return [];
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const boundary = text.lastIndexOf(' ', end);
      if (boundary > start + size * 0.5) end = boundary;
    }
    chunks.push(text.slice(start, end).trim());
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter(c => c.length > 0);
}

export function fileNameForUrl(url: string, title: string): string {
  const parsed = new URL(url);
  const segments = parsed.pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1] || '';
  const base = last.replace(/\.html?$/i, '') || (title ? title.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 60) : 'index');
  return `${base || 'page'}.html`;
}

function countStatus(statusByUrl: Map<string, ScannedPageStatus>, status: ScannedPageStatus): number {
  let count = 0;
  for (const value of statusByUrl.values()) {
    if (value === status) count += 1;
  }
  return count;
}

export class WebsiteScannerService {
  constructor(
    private deps: ScannerDeps,
    private options: ScannerOptions = {},
  ) {}

  startScan(tenantId: string, rootUrl: string, opts: ScanStartOptions = {}): WebsiteScan {
    if (isPrivateHost(validateRootUrl(rootUrl).hostname) && !this.options.allowPrivateHosts) {
      throw new Error('Local and private network addresses are not allowed');
    }
    const url = validateRootUrl(rootUrl);
    url.hash = '';
    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }
    const normalized = url.toString();

    this.deps.scanRepo.cancelRunning(tenantId);

    const maxDepth = Math.max(1, Math.min(5, opts.maxDepth || this.options.defaultMaxDepth || 3));
    const pageLimit = Math.max(1, Math.min(500, opts.pageLimit || this.options.defaultPageLimit || 50));
    const scan = this.deps.scanRepo.create({
      tenantId,
      rootUrl: normalized,
      crawlMode: opts.crawlMode || 'discover',
      schedule: opts.schedule || 'manual',
      maxDepth,
      pageLimit,
      nextScanAt: computeNextScanAt(opts.schedule || 'manual'),
    });

    void this.runScan(scan.id).catch(() => {
      const latest = this.deps.scanRepo.findById(scan.id);
      if (latest && latest.status === 'queued') {
        this.deps.scanRepo.markFailed(scan.id, 'Scan failed before starting');
      }
    });

    return scan;
  }

  async runScan(scanId: string): Promise<WebsiteScan> {
    const scan = this.deps.scanRepo.findById(scanId);
    if (!scan) throw new Error(`Scan ${scanId} not found`);
    if (scan.status === 'cancelled') return scan;

    this.deps.scanRepo.markRunning(scanId);

    try {
      const crawled = await this.crawl(scan);
      const current = this.deps.scanRepo.findById(scanId);
      if (!current || current.status === 'cancelled') return current!;
      const statusByUrl = this.diffAgainstBaseline(scan.tenantId, crawled);
      this.persistPageStates(scan, statusByUrl, crawled);
      await this.syncKnowledgeBase(scan, crawled, statusByUrl);

      const counts = {
        pagesDiscovered: crawled.length,
        pagesScanned: crawled.length,
        pagesUnchanged: countStatus(statusByUrl, 'unchanged'),
        pagesAdded: countStatus(statusByUrl, 'added'),
        pagesUpdated: countStatus(statusByUrl, 'updated'),
        pagesDeleted: countStatus(statusByUrl, 'deleted'),
        pagesIndexed: countStatus(statusByUrl, 'added') + countStatus(statusByUrl, 'updated'),
      };

      let brandTone: string | undefined;
      let primaryCtas: string[] = [];
      let confidenceScore: number | undefined;
      if (this.deps.brandExtractor) {
        try {
          const sample = crawled.slice(0, 8).map(p => p.text).join('\n').slice(0, 8000);
          const intelligence = await this.deps.brandExtractor.extract(sample);
          brandTone = intelligence.brandTone;
          primaryCtas = intelligence.primaryCtas;
          confidenceScore = intelligence.confidenceScore;
        } catch {
          // brand extraction is best-effort
        }
      }

      this.deps.scanRepo.markCompleted(scanId, {
        counts,
        brandTone,
        primaryCtas,
        confidenceScore,
        nextScanAt: computeNextScanAt(scan.schedule),
      });
      return this.deps.scanRepo.findById(scanId)!;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.deps.scanRepo.markFailed(scanId, message);
      return this.deps.scanRepo.findById(scanId)!;
    }
  }

  async processDueScans(nowIso = new Date().toISOString()): Promise<WebsiteScan[]> {
    const due = this.deps.scanRepo.listDueScans(nowIso);
    const results: WebsiteScan[] = [];
    for (const scan of due) {
      results.push(await this.runScan(scan.id));
    }
    return results;
  }

  async crawl(scan: WebsiteScan): Promise<CrawlPage[]> {
    const root = new URL(scan.rootUrl);
    const fetchImpl = this.options.fetchImpl || globalThis.fetch;
    const timeoutMs = this.options.timeoutMs || 10_000;
    const concurrency = this.options.concurrency || 4;

    const seen = new Set<string>([scan.rootUrl]);
    const queue: { url: string; depth: number }[] = [{ url: scan.rootUrl, depth: 0 }];
    const pages: CrawlPage[] = [];
    const failures = new Map<string, string>();

    while (queue.length > 0 && pages.length < scan.pageLimit) {
      const batch = queue.splice(0, Math.min(concurrency, scan.pageLimit - pages.length));
      const fetched = await Promise.all(batch.map(async (item) => {
        try {
          const html = await this.fetchHtml(fetchImpl, item.url, timeoutMs);
          if (html === null) return null;
          const page: CrawlPage = {
            url: item.url,
            title: extractTitle(html),
            text: cleanHtml(html),
            depth: item.depth,
          };
          if (item.depth < scan.maxDepth) {
            for (const link of extractLinks(html, item.url)) {
              let parsed: URL;
              try { parsed = new URL(link); } catch { continue; }
              if (!isSameOrigin(parsed, root)) continue;
              if (NON_HTML_EXTENSIONS.test(parsed.pathname)) continue;
              const normalized = parsed.toString();
              if (seen.has(normalized)) continue;
              seen.add(normalized);
              queue.push({ url: normalized, depth: item.depth + 1 });
            }
          }
          return page;
        } catch (err) {
          failures.set(item.url, err instanceof Error ? err.message : String(err));
          return null;
        }
      }));

      for (const page of fetched) {
        if (page) pages.push(page);
      }
    }

    if (pages.length === 0) {
      const sample = Array.from(failures.entries()).slice(0, 3)
        .map(([url, reason]) => `${url}: ${reason}`).join('; ');
      throw new Error(sample ? `No pages could be crawled (${sample})` : 'No pages could be crawled');
    }

    if (scan.crawlMode === 'update') {
      const existing = this.deps.pageRepo.listLatestByTenant(scan.tenantId);
      const existingUrls = new Set(existing.map(p => p.url));
      return pages.filter(p => existingUrls.has(p.url));
    }

    return pages;
  }

  private async fetchHtml(
    fetchImpl: typeof globalThis.fetch,
    url: string,
    timeoutMs: number,
  ): Promise<string | null> {
    const MAX_REDIRECTS = 5;
    const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5MB
    let currentUrl = url;
    const visitedUrls = new Set<string>();

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
      // S5: Validate each redirect target — block private/metadata hosts
      try {
        const parsed = new URL(currentUrl);
        if (isPrivateHost(parsed.hostname)) {
          console.warn(`[Scanner] SSRF BLOCKED — redirect to private host: ${currentUrl}`);
          return null;
        }
      } catch {
        return null;
      }

      if (visitedUrls.has(currentUrl)) {
        console.warn(`[Scanner] SSRF BLOCKED — redirect loop detected: ${currentUrl}`);
        return null;
      }
      visitedUrls.add(currentUrl);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        // S5: Manual redirect handling to re-validate each target
        const res = await fetchImpl(currentUrl, {
          signal: controller.signal,
          redirect: 'manual', // Handle redirects ourselves
        });

        // Follow redirects manually
        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get('location');
          if (!location) return null;
          try {
            currentUrl = new URL(location, currentUrl).toString();
          } catch {
            return null;
          }
          continue;
        }

        if (!res.ok) return null;
        const type = res.headers && typeof res.headers.get === 'function' ? res.headers.get('content-type') : '';
        if (type && !type.includes('text/html') && !type.includes('application/xhtml')) return null;

        // S5: Enforce response size limit
        const text = await res.text();
        if (text.length > MAX_RESPONSE_BYTES) {
          console.warn(`[Scanner] Response too large (${text.length} bytes) for ${currentUrl}`);
          return text.slice(0, MAX_RESPONSE_BYTES);
        }
        return text;
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    }
    return null;
  }

  diffAgainstBaseline(tenantId: string, crawled: CrawlPage[]): Map<string, ScannedPageStatus> {
    const baseline = this.deps.pageRepo.listLatestByTenant(tenantId);
    const baselineByUrl = new Map(
      baseline.filter(p => p.status !== 'deleted').map(p => [p.url, p]),
    );
    const statusByUrl = new Map<string, ScannedPageStatus>();
    const crawledUrls = new Set<string>();

    for (const page of crawled) {
      crawledUrls.add(page.url);
      const prev = baselineByUrl.get(page.url);
      if (!prev) {
        statusByUrl.set(page.url, 'added');
      } else if (prev.contentHash !== hashContent(page.text)) {
        statusByUrl.set(page.url, 'updated');
      } else {
        statusByUrl.set(page.url, 'unchanged');
      }
    }

    for (const prev of baselineByUrl.values()) {
      if (!crawledUrls.has(prev.url)) {
        statusByUrl.set(prev.url, 'deleted');
      }
    }

    return statusByUrl;
  }

  persistPageStates(
    scan: WebsiteScan,
    statusByUrl: Map<string, ScannedPageStatus>,
    pages: CrawlPage[],
  ): void {
    const pagesByUrl = new Map(pages.map(p => [p.url, p]));
    for (const [url, status] of statusByUrl) {
      if (status === 'unchanged') continue;
      if (status === 'deleted') {
        const prev = this.deps.pageRepo.listLatestByTenant(scan.tenantId)
          .filter(p => p.status !== 'deleted').find(p => p.url === url);
        if (prev) this.deps.pageRepo.updateStatus(prev.id, 'deleted');
        continue;
      }
      const page = pagesByUrl.get(url);
      if (!page) continue;
      this.deps.pageRepo.create({
        scanId: scan.id,
        tenantId: scan.tenantId,
        url,
        title: page.title,
        content: page.text,
        contentHash: hashContent(page.text),
        status,
      });
    }
  }

  async syncKnowledgeBase(
    scan: WebsiteScan,
    pages: CrawlPage[],
    statusByUrl: Map<string, ScannedPageStatus>,
  ): Promise<void> {
    const host = new URL(scan.rootUrl).hostname;
    let kb = this.deps.kbRepo.listByTenant(scan.tenantId)
      .find(k => k.name === `Website: ${host}`) || null;
    if (!kb) {
      kb = this.deps.kbRepo.create(scan.tenantId, `Website: ${host}`, `Auto-created by Website Scanner from ${scan.rootUrl}`);
    }

    const changed = pages.filter(p => {
      const status = statusByUrl.get(p.url);
      return status === 'added' || status === 'updated';
    });

    for (const page of changed) {
      const chunks = chunkText(page.text, 1200, 100);
      let doc = this.deps.docRepo.findBySourceUrl(scan.tenantId, page.url);
      if (!doc) {
        doc = this.deps.docRepo.create({
          knowledgeBaseId: kb.id,
          tenantId: scan.tenantId,
          filename: fileNameForUrl(page.url, page.title),
          sourceType: 'url',
          sourceUrl: page.url,
        });
      }
      this.deps.chunkRepo.deleteByDocument(doc.id);
      this.deps.chunkRepo.insertMany(kb.id, scan.tenantId, doc.id, chunks.map((chunk, i) => ({
        content: chunk,
        metadata: { sourceUrl: page.url, title: page.title, chunkIndex: i },
      })));
      this.deps.docRepo.updateChunkCount(doc.id, chunks.length);
    }

    this.deps.kbRepo.updateStatus(kb.id, changed.length > 0 ? 'completed' : 'pending', changed.length);
  }
}