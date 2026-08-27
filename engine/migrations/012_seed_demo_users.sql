-- 012_seed_demo_users.sql
-- Seed demo users with valid bcrypt-hashed passwords for Render/PostgreSQL.
-- Previously, demo accounts were only created via SQLite seed scripts or
-- ensureDemoTenant() which used a non-hashing placeholder string, causing
-- all login attempts to fail with 401.
--
-- Uses ON CONFLICT (email) to handle the case where users already exist
-- with different IDs (e.g. created by ensureDemoTenant at runtime).

DO $seed$
DECLARE
  v_ecom_id TEXT;
  v_dentist_id TEXT;
  v_owner_id TEXT;
  v_now TEXT := NOW()::TEXT;
BEGIN
  -- Find or create ecom demo user
  SELECT id INTO v_ecom_id FROM users WHERE email = 'ecom@burflow-demo.com';
  IF v_ecom_id IS NULL THEN
    v_ecom_id := 'user-ecom-demo';
    INSERT INTO users (id, email, password_hash, name, email_verified, created_at, updated_at)
    VALUES (v_ecom_id, 'ecom@burflow-demo.com', '$2a$12$s3tAbmUDd9kEiRsUJhkthODr.sYmix9JuKTn4.0EmgMc9keqUBI8y', 'E-Commerce Demo', 1, v_now, v_now);
  ELSE
    UPDATE users SET password_hash = '$2a$12$s3tAbmUDd9kEiRsUJhkthODr.sYmix9JuKTn4.0EmgMc9keqUBI8y', email_verified = 1, updated_at = v_now WHERE id = v_ecom_id;
  END IF;

  -- Find or create dentist demo user
  SELECT id INTO v_dentist_id FROM users WHERE email = 'dentist@burflow-demo.com';
  IF v_dentist_id IS NULL THEN
    v_dentist_id := 'user-dentist-demo';
    INSERT INTO users (id, email, password_hash, name, email_verified, created_at, updated_at)
    VALUES (v_dentist_id, 'dentist@burflow-demo.com', '$2a$12$s3tAbmUDd9kEiRsUJhkthODr.sYmix9JuKTn4.0EmgMc9keqUBI8y', 'Dental Practice Demo', 1, v_now, v_now);
  ELSE
    UPDATE users SET password_hash = '$2a$12$s3tAbmUDd9kEiRsUJhkthODr.sYmix9JuKTn4.0EmgMc9keqUBI8y', email_verified = 1, updated_at = v_now WHERE id = v_dentist_id;
  END IF;

  -- Find or create owner user
  SELECT id INTO v_owner_id FROM users WHERE email = 'burhanyasir82@gmail.com';
  IF v_owner_id IS NULL THEN
    v_owner_id := 'user-owner-demo';
    INSERT INTO users (id, email, password_hash, name, email_verified, created_at, updated_at)
    VALUES (v_owner_id, 'burhanyasir82@gmail.com', '$2a$12$Y8xT.rMxgmOX9jJbH5YRUetueAxIBkwCkQIPHytw6q528dbAbYljC', 'Burhan Yasir', 1, v_now, v_now);
  ELSE
    UPDATE users SET password_hash = '$2a$12$Y8xT.rMxgmOX9jJbH5YRUetueAxIBkwCkQIPHytw6q528dbAbYljC', email_verified = 1, updated_at = v_now WHERE id = v_owner_id;
  END IF;

  -- Create demo tenants linked to their users (skip if already exist)
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
END $seed$;
