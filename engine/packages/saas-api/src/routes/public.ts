import { Router, Request, Response } from 'express';
import { LeadRepository, TenantRepository } from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { requireJsonObject, validateEmail, validateRequiredString, validateRequiredEnum, validationError } from '../middleware/validate';
import { getEmailService } from '../services/email';

const logger = createLogger('saas-api:public');

/**
 * BurFlow's own sales tenant. The landing page and marketing forms capture
 * inbound demand here, and the demo widget (burflow-saas) is the same tenant —
 * so these leads surface in the BurFlow sales dashboard's Lead Inbox.
 */
const SALES_TENANT_ID = 'burflow-saas';

const SOURCES = ['contact', 'demo', 'scan', 'tool'] as const;

/**
 * Public inbound lead capture used by the marketing site:
 *   - /contact  (ContactForm): name + work email (+ company, message, volume)
 *   - /demo     (DemoPage booking): name + work email + company + slot details
 *   - / (landing scan CTA): website URL only (no email required)
 *   - /tools/* (LeadCaptureModal): email (+ name) + tool context — the
 *     visitor's calculation result is summarized into the lead metadata
 * No auth. Rate-limited at the mount point. Best-effort email notification to
 * SALES_NOTIFY_EMAIL when configured — a mail failure must never break capture.
 */
