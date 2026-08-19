import type { Metadata } from "next";
import { connection } from "next/server";
import { Calculator } from "@/components/calculator";
import { getCalculatorRates } from "@/server/rates";

export const metadata: Metadata = { title: "Калькулятор доставки автомобиля из Кореи", description: "Предварительный расчёт стоимости автомобиля, таможенных платежей и доставки из Кореи.", alternates: { canonical: "/calculator" } };
export default async function CalculatorPage() { await connection(); const rates = await getCalculatorRates(); return <section className="page-section calculator-page"><div className="container"><div className="page-intro"><p className="eyebrow">Прозрачный расчёт</p><h1>Калькулятор импорта</h1><p>Показывает основные статьи расходов для ввоза физическим лицом. Это ориентир, а не публичная оферта: ставки и применимость льгот проверяются на дату оформления.</p></div><Calculator krwToRub={rates.krwToRub} eurToRub={rates.eurToRub} rateDate={rates.date} isFallback={rates.isFallback}/></div></section>; }
