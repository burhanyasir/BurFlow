#!/usr/bin/env node
// Build script for BurFlow Lead Generator Chrome Extension
// Copies all extension files into dist/ for loading in Chrome.

const fs = require('fs');
const path = require('path');

const SRC = __dirname;
const DIST = path.join(__dirname, 'dist');

const FILES = [
  'manifest.json',
  'popup.html',
  'popup.js',
  'content.js',
  'background.js',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png'
];

// Clean dist
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true, force: true });
}
fs.mkdirSync(DIST, { recursive: true });
fs.mkdirSync(path.join(DIST, 'icons'), { recursive: true });

let copied = 0;
let warnings = 0;

for (const file of FILES) {
  const srcPath = path.join(SRC, file);
  const destPath = path.join(DIST, file);

  if (!fs.existsSync(srcPath)) {
    console.warn(`⚠ Missing: ${file}`);
    warnings++;
    continue;
  }

  fs.copyFileSync(srcPath, destPath);
  copied++;
  console.log(`✓ ${file}`);
}

console.log(`\nBuilt ${copied} files to dist/`);

if (warnings > 0) {
  console.warn(`⚠ ${warnings} file(s) missing — run "node generate-icons.js" first`);
}

// Verify manifest
try {
  const manifest = JSON.parse(fs.readFileSync(path.join(DIST, 'manifest.json'), 'utf8'));
  const checks = [
    ['manifest_version', manifest.manifest_version === 3, 'Manifest V3'],
    ['name', !!manifest.name, 'Extension name'],
    ['version', !!manifest.version, 'Version'],
    ['permissions', Array.isArray(manifest.permissions), 'Permissions array'],
    ['action', !!manifest.action?.default_popup, 'Popup configured'],
    ['background', !!manifest.background?.service_worker, 'Service worker'],
  ];

  console.log('\nManifest validation:');
  for (const [key, ok, label] of checks) {
    console.log(`  ${ok ? '✓' : '✗'} ${label}`);
  }
} catch (e) {
  console.error('Manifest validation failed:', e.message);
}

console.log('\nTo load: chrome://extensions → Load unpacked → select extension/dist/');