export function createPublicRoutes(leadRepo: LeadRepository, tenantRepo: TenantRepository): Router {
  const router = Router();

  router.post('/leads', requireJsonObject, (req: Request, res: Response) => {
    try {
      const { source, name, email, company, message, websiteUrl, teamSize, preferredDate, preferredTime, focus, volume, tool, toolName, resultType, resultSummary } = req.body;

      const errors = [
        validateRequiredEnum(source, 'source', SOURCES as unknown as string[]),
      ].filter(Boolean);

      if (source === 'scan') {
        if (!websiteUrl || typeof websiteUrl !== 'string') {
          errors.push({ field: 'websiteUrl', message: 'Website URL is required for a scan lead' });
        }
      } else {
        const nameErr = validateRequiredString(name, 'name', { maxLength: 120 });
        const emailErr = validateEmail(email, 'email');
        if (nameErr) errors.push(nameErr);
        if (emailErr) errors.push(emailErr);
      }

      if (source === 'tool') {
        if (tool && (typeof tool !== 'string' || tool.length > 120)) {
          errors.push({ field: 'tool', message: 'tool must be a short string' });
        }
        if (toolName && (typeof toolName !== 'string' || toolName.length > 120)) {
          errors.push({ field: 'toolName', message: 'toolName must be a short string' });
        }
        if (resultType && (typeof resultType !== 'string' || resultType.length > 80)) {
          errors.push({ field: 'resultType', message: 'resultType must be a short string' });
        }
        if (resultSummary !== undefined && (typeof resultSummary !== 'string' || resultSummary.length > 1000)) {
          errors.push({ field: 'resultSummary', message: 'resultSummary must be a string of at most 1000 characters' });
        }
      }

      if (errors.length > 0) return validationError(res, errors as any);

      // Ensure BurFlow's own tenant exists (idempotent, SQLite + PostgreSQL).
      tenantRepo.ensureDemoTenant(SALES_TENANT_ID);

      const lead = leadRepo.create({
        tenantId: SALES_TENANT_ID,
        sessionId: `public-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        email: email || undefined,
        name: name || undefined,
        company: company || undefined,
        qualificationStatus: 'unqualified',
        leadScore: 0,
        buyingIntent: 'low',
        source: 'form',
        metadata: {
          source,
          message: message || undefined,
          websiteUrl: websiteUrl || undefined,
          teamSize: teamSize || undefined,
          preferredDate: preferredDate || undefined,
          preferredTime: preferredTime || undefined,
          focus: focus || undefined,
          volume: volume || undefined,
          tool: tool || undefined,
          toolName: toolName || undefined,
          resultType: resultType || undefined,
          resultSummary: resultSummary || undefined,
        },
      });

      const notifyTo = process.env.SALES_NOTIFY_EMAIL;
      if (notifyTo) {
        const summary = [
          `New BurFlow ${source} lead`,
          name ? `Name: ${name}` : null,
          email ? `Email: ${email}` : null,
          company ? `Company: ${company}` : null,
          websiteUrl ? `Website: ${websiteUrl}` : null,
          message ? `Message: ${message}` : null,
          toolName ? `Tool: ${toolName}` : null,
          resultType ? `Result: ${resultType}` : null,
          resultSummary ? `Summary: ${resultSummary}` : null,
        ].filter(Boolean).join('\n');
        getEmailService().send({
          to: notifyTo,
          subject: `New ${source} lead from BurFlow site`,
          text: summary,
          html: `<pre>${summary.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`,
        }).catch((err: any) => {
          createContextLogger(logger).error({ err }, 'Sales notification email failed (non-fatal)');
        });
      }

      res.status(201).json({ id: lead.id, message: 'Lead captured' });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Public lead capture failed');
      res.status(500).json({ error: 'Failed to capture lead' });
    }
  });

  // POST /preview-scan — Server-side website fetch + parse for the landing page scanner.
  // No auth needed. Rate-limited at mount point. Returns parsed HTML content
  // so the client never has to deal with CORS proxies.
  router.post('/preview-scan', requireJsonObject, async (req: Request, res: Response) => {
    try {
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

      // Block private/internal networks
      const hostname = parsedUrl.hostname.toLowerCase();
      if (/^(localhost|127\.|10\.|192\.168|172\.(1[6-9]|2|3[01])\.|0\.|::1)/.test(hostname)) {
        return res.status(400).json({ error: 'Private network URLs are not allowed' });
      }

      const fetchPage = async (pageUrl: string, timeoutMs = 6000): Promise<string> => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(pageUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            redirect: 'follow',
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.text();
        } finally {
          clearTimeout(timer);
        }
      };

      /** Classify a fetch failure so the client can show a helpful message
       *  instead of a generic error. */
      const fetchErrorCode = (err: any): { code: string; message: string } => {
        const msg = String(err?.message || '');
        if (msg.includes('AbortError') || err?.name === 'AbortError') return { code: 'timeout', message: 'The site took too long to respond.' };
        const m = msg.match(/HTTP (\d+)/);
        if (m) {
          const s = Number(m[1]);
          if (s === 403 || s === 401 || s === 429) return { code: 'blocked', message: 'The site blocked automated scanning (HTTP ' + s + ').' };
          if (s === 404) return { code: 'not_found', message: 'The page was not found (HTTP 404).' };
          if (s >= 500) return { code: 'server_error', message: 'The site returned a server error (HTTP ' + s + ').' };
        }
        return { code: 'network', message: 'Could not reach the site.' };
      };

      /** Regex-based HTML extraction — no jsdom needed.
       *  NOTE: escape backslashes inside template literals — `\s` in a
       *  template is an invalid escape that silently becomes `s`. */
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

      /** Extract product/service names from JSON-LD structured data
       *  (RESTAURANT menus, e-commerce ItemList/Product, Service pages…). */
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
        const descMatch = rawHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
          || rawHtml.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i)
          || rawHtml.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
        const description = descMatch ? descMatch[1].trim() : '';
        const rawLinks = extractAttr(rawHtml, 'a', 'href')
          .filter((href) => href.startsWith('/') || href.startsWith(origin))
          .map((href) => { try { return new URL(href, origin).pathname; } catch { return href; } })
          .filter((p) => p && !p.startsWith('#') && !p.includes('.'));
        const headings = [...extractBetween(rawHtml, 'h1'), ...extractBetween(rawHtml, 'h2'), ...extractBetween(rawHtml, 'h3')]
          .filter((h) => h.length > 1 && !/^(home|menu|close|search|cart|login|sign|toggle|location|nav|skip|cookie|copyright|privacy|main menu|secondary|site footer|homepage|skip to)/i.test(h));
        const noscript = (rawHtml.match(/<noscript[^>]*>([\s\S]*?)<\/noscript>/i) || [])[1] || '';
        const noscriptSentences = noscript
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 20 && s.length < 300);
        const paragraphs = [...extractBetween(rawHtml, 'p'), ...noscriptSentences].filter((t) => t.length > 20 && t.length < 300).slice(0, 30);
        const lists = extractBetween(rawHtml, 'li').filter((t) => t.length > 5 && t.length < 200).slice(0, 30);
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

      // Fetch main page — a block/timeout must NOT fail the whole scan;
      // return a structured error the client can explain to the visitor.
      let mainHtml: string;
      try {
        mainHtml = await fetchPage(parsedUrl.href);
      } catch (err: any) {
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

      // Discover sub-pages (product, service, pricing, about)
      const subPatterns = /product|service|pric|plan|about|feature|solution|offer|contact|team|shop|store|collection|category|menu|treatment|gallery|work|portfolio|booking|book|appointment|pricing|careers|faq/i;
      const subPaths = [...new Set(mainParsed.links.filter((p) => subPatterns.test(p)))].slice(0, 4);
      const subPages: Array<{ path: string; headings: string[]; paragraphs: string[]; lists: string[]; jsonLd: string[] }> = [];
      await Promise.all(subPaths.map(async (subPath) => {
        try {
          const subUrl = new URL(subPath, parsedUrl.origin).href;
          const subHtml = await fetchPage(subUrl, 5000);
          const subParsed = parseHtml(subHtml, subUrl);
          subPages.push({ path: subPath, headings: subParsed.headings, paragraphs: subParsed.paragraphs, lists: subParsed.lists, jsonLd: subParsed.jsonLd });
        } catch { /* skip failed sub-pages */ }
      }));

      // Classify content
      const allHeadings = [...mainParsed.headings, ...subPages.flatMap((s) => s.headings)];
      const allParagraphs = [...mainParsed.paragraphs, ...subPages.flatMap((s) => s.paragraphs)];
      const allLists = [...mainParsed.lists, ...subPages.flatMap((s) => s.lists)];
      const jsonLdNames = [...mainParsed.jsonLd, ...subPages.flatMap((s) => s.jsonLd)];
      const allText = [...allHeadings, ...allParagraphs, ...allLists].join(' ');

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

      // If still empty, use collection/category links, then meaningful headings
      if (products.length === 0) {
        const collectionLinks = mainParsed.links
          .filter((l) => /collection|category|product|shop|store|menu|item/i.test(l))
          .map((l) => l.replace(/^\//, '').replace(/\//g, ' > '))
          .slice(0, 8);
        if (collectionLinks.length > 0) products = collectionLinks;
      }
      if (products.length === 0) {
        products = allHeadings
          .filter((h) => h.trim().length > 3 && isNameLike(h) && !/^(home|menu|close|search|cart|login|sign|toggle|location|nav|skip|cookie|copyright|privacy)/i.test(h.trim()))
          .slice(0, 8);
      }

      // Extract specific product/service names from text
      const namePatterns = allParagraphs
        .filter((p) => /we offer|our .{0,30}(product|service|solution|tool|platform|collection|range|line|brand)/i.test(p))
        .map((p) => p.slice(0, 150))
        .slice(0, 3);

      res.json({
        title: mainParsed.title,
        description: mainParsed.description,
        headings: allHeadings.slice(0, 12),
        products,
        services,
        paragraphs: namePatterns,
        links: mainParsed.links.slice(0, 10),
        subPages: subPages.map((s) => s.path),
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Preview scan failed');
      res.status(500).json({ error: 'Failed to scan website' });
    }
  });

  return router;
}
