"use client";

import Image from "next/image";
import { Icon } from "@/components/icons";

const logoOverrides: Record<string, string> = {
  astonmartin: "2024/03/aston-martin-150x150.png",
  "baic yinxiang": "2024/03/baic-150x150.png",
  byd: "2024/04/byd-150x150.png",
  chevrolet: "2024/03/chevrolet-150x150.webp",
  "chevrolet (daewoo)": "2024/03/chevrolet-150x150.webp",
  "citroen-ds": "2024/03/sitroen-150x150.png",
  geely: "2024/04/geely-150x150.png",
  genesis: "2024/03/genesis-150x150.webp",
  ineos: "2026/03/ineos-grenadier-150x150.webp",
  jeep: "2026/03/jeep-150x150.webp",
  mazda: "2024/03/mazda-150x150.webp",
  "mercedes-benz": "2024/03/mersedes-bens-150x150.png",
  renault: "2026/03/renault.webp",
  "renault (samsung)": "2024/03/samsung-150x150.png",
  "xin yuan": "2026/03/srm-xinyuan.png"
};

const knownLogoSlugs = new Set([
  "acura", "alfa-romeo", "audi", "bentley", "bmw", "byd", "cadillac", "chevrolet", "chrysler", "citroen", "daihatsu", "dodge", "ferrari", "ford", "geely", "genesis", "gmc", "honda", "hyundai", "infiniti", "jaguar", "jeep", "kia", "lamborghini", "land-rover", "lexus", "lincoln", "maserati", "mazda", "mercedes-benz", "mini", "mitsubishi", "nissan", "peugeot", "porsche", "ram", "renault", "rolls-royce", "seat", "skoda", "subaru", "suzuki", "tesla", "toyota", "volkswagen", "volvo"
]);

export const brandLogoSource = (make: string) => {
  const normalized = make.trim().toLowerCase();
  if (!normalized || /^(etc|others)$/.test(normalized)) return null;
  const slug = normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const path = logoOverrides[normalized] || (knownLogoSlugs.has(slug) ? `2024/03/${slug}-150x150.png` : null);
  return path ? `https://trust-encar.ru/wp-content/uploads/${path}` : null;
};

export function BrandMark({ make, country, className = "" }: { make: string; country: string; className?: string }) {
  const source = brandLogoSource(make);
  return <span className={`brand-mark brand-mark-${country || "all"} ${className}`.trim()} aria-hidden="true"><Icon name="car" size={18} />{source && <Image src={source} alt="" width={28} height={28} unoptimized onError={(event) => event.currentTarget.remove()} />}</span>;
}
