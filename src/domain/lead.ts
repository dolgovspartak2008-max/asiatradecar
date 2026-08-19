import { z } from "zod";

const leadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^\+?[\d\s()-]{10,20}$/),
  city: z.string().trim().min(2).max(100),
  wishes: z.string().trim().max(1500),
  consent: z.literal(true),
  website: z.string().max(0)
});

export type Lead = z.infer<typeof leadSchema>;

export function validateLead(input: unknown) {
  return leadSchema.safeParse(input);
}

const escapeHtml = (value: string) => value.replace(/[&<>]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[character]!);

export function buildTelegramMessage(
  lead: Lead,
  context: { carName?: string; pageUrl?: string; sourceUrl?: string; calculationRub?: number }
) {
  const lines = [
    "<b>Новая заявка ASIA TRADE CAR</b>",
    `Имя: ${escapeHtml(lead.name)}`,
    `Телефон: ${escapeHtml(lead.phone)}`,
    `Город: ${escapeHtml(lead.city)}`,
    `Пожелания: ${escapeHtml(lead.wishes || "—")}`
  ];
  if (context.carName) lines.push(`Автомобиль: ${escapeHtml(context.carName)}`);
  if (context.calculationRub) lines.push(`Расчёт: ${Math.round(context.calculationRub).toLocaleString("ru-RU")} ₽`);
  if (context.pageUrl) lines.push(`Страница: ${escapeHtml(context.pageUrl)}`);
  return lines.join("\n");
}
