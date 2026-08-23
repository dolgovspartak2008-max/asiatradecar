import type { CatalogFilters } from "./catalog";
import { load } from "cheerio";

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

export type TrustEncarCatalogCar = FeedCar & { priceRub: number | null };

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

export function parseTrustEncarModelsFacet(value: unknown) {
  if (!value || typeof value !== "object") return [] as Array<{ id: string; name: string }>;
  const response = value as { facets?: { models?: unknown } };
  if (!Array.isArray(response.facets?.models)) return [] as Array<{ id: string; name: string }>;
  return response.facets.models.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const model = item as { value?: unknown; name?: unknown; label?: unknown };
    const id = textFrom(model.value);
    const name = textFrom(model.name || model.label);
    return id && name ? [{ id, name }] : [];
  });
}

export type TrustEncarGeneration = { name: string; minYear: number; maxYear: number };

export function parseTrustEncarGenerationsFacet(value: unknown): TrustEncarGeneration[] {
  if (!value || typeof value !== "object") return [];
  const response = value as { facets?: { generations?: unknown } };
  if (!Array.isArray(response.facets?.generations)) return [];
  return response.facets.generations.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const generation = item as { value?: unknown; name?: unknown; min_year?: unknown; max_year?: unknown };
    const name = textFrom(generation.name || generation.value);
    const minYear = numberFrom(generation.min_year);
    const maxYear = numberFrom(generation.max_year);
    return name && minYear >= 1900 && maxYear >= minYear ? [{ name, minYear, maxYear }] : [];
  });
}

const cleanImageUrl = (value: string) => {
  try {
    const url = new URL(value, "https://trust-encar.ru");
    if (url.protocol !== "https:" || url.hostname !== "trust-encar.ru") return "";
    return `${url.origin}${url.pathname}`;
  } catch { return ""; }
};

