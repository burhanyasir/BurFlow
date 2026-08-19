import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;
const API_PORT = 3457;

/**
 * E2E customer-journey test stack:
 *  1. Local BurFlow SaaS API (engine) on :3457 — spawned by e2e/start-api.mjs
 *     against a local SQLite DB (engine/data/saas.db) so tests never touch
 *     the production Neon database. API keys come from engine/.env and
 *     engine/packages/saas-api/.env.local (GROQ for the AI agent).
 *  2. Vite dev server on :5173 — serves the SPA and proxies /api → :3457.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 180_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'bun e2e/start-api.mjs',
      port: API_PORT,
      timeout: 120_000,
      reuseExistingServer: true,
    },
    {
      // --host 127.0.0.1 pins the IPv4 interface: vite sometimes binds only
      // ::1, which breaks Playwright's 127.0.0.1 readiness probe.
      command: 'bun run dev --host 127.0.0.1',
      port: PORT,
      timeout: 120_000,
      reuseExistingServer: true,
    },
  ],
});
