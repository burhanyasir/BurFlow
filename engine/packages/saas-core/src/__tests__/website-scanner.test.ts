import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDatabase } from '../db/database';
import {
  UserRepository, TenantRepository,
  WebsiteScanRepository, ScannedPageRepository, KnowledgeBaseRepository,
  KbDocumentRepository, KbChunkRepository,
} from '../db/repositories';
import {
  WebsiteScannerService, hashContent, cleanHtml, chunkText,
  computeNextScanAt, validateRootUrl, extractLinks, isSameOrigin,
} from '../services/website-scanner';
import { BrandExtractor } from '../services/brand-extractor';
import { WebsiteScan } from '../types';

const HOME = `<!DOCTYPE html>
<html><head><title>Acme Home</title></head>
<body>
  <nav><a href="#">Skip</a><a href="/pricing">Pricing</a></nav>
  <script>window.track = true;</script>
  <h1>Acme Corp</h1>
  <p>Welcome to our platform. We are a trusted enterprise solution.</p>
  <a href="https://external.example.org" rel="nofollow">External</a>
  <a href="/about">About</a>
  <a href="/contact">Contact Us</a>
  <footer>Copyright 2026</footer>
</body></html>`;

const ABOUT = `<!DOCTYPE html>
<html><head><title>About Acme</title></head>
<body>
  <style>body { color: #fff; }</style>
  <h1>About Us</h1>
  <p>Our team delivers a comprehensive, scalable solution.</p>
  <a href="/">Home</a>
</body></html>`;

const PRICING = `<!DOCTYPE html>
<html><head><title>Pricing</title></head>
<body>
  <h1>Pricing</h1>
  <p>Get started today with a free trial. Book a demo and buy now.</p>
  <a href="mailto:sales@acme.test">Email</a>
</body></html>`;

const CONTACT = `<!DOCTYPE html>
<html><head><title>Contact</title></head>
<body>
  <h1>Contact Sales</h1>
  <p>Schedule a call with our team today. Contact us.</p>
</body></html>`;

let db: Database.Database;
let userRepo: UserRepository;
let tenantRepo: TenantRepository;
let scanRepo: WebsiteScanRepository;
let pageRepo: ScannedPageRepository;
let kbRepo: KnowledgeBaseRepository;
let docRepo: KbDocumentRepository;
let chunkRepo: KbChunkRepository;
let site: Map<string, { html: string }>;
let fetchMock: typeof fetch;
let scanner: WebsiteScannerService;
let TENANT: string;
let TENANT2: string;

let tenantCounter = 0;

function createTenant(): string {
  tenantCounter += 1;
  const user = userRepo.create({ email: `scanner-${tenantCounter}@test.com`, password: 'password123', name: 'Scanner Owner' });
  return tenantRepo.create({ name: `Scanner Tenant ${tenantCounter}`, ownerId: user.id }).id;
}

function makeFetchMock(): typeof fetch {
  return (async (input: any) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const entry = site.get(url);
    if (!entry) {
      return { ok: false, status: 404, headers: new Headers(), text: async () => '' } as any;
    }
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => entry.html,
    } as any;
  }) as any;
}

function makeScanner(brandExtractor?: BrandExtractor): WebsiteScannerService {
  return new WebsiteScannerService(
    { scanRepo, pageRepo, kbRepo, docRepo, chunkRepo, brandExtractor },
    { fetchImpl: fetchMock, allowPrivateHosts: true },
  );
}

async function waitForScan(id: string): Promise<WebsiteScan> {
  for (let i = 0; i < 300; i++) {
    const scan = scanRepo.findById(id)!;
    if (scan.status === 'completed' || scan.status === 'failed') return scan;
    await new Promise(r => setTimeout(r, 10));
  }
  throw new Error('Scan timed out waiting for completion');
}

beforeEach(() => {
  db = createDatabase(':memory:');
  userRepo = new UserRepository(db);
  tenantRepo = new TenantRepository(db);
  scanRepo = new WebsiteScanRepository(db);
  pageRepo = new ScannedPageRepository(db);
  kbRepo = new KnowledgeBaseRepository(db);
  docRepo = new KbDocumentRepository(db);
  chunkRepo = new KbChunkRepository(db);
  site = new Map([
    ['https://acme.test/', { html: HOME }],
    ['https://acme.test/about', { html: ABOUT }],
    ['https://acme.test/pricing', { html: PRICING }],
    ['https://acme.test/contact', { html: CONTACT }],
  ]);
  fetchMock = makeFetchMock();
  scanner = makeScanner();
  TENANT = createTenant();
  TENANT2 = createTenant();
});

afterEach(() => {
  if (db) db.close();
});

// ─── Utils ────────────────────────────────────────────────────────────

describe('cleanHtml', () => {
  it('strips scripts, styles, nav, footer, and tags', () => {
    const cleaned = cleanHtml(HOME);
    expect(cleaned).not.toContain('window.track');
    expect(cleaned).not.toContain('Copyright 2026');
    expect(cleaned).not.toMatch(/<[a-z]+/i);
    expect(cleaned).toContain('Acme Corp');
    expect(cleaned).toContain('trusted enterprise solution');
  });

  it('collapses repeated whitespace', () => {
    const cleaned = cleanHtml('<div>Hello   world</div>\n\n<p>Again</p>');
    expect(cleaned.replace(/\s+/g, ' ')).toBe('Hello world Again');
  });
});

