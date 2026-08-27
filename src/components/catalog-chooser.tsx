"use client";

import Link from "next/link";
import { useId, useRef } from "react";
import { CatalogLinkStatus } from "@/components/catalog-link-status";
import { Icon } from "@/components/icons";

const countries = [
  { code: "KR", name: "Южная Корея", href: "/catalog/korea" },
  { code: "JP", name: "Япония", href: "/catalog/japan" },
  { code: "CN", name: "Китай", href: "/catalog/china" }
] as const;

export function CatalogChooser({ label, className = "button" }: { label: string; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return <>
    <button className={className} type="button" onClick={() => dialog.current?.showModal()}>{label} <Icon name="arrow" /></button>
    <dialog className="catalog-choice-dialog" ref={dialog} aria-labelledby={titleId} onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <div className="catalog-choice-panel">
        <button className="dialog-close" type="button" onClick={() => dialog.current?.close()} aria-label="Закрыть выбор каталога"><Icon name="x" /></button>
        <h2 id={titleId}>Какой каталог открыть?</h2>
        <p>Выберите страну — откроем актуальные автомобили этого рынка.</p>
        <div className="catalog-choice-list">{countries.map((country) => <Link href={country.href} prefetch={country.code === "JP" ? false : undefined} key={country.code}><span>{country.code}</span><strong>{country.name}</strong><Icon name="arrow" /><CatalogLinkStatus className="catalog-choice-pending" /></Link>)}</div>
      </div>
    </dialog>
  </>;
}
