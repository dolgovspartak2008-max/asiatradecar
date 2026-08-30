import type { Metadata, Viewport } from "next";
import { Oswald } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { site, siteIndexable } from "@/config/site";
import { BackButton } from "@/components/back-button";
import { GlobalJourney } from "@/components/global-journey";

const carFont = Oswald({ subsets: ["latin", "cyrillic"], weight: ["600", "700"], display: "swap", variable: "--font-car" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "ASIA TRADE CAR — Автомобили из-за рубежа", template: "%s — ASIA TRADE CAR" },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "ru_RU", siteName: site.name, title: site.name, description: site.description, url: "/", images: ["/media/hero-import.webp"] },
  twitter: { card: "summary_large_image", title: site.name, description: site.description, images: ["/media/hero-import.webp"] },
  robots: { index: siteIndexable, follow: siteIndexable }
};

export const viewport: Viewport = { themeColor: "#100f0d", colorScheme: "dark", viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru" data-scroll-behavior="smooth" className={carFont.variable}><body><a className="skip-link" href="#content">К содержанию</a><Header /><BackButton /><GlobalJourney /><main id="content">{children}</main><Footer /></body></html>;
}
