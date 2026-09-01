// Builds the chat widget (engine/packages/widget) and copies the compiled
// bundle into frontend/public so the static demo/landing pages always serve
// the current widget. Wired into `npm run dev`, `build`, and `preview` via
// the pre* hooks in package.json.
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const widgetPkg = join(root, 'engine', 'packages', 'widget');
const widgetDist = join(widgetPkg, 'dist', 'widget.js');
const publicDir = join(here, '..', 'public');
const targets = [
  join(publicDir, 'widget', 'widget.js'),
  join(publicDir, 'widget.js'),
];

const esbuildBin = join(root, 'engine', 'node_modules', 'esbuild', 'bin', 'esbuild');

try {
  if (existsSync(esbuildBin)) {
    execSync('node build.js', { cwd: widgetPkg, stdio: 'inherit' });
  } else {
    console.log('[widget] esbuild not found — using pre-built dist/widget.js');
  }
  if (!existsSync(widgetDist)) {
    throw new Error('dist/widget.js not found — run the engine build first');
  }
  mkdirSync(join(publicDir, 'widget'), { recursive: true });
  for (const target of targets) {
    copyFileSync(widgetDist, target);
  }
  console.log(
    `[widget] copied dist/widget.js → frontend/public/widget.js + frontend/public/widget/widget.js`,
  );
} catch (err) {
  console.error('[widget] sync failed:', err.message);
  process.exit(1);
}
