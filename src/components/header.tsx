import Link from "next/link";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { site } from "@/config/site";
import { MobileMenu } from "@/components/mobile-menu";

const nav = [["Каталог", "/catalog?country=kr"], ["Калькулятор", "/calculator"], ["Как заказать", "/orders"], ["Контакты", "/#contacts"]] as const;

export function Header() {
  return <header className="site-header">
    <div className="container header-inner">
      <Logo />
      <nav className="desktop-nav" aria-label="Основная навигация">{nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
      <div className="header-actions">
        <a className="icon-button header-call" href={site.phone ? `tel:${site.phone.replace(/[^+\d]/g, "")}` : "/#request"} aria-label={site.phone ? `Позвонить: ${site.phone}` : "Заказать звонок"}><Icon name="phone" /></a>
        {site.phone && <a className="header-phone" href={`tel:${site.phone.replace(/[^+\d]/g, "")}`}>{site.phone}</a>}
        <Link className="button button-small" href="/#request">Подобрать авто</Link>
        <MobileMenu />
      </div>
    </div>
  </header>;
}
