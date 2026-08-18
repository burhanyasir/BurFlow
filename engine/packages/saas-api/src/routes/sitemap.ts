import { Router, Request, Response } from 'express';

const DEFAULT_SITE_URL = 'https://burflow.vercel.app';

interface SitemapEntry {
  path: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: string;
}

const STATIC_ROUTES: SitemapEntry[] = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/demo', changefreq: 'weekly', priority: '0.8' },
  { path: '/pricing', changefreq: 'weekly', priority: '0.8' },
  { path: '/signup', changefreq: 'monthly', priority: '0.6' },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function createSitemapRoutes(options?: { siteUrl?: string }): Router {
  const router = Router();
  const baseUrl = (options?.siteUrl || process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
  const lastmod = new Date().toISOString().slice(0, 10);

  router.get('/sitemap.xml', (_req: Request, res: Response) => {
    const urls = STATIC_ROUTES
      .map((route) => [
        '  <url>',
        `    <loc>${escapeXml(baseUrl + route.path)}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${route.changefreq}</changefreq>`,
        `    <priority>${route.priority}</priority>`,
        '  </url>',
      ].join('\n'))
      .join('\n');

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      urls,
      '</urlset>',
      '',
    ].join('\n');

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=86400');
    res.status(200).send(xml);
  });

  return router;
}