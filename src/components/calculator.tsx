"use client";

import { useMemo, useState } from "react";
import { calculateImportCost, IMPORT_COST_DEFAULTS, type Fuel } from "@/domain/calculator";
import { formatKrw, formatRub } from "@/domain/currency";
import { LeadForm } from "@/components/lead-form";

type Props = { krwToRub: number; eurToRub: number; rateDate: string | null; isFallback: boolean };
const labels: Record<string, string> = { carPriceRub: "Стоимость автомобиля", agentFeeRub: "Услуги агента", koreaLogisticsRub: "Расходы по Корее + фрахт до Владивостока", customsDutyRub: "Таможенная пошлина", customsClearanceRub: "Таможенное оформление", customsClearanceFeeRub: "Таможенный сбор", recyclingFeeRub: "Утилизационный сбор", exciseRub: "Акциз", vatRub: "НДС", cityLogisticsRub: "Доставка по России" };

export function Calculator({ krwToRub, eurToRub, rateDate, isFallback }: Props) {
  const [priceKrw, setPrice] = useState(25_000_000); const [year, setYear] = useState(2022); const [engine, setEngine] = useState(1998); const [power, setPower] = useState(150); const [fuel, setFuel] = useState<Fuel>("petrol");
  const result = useMemo(() => {
    try { return { value: calculateImportCost({ priceKrw, krwToRub, eurToRub, ageYears: Math.max(0, new Date().getFullYear() - year), engineCc: engine, powerHp: power, fuel }), error: "" }; }
    catch (error) { return { value: null, error: error instanceof Error ? error.message : "Расчёт недоступен" }; }
  }, [priceKrw, year, engine, power, fuel, krwToRub, eurToRub]);
  return <div className="calculator-shell">
    <div className="calculator-fields"><label>Цена в Корее, ₩<input type="number" min="0" step="100000" value={priceKrw} onChange={(e) => setPrice(Number(e.target.value))} /><strong className="rub-preview">≈ {formatRub(priceKrw * krwToRub)}</strong><small>По курсу {krwToRub.toLocaleString("ru-RU", { maximumFractionDigits: 5 })} ₽ за ₩</small></label><label>Год выпуска<input type="number" min="2000" max={new Date().getFullYear()} value={year} onChange={(e) => setYear(Number(e.target.value))} /></label><label>Объём двигателя, см³<input type="number" min="0" max="8000" value={engine} onChange={(e) => setEngine(Number(e.target.value))} /></label><label>Мощность, л.с.<input type="number" min="1" max="1000" value={power} onChange={(e) => setPower(Number(e.target.value))} /></label><label>Тип двигателя<select value={fuel} onChange={(e) => setFuel(e.target.value as Fuel)}><option value="petrol">Бензин</option><option value="diesel">Дизель</option><option value="hybrid">Гибрид</option><option value="electric">Электро</option></select></label><div className="fixed-costs"><span>Зафиксировано в расчёте</span><b>{formatRub(IMPORT_COST_DEFAULTS.agentFeeRub)} агент</b><b>{formatKrw(IMPORT_COST_DEFAULTS.koreaLogisticsKrw)} Корея + фрахт до Владивостока</b><b>{formatRub(IMPORT_COST_DEFAULTS.customsClearanceRub)} оформление</b></div></div>
    <div className="calculator-result"><p className="eyebrow">Предварительный расчёт</p>{result.value ? <><p className="total">{formatRub(result.value.totalRub)}</p><dl>{Object.entries(result.value.lines).map(([key, value]) => <div key={key}><dt>{labels[key]}{key === "koreaLogisticsRub" && <small>{formatKrw(IMPORT_COST_DEFAULTS.koreaLogisticsKrw)}</small>}</dt><dd>{key === "cityLogisticsRub" && value === 0 ? "По городу доставки" : formatRub(value)}</dd></div>)}</dl><p className="calculator-note">{result.value.note} Доставка по России рассчитывается отдельно в зависимости от города доставки.</p><LeadForm formId="calculator" compact calculationRub={result.value.totalRub} /></> : <div className="calculation-error"><h2>Нужен индивидуальный расчёт</h2><p>{result.error}. Оставьте заявку — менеджер проверит действующий коэффициент.</p><LeadForm formId="calculator-special" compact /></div>}{isFallback && <p className="rate-warning">В локальной сборке используется резервный курс. После подключения базы курс обновляется по ЦБ РФ.{rateDate ? ` Дата: ${rateDate}.` : ""}</p>}</div>
  </div>;
}
