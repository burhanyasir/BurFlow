-- 012_seed_demo_users.sql
-- Seed demo users with valid bcrypt-hashed passwords for Render/PostgreSQL.
-- Previously, demo accounts were only created via SQLite seed scripts or
-- ensureDemoTenant() which used a non-hashing placeholder string, causing
-- all login attempts to fail with 401.

DO $$
DECLARE
  v_ecom_id TEXT := 'user-ecom-demo';
  v_dentist_id TEXT := 'user-dentist-demo';
  v_owner_id TEXT := 'user-owner-demo';
  v_ecom_hash TEXT := '$2a$12$s3tAbmUDd9kEiRsUJhkthODr.sYmix9JuKTn4.0EmgMc9keqUBI8y';
  v_dentist_hash TEXT := '$2a$12$s3tAbmUDd9kEiRsUJhkthODr.sYmix9JuKTn4.0EmgMc9keqUBI8y';
  v_owner_hash TEXT := '$2a$12$Y8xT.rMxgmOX9jJbH5YRUetueAxIBkwCkQIPHytw6q528dbAbYljC';
  v_now TEXT := NOW()::TEXT;
BEGIN
  -- Insert demo users (skip if already exist)
  INSERT INTO users (id, email, password_hash, name, email_verified, created_at, updated_at)
  VALUES
    (v_ecom_id, 'ecom@burflow-demo.com', v_ecom_hash, 'E-Commerce Demo', 1, v_now, v_now),
    (v_dentist_id, 'dentist@burflow-demo.com', v_dentist_hash, 'Dental Practice Demo', 1, v_now, v_now),
    (v_owner_id, 'burhanyasir82@gmail.com', v_owner_hash, 'Burhan Yasir', 1, v_now, v_now)
  ON CONFLICT (id) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    email_verified = 1,
    updated_at = v_now;

  -- Create demo tenants linked to their users
  INSERT INTO tenants (id, name, slug, owner_id, plan, subscription_status, settings, created_at, updated_at)
  VALUES
    ('tenant-ecom-demo', 'E-Commerce Store', 'ecom-store-demo', v_ecom_id, 'starter', 'active', '{}', v_now, v_now),
    ('tenant-dentist-demo', 'Bright Smile Dental', 'bright-smile-dental-84c624', v_dentist_id, 'starter', 'active', '{}', v_now, v_now)
  ON CONFLICT (id) DO NOTHING;

  -- Fix burflow-saas tenant: update owner to the real owner user if it exists
  -- with the placeholder user, or create it with the correct owner
  IF EXISTS (SELECT 1 FROM tenants WHERE id = 'burflow-saas') THEN
    UPDATE tenants SET owner_id = v_owner_id, updated_at = v_now
    WHERE id = 'burflow-saas' AND owner_id = 'user-burflow-demo';
  ELSE
    INSERT INTO tenants (id, name, slug, owner_id, plan, subscription_status, settings, created_at, updated_at)
    VALUES ('burflow-saas', 'BurFlow AI', 'burflow-saas', v_owner_id, 'professional', 'active', '{}', v_now, v_now)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Also clean up the placeholder user if it exists and isn't the owner of anything else
  DELETE FROM users WHERE id = 'user-burflow-demo'
    AND NOT EXISTS (SELECT 1 FROM tenants WHERE owner_id = 'user-burflow-demo');
END $$;
