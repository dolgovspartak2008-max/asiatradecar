"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { DeliveryPricesDialog } from "@/components/delivery-prices-dialog";
import { Icon } from "@/components/icons";

const nav = [["Каталог", "/#catalogs"], ["Как заказать", "/orders"], ["Контакты", "/#contacts"], ["Избранное", "/catalog/favorites"]] as const;

export function MobileMenu() {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const close = () => ref.current?.removeAttribute("open");
  useEffect(() => {
    ref.current?.removeAttribute("open");
    const outside = (event: PointerEvent) => { if (ref.current?.open && !ref.current.contains(event.target as Node)) close(); };
    addEventListener("pointerdown", outside);
    return () => removeEventListener("pointerdown", outside);
  }, [pathname]);
  return <details ref={ref} className="mobile-menu"><summary className="icon-button" aria-label="Открыть меню"><Icon name="menu" /></summary><nav aria-label="Мобильная навигация">{nav.map(([label, href]) => <Link key={href} href={href} onClick={close} aria-current={pathname === href.split("?")[0] ? "page" : undefined}><span>{label}</span><Icon name="arrow" size={18}/></Link>)}<DeliveryPricesDialog /></nav></details>;
}
