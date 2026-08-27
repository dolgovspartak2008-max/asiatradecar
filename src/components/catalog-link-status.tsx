"use client";

import { useLinkStatus } from "next/link";

export function JapanCatalogLinkStatus({ className }: { className: string }) {
  const { pending } = useLinkStatus();
  return <small className={`${className}${pending ? " is-pending" : ""}`} role="status">{pending ? "Пожалуйста, подождите" : "\u00a0"}</small>;
}
