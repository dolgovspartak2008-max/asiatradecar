ALTER TABLE cars ADD COLUMN IF NOT EXISTS currency_code text NOT NULL DEFAULT 'KRW';

CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value numeric(18, 8) NOT NULL,
  updated_by bigint,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO site_settings (key, value) VALUES ('commission_rub', 100000)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS bot_admins (
  user_id bigint PRIMARY KEY,
  display_name text NOT NULL DEFAULT '',
  is_owner boolean NOT NULL DEFAULT false,
  added_by bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bot_sessions (
  user_id bigint PRIMARY KEY,
  action text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
