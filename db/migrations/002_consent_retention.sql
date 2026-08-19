ALTER TABLE consent_log DROP CONSTRAINT IF EXISTS consent_log_lead_id_fkey;
ALTER TABLE consent_log ADD CONSTRAINT consent_log_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS lead_rate_limits (
  key_hash text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 1,
  window_started_at timestamptz NOT NULL DEFAULT now()
);
