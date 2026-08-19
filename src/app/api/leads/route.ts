import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildTelegramMessage, validateLead } from "@/domain/lead";
import { operatorReady, retentionReady, site } from "@/config/site";
import { hasDatabase, inTransaction, query } from "@/server/db";
import { consumeLeadRateLimit } from "@/server/leads";

const CONSENT_TEXT = "Согласие на обработку персональных данных для ответа на заявку и подготовки подбора/расчёта";
const contactUrl = site.whatsapp || site.telegram || (site.email ? `mailto:${site.email}` : site.phone ? `tel:${site.phone.replace(/[^+\d]/g, "")}` : "");
const unavailable = () => NextResponse.json({
  saved: false,
  contactUrl: contactUrl || undefined,
  message: contactUrl ? "Автоматическая отправка временно недоступна. Данные не сохранены — отправьте сообщение напрямую." : "Канал заявок ещё не подключён. Данные не сохранены; повторите после публикации контактов."
}, { status: 503 });

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Некорректные данные формы." }, { status: 400 }); }
  if (body && typeof body === "object" && "website" in body && (body as { website?: unknown }).website) return NextResponse.json({ message: "Заявка принята." });
  const parsed = validateLead(body);
  if (!parsed.success) return NextResponse.json({ message: "Проверьте имя, телефон, город и согласие." }, { status: 400 });
  if (!operatorReady || !retentionReady || !hasDatabase() || !process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    return unavailable();
  }
  try {
    if (!await consumeLeadRateLimit(parsed.data.phone)) return NextResponse.json({ message: "Слишком много заявок для этого номера. Повторите через 10 минут." }, { status: 429 });
  } catch { return unavailable(); }
  const context = body as { formId?: string; carName?: string; calculationRub?: number; pageUrl?: string };
  const formId = typeof context.formId === "string" ? context.formId.slice(0, 100) : "unknown";
  let pageUrl: string | undefined;
  try { const candidate = new URL(context.pageUrl || ""); if (candidate.origin === new URL(site.url).origin) pageUrl = candidate.href.slice(0, 500); } catch { pageUrl = undefined; }
  const ipHash = createHash("sha256").update(`${process.env.CRON_SECRET || site.policyVersion}:${ip}`).digest("hex");
  let leadId: string;
  try {
    leadId = await inTransaction(async (client) => {
      const lead = await client.query<{ id: string }>(
        "INSERT INTO leads (name, phone, city, wishes, page_url, car_name, calculation_rub) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
        [parsed.data.name, parsed.data.phone, parsed.data.city, parsed.data.wishes, pageUrl, context.carName?.slice(0, 200) || null, Number.isFinite(context.calculationRub) ? Math.round(context.calculationRub!) : null]
      );
      await client.query("INSERT INTO consent_log (lead_id, form_id, policy_version, consent_text, ip_hash, user_agent) VALUES ($1,$2,$3,$4,$5,$6)", [lead.rows[0].id, formId, site.policyVersion, CONSENT_TEXT, ipHash, request.headers.get("user-agent")?.slice(0, 500) || null]);
      return lead.rows[0].id;
    });
  } catch { return unavailable(); }
  const message = buildTelegramMessage(parsed.data, { carName: context.carName, pageUrl, calculationRub: context.calculationRub });
  try {
    const telegram = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: message, parse_mode: "HTML", disable_web_page_preview: true }), signal: AbortSignal.timeout(15_000) });
    if (!telegram.ok) throw new Error(`Telegram ${telegram.status}`);
    await query("UPDATE leads SET delivery_status='sent' WHERE id=$1", [leadId]).catch(() => undefined);
    return NextResponse.json({ saved: true, message: "Заявка отправлена. Мы свяжемся с вами после обработки запроса." });
  } catch {
    await query("UPDATE leads SET delivery_status='failed' WHERE id=$1", [leadId]).catch(() => undefined);
    return NextResponse.json({ saved: true, message: "Заявка сохранена. Уведомление менеджеру задерживается, повторно отправлять форму не нужно." }, { status: 202 });
  }
}