export function parseTrustEncarCatalogPage(html: string) {
  const bootstrap = parseTrustEncarBootstrap(html);
  const $ = load(html);
  const cars = $("article.auto-item").toArray().flatMap((element): TrustEncarCatalogCar[] => {
    const card = $(element);
    const optionText = (tooltip: string, fallback: RegExp) => {
      const exact = card.find(`[data-fui-tooltip="${tooltip}"]`).first().text().replace(/\s+/g, " ").trim();
      if (exact) return exact;
      return card.find(".catalog-item-options .price").toArray()
        .map((item) => $(item).text().replace(/\s+/g, " ").trim())
        .find((value) => fallback.test(value)) ?? "";
    };
    const href = card.attr("data-href") ?? "";
    const lotText = optionText("Лот", /Лот\s*:/i);
    const id = card.find("[data-car-id]").first().attr("data-car-id")
      || href.match(/\/auto\/(\d+)/)?.[1]
      || lotText.match(/(\d{5,})/)?.[1]
      || "";
    const make = card.find(".te-car-title__logo").first().attr("alt")?.trim() ?? "";
    const title = card.find(".te-car-title__text").first().text().replace(/\s+/g, " ").trim();
    const model = title.toLowerCase().startsWith(make.toLowerCase()) ? title.slice(make.length).trim() : title;
    if (!id || !make || !model) return [];

    const subtitle = card.find(".auto-item-subtitle").first().text().replace(/\s+/g, " ").trim();
    const registration = optionText("Дата первой регистрации автомобиля в Корее", /Дата регистрации/i);
    const production = optionText("Примерная дата производства автомобиля", /дата производства/i);
    const engine = optionText("Объем двигателя / Топливо / Привод", /см³.*\//i);
    const power = optionText("Мощность двигателя", /л\.с\./i);
    const body = optionText("Кузов / Мест", /местн|мест\b/i);
    const colors = optionText("Цвет кузова / Цвет салона", /Кузов\s*:/i);
    const mileage = optionText("Пробег", /км/i);
    const price = optionText("Цена автомобиля в рублях и в вонах в Корее", /Стоимость авто|[₩₽]/i);
    const cardText = card.text().replace(/\s+/g, " ").trim();
    const koreaPriceRub = numberFrom(price.match(/[\d\s]+(?=\s*₽)/)?.[0]) || null;
    const finalPriceRub = numberFrom(cardText.match(/Стоимость до (?:города )?Владивостока:\s*~?\s*([\d\s]+)\s*₽/i)?.[1]) || null;
    const engineParts = engine.split("/").map((part) => part.trim());
    const year = numberFrom((production || registration).match(/(?:19|20)\d{2}/)?.[0]);
    const photos = card.find(".auto-item-img img[src]").toArray()
      .map((image) => cleanImageUrl($(image).attr("src") ?? ""))
      .filter(Boolean);
    const normalized = normalizeFeedCar({
      id,
      make,
      model,
      trim: subtitle.split(/\s[—–-]\s/).slice(1).join(" — ") || subtitle || null,
      year,
      mileageKm: numberFrom(mileage.match(/[\d\s]+(?=\s*км)/i)?.[0]),
      engineCc: numberFrom(engineParts[0]) || null,
      powerHp: numberFrom(power.match(/[\d\s]+(?=\s*л\.с\.)/i)?.[0]) || null,
      fuel: engineParts[1] || null,
      drive: engineParts[2] || null,
      bodyType: body.split("/")[0]?.trim() || null,
      exteriorColor: colors.match(/Кузов:\s*([^/]+)/i)?.[1]?.trim() || null,
      interiorColor: colors.match(/Салон:\s*(.+)$/i)?.[1]?.trim() || null,
      vin: card.find(".car-vehicleNo").first().text().trim() || null,
      priceKrw: numberFrom(price.match(/[\d\s]+(?=\s*₩)/)?.[0]),
      photos,
      details: {
        sourceStatus: card.find(".auto-label.stock, .auto-label.leasing").first().text().trim() || null,
        registration: registration || null,
        production: production || null,
        accident: card.find(".auto-item-acc").first().text().replace(/\s+/g, " ").trim() || null,
        koreaPriceRub
      }
    });
    return [{ ...normalized, priceRub: finalPriceRub }];
  });
  return { cars, total: bootstrap.total, makes: bootstrap.makes.map((make) => make.name) };
}

export function parseTrustEncarVehiclePage(html: string): TrustEncarCatalogCar | null {
  const $ = load(html);
  let vehicle: Record<string, unknown> | null = null;
  $("script[type='application/ld+json']").each((_, element) => {
    if (vehicle) return;
    try {
      const value = JSON.parse($(element).text()) as Record<string, unknown>;
      const candidates = [value, ...(Array.isArray(value["@graph"]) ? value["@graph"] : [])];
      vehicle = candidates.find((candidate) => {
        if (!candidate || typeof candidate !== "object") return false;
        const raw = candidate as Record<string, unknown>;
        const types = Array.isArray(raw["@type"]) ? raw["@type"].map(String) : [String(raw["@type"] || "")];
        return types.some((type) => type === "Vehicle" || type === "Car") && Boolean(raw.sku);
      }) as Record<string, unknown> | undefined || null;
    } catch {}
  });
  if (!vehicle) return null;
  const data = vehicle as Record<string, unknown>;
  const brand = data.brand && typeof data.brand === "object" ? data.brand as Record<string, unknown> : {};
  const mileage = data.mileageFromOdometer && typeof data.mileageFromOdometer === "object" ? data.mileageFromOdometer as Record<string, unknown> : {};
  const engine = data.vehicleEngine && typeof data.vehicleEngine === "object" ? data.vehicleEngine as Record<string, unknown> : {};
  const displacement = engine.engineDisplacement && typeof engine.engineDisplacement === "object" ? engine.engineDisplacement as Record<string, unknown> : {};
  const offers = data.offers && typeof data.offers === "object" ? data.offers as Record<string, unknown> : {};
  const option = (label: string) => {
    const item = $(".product-option").toArray().find((element) => $(element).find(".product-option-label").text().replace(/\s+/g, " ").trim() === label);
    if (!item) return "";
    const clone = $(item).clone();
    clone.find(".product-option-label, .te-car-color-swatch").remove();
    return clone.text().replace(/\s+/g, " ").trim();
  };
  const koreaCost = option("Стоимость авто в Корее") || $(".calc-detail__line").toArray().flatMap((element) => {
    const line = $(element);
    return /Стоимость автомобиля в Корее/i.test(line.find(".calc-detail__subtitle").text())
      ? [line.find(".calc-detail__price").text().replace(/\s+/g, " ").trim()]
      : [];
  })[0] || "";
  const pageText = $("body").text().replace(/\s+/g, " ").trim();
  const insuranceOwn = pageText.match(/Страховая история:\s*повреждения этого автомобиля\s*(.*?)\s*Страховая история:\s*повреждения другого автомобиля/i)?.[1]?.trim() || null;
  const costBreakdown = $(".calc-detail__line").toArray().flatMap((element) => {
    const line = $(element);
    const label = line.find(".calc-detail__subtitle").first().text().replace(/\s+/g, " ").replace(/:\s*$/, "").trim();
    const value = line.find(".calc-detail__price").first().text().replace(/\s+/g, " ").trim();
    return label && value ? [{ label, value }] : [];
  });
  const optionGroups = $(".product-descr").toArray().flatMap((element) => {
    const group = $(element);
    const title = group.find("h3").first().text().replace(/\s*\(\d+\s+опци(?:я|и|й)\)\s*$/i, "").trim();
    const items = group.find("ul.product-option li.is-active").toArray().map((item) => $(item).text().replace(/\s+/g, " ").trim()).filter(Boolean);
    return title && items.length ? [{ title, items }] : [];
  });
  const id = textFrom(data.sku);
  const make = textFrom(brand.name);
  const model = textFrom(data.model);
  if (!id || !make || !model) return null;
  const images = Array.isArray(data.image) ? data.image : [data.image];
  const normalized = normalizeFeedCar({
    id,
    make,
    model,
    trim: textFrom(data.vehicleConfiguration) || null,
    year: numberFrom(data.productionDate),
    mileageKm: numberFrom(mileage.value),
    engineCc: numberFrom(displacement.value) || null,
    powerHp: numberFrom(option("Мощность").match(/[\d\s]+/)?.[0]) || null,
    fuel: textFrom(data.fuelType) || null,
    transmission: textFrom(data.vehicleTransmission) || option("Коробка") || null,
    drive: option("Привод") || null,
    bodyType: option("Кузов") || null,
    exteriorColor: option("Цвет кузова") || textFrom(data.color) || null,
    interiorColor: option("Цвет салона") || null,
    vin: option("Номер автомобиля") || null,
    priceKrw: numberFrom(koreaCost.match(/[\d\s]+(?=\s*₩)/)?.[0]),
    photos: images.map((image) => cleanImageUrl(textFrom(image))).filter(Boolean),
    details: {
      sourceStatus: option("Статус") || null,
      registration: option("Дата регистрации в Корее") || null,
      koreaPriceRub: numberFrom(koreaCost.match(/[\d\s]+(?=\s*₽)/)?.[0]) || null,
      insuranceOwn,
      optionGroups,
      costBreakdown
    }
  });
  return { ...normalized, priceRub: numberFrom(offers.price) || null };
}

export function buildTrustEncarSearchBody(
  action: "search_db" | "ajax_catalog_count_db",
  filters: CatalogFilters,
  bootstrap: Pick<TrustEncarBootstrap, "nonce" | "makes">,
  modelId?: string
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
    ["model_id", modelId],
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
