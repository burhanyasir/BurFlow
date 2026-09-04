-- 015: signup events table + widget theme detection columns

CREATE TABLE IF NOT EXISTS signup_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT NOT NULL,
  name TEXT,
  company_name TEXT,
  website_url TEXT,
  plan TEXT DEFAULT 'free',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_signup_events_email ON signup_events(email);
CREATE INDEX IF NOT EXISTS idx_signup_events_created ON signup_events(created_at);

ALTER TABLE widget_configs ADD COLUMN IF NOT EXISTS detected_primary_color TEXT;
ALTER TABLE widget_configs ADD COLUMN IF NOT EXISTS detected_header_bg TEXT;
ALTER TABLE widget_configs ADD COLUMN IF NOT EXISTS custom_primary_color TEXT;
ALTER TABLE widget_configs ADD COLUMN IF NOT EXISTS custom_header_bg TEXT;
ALTER TABLE widget_configs ADD COLUMN IF NOT EXISTS auto_detect_theme INTEGER DEFAULT 1;
