"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { formatRub } from "@/domain/currency";
import { readInsuranceSummary } from "@/domain/car-details";
import { isFavorite, parseFavoriteEntries, toggleFavorite, type FavoriteCar } from "@/domain/favorites";
import { Icon } from "@/components/icons";
import { BrandMark } from "@/components/brand-mark";

const FAVORITES_KEY = "asia-trade-car-favorites";
const getStored = () => parseFavoriteEntries(localStorage.getItem(FAVORITES_KEY) || "[]");

export function CarCard({ car, onOpen }: { car: FavoriteCar; onOpen?: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const favorite = useSyncExternalStore(
    (notify) => { window.addEventListener("favorites-change", notify); return () => window.removeEventListener("favorites-change", notify); },
    () => isFavorite(getStored(), car),
    () => false
  );
  const toggle = () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(toggleFavorite(getStored(), car)));
    window.dispatchEvent(new Event("favorites-change"));
  };
  const name = `${car.make} ${car.model}${car.trim ? ` ${car.trim}` : ""}`;
  const href = `/auto/${car.slug}`;
  const meta = [car.year > 0 ? String(car.year) : "Новый автомобиль", car.mileageKm > 0 ? `${car.mileageKm.toLocaleString("ru-RU")} км` : null].filter(Boolean).join(" · ");
  const insurance = readInsuranceSummary(car.details || {});
  const photo = car.photos[0]?.replace("https://banzai24.com/api/image-service/", "/api/catalog/image/banzai/");
  return <article className="car-card">
    <Link className="car-image" href={href} aria-label={`Открыть ${name}`} prefetch={false} onClick={onOpen}>
      {photo && !imageFailed ? <Image src={photo} alt={name} fill sizes="(max-width: 720px) 100vw, 33vw" onError={() => setImageFailed(true)} /> : <div className="car-placeholder"><Icon name="car" size={42} /><span>Фото обновляется</span></div>}
    </Link>
    <button className={`favorite-button ${favorite ? "active" : ""}`} type="button" onClick={toggle} aria-label={favorite ? "Удалить из избранного" : "Добавить в избранное"}><Icon name="heart" filled={favorite} /></button>
    <div className="car-card-body"><div className="car-card-meta"><p className="eyebrow">{meta}</p>{insurance && <span className="car-insurance-summary"><Icon name="collision" size={14} />{insurance}</span>}</div><div className="car-card-title">{["jp", "cn"].includes(car.country) && <BrandMark make={car.make} country={car.country} className="car-card-brand" />}<h2><Link href={href} prefetch={false} onClick={onOpen}>{name}</Link></h2></div><div className="car-chips">{car.engineCc && <span>{(car.engineCc / 1000).toFixed(1)} л</span>}{car.powerHp && <span>{car.powerHp} л.с.</span>}{car.country === "kr" && car.fuel && <span>{car.fuel}</span>}{car.drive && <span>{car.drive}</span>}</div><div className="car-price-row"><div><span>Под ключ в РФ</span><p className="car-price">{car.priceRub ? formatRub(car.priceRub) : "Цена уточняется"}</p></div></div></div>
  </article>;
}
