-- Migration 003: Subscription requests for manual billing
-- When a user wants to upgrade, they submit a request.
-- The owner reviews and activates from the owner panel.

CREATE TABLE IF NOT EXISTS subscription_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  requested_plan TEXT NOT NULL,
  billing_period TEXT DEFAULT 'monthly',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  owner_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscription_requests_status ON subscription_requests(status);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_tenant ON subscription_requests(tenant_id);
