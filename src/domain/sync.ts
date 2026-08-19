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
