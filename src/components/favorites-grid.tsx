"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Car } from "@/server/catalog";
import { parseFavoriteEntries, resolveFavoriteCars } from "@/domain/favorites";
import { CarCard } from "@/components/car-card";
import { CatalogChooser } from "@/components/catalog-chooser";

export function FavoritesGrid({ cars }: { cars: Car[] }) {
  const stored = useSyncExternalStore(
    (notify) => { window.addEventListener("favorites-change", notify); return () => window.removeEventListener("favorites-change", notify); },
    () => localStorage.getItem("asia-trade-car-favorites") || "[]",
    () => "[]"
  );
  const selected = useMemo(() => {
    const entries = parseFavoriteEntries(stored);
    return resolveFavoriteCars(entries, cars);
  }, [cars, stored]);
  return selected.length ? <div className="catalog-grid">{selected.map((car) => <CarCard key={car.id} car={car} />)}</div> : <div className="empty-state"><h2>Избранное пока пусто</h2><p>Добавляйте автомобили сердечком в каталоге — они сохранятся на этом устройстве.</p><CatalogChooser label="Перейти в каталог" showIcon={false} /></div>;
}
