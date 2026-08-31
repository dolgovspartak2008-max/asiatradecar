"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Icon } from "@/components/icons";

export function CarGallery({ photos, name }: { photos: string[]; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState(0);
  const [availablePhotos, setAvailablePhotos] = useState(() => photos.filter(Boolean));
  const removePhoto = (photo: string) => {
    setAvailablePhotos((current) => current.filter((item) => item !== photo));
    setActive(0);
  };
  if (!availablePhotos.length) return <div className="detail-placeholder"><Icon name="car" size={64}/><span>Фотографии обновляются из источника</span></div>;
  return <div className="car-gallery">
    <button className="main-photo" type="button" onClick={() => dialog.current?.showModal()} aria-label={`Открыть фото ${active + 1} на весь экран`}><Image src={availablePhotos[active]} alt={`${name}, фото ${active + 1}`} fill sizes="(max-width: 900px) 100vw, 64vw" loading="eager" unoptimized onError={() => removePhoto(availablePhotos[active])} /></button>
    <div className="car-thumbnails" aria-label={`Фотографии ${name}`}>{availablePhotos.map((photo, index) => <button className={index === active ? "active" : ""} type="button" onClick={() => setActive(index)} aria-label={`Показать фото ${index + 1}`} aria-pressed={index === active} key={photo}><Image src={photo} alt="" fill sizes="120px" unoptimized onError={() => removePhoto(photo)} /></button>)}</div>
    <dialog ref={dialog} className="car-photo-dialog" onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <button className="car-photo-close" type="button" onClick={() => dialog.current?.close()} aria-label="Закрыть полноэкранное фото">×</button>
      <div><Image src={availablePhotos[active]} alt={`${name}, фото ${active + 1}`} fill sizes="100vw" loading="eager" unoptimized onError={() => { dialog.current?.close(); removePhoto(availablePhotos[active]); }} /></div>
    </dialog>
  </div>;
}
