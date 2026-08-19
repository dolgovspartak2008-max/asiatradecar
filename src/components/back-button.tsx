"use client";

import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/icons";

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/") return null;

  const goBack = () => window.history.length > 1 ? router.back() : router.push("/");
  return <button className="global-back-button" type="button" onClick={goBack} aria-label="Вернуться назад"><Icon name="arrow" /> Назад</button>;
}
