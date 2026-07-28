// Seed script for development/test tenant data
// Run: npx ts-node packages/pipeline-orchestrator/src/seed.ts

import { SqliteTenantRegistry } from '@conversation-engine/tenant-registry';
import { SqliteSessionStore } from '@conversation-engine/session-store';
import { FileConfigStore, defaultTenantConfig } from '@conversation-engine/config-store';
import { SqliteDedupStore } from '@conversation-engine/dedup-store';
import { join } from 'path';

const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', '..', '..', 'data');

async function seed(): Promise<void> {
  const tenantRegistry = new SqliteTenantRegistry(join(DATA_DIR, 'tenant-registry.db'));
  const sessionStore = new SqliteSessionStore(join(DATA_DIR, 'sessions.db'));
  const configStore = new FileConfigStore(join(DATA_DIR, 'configs'));
  const dedupStore = new SqliteDedupStore(join(DATA_DIR, 'dedup.db'));

  // Demo tenant
  const demoApiKey = process.env.DEMO_API_KEY;
  if (!demoApiKey) { console.error('DEMO_API_KEY environment variable is required'); process.exit(1); }
  let tenant = await tenantRegistry.lookupTenant('demo-tenant');
  if (!tenant) {
    tenantRegistry.seedTenant('demo-tenant', 'active');
    tenantRegistry.seedApiKey('demo-tenant', demoApiKey, 'demo');
  }

  let config = defaultTenantConfig('demo-tenant');
  config.llm.systemPrompt = 'You are a helpful customer support assistant.';
  config.llm.model = 'gpt-4';
  config.llm.temperature = 0.7;
  config.llm.maxTokens = 1024;
  config.safety.contentFilterThreshold = 'moderate';
  config.safety.piiRedactionEnabled = true;
  config.safety.piiRedactionMode = 'mask';
  config.rateLimits.messagesPerMinute = 60;
  config.rateLimits.messagesPerHour = 1000;
  config.session.ttlMinutes = 1440;
  config.session.gracePeriodDays = 7;
  config.fallbackResponse = 'I am currently unavailable. Please try again later.';
  config.supportedLanguages = ['en'];
  config.featureFlags.qualityScoringEnabled = false;
  config.featureFlags.analyticsEnabled = true;
  config.configVersion = 1;
  await configStore.saveVersion('demo-tenant', config, 'system', 'initial config');

  // Premium tenant
  const premiumApiKey = process.env.PREMIUM_API_KEY;
  if (premiumApiKey) {
    tenant = await tenantRegistry.lookupTenant('premium-tenant');
    if (!tenant) {
      tenantRegistry.seedTenant('premium-tenant', 'active');
      tenantRegistry.seedApiKey('premium-tenant', premiumApiKey, 'premium');
    }
  }

  config = defaultTenantConfig('premium-tenant');
  config.llm.systemPrompt = 'You are a premium support agent.';
  config.llm.model = 'gpt-4';
  config.llm.maxTokens = 4096;
  config.safety.contentFilterThreshold = 'strict';
  config.rateLimits.messagesPerMinute = 120;
  config.rateLimits.messagesPerHour = 2000;
  config.session.ttlMinutes = 4320;
  config.fallbackResponse = 'Our premium team will get back to you shortly.';
  config.configVersion = 1;
  await configStore.saveVersion('premium-tenant', config, 'system', 'premium config');

  // Deactivated tenant (for testing)
  const deactivatedApiKey = process.env.DEACTIVATED_API_KEY;
  if (deactivatedApiKey) {
    tenant = await tenantRegistry.lookupTenant('deactivated-tenant');
    if (!tenant) {
      tenantRegistry.seedTenant('deactivated-tenant', 'deactivated');
      tenantRegistry.seedApiKey('deactivated-tenant', deactivatedApiKey, 'test');
    }
  }

  // Create a sample session for demo-tenant
  const session = await sessionStore.createSession('demo-tenant', 1);
  console.log('Seeded demo session:', session.sessionId);

  sessionStore.close();
  dedupStore.close();
  console.log('Seed complete.');
}

seed().catch(console.error);
