import Link from "next/link";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { site } from "@/config/site";
import { MobileMenu } from "@/components/mobile-menu";

const nav = [["Каталог", "/catalog?country=kr"], ["Калькулятор", "/calculator"], ["Как работаем", "/#process"], ["Контакты", "/#contacts"]] as const;

export function Header() {
  return <header className="site-header">
    <div className="container header-inner">
      <Logo />
      <nav className="desktop-nav" aria-label="Основная навигация">{nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
      <div className="header-actions">
        <Link className="icon-button" href="/catalog/favorites" aria-label="Избранные автомобили"><Icon name="heart" /></Link>
        {site.phone && <a className="header-phone" href={`tel:${site.phone.replace(/[^+\d]/g, "")}`}>{site.phone}</a>}
        <Link className="button button-small" href="/#request">Подобрать авто</Link>
        <MobileMenu />
      </div>
    </div>
  </header>;
}
