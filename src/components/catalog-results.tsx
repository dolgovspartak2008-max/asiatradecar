"use client";

import { useEffect, useState } from "react";
import type { Car } from "@/server/catalog";
import type { CatalogSort } from "@/domain/catalog";
import { mergeCatalogCars } from "@/domain/pagination";
import { CarCard } from "@/components/car-card";

type PageResponse = { items?: Car[]; total?: number; page?: number; hasMore?: boolean; message?: string };
type CatalogSnapshot = { query: string; cars: Car[]; page: number; hasMore: boolean; scrollY: number };

const CATALOG_RETURN_KEY = "asia-trade-car-catalog-return";

export function CatalogResults({ initialCars, total, initialPage, query, sort, pageSize }: { initialCars: Car[]; total: number; initialPage: number; query: string; sort: CatalogSort; pageSize: number }) {
  const [cars, setCars] = useState(() => mergeCatalogCars([], initialCars, sort));
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialPage * pageSize < total);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem(CATALOG_RETURN_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Partial<CatalogSnapshot>;
      if (saved.query !== query || !Array.isArray(saved.cars) || typeof saved.page !== "number" || typeof saved.hasMore !== "boolean" || typeof saved.scrollY !== "number") return;
      const restoreCars = saved.cars;
      const restorePage = saved.page;
      const restoreHasMore = saved.hasMore;
      const restoreY = saved.scrollY;
      let scrollFrame = 0;
      const stateFrame = requestAnimationFrame(() => {
        sessionStorage.removeItem(CATALOG_RETURN_KEY);
        setCars(mergeCatalogCars([], restoreCars, sort));
        setPage(restorePage);
        setHasMore(restoreHasMore);
        scrollFrame = requestAnimationFrame(() => {
          const root = document.documentElement;
          const scrollBehavior = root.style.scrollBehavior;
          root.style.scrollBehavior = "auto";
          window.scrollTo(0, restoreY);
          root.style.scrollBehavior = scrollBehavior;
        });
      });
      return () => { cancelAnimationFrame(stateFrame); cancelAnimationFrame(scrollFrame); };
    } catch {
      sessionStorage.removeItem(CATALOG_RETURN_KEY);
    }
  }, [query, sort]);

  const rememberPosition = () => {
    try {
      sessionStorage.setItem(CATALOG_RETURN_KEY, JSON.stringify({ query, cars, page, hasMore, scrollY } satisfies CatalogSnapshot));
    } catch {}
  };

  const loadMore = async () => {
    setStatus("loading");
    setMessage("");
    const params = new URLSearchParams(query);
    params.set("page", String(page + 1));
    try {
      const response = await fetch(`/api/catalog/page?${params.toString()}`);
      const data = await response.json() as PageResponse;
      if (!response.ok || !Array.isArray(data.items)) throw new Error(data.message || "Не удалось загрузить следующую страницу.");
      setCars((current) => mergeCatalogCars(current, data.items!, sort));
      setPage(data.page ?? page + 1);
      setHasMore(Boolean(data.hasMore));
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить следующую страницу.");
    }
  };

  return <>
    <div className="catalog-grid">{cars.map((car) => <CarCard key={car.id} car={car} onOpen={rememberPosition} />)}
      {status === "loading" && Array.from({ length: 6 }, (_, index) => <div className="car-card car-card-skeleton" key={`skeleton-${index}`} aria-hidden="true"><div className="car-image"/><div className="car-card-body"><i/><i/><i/></div></div>)}
    </div>
    <div className="catalog-more" aria-live="polite">
      <p>Показано {cars.length.toLocaleString("ru-RU")} из {total.toLocaleString("ru-RU")}</p>
      {hasMore && <button className="button" type="button" onClick={loadMore} disabled={status === "loading"}>{status === "loading" ? "Загружаем автомобили…" : "Показать ещё"}</button>}
      {status === "error" && <div className="load-more-error"><span>{message}</span><button type="button" onClick={loadMore}>Повторить</button></div>}
    </div>
  </>;
}
