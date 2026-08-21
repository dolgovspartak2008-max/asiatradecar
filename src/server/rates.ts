import { parseCbrCurrencyRate } from "@/domain/currency";
import { hasDatabase, query } from "@/server/db";

const FALLBACK_KRW_TO_RUB = 0.059;
const FALLBACK_EUR_TO_RUB = 92;
const fallbackCalculatorRates = () => ({ krwToRub: FALLBACK_KRW_TO_RUB, eurToRub: FALLBACK_EUR_TO_RUB, date: null, isFallback: true });

export async function getKrwToRub() {
  if (!hasDatabase()) return { value: FALLBACK_KRW_TO_RUB, date: null, isFallback: true };
  const result = await query<{ rub_per_unit: string; rate_date: string }>("SELECT rub_per_unit, rate_date FROM exchange_rates WHERE code = 'KRW'");
  const row = result.rows[0];
  return row ? { value: Number(row.rub_per_unit), date: row.rate_date, isFallback: false } : { value: FALLBACK_KRW_TO_RUB, date: null, isFallback: true };
}

export async function getCalculatorRates() {
  if (!hasDatabase()) return fallbackCalculatorRates();
  const result = await query<{ code: string; rub_per_unit: string; rate_date: string }>("SELECT code, rub_per_unit, rate_date FROM exchange_rates WHERE code IN ('KRW', 'EUR')").catch(() => null);
  if (!result) return fallbackCalculatorRates();
  const krw = result.rows.find((row) => row.code === "KRW");
  const eur = result.rows.find((row) => row.code === "EUR");
  return {
    krwToRub: krw ? Number(krw.rub_per_unit) : FALLBACK_KRW_TO_RUB,
    eurToRub: eur ? Number(eur.rub_per_unit) : FALLBACK_EUR_TO_RUB,
    date: krw?.rate_date ?? eur?.rate_date ?? null,
    isFallback: !krw || !eur
  };
}

export async function syncCbrKrwRate() {
  const response = await fetch("https://www.cbr.ru/scripts/XML_daily.asp", { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`ЦБ РФ вернул ${response.status}`);
  const xml = await response.text();
  const rates = [parseCbrCurrencyRate(xml, "KRW"), parseCbrCurrencyRate(xml, "JPY"), parseCbrCurrencyRate(xml, "CNY"), parseCbrCurrencyRate(xml, "EUR")];
  for (const rate of rates) {
    await query(
      `INSERT INTO exchange_rates (code, rub_per_unit, rate_date, source, updated_at)
       VALUES ($1, $2, $3, 'CBR', now())
       ON CONFLICT (code) DO UPDATE SET rub_per_unit = EXCLUDED.rub_per_unit, rate_date = EXCLUDED.rate_date, updated_at = now()`,
      [rate.code, rate.rubPerUnit, rate.date]
    );
  }
  return rates;
}
