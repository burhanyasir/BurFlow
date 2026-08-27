-- 011: Persistent job queue for background knowledge-base indexing.
-- Replaces the in-memory fire-and-forget crawl pattern with a durable queue
-- that survives process restarts (critical for Render free-tier dyno cycling).

CREATE TABLE IF NOT EXISTS kb_jobs (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_type        TEXT NOT NULL DEFAULT 'crawl',          -- future: 'reindex', 'delete', etc.
  status          TEXT NOT NULL DEFAULT 'pending',        -- pending | running | completed | failed
  website_url     TEXT,                                   -- root URL to crawl
  max_depth       INTEGER NOT NULL DEFAULT 2,
  max_pages       INTEGER NOT NULL DEFAULT 20,
  payload         TEXT DEFAULT '{}',                      -- JSON metadata (options, overrides)
  result          TEXT,                                   -- JSON result summary on completion
  error_message   TEXT,                                   -- human-readable error on failure
  retry_count     INTEGER NOT NULL DEFAULT 0,
  max_retries     INTEGER NOT NULL DEFAULT 3,
  next_retry_at   TEXT,                                   -- ISO timestamp for exponential backoff
  started_at      TEXT,
  completed_at    TEXT,
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kb_jobs_status ON kb_jobs(status);
CREATE INDEX IF NOT EXISTS idx_kb_jobs_tenant ON kb_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kb_jobs_pending ON kb_jobs(status, next_retry_at);
