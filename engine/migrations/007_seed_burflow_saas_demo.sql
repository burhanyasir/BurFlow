-- 007_seed_burflow_saas_demo.sql
-- Seed the BurFlow SaaS demo tenant used by the landing page widget.
-- Uses a DO block to satisfy the owner_id NOT NULL FK constraint by picking
-- any existing user as owner. Skips silently if no users exist yet.

DO $$
DECLARE
  v_owner TEXT;
BEGIN
  -- Find any existing user to be the tenant owner
  SELECT id INTO v_owner FROM users LIMIT 1;

  IF v_owner IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenants WHERE id = 'burflow-saas') THEN
    INSERT INTO tenants (id, owner_id, name, slug, plan, settings, created_at, updated_at)
    VALUES ('burflow-saas', v_owner, 'BurFlow AI', 'burflow-saas', 'pro', '{}', NOW(), NOW());
  END IF;

  IF EXISTS (SELECT 1 FROM tenants WHERE id = 'burflow-saas') THEN
    INSERT INTO widget_configs (id, tenant_id, greeting, allowed_domains, theme, company_name, position, primary_color, created_at, updated_at)
    VALUES (
      'a0000000-0000-0000-0000-000000000001',
      'burflow-saas',
      'Hi! What brings you here today?',
      '["bur-flow.vercel.app","burflow.vercel.app","localhost","127.0.0.1"]',
      'light',
      'BurFlow AI',
      'right',
      '#006248',
      NOW(),
      NOW()
    )
    ON CONFLICT (tenant_id) DO UPDATE SET
      allowed_domains = EXCLUDED.allowed_domains,
      greeting = EXCLUDED.greeting,
      company_name = EXCLUDED.company_name,
      updated_at = NOW();
  END IF;
END $$;
