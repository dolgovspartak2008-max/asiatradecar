import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { launchReady, site } from "@/config/site";
import { GlobalJourney } from "@/components/global-journey";
import { BackButton } from "@/components/back-button";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "ASIA TRADE CAR — автомобили из Азии", template: "%s — ASIA TRADE CAR" },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "ru_RU", siteName: site.name, title: site.name, description: site.description, url: "/" },
  robots: { index: launchReady, follow: launchReady },
  icons: { icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22><rect width=%2264%22 height=%2264%22 rx=%2212%22 fill=%22%23100f0d%22/><path d=%22M8 50 27 14h12L22 50Zm24 0 17-31 9 16H46l-8 15Z%22 fill=%22%23d7a84b%22/></svg>" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru" data-scroll-behavior="smooth"><body><a className="skip-link" href="#content">К содержанию</a><GlobalJourney /><Header /><BackButton /><main id="content">{children}</main><Footer /></body></html>;
}
