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

  const fetchPage = async (pageUrl: string): Promise<string> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const resp = await fetch(pageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BurFlow-Scanner/1.0)',
          Accept: 'text/html,application/xhtml+xml,*/*',
        },
        redirect: 'follow',
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.text();
    } finally {
      clearTimeout(timer);
    }
  };

  const extractBetween = (html: string, tag: string): string[] => {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    const results: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) results.push(m[1].replace(/<[^>]+>/g, '').trim());
    return results;
  };

  const extractAttr = (html: string, tag: string, attr: string): string[] => {
    const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']*)["'][^>]*>`, 'gi');
    const results: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) results.push(m[1].trim());
    return results;
  };

  const parseHtml = (rawHtml: string, baseUrl: string) => {
    const origin = new URL(baseUrl).origin;
    const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    const descMatch =
      rawHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
      rawHtml.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
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
    ];
    const paragraphs = extractBetween(rawHtml, 'p')
      .filter((t) => t.length > 20 && t.length < 300)
      .slice(0, 30);
    const lists = extractBetween(rawHtml, 'li')
      .filter((t) => t.length > 5 && t.length < 200)
      .slice(0, 30);
    return {
      title,
      description,
      links: [...new Set(rawLinks)].slice(0, 50),
      headings: [...new Set(headings)].slice(0, 20),
      paragraphs,
      lists,
    };
  };

  try {
    const mainHtml = await fetchPage(parsedUrl.href);
    const mainParsed = parseHtml(mainHtml, parsedUrl.href);

    const subPatterns = /product|service|pric|plan|about|feature|solution|offer|contact|team/i;
    const subPaths = mainParsed.links.filter((p) => subPatterns.test(p)).slice(0, 3);
    const subPages: Array<{ path: string; headings: string[]; paragraphs: string[]; lists: string[] }> = [];
    for (const subPath of subPaths) {
      try {
        const subUrl = new URL(subPath, parsedUrl.origin).href;
        const subHtml = await fetchPage(subUrl);
        const subParsed = parseHtml(subHtml, subUrl);
        subPages.push({
          path: subPath,
          headings: subParsed.headings,
          paragraphs: subParsed.paragraphs,
          lists: subParsed.lists,
        });
      } catch { /* skip failed sub-pages */ }
    }

    const allHeadings = [...mainParsed.headings, ...subPages.flatMap((s) => s.headings)];
    const allParagraphs = [...mainParsed.paragraphs, ...subPages.flatMap((s) => s.paragraphs)];

    const productKw = /product|feature|solution|tool|platform|software|app|offer|plan|package|suite|module/i;
    const serviceKw = /service|support|consulting|help|setup|onboard|implementation|maintenance|training|managed/i;
    const products = allHeadings.filter((h) => productKw.test(h)).slice(0, 8);
    const services = allHeadings.filter((h) => serviceKw.test(h)).slice(0, 8);

    const namePatterns = allParagraphs
      .filter((p) => /we offer|our .{0,20}(product|service|solution|tool|platform)/i.test(p))
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
