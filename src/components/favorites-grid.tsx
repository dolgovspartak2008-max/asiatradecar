"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Car } from "@/server/catalog";
import { CarCard } from "@/components/car-card";

export function FavoritesGrid({ cars }: { cars: Car[] }) {
  const stored = useSyncExternalStore(
    (notify) => { window.addEventListener("favorites-change", notify); return () => window.removeEventListener("favorites-change", notify); },
    () => localStorage.getItem("asia-trade-car-favorites") || "[]",
    () => "[]"
  );
  const ids = useMemo(() => { try { return JSON.parse(stored) as string[]; } catch { return []; } }, [stored]);
  const selected = cars.filter((car) => ids.includes(car.id));
  return selected.length ? <div className="catalog-grid">{selected.map((car) => <CarCard key={car.id} car={car} />)}</div> : <div className="empty-state"><h2>Избранное пока пусто</h2><p>Добавляйте автомобили сердечком в каталоге — они сохранятся на этом устройстве.</p><a className="button" href="/catalog?country=kr">Перейти в каталог</a></div>;
}
