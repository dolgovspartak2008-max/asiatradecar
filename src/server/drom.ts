import type { CustomsCostsRub } from "../domain/pricing";

type CustomsInput = {
  sourcePrice: number;
  currency: "YEN" | "CNY";
  year: number;
  engineCc: number;
  powerHp?: number | null;
  fuel?: string | null;
};

export function vehicleAgeGroup(year: number, currentYear = new Date().getFullYear()) {
  const age = currentYear - year;
  if (age < 3) return "UNDER_3";
  if (age <= 5) return "FROM_3_TO_5";
  return "OVER_5";
}

function rubValue(details: Record<string, { major?: { value?: unknown; currency?: unknown } } | undefined>, key: string) {
  const major = details[key]?.major;
  const value = Number(major?.value);
  return major?.currency === "RUB" && Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

export async function getDromCustomsCostsRub(input: CustomsInput, currentYear = new Date().getFullYear()): Promise<CustomsCostsRub | null> {
  if (input.sourcePrice <= 0 || input.year < 1900 || input.engineCc <= 0) return null;
  const url = new URL("https://www.drom.ru/api/world/calculate/");
  const electric = /элект|electric|ev/i.test(input.fuel || "");
  const params = {
    price: String(Math.round(input.sourcePrice)),
    currency: input.currency,
    vehicleAge: vehicleAgeGroup(input.year, currentYear),
    engineType: electric ? "ELECTRIC_MOTOR" : "DIESEL_OR_GASOLINE",
    engineVolumeInCubicCentimeters: String(Math.round(input.engineCc)),
    engineHorsePower: String(Math.max(1, Math.round(input.powerHp || 1))),
    importPurpose: "USAGE"
  };
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    next: { revalidate: 86_400 },
    signal: AbortSignal.timeout(10_000),
    headers: { Accept: "application/json", Referer: "https://www.drom.ru/world/calculator/" }
  });
  if (!response.ok) throw new Error(`Drom вернул ${response.status}`);
  const payload = await response.json() as { result?: { details?: Record<string, { major?: { value?: unknown; currency?: unknown } } | undefined> } };
  const details = payload.result?.details || {};
  const dutyRub = rubValue(details, "CUSTOMS_DUTY");
  const customsFeeRub = rubValue(details, "CUSTOMS_FEE");
  const recyclingFeeRub = rubValue(details, "RECYCLING_FEE");
  if (dutyRub === null || customsFeeRub === null || recyclingFeeRub === null) return null;
  return {
    dutyRub,
    customsFeeRub,
    recyclingFeeRub,
    exciseRub: rubValue(details, "EXCISE_TAX") || 0,
    vatRub: rubValue(details, "VAT") || 0
  };
}
