import type { Metadata } from "next";
import { FavoritesGrid } from "@/components/favorites-grid";

export const metadata: Metadata = { title: "Избранные автомобили", alternates: { canonical: "/catalog/favorites" }, robots: { index: false, follow: true } };
export default function FavoritesPage() {
  return <section className="page-section"><div className="container"><p className="eyebrow">Ваш список</p><h1>Избранные автомобили</h1><FavoritesGrid /></div></section>;
}
