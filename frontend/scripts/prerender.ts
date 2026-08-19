import { TOOLS } from '../src/data/toolsData';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');
const prerenderDir = join(publicDir, 'prerendered');

const BASE = process.env.PRERENDER_BASE ?? 'http://127.0.0.1:4173';
const CHROME =
  process.env.CHROME_PATH ??
  'C:/Users/FAHAM/.agent-browser/browsers/chrome-152.0.7977.42/chrome.exe';

const coreRoutes = ['/', '/pricing', '/demo', '/free-tools', '/features', '/compare', '/alternatives', '/blog', '/integrations', '/faq', '/guides/ai-sales-agents', '/case-studies', '/about', '/contact', '/trust'];

const toolRoutes = TOOLS.filter((t) => t.status === 'active').map((t) => t.route ?? `/tools/${t.slug}`);

const routes = [...coreRoutes, ...toolRoutes];

function outputPath(route: string): string {
  const rel = route === '/' ? 'index' : route.replace(/^\//, '').replace(/\/$/, '');
  return join(prerenderDir, rel === 'index' ? 'index.html' : join(rel, 'index.html'));
}

for (const route of routes) {
  const target = outputPath(route);
  if (existsSync(target)) {
    console.log(`skip (exists) ${route}`);
    continue;
  }
  const url = `${BASE}${route === '/' ? '/' : route}`;
  const cmd = `"${CHROME}" --headless=new --disable-gpu --no-sandbox --no-first-run --disable-extensions --virtual-time-budget=8000 --dump-dom "${url}"`;
  let html: string;
  try {
    html = execSync(cmd, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  } catch (err) {
    console.error(`FAILED ${route}: ${(err as Error).message.slice(0, 200)}`);
    continue;
  }
  const sanity = html.includes('</html>');
  if (!sanity) {
    console.error(`INCOMPLETE ${route}`);
    continue;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html, 'utf8');
  console.log(`ok ${route} (${(html.length / 1024).toFixed(0)}KB)`);
}

console.log(`\nprerendered ${routes.length} routes into ${prerenderDir}`);