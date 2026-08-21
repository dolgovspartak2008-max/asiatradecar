import { NextRequest, NextResponse } from "next/server";
import { syncAuthorizedCatalog } from "@/server/sync";
import { syncCbrKrwRate } from "@/server/rates";
import { purgeExpiredLeadData } from "@/server/leads";
import { ensureTelegramWebhook } from "@/server/telegram-bot";
import { syncExternalCatalogs } from "@/server/external-sync";

function authorized(request: NextRequest) { return Boolean(process.env.CRON_SECRET) && request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`; }
export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { const retention = await purgeExpiredLeadData(); const rates = await syncCbrKrwRate(); const [catalog, externalCatalogs] = await Promise.all([syncAuthorizedCatalog(), syncExternalCatalogs()]); const telegram = await ensureTelegramWebhook(); return NextResponse.json({ ok: true, retention, rates, catalog, externalCatalogs, telegram }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Sync failed" }, { status: 500 }); }
}