describe('extractLinks', () => {
  it('resolves relative links and skips non-http anchors', () => {
    const links = extractLinks(HOME, 'https://acme.test/');
    expect(links).toContain('https://acme.test/pricing');
    expect(links).toContain('https://acme.test/about');
    expect(links).toContain('https://acme.test/contact');
    expect(links).toContain('https://external.example.org/');
    expect(links.every(l => l.startsWith('http'))).toBe(true);
  });
});

describe('isSameOrigin', () => {
  it('compares host and protocol', () => {
    expect(isSameOrigin(new URL('https://acme.test/x'), new URL('https://acme.test'))).toBe(true);
    expect(isSameOrigin(new URL('http://acme.test/x'), new URL('https://acme.test'))).toBe(false);
    expect(isSameOrigin(new URL('https://other.test/x'), new URL('https://acme.test'))).toBe(false);
  });
});

describe('validateRootUrl', () => {
  it('accepts http and https', () => {
    expect(validateRootUrl('https://acme.test').protocol).toBe('https:');
    expect(validateRootUrl('http://acme.test/').protocol).toBe('http:');
  });

  it('rejects non-http protocols and garbage', () => {
    expect(() => validateRootUrl('ftp://acme.test')).toThrow('http or https');
    expect(() => validateRootUrl('not a url')).toThrow('Invalid website URL');
  });
});

describe('hashContent and chunkText', () => {
  it('hashes deterministically', () => {
    expect(hashContent('hello world')).toBe(hashContent('hello world'));
    expect(hashContent('hello world')).not.toBe(hashContent('hello world!'));
  });

  it('chunks text into bounded pieces', () => {
    const text = Array.from({ length: 500 }, () => 'word').join(' ');
    const chunks = chunkText(text, 200, 50);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(c => c.length <= 200)).toBe(true);
    expect(chunks.join(' ').length).toBeGreaterThan(text.length / 2);
  });
});

describe('computeNextScanAt', () => {
  it('returns undefined for manual', () => {
    expect(computeNextScanAt('manual')).toBeUndefined();
  });
  it('adds 1 day for daily and 7 for weekly', () => {
    const from = new Date('2024-01-01T00:00:00.000Z');
    expect(computeNextScanAt('daily', from)).toBe('2024-01-02T00:00:00.000Z');
    expect(computeNextScanAt('weekly', from)).toBe('2024-01-08T00:00:00.000Z');
  });
});

// ─── Scanner integration ────────────────────────────────────────────

