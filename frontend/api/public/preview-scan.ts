/**
 * POST /api/public/preview-scan — Vercel serverless function.
 * Server-side website fetch + parse for the landing page scanner.
 * Bypasses CORS entirely since the server fetches the website directly.
 */

interface ScanRequest {
  method?: string;
  body?: { url?: string };
}

interface ScanResponse {
  status(code: number): ScanResponse;
  setHeader(name: string, value: string): void;
  json(data: unknown): void;
  end(): void;
}

export default async function handler(req: ScanRequest, res: ScanResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body || {};
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return res.status(400).json({ error: 'url is required' });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (/^(localhost|127\.|10\.|192\.168|172\.(1[6-9]|2|3[01])\.|0\.|::1)/.test(hostname)) {
    return res.status(400).json({ error: 'Private network URLs are not allowed' });
  }

  const fetchPage = async (pageUrl: string, timeoutMs = 6000): Promise<string> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(pageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.text();
    } finally {
      clearTimeout(timer);
    }
  };

  const fetchErrorCode = (err: unknown): { code: string; message: string } => {
    const msg = err instanceof Error ? err.message : String(err || '');
    if (err instanceof Error && err.name === 'AbortError') return { code: 'timeout', message: 'The site took too long to respond.' };
    const m = msg.match(/HTTP (\d+)/);
    if (m) {
      const s = Number(m[1]);
      if (s === 403 || s === 401 || s === 429) return { code: 'blocked', message: 'The site blocked automated scanning (HTTP ' + s + ').' };
      if (s === 404) return { code: 'not_found', message: 'The page was not found (HTTP 404).' };
      if (s >= 500) return { code: 'server_error', message: 'The site returned a server error (HTTP ' + s + ').' };
    }
    return { code: 'network', message: 'Could not reach the site.' };
  };

  const extractBetween = (html: string, tag: string): string[] => {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    const results: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      const text = m[1].replace(/<[^>]+>/g, '').trim();
      if (text) results.push(text);
    }
    return results;
  };

  const extractAttr = (html: string, tag: string, attr: string): string[] => {
    const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']*)["'][^>]*>`, 'gi');
    const results: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) results.push(m[1].trim());
    return results;
  };

  const extractJsonLd = (html: string): string[] => {
    const names: string[] = [];
    const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const block of blocks) {
      const raw = block.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
      try {
        const parsed = JSON.parse(raw);
        const walk = (node: unknown): void => {
          if (!node || typeof node !== 'object') return;
          if (Array.isArray(node)) { node.forEach(walk); return; }
          const obj = node as Record<string, unknown>;
          if (typeof obj['@type'] === 'string') {
            const types = obj['@type'].toLowerCase();
            if (/(product|service|menu|item|offer|course|class|treatment)/.test(types) && typeof obj.name === 'string' && obj.name.trim().length > 1) {
              names.push(obj.name.trim());
            }
          }
          Object.values(obj).forEach(walk);
        };
        walk(parsed);
      } catch { /* malformed JSON-LD — skip */ }
    }
    return [...new Set(names)];
  };

  const parseHtml = (rawHtml: string, baseUrl: string) => {
    const origin = new URL(baseUrl).origin;
    const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const ogTitleMatch = rawHtml.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : (ogTitleMatch ? ogTitleMatch[1].trim() : '');
    const descMatch =
      rawHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
      rawHtml.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i) ||
      rawHtml.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
    const description = descMatch ? descMatch[1].trim() : '';
    const rawLinks = extractAttr(rawHtml, 'a', 'href')
      .filter((href) => href.startsWith('/') || href.startsWith(origin))
      .map((href) => {
        try { return new URL(href, origin).pathname; } catch { return href; }
      })
      .filter((p) => p && !p.startsWith('#') && !p.includes('.'));
    const headings = [
      ...extractBetween(rawHtml, 'h1'),
      ...extractBetween(rawHtml, 'h2'),
      ...extractBetween(rawHtml, 'h3'),
    ].filter((h) => h.length > 1 && !/^(home|menu|close|search|cart|login|sign|toggle|location|nav|skip|cookie|copyright|privacy|main menu|secondary|site footer|homepage|skip to)/i.test(h));
    const noscript = (rawHtml.match(/<noscript[^>]*>([\s\S]*?)<\/noscript>/i) || [])[1] || '';
    const noscriptSentences = noscript
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20 && s.length < 300);
    const paragraphs = [...extractBetween(rawHtml, 'p'), ...noscriptSentences]
      .filter((t) => t.length > 20 && t.length < 300)
      .slice(0, 30);
    const lists = extractBetween(rawHtml, 'li')
      .filter((t) => t.length > 5 && t.length < 200)
      .slice(0, 30);
    return {
      title,
      description,
      links: [...new Set(rawLinks)].slice(0, 50),
      headings: [...new Set(headings.filter((h) => title.toLowerCase().length > 3 && h.toLowerCase() !== title.toLowerCase()))].slice(0, 20),
      paragraphs,
      lists,
      jsonLd: extractJsonLd(rawHtml),
    };
  };

  try {
    let mainHtml: string;
    try {
      mainHtml = await fetchPage(parsedUrl.href);
    } catch (err: unknown) {
      const reason = fetchErrorCode(err);
      return res.json({
        error: reason,
        title: parsedUrl.hostname,
        description: '',
        headings: [],
        products: [],
        services: [],
        paragraphs: [],
        links: [],
        subPages: [],
      });
    }
    const mainParsed = parseHtml(mainHtml, parsedUrl.href);

    const subPatterns = /product|service|pric|plan|about|feature|solution|offer|contact|team|shop|store|collection|category|menu|treatment|gallery|work|portfolio|booking|book|appointment|pricing|careers|faq/i;
    const subPaths = [...new Set(mainParsed.links.filter((p) => subPatterns.test(p)))].slice(0, 4);
    const subPages: Array<{ path: string; headings: string[]; paragraphs: string[]; lists: string[]; jsonLd: string[] }> = [];
    await Promise.all(subPaths.map(async (subPath) => {
      try {
        const subUrl = new URL(subPath, parsedUrl.origin).href;
        const subHtml = await fetchPage(subUrl, 5000);
        const subParsed = parseHtml(subHtml, subUrl);
        subPages.push({
          path: subPath,
          headings: subParsed.headings,
          paragraphs: subParsed.paragraphs,
          lists: subParsed.lists,
          jsonLd: subParsed.jsonLd,
        });
      } catch { /* skip failed sub-pages */ }
    }));

    const allHeadings = [...mainParsed.headings, ...subPages.flatMap((s) => s.headings)];
    const allParagraphs = [...mainParsed.paragraphs, ...subPages.flatMap((s) => s.paragraphs)];
    const allLists = [...mainParsed.lists, ...subPages.flatMap((s) => s.lists)];
    const jsonLdNames = [...mainParsed.jsonLd, ...subPages.flatMap((s) => s.jsonLd)];

    // Broader keyword matching for products/services across industries
    const productKw = /product|feature|solution|tool|platform|software|app|offer|plan|package|suite|module|collection|category|menu|item|gear|device|equipment|shop|store|series|bundle/i;
    const serviceKw = /service|support|consulting|help|setup|onboard|implementation|maintenance|training|managed|delivery|repair|cleaning|install|booking|rental|salon|clinic|spa|gym|fitness|wellness|education|course|class|treatment/i;

    // Products: JSON-LD names first (most reliable), then price-bearing
    // sentences ("…Headphones — $129"), then headings containing product words.
    const priceStop = /^(with|and|for|the|a|an|of|from|to|or|at|by|in|on|your|our|all|new|more|plus|using|through|including|starting|per|each|now|up|save)$/i;
    const pricedItems = allParagraphs
      .filter((p) => /\$\s?\d+/.test(p) && p.length < 220)
      .map((p) => {
        const before = p.split(/\$\s?\d+/)[0].replace(/[—–,;:|()[\]{}"]+\s*$/g, '').trim();
        const kept = before.split(/\s+/).filter((t) => t.length > 1 && !priceStop.test(t));
        const name = kept.slice(-3).join(' ');
        return name.length > 2 && name.length < 70 && /^[A-Z0-9]/.test(name.split(' ').pop() || '') ? name : '';
      })
      .filter(Boolean);
    // Reject sentence-like headings (news headlines, long CTA copy) as
    // product/service names: names are short and mostly Title Case.
    const isNameLike = (h: string): boolean => {
      const words = h.split(/\s+/).filter(Boolean);
      if (words.length === 0) return false;
      if (words.length <= 3) return true;
      return words.filter((w) => /^[A-Z0-9]/.test(w)).length / words.length >= 0.6;
    };
    let products = jsonLdNames.slice(0, 8);
    if (products.length < 8) {
      for (const name of pricedItems) {
        if (name.length > 2 && name.length < 70 && !productKw.test(name)) products.push(name);
        if (products.length >= 8) break;
      }
    }
    if (products.length < 8) {
      products = [...products, ...allHeadings.filter((h) => productKw.test(h) && isNameLike(h) && h.trim().length > 2).slice(0, 8 - products.length)];
    }
    let services = allHeadings.filter((h) => serviceKw.test(h) && isNameLike(h) && h.trim().length > 2).slice(0, 8);
    if (services.length < 8) {
      for (const item of allLists.map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => serviceKw.test(l) && isNameLike(l) && l.length < 120)) {
        if (!services.includes(item)) services.push(item);
        if (services.length >= 8) break;
      }
    }
    products = [...new Set(products)].slice(0, 8);
    services = [...new Set(services)].slice(0, 8);

    // If no products found from keywords, use collection/category links and meaningful headings
    if (products.length === 0) {
      const collectionLinks = mainParsed.links
        .filter((l) => /collection|category|product|shop|store|menu|item/i.test(l))
        .map((l) => l.replace(/^\//, '').replace(/\//g, ' > '))
        .slice(0, 8);
      if (collectionLinks.length > 0) products = collectionLinks;
    }
    if (products.length === 0) {
      // Fall back to meaningful non-boilerplate headings
      products = allHeadings.filter((h) => h.trim().length > 3 && isNameLike(h) && !/^(home|menu|close|search|cart|login|sign|menu|toggle|location|nav|skip|cookie|copyright)/i.test(h.trim())).slice(0, 8);
    }

    const namePatterns = allParagraphs
      .filter((p) => /we offer|our .{0,30}(product|service|solution|tool|platform|collection|range|line|brand)/i.test(p))
      .map((p) => p.slice(0, 150))
      .slice(0, 3);

    return res.json({
      title: mainParsed.title,
      description: mainParsed.description,
      headings: allHeadings.slice(0, 12),
      products,
      services,
      paragraphs: namePatterns,
      links: mainParsed.links.slice(0, 10),
      subPages: subPages.map((s) => s.path),
    });
  } catch (err: unknown) {
    console.error('Preview scan failed:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Failed to scan website' });
  }
}
