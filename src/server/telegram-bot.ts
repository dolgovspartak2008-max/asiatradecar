import { parseAdminValue } from "@/domain/telegram";
import { query } from "@/server/db";
import { getPricingSettings, setCatalogRate, setCommissionRub } from "@/server/pricing";
import { site } from "@/config/site";

type TelegramUpdate = {
  message?: { text?: string; from?: { id: number; first_name?: string; username?: string }; chat: { id: number } };
  callback_query?: { id: string; data?: string; from: { id: number; first_name?: string; username?: string }; message?: { chat: { id: number } } };
};

const token = () => process.env.TELEGRAM_BOT_TOKEN || "";
const ownerId = () => Number(process.env.TELEGRAM_OWNER_ID || process.env.TELEGRAM_CHAT_ID || 0);
const money = (value: number) => Math.round(value).toLocaleString("ru-RU");

async function telegram(method: string, body: Record<string, unknown>) {
  if (!token()) throw new Error("TELEGRAM_BOT_TOKEN не настроен");
  const response = await fetch(`https://api.telegram.org/bot${token()}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Telegram ${method}: ${response.status}`);
}

async function isAdmin(userId: number) {
  if (userId === ownerId()) return true;
  const result = await query<{ allowed: boolean }>("SELECT EXISTS(SELECT 1 FROM bot_admins WHERE user_id=$1) AS allowed", [userId]).catch(() => null);
  return Boolean(result?.rows[0]?.allowed);
}

async function menu(chatId: number, note?: string) {
  const settings = await getPricingSettings();
  const text = `${note ? `${note}\n\n` : ""}<b>Управление Asia Trade Car</b>\nКомиссия: ${money(settings.commissionRub)} ₽\nКорея: ${settings.rates.KRW}\nЯпония: ${settings.rates.JPY}\nКитай: ${settings.rates.CNY}`;
  await telegram("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup: { inline_keyboard: [
    [{ text: "Комиссия", callback_data: "set:commission" }],
    [{ text: "Курс Корея", callback_data: "set:KRW" }, { text: "Курс Япония", callback_data: "set:JPY" }],
    [{ text: "Курс Китай", callback_data: "set:CNY" }],
    [{ text: "Добавить администратора", callback_data: "admin:add" }, { text: "Удалить", callback_data: "admin:remove" }],
    [{ text: "История заявок", callback_data: "leads" }]
  ] } });
}

async function setSession(userId: number, action: string) {
  await query("INSERT INTO bot_sessions (user_id,action,updated_at) VALUES ($1,$2,now()) ON CONFLICT (user_id) DO UPDATE SET action=EXCLUDED.action,updated_at=now()", [userId, action]);
}

async function showLeads(chatId: number) {
  const result = await query<{ id: string; name: string; phone: string; city: string; wishes: string; car_name: string | null; created_at: Date }>("SELECT id,name,phone,city,wishes,car_name,created_at FROM leads ORDER BY created_at DESC LIMIT 10");
  const text = result.rows.length ? result.rows.map((lead) => `#${lead.id} · ${new Date(lead.created_at).toLocaleString("ru-RU", { timeZone: "Asia/Yekaterinburg" })}\n${lead.name}, ${lead.phone}, ${lead.city}${lead.car_name ? `\nАвто: ${lead.car_name}` : ""}${lead.wishes ? `\n${lead.wishes}` : ""}`).join("\n\n") : "Заявок пока нет.";
  await telegram("sendMessage", { chat_id: chatId, text: `<b>Последние заявки</b>\n\n${text.replace(/[<>&]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[char]!)}`, parse_mode: "HTML" });
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const callback = update.callback_query;
  const message = update.message;
  const user = callback?.from || message?.from;
  const chatId = callback?.message?.chat.id || message?.chat.id;
  if (!user || !chatId) return;
  if (!await isAdmin(user.id)) { await telegram("sendMessage", { chat_id: chatId, text: "Нет прав администратора." }); return; }
  if (callback) {
    await telegram("answerCallbackQuery", { callback_query_id: callback.id });
    if (callback.data === "leads") { await showLeads(chatId); return; }
    if (callback.data?.startsWith("set:") || callback.data?.startsWith("admin:")) {
      await setSession(user.id, callback.data);
      const prompt = callback.data === "admin:add" ? "Отправьте Telegram user ID нового администратора." : callback.data === "admin:remove" ? "Отправьте Telegram user ID для удаления." : "Отправьте новое положительное число одним сообщением.";
      await telegram("sendMessage", { chat_id: chatId, text: prompt });
    }
    return;
  }
  if (!message?.text || message.text.startsWith("/start") || message.text.startsWith("/menu")) { await menu(chatId); return; }
  const session = await query<{ action: string }>("SELECT action FROM bot_sessions WHERE user_id=$1", [user.id]);
  const action = session.rows[0]?.action;
  if (!action) { await menu(chatId); return; }
  const value = parseAdminValue(message.text);
  if (!value) { await telegram("sendMessage", { chat_id: chatId, text: "Нужно отправить положительное число." }); return; }
  if (action === "set:commission") await setCommissionRub(Math.round(value), user.id);
  else if (action.startsWith("set:")) await setCatalogRate(action.slice(4) as "KRW" | "JPY" | "CNY", value);
  else if (action === "admin:add") await query("INSERT INTO bot_admins (user_id,display_name,added_by) VALUES ($1,'',$2) ON CONFLICT (user_id) DO NOTHING", [Math.round(value), user.id]);
  else if (action === "admin:remove" && Math.round(value) !== ownerId()) await query("DELETE FROM bot_admins WHERE user_id=$1 AND is_owner=false", [Math.round(value)]);
  await query("DELETE FROM bot_sessions WHERE user_id=$1", [user.id]);
  await menu(chatId, "Изменение сохранено.");
}

export async function ensureTelegramWebhook() {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token() || !secret || !site.url.startsWith("https://")) return { configured: false };
  await telegram("setWebhook", { url: `${site.url.replace(/\/$/, "")}/api/telegram/webhook`, secret_token: secret, allowed_updates: ["message", "callback_query"] });
  return { configured: true };
}
