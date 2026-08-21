import { hasDatabase, query } from "./db";
import { DEFAULT_COMMISSION_RUB } from "../domain/pricing";

export type PricingSettings = {
  commissionRub: number;
  rates: Record<"KRW" | "JPY" | "CNY", number>;
};

const FALLBACK: PricingSettings = { commissionRub: DEFAULT_COMMISSION_RUB, rates: { KRW: 0.059, JPY: 0.62, CNY: 11.5 } };

export async function getPricingSettings(): Promise<PricingSettings> {
  if (!hasDatabase()) return FALLBACK;
  const [settings, rates] = await Promise.all([
    query<{ value: string }>("SELECT value FROM site_settings WHERE key='commission_rub'").catch(() => null),
    query<{ code: string; rub_per_unit: string }>("SELECT code, rub_per_unit FROM exchange_rates WHERE code IN ('KRW','JPY','CNY')").catch(() => null)
  ]);
  const byCode = new Map(rates?.rows.map((row) => [row.code, Number(row.rub_per_unit)]) || []);
  return {
    commissionRub: Number(settings?.rows[0]?.value) || FALLBACK.commissionRub,
    rates: { KRW: byCode.get("KRW") || FALLBACK.rates.KRW, JPY: byCode.get("JPY") || FALLBACK.rates.JPY, CNY: byCode.get("CNY") || FALLBACK.rates.CNY }
  };
}

export async function setCommissionRub(value: number, userId: number) {
  await query("INSERT INTO site_settings (key,value,updated_by,updated_at) VALUES ('commission_rub',$1,$2,now()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_by=EXCLUDED.updated_by, updated_at=now()", [value, userId]);
}

export async function setCatalogRate(code: "KRW" | "JPY" | "CNY", value: number) {
  await query("INSERT INTO exchange_rates (code,rub_per_unit,rate_date,source,updated_at) VALUES ($1,$2,current_date,'telegram',now()) ON CONFLICT (code) DO UPDATE SET rub_per_unit=EXCLUDED.rub_per_unit, rate_date=current_date, source='telegram', updated_at=now()", [code, value]);
}