describe('WebsiteScannerService', () => {
  it('rejects private hosts unless allowed', () => {
    const strict = new WebsiteScannerService(
      { scanRepo, pageRepo, kbRepo, docRepo, chunkRepo },
      { fetchImpl: fetchMock },
    );
    expect(() => strict.startScan(TENANT, 'http://127.0.0.1:8080/', {}))
      .toThrow(/private network/i);
  });

  it('crawls same-origin pages and indexes them into the knowledge base', async () => {
    const scan = scanner.startScan(TENANT, 'https://acme.test/', { maxDepth: 1 });
    const done = await waitForScan(scan.id);

    expect(done.status).toBe('completed');
    expect(done.pagesDiscovered).toBe(4);
    expect(done.pagesScanned).toBe(4);
    expect(done.pagesAdded).toBe(4);
    expect(done.pagesIndexed).toBe(4);

    const kbs = kbRepo.listByTenant(TENANT);
    expect(kbs.length).toBe(1);
    expect(kbs[0].name).toBe('Website: acme.test');
    expect(kbs[0].status).toBe('completed');

    const docs = docRepo.listByKnowledgeBase(kbs[0].id);
    expect(docs.length).toBe(4);
    expect(docs.every(d => d.status === 'completed' && d.chunkCount > 0)).toBe(true);
    expect(docs.every(d => d.sourceType === 'url' && d.sourceUrl)).toBe(true);
    expect(chunkRepo.countByDocument(docs[0].id)).toBe(docs[0].chunkCount);
  });

  it('detects unchanged, updated and deleted pages on a second scan', async () => {
    const first = scanner.startScan(TENANT, 'https://acme.test/', { maxDepth: 1 });
    await waitForScan(first.id);

    site.set('https://acme.test/pricing', { html: PRICING.replace('buy now', 'try it today') });
    site.delete('https://acme.test/contact');

    const second = scanner.startScan(TENANT, 'https://acme.test/', { maxDepth: 1 });
    const done = await waitForScan(second.id);

    expect(done.pagesScanned).toBe(3);
    expect(done.pagesUnchanged).toBe(2);
    expect(done.pagesUpdated).toBe(1);
    expect(done.pagesDeleted).toBe(1);

    const pricingDoc = docRepo.findBySourceUrl(TENANT, 'https://acme.test/pricing')!;
    expect(pricingDoc.chunkCount).toBeGreaterThan(0);
    expect(docRepo.findBySourceUrl(TENANT, 'https://acme.test/contact')).toBeTruthy();

    const latest = pageRepo.listLatestByTenant(TENANT);
    const byUrl = new Map(latest.map(p => [p.url, p.status]));
    expect(byUrl.get('https://acme.test/contact')).toBe('deleted');
    expect(byUrl.get('https://acme.test/')!).toBe('added');
    expect(pageRepo.listByScan(second.id).some(p => p.url === 'https://acme.test/pricing' && p.status === 'updated')).toBe(true);
  });

  it('honors page limits and depth limits', async () => {
    const scan = scanner.startScan(TENANT, 'https://acme.test/', { maxDepth: 1, pageLimit: 2 });
    const done = await waitForScan(scan.id);
    expect(done.pagesScanned).toBe(2);
    expect(done.pagesDiscovered).toBe(2);
  });

  it('update mode only re-scans previously discovered pages', async () => {
    await waitForScan(scanner.startScan(TENANT, 'https://acme.test/', { maxDepth: 1 }).id);
    site.set('https://acme.test/contact', { html: CONTACT + '<a href="/new-page">New</a>' });
    site.set('https://acme.test/new-page', { html: '<h1>New Page</h1><p>Fresh</p>' });

    const scan = scanner.startScan(TENANT, 'https://acme.test/', { maxDepth: 1, crawlMode: 'update' });
    const done = await waitForScan(scan.id);
    expect(done.pagesScanned).toBe(4);
    expect(done.pagesAdded).toBe(0);
  });

  it('cancels previous running scans for the tenant', async () => {
    const slowFetch = (async (input: any) => {
      await new Promise(r => setTimeout(r, 200));
      return fetchMock(input);
    }) as typeof fetch;
    const slowScanner = new WebsiteScannerService(
      { scanRepo, pageRepo, kbRepo, docRepo, chunkRepo },
      { fetchImpl: slowFetch, allowPrivateHosts: true, concurrency: 1 },
    );
    const first = slowScanner.startScan(TENANT, 'https://acme.test/', { maxDepth: 1 });
    await new Promise(r => setTimeout(r, 100));
    const second = slowScanner.startScan(TENANT, 'https://acme.test/', { maxDepth: 1 });
    const done = await waitForScan(second.id);
    expect(done.status).toBe('completed');
    expect(scanRepo.findById(first.id)!.status).toBe('cancelled');
  });
});

// ─── Brand extractor ─────────────────────────────────────────────────

describe('BrandExtractor', () => {
  it('extracts tone, CTAs and confidence heuristically', async () => {
    const extractor = new BrandExtractor();
    const result = await extractor.extract(PRICING.replace(/<[^>]+>/g, ' '));
    expect(result.brandTone).toBeTruthy();
    expect(result.primaryCtas.length).toBeGreaterThan(0);
    expect(result.confidenceScore).toBeGreaterThan(0);
    expect(result.confidenceScore).toBeLessThanOrEqual(0.95);
  });

  it('prefers structured LLM responses', async () => {
    const extractor = new BrandExtractor({
      llm: () => Promise.resolve('{"brandTone":"Bold","primaryCtas":["Try free"],"confidenceScore":0.9}'),
    });
    const result = await extractor.extract('Any text');
    expect(result).toEqual({ brandTone: 'Bold', primaryCtas: ['Try free'], confidenceScore: 0.9 });
  });

  it('falls back to heuristics on malformed LLM output', async () => {
    const extractor = new BrandExtractor({ llm: () => Promise.resolve('Sorry, cannot do that.') });
    const result = await extractor.extract(HOME);
    expect(result.brandTone).toBeTruthy();
    expect(result.confidenceScore).toBeGreaterThan(0);
  });

  it('records brand intelligence on the scan record', async () => {
    const branded = makeScanner(new BrandExtractor());
    const scan = branded.startScan(TENANT, 'https://acme.test/', { maxDepth: 1 });
    const done = await waitForScan(scan.id);
    expect(done.brandTone).toBeTruthy();
    expect(done.primaryCtas.length).toBeGreaterThan(0);
    expect(typeof done.confidenceScore).toBe('number');
  });
});

// ─── Scheduling ──────────────────────────────────────────────────────

describe('processDueScans', () => {
  it('runs only scans whose next_scan_at is due', async () => {
    const daily = scanner.startScan(TENANT, 'https://acme.test/', { maxDepth: 1, schedule: 'daily' });
    await waitForScan(daily.id);
    expect(scanRepo.findById(daily.id)!.nextScanAt).toBeTruthy();

    const past = new Date(Date.now() - 60_000).toISOString();
    scanRepo.updateSchedule(daily.id, 'daily', past);

    const manual = scanner.startScan(TENANT2, 'https://acme.test/', { maxDepth: 1 });
    await waitForScan(manual.id);

    const results = await scanner.processDueScans();
    expect(results.some(r => r.id === daily.id && r.status === 'completed')).toBe(true);
    expect(results.some(r => r.id === manual.id)).toBe(false);
    expect(scanRepo.findById(manual.id)!.nextScanAt).toBeUndefined();
  });
});