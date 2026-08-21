import { NextRequest, NextResponse } from "next/server";
import { handleTelegramUpdate } from "@/server/telegram-bot";

export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { await handleTelegramUpdate(await request.json()); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Bot failed" }, { status: 500 }); }
}
