import { hasDatabase, query } from "./db";
import { DEFAULT_COMMISSIONS_RUB } from "../domain/pricing";
import { normalizeCatalogRate } from "../domain/currency";

export type PricingSettings = {
  commissions: Record<"kr" | "jp" | "cn", number>;
  rates: Record<"KRW" | "JPY" | "CNY", number>;
};

const FALLBACK: PricingSettings = { commissions: { ...DEFAULT_COMMISSIONS_RUB }, rates: { KRW: 0.059, JPY: 0.62, CNY: 11.5 } };

export async function getPricingSettings(): Promise<PricingSettings> {
  if (!hasDatabase()) return FALLBACK;
  const [rates, commissions] = await Promise.all([
    query<{ code: string; rub_per_unit: string }>("SELECT code, rub_per_unit FROM exchange_rates WHERE code IN ('KRW','JPY','CNY')").catch(() => null),
    query<{ key: string; value: string }>("SELECT key,value FROM site_settings WHERE key IN ('commission_rub','commission_kr_rub','commission_jp_rub','commission_cn_rub')").catch(() => null)
  ]);
  const byCode = new Map(rates?.rows.map((row) => [row.code, Number(row.rub_per_unit)]) || []);
  const byKey = new Map(commissions?.rows.map((row) => [row.key, Number(row.value)]) || []);
  const legacyCommission = byKey.get("commission_rub");
  const commission = (country: "kr" | "jp" | "cn") => byKey.get(`commission_${country}_rub`) || (country === "jp" ? FALLBACK.commissions.jp : legacyCommission) || FALLBACK.commissions[country];
  return {
    commissions: { kr: commission("kr"), jp: commission("jp"), cn: commission("cn") },
    rates: {
      KRW: normalizeCatalogRate("KRW", byCode.get("KRW") || FALLBACK.rates.KRW),
      JPY: normalizeCatalogRate("JPY", byCode.get("JPY") || FALLBACK.rates.JPY),
      CNY: normalizeCatalogRate("CNY", byCode.get("CNY") || FALLBACK.rates.CNY)
    }
  };
}

export async function setCommissionRub(country: "kr" | "jp" | "cn", value: number, userId: number) {
  await query("INSERT INTO site_settings (key,value,updated_by,updated_at) VALUES ($1,$2,$3,now()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_by=EXCLUDED.updated_by, updated_at=now()", [`commission_${country}_rub`, value, userId]);
}

export async function setCatalogRate(code: "KRW" | "JPY" | "CNY", value: number) {
  await query("INSERT INTO exchange_rates (code,rub_per_unit,rate_date,source,updated_at) VALUES ($1,$2,current_date,'telegram',now()) ON CONFLICT (code) DO UPDATE SET rub_per_unit=EXCLUDED.rub_per_unit, rate_date=current_date, source='telegram', updated_at=now()", [code, normalizeCatalogRate(code, value)]);
}
