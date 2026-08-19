"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/icons";

const nav = [["Каталог", "/catalog?country=kr"], ["Калькулятор", "/calculator"], ["Как заказать", "/orders"], ["Контакты", "/#contacts"], ["Избранное", "/catalog/favorites"]] as const;

export function MobileMenu() {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const close = () => ref.current?.removeAttribute("open");
  useEffect(() => { ref.current?.removeAttribute("open"); }, [pathname]);
  return <details ref={ref} className="mobile-menu"><summary className="icon-button" aria-label="Открыть меню"><Icon name="menu" /></summary><nav aria-label="Мобильная навигация">{nav.map(([label, href]) => <Link key={href} href={href} onClick={close}>{label}</Link>)}</nav></details>;
}
