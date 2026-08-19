"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type Props = { formId: string; compact?: boolean; carName?: string; calculationRub?: number; cars?: Array<{ value: string; label: string }>; catalogSearch?: boolean };

export function LeadForm({ formId, compact = false, carName, calculationRub, cars, catalogSearch = false }: Props) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogMatches, setCatalogMatches] = useState<Array<{ slug: string; label: string }>>([]);
  useEffect(() => {
    if (!catalogSearch || catalogQuery.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/catalog/search?q=${encodeURIComponent(catalogQuery.trim())}`, { signal: controller.signal });
        const data = await response.json() as { items?: Array<{ slug: string; label: string }> };
        setCatalogMatches(data.items || []);
      } catch { if (!controller.signal.aborted) setCatalogMatches([]); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [catalogQuery, catalogSearch]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending"); setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const selectedCar = String(form.get("selectedCar") || "");
      const selectedLabel = cars?.find((car) => car.value === selectedCar)?.label || selectedCar || undefined;
      const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, consent: form.get("consent") === "on", formId, carName: carName || selectedLabel, calculationRub, pageUrl: location.href }) });
      const data = await response.json().catch(() => ({})) as { message?: string };
      setStatus(response.ok ? "success" : "error");
      setMessage(data.message || (response.ok ? "Заявка отправлена." : "Не удалось отправить заявку."));
      if (response.ok) event.currentTarget.reset();
    } catch {
      setStatus("error");
      setMessage("Сеть недоступна. Данные не отправлены — проверьте соединение и повторите.");
    }
  }
  return <form className={`lead-form ${compact ? "lead-form-compact" : ""}`} onSubmit={submit} noValidate>
    <div className="form-grid"><label>Имя<input name="name" autoComplete="name" minLength={2} maxLength={80} required /></label><label>Телефон<input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 900 000-00-00" required /></label><label>Город<input name="city" autoComplete="address-level2" minLength={2} required /></label></div>
    {cars && <label>Автомобиль из каталога<select name="selectedCar" defaultValue=""><option value="">Подобрать по параметрам</option>{cars.map((car) => <option value={car.value} key={car.value}>{car.label}</option>)}</select>{cars.length === 0 && <small>Каталог заполняется синхронизацией. Пока опишите автомобиль ниже.</small>}</label>}
    {catalogSearch && <label>Автомобиль из каталога<input name="selectedCar" list={`${formId}-catalog-options`} value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Начните вводить марку или модель" autoComplete="off"/><datalist id={`${formId}-catalog-options`}>{catalogMatches.map((car) => <option value={car.label} key={car.slug}/>)}</datalist><small>Поиск идёт по всему синхронизированному каталогу Южной Кореи. Можно оставить поле пустым.</small></label>}
    <label>Пожелания<textarea name="wishes" rows={compact ? 2 : 4} maxLength={1500} placeholder="Марка, модель, бюджет, год" /></label>
    <label className="honeypot" aria-hidden="true">Сайт<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <label className="consent"><input name="consent" type="checkbox" required /><span>Я даю <Link href="/legal/consent" target="_blank">согласие на обработку персональных данных</Link> и ознакомлен(а) с <Link href="/legal/privacy" target="_blank">политикой</Link>.</span></label>
    <button className="button" type="submit" disabled={status === "sending"}>{status === "sending" ? "Отправляем…" : "Получить подбор"}</button>
    {message && <p className={`form-status ${status}`} role="status">{message}</p>}
  </form>;
}
