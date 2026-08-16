#!/usr/bin/env node
/**
 * Provision the BurFlow product catalog in Paddle Sandbox.
 *
 * Creates the Starter / Pro / Advanced products, monthly + yearly prices
 * (lowest-denomination amounts, 7-day trials, GBP/EUR/AUD overrides) exactly
 * as defined in `packages/saas-core/src/config/paddle-plans.ts` — that module
 * is the single source of truth and must be built first:
 *
 *     cd engine && npx tsc -b packages/saas-core
 *     PADDLE_API_KEY=... node scripts/provision-paddle-catalog.js
 *
 * The script is idempotent: existing products/prices are matched by name and
 * left untouched. It prints the product/price IDs as env assignments and
 * writes them to packages/saas-core/src/config/paddle-catalog.generated.json
 * for reference. Paste the printed lines into your .env / .env.example.
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.PADDLE_API_KEY;
if (!API_KEY) {
  console.error('ERROR: PADDLE_API_KEY environment variable is required.');
  process.exit(1);
}

const BASE_URL = process.env.PADDLE_ENVIRONMENT === 'production'
  ? 'https://api.paddle.com'
  : 'https://sandbox-api.paddle.com';

const TRIAL_DAYS = 7;

let catalog;
try {
  catalog = require('../packages/saas-core/dist/config/paddle-plans.js');
} catch (err) {
  console.error('ERROR: saas-core must be built first. Run: npx tsc -b packages/saas-core');
  console.error(err.message);
  process.exit(1);
}

async function paddle(pathname, options = {}) {
  const res = await fetch(`${BASE_URL}${pathname}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Paddle API ${options.method || 'GET'} ${pathname} failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

async function findProductByName(name) {
  const { data } = await paddle('/products?status=active&per_page=200');
  return (data || []).find((p) => p.name === name) || null;
}

async function findPriceByDescription(description) {
  const { data } = await paddle('/prices?status=active&per_page=200');
  return (data || []).find((p) => p.description === description) || null;
}

function toCountryOverrides(overrides) {
  const grouped = new Map();
  for (const o of overrides || []) {
    if (!grouped.has(o.countryCode)) {
      grouped.set(o.countryCode, { countryCodes: [], unitPrice: { amount: o.unitPrice, currency_code: o.currencyCode } });
    }
    const entry = grouped.get(o.countryCode);
    if (!entry.countryCodes.includes(o.countryCode)) entry.countryCodes.push(o.countryCode);
    // The override list carries one entry per interval; prefer the highest amount
    // (yearly) so the effective override is the yearly price. Paddle applies
    // one amount per country, so merge into a single override.
    entry.unitPrice.amount = o.unitPrice;
  }
  return [...grouped.values()].map((g) => ({
    country_codes: g.countryCodes,
    unit_price: g.unitPrice,
  }));
}

async function ensurePrice(product, tier, priceConfig) {
  const description = `${tier.name} (${priceConfig.interval === 'year' ? 'Yearly' : 'Monthly'})`;
  const existing = await findPriceByDescription(description);
  if (existing) return existing;

  const body = {
    description,
    product_id: product.id,
    billing_cycle: { interval: priceConfig.interval, frequency: 1 },
    trial_period: { interval: 'day', frequency: priceConfig.trialDays || TRIAL_DAYS },
    unit_price: { amount: priceConfig.amount, currency_code: 'USD' },
    unit_price_overrides: toCountryOverrides(priceConfig.countryOverrides),
    quantity: { minimum: 1, maximum: 1 },
    // Products/prices are created active by default — the Paddle API rejects
    // an explicit `status` field in the create body.
  };
  const res = await paddle('/prices', { method: 'POST', body });
  console.log(`  created price ${description}: ${res.data.id}`);
  return res.data;
}

async function ensureProduct(tier) {
  const existing = await findProductByName(tier.name);
  if (existing) return existing;
  const res = await paddle('/products', {
    method: 'POST',
    body: {
      name: tier.name,
      description: tier.description,
      tax_category: 'standard',
      // Products are created active by default — `status` is not allowed here.
    },
  });
  console.log(`  created product ${tier.name}: ${res.data.id}`);
  return res.data;
}

async function main() {
  console.log(`Provisioning BurFlow Paddle catalog in ${BASE_URL}...\n`);

  const results = {};
  for (const tier of catalog.PADDLE_TIERS) {
    console.log(`\n${tier.name}:`);
    const product = await ensureProduct(tier);
    const monthly = await ensurePrice(product, tier, tier.monthly);
    const yearly = await ensurePrice(product, tier, tier.yearly);
    results[tier.id] = {
      productId: product.id,
      monthlyPriceId: monthly.id,
      yearlyPriceId: yearly.id,
    };
  }

  console.log('\n=== Add these to your environment ===\n');
  for (const tier of catalog.PADDLE_TIERS) {
    const r = results[tier.id];
    console.log(`PADDLE_PRODUCT_${tier.id.toUpperCase()}=${r.productId}`);
    console.log(`PADDLE_PRICE_${tier.id.toUpperCase()}_MONTHLY=${r.monthlyPriceId}`);
    console.log(`PADDLE_PRICE_${tier.id.toUpperCase()}_YEARLY=${r.yearlyPriceId}`);
  }

  const outPath = path.join(__dirname, '..', 'packages', 'saas-core', 'src', 'config', 'paddle-catalog.generated.json');
  fs.writeFileSync(outPath, JSON.stringify({ environment: process.env.PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox', generatedAt: new Date().toISOString(), catalog: results }, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log('Done. Restart the backend with the new env vars so price IDs are picked up.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
