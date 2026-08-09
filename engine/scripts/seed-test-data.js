/**
 * Seed script — creates a demo tenant, owner user, widget config, and API key
 * in the runtime database (same data directory the saas-api server uses).
 *
 * Usage:
 *   npm run seed
 *   DATABASE_PATH=/path/to/saas.db npm run seed
 *   SEED_EMAIL=dev@example.com SEED_PASSWORD=ChangeMe123! npm run seed
 *
 * Idempotent: existing demo user is skipped, remaining records are created.
 */
const path = require('path');
const fs = require('fs');
const { createDatabase, UserRepository, TenantRepository, ApiKeyRepository, WidgetConfigRepository, TopicResponseTemplateRepository } = require('@conversation-engine/saas-core');

const ENGINE_ROOT = path.join(__dirname, '..');
const DB_PATH = process.env.DATABASE_PATH || process.env.DB_PATH || path.join(ENGINE_ROOT, 'data', 'saas.db');
const DEMO_EMAIL = process.env.SEED_EMAIL || 'demo@burflow.ai';
const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'DemoPass!123';
const DEMO_COMPANY = process.env.SEED_COMPANY || 'Demo Company';

function main() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = createDatabase(DB_PATH);

  const userRepo = new UserRepository(db);
  const tenantRepo = new TenantRepository(db);
  const apiKeyRepo = new ApiKeyRepository(db);
  const widgetRepo = new WidgetConfigRepository(db);
  const topicRepo = new TopicResponseTemplateRepository(db);

  let user = userRepo.findByEmail(DEMO_EMAIL);
  if (!user) {
    user = userRepo.create({ email: DEMO_EMAIL, password: DEMO_PASSWORD, name: 'Demo User' });
  }

  let tenant = tenantRepo.findByOwner(user.id)[0];
  if (!tenant) {
    tenant = tenantRepo.create({ name: DEMO_COMPANY, ownerId: user.id });
  }

  const created = apiKeyRepo.create(tenant.id, 'Seed API key', 'end-user');
const widget = widgetRepo.upsert(tenant.id, {
    primaryColor: '#8A1538',
    companyName: DEMO_COMPANY,
    greeting: `👋 Hey there! I'm the ${DEMO_COMPANY} assistant. Ask me anything about pricing or products!`,
    theme: 'light',
    position: 'bottom-right',
    autoOpen: false,
    autoOpenDelay: 3,
    starterOptions: ['Show me pricing', 'How does it work?', 'Book a demo'],
  });
  topicRepo.upsert(tenant.id, 'pricing', 1, 'Our pricing starts at $29/mo on the Starter plan. Would you like me to walk through the plans?');

  console.log('✅ Seed complete');
  console.log('──────────────────────────────────────');
  console.log(`Database : ${DB_PATH}`);
  console.log(`Tenant   : ${tenant.name} (${tenant.slug}) [${tenant.id}]`);
  console.log(`Email    : ${DEMO_EMAIL}`);
  console.log(`Password : ${DEMO_PASSWORD}`);
  console.log(`API Key  : ${created.key}`);
  console.log(`Widget   : ${widget.theme} theme, primary color ${widget.primaryColor}, starter options seeded`);
  console.log('──────────────────────────────────────');

  db.close();
}

try {
  main();
} catch (err) {
  console.error('Seeding failed:', err);
  process.exit(1);
}