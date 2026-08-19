import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * End-to-End Customer Simulation Test
 *
 * Simulates a real BurFlow customer journey against the local dev stack:
 *   A. Landing page (marketing site)            → hero + CTA
 *   B. Sign up (free trial)                     → dashboard
 *   C. Embed widget settings                    → extract tenant id + script tag
 *   D. Live customer site simulation            → widget launcher mounts
 *   E. Live chat interaction                    → streamed AI sales-agent reply
 *
 * Stack (see playwright.config.ts): vite dev :5173 (proxies /api → saas-api
 * :3457, local SQLite, GROQ-backed AI). Requires a working GROQ/OpenRouter key
 * in engine/.env or engine/packages/saas-api/.env.local.
 */

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const WIDGET_PROOF = join(FRONTEND_DIR, 'e2e-widget-proof.png');
const CHAT_PROOF = join(FRONTEND_DIR, 'e2e-chat-open-proof.png');
const STATIC_SITE = join(FRONTEND_DIR, 'public', 'test-customer-site.html');

test('customer journey: landing → signup → embed → widget → AI chat', async ({ page }) => {
  const stamp = Date.now();
  const email = `test-customer-${stamp}@example.com`;
  const password = 'TestCustomer!2026';
  const company = 'Acme SaaS';
  test.info().annotations.push({ type: 'credentials', description: `${email} / ${password} / ${company}` });

  // ── Step A: Landing page ─────────────────────────────────────────────────
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('salesperson', { timeout: 60_000 });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your website is');

  await page.getByRole('link', { name: 'Start free' }).first().click();
  await expect(page).toHaveURL(/\/signup$/);
  console.log('[Step A] Landing page verified — hero + "Start free" CTA navigated to /signup');

  // ── Step B: Sign up ──────────────────────────────────────────────────────
  await page.locator('#signup-name').fill('Test Customer');
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill(password);
  await page.locator('#signup-confirm').fill(password);
  await page.locator('#signup-company').fill(company);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });
  await expect(page.locator('body')).toContainText('Widget', { timeout: 60_000 });
  console.log(`[Step B] Signed up ${email} (${company}) → redirect to /dashboard`);

  // ── Step C: Widget code retrieval (Dashboard → Embed) ───────────────────
  await page.goto('/dashboard/widget');
  const snippetEl = page.locator('pre code');
  await expect(snippetEl).toContainText('data-tenant-id=', { timeout: 60_000 });

  const snippet = (await snippetEl.innerText()).trim();
  const tenantMatch = snippet.match(/data-tenant-id="([^"]+)"/);
  const srcMatch = snippet.match(/src="([^"]+)"/);
  expect(tenantMatch, 'embed snippet must expose data-tenant-id').not.toBeNull();
  expect(srcMatch, 'embed snippet must reference the widget bundle').not.toBeNull();

  const tenantId = tenantMatch![1];
  const widgetSrc = srcMatch![1];
  expect(tenantId.length).toBeGreaterThan(0);

  console.log('[Step C] Embed snippet extracted from Dashboard → Widget settings');
  console.log(`[Step C] Tenant ID : ${tenantId}`);
  console.log(`[Step C] Script tag : ${snippet.replace(/\n/g, ' ')}`);
  test.info().annotations.push({ type: 'tenant', description: tenantId });
  test.info().annotations.push({ type: 'snippet', description: snippet });

  // ── Step D: Live customer site simulation ───────────────────────────────
  // Serve the Acme SaaS mock page (simulating https://acme-customer-website.com)
  // with the REAL tenant injected, loaded from the same origin so widget API
  // traffic flows through the vite dev proxy.
  const staticHtml = readFileSync(STATIC_SITE, 'utf8');
  const mockHtml = staticHtml.replaceAll('YOUR_TENANT_ID', tenantId);
  expect(mockHtml).not.toContain('YOUR_TENANT_ID');

  await page.route('**/test-customer-site.html', (route) =>
    route.fulfill({ contentType: 'text/html', body: mockHtml }),
  );

  await page.goto('/test-customer-site.html');
  await expect(page.locator('.logo')).toContainText('Acme SaaS');
  await expect(page.locator('h1')).toContainText('closes deals');
  console.log(`[Step D] Mock customer site loaded at /test-customer-site.html with tenant "${tenantId}"`);

  // The widget exchanges the tenant id for a token and mounts the launcher.
  const bubble = page.locator('.cw-bubble');
  await expect(bubble).toBeVisible({ timeout: 60_000 });
  await expect(bubble).toHaveCSS('position', 'fixed');
  await expect(bubble).toHaveCSS('bottom', '20px');
  await expect(bubble).toHaveCSS('right', '20px');
  await page.screenshot({ path: WIDGET_PROOF, fullPage: false });
  console.log(`[Step D] Widget launcher mounted (bottom right) → screenshot ${WIDGET_PROOF}`);

  // ── Step E: Live chat interaction ────────────────────────────────────────
  await bubble.click();
  const chat = page.locator('.cw-container');
  await expect(chat).toBeVisible({ timeout: 30_000 });

  const input = page.locator('.cw-input');
  await expect(input).toBeVisible();
  await input.fill('Hi, what plans do you offer?');
  await page.locator('.cw-send').click();

  // Wait for the streamed AI sales-agent reply to appear in the chat window.
  const assistant = page.locator('.cw-message-assistant .cw-message-content');
  await expect
    .poll(
      async () => {
        const count = await assistant.count();
        if (count === 0) return '';
        const text = (await assistant.last().innerText()).trim();
        return text;
      },
      { timeout: 90_000, intervals: [500, 1000, 2000] },
    )
    .not.toBe('');

  const reply = (await assistant.last().innerText()).trim();
  expect(reply.length).toBeGreaterThan(10);
  expect(reply.toLowerCase()).not.toContain('temporarily unavailable');
  expect(reply.toLowerCase()).not.toContain('network error');
  console.log(`[Step E] AI sales agent streamed reply (${reply.length} chars): "${reply.slice(0, 180)}${reply.length > 180 ? '…' : ''}"`);

  await page.screenshot({ path: CHAT_PROOF, fullPage: false });
  console.log(`[Step E] Chat open with streamed AI response → screenshot ${CHAT_PROOF}`);
});