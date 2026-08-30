"use client";

import { useEffect, useRef } from "react";

export function VideoHero() {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (!video.current) return;
      if (media.matches || document.hidden) video.current.pause();
      else void video.current.play().catch(() => undefined);
    };
    sync();
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    document.addEventListener("pointerdown", sync, { passive: true });
    return () => {
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      document.removeEventListener("pointerdown", sync);
    };
  }, []);

  return <div className="hero-media" aria-label="Автомобиль едет по горной дороге">
    <video className="hero-video" ref={video} autoPlay muted playsInline loop preload="metadata" poster="/media/hero-import.webp"><source src="/media/hero-drive.mp4" type="video/mp4" />Ваш браузер не поддерживает фоновое видео.</video>
    <div className="hero-shade" />
  </div>;
}
