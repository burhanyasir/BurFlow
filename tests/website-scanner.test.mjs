import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { describe, it, expect, beforeEach } from 'vitest';
import { createWebsiteScannerService } from '../lib/website-scanner.js';

function createHtmlResponse(html) {
  return {
    ok: true,
    headers: { get: () => 'text/html; charset=utf-8' },
    text: async () => html,
  };
}

describe('WebsiteScannerService', () => {
  let dbPath;

  beforeEach(() => {
    dbPath = path.join(process.cwd(), 'data', 'test-website-scanner.sqlite');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('creates a tenant-scoped scan and a structured report', async () => {
    const html = `
      <html>
        <head>
          <title>Acme Studio</title>
          <meta name="description" content="Modern services for growth" />
        </head>
        <body>
          <nav>
            <a href="/services">Services</a>
            <a href="/pricing">Pricing</a>
            <a href="/contact">Contact</a>
          </nav>
          <h1>Acme Studio</h1>
          <h2>Services</h2>
          <p>We offer web design and SEO consulting.</p>
          <h2>Pricing</h2>
          <p>Starter plans start at $99 per month.</p>
          <h2>FAQ</h2>
          <p>Do you offer support? Yes, we offer priority support.</p>
          <h2>About</h2>
          <p>We help local brands grow online.</p>
        </body>
      </html>`;

    const originalFetch = global.fetch;
    global.fetch = async (input) => {
      const url = String(input);
      if (url === 'https://example.com/') {
        return createHtmlResponse(html);
      }
      if (url === 'https://example.com/services') {
        return createHtmlResponse('<html><body><h1>Services</h1><p>Web design and SEO</p></body></html>');
      }
      if (url === 'https://example.com/pricing') {
        return createHtmlResponse('<html><body><h1>Pricing</h1><p>Starter at $99/mo</p></body></html>');
      }
      if (url === 'https://example.com/contact') {
        return createHtmlResponse('<html><body><h1>Contact</h1><p>hello@acme.example</p></body></html>');
      }
      return createHtmlResponse('<html><body><h1>Fallback</h1></body></html>');
    };

    const service = createWebsiteScannerService({ dbPath });
    try {
      const result = await service.scanWebsite({ tenantId: 'tenant-1', url: 'https://example.com', maxPages: 4, respectRobotsTxt: false });

      expect(result.scanId).toBeTruthy();
      expect(result.report.summary.pageCount).toBeGreaterThan(0);
      expect(result.report.extracted.services).toEqual(expect.arrayContaining([expect.stringContaining('web design')]) );
      expect(result.report.extracted.pricing).toEqual(expect.arrayContaining([expect.stringContaining('$99')]) );
      expect(result.report.extracted.contact).toEqual(expect.arrayContaining([expect.stringContaining('hello@acme.example')]) );
      expect(result.report.summary.tenantId).toBe('tenant-1');
    } finally {
      global.fetch = originalFetch;
      service.close();
    }
  });

  it('builds a normalized business profile and persists it tenant-scoped', async () => {
    const html = `
      <html lang="en">
        <head>
          <title>Northwind Labs | AI onboarding for B2B teams</title>
          <meta name="description" content="Northwind Labs helps B2B SaaS teams accelerate onboarding." />
          <meta property="og:title" content="Northwind Labs" />
          <meta property="og:description" content="AI onboarding automation for revenue teams." />
        </head>
        <body>
          <h1>Northwind Labs</h1>
          <p>We help B2B SaaS teams automate onboarding and shorten time to value.</p>
          <p>Our platform improves activation and reduces manual work.</p>
          <p>Book a demo or request a quote.</p>
          <a href="https://www.linkedin.com/company/northwind-labs">LinkedIn</a>
          <a href="https://twitter.com/northwindlabs">Twitter</a>
        </body>
      </html>`;

    const structuredData = `{
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Northwind Labs",
      "url": "https://northwind.example",
      "industry": "Software Development",
      "description": "AI onboarding automation for modern revenue teams",
      "email": "hello@northwind.example",
      "telephone": "+1-555-0100",
      "sameAs": ["https://www.linkedin.com/company/northwind-labs"]
    }`;

    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      headers: { get: () => 'text/html; charset=utf-8' },
      text: async () => `<html><head><script type="application/ld+json">${structuredData}</script>${html.replace(/<body[^>]*>/, '<body>')}</head></html>`,
    });

    const service = createWebsiteScannerService({ dbPath });
    try {
      const result = await service.scanWebsite({ tenantId: 'tenant-3', url: 'https://northwind.example', maxPages: 1, respectRobotsTxt: false });

      expect(result.report.businessProfile.companyName).toBe('Northwind Labs');
      expect(result.report.businessProfile.website).toBe('https://northwind.example/');
      expect(result.report.businessProfile.industry).toMatch(/software/i);
      expect(result.report.businessProfile.services).toEqual(expect.arrayContaining([expect.stringMatching(/onboarding/i)]));
      expect(result.report.businessProfile.contact.email).toBe('hello@northwind.example');
      expect(result.report.businessProfile.primaryCTA).toMatch(/demo|quote/i);
      expect(result.report.businessProfile.confidenceScore).toBeGreaterThan(0.3);

      const db = new Database(dbPath);
      try {
        const profileRows = db.prepare('SELECT tenant_id, profile_json FROM website_business_profiles WHERE tenant_id = ?').all('tenant-3');
        expect(profileRows).toHaveLength(1);
        expect(JSON.parse(profileRows[0].profile_json).companyName).toBe('Northwind Labs');
      } finally {
        db.close();
      }
    } finally {
      global.fetch = originalFetch;
      service.close();
    }
  });

  it('supports rescanning and detects unchanged pages', async () => {
    const html = '<html><head><title>Acme Studio</title></head><body><h1>Acme Studio</h1><p>We help brands grow.</p></body></html>';

    const originalFetch = global.fetch;
    global.fetch = async () => createHtmlResponse(html);

    const service = createWebsiteScannerService({ dbPath });
    try {
      const first = await service.scanWebsite({ tenantId: 'tenant-2', url: 'https://example.com', maxPages: 1, respectRobotsTxt: false });
      const second = await service.scanWebsite({ tenantId: 'tenant-2', url: 'https://example.com', maxPages: 1, respectRobotsTxt: false });

      expect(first.scanId).toBeTruthy();
      expect(second.scanId).toBeTruthy();
      expect(second.report.summary.previousScanId).toBe(first.scanId);
      expect(second.report.summary.changedPageCount).toBe(0);
      expect(second.report.summary.unchangedPageCount).toBeGreaterThan(0);
    } finally {
      global.fetch = originalFetch;
      service.close();
    }
  });
});
