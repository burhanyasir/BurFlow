import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import { createSitemapRoutes } from '../routes/sitemap';

function startApp(siteUrl?: string) {
  const app = express();
  app.use(createSitemapRoutes({ siteUrl }));
  return app;
}

async function request(app: express.Express, path: string): Promise<{ status: number; contentType: string | undefined; body: string }> {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const server = app.listen(0, () => {
      const port = (server.address() as any).port;
      const r = http.request({ hostname: '127.0.0.1', port, path, method: 'GET' }, (res: any) => {
        let data = '';
        res.on('data', (c: string) => data += c);
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode, contentType: res.headers['content-type'], body: data });
        });
      });
      r.on('error', reject);
      r.end();
    });
  });
}

describe('sitemap routes', () => {
  afterEach(() => {
    delete process.env.SITE_URL;
  });

  it('serves application/xml at /sitemap.xml with the default base URL', async () => {
    const res = await request(startApp(), '/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.contentType).toContain('application/xml');
    expect(res.body).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(res.body).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(res.body).toContain('<loc>https://burflow.vercel.app/</loc>');
  });

  it('honors SITE_URL from the environment', async () => {
    process.env.SITE_URL = 'https://example.com';
    const res = await request(startApp(), '/sitemap.xml');
    expect(res.body).toContain('<loc>https://example.com/</loc>');
    expect(res.body).toContain('<loc>https://example.com/pricing</loc>');
    expect(res.body).not.toContain('burflow.vercel.app');
  });

  it('prefers an explicit siteUrl option over the environment', async () => {
    process.env.SITE_URL = 'https://env.example.com';
    const res = await request(startApp('https://override.example.com'), '/sitemap.xml');
    expect(res.body).toContain('<loc>https://override.example.com/</loc>');
    expect(res.body).not.toContain('env.example.com');
  });

  it('strips trailing slashes from the configured base URL', async () => {
    const res = await request(startApp('https://example.com/'), '/sitemap.xml');
    expect(res.body).toContain('<loc>https://example.com/pricing</loc>');
    expect(res.body).not.toContain('example.com//');
  });

  it('includes all core static routes with changefreq and priority', async () => {
    const res = await request(startApp(), '/sitemap.xml');
    const expected = [
      { loc: 'https://burflow.vercel.app/', changefreq: 'daily', priority: '1.0' },
      { loc: 'https://burflow.vercel.app/demo', changefreq: 'weekly', priority: '0.8' },
      { loc: 'https://burflow.vercel.app/pricing', changefreq: 'weekly', priority: '0.8' },
      { loc: 'https://burflow.vercel.app/signup', changefreq: 'monthly', priority: '0.6' },
    ];
    for (const entry of expected) {
      expect(res.body).toContain(`<loc>${entry.loc}</loc>`);
      expect(res.body).toContain(`<changefreq>${entry.changefreq}</changefreq>`);
      expect(res.body).toContain(`<priority>${entry.priority}</priority>`);
    }
  });

  it('emits a lastmod date in YYYY-MM-DD format for every entry', async () => {
    const res = await request(startApp(), '/sitemap.xml');
    const today = new Date().toISOString().slice(0, 10);
    const urlBlocks = res.body.split('<url>').slice(1);
    expect(urlBlocks).toHaveLength(4);
    for (const block of urlBlocks) {
      expect(block).toContain(`<lastmod>${today}</lastmod>`);
    }
  });

  it('produces well-formed XML with every URL closed', async () => {
    const res = await request(startApp(), '/sitemap.xml');
    const openTags = (res.body.match(/<url>/g) || []).length;
    const closeTags = (res.body.match(/<\/url>/g) || []).length;
    expect(openTags).toBe(4);
    expect(closeTags).toBe(4);
    expect(res.body.trimEnd().endsWith('</urlset>')).toBe(true);
  });
});