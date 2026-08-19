import type { CatalogFilters } from "./catalog";

export type FeedCar = {
  id: string;
  slug: string;
  status: "active";
  country: "kr";
  make: string;
  model: string;
  trim: string | null;
  year: number;
  mileageKm: number;
  engineCc: number | null;
  powerHp: number | null;
  fuel: string | null;
  transmission: string | null;
  drive: string | null;
  bodyType: string | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  vin: string | null;
  priceKrw: number;
  photos: string[];
  details: Record<string, unknown>;
};

export type TrustEncarBootstrap = {
  ajaxUrl: string;
  nonce: string;
  total: number;
  makes: Array<{ id: string; name: string }>;
};

type FeedCarInput = Partial<Omit<FeedCar, "slug" | "status" | "country" | "details">> & {
  id: string;
  make: string;
  model: string;
  year: number;
  mileageKm: number;
  priceKrw: number;
  photos?: string[];
  details?: Record<string, unknown>;
};

const slugPart = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function buildFeedPageUrl(base: string, cursor?: string, pageSize = 1_000) {
  const url = new URL(base);
  url.searchParams.set("limit", String(Math.min(1_000, Math.max(24, pageSize))));
  if (cursor) url.searchParams.set("cursor", cursor);
  return url;
}

const numberFrom = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const textFrom = (value: unknown) => String(value ?? "").trim();

export function parseTrustEncarBootstrap(html: string): TrustEncarBootstrap {
  const configMatch = html.match(/(?:var\s+|window\.)TE_CATALOG\s*=\s*(\{.*?\});/s);
  const ssrMatch = html.match(/window\.TE_CATALOG_SSR\s*=\s*(\{.*?\});/s);
  if (!configMatch || !ssrMatch) throw new Error("Trust Encar не вернул конфигурацию каталога");

  const config = JSON.parse(configMatch[1]) as { ajaxUrl?: unknown; nonce?: unknown };
  const ssr = JSON.parse(ssrMatch[1]) as {
    total?: unknown;
    facets?: { facets?: { marks?: Array<{ value?: unknown; name?: unknown }> } };
  };
  const ajaxUrl = textFrom(config.ajaxUrl);
  const nonce = textFrom(config.nonce);
  const url = new URL(ajaxUrl);
  if (url.protocol !== "https:" || (url.hostname !== "trust-encar.ru" && !url.hostname.endsWith(".trust-encar.ru"))) {
    throw new Error("Trust Encar вернул недопустимый адрес каталога");
  }
  if (!nonce) throw new Error("Trust Encar не вернул ключ публичного каталога");

  const makes = (ssr.facets?.facets?.marks ?? []).flatMap((mark) => {
    const id = textFrom(mark.value);
    const name = textFrom(mark.name);
    return id && name ? [{ id, name }] : [];
  });
  return { ajaxUrl, nonce, total: numberFrom(ssr.total), makes };
}

export function buildTrustEncarSearchBody(
  action: "search_db" | "ajax_catalog_count_db",
  filters: CatalogFilters,
  bootstrap: Pick<TrustEncarBootstrap, "nonce" | "makes">
) {
  const body = new URLSearchParams({
    action,
    nonce: bootstrap.nonce,
    page: String(Math.floor(filters.offset / Math.max(1, filters.limit)))
  });
  const makeName = filters.make || bootstrap.makes.find((make) => filters.q?.toLowerCase().startsWith(make.name.toLowerCase()))?.name;
  const make = bootstrap.makes.find((item) => item.name.toLowerCase() === makeName?.toLowerCase());
  const values: Array<[string, string | number | undefined]> = [
    ["marka_id", make?.id],
    ["year_from", filters.yearFrom],
    ["year_to", filters.yearTo],
    ["priceRubFrom", filters.priceFrom],
    ["priceRubTo", filters.priceTo],
    ["mileage_to", filters.mileageTo],
    ["fuel", filters.fuel],
    ["privod", filters.drive],
    ["kuzov", filters.bodyType],
    ["engine_from", filters.engineFrom],
    ["engine_to", filters.engineTo],
    ["hpFrom", filters.powerFrom],
    ["hpTo", filters.powerTo],
    ["lot", filters.q && /^\d+$/.test(filters.q) ? filters.q : undefined]
  ];
  values.forEach(([key, value]) => { if (value !== undefined && value !== "") body.set(key, String(value)); });

  const sort = {
    newest: ["CREATED_DATE", "DESC"],
    mileage: ["MILEAGE", "ASC"],
    "price-asc": ["FINISH_RUB", "ASC"],
    "price-desc": ["FINISH_RUB", "DESC"]
  }[filters.sort];
  body.set("field_sort", sort[0]);
  body.set("order_by", sort[1]);
  return body;
}

