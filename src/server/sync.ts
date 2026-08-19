import type { PoolClient } from "pg";
import { buildFeedPageUrl, normalizeFeedCar, normalizeTrustEncarRecord, type FeedCar } from "@/domain/sync";
import { walkCursorPages } from "@/domain/pagination";
import { inTransaction, query } from "@/server/db";

type FeedPage = { items: unknown[]; nextCursor?: string | null };

function normalizeInput(value: unknown): FeedCar {
  if (!value || typeof value !== "object") throw new Error("Некорректная запись в фиде");
  const item = value as Record<string, unknown>;
  if (item.ID || item.LOT) return normalizeTrustEncarRecord(item);
  if (!item.id || !item.make || !item.model || !item.year || item.mileageKm === undefined || item.priceKrw === undefined) {
    throw new Error("В записи фида отсутствуют обязательные поля");
  }
  return normalizeFeedCar(item as Parameters<typeof normalizeFeedCar>[0]);
}

async function fetchFeedPage(cursor?: string) {
  const base = process.env.ENCAR_FEED_URL || process.env.TRUST_ENCAR_FEED_URL;
  if (!base) throw new Error("ENCAR_FEED_URL не настроен");
  const pageSize = Number(process.env.ENCAR_FEED_PAGE_SIZE || process.env.TRUST_ENCAR_FEED_PAGE_SIZE || 1_000);
  const url = buildFeedPageUrl(base, cursor, Number.isFinite(pageSize) ? pageSize : 1_000);
  const extraHosts = (process.env.ENCAR_FEED_ALLOWED_HOSTS || process.env.TRUST_ENCAR_FEED_ALLOWED_HOSTS || "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean);
  const allowed = url.hostname === "trust-encar.ru" || url.hostname.endsWith(".trust-encar.ru") || url.hostname === "api.encarapi.com" || extraHosts.includes(url.hostname.toLowerCase());
  if (url.protocol !== "https:" || !allowed) throw new Error("Фид должен использовать HTTPS и разрешённый хост");
  const token = process.env.ENCAR_FEED_TOKEN || process.env.TRUST_ENCAR_FEED_TOKEN;
  const headers: Record<string, string> = {};
  if (token) headers[url.hostname === "api.encarapi.com" ? "x-api-key" : "Authorization"] = url.hostname === "api.encarapi.com" ? token : `Bearer ${token}`;
  const response = await fetch(url, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok) throw new Error(`Фид вернул ${response.status}`);
  const data = await response.json() as FeedPage | unknown[];
  return Array.isArray(data) ? { items: data, nextCursor: null } : data;
}

async function upsertCars(client: PoolClient, cars: FeedCar[], krwToRub: number | null) {
  if (!cars.length) return;
  const payload = cars.map((car) => ({
    id: car.id, slug: car.slug, status: car.status, country: car.country, make: car.make, model: car.model, trim: car.trim,
    year: car.year, mileage_km: car.mileageKm, engine_cc: car.engineCc, power_hp: car.powerHp, fuel: car.fuel,
    transmission: car.transmission, drive: car.drive, body_type: car.bodyType, exterior_color: car.exteriorColor,
    interior_color: car.interiorColor, vin: car.vin, price_krw: car.priceKrw,
    price_rub: krwToRub ? Math.round(car.priceKrw * krwToRub) : null, photos: car.photos, details: car.details
  }));
  await client.query(
    `WITH incoming AS (
      SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(
        id text, slug text, status text, country text, make text, model text, trim text, year integer, mileage_km integer,
        engine_cc integer, power_hp integer, fuel text, transmission text, drive text, body_type text, exterior_color text,
        interior_color text, vin text, price_krw bigint, price_rub bigint, photos jsonb, details jsonb
      )
    )
     INSERT INTO cars (id, slug, status, country, make, model, trim, year, mileage_km, engine_cc, power_hp, fuel,
      transmission, drive, body_type, exterior_color, interior_color, vin, price_krw, price_rub, photos, details, last_seen_at, updated_at)
     SELECT id,slug,status,country,make,model,trim,year,mileage_km,engine_cc,power_hp,fuel,transmission,drive,body_type,
       exterior_color,interior_color,vin,price_krw,price_rub,photos,details,now(),now() FROM incoming
     ON CONFLICT (id) DO UPDATE SET slug=EXCLUDED.slug, status='active', make=EXCLUDED.make, model=EXCLUDED.model,
      trim=EXCLUDED.trim, year=EXCLUDED.year, mileage_km=EXCLUDED.mileage_km, engine_cc=EXCLUDED.engine_cc,
      power_hp=EXCLUDED.power_hp, fuel=EXCLUDED.fuel, transmission=EXCLUDED.transmission, drive=EXCLUDED.drive,
      body_type=EXCLUDED.body_type, exterior_color=EXCLUDED.exterior_color, interior_color=EXCLUDED.interior_color,
      vin=EXCLUDED.vin, price_krw=EXCLUDED.price_krw, price_rub=EXCLUDED.price_rub, photos=EXCLUDED.photos,
      details=EXCLUDED.details, last_seen_at=now(), updated_at=now()`, [JSON.stringify(payload)]
  );
}

export async function syncAuthorizedCatalog() {
  const run = await query<{ id: string }>("INSERT INTO sync_runs (source, status) VALUES ('trust-encar-feed', 'running') RETURNING id");
  const runId = run.rows[0].id;
  const rate = await query<{ rub_per_unit: string }>("SELECT rub_per_unit FROM exchange_rates WHERE code = 'KRW'");
  const krwToRub = rate.rows[0] ? Number(rate.rows[0].rub_per_unit) : null;
  const startedAt = new Date();
  try {
    const result = await walkCursorPages(fetchFeedPage, async (items) => {
      const cars = items.map(normalizeInput);
      await inTransaction(async (client) => {
        await upsertCars(client, cars, krwToRub);
      });
    });
    const received = result.received;
    if (received === 0) throw new Error("Фид вернул пустой каталог; деактивация отменена");
    await query("UPDATE cars SET status = 'inactive', updated_at = now() WHERE source = 'trust-encar-feed' AND last_seen_at < $1", [startedAt]);
    await query("UPDATE sync_runs SET status='completed', received=$1, finished_at=now() WHERE id=$2", [received, runId]);
    return { received, pages: result.pages };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Неизвестная ошибка";
    await query("UPDATE sync_runs SET status='failed', error=$1, finished_at=now() WHERE id=$2", [message, runId]);
    throw error;
  }
}
