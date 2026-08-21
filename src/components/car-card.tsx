"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { formatRub } from "@/domain/currency";
import type { Car } from "@/server/catalog";
import { Icon } from "@/components/icons";
import { PriceBreakdown } from "@/components/price-breakdown";

const FAVORITES_KEY = "asia-trade-car-favorites";
const getStored = () => {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]") as string[]; } catch { return []; }
};

export function CarCard({ car }: { car: Car }) {
  const favorite = useSyncExternalStore(
    (notify) => { window.addEventListener("favorites-change", notify); return () => window.removeEventListener("favorites-change", notify); },
    () => getStored().includes(car.id),
    () => false
  );
  const toggle = () => {
    const ids = new Set(getStored());
    if (ids.has(car.id)) ids.delete(car.id); else ids.add(car.id);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]));
    window.dispatchEvent(new Event("favorites-change"));
  };
  const name = `${car.make} ${car.model}${car.trim ? ` ${car.trim}` : ""}`;
  const href = car.sourceUrl || `/auto/${car.slug}`;
  const external = Boolean(car.sourceUrl);
  return <article className="car-card">
    <Link className="car-image" href={href} aria-label={`Открыть ${name}`} prefetch={false} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
      {car.photos[0] ? <Image src={car.photos[0]} alt={name} fill sizes="(max-width: 720px) 100vw, 33vw" unoptimized /> : <div className="car-placeholder"><Icon name="car" size={42} /><span>Фото обновляется</span></div>}
    </Link>
    <button className={`favorite-button ${favorite ? "active" : ""}`} type="button" onClick={toggle} aria-label={favorite ? "Удалить из избранного" : "Добавить в избранное"}><Icon name="heart" filled={favorite} /></button>
    <div className="car-card-body"><p className="eyebrow">{car.year} · {car.mileageKm.toLocaleString("ru-RU")} км</p><h2><Link href={href} prefetch={false} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{name}</Link></h2><div className="car-chips">{car.engineCc && <span>{(car.engineCc / 1000).toFixed(1)} л</span>}{car.powerHp && <span>{car.powerHp} л.с.</span>}{car.drive && <span>{car.drive}</span>}</div><div className="car-price-row"><div><span>Под ключ в РФ</span><p className="car-price">{car.priceRub ? formatRub(car.priceRub) : "Цена уточняется"}</p></div><PriceBreakdown slug={car.slug} carName={name} priceKrw={car.priceKrw} priceRub={car.priceRub} details={car.details} currencyCode={car.currencyCode} country={car.country} compact /></div></div>
  </article>;
}
