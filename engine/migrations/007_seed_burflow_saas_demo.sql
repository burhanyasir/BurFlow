-- 007_seed_burflow_saas_demo.sql
-- Seed the BurFlow SaaS demo tenant used by the landing page widget.
-- Idempotent: ON CONFLICT prevents duplicate inserts on re-run.

INSERT INTO tenants (id, name, slug, plan, settings, created_at, updated_at)
VALUES (
  'burflow-saas',
  'BurFlow AI',
  'burflow-saas',
  'pro',
  '{}',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO widget_configs (id, tenant_id, greeting, allowed_domains, theme, company_name, position, primary_color, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'burflow-saas',
  'Hi! What brings you here today?',
  '["bur-flow.vercel.app","burflow.vercel.app","localhost","127.0.0.1"]',
  'light',
  'BurFlow AI',
  'right',
  '#3B82F6',
  NOW(),
  NOW()
)
ON CONFLICT (tenant_id) DO UPDATE SET
  allowed_domains = EXCLUDED.allowed_domains,
  greeting = EXCLUDED.greeting,
  company_name = EXCLUDED.company_name,
  updated_at = NOW();
