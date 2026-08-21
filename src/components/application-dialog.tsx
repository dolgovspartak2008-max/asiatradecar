"use client";

import { useId, useRef } from "react";
import { Icon } from "@/components/icons";
import { LeadForm } from "@/components/lead-form";

export function ApplicationDialog({ carName }: { carName: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return <>
    <button className="button car-application-button" type="button" onClick={() => dialog.current?.showModal()}>Оставить заявку</button>
    <dialog ref={dialog} className="site-dialog application-dialog" aria-labelledby={titleId} onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }}>
      <div className="dialog-panel">
        <button className="dialog-close" type="button" onClick={() => dialog.current?.close()} aria-label="Закрыть форму"><Icon name="x" /></button>
        <p className="eyebrow">Заявка на автомобиль</p><h2 id={titleId}>{carName}</h2>
        <LeadForm formId="car-detail" compact carName={carName} submitLabel="Оставить заявку" />
      </div>
    </dialog>
  </>;
}
