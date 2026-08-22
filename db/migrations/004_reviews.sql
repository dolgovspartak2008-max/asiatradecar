ALTER TABLE bot_sessions ADD COLUMN IF NOT EXISTS state jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  text text NOT NULL,
  telegram_file_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  created_by bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_published_idx ON reviews (created_at DESC) WHERE status = 'published';
