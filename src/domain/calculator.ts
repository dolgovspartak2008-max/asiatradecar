export type Fuel = "petrol" | "diesel" | "hybrid" | "electric";

type DutyInput = {
  ageYears: number;
  customsValueEur: number;
  engineCc: number;
  eurToRub: number;
};

type CalculationInput = {
  priceKrw: number;
  krwToRub: number;
  eurToRub: number;
  ageYears: number;
  engineCc: number;
  powerHp: number;
  fuel: Fuel;
  agentFeeRub: number;
  koreaCostsRub: number;
  freightToVladivostokRub: number;
  cityLogisticsRub: number;
  recyclingFeeOverrideRub?: number;
};

const UNDER_THREE = [
  [8_500, 0.54, 2.5],
  [16_700, 0.48, 3.5],
  [42_300, 0.48, 5.5],
  [84_500, 0.48, 7.5],
  [169_000, 0.48, 15],
  [Number.POSITIVE_INFINITY, 0.48, 20]
] as const;

const VOLUME_RATES_3_TO_5 = [
  [1_000, 1.5], [1_500, 1.7], [1_800, 2.5], [2_300, 2.7], [3_000, 3], [Number.POSITIVE_INFINITY, 3.6]
] as const;

const VOLUME_RATES_OVER_5 = [
  [1_000, 3], [1_500, 3.2], [1_800, 3.5], [2_300, 4.8], [3_000, 5], [Number.POSITIVE_INFINITY, 5.7]
] as const;

export function customsDutyRub({ ageYears, customsValueEur, engineCc, eurToRub }: DutyInput): number {
  if (ageYears <= 3) {
    const [, percent, minimumPerCc] = UNDER_THREE.find(([limit]) => customsValueEur <= limit) ?? UNDER_THREE.at(-1)!;
    return Math.round(Math.max(customsValueEur * percent, engineCc * minimumPerCc) * eurToRub);
  }

  const rates = ageYears <= 5 ? VOLUME_RATES_3_TO_5 : VOLUME_RATES_OVER_5;
  const [, euroPerCc] = rates.find(([limit]) => engineCc <= limit) ?? rates.at(-1)!;
  return Math.round(engineCc * euroPerCc * eurToRub);
}

export function customsClearanceFeeRub(customsValueRub: number): number {
  if (customsValueRub <= 200_000) return 1_067;
  if (customsValueRub <= 450_000) return 2_134;
  if (customsValueRub <= 1_200_000) return 4_269;
  if (customsValueRub <= 2_700_000) return 11_746;
  if (customsValueRub <= 4_200_000) return 16_524;
  if (customsValueRub <= 5_500_000) return 21_344;
  if (customsValueRub <= 7_000_000) return 27_540;
  return 30_000;
}

export function recyclingFeeRub(input: Pick<CalculationInput, "ageYears" | "engineCc" | "powerHp" | "fuel" | "recyclingFeeOverrideRub">): number {
  if (input.recyclingFeeOverrideRub !== undefined) return input.recyclingFeeOverrideRub;
  if (input.fuel === "electric" || input.powerHp > 160 || input.engineCc > 3_000) {
    throw new Error("Для этой мощности требуется актуальный коэффициент утильсбора");
  }
  return input.ageYears <= 3 ? 3_400 : 5_200;
}

export function calculateImportCost(input: CalculationInput) {
  const carPriceRub = Math.round(input.priceKrw * input.krwToRub);
  const customsValueEur = carPriceRub / input.eurToRub;
  const duty = customsDutyRub({ ...input, customsValueEur });
  const clearance = customsClearanceFeeRub(carPriceRub);
  const recycling = recyclingFeeRub(input);
  const lines = {
    carPriceRub,
    agentFeeRub: input.agentFeeRub,
    koreaCostsRub: input.koreaCostsRub,
    freightToVladivostokRub: input.freightToVladivostokRub,
    customsDutyRub: duty,
    customsClearanceFeeRub: clearance,
    recyclingFeeRub: recycling,
    exciseRub: 0,
    vatRub: 0,
    cityLogisticsRub: input.cityLogisticsRub
  };

  return {
    ...lines,
    lines,
    totalRub: Object.values(lines).reduce((sum, value) => sum + value, 0),
    isApproximate: true,
    note: "Расчёт предварительный. Для ввоза физическим лицом НДС и акциз отдельно не начисляются; применяется единая ставка."
  };
}
