"use client";

import Image from "next/image";
import { useState } from "react";

export function CarGallery({ photos, name }: { photos: string[]; name: string }) {
  const [active, setActive] = useState(0);
  return <div className="car-gallery">
    <div className="main-photo"><Image src={photos[active]} alt={`${name}, фото ${active + 1}`} fill sizes="(max-width: 900px) 100vw, 64vw" loading="eager" unoptimized /></div>
    <div className="car-thumbnails" aria-label={`Фотографии ${name}`}>{photos.map((photo, index) => <button className={index === active ? "active" : ""} type="button" onClick={() => setActive(index)} aria-label={`Показать фото ${index + 1}`} aria-pressed={index === active} key={photo}><Image src={photo} alt="" fill sizes="120px" unoptimized /></button>)}</div>
  </div>;
}
