type CostBreakdownLine = { label: string; value: string };

export const DEFAULT_COMMISSION_RUB = 100_000;
export const DEFAULT_COMMISSIONS_RUB = { kr: DEFAULT_COMMISSION_RUB, jp: 50_000, cn: DEFAULT_COMMISSION_RUB } as const;
export const KOREA_BROKER_RUB = 110_000;
export const JAPAN_EXPENSES_JPY = 260_000;
export const CHINA_EXPENSES_RUB = 113_000;

export type CustomsCostsRub = {
  dutyRub?: number;
  customsFeeRub?: number;
  recyclingFeeRub?: number;
  exciseRub?: number;
  vatRub?: number;
};

const COUNTRY_FEES = {
  jp: { brokerRub: 60_000 },
  cn: { brokerRub: 80_000 }
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

export function buildExternalPricing(country: "jp" | "cn", sourcePrice: number, rubPerUnit: number, customs: CustomsCostsRub | number = {}, commissionRub: number = DEFAULT_COMMISSIONS_RUB[country]) {
  const fees = COUNTRY_FEES[country];
  const costs = typeof customs === "number" ? { dutyRub: customs } : customs;
  const dutyRub = costs.dutyRub || 0;
  const customsFeeRub = costs.customsFeeRub || 0;
  const recyclingFeeRub = costs.recyclingFeeRub || 0;
  const exciseRub = costs.exciseRub || 0;
  const vatRub = costs.vatRub || 0;
  const sourceRub = Math.round(sourcePrice * rubPerUnit);
  const japanExpensesRub = country === "jp" ? Math.round(JAPAN_EXPENSES_JPY * rubPerUnit) : 0;
  const countryExpensesRub = country === "jp" ? japanExpensesRub : CHINA_EXPENSES_RUB;
  const countryName = country === "jp" ? "Японии" : "Китае";
  const costBreakdown: CostBreakdownLine[] = [
    { label: "Комиссия компании", value: formatRub(commissionRub) },
    { label: `Стоимость автомобиля в ${countryName}`, value: `${sourcePrice.toLocaleString("ru-RU").replace(/\u00a0/g, " ")} ¥ (${formatRub(sourceRub)})` },
    { label: `Расходы по ${country === "jp" ? "Японии" : "Китаю"} и фрахт во Владивосток`, value: country === "jp" ? `${JAPAN_EXPENSES_JPY.toLocaleString("ru-RU").replace(/\u00a0/g, " ")} ¥ (${formatRub(japanExpensesRub)})` : formatRub(CHINA_EXPENSES_RUB) },
    { label: "Таможенная пошлина", value: formatRub(dutyRub) },
    { label: "Таможенный сбор", value: formatRub(customsFeeRub) },
    { label: "Утилизационный сбор", value: formatRub(recyclingFeeRub) },
    { label: "Акциз", value: formatRub(exciseRub) },
    { label: "НДС", value: formatRub(vatRub) },
    { label: "Таможенный брокер", value: formatRub(fees.brokerRub) },
    { label: "Логистика (автовоз)", value: "Рассчитывается отдельно в зависимости от города доставки" }
  ];
  const customsTotalRub = dutyRub + customsFeeRub + recyclingFeeRub + exciseRub + vatRub;
  return { priceRub: sourceRub + countryExpensesRub + customsTotalRub + commissionRub + fees.brokerRub, costBreakdown };
}
