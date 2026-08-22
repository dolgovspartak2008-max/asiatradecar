type CustomsInput = {
  priceJpy: number;
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

export async function getDromCustomsDutyRub(input: CustomsInput, currentYear = new Date().getFullYear()) {
  if (input.priceJpy <= 0 || input.year < 1900 || input.engineCc <= 0) return null;
  const url = new URL("https://www.drom.ru/api/world/calculate/");
  const electric = /элект|electric|ev/i.test(input.fuel || "");
  const params = {
    price: String(Math.round(input.priceJpy)),
    currency: "YEN",
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
  const payload = await response.json() as { result?: { details?: { CUSTOMS_DUTY?: { major?: { value?: unknown; currency?: unknown } } } } };
  const duty = payload.result?.details?.CUSTOMS_DUTY?.major;
  const value = Number(duty?.value);
  return duty?.currency === "RUB" && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}
