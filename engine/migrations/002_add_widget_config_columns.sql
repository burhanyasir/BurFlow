-- Migration 002: Add missing columns to widget_configs
-- The initial schema was applied before custom_webhook_url and alert_emails
-- existed, so we add them here. IF NOT EXISTS ensures idempotency.

ALTER TABLE widget_configs ADD COLUMN IF NOT EXISTS custom_webhook_url TEXT;
ALTER TABLE widget_configs ADD COLUMN IF NOT EXISTS alert_emails TEXT;
