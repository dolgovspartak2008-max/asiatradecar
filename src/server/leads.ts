import { createHash } from "node:crypto";
import { query } from "@/server/db";
import { retentionDays } from "@/config/site";

export async function consumeLeadRateLimit(phone: string) {
  const key = createHash("sha256").update(phone.replace(/\D/g, "")).digest("hex");
  const result = await query<{ attempts: number }>(
    `INSERT INTO lead_rate_limits (key_hash, attempts, window_started_at) VALUES ($1, 1, now())
     ON CONFLICT (key_hash) DO UPDATE SET
       attempts = CASE WHEN lead_rate_limits.window_started_at < now() - interval '10 minutes' THEN 1 ELSE lead_rate_limits.attempts + 1 END,
       window_started_at = CASE WHEN lead_rate_limits.window_started_at < now() - interval '10 minutes' THEN now() ELSE lead_rate_limits.window_started_at END
     RETURNING attempts`, [key]
  );
  return result.rows[0].attempts <= 5;
}

export async function purgeExpiredLeadData() {
  if (!Number.isInteger(retentionDays) || retentionDays <= 0) return { deleted: 0, skipped: true };
  const deleted = await query<{ id: string }>("DELETE FROM leads WHERE created_at < now() - ($1::int * interval '1 day') RETURNING id", [retentionDays]);
  await query("DELETE FROM lead_rate_limits WHERE window_started_at < now() - interval '1 day'");
  return { deleted: deleted.rowCount || 0, skipped: false };
}
