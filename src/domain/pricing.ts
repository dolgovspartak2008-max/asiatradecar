type CostBreakdownLine = { label: string; value: string };

export const DEFAULT_COMMISSION_RUB = 100_000;
export const KOREA_BROKER_RUB = 110_000;
export const JAPAN_EXPENSES_JPY = 250_000;

const COUNTRY_FEES = {
  jp: { commissionRub: 50_000, brokerRub: 60_000 },
  cn: { commissionRub: 100_000, brokerRub: 80_000 }
} as const;

const formatRub = (value: number) => `${Math.round(value).toLocaleString("ru-RU").replace(/\u00a0/g, " ")} ₽`;

export function normalizeCostBreakdown(lines: CostBreakdownLine[], commissionRub = DEFAULT_COMMISSION_RUB, brokerRub?: number) {
  const result: CostBreakdownLine[] = [];
  let commissionAdded = false;
  let brokerAdded = false;
  for (const line of lines) {
    if (/фиксированн.*сбор|стоянк.*логист/i.test(line.label)) continue;
    if (/комисси/i.test(line.label)) {
      if (!commissionAdded) result.push({ label: "Комиссия компании", value: formatRub(commissionRub) });
      commissionAdded = true;
      continue;
    }
    if (/брокер/i.test(line.label) && brokerRub !== undefined) {
      if (!brokerAdded) result.push({ label: "Таможенный брокер", value: formatRub(brokerRub) });
      brokerAdded = true;
      continue;
    }
    const rubles = line.value.includes("₩") ? line.value.match(/([\d\s\u00a0]+\s*₽)/)?.[1] : null;
    result.push(rubles ? { ...line, value: rubles.replace(/\u00a0/g, " ").trim() } : line);
  }
  if (!commissionAdded) result.unshift({ label: "Комиссия компании", value: formatRub(commissionRub) });
  if (brokerRub !== undefined && !brokerAdded) result.push({ label: "Таможенный брокер", value: formatRub(brokerRub) });
  return result;
}

export function applyCatalogPricing(sourcePrice: number, rubPerUnit: number, commissionRub = DEFAULT_COMMISSION_RUB) {
  return Math.round(sourcePrice * rubPerUnit + commissionRub);
}

export function buildExternalPricing(country: "jp" | "cn", sourcePrice: number, rubPerUnit: number, customsDutyRub = 0) {
  const fees = COUNTRY_FEES[country];
  const sourceRub = Math.round(sourcePrice * rubPerUnit);
  const japanExpensesRub = country === "jp" ? Math.round(JAPAN_EXPENSES_JPY * rubPerUnit) : 0;
  const countryName = country === "jp" ? "Японии" : "Китае";
  const costBreakdown: CostBreakdownLine[] = [
    { label: `Стоимость автомобиля в ${countryName}`, value: `${sourcePrice.toLocaleString("ru-RU").replace(/\u00a0/g, " ")} ¥ (${formatRub(sourceRub)})` }
  ];
  if (country === "jp") costBreakdown.push({ label: "Расходы по Японии", value: `${JAPAN_EXPENSES_JPY.toLocaleString("ru-RU").replace(/\u00a0/g, " ")} ¥ (${formatRub(japanExpensesRub)})` });
  if (customsDutyRub > 0) costBreakdown.push({ label: "Таможенная пошлина (предварительно)", value: formatRub(customsDutyRub) });
  costBreakdown.push(
    { label: "Комиссия компании", value: formatRub(fees.commissionRub) },
    { label: "Таможенный брокер", value: formatRub(fees.brokerRub) }
  );
  return { priceRub: sourceRub + japanExpensesRub + customsDutyRub + fees.commissionRub + fees.brokerRub, costBreakdown };
}
