"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type Props = { formId: string; compact?: boolean; carName?: string; calculationRub?: number; submitLabel?: string };

export function LeadForm({ formId, compact = false, carName, calculationRub, submitLabel = "Получить подбор" }: Props) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [contactUrl, setContactUrl] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setStatus("sending"); setMessage(""); setContactUrl("");
    const form = new FormData(formElement);
    const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, consent: form.get("consent") === "on", formId, carName, calculationRub, pageUrl: location.href }) });
      const data = await response.json().catch(() => ({})) as { message?: string; contactUrl?: string };
      setStatus(response.ok ? "success" : "error");
      setMessage(data.message || (response.ok ? "Заявка отправлена." : "Не удалось отправить заявку."));
      setContactUrl(data.contactUrl || "");
      if (response.ok) formElement.reset();
    } catch {
      setStatus("error");
      setMessage("Сеть недоступна. Данные не отправлены — проверьте соединение и повторите.");
    }
  }
  return <form className={`lead-form ${compact ? "lead-form-compact" : ""}`} onSubmit={submit} noValidate>
    <div className="form-grid"><label>Имя<input name="name" autoComplete="name" minLength={2} maxLength={80} required /></label><label>Телефон<input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 900 000-00-00" required /></label><label>Город<input name="city" autoComplete="address-level2" minLength={2} required /></label></div>
    {!carName && <label>Пожелания<textarea name="wishes" rows={compact ? 2 : 4} maxLength={1500} placeholder="Марка, модель, бюджет, год" /></label>}
    <label className="honeypot" aria-hidden="true">Сайт<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <label className="consent"><input name="consent" type="checkbox" required /><span>Я даю <Link href="/legal/consent" target="_blank">согласие на обработку персональных данных</Link> и ознакомлен(а) с <Link href="/legal/privacy" target="_blank">политикой</Link>.</span></label>
    <button className="button" type="submit" disabled={status === "sending"}>{status === "sending" ? "Отправляем…" : submitLabel}</button>
    {message && <div className={`form-status ${status}`} role="status"><p>{message}</p>{contactUrl && <a className="button button-small button-ghost" href={contactUrl} target="_blank" rel="noreferrer">Написать напрямую</a>}</div>}
  </form>;
}
