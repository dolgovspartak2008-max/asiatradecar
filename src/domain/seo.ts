import type { Car } from "@/server/catalog";

export const catalogMarkets = [
  {
    slug: "korea", country: "kr", name: "Южная Корея",
    title: "Автомобили из Южной Кореи",
    description: "Автомобили из Южной Кореи: актуальные предложения, проверка истории, расчёт стоимости и доставка в Россию.",
    source: "Каталог формируется по предложениям Trust Encar. Для каждого варианта показываем доступные характеристики, пробег и предварительный расчёт стоимости под ключ."
  },
  {
    slug: "japan", country: "jp", name: "Япония",
    title: "Автомобили из Японии",
    description: "Автомобили из Японии: актуальные аукционные предложения, проверка лота, расчёт расходов и доставка в Россию.",
    source: "Каталог формируется по архиву торгов Banzai24. Перед выкупом проверяем данные лота, документы и доступное описание состояния."
  },
  {
    slug: "china", country: "cn", name: "Китай",
    title: "Автомобили из Китая",
    description: "Новые и подержанные автомобили из Китая: актуальные предложения, расчёт стоимости и доставка в Россию.",
    source: "Каталог формируется по новым моделям и объявлениям Dongchedi. Наличие, комплектацию и итоговую стоимость подтверждаем перед оформлением договора."
  }
] as const;

export type CatalogMarket = (typeof catalogMarkets)[number];
type SearchParams = Record<string, string | string[] | undefined>;

export function getCatalogMarket(slug: string) {
  return catalogMarkets.find((market) => market.slug === slug);
}

export function buildCatalogHref(slug: string, query: string, page: number) {
  const params = new URLSearchParams(query);
  params.delete("country");
  params.delete("page");
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return `/catalog/${slug}${suffix ? `?${suffix}` : ""}`;
}

export function isFilteredCatalog(params: SearchParams) {
  return Object.entries(params).some(([key, value]) => key !== "page" && (Array.isArray(value) ? value.some(Boolean) : Boolean(value)));
}

export function buildOrganizationSchema(input: {
  name: string; owner: string; inn: string; ogrn: string; address: string; url: string; logo: string;
  phone: string; email: string; sameAs: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${input.url}/#organization`,
    name: input.name,
    legalName: input.owner,
    url: input.url,
    logo: new URL(input.logo, input.url).href,
    address: input.address,
    identifier: [
      { "@type": "PropertyValue", propertyID: "ИНН", value: input.inn },
      { "@type": "PropertyValue", propertyID: "ОГРНИП", value: input.ogrn }
    ],
    sameAs: input.sameAs.filter(Boolean),
    ...(input.phone || input.email ? { contactPoint: { "@type": "ContactPoint", contactType: "customer service", ...(input.phone ? { telephone: input.phone } : {}), ...(input.email ? { email: input.email } : {}) } } : {})
  };
}

export function buildVehicleSchema(car: Car, siteUrl: string) {
  const name = `${car.make} ${car.model}${car.trim ? ` ${car.trim}` : ""}`;
  const description = [name, car.year > 0 ? `${car.year} года` : null, car.mileageKm > 0 ? `пробег ${car.mileageKm.toLocaleString("ru-RU")} км` : null, "с расчётом доставки в Россию"].filter(Boolean).join(", ");
  const listingType = typeof car.details.listingType === "string" ? car.details.listingType : "";
  const itemCondition = listingType === "new" ? "https://schema.org/NewCondition" : listingType === "used" || car.mileageKm > 0 ? "https://schema.org/UsedCondition" : undefined;
  const url = `${siteUrl}/auto/${car.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": ["Product", "Car"],
    name,
    description,
    sku: car.id,
    url,
    brand: { "@type": "Brand", name: car.make },
    model: car.model,
    ...(car.photos.length ? { image: car.photos } : {}),
    ...(car.year > 0 ? { vehicleModelDate: String(car.year) } : {}),
    ...(car.mileageKm > 0 ? { mileageFromOdometer: { "@type": "QuantitativeValue", value: car.mileageKm, unitCode: "KMT" } } : {}),
    ...(itemCondition ? { itemCondition } : {}),
    ...(car.priceRub && car.priceRub > 0 ? { offers: { "@type": "Offer", priceCurrency: "RUB", price: car.priceRub, url, seller: { "@id": `${siteUrl}/#organization` } } } : {})
  };
}

export type SitemapCar = { slug: string; updatedAt: Date; image?: string };
type SitemapEntry = { url: string; lastModified?: Date; images?: string[] };

export function buildSitemapEntries(siteUrl: string, cars: SitemapCar[]): SitemapEntry[] {
  const staticPaths = ["", "/catalog/korea", "/catalog/japan", "/catalog/china", "/orders", "/about"];
  return [
    ...staticPaths.map((path) => ({ url: `${siteUrl}${path}` })),
    ...cars.map((car) => ({ url: `${siteUrl}/auto/${car.slug}`, lastModified: car.updatedAt, ...(car.image ? { images: [car.image] } : {}) }))
  ];
}
