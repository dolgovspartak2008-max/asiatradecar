CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS exchange_rates (
  code text PRIMARY KEY,
  rub_per_unit numeric(18, 8) NOT NULL,
  rate_date date NOT NULL,
  source text NOT NULL DEFAULT 'CBR',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cars (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'trust-encar-feed',
  source_url text,
  status text NOT NULL DEFAULT 'active',
  country text NOT NULL DEFAULT 'kr',
  make text NOT NULL,
  model text NOT NULL,
  trim text,
  year integer NOT NULL,
  mileage_km integer NOT NULL,
  engine_cc integer,
  power_hp integer,
  fuel text,
  transmission text,
  drive text,
  body_type text,
  exterior_color text,
  interior_color text,
  vin text,
  price_krw bigint NOT NULL,
  price_rub bigint,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(make, '') || ' ' || coalesce(model, '') || ' ' || coalesce(trim, ''))
  ) STORED,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cars_active_country_idx ON cars (country, status, year DESC);
CREATE INDEX IF NOT EXISTS cars_price_idx ON cars (price_rub) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS cars_search_idx ON cars USING gin (search_vector);
CREATE INDEX IF NOT EXISTS cars_make_model_idx ON cars (make, model);

CREATE TABLE IF NOT EXISTS leads (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  wishes text NOT NULL DEFAULT '',
  page_url text,
  car_name text,
  calculation_rub bigint,
  delivery_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consent_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id bigint REFERENCES leads(id) ON DELETE CASCADE,
  form_id text NOT NULL,
  policy_version text NOT NULL,
  consent_text text NOT NULL,
  ip_hash text,
  user_agent text,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source text NOT NULL,
  status text NOT NULL,
  received integer NOT NULL DEFAULT 0,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS lead_rate_limits (
  key_hash text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 1,
  window_started_at timestamptz NOT NULL DEFAULT now()
);
