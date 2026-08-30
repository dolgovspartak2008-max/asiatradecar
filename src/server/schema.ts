import { getPool, hasDatabase } from "./db";
import { telegramReviewSeeds } from "./telegram-reviews";

let schemaPromise: Promise<void> | undefined;

const SQL = `
CREATE TABLE IF NOT EXISTS exchange_rates (
  code text PRIMARY KEY, rub_per_unit numeric(18,8) NOT NULL, rate_date date NOT NULL,
  source text NOT NULL DEFAULT 'CBR', updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cars (
  id text PRIMARY KEY, slug text NOT NULL UNIQUE, source text NOT NULL DEFAULT 'trust-encar-feed', source_url text,
  status text NOT NULL DEFAULT 'active', country text NOT NULL DEFAULT 'kr', currency_code text NOT NULL DEFAULT 'KRW',
  make text NOT NULL, model text NOT NULL, trim text, year integer NOT NULL, mileage_km integer NOT NULL,
  engine_cc integer, power_hp integer, fuel text, transmission text, drive text, body_type text,
  exterior_color text, interior_color text, vin text, price_krw bigint NOT NULL, price_rub bigint,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb, details jsonb NOT NULL DEFAULT '{}'::jsonb,
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(make,'') || ' ' || coalesce(model,'') || ' ' || coalesce(trim,''))) STORED,
  first_seen_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS currency_code text NOT NULL DEFAULT 'KRW';
CREATE INDEX IF NOT EXISTS cars_active_country_idx ON cars (country,status,year DESC);
CREATE INDEX IF NOT EXISTS cars_price_idx ON cars (price_rub) WHERE status='active';
CREATE INDEX IF NOT EXISTS cars_search_idx ON cars USING gin (search_vector);
CREATE INDEX IF NOT EXISTS cars_make_model_idx ON cars (make,model);
CREATE INDEX IF NOT EXISTS cars_japan_current_year_idx ON cars (year DESC,updated_at DESC) WHERE country='jp' AND status='active' AND details->>'catalogSection' IN ('auctions','onePrice');
CREATE INDEX IF NOT EXISTS cars_japan_current_make_model_idx ON cars (make,model,year DESC) WHERE country='jp' AND status='active' AND details->>'catalogSection' IN ('auctions','onePrice');
CREATE TABLE IF NOT EXISTS leads (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text NOT NULL, phone text NOT NULL, city text NOT NULL,
  wishes text NOT NULL DEFAULT '', page_url text, car_name text, calculation_rub bigint,
  delivery_status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS consent_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, lead_id bigint REFERENCES leads(id) ON DELETE CASCADE,
  form_id text NOT NULL, policy_version text NOT NULL, consent_text text NOT NULL, ip_hash text,
  user_agent text, accepted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sync_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, source text NOT NULL, status text NOT NULL,
  received integer NOT NULL DEFAULT 0, error text, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
CREATE TABLE IF NOT EXISTS lead_rate_limits (
  key_hash text PRIMARY KEY, attempts integer NOT NULL DEFAULT 1, window_started_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY, value numeric(18,8) NOT NULL, updated_by bigint, updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO site_settings (key,value) VALUES ('commission_rub',100000) ON CONFLICT (key) DO NOTHING;
CREATE TABLE IF NOT EXISTS bot_admins (
  user_id bigint PRIMARY KEY, display_name text NOT NULL DEFAULT '', is_owner boolean NOT NULL DEFAULT false,
  added_by bigint, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bot_sessions (
  user_id bigint PRIMARY KEY, action text NOT NULL, state jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bot_sessions ADD COLUMN IF NOT EXISTS state jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, title text NOT NULL, text text NOT NULL,
  telegram_file_id text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden')),
  created_by bigint, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_published_idx ON reviews (created_at DESC) WHERE status='published';
`;

const reviewSeedValues = telegramReviewSeeds.flatMap((review) => [review.title, review.text, review.telegramFileId]);
const reviewSeedSql = `INSERT INTO reviews (title,text,telegram_file_id) VALUES ${telegramReviewSeeds.map((_, index) => `($${index * 3 + 1},$${index * 3 + 2},$${index * 3 + 3})`).join(",")} ON CONFLICT (telegram_file_id) DO NOTHING`;

export async function ensureDatabaseSchema() {
  if (!hasDatabase()) return;
  schemaPromise ??= (async () => {
    const pool = getPool();
    await pool.query(SQL);
    await pool.query(reviewSeedSql, reviewSeedValues);
  })().catch((error) => { schemaPromise = undefined; throw error; });
  await schemaPromise;
}
