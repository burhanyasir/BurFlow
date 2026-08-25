-- 006: Add missing columns for cost tracking and idempotency
-- These were present in the SQLite auto-migrate but missing from the PG migration chain.

-- Usage tracking: cost_usd column
ALTER TABLE usage_records ADD COLUMN IF NOT EXISTS cost_usd NUMERIC DEFAULT 0;

-- Message idempotency: prevent duplicate messages from retries
ALTER TABLE messages ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Partial unique index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_idempotency
  ON messages(conversation_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
