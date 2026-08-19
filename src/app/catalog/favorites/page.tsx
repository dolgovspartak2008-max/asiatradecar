import type { Metadata } from "next";
import { connection } from "next/server";
import { FavoritesGrid } from "@/components/favorites-grid";
import { parseCatalogParams } from "@/domain/catalog";
import { getCatalog } from "@/server/catalog";

export const metadata: Metadata = { title: "Избранные автомобили", robots: { index: false, follow: true } };
export default async function FavoritesPage() {
  await connection();
  const { cars } = await getCatalog(parseCatalogParams({ country: "kr", limit: "24" })).catch(() => ({ cars: [] }));
  return <section className="page-section"><div className="container"><p className="eyebrow">Ваш список</p><h1>Избранные автомобили</h1><FavoritesGrid cars={cars} /></div></section>;
}
