"use client";

import { useEffect, useRef } from "react";

export function VideoHero() {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let loaded = document.readyState === "complete";
    const sync = () => {
      if (!video.current) return;
      if (!loaded || media.matches || document.hidden) video.current.pause();
      else void video.current.play().catch(() => undefined);
    };
    const start = () => { loaded = true; sync(); };
    if (loaded) sync();
    else addEventListener("load", start, { once: true });
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      removeEventListener("load", start);
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return <div className="hero-media" aria-label="Автомобиль едет по горной дороге">
    <video className="hero-video" ref={video} muted playsInline loop preload="none" poster="/media/hero-import.webp"><source src="/media/hero-drive.mp4" type="video/mp4" />Ваш браузер не поддерживает фоновое видео.</video>
    <div className="hero-shade" />
  </div>;
}
