"use client";

import { useState } from "react";
import type { Car } from "@/server/catalog";
import { appendUniqueById } from "@/domain/pagination";
import { CarCard } from "@/components/car-card";

type PageResponse = { items?: Car[]; total?: number; page?: number; hasMore?: boolean; message?: string };

export function CatalogResults({ initialCars, total, initialPage, query }: { initialCars: Car[]; total: number; initialPage: number; query: string }) {
  const [cars, setCars] = useState(initialCars);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialPage * 24 < total);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  const loadMore = async () => {
    setStatus("loading");
    setMessage("");
    const params = new URLSearchParams(query);
    params.set("page", String(page + 1));
    try {
      const response = await fetch(`/api/catalog/page?${params.toString()}`);
      const data = await response.json() as PageResponse;
      if (!response.ok || !Array.isArray(data.items)) throw new Error(data.message || "Не удалось загрузить следующую страницу.");
      setCars((current) => appendUniqueById(current, data.items!));
      setPage(data.page ?? page + 1);
      setHasMore(Boolean(data.hasMore));
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить следующую страницу.");
    }
  };

  return <>
    <div className="catalog-grid">{cars.map((car) => <CarCard key={car.id} car={car} />)}
      {status === "loading" && Array.from({ length: 6 }, (_, index) => <div className="car-card car-card-skeleton" key={`skeleton-${index}`} aria-hidden="true"><div className="car-image"/><div className="car-card-body"><i/><i/><i/></div></div>)}
    </div>
    <div className="catalog-more" aria-live="polite">
      <p>Показано {cars.length.toLocaleString("ru-RU")} из {total.toLocaleString("ru-RU")}</p>
      {hasMore && <button className="button" type="button" onClick={loadMore} disabled={status === "loading"}>{status === "loading" ? "Загружаем автомобили…" : "Показать ещё"}</button>}
      {status === "error" && <div className="load-more-error"><span>{message}</span><button type="button" onClick={loadMore}>Повторить</button></div>}
    </div>
  </>;
}
