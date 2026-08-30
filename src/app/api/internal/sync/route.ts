import { NextRequest, NextResponse } from "next/server";
import { syncAuthorizedCatalog } from "@/server/sync";
import { syncCbrKrwRate } from "@/server/rates";
import { purgeExpiredLeadData } from "@/server/leads";
import { ensureTelegramWebhook } from "@/server/telegram-bot";
import { syncExternalCatalogs, syncJapanCatalog } from "@/server/external-sync";
import { ensureDatabaseSchema } from "@/server/schema";

function authorized(request: NextRequest) { return Boolean(process.env.CRON_SECRET) && request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`; }
async function run(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureDatabaseSchema();
    const safe = async <T,>(work: () => Promise<T>) => {
      try { return { ok: true as const, value: await work() }; }
      catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "Sync failed" }; }
    };
    if (request.nextUrl.searchParams.get("scope") === "japan") {
      const japan = await safe(syncJapanCatalog);
      return NextResponse.json({ ok: japan.ok, japan });
    }
    const [retention, rates, catalog, externalCatalogs, telegram] = await Promise.all([
      safe(purgeExpiredLeadData), safe(syncCbrKrwRate), safe(syncAuthorizedCatalog), safe(syncExternalCatalogs), safe(ensureTelegramWebhook)
    ]);
    return NextResponse.json({ ok: telegram.ok, retention, rates, catalog, externalCatalogs, telegram });
  }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Sync failed" }, { status: 500 }); }
}

export const GET = run;
export const POST = run;
export const maxDuration = 300;
