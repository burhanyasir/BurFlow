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

      const fetchPage = async (pageUrl: string): Promise<string> => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const res = await fetch(pageUrl, {
            signal: controller.signal,
            headers: { 'User-Agent': 'BurFlow-Scanner/1.0 (compatible; bot)' },
            redirect: 'follow',
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.text();
        } finally {
          clearTimeout(timer);
        }
      };

      /** Regex-based HTML extraction — no jsdom needed. */
      const extractBetween = (html: string, tag: string): string[] => {
        const re = new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, 'gi');
        const results: string[] = [];
        let m: RegExpExecArray | null;
        while ((m = re.exec(html))) results.push(m[1].replace(/<[^>]+>/g, '').trim());
        return results;
      };
      const extractAttr = (html: string, tag: string, attr: string): string[] => {
        const re = new RegExp(`<${tag}[^>]*\s${attr}=["']([^"']*)["'][^>]*>`, 'gi');
        const results: string[] = [];
        let m: RegExpExecArray | null;
        while ((m = re.exec(html))) results.push(m[1].trim());
        return results;
      };

      const parseHtml = (rawHtml: string, baseUrl: string) => {
        const origin = new URL(baseUrl).origin;
        const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        const descMatch = rawHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
          || rawHtml.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
        const description = descMatch ? descMatch[1].trim() : '';
        const rawLinks = extractAttr(rawHtml, 'a', 'href')
          .filter((href) => href.startsWith('/') || href.startsWith(origin))
          .map((href) => { try { return new URL(href, origin).pathname; } catch { return href; } })
          .filter((p) => p && !p.startsWith('#') && !p.includes('.'));
        const headings = [...extractBetween(rawHtml, 'h1'), ...extractBetween(rawHtml, 'h2'), ...extractBetween(rawHtml, 'h3')];
        const paragraphs = extractBetween(rawHtml, 'p').filter((t) => t.length > 20 && t.length < 300).slice(0, 30);
        const lists = extractBetween(rawHtml, 'li').filter((t) => t.length > 5 && t.length < 200).slice(0, 30);
        return { title, description, links: [...new Set(rawLinks)].slice(0, 50), headings: [...new Set(headings)].slice(0, 20), paragraphs, lists };
      };

      // Fetch main page
      const mainHtml = await fetchPage(parsedUrl.href);
      const mainParsed = parseHtml(mainHtml, parsedUrl.href);

      // Discover sub-pages (product, service, pricing, about)
      const subPatterns = /product|service|pric|plan|about|feature|solution|offer|contact|team/i;
      const subPaths = mainParsed.links.filter((p) => subPatterns.test(p)).slice(0, 3);
      const subPages: Array<{ path: string; headings: string[]; paragraphs: string[]; lists: string[] }> = [];
      for (const subPath of subPaths) {
        try {
          const subUrl = new URL(subPath, parsedUrl.origin).href;
          const subHtml = await fetchPage(subUrl);
          const subParsed = parseHtml(subHtml, subUrl);
          subPages.push({ path: subPath, headings: subParsed.headings, paragraphs: subParsed.paragraphs, lists: subParsed.lists });
        } catch { /* skip failed sub-pages */ }
      }

      // Classify content
      const allHeadings = [...mainParsed.headings, ...subPages.flatMap((s) => s.headings)];
      const allParagraphs = [...mainParsed.paragraphs, ...subPages.flatMap((s) => s.paragraphs)];
      const allLists = [...mainParsed.lists, ...subPages.flatMap((s) => s.lists)];
      const allText = [...allHeadings, ...allParagraphs, ...allLists].join(' ');

      const productKw = /product|feature|solution|tool|platform|software|app|offer|plan|package|suite|module/i;
      const serviceKw = /service|support|consulting|help|setup|onboard|implementation|maintenance|training|managed/i;
      const products = allHeadings.filter((h) => productKw.test(h)).slice(0, 8);
      const services = allHeadings.filter((h) => serviceKw.test(h)).slice(0, 8);

      // Extract specific product/service names from text
      const namePatterns = allParagraphs
        .filter((p) => /we offer|our .{0,20}(product|service|solution|tool|platform)/i.test(p))
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
