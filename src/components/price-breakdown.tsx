"use client";

import { useId, useRef, useState } from "react";
import { parseCostBreakdown, type CostBreakdownLine } from "@/domain/car-details";
import { formatRub } from "@/domain/currency";
import { Icon } from "@/components/icons";

type Props = {
  slug: string;
  carName: string;
  priceKrw: number;
  priceRub: number | null;
  details: Record<string, unknown>;
  currencyCode?: "KRW" | "JPY" | "CNY";
  country?: string;
  compact?: boolean;
};

function fallbackLines(priceKrw: number, priceRub: number | null, details: Record<string, unknown>, currencyCode = "KRW", country = "kr"): CostBreakdownLine[] {
  const koreaRub = typeof details.koreaPriceRub === "number" ? details.koreaPriceRub : null;
  const names: Record<string, string> = { kr: "Корее", jp: "Японии", cn: "Китае" };
  const symbols: Record<string, string> = { JPY: "¥", CNY: "¥" };
  const sourcePrice = currencyCode === "KRW" ? (koreaRub ? formatRub(koreaRub) : null) : `${priceKrw.toLocaleString("ru-RU")} ${symbols[currencyCode]}`;
  const lines = sourcePrice ? [{ label: `Автомобиль в ${names[country] || "стране покупки"}`, value: sourcePrice }] : [];
  if (priceRub && koreaRub && priceRub > koreaRub) lines.push({ label: "Логистика, таможня и услуги", value: formatRub(priceRub - koreaRub) });
  return lines;
}

export function PriceBreakdown({ slug, carName, priceKrw, priceRub, details, currencyCode = "KRW", country = "kr", compact = false }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const initial = parseCostBreakdown(details);
  const [lines, setLines] = useState(initial);
  const [livePriceRub, setLivePriceRub] = useState(priceRub);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const hasSourceLines = lines.some((line) => !/комисси|брокер/i.test(line.label));

  const open = async () => {
    dialog.current?.showModal();
    if (hasSourceLines || status === "loading") return;
    setStatus("loading");
    try {
      const response = await fetch(`/api/catalog/details/${encodeURIComponent(slug)}`);
      const data = await response.json() as { priceRub?: number | null; details?: Record<string, unknown> };
      if (!response.ok) throw new Error();
      const loadedLines = parseCostBreakdown(data.details || {});
      setLines(loadedLines);
      if (typeof data.priceRub === "number" || data.priceRub === null) setLivePriceRub(data.priceRub);
      if (!loadedLines.some((line) => !/комисси|брокер/i.test(line.label))) throw new Error();
      setStatus("idle");
    } catch { setStatus("error"); }
  };

  const visibleLines = hasSourceLines ? lines : fallbackLines(priceKrw, livePriceRub, details, currencyCode, country);
  return <>
    <button className={`price-breakdown-trigger ${compact ? "compact" : ""}`} type="button" onClick={open}>Расшифровка цены</button>
    <dialog ref={dialog} className="site-dialog price-dialog" aria-labelledby={titleId} onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }}>
      <div className="dialog-panel">
        <button className="dialog-close" type="button" onClick={() => dialog.current?.close()} aria-label="Закрыть расшифровку"><Icon name="x" /></button>
        <p className="eyebrow">Под ключ в РФ</p><h2 id={titleId}>{carName}</h2>
        <p className="dialog-total">{livePriceRub ? formatRub(livePriceRub) : "Итоговая цена уточняется"}</p>
        <dl className="price-lines">{visibleLines.map((line) => <div key={`${line.label}-${line.value}`}><dt>{line.label}</dt><dd>{line.value}</dd></div>)}</dl>
        {status === "loading" && <p className="dialog-note" role="status">Загружаем точные статьи расходов из источника…</p>}
        {status === "error" && <p className="dialog-note" role="status">Полная расшифровка недоступна в источнике. Стоимость уточните у менеджера.</p>}
        <p className="dialog-note">Логистика и доставка по России рассчитываются отдельно после выбора автомобиля и города.</p>
      </div>
    </dialog>
  </>;
}
