#!/usr/bin/env node
const { createHmac } = require('crypto');

const WIDGET_SECRET = process.env.WIDGET_SECRET ?? 'local-dev-widget-secret-1234567890123456789012345678901234567890';

function signWidgetToken(encoded) {
  return createHmac('sha256', WIDGET_SECRET).update(encoded).digest('hex');
}

function generateWidgetToken(tenantId) {
  const payload = {
    tenantId,
    type: 'widget',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = signWidgetToken(encoded);
  return `${encoded}.${sig}`;
}

const token = generateWidgetToken('demo-tenant');

console.log('LOCAL DEV WIDGET TOKEN (demo tenant)');
console.log('-------------------------------------');
console.log(token);
console.log('');
console.log('THIS TOKEN IS FOR LOCAL DEV TESTING ONLY. Do not commit it into frontend source.');
console.log('');
console.log('Usage:');
console.log('  1. Start your local SaaS API and frontend dev server.');
console.log('  2. Open the dev fixture page: http://127.0.0.1:5173/dev-widget-test.html');
console.log('  3. Append the token as a URL param:');
console.log(`     http://127.0.0.1:5173/dev-widget-test.html?token=${encodeURIComponent(token)}`);
console.log('');
console.log('If WIDGET_SECRET is set in your environment, this script uses that value; otherwise it falls back to the same local default used by start-local.js.');