export function normalizeTrustEncarRecord(input: Record<string, unknown>): FeedCar {
  const rawImages = input.IMAGES;
  let photos: string[] = [];
  if (Array.isArray(rawImages)) photos = rawImages.filter((item): item is string => typeof item === "string");
  else if (typeof rawImages === "string") {
    try {
      const parsed: unknown = JSON.parse(rawImages);
      if (Array.isArray(parsed)) photos = parsed.filter((item): item is string => typeof item === "string");
    } catch { photos = []; }
  }
  const fuelCode = textFrom(input.TIME);
  const fuel = ({ G: "Бензин", D: "Дизель", E: "Электро", "G+E": "Гибрид", LPGP: "Газ" } as Record<string, string>)[fuelCode] ?? (fuelCode || null);
  const powerHp = numberFrom(textFrom(input.POWER_TEXT).match(/\d+/)?.[0]);

  return normalizeFeedCar({
    id: textFrom(input.ID || input.LOT),
    make: textFrom(input.MARKA_NAME),
    model: textFrom(input.MODEL_NAME),
    trim: textFrom(input.GRADE) || null,
    year: numberFrom(input.YEAR),
    mileageKm: numberFrom(input.MILEAGE),
    engineCc: numberFrom(input.ENG_V) || null,
    powerHp: powerHp || null,
    fuel,
    transmission: textFrom(input.KPP) || null,
    drive: textFrom(input.PRIV) || null,
    bodyType: textFrom(input.KUZOV) || null,
    exteriorColor: textFrom(input.COLOR) || null,
    interiorColor: textFrom(input.SEAT_COLOR) || null,
    vin: textFrom(input.VEHICLENO) || null,
    priceKrw: numberFrom(input.FINISH),
    photos: photos.map((url) => url.replace(/^https:\/\/ci\.encar\.com\//, "https://trust-encar.ru/images/")),
    details: {
      sourceStatus: input.STATUS_LABEL_RU ?? input.STATUS ?? null,
      registration: input.REGISTRATION_LABEL ?? input.MONTH ?? null,
      generation: input.GENERATION_SHOW ?? input.GENERATION_EN ?? null,
      seats: numberFrom(input.SEATS) || null,
      accidentCount: numberFrom(input.ACCIDENT_COUNT_SUM) || 0
    }
  });
}

export function normalizeFeedCar(input: FeedCarInput): FeedCar {
  return {
    id: String(input.id),
    slug: `${slugPart(input.make)}-${slugPart(input.model)}-${slugPart(String(input.id))}`,
    status: "active",
    country: "kr",
    make: input.make.trim(),
    model: input.model.trim(),
    trim: input.trim?.trim() || null,
    year: input.year,
    mileageKm: input.mileageKm,
    engineCc: input.engineCc ?? null,
    powerHp: input.powerHp ?? null,
    fuel: input.fuel ?? null,
    transmission: input.transmission ?? null,
    drive: input.drive ?? null,
    bodyType: input.bodyType ?? null,
    exteriorColor: input.exteriorColor ?? null,
    interiorColor: input.interiorColor ?? null,
    vin: input.vin ?? null,
    priceKrw: input.priceKrw,
    photos: (input.photos ?? []).filter((url) => url.startsWith("https://")),
    details: input.details ?? {}
  };
}
