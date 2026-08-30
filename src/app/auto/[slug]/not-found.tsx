"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NotFound() {
  const slug = usePathname().split("/").at(-1) || "";
  const market = slug.startsWith("jp-") ? "japan" : slug.startsWith("cn-") ? "china" : "korea";
  return <section className="page-section"><div className="container empty-state"><h1>Автомобиль не найден</h1><p>Возможно, объявление снято с продажи или ещё не синхронизировано.</p><Link className="button" href={`/catalog/${market}`}>Вернуться в каталог</Link></div></section>;
}
